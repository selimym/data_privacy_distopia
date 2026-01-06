"""Inference API endpoints for analyzing NPC data across domains."""

import json
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from datafusion.database import get_db
from datafusion.models.inference import ContentRating
from datafusion.models.npc import NPC
from datafusion.schemas.domains import DomainType, NPCWithDomains
from datafusion.schemas.errors import ErrorResponse
from datafusion.schemas.health import HealthRecordFiltered
from datafusion.schemas.inference import (
    InferenceResult,
    InferenceRuleRead,
    InferencesResponse,
    UnlockableInference,
)
from datafusion.schemas.npc import NPCRead
from datafusion.services.inference_engine import InferenceEngine

router = APIRouter(prefix="/inferences", tags=["inferences"])


@router.get(
    "/rules",
    response_model=list[InferenceRuleRead],
)
async def list_inference_rules() -> list[InferenceRuleRead]:
    """
    List all available inference rules.

    Useful for documentation and showing players what rules exist.
    Currently returns hardcoded rules; will fetch from database in the future.
    """
    engine = InferenceEngine()

    # Convert hardcoded rules to InferenceRuleRead format
    # In the future, this will query the database
    rules_read = []
    for rule in engine.rules:
        # Convert set[DomainType] to JSON string
        required_domains_json = json.dumps([d.value for d in rule.required_domains])

        rule_read = InferenceRuleRead(
            id=UUID("00000000-0000-0000-0000-000000000000"),  # Placeholder for hardcoded rules
            rule_key=rule.rule_key,
            name=rule.name,
            description=f"Analyzes {', '.join(d.value for d in rule.required_domains)} domain data",
            required_domains=required_domains_json,
            scariness_level=rule.scariness_level,
            content_rating=rule.content_rating,
            is_active=True,
            created_at=datetime(2026, 1, 6, 0, 0, 0),  # Placeholder
            updated_at=datetime(2026, 1, 6, 0, 0, 0),  # Placeholder
        )
        rules_read.append(rule_read)

    return rules_read


async def _fetch_npc_with_domains(
    npc_id: UUID, domains: set[DomainType], db: AsyncSession
) -> NPCWithDomains:
    """Fetch NPC with requested domain data."""
    # Import here to avoid circular dependency
    from datafusion.api.npcs import _get_health_data

    npc_query = select(NPC).where(NPC.id == npc_id)
    result = await db.execute(npc_query)
    npc = result.scalar_one_or_none()

    if not npc:
        raise HTTPException(status_code=404, detail="NPC not found")

    domain_data = {}

    if DomainType.HEALTH in domains:
        health_data = await _get_health_data(npc_id, db)
        if health_data:
            domain_data[DomainType.HEALTH] = health_data

    return NPCWithDomains(
        npc=NPCRead.model_validate(npc),
        domains=domain_data,
    )


@router.get(
    "/{npc_id}",
    response_model=InferencesResponse,
    responses={404: {"model": ErrorResponse, "description": "NPC not found"}},
)
async def get_inferences(
    npc_id: UUID,
    domains: set[DomainType] = Query(
        default_factory=set, description="Enabled domains for inference analysis"
    ),
    max_scariness: int | None = Query(
        default=None, ge=1, le=5, description="Maximum scariness level to include (1-5)"
    ),
    max_content_rating: ContentRating | None = Query(
        default=None, description="Maximum content rating to include"
    ),
    db: AsyncSession = Depends(get_db),
) -> InferencesResponse:
    """
    Get inferences for an NPC based on enabled domains.

    Analyzes NPC data across the requested domains and returns insights.
    Can be filtered by scariness level and content rating.
    """
    # Fetch NPC with requested domains
    npc_data = await _fetch_npc_with_domains(npc_id, domains, db)

    # Run inference engine
    engine = InferenceEngine()
    inferences = engine.evaluate(npc_data, domains)

    # Apply content filtering
    if max_scariness is not None:
        inferences = [i for i in inferences if i.scariness_level <= max_scariness]

    if max_content_rating is not None:
        # Define content rating hierarchy
        rating_hierarchy = {
            ContentRating.SAFE: 1,
            ContentRating.CAUTIONARY: 2,
            ContentRating.SERIOUS: 3,
            ContentRating.DISTURBING: 4,
            ContentRating.DYSTOPIAN: 5,
        }
        max_level = rating_hierarchy[max_content_rating]
        inferences = [
            i for i in inferences if rating_hierarchy[i.content_rating] <= max_level
        ]

    # Get unlockable inferences
    unlockable_dict = engine.get_unlockable(npc_data, domains)
    unlockable_inferences = [
        UnlockableInference(domain=domain, rule_keys=rule_keys)
        for domain, rule_keys in unlockable_dict.items()
    ]

    return InferencesResponse(
        npc_id=npc_id,
        enabled_domains=list(domains),
        inferences=inferences,
        unlockable_inferences=unlockable_inferences,
    )


@router.get(
    "/{npc_id}/preview",
    response_model=list[InferenceResult],
    responses={404: {"model": ErrorResponse, "description": "NPC not found"}},
)
async def preview_new_inferences(
    npc_id: UUID,
    current_domains: set[DomainType] = Query(
        default_factory=set, description="Currently enabled domains"
    ),
    new_domain: DomainType = Query(..., description="Domain to preview enabling"),
    db: AsyncSession = Depends(get_db),
) -> list[InferenceResult]:
    """
    Preview new inferences that would be unlocked by enabling a new domain.

    Shows the player "if you enable this domain, you'll also learn X, Y, Z".
    Returns only the NEW inferences, not ones already available.
    """
    # Get inferences with current domains
    npc_data_current = await _fetch_npc_with_domains(npc_id, current_domains, db)
    engine = InferenceEngine()
    current_inferences = engine.evaluate(npc_data_current, current_domains)
    current_rule_keys = {inf.rule_key for inf in current_inferences}

    # Get inferences with new domain added
    new_domains = current_domains | {new_domain}
    npc_data_new = await _fetch_npc_with_domains(npc_id, new_domains, db)
    new_inferences = engine.evaluate(npc_data_new, new_domains)

    # Filter to only NEW inferences
    newly_unlocked = [
        inf for inf in new_inferences if inf.rule_key not in current_rule_keys
    ]

    return newly_unlocked

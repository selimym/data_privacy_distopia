"""Inference API endpoints for analyzing NPC data across domains."""

import json
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from datafusion.database import get_db
from datafusion.models.inference import ContentRating
from datafusion.schemas.domains import DomainType
from datafusion.schemas.errors import ErrorResponse
from datafusion.schemas.inference import (
    InferenceResult,
    InferenceRuleRead,
    InferencesResponse,
    UnlockableInference,
    VictimStatement,
)
from datafusion.services.advanced_inference_engine import AdvancedInferenceEngine
from datafusion.services.inference_rules import INFERENCE_RULES

router = APIRouter(prefix="/inferences", tags=["inferences"])


@router.get(
    "/rules",
    response_model=list[InferenceRuleRead],
)
async def list_inference_rules() -> list[InferenceRuleRead]:
    """
    List all available inference rules.

    Useful for documentation and showing players what rules exist.
    Loaded from inference_rules.py config file.
    """
    # Convert config rules to InferenceRuleRead format
    rules_read = []
    for rule in INFERENCE_RULES:
        # Convert DomainType enums to JSON string
        required_domains_json = json.dumps([d.value for d in rule["required_domains"]])

        rule_read = InferenceRuleRead(
            id=UUID("00000000-0000-0000-0000-000000000000"),  # Placeholder for config-based rules
            rule_key=rule["rule_key"],
            name=rule["name"],
            description=f"Analyzes {', '.join(d.value for d in rule['required_domains'])} domain data",
            required_domains=required_domains_json,
            scariness_level=rule["scariness_level"],
            content_rating=rule["content_rating"],
            is_active=True,
            created_at=datetime(2026, 1, 6, 0, 0, 0),  # Placeholder
            updated_at=datetime(2026, 1, 6, 0, 0, 0),  # Placeholder
        )
        rules_read.append(rule_read)

    return rules_read


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
    # Run advanced inference engine
    engine = AdvancedInferenceEngine(db)
    inference_dicts = await engine.generate_inferences(npc_id, list(domains))

    # Convert dict results to InferenceResult models
    inferences = []
    for inf_dict in inference_dicts:
        # Convert victim statements to VictimStatement models
        victim_statements = [
            VictimStatement(**stmt) for stmt in inf_dict.get("victim_statements", [])
        ]

        # Convert domains_used strings back to DomainType enums
        domains_used = [DomainType(d) for d in inf_dict["domains_used"]]

        inference = InferenceResult(
            rule_key=inf_dict["rule_key"],
            rule_name=inf_dict["rule_name"],
            category=inf_dict["category"],
            confidence=inf_dict["confidence"],
            inference_text=inf_dict["inference_text"],
            supporting_evidence=inf_dict["supporting_evidence"],
            implications=inf_dict["implications"],
            domains_used=domains_used,
            scariness_level=inf_dict["scariness_level"],
            content_rating=ContentRating(inf_dict["content_rating"]),
            educational_note=inf_dict.get("educational_note"),
            real_world_example=inf_dict.get("real_world_example"),
            victim_statements=victim_statements,
        )
        inferences.append(inference)

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

    # Calculate unlockable inferences by checking which rules would become available
    # with each additional domain
    all_domain_types = set(DomainType)
    disabled_domains = all_domain_types - domains
    unlockable_inferences = []

    for domain in disabled_domains:
        # Check which rules would be newly available with this domain
        potential_domains = domains | {domain}
        unlockable_rules = []

        for rule in INFERENCE_RULES:
            required_domains_set = set(rule["required_domains"])
            # Rule is unlockable if it requires this domain and we now have all required domains
            if domain in required_domains_set and required_domains_set.issubset(potential_domains):
                # Make sure it's not already available with current domains
                if not required_domains_set.issubset(domains):
                    unlockable_rules.append(rule["rule_key"])

        if unlockable_rules:
            unlockable_inferences.append(
                UnlockableInference(domain=domain, rule_keys=unlockable_rules)
            )

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
    engine = AdvancedInferenceEngine(db)

    # Get inferences with current domains
    current_inference_dicts = await engine.generate_inferences(npc_id, list(current_domains))
    current_rule_keys = {inf["rule_key"] for inf in current_inference_dicts}

    # Get inferences with new domain added
    new_domains = current_domains | {new_domain}
    new_inference_dicts = await engine.generate_inferences(npc_id, list(new_domains))

    # Filter to only NEW inferences and convert to models
    newly_unlocked = []
    for inf_dict in new_inference_dicts:
        if inf_dict["rule_key"] not in current_rule_keys:
            # Convert to InferenceResult model
            victim_statements = [
                VictimStatement(**stmt) for stmt in inf_dict.get("victim_statements", [])
            ]
            domains_used = [DomainType(d) for d in inf_dict["domains_used"]]

            inference = InferenceResult(
                rule_key=inf_dict["rule_key"],
                rule_name=inf_dict["rule_name"],
                category=inf_dict["category"],
                confidence=inf_dict["confidence"],
                inference_text=inf_dict["inference_text"],
                supporting_evidence=inf_dict["supporting_evidence"],
                implications=inf_dict["implications"],
                domains_used=domains_used,
                scariness_level=inf_dict["scariness_level"],
                content_rating=ContentRating(inf_dict["content_rating"]),
                educational_note=inf_dict.get("educational_note"),
                real_world_example=inf_dict.get("real_world_example"),
                victim_statements=victim_statements,
            )
            newly_unlocked.append(inference)

    return newly_unlocked

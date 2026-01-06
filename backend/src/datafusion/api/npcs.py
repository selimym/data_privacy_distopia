"""NPC API endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from datafusion.database import get_db
from datafusion.models.health import (
    HealthCondition,
    HealthMedication,
    HealthRecord,
    HealthVisit,
)
from datafusion.models.npc import NPC
from datafusion.schemas.domains import DomainType, NPCWithDomains
from datafusion.schemas.health import (
    HealthConditionRead,
    HealthMedicationRead,
    HealthRecordFiltered,
    HealthRecordRead,
    HealthVisitRead,
)
from datafusion.schemas.npc import NPCBasicRead, NPCListResponse, NPCRead

router = APIRouter(prefix="/npcs", tags=["npcs"])


@router.get("/", response_model=NPCListResponse)
async def list_npcs(
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List all NPCs with pagination for map rendering."""
    count_query = select(func.count()).select_from(NPC)
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    npcs_query = select(NPC).offset(offset).limit(limit)
    result = await db.execute(npcs_query)
    npcs = result.scalars().all()

    return NPCListResponse(
        items=[NPCBasicRead.model_validate(npc) for npc in npcs],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{npc_id}", response_model=NPCWithDomains)
async def get_npc(
    npc_id: UUID,
    domains: set[DomainType] = Query(default_factory=set),
    db: AsyncSession = Depends(get_db),
):
    """Get NPC with requested domain data."""
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


@router.get("/{npc_id}/domain/{domain}")
async def get_npc_domain_data(
    npc_id: UUID,
    domain: DomainType,
    db: AsyncSession = Depends(get_db),
):
    """Get specific domain data for an NPC."""
    npc_query = select(NPC).where(NPC.id == npc_id)
    result = await db.execute(npc_query)
    npc = result.scalar_one_or_none()

    if not npc:
        raise HTTPException(status_code=404, detail="NPC not found")

    if domain == DomainType.HEALTH:
        health_data = await _get_health_data(npc_id, db)
        if not health_data:
            raise HTTPException(status_code=404, detail="Health record not found")
        return health_data

    raise HTTPException(
        status_code=501,
        detail=f"Domain {domain.value} not yet implemented",
    )


async def _get_health_data(
    npc_id: UUID, db: AsyncSession
) -> HealthRecordFiltered | None:
    """Fetch health record with all related data for an NPC."""
    health_query = select(HealthRecord).where(HealthRecord.npc_id == npc_id)

    result = await db.execute(health_query)
    health_record = result.scalar_one_or_none()

    if not health_record:
        return None

    conditions_query = select(HealthCondition).where(
        HealthCondition.health_record_id == health_record.id
    )
    conditions_result = await db.execute(conditions_query)
    conditions = conditions_result.scalars().all()

    medications_query = select(HealthMedication).where(
        HealthMedication.health_record_id == health_record.id
    )
    medications_result = await db.execute(medications_query)
    medications = medications_result.scalars().all()

    visits_query = select(HealthVisit).where(
        HealthVisit.health_record_id == health_record.id
    )
    visits_result = await db.execute(visits_query)
    visits = visits_result.scalars().all()

    health_read = HealthRecordRead(
        id=health_record.id,
        npc_id=health_record.npc_id,
        insurance_provider=health_record.insurance_provider,
        primary_care_physician=health_record.primary_care_physician,
        conditions=[HealthConditionRead.model_validate(c) for c in conditions],
        medications=[HealthMedicationRead.model_validate(m) for m in medications],
        visits=[HealthVisitRead.model_validate(v) for v in visits],
        created_at=health_record.created_at,
        updated_at=health_record.updated_at,
    )

    return HealthRecordFiltered.from_health_record(health_read, filter_sensitive=False)

"""NPC API endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from datafusion.config import settings
from datafusion.database import get_db
from datafusion.models.finance import (
    FinanceRecord,
)
from datafusion.models.health import (
    HealthRecord,
)
from datafusion.models.judicial import (
    JudicialRecord,
)
from datafusion.models.location import LocationRecord
from datafusion.models.npc import NPC
from datafusion.models.social import (
    SocialMediaRecord,
)
from datafusion.schemas.domains import DomainType, NPCWithDomains
from datafusion.schemas.errors import ErrorResponse
from datafusion.schemas.finance import (
    BankAccountRead,
    DebtRead,
    FinanceRecordFiltered,
    FinanceRecordRead,
    TransactionRead,
)
from datafusion.schemas.health import (
    HealthConditionRead,
    HealthMedicationRead,
    HealthRecordFiltered,
    HealthRecordRead,
    HealthVisitRead,
)
from datafusion.schemas.judicial import (
    CivilCaseRead,
    CriminalRecordRead,
    JudicialRecordFiltered,
    JudicialRecordRead,
    TrafficViolationRead,
)
from datafusion.schemas.location import (
    InferredLocationRead,
    LocationRecordFiltered,
    LocationRecordRead,
)
from datafusion.schemas.npc import NPCBasicRead, NPCBatchRequest, NPCListResponse, NPCRead
from datafusion.schemas.social import (
    PrivateInferenceRead,
    PublicInferenceRead,
    SocialMediaRecordFiltered,
    SocialMediaRecordRead,
)

router = APIRouter(prefix="/npcs", tags=["npcs"])


@router.get("/", response_model=NPCListResponse)
async def list_npcs(
    limit: int = Query(
        default=settings.default_page_size,
        ge=settings.min_page_size,
        le=settings.max_page_size,
    ),
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


@router.get(
    "/{npc_id}",
    response_model=NPCWithDomains,
    responses={404: {"model": ErrorResponse, "description": "NPC not found"}},
)
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

    return await _build_npc_with_domains(npc, domains, db)


@router.post("/batch", response_model=list[NPCWithDomains])
async def get_npcs_batch(
    request: NPCBatchRequest,
    db: AsyncSession = Depends(get_db),
) -> list[NPCWithDomains]:
    """Get multiple NPCs in a single request."""
    # Handle empty list
    if not request.npc_ids:
        return []

    # Single query with WHERE id IN (...)
    result = await db.execute(select(NPC).where(NPC.id.in_(request.npc_ids)))
    npcs = result.scalars().all()

    # Convert domains list to set of DomainType enums (empty set if None)
    domains_set: set[DomainType] = set()
    if request.domains:
        try:
            domains_set = {DomainType(d) for d in request.domains}
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid domain type: {e}")

    # Build response for each NPC
    return [await _build_npc_with_domains(npc, domains_set, db) for npc in npcs]


@router.get(
    "/{npc_id}/domain/{domain}",
    responses={
        404: {"model": ErrorResponse, "description": "NPC or domain data not found"},
    },
)
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

    if domain == DomainType.FINANCE:
        finance_data = await _get_finance_data(npc_id, db)
        if not finance_data:
            raise HTTPException(status_code=404, detail="Finance record not found")
        return finance_data

    if domain == DomainType.JUDICIAL:
        judicial_data = await _get_judicial_data(npc_id, db)
        if not judicial_data:
            raise HTTPException(status_code=404, detail="Judicial record not found")
        return judicial_data

    if domain == DomainType.LOCATION:
        location_data = await _get_location_data(npc_id, db)
        if not location_data:
            raise HTTPException(status_code=404, detail="Location record not found")
        return location_data

    if domain == DomainType.SOCIAL:
        social_data = await _get_social_data(npc_id, db)
        if not social_data:
            raise HTTPException(status_code=404, detail="Social media record not found")
        return social_data

    raise HTTPException(
        status_code=500,
        detail=f"Unexpected domain: {domain.value}",
    )


# Helper functions for fetching domain data


async def _build_npc_with_domains(
    npc: NPC,
    domains: set[DomainType],
    db: AsyncSession,
) -> NPCWithDomains:
    """Build NPCWithDomains response for a single NPC."""
    domain_data = {}

    if DomainType.HEALTH in domains:
        health_data = await _get_health_data(npc.id, db)
        if health_data:
            domain_data[DomainType.HEALTH] = health_data

    if DomainType.FINANCE in domains:
        finance_data = await _get_finance_data(npc.id, db)
        if finance_data:
            domain_data[DomainType.FINANCE] = finance_data

    if DomainType.JUDICIAL in domains:
        judicial_data = await _get_judicial_data(npc.id, db)
        if judicial_data:
            domain_data[DomainType.JUDICIAL] = judicial_data

    if DomainType.LOCATION in domains:
        location_data = await _get_location_data(npc.id, db)
        if location_data:
            domain_data[DomainType.LOCATION] = location_data

    if DomainType.SOCIAL in domains:
        social_data = await _get_social_data(npc.id, db)
        if social_data:
            domain_data[DomainType.SOCIAL] = social_data

    return NPCWithDomains(
        npc=NPCRead.model_validate(npc),
        domains=domain_data,
    )


async def _get_health_data(npc_id: UUID, db: AsyncSession) -> HealthRecordFiltered | None:
    """Fetch health record with all related data for an NPC using eager loading."""
    health_query = select(HealthRecord).where(HealthRecord.npc_id == npc_id)

    result = await db.execute(health_query)
    health_record = result.scalar_one_or_none()

    if not health_record:
        return None

    # Relationships are eagerly loaded via lazy="selectin" in model
    # This eliminates N+1 queries - only 1 query for conditions, 1 for medications, 1 for visits
    health_read = HealthRecordRead(
        id=health_record.id,
        npc_id=health_record.npc_id,
        insurance_provider=health_record.insurance_provider,
        primary_care_physician=health_record.primary_care_physician,
        conditions=[HealthConditionRead.model_validate(c) for c in health_record.conditions],
        medications=[HealthMedicationRead.model_validate(m) for m in health_record.medications],
        visits=[HealthVisitRead.model_validate(v) for v in health_record.visits],
        created_at=health_record.created_at,
        updated_at=health_record.updated_at,
    )

    return HealthRecordFiltered.from_health_record(health_read, filter_sensitive=False)


async def _get_finance_data(npc_id: UUID, db: AsyncSession) -> FinanceRecordFiltered | None:
    """Fetch finance record with all related data for an NPC using eager loading."""
    finance_query = select(FinanceRecord).where(FinanceRecord.npc_id == npc_id)

    result = await db.execute(finance_query)
    finance_record = result.scalar_one_or_none()

    if not finance_record:
        return None

    # Relationships are eagerly loaded via lazy="selectin" in model
    finance_read = FinanceRecordRead(
        id=finance_record.id,
        npc_id=finance_record.npc_id,
        employment_status=finance_record.employment_status,
        employer_name=finance_record.employer_name,
        annual_income=finance_record.annual_income,
        credit_score=finance_record.credit_score,
        bank_accounts=[BankAccountRead.model_validate(a) for a in finance_record.bank_accounts],
        debts=[DebtRead.model_validate(d) for d in finance_record.debts],
        transactions=[TransactionRead.model_validate(t) for t in finance_record.transactions],
        created_at=finance_record.created_at,
        updated_at=finance_record.updated_at,
    )

    return FinanceRecordFiltered.model_validate(finance_read)


async def _get_judicial_data(npc_id: UUID, db: AsyncSession) -> JudicialRecordFiltered | None:
    """Fetch judicial record with all related data for an NPC using eager loading."""
    judicial_query = select(JudicialRecord).where(JudicialRecord.npc_id == npc_id)

    result = await db.execute(judicial_query)
    judicial_record = result.scalar_one_or_none()

    if not judicial_record:
        return None

    # Relationships are eagerly loaded via lazy="selectin" in model
    judicial_read = JudicialRecordRead(
        id=judicial_record.id,
        npc_id=judicial_record.npc_id,
        has_criminal_record=judicial_record.has_criminal_record,
        has_civil_cases=judicial_record.has_civil_cases,
        has_traffic_violations=judicial_record.has_traffic_violations,
        criminal_records=[
            CriminalRecordRead.model_validate(c) for c in judicial_record.criminal_records
        ],
        civil_cases=[CivilCaseRead.model_validate(c) for c in judicial_record.civil_cases],
        traffic_violations=[
            TrafficViolationRead.model_validate(t) for t in judicial_record.traffic_violations
        ],
        created_at=judicial_record.created_at,
        updated_at=judicial_record.updated_at,
    )

    return JudicialRecordFiltered.model_validate(judicial_read)


async def _get_location_data(npc_id: UUID, db: AsyncSession) -> LocationRecordFiltered | None:
    """Fetch location record with all related data for an NPC using eager loading."""
    location_query = select(LocationRecord).where(LocationRecord.npc_id == npc_id)

    result = await db.execute(location_query)
    location_record = result.scalar_one_or_none()

    if not location_record:
        return None

    # Relationships are eagerly loaded via lazy="selectin" in model
    location_read = LocationRecordRead(
        id=location_record.id,
        npc_id=location_record.npc_id,
        tracking_enabled=location_record.tracking_enabled,
        data_retention_days=location_record.data_retention_days,
        inferred_locations=[
            InferredLocationRead.model_validate(i) for i in location_record.inferred_locations
        ],
        created_at=location_record.created_at,
        updated_at=location_record.updated_at,
    )

    return LocationRecordFiltered.model_validate(location_read)


async def _get_social_data(npc_id: UUID, db: AsyncSession) -> SocialMediaRecordFiltered | None:
    """Fetch social media record with all related data for an NPC using eager loading."""
    social_query = select(SocialMediaRecord).where(SocialMediaRecord.npc_id == npc_id)

    result = await db.execute(social_query)
    social_record = result.scalar_one_or_none()

    if not social_record:
        return None

    # Relationships are eagerly loaded via lazy="selectin" in model
    social_read = SocialMediaRecordRead(
        id=social_record.id,
        npc_id=social_record.npc_id,
        has_public_profile=social_record.has_public_profile,
        primary_platform=social_record.primary_platform,
        account_created_date=social_record.account_created_date,
        follower_count=social_record.follower_count,
        post_frequency=social_record.post_frequency,
        uses_end_to_end_encryption=social_record.uses_end_to_end_encryption,
        encryption_explanation=social_record.encryption_explanation,
        public_inferences=[
            PublicInferenceRead.model_validate(p) for p in social_record.public_inferences
        ],
        private_inferences=[
            PrivateInferenceRead.model_validate(p) for p in social_record.private_inferences
        ],
        created_at=social_record.created_at,
        updated_at=social_record.updated_at,
    )

    return SocialMediaRecordFiltered.model_validate(social_read)

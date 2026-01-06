"""Pydantic schemas for health record API endpoints."""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from datafusion.models.health import Severity


class HealthConditionRead(BaseModel):
    """Schema for health condition responses."""

    id: UUID
    health_record_id: UUID
    condition_name: str
    diagnosed_date: date
    severity: Severity
    is_chronic: bool
    is_sensitive: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HealthMedicationRead(BaseModel):
    """Schema for health medication responses."""

    id: UUID
    health_record_id: UUID
    medication_name: str
    dosage: str
    prescribed_date: date
    is_sensitive: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HealthVisitRead(BaseModel):
    """Schema for health visit responses."""

    id: UUID
    health_record_id: UUID
    visit_date: date
    provider_name: str
    reason: str
    notes: str | None
    is_sensitive: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HealthRecordRead(BaseModel):
    """Schema for complete health record with nested data."""

    id: UUID
    npc_id: UUID
    insurance_provider: str
    primary_care_physician: str
    conditions: list[HealthConditionRead]
    medications: list[HealthMedicationRead]
    visits: list[HealthVisitRead]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HealthRecordFiltered(BaseModel):
    """Schema for health record with content filtering applied."""

    id: UUID
    npc_id: UUID
    insurance_provider: str
    primary_care_physician: str
    conditions: list[HealthConditionRead]
    medications: list[HealthMedicationRead]
    visits: list[HealthVisitRead]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_health_record(
        cls, record: HealthRecordRead, filter_sensitive: bool = False
    ) -> "HealthRecordFiltered":
        """Create filtered health record, optionally excluding sensitive items."""
        if not filter_sensitive:
            return cls.model_validate(record)

        return cls(
            id=record.id,
            npc_id=record.npc_id,
            insurance_provider=record.insurance_provider,
            primary_care_physician=record.primary_care_physician,
            conditions=[c for c in record.conditions if not c.is_sensitive],
            medications=[m for m in record.medications if not m.is_sensitive],
            visits=[v for v in record.visits if not v.is_sensitive],
            created_at=record.created_at,
            updated_at=record.updated_at,
        )

"""Pydantic schemas for judicial record API endpoints."""

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from datafusion.models.judicial import (
    CaseDisposition,
    CivilCaseType,
    CrimeCategory,
    ViolationType,
)


class CriminalRecordRead(BaseModel):
    """Schema for criminal record responses."""

    id: UUID
    judicial_record_id: UUID
    case_number: str
    crime_category: CrimeCategory
    charge_description: str
    arrest_date: date
    disposition_date: date | None
    disposition: CaseDisposition
    sentence_description: str | None
    jail_time_days: int | None
    probation_months: int | None
    fine_amount: Decimal | None
    is_sealed: bool
    is_expunged: bool
    is_sensitive: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CivilCaseRead(BaseModel):
    """Schema for civil case responses."""

    id: UUID
    judicial_record_id: UUID
    case_number: str
    case_type: CivilCaseType
    case_description: str
    filed_date: date
    closed_date: date | None
    disposition: CaseDisposition
    plaintiff_name: str
    defendant_name: str
    is_plaintiff: bool
    judgment_amount: Decimal | None
    is_sensitive: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TrafficViolationRead(BaseModel):
    """Schema for traffic violation responses."""

    id: UUID
    judicial_record_id: UUID
    citation_number: str
    violation_type: ViolationType
    violation_description: str
    violation_date: date
    location: str
    fine_amount: Decimal
    points: int
    was_contested: bool
    is_paid: bool
    is_serious: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class JudicialRecordRead(BaseModel):
    """Schema for complete judicial record with nested data."""

    id: UUID
    npc_id: UUID
    has_criminal_record: bool
    has_civil_cases: bool
    has_traffic_violations: bool
    criminal_records: list[CriminalRecordRead]
    civil_cases: list[CivilCaseRead]
    traffic_violations: list[TrafficViolationRead]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class JudicialRecordFiltered(BaseModel):
    """Schema for judicial record with content filtering applied."""

    id: UUID
    npc_id: UUID
    has_criminal_record: bool
    has_civil_cases: bool
    has_traffic_violations: bool
    criminal_records: list[CriminalRecordRead]
    civil_cases: list[CivilCaseRead]
    traffic_violations: list[TrafficViolationRead]

    model_config = ConfigDict(from_attributes=True)

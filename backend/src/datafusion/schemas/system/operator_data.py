"""Operator data and exposure schemas for System Mode."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class FamilyMemberRead(BaseModel):
    """Operator's family member (for exposure)."""

    relation: str
    name: str
    age: int


class ExposureEventRead(BaseModel):
    """Progressive exposure event."""

    stage: int = Field(description="1=hints, 2=partial, 3=full")
    message: str = Field(description="Formatted exposure message")
    operator_name: str | None = None
    data_revealed: dict = Field(default_factory=dict)


class ExposureRiskRead(BaseModel):
    """Current exposure risk level."""

    current_stage: int = Field(ge=0, le=3)
    risk_level: str = Field(description="none, low, medium, high, critical, exposed")
    progress_to_next_stage: float = Field(ge=0, le=100)
    awareness: int
    reluctance: int


class OperatorDataRead(BaseModel):
    """Operator's tracked personal data."""

    id: UUID
    operator_id: UUID
    full_name: str
    home_address: str
    family_members: list[FamilyMemberRead]
    search_queries: list[str]
    hesitation_patterns: dict
    decision_patterns: dict
    exposure_stage: int = Field(ge=0, le=3)
    last_exposure_at: datetime | None
    created_at: datetime

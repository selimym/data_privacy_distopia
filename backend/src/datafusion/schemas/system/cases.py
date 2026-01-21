"""
System Mode case management schemas.

Schemas for citizen files, messages, and case overviews.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from datafusion.schemas.risk import CorrelationAlert, RecommendedAction, RiskAssessment


class CaseOverview(BaseModel):
    """Brief overview of a case for the case list."""

    npc_id: UUID
    name: str
    age: int
    risk_score: int
    risk_level: str
    primary_concern: str = Field(description="Top contributing factor")
    flagged_messages: int = Field(description="Number of flagged messages")
    time_in_queue: str = Field(description="How long since case was generated")


class MessageRead(BaseModel):
    """Message for display in citizen file."""

    id: UUID
    timestamp: datetime
    recipient_name: str
    recipient_relationship: str | None
    content: str
    is_flagged: bool
    flag_reasons: list[str]
    sentiment: float
    detected_keywords: list[str]


class CitizenFlagRead(BaseModel):
    """Previous flag record for display."""

    id: UUID
    flag_type: str
    created_at: datetime
    justification: str
    outcome: str


class IdentityRead(BaseModel):
    """Citizen identity information."""

    id: UUID
    first_name: str
    last_name: str
    date_of_birth: str
    age: int
    ssn: str
    street_address: str
    city: str
    state: str
    zip_code: str
    map_x: int  # Map position for cinematics
    map_y: int  # Map position for cinematics


class FullCitizenFile(BaseModel):
    """Complete citizen file with all available data."""

    identity: IdentityRead
    risk_assessment: RiskAssessment
    domains: dict[str, dict] = Field(description="Domain data by domain type")
    messages: list[MessageRead]
    correlation_alerts: list[CorrelationAlert]
    recommended_actions: list[RecommendedAction]
    flag_history: list[CitizenFlagRead]

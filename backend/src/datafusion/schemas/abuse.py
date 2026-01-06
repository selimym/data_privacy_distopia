"""Pydantic schemas for abuse system API endpoints."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from datafusion.models.abuse import ConsequenceSeverity, TargetType
from datafusion.models.consequence import TimeSkip
from datafusion.models.inference import ContentRating


class AbuseRoleRead(BaseModel):
    """Schema for reading abuse roles."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    role_key: str
    display_name: str
    description: str
    authorized_domains: str  # JSON string
    can_modify_data: bool
    created_at: datetime
    updated_at: datetime


class AbuseActionRead(BaseModel):
    """Schema for reading abuse actions."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    role_id: UUID
    action_key: str
    name: str
    description: str
    target_type: TargetType
    content_rating: ContentRating
    detection_chance: float = Field(ge=0.0, le=1.0)
    is_audit_logged: bool
    consequence_severity: ConsequenceSeverity
    created_at: datetime
    updated_at: datetime


class AbuseExecuteRequest(BaseModel):
    """Request to execute an abuse action."""

    role_key: str
    action_key: str
    target_npc_id: UUID


class AbuseExecuteResponse(BaseModel):
    """Response from executing an abuse action."""

    execution_id: UUID
    action_name: str
    target_name: str
    immediate_result: str = Field(description="What you see/learn immediately")
    data_revealed: dict | None = Field(default=None, description="The actual data you accessed")
    was_detected: bool
    detection_message: str | None = None
    warning: str | None = Field(default=None, description="Content warning if applicable")


class RealWorldParallel(BaseModel):
    """Real-world case parallel to illustrate consequences."""

    case: str
    summary: str
    source: str


class ConsequenceChain(BaseModel):
    """Chain of consequences over time for an abuse execution."""

    execution_id: UUID
    time_skips_available: list[TimeSkip] = Field(
        description="Time periods that have consequence data"
    )
    current_time_skip: TimeSkip
    events: list[str] = Field(description="Events that occurred at this time skip")
    victim_impact: str | None = Field(default=None, description="How the victim was affected")
    victim_statement: str | None = Field(
        default=None, description="Direct quote from victim (if available)"
    )
    your_status: str = Field(description="Player's employment/legal status")
    real_world_parallel: RealWorldParallel | None = None

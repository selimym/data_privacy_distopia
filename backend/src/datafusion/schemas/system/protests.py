"""Protest system schemas for System Mode."""
import enum
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ProtestStatus(str, enum.Enum):
    """Status of protest events."""

    FORMING = "forming"
    ACTIVE = "active"
    DISPERSED = "dispersed"
    VIOLENT = "violent"
    SUPPRESSED = "suppressed"


class ProtestRead(BaseModel):
    """Protest event."""

    id: UUID
    operator_id: UUID
    status: ProtestStatus
    neighborhood: str
    size: int = Field(description="Number of participants")
    trigger_action_id: UUID | None
    has_inciting_agent: bool
    inciting_agent_discovered: bool
    casualties: int
    arrests: int
    created_at: datetime
    resolved_at: datetime | None


class GambleResultRead(BaseModel):
    """Result of a high-risk gamble action."""

    success: bool
    awareness_change: int
    anger_change: int
    casualties: int = 0
    arrests: int = 0
    discovery_message: str | None = None

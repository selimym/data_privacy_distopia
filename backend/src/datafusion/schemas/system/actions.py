"""Action system schemas for System Mode."""
import enum
from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from .operator_data import ExposureEventRead


class ActionType(str, enum.Enum):
    """Unified action types - replaces and extends FlagType."""

    # Citizen-targeted (always available)
    MONITORING = "monitoring"
    RESTRICTION = "restriction"
    INTERVENTION = "intervention"
    DETENTION = "detention"

    # Neighborhood-targeted
    ICE_RAID = "ice_raid"

    # Journalist/Press-targeted (reactive)
    ARBITRARY_DETENTION = "arbitrary_detention"
    PRESSURE_FIRING = "pressure_firing"
    PRESS_BAN = "press_ban"

    # Book censorship (reactive)
    BOOK_BAN = "book_ban"

    # Protest-targeted (reactive)
    DECLARE_PROTEST_ILLEGAL = "declare_protest_illegal"
    INCITE_VIOLENCE = "incite_violence"

    # Hospital-targeted (conditional)
    HOSPITAL_ARREST = "hospital_arrest"


class SystemActionRequest(BaseModel):
    """Request to execute any system action."""

    operator_id: UUID
    directive_id: UUID | None
    action_type: ActionType
    justification: str = Field(min_length=10)
    decision_time_seconds: float

    # Targets (only populate the relevant one)
    target_citizen_id: UUID | None = None
    target_neighborhood: str | None = None
    target_news_channel_id: UUID | None = None
    target_protest_id: UUID | None = None


class SystemActionRead(BaseModel):
    """System action record."""

    id: UUID
    operator_id: UUID
    directive_id: UUID | None
    action_type: ActionType
    target_citizen_id: UUID | None
    target_neighborhood: str | None
    target_news_channel_id: UUID | None
    target_protest_id: UUID | None
    severity_score: int = Field(ge=1, le=10)
    backlash_probability: float
    was_successful: bool
    triggered_backlash: bool
    backlash_description: str | None
    justification: str
    decision_time_seconds: float
    was_hesitant: bool
    outcome_immediate: str | None
    outcome_1_month: str | None
    outcome_6_months: str | None
    outcome_1_year: str | None
    created_at: datetime


class ActionAvailabilityRead(BaseModel):
    """Check if an action is currently available."""

    action_type: ActionType
    available: bool
    reason: str = Field(description="Explanation if not available")


class TriggeredEventRead(BaseModel):
    """Event triggered by an action."""

    event_type: str = Field(description="news_article or protest")
    data: dict = Field(description="Event-specific data")


class TerminationDecisionRead(BaseModel):
    """Termination decision result."""

    should_terminate: bool
    reason: str
    ending_type: str


class ActionResultRead(BaseModel):
    """Comprehensive result of executing an action."""

    action_id: UUID | None
    success: bool
    severity: int
    backlash_occurred: bool

    # Metrics changes
    awareness_change: int
    anger_change: int
    reluctance_change: int

    # Triggered events
    news_articles_triggered: list[dict]
    protests_triggered: list[dict]
    exposure_event: "ExposureEventRead | None"

    # Special outcomes
    detention_injury: bool
    termination_decision: TerminationDecisionRead | None

    # Messages for player
    messages: list[str]
    warnings: list[str]


class NoActionResultRead(BaseModel):
    """Result of submitting a no-action decision (updated)."""

    success: bool
    reluctance_change: int
    messages: list[str]
    warnings: list[str]
    termination_decision: TerminationDecisionRead | None


class AvailableActionsRead(BaseModel):
    """List of currently available action types."""

    citizen_targeted: list[ActionType] = Field(
        description="Actions available for citizen targeting"
    )
    protest_targeted: list[ActionType] = Field(
        description="Actions available for active protests"
    )
    news_targeted: list[ActionType] = Field(
        description="Actions available for news channels"
    )
    other_available: list[ActionType] = Field(
        description="Other available actions (ICE raids, book bans, etc.)"
    )

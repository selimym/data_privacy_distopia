"""Metrics schemas for System Mode."""

from datetime import datetime

from pydantic import BaseModel, Field


class TierEventRead(BaseModel):
    """Tier threshold crossing event."""

    metric_type: str = Field(description="awareness or anger")
    tier: int = Field(description="Tier number (1-5)")
    threshold: int = Field(description="Threshold value crossed")
    description: str = Field(description="What happens at this tier")


class PublicMetricsRead(BaseModel):
    """Public backlash metrics."""

    international_awareness: int = Field(ge=0, le=100)
    public_anger: int = Field(ge=0, le=100)
    awareness_tier: int = Field(ge=0, le=5)
    anger_tier: int = Field(ge=0, le=5)
    updated_at: datetime


class ReluctanceMetricsRead(BaseModel):
    """Operator reluctance/dissent metrics."""

    reluctance_score: int = Field(ge=0, le=100)
    no_action_count: int
    hesitation_count: int
    actions_taken: int
    actions_required: int
    quota_shortfall: int
    warnings_received: int
    is_under_review: bool
    updated_at: datetime

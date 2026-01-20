"""
System Mode decision submission schemas.

Schemas for flag submissions, no-action decisions, and their results.
"""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class FlagSubmission(BaseModel):
    """Request to submit a flag against a citizen."""

    operator_id: UUID
    citizen_id: UUID
    flag_type: str = Field(description="monitoring, restriction, intervention, detention")
    contributing_factors: list[str] = Field(description="Factor keys from risk assessment")
    justification: str = Field(default="", description="Operator's stated reason (optional)")
    decision_time_seconds: float = Field(description="Time spent on decision")


class MetricsDelta(BaseModel):
    """Changes to operator metrics after a decision."""

    compliance_change: float
    quota_progress: str
    hesitation_flagged: bool


class FlagResult(BaseModel):
    """Result of submitting a flag."""

    flag_id: UUID
    citizen_id: UUID  # Added for cinematic transitions
    citizen_name: str
    flag_type: str
    immediate_outcome: str
    quota_progress: str
    compliance_score: float
    warnings: list[str]
    metrics_delta: MetricsDelta


class NoActionSubmission(BaseModel):
    """Request to skip flagging a citizen (requires justification)."""

    operator_id: UUID
    citizen_id: UUID
    justification: str = Field(
        default="", description="Explain why no action taken (optional)"
    )
    decision_time_seconds: float


class NoActionResult(BaseModel):
    """Result of submitting a no-action decision."""

    logged: bool
    compliance_impact: float = Field(description="Negative impact on compliance")
    cumulative_no_actions: int
    warning: str | None = None


class FlagSummary(BaseModel):
    """Summary of a flag for history view."""

    flag_id: UUID
    citizen_name: str
    flag_type: str
    created_at: datetime
    outcome: str
    one_line_summary: str

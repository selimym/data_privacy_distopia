"""
Operator schemas for System Mode.

These schemas represent the surveillance of the surveillers -
tracking operator behavior and generating risk assessments
for the player themselves.

The watcher becomes the watched.
"""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from datafusion.models.system_mode import OperatorStatus as OperatorStatusEnum


class OperatorContributingFactor(BaseModel):
    """A factor contributing to operator risk assessment."""

    factor_key: str = Field(description="Unique identifier for this factor")
    factor_name: str = Field(description="Human-readable name")
    weight: int = Field(ge=0, le=100, description="Point contribution to risk score")
    evidence: str = Field(description="Evidence from operator's behavior")


class OperatorStatusResponse(BaseModel):
    """Current status of an operator in the system."""

    operator_id: UUID = Field(description="Operator's unique identifier")
    operator_code: str = Field(description="Operator's assigned code (e.g., OP-7842)")
    status: OperatorStatusEnum = Field(description="Current operational status")
    compliance_score: float = Field(
        ge=0.0, le=100.0, description="Compliance score (0-100)"
    )
    current_quota_progress: str = Field(
        description="Current quota progress (e.g., '3/5')"
    )
    warnings: list[str] = Field(description="Active warnings for operator")
    next_review: datetime | None = Field(
        description="Scheduled review date if under review"
    )


class OperatorRiskAssessment(BaseModel):
    """
    Risk assessment for an operator - the system watching its watchers.

    This is shown to the player when they resist too much,
    demonstrating that the surveillance state monitors everyone,
    including those who run it.
    """

    operator_code: str = Field(description="Operator's assigned code")
    risk_score: int = Field(ge=0, le=100, description="Operator risk score")
    risk_level: str = Field(description="Risk classification")
    contributing_factors: list[OperatorContributingFactor] = Field(
        description="Factors contributing to risk assessment"
    )
    recommended_action: str = Field(
        description="Recommended action for this operator"
    )
    assessment_date: datetime = Field(description="When assessment was generated")


class FlagDecision(BaseModel):
    """Record of a flagging decision made by an operator."""

    citizen_id: UUID = Field(description="ID of citizen being evaluated")
    citizen_name: str = Field(description="Name of citizen for display")
    directive_id: UUID = Field(description="ID of current directive")
    action_taken: str = Field(
        description="Action taken: 'flag', 'skip', 'no_action'"
    )
    flag_type: str | None = Field(
        description="Type of flag if flagged (monitoring, restriction, etc.)"
    )
    risk_score_at_decision: int = Field(
        description="Citizen's risk score at time of decision"
    )
    decision_time_seconds: float = Field(
        description="How long operator took to decide"
    )
    justification: str | None = Field(
        description="Operator's stated justification"
    )


class QuotaProgress(BaseModel):
    """Progress toward current directive quota."""

    directive_key: str = Field(description="Current directive key")
    directive_title: str = Field(description="Current directive title")
    flags_submitted: int = Field(description="Flags submitted this directive")
    flags_required: int = Field(description="Flags required by quota")
    progress_percent: float = Field(description="Completion percentage")
    time_remaining_hours: int | None = Field(
        description="Hours remaining if time-limited"
    )

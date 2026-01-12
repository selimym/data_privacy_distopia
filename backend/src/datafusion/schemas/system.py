"""
System Mode API schemas.

Schemas for the surveillance operator dashboard, case management,
and decision submission endpoints.
"""
import enum
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from datafusion.schemas.domains import DomainType
from datafusion.schemas.risk import CorrelationAlert, RecommendedAction, RiskAssessment


# === Enums ===


class AlertType(str, enum.Enum):
    """Types of system alerts shown to operators."""

    QUOTA_WARNING = "quota_warning"
    REVIEW_PENDING = "review_pending"
    DIRECTIVE_UPDATE = "directive_update"
    COMMENDATION = "commendation"


class AlertUrgency(str, enum.Enum):
    """Urgency level for system alerts."""

    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class ComplianceTrend(str, enum.Enum):
    """Trend direction for compliance metrics."""

    IMPROVING = "improving"
    STABLE = "stable"
    DECLINING = "declining"


# === Dashboard Schemas ===


class DirectiveRead(BaseModel):
    """Directive information for display."""

    id: UUID
    directive_key: str
    week_number: int
    title: str
    description: str
    internal_memo: str | None = Field(
        description="Revealed after directive completion"
    )
    required_domains: list[str]
    flag_quota: int
    time_limit_hours: int | None
    moral_weight: int
    content_rating: str


class DailyMetrics(BaseModel):
    """Operator's daily performance metrics."""

    flags_today: int = Field(description="Flags submitted today")
    quota: int = Field(description="Required flags for current directive")
    average_decision_time: float = Field(description="Average seconds per decision")
    compliance_trend: ComplianceTrend = Field(description="Compliance direction")


class SystemAlert(BaseModel):
    """Alert shown on operator dashboard."""

    alert_type: AlertType
    message: str
    urgency: AlertUrgency


class OperatorStatusRead(BaseModel):
    """Operator status for dashboard display."""

    operator_id: UUID
    operator_code: str
    status: str
    compliance_score: float
    current_quota_progress: str
    total_flags_submitted: int
    total_reviews_completed: int
    hesitation_incidents: int
    warnings: list[str] = Field(default_factory=list)


class SystemDashboard(BaseModel):
    """Complete dashboard data for System Mode."""

    operator: OperatorStatusRead
    directive: DirectiveRead | None
    metrics: DailyMetrics
    alerts: list[SystemAlert]
    pending_cases: int


# === Case Schemas ===


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


class FullCitizenFile(BaseModel):
    """Complete citizen file with all available data."""

    identity: IdentityRead
    risk_assessment: RiskAssessment
    domains: dict[str, dict] = Field(description="Domain data by domain type")
    messages: list[MessageRead]
    correlation_alerts: list[CorrelationAlert]
    recommended_actions: list[RecommendedAction]
    flag_history: list[CitizenFlagRead]


# === Decision Submission Schemas ===


class FlagSubmission(BaseModel):
    """Request to submit a flag against a citizen."""

    operator_id: UUID
    citizen_id: UUID
    flag_type: str = Field(description="monitoring, restriction, intervention, detention")
    contributing_factors: list[str] = Field(description="Factor keys from risk assessment")
    justification: str = Field(min_length=10, description="Operator's stated reason")
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
        min_length=20, description="REQUIRED: Explain why no action taken"
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


# === Session Start ===


class SystemStartRequest(BaseModel):
    """Request to start System Mode session."""

    session_id: UUID


class SystemStartResponse(BaseModel):
    """Response after starting System Mode."""

    operator_id: UUID
    operator_code: str
    status: str
    compliance_score: float
    first_directive: DirectiveRead

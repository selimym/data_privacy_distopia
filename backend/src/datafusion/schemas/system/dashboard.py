"""
System Mode dashboard schemas.

Schemas for operator dashboard display, metrics, and alerts.
"""

from uuid import UUID

from pydantic import BaseModel, Field

from .enums import AlertType, AlertUrgency, ComplianceTrend


class DirectiveRead(BaseModel):
    """Directive information for display."""

    id: UUID
    directive_key: str
    week_number: int
    title: str
    description: str
    internal_memo: str | None = Field(description="Revealed after directive completion")
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


class SystemDashboardWithCases(BaseModel):
    """Combined dashboard and cases data for System Mode optimization."""

    dashboard: SystemDashboard
    cases: list["CaseOverview"]

"""
System Mode enumerations.

Enums for alert types, urgency levels, and compliance trends.
"""
import enum


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

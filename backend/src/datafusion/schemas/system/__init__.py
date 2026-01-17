"""
System Mode API schemas.

Schemas for the surveillance operator dashboard, case management,
and decision submission endpoints.

This module maintains backward compatibility by re-exporting all classes
from the split schema files.
"""
from .cases import (
    CaseOverview,
    CitizenFlagRead,
    FullCitizenFile,
    IdentityRead,
    MessageRead,
)
from .dashboard import (
    DailyMetrics,
    DirectiveRead,
    OperatorStatusRead,
    SystemAlert,
    SystemDashboard,
    SystemDashboardWithCases,
)
from .decisions import (
    FlagResult,
    FlagSubmission,
    FlagSummary,
    MetricsDelta,
    NoActionResult,
    NoActionSubmission,
)
from .enums import AlertType, AlertUrgency, ComplianceTrend
from .session import SystemStartRequest, SystemStartResponse

__all__ = [
    # Enums
    "AlertType",
    "AlertUrgency",
    "ComplianceTrend",
    # Dashboard
    "DirectiveRead",
    "DailyMetrics",
    "SystemAlert",
    "OperatorStatusRead",
    "SystemDashboard",
    "SystemDashboardWithCases",
    # Cases
    "CaseOverview",
    "MessageRead",
    "CitizenFlagRead",
    "IdentityRead",
    "FullCitizenFile",
    # Decisions
    "FlagSubmission",
    "MetricsDelta",
    "FlagResult",
    "NoActionSubmission",
    "NoActionResult",
    "FlagSummary",
    # Session
    "SystemStartRequest",
    "SystemStartResponse",
]

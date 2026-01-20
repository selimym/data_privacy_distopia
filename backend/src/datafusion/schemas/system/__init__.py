"""
System Mode API schemas.

Schemas for the surveillance operator dashboard, case management,
and decision submission endpoints.

This module maintains backward compatibility by re-exporting all classes
from the split schema files.
"""
from .actions import (
    ActionAvailabilityRead,
    ActionResultRead,
    ActionType,
    AvailableActionsRead,
    NoActionResultRead,
    SystemActionRead,
    SystemActionRequest,
    TerminationDecisionRead,
    TriggeredEventRead,
)
from .books import BookPublicationEventRead
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
from .geography import NeighborhoodRead
from .metrics import PublicMetricsRead, ReluctanceMetricsRead, TierEventRead
from .news import ArticleType, NewsArticleRead, NewsChannelRead, NewsReporterRead
from .operator_data import (
    ExposureEventRead,
    ExposureRiskRead,
    FamilyMemberRead,
    OperatorDataRead,
)
from .protests import GambleResultRead, ProtestRead, ProtestStatus
from .session import SystemStartRequest, SystemStartResponse

# Rebuild models with forward references after all imports
ActionResultRead.model_rebuild()
SystemDashboardWithCases.model_rebuild()

__all__ = [
    # Enums
    "AlertType",
    "AlertUrgency",
    "ComplianceTrend",
    "ActionType",
    "ArticleType",
    "ProtestStatus",
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
    # Metrics
    "TierEventRead",
    "PublicMetricsRead",
    "ReluctanceMetricsRead",
    # News
    "NewsReporterRead",
    "NewsChannelRead",
    "NewsArticleRead",
    # Protests
    "ProtestRead",
    "GambleResultRead",
    # Operator Data
    "FamilyMemberRead",
    "ExposureEventRead",
    "ExposureRiskRead",
    "OperatorDataRead",
    # Geography
    "NeighborhoodRead",
    # Books
    "BookPublicationEventRead",
    # Actions
    "SystemActionRequest",
    "SystemActionRead",
    "ActionAvailabilityRead",
    "ActionResultRead",
    "NoActionResultRead",
    "AvailableActionsRead",
    "TerminationDecisionRead",
    "TriggeredEventRead",
]

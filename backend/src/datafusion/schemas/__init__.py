"""Schemas package - exports all Pydantic schemas."""

from datafusion.schemas.domains import DomainData, DomainType, NPCWithDomains
from datafusion.schemas.health import (
    HealthConditionRead,
    HealthMedicationRead,
    HealthRecordFiltered,
    HealthRecordRead,
    HealthVisitRead,
)
from datafusion.schemas.npc import (
    NPCBase,
    NPCBasicRead,
    NPCCreate,
    NPCListResponse,
    NPCRead,
)
from datafusion.schemas.settings import ContentRating, UserSettings
from datafusion.schemas.system import (
    ActionAvailabilityRead,
    ActionResultRead,
    # Enums
    ActionType,
    ArticleType,
    AvailableActionsRead,
    # Books
    BookPublicationEventRead,
    ExposureEventRead,
    ExposureRiskRead,
    FamilyMemberRead,
    GambleResultRead,
    # Geography
    NeighborhoodRead,
    NewsArticleRead,
    # News
    NewsChannelRead,
    NewsReporterRead,
    NoActionResultRead,
    # Operator Data
    OperatorDataRead,
    # Protests
    ProtestRead,
    ProtestStatus,
    # Metrics
    PublicMetricsRead,
    ReluctanceMetricsRead,
    SystemActionRead,
    # Actions
    SystemActionRequest,
    TerminationDecisionRead,
    TierEventRead,
    TriggeredEventRead,
)

__all__ = [
    # NPC schemas
    "NPCBase",
    "NPCCreate",
    "NPCRead",
    "NPCBasicRead",
    "NPCListResponse",
    # Health schemas
    "HealthConditionRead",
    "HealthMedicationRead",
    "HealthVisitRead",
    "HealthRecordRead",
    "HealthRecordFiltered",
    # Domain schemas
    "DomainType",
    "DomainData",
    "NPCWithDomains",
    # Settings schemas
    "ContentRating",
    "UserSettings",
    # System Mode - Enums
    "ActionType",
    "ArticleType",
    "ProtestStatus",
    # System Mode - Metrics
    "PublicMetricsRead",
    "ReluctanceMetricsRead",
    "TierEventRead",
    # System Mode - News
    "NewsChannelRead",
    "NewsArticleRead",
    "NewsReporterRead",
    # System Mode - Protests
    "ProtestRead",
    "GambleResultRead",
    # System Mode - Operator Data
    "OperatorDataRead",
    "ExposureEventRead",
    "ExposureRiskRead",
    "FamilyMemberRead",
    # System Mode - Geography
    "NeighborhoodRead",
    # System Mode - Books
    "BookPublicationEventRead",
    # System Mode - Actions
    "SystemActionRequest",
    "SystemActionRead",
    "ActionAvailabilityRead",
    "ActionResultRead",
    "NoActionResultRead",
    "AvailableActionsRead",
    "TerminationDecisionRead",
    "TriggeredEventRead",
]

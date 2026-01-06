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
]

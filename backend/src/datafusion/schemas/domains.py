"""Pydantic schemas for domain data aggregation."""

import enum
from typing import Annotated, Union

from pydantic import BaseModel, ConfigDict, Field

from datafusion.schemas.finance import FinanceRecordFiltered
from datafusion.schemas.health import HealthRecordFiltered
from datafusion.schemas.judicial import JudicialRecordFiltered
from datafusion.schemas.location import LocationRecordFiltered
from datafusion.schemas.npc import NPCRead
from datafusion.schemas.social import SocialMediaRecordFiltered


class DomainType(enum.Enum):
    """Available data domains in the game."""

    HEALTH = "health"
    FINANCE = "finance"
    JUDICIAL = "judicial"
    LOCATION = "location"
    SOCIAL = "social"


DomainData = Annotated[
    Union[
        HealthRecordFiltered,
        FinanceRecordFiltered,
        JudicialRecordFiltered,
        LocationRecordFiltered,
        SocialMediaRecordFiltered,
    ],
    Field(discriminator=None),
]


class NPCWithDomains(BaseModel):
    """NPC data with associated domain data."""

    npc: NPCRead
    domains: dict[DomainType, DomainData]

    model_config = ConfigDict(from_attributes=True)

"""Pydantic schemas for NPC API endpoints."""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from datafusion.models.npc import Role


class NPCBase(BaseModel):
    """Shared NPC fields for create/update operations."""

    first_name: str
    last_name: str
    date_of_birth: date
    ssn: str

    street_address: str
    city: str
    state: str
    zip_code: str

    role: Role
    sprite_key: str

    map_x: int
    map_y: int

    is_scenario_npc: bool = False
    scenario_key: str | None = None


class NPCCreate(NPCBase):
    """Schema for creating a new NPC."""

    pass


class NPCRead(NPCBase):
    """Schema for NPC API responses with full details."""

    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NPCBasicRead(BaseModel):
    """Minimal NPC info for map rendering."""

    id: UUID
    first_name: str
    last_name: str
    role: Role
    sprite_key: str
    map_x: int
    map_y: int

    model_config = ConfigDict(from_attributes=True)


class NPCListResponse(BaseModel):
    """Paginated list of NPCs."""

    items: list[NPCBasicRead]
    total: int
    limit: int
    offset: int

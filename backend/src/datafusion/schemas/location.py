"""Pydantic schemas for location record API endpoints."""

from datetime import time, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from datafusion.models.location import LocationType


class InferredLocationRead(BaseModel):
    """Schema for inferred location responses."""

    id: UUID
    location_record_id: UUID
    location_type: LocationType
    location_name: str
    street_address: str
    city: str
    state: str
    zip_code: str
    typical_days: str
    typical_arrival_time: time | None
    typical_departure_time: time | None
    visit_frequency: str
    inferred_relationship: str | None
    privacy_implications: str
    is_sensitive: bool
    confidence_score: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LocationRecordRead(BaseModel):
    """Schema for complete location record with nested data."""

    id: UUID
    npc_id: UUID
    tracking_enabled: bool
    data_retention_days: int
    inferred_locations: list[InferredLocationRead]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LocationRecordFiltered(BaseModel):
    """Schema for location record with content filtering applied."""

    id: UUID
    npc_id: UUID
    tracking_enabled: bool
    data_retention_days: int
    inferred_locations: list[InferredLocationRead]

    model_config = ConfigDict(from_attributes=True)

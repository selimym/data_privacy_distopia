"""Geography schemas for System Mode."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class NeighborhoodRead(BaseModel):
    """Map neighborhood for ICE raids and protests."""

    id: UUID
    name: str
    description: str
    center_x: int
    center_y: int
    bounds_min_x: int
    bounds_min_y: int
    bounds_max_x: int
    bounds_max_y: int
    population_estimate: int
    primary_demographics: list[str]
    created_at: datetime

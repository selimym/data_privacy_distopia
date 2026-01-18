"""Book publication schemas for System Mode."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class BookPublicationEventRead(BaseModel):
    """Controversial book publication event."""

    id: UUID
    operator_id: UUID
    title: str
    author: str
    summary: str
    controversy_type: str
    was_banned: bool
    ban_action_id: UUID | None
    published_at: datetime | None
    awareness_impact: int
    created_at: datetime

"""News system schemas for System Mode."""
import enum
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ArticleType(str, enum.Enum):
    """Types of news articles."""

    RANDOM = "random"
    TRIGGERED = "triggered"
    EXPOSURE = "exposure"


class NewsReporterRead(BaseModel):
    """News reporter information."""

    name: str
    specialty: str
    fired: bool = False
    targeted: bool = False


class NewsChannelRead(BaseModel):
    """News organization."""

    id: UUID
    name: str
    stance: str = Field(description="critical, independent, or state_friendly")
    credibility: int = Field(ge=0, le=100)
    is_banned: bool
    banned_at: datetime | None
    reporters: list[NewsReporterRead]
    created_at: datetime


class NewsArticleRead(BaseModel):
    """Published news article."""

    id: UUID
    operator_id: UUID
    news_channel_id: UUID
    channel_name: str = Field(description="Denormalized for display")
    article_type: ArticleType
    headline: str
    summary: str
    triggered_by_action_id: UUID | None
    public_anger_change: int
    international_awareness_change: int
    was_suppressed: bool
    suppression_action_id: UUID | None
    created_at: datetime

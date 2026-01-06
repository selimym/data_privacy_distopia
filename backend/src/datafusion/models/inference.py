"""Inference engine models for data fusion analysis."""

import enum
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from datafusion.database import Base


class ContentRating(str, enum.Enum):
    """Content rating for inferences based on sensitivity/scariness."""

    SAFE = "SAFE"  # General audience, no concerning implications
    CAUTIONARY = "CAUTIONARY"  # Mildly concerning, privacy awareness
    SERIOUS = "SERIOUS"  # Significant privacy implications
    DISTURBING = "DISTURBING"  # Highly invasive or unethical implications
    DYSTOPIAN = "DYSTOPIAN"  # Extreme scenarios, demonstrating worst-case abuse


class InferenceRule(Base):
    """
    Inference rule for analyzing NPC data across domains.

    Rules are stored in the database for extensibility - new rules can be
    added without code changes. Each rule specifies which domains it requires
    and produces insights when those domains are available.
    """

    __tablename__ = "inference_rules"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    rule_key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # Store as JSON array for SQLite compatibility
    # For PostgreSQL, this could use ARRAY(String) directly
    required_domains: Mapped[str] = mapped_column(Text, nullable=False)

    scariness_level: Mapped[int] = mapped_column(Integer, nullable=False)
    content_rating: Mapped[str] = mapped_column(String(20), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<InferenceRule {self.rule_key}: {self.name}>"

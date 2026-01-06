"""Consequence system models for tracking abuse outcomes."""

import enum
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from datafusion.database import Base


class TimeSkip(str, enum.Enum):
    """Time periods for consequence progression."""

    IMMEDIATE = "immediate"
    ONE_WEEK = "1_week"
    ONE_MONTH = "1_month"
    SIX_MONTHS = "6_months"
    ONE_YEAR = "1_year"


class ConsequenceTemplate(Base):
    """
    Template for consequences that result from abuse actions.

    Defines what happens to victims over time when player abuses their data.
    """

    __tablename__ = "consequence_templates"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    action_id: Mapped[UUID] = mapped_column(
        ForeignKey("abuse_actions.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Optional: for scenario-specific consequences
    target_scenario_key: Mapped[str | None] = mapped_column(String(100), nullable=True)

    time_skip: Mapped[str] = mapped_column(String(20), nullable=False)  # TimeSkip enum
    content_rating: Mapped[str] = mapped_column(String(20), nullable=False)  # ContentRating enum

    # JSON array of event descriptions that happen at this time skip
    events: Mapped[str] = mapped_column(Text, nullable=False)

    # Optional victim's perspective text
    victim_impact: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Optional real-world parallel
    # JSON format: {"case": "...", "summary": "...", "source": "..."}
    real_world_parallel: Mapped[str | None] = mapped_column(Text, nullable=True)

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
        return f"<ConsequenceTemplate action_id={self.action_id}, time_skip={self.time_skip}>"

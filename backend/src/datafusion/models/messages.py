"""
Message surveillance models - the "chat control" dystopia.

Stores private communications between citizens for algorithmic analysis.
Educational purpose: Demonstrates the dangers of mass message surveillance.
"""
from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import JSON, Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from datafusion.database import Base


class MessageRecord(Base):
    """
    Message history for an NPC - aggregate stats from message surveillance.

    One-to-one with NPC, contains their complete message surveillance profile.
    """

    __tablename__ = "message_records"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    npc_id: Mapped[UUID] = mapped_column(
        ForeignKey("npcs.id", ondelete="CASCADE"), unique=True, index=True
    )
    total_messages_analyzed: Mapped[int] = mapped_column(Integer, default=0)
    flagged_message_count: Mapped[int] = mapped_column(Integer, default=0)
    sentiment_score: Mapped[float] = mapped_column(
        Float, default=0.0
    )  # -1 (anti-establishment) to 1 (supportive)
    encryption_attempts: Mapped[int] = mapped_column(
        Integer, default=0
    )  # Attempts to use encryption
    foreign_contact_count: Mapped[int] = mapped_column(
        Integer, default=0
    )  # Messages to/from foreign contacts
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC)
    )

    # Relationships
    npc: Mapped["NPC"] = relationship(back_populates="message_record")  # type: ignore
    messages: Mapped[list["Message"]] = relationship(
        back_populates="message_record", cascade="all, delete-orphan"
    )


class Message(Base):
    """
    Individual intercepted message.

    Represents the invasion of private communications - every text, email,
    chat message stored and analyzed by the surveillance state.
    """

    __tablename__ = "messages"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    message_record_id: Mapped[UUID] = mapped_column(
        ForeignKey("message_records.id", ondelete="CASCADE"), index=True
    )
    timestamp: Mapped[datetime] = mapped_column(index=True)
    recipient_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("npcs.id", ondelete="SET NULL"), nullable=True, index=True
    )  # Null for group/public messages
    recipient_name: Mapped[str] = mapped_column(
        String(200)
    )  # Denormalized for display
    recipient_relationship: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )  # friend, family, coworker, unknown
    content: Mapped[str] = mapped_column(Text)  # The actual message text
    is_flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    flag_reasons: Mapped[list] = mapped_column(
        JSON, default=list
    )  # Array of strings - why it was flagged
    sentiment: Mapped[float] = mapped_column(Float, default=0.0)  # Message sentiment
    detected_keywords: Mapped[list] = mapped_column(
        JSON, default=list
    )  # Array of strings - flagged keywords found
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))

    # Relationships
    message_record: Mapped["MessageRecord"] = relationship(back_populates="messages")
    recipient: Mapped["NPC | None"] = relationship(foreign_keys=[recipient_id])  # type: ignore

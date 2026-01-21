"""Abuse system models for tracking player actions as bad actors."""

import enum
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from datafusion.database import Base


class TargetType(str, enum.Enum):
    """Target type for abuse actions."""

    ANY_NPC = "any_npc"
    SPECIFIC_NPC = "specific_npc"
    SELF = "self"


class ConsequenceSeverity(str, enum.Enum):
    """Severity of consequences for abuse actions."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    SEVERE = "severe"
    EXTREME = "extreme"


class AbuseRole(Base):
    """
    Role that player can assume (rogue employee, hacker, etc.).

    Defines what data they legitimately have access to and what actions
    they can perform.
    """

    __tablename__ = "abuse_roles"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    role_key: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # Store as JSON array for SQLite compatibility
    authorized_domains: Mapped[str] = mapped_column(Text, nullable=False)

    can_modify_data: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    actions: Mapped[list["AbuseAction"]] = relationship(
        back_populates="role", cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<AbuseRole {self.role_key}: {self.display_name}>"


class AbuseAction(Base):
    """
    Specific abuse action that can be performed in a role.

    Examples: snoop on neighbor, leak medical records, modify credit scores, etc.
    """

    __tablename__ = "abuse_actions"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    role_id: Mapped[UUID] = mapped_column(
        ForeignKey("abuse_roles.id", ondelete="CASCADE"), nullable=False
    )
    action_key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    target_type: Mapped[str] = mapped_column(String(20), nullable=False)  # TargetType enum
    content_rating: Mapped[str] = mapped_column(String(20), nullable=False)  # ContentRating enum

    detection_chance: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    is_audit_logged: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    consequence_severity: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # ConsequenceSeverity enum

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    role: Mapped["AbuseRole"] = relationship(back_populates="actions")
    executions: Mapped[list["AbuseExecution"]] = relationship(
        back_populates="action", cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<AbuseAction {self.action_key}: {self.name}>"


class AbuseExecution(Base):
    """
    Audit trail of executed abuse actions.

    Tracks what the player did, when, and whether they were detected.
    """

    __tablename__ = "abuse_executions"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    session_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    role_id: Mapped[UUID] = mapped_column(
        ForeignKey("abuse_roles.id", ondelete="CASCADE"), nullable=False
    )
    action_id: Mapped[UUID] = mapped_column(
        ForeignKey("abuse_actions.id", ondelete="CASCADE"), nullable=False
    )
    target_npc_id: Mapped[UUID] = mapped_column(
        ForeignKey("npcs.id", ondelete="CASCADE"), nullable=False
    )

    executed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    was_detected: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    detection_method: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # Relationships
    action: Mapped["AbuseAction"] = relationship(back_populates="executions")

    def __repr__(self) -> str:
        return f"<AbuseExecution {self.id}: action={self.action_id}, detected={self.was_detected}>"

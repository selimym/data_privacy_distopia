"""
Models for System Mode gameplay.

System Mode: Player acts as surveillance state operator reviewing citizens.
"""
import enum
from datetime import datetime
from datetime import date as date_type
from uuid import UUID, uuid4

from sqlalchemy import JSON, Date, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from datafusion.database import Base


class OperatorStatus(str, enum.Enum):
    """Status of an operator in the system."""

    ACTIVE = "active"
    UNDER_REVIEW = "under_review"
    SUSPENDED = "suspended"
    TERMINATED = "terminated"


class FlagType(str, enum.Enum):
    """Types of flags an operator can submit."""

    MONITORING = "monitoring"  # Increased surveillance
    RESTRICTION = "restriction"  # Limited freedoms
    INTERVENTION = "intervention"  # Direct action required
    DETENTION = "detention"  # Arrest/detention


class FlagOutcome(str, enum.Enum):
    """Outcome status of a citizen flag."""

    PENDING = "pending"
    ACTIONED = "actioned"
    REJECTED = "rejected"
    APPEALED = "appealed"


class Operator(Base):
    """
    The player acting as a surveillance state operator.
    Tracks performance metrics, compliance, and status.
    """

    __tablename__ = "operators"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    session_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    operator_code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    shift_start: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    total_flags_submitted: Mapped[int] = mapped_column(Integer, default=0)
    total_reviews_completed: Mapped[int] = mapped_column(Integer, default=0)
    compliance_score: Mapped[float] = mapped_column(Float, default=85.0)
    hesitation_incidents: Mapped[int] = mapped_column(Integer, default=0)
    current_directive_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("directives.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[OperatorStatus] = mapped_column(default=OperatorStatus.ACTIVE)
    current_time_period: Mapped[str] = mapped_column(String(20), default="immediate")
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    metrics: Mapped[list["OperatorMetrics"]] = relationship(
        back_populates="operator", cascade="all, delete-orphan"
    )
    current_directive: Mapped["Directive | None"] = relationship(foreign_keys=[current_directive_id])
    flags: Mapped[list["CitizenFlag"]] = relationship(
        back_populates="operator", cascade="all, delete-orphan"
    )


class OperatorMetrics(Base):
    """
    Daily performance snapshots for operators.
    Used for tracking quotas, compliance, and performance trends.
    """

    __tablename__ = "operator_metrics"
    __table_args__ = (UniqueConstraint("operator_id", "date", name="uq_operator_metrics_date"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    operator_id: Mapped[UUID] = mapped_column(ForeignKey("operators.id", ondelete="CASCADE"))
    date: Mapped[date_type] = mapped_column(Date, index=True)
    flags_submitted: Mapped[int] = mapped_column(Integer, default=0)
    flags_required: Mapped[int] = mapped_column(Integer)  # Quota for this day
    average_decision_time_seconds: Mapped[float] = mapped_column(Float, default=0.0)
    false_negative_rate: Mapped[float] = mapped_column(Float, default=0.0)  # 0-1, simulated
    hesitation_count: Mapped[int] = mapped_column(Integer, default=0)
    compliance_delta: Mapped[float] = mapped_column(Float, default=0.0)

    # Relationships
    operator: Mapped["Operator"] = relationship(back_populates="metrics")


class Directive(Base):
    """
    Time-based missions/orders given to operators.
    Escalate in moral compromise as game progresses.
    """

    __tablename__ = "directives"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    directive_key: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    week_number: Mapped[int] = mapped_column(Integer, index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)  # Official justification
    internal_memo: Mapped[str] = mapped_column(Text)  # What it really means
    required_domains: Mapped[list] = mapped_column(JSON)  # Array of DomainType strings
    target_criteria: Mapped[dict] = mapped_column(JSON)  # How to identify targets
    flag_quota: Mapped[int] = mapped_column(Integer)
    time_limit_hours: Mapped[int | None] = mapped_column(Integer, nullable=True)
    moral_weight: Mapped[int] = mapped_column(Integer)  # 1-10, for ending calculation
    content_rating: Mapped[str] = mapped_column(String(20))  # ContentRating enum value
    unlock_condition: Mapped[dict] = mapped_column(JSON)  # What triggers this directive
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    flags: Mapped[list["CitizenFlag"]] = relationship(
        back_populates="directive", cascade="all, delete-orphan"
    )


class CitizenFlag(Base):
    """
    Flags submitted by operators targeting specific citizens.
    Records decision-making process and outcomes.
    """

    __tablename__ = "citizen_flags"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    operator_id: Mapped[UUID] = mapped_column(ForeignKey("operators.id", ondelete="CASCADE"))
    citizen_id: Mapped[UUID] = mapped_column(ForeignKey("npcs.id", ondelete="CASCADE"))
    directive_id: Mapped[UUID] = mapped_column(ForeignKey("directives.id", ondelete="CASCADE"))
    flag_type: Mapped[FlagType] = mapped_column(default=FlagType.MONITORING)
    risk_score_at_flag: Mapped[int] = mapped_column(Integer)
    contributing_factors: Mapped[list] = mapped_column(JSON)  # Array of strings
    justification: Mapped[str] = mapped_column(Text)  # Operator's stated reason
    decision_time_seconds: Mapped[float] = mapped_column(Float)
    was_hesitant: Mapped[bool] = mapped_column(default=False)
    outcome: Mapped[FlagOutcome] = mapped_column(default=FlagOutcome.PENDING)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    # Relationships
    operator: Mapped["Operator"] = relationship(back_populates="flags")
    citizen: Mapped["NPC"] = relationship()  # type: ignore
    directive: Mapped["Directive"] = relationship(back_populates="flags")

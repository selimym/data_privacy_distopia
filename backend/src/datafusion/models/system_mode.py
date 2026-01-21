"""
Models for System Mode gameplay.

System Mode: Player acts as surveillance state operator reviewing citizens.
"""

import enum
from datetime import UTC, datetime
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
    """Types of flags an operator can submit. DEPRECATED: Use ActionType instead."""

    MONITORING = "monitoring"  # Increased surveillance
    RESTRICTION = "restriction"  # Limited freedoms
    INTERVENTION = "intervention"  # Direct action required
    DETENTION = "detention"  # Arrest/detention


class ActionType(str, enum.Enum):
    """
    Unified action types - replaces and extends FlagType.
    All operator actions tracked with severity scores.
    """

    # Citizen-targeted (ALWAYS AVAILABLE for directive quota)
    MONITORING = "monitoring"  # Severity: 1
    RESTRICTION = "restriction"  # Severity: 2
    INTERVENTION = "intervention"  # Severity: 5
    DETENTION = "detention"  # Severity: 6

    # Neighborhood-targeted (ALWAYS AVAILABLE, but directive-specific)
    ICE_RAID = "ice_raid"  # Severity: 7 (available in certain directives)

    # Journalist/Press-targeted (REACTIVE - only available when triggered)
    ARBITRARY_DETENTION = "arbitrary_detention"  # Severity: 7
    PRESSURE_FIRING = "pressure_firing"  # Severity: 6
    PRESS_BAN = "press_ban"  # Severity: 5

    # Book censorship (REACTIVE - only when problematic book event occurs)
    BOOK_BAN = "book_ban"  # Severity: 4

    # Protest-targeted (REACTIVE - only when protest exists)
    DECLARE_PROTEST_ILLEGAL = "declare_protest_illegal"  # Severity: 7
    INCITE_VIOLENCE = "incite_violence"  # Severity: 9

    # Hospital-targeted (CONDITIONAL - only after violent detention)
    HOSPITAL_ARREST = "hospital_arrest"  # Severity: 8


class ArticleType(str, enum.Enum):
    """Types of news articles."""

    RANDOM = "random"
    TRIGGERED = "triggered"  # Response to action
    EXPOSURE = "exposure"  # About operator


class ProtestStatus(str, enum.Enum):
    """Status of a protest event."""

    FORMING = "forming"
    ACTIVE = "active"
    DISPERSED = "dispersed"
    VIOLENT = "violent"
    SUPPRESSED = "suppressed"


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
    shift_start: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))
    total_flags_submitted: Mapped[int] = mapped_column(Integer, default=0)
    total_reviews_completed: Mapped[int] = mapped_column(Integer, default=0)
    compliance_score: Mapped[float] = mapped_column(Float, default=85.0)
    hesitation_incidents: Mapped[int] = mapped_column(Integer, default=0)
    current_directive_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("directives.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[OperatorStatus] = mapped_column(default=OperatorStatus.ACTIVE)
    current_time_period: Mapped[str] = mapped_column(String(20), default="immediate")
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC)
    )

    # Relationships
    metrics: Mapped[list["OperatorMetrics"]] = relationship(
        back_populates="operator", cascade="all, delete-orphan"
    )
    current_directive: Mapped["Directive | None"] = relationship(
        foreign_keys=[current_directive_id]
    )
    flags: Mapped[list["CitizenFlag"]] = relationship(
        back_populates="operator", cascade="all, delete-orphan"
    )
    # New relationships for expanded system mechanics
    actions: Mapped[list["SystemAction"]] = relationship(
        back_populates="operator", cascade="all, delete-orphan"
    )
    public_metrics: Mapped["PublicMetrics | None"] = relationship(
        back_populates="operator", uselist=False, cascade="all, delete-orphan"
    )
    reluctance_metrics: Mapped["ReluctanceMetrics | None"] = relationship(
        back_populates="operator", uselist=False, cascade="all, delete-orphan"
    )
    operator_data: Mapped["OperatorData | None"] = relationship(
        back_populates="operator", uselist=False, cascade="all, delete-orphan"
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
    internal_memo: Mapped[str | None] = mapped_column(Text, nullable=True)  # What it really means
    required_domains: Mapped[list] = mapped_column(JSON)  # Array of DomainType strings
    target_criteria: Mapped[dict] = mapped_column(JSON)  # How to identify targets
    flag_quota: Mapped[int] = mapped_column(Integer)
    time_limit_hours: Mapped[int | None] = mapped_column(Integer, nullable=True)
    moral_weight: Mapped[int] = mapped_column(Integer)  # 1-10, for ending calculation
    content_rating: Mapped[str] = mapped_column(String(20))  # ContentRating enum value
    unlock_condition: Mapped[dict] = mapped_column(JSON)  # What triggers this directive
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC)
    )

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
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))

    # Relationships
    operator: Mapped["Operator"] = relationship(back_populates="flags")
    citizen: Mapped["NPC"] = relationship()  # type: ignore
    directive: Mapped["Directive"] = relationship(back_populates="flags")


# ============================================================================
# NEW MODELS FOR EXPANDED SYSTEM MODE MECHANICS
# ============================================================================


class SystemAction(Base):
    """
    Unified action system - all operator actions tracked here.
    Replaces and extends CitizenFlag.
    """

    __tablename__ = "system_actions"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    operator_id: Mapped[UUID] = mapped_column(ForeignKey("operators.id", ondelete="CASCADE"))
    directive_id: Mapped[UUID | None] = mapped_column(ForeignKey("directives.id"), nullable=True)

    action_type: Mapped[ActionType] = mapped_column()

    # Targets (only one populated based on action type)
    target_citizen_id: Mapped[UUID | None] = mapped_column(ForeignKey("npcs.id"), nullable=True)
    target_neighborhood: Mapped[str | None] = mapped_column(String(100), nullable=True)
    target_news_channel_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("news_channels.id"), nullable=True
    )
    target_protest_id: Mapped[UUID | None] = mapped_column(ForeignKey("protests.id"), nullable=True)

    # Risk assessment
    severity_score: Mapped[int] = mapped_column(Integer)  # 1-10
    backlash_probability: Mapped[float] = mapped_column(Float)  # Calculated at submission

    # Outcomes
    was_successful: Mapped[bool] = mapped_column(default=True)
    triggered_backlash: Mapped[bool] = mapped_column(default=False)
    backlash_description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Metadata
    justification: Mapped[str] = mapped_column(Text)
    decision_time_seconds: Mapped[float] = mapped_column(Float)
    was_hesitant: Mapped[bool] = mapped_column(default=False)

    # For citizen-targeted actions, track outcomes over time
    outcome_immediate: Mapped[str | None] = mapped_column(Text, nullable=True)
    outcome_1_month: Mapped[str | None] = mapped_column(Text, nullable=True)
    outcome_6_months: Mapped[str | None] = mapped_column(Text, nullable=True)
    outcome_1_year: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))

    # Relationships
    operator: Mapped["Operator"] = relationship(back_populates="actions")
    directive: Mapped["Directive | None"] = relationship()
    citizen: Mapped["NPC | None"] = relationship()  # type: ignore
    news_channel: Mapped["NewsChannel | None"] = relationship()
    protest: Mapped["Protest | None"] = relationship(foreign_keys=[target_protest_id])


class PublicMetrics(Base):
    """Tracks international awareness and public anger."""

    __tablename__ = "public_metrics"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    operator_id: Mapped[UUID] = mapped_column(
        ForeignKey("operators.id", ondelete="CASCADE"), unique=True
    )

    # Public backlash metrics
    international_awareness: Mapped[int] = mapped_column(Integer, default=0)  # 0-100
    public_anger: Mapped[int] = mapped_column(Integer, default=0)  # 0-100

    # Tier tracking (0-5, triggers events at thresholds)
    awareness_tier: Mapped[int] = mapped_column(Integer, default=0)
    anger_tier: Mapped[int] = mapped_column(Integer, default=0)

    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC)
    )

    # Relationships
    operator: Mapped["Operator"] = relationship(back_populates="public_metrics")


class ReluctanceMetrics(Base):
    """Tracks operator's unwillingness to comply - personal risk metric."""

    __tablename__ = "reluctance_metrics"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    operator_id: Mapped[UUID] = mapped_column(
        ForeignKey("operators.id", ondelete="CASCADE"), unique=True
    )

    # Core reluctance tracking
    reluctance_score: Mapped[int] = mapped_column(Integer, default=0)  # 0-100
    no_action_count: Mapped[int] = mapped_column(Integer, default=0)
    hesitation_count: Mapped[int] = mapped_column(Integer, default=0)

    # Quota performance
    actions_taken: Mapped[int] = mapped_column(Integer, default=0)
    actions_required: Mapped[int] = mapped_column(Integer, default=0)
    quota_shortfall: Mapped[int] = mapped_column(Integer, default=0)

    # Warning tracking
    warnings_received: Mapped[int] = mapped_column(Integer, default=0)
    is_under_review: Mapped[bool] = mapped_column(default=False)

    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC)
    )

    # Relationships
    operator: Mapped["Operator"] = relationship(back_populates="reluctance_metrics")


class NewsChannel(Base):
    """News organizations - can publish critical articles or be suppressed."""

    __tablename__ = "news_channels"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)

    name: Mapped[str] = mapped_column(String(200))
    stance: Mapped[str] = mapped_column(String(50))  # "critical", "independent", "state_friendly"
    credibility: Mapped[int] = mapped_column(Integer, default=75)  # 0-100

    # Suppression status
    is_banned: Mapped[bool] = mapped_column(default=False)
    banned_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # Reporters (list of dicts with {name, specialty, fired, targeted})
    reporters: Mapped[list[dict]] = mapped_column(JSON, default=list)

    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))

    # Relationships
    articles: Mapped[list["NewsArticle"]] = relationship(
        back_populates="news_channel", cascade="all, delete-orphan"
    )


class NewsArticle(Base):
    """Published news articles - can increase public metrics."""

    __tablename__ = "news_articles"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    operator_id: Mapped[UUID] = mapped_column(ForeignKey("operators.id", ondelete="CASCADE"))
    news_channel_id: Mapped[UUID] = mapped_column(
        ForeignKey("news_channels.id", ondelete="CASCADE")
    )

    article_type: Mapped[ArticleType] = mapped_column()
    headline: Mapped[str] = mapped_column(String(300))
    summary: Mapped[str] = mapped_column(Text)

    # If triggered by action
    triggered_by_action_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("system_actions.id"), nullable=True
    )

    # Impact on metrics
    public_anger_change: Mapped[int] = mapped_column(Integer, default=0)
    international_awareness_change: Mapped[int] = mapped_column(Integer, default=0)

    # Suppression
    was_suppressed: Mapped[bool] = mapped_column(default=False)
    suppression_action_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("system_actions.id"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))

    # Relationships
    operator: Mapped["Operator"] = relationship()
    news_channel: Mapped["NewsChannel"] = relationship(back_populates="articles")


class Protest(Base):
    """Protest events triggered by high public anger."""

    __tablename__ = "protests"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    operator_id: Mapped[UUID] = mapped_column(ForeignKey("operators.id", ondelete="CASCADE"))

    status: Mapped[ProtestStatus] = mapped_column(default=ProtestStatus.FORMING)
    neighborhood: Mapped[str] = mapped_column(String(100))  # Map location
    size: Mapped[int] = mapped_column(Integer)  # Participants count

    # Trigger
    trigger_action_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("system_actions.id", use_alter=True, name="fk_protest_trigger_action"),
        nullable=True,
    )

    # Inciting agent tracking
    has_inciting_agent: Mapped[bool] = mapped_column(default=False)
    inciting_agent_discovered: Mapped[bool] = mapped_column(default=False)

    # Outcomes
    casualties: Mapped[int] = mapped_column(Integer, default=0)
    arrests: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))
    resolved_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # Relationships
    operator: Mapped["Operator"] = relationship()
    trigger_action: Mapped["SystemAction | None"] = relationship(foreign_keys=[trigger_action_id])


class OperatorData(Base):
    """Operator's personal data - exposed progressively to make player uncomfortable."""

    __tablename__ = "operator_data"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    operator_id: Mapped[UUID] = mapped_column(
        ForeignKey("operators.id", ondelete="CASCADE"), unique=True
    )

    # Personal info (generated at session start)
    full_name: Mapped[str] = mapped_column(String(200))
    home_address: Mapped[str] = mapped_column(String(300))
    family_members: Mapped[list[dict]] = mapped_column(JSON, default=list)

    # Behavioral tracking (accumulated during play)
    search_queries: Mapped[list[str]] = mapped_column(JSON, default=list)
    hesitation_patterns: Mapped[dict] = mapped_column(JSON, default=dict)
    decision_patterns: Mapped[dict] = mapped_column(JSON, default=dict)

    # Exposure tracking
    exposure_stage: Mapped[int] = mapped_column(
        Integer, default=0
    )  # 0=none, 1=hints, 2=partial, 3=full
    last_exposure_at: Mapped[datetime | None] = mapped_column(nullable=True)

    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))

    # Relationships
    operator: Mapped["Operator"] = relationship(back_populates="operator_data")


class Neighborhood(Base):
    """Map neighborhoods for ICE raids and protests."""

    __tablename__ = "neighborhoods"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)

    name: Mapped[str] = mapped_column(String(100), unique=True)
    description: Mapped[str] = mapped_column(Text)

    # Map boundaries (for camera positioning)
    center_x: Mapped[int] = mapped_column(Integer)
    center_y: Mapped[int] = mapped_column(Integer)
    bounds_min_x: Mapped[int] = mapped_column(Integer)
    bounds_min_y: Mapped[int] = mapped_column(Integer)
    bounds_max_x: Mapped[int] = mapped_column(Integer)
    bounds_max_y: Mapped[int] = mapped_column(Integer)

    # Demographics (for narrative generation)
    population_estimate: Mapped[int] = mapped_column(Integer)
    primary_demographics: Mapped[list[str]] = mapped_column(JSON, default=list)

    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))


class BookPublicationEvent(Base):
    """Random event: controversial book being published - player can ban it."""

    __tablename__ = "book_publication_events"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    operator_id: Mapped[UUID] = mapped_column(ForeignKey("operators.id", ondelete="CASCADE"))

    # Book details
    title: Mapped[str] = mapped_column(String(300))
    author: Mapped[str] = mapped_column(String(200))
    summary: Mapped[str] = mapped_column(Text)
    controversy_type: Mapped[str] = mapped_column(
        String(100)
    )  # "dissent", "whistleblower", "historical_truth"

    # Status
    was_banned: Mapped[bool] = mapped_column(default=False)
    ban_action_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("system_actions.id"), nullable=True
    )

    # If published (not banned), impact on metrics
    published_at: Mapped[datetime | None] = mapped_column(nullable=True)
    awareness_impact: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))

    # Relationships
    operator: Mapped["Operator"] = relationship()

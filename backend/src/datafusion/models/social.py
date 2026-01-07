"""Social media records and inferred data models."""

import enum
from datetime import date
from uuid import UUID

from sqlalchemy import Boolean, Date, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from datafusion.database import Base, TimestampMixin, UUIDMixin


class Platform(enum.Enum):
    """Social media platforms."""

    FACEBOOK = "facebook"
    TWITTER = "twitter"
    INSTAGRAM = "instagram"
    LINKEDIN = "linkedin"
    TIKTOK = "tiktok"
    SNAPCHAT = "snapchat"
    REDDIT = "reddit"
    DISCORD = "discord"


class InferenceCategory(enum.Enum):
    """Categories of inferred information."""

    POLITICAL_VIEWS = "political_views"
    RELIGIOUS_BELIEFS = "religious_beliefs"
    RELATIONSHIP_STATUS = "relationship_status"
    LIFESTYLE = "lifestyle"
    INTERESTS = "interests"
    EMPLOYMENT = "employment"
    EDUCATION = "education"
    LOCATION_HABITS = "location_habits"
    FAMILY = "family"
    HEALTH = "health"
    FINANCIAL = "financial"
    PERSONAL_CRISIS = "personal_crisis"  # Private only
    INTIMATE_CONTENT = "intimate_content"  # Private only
    HARASSMENT = "harassment"  # Private only
    ILLEGAL_ACTIVITY = "illegal_activity"  # Private only


class SocialMediaRecord(Base, UUIDMixin, TimestampMixin):
    """Primary social media record for an NPC (one-to-one)."""

    __tablename__ = "social_media_records"

    npc_id: Mapped[UUID] = mapped_column(
        ForeignKey("npcs.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # Public presence
    has_public_profile: Mapped[bool] = mapped_column(
        nullable=False, default=True
    )  # Some people don't use social media publicly
    primary_platform: Mapped[Platform | None] = mapped_column(
        Enum(Platform), nullable=True
    )
    account_created_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    follower_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    post_frequency: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )  # e.g., "Multiple times daily", "Weekly", "Rarely"

    # Privacy settings
    uses_end_to_end_encryption: Mapped[bool] = mapped_column(
        nullable=False, default=False
    )  # Signal, encrypted messaging
    encryption_explanation: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )  # Explanation for UI when no private data available

    # Relationships for eager loading
    public_inferences: Mapped[list["PublicInference"]] = relationship(
        "PublicInference",
        back_populates="social_media_record",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    private_inferences: Mapped[list["PrivateInference"]] = relationship(
        "PrivateInference",
        back_populates="social_media_record",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class PublicInference(Base, UUIDMixin, TimestampMixin):
    """Information inferred from public social media posts."""

    __tablename__ = "public_inferences"

    social_media_record_id: Mapped[UUID] = mapped_column(
        ForeignKey("social_media_records.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    category: Mapped[InferenceCategory] = mapped_column(
        Enum(InferenceCategory), nullable=False
    )
    inference_text: Mapped[str] = mapped_column(
        Text, nullable=False
    )  # e.g., "Likely supports progressive policies based on shared articles"
    supporting_evidence: Mapped[str] = mapped_column(
        Text, nullable=False
    )  # e.g., "Posted 15 times about climate change, attended 3 protests"
    confidence_score: Mapped[int] = mapped_column(
        nullable=False
    )  # 0-100, how confident the inference is

    # Source information
    source_platform: Mapped[Platform] = mapped_column(Enum(Platform), nullable=False)
    data_points_analyzed: Mapped[int] = mapped_column(
        nullable=False
    )  # Number of posts/likes/shares used

    # Privacy implications
    potential_harm: Mapped[str] = mapped_column(
        Text, nullable=False
    )  # What could this information be used for?

    # Relationship back to social media record
    social_media_record: Mapped["SocialMediaRecord"] = relationship(
        "SocialMediaRecord",
        back_populates="public_inferences",
    )


class PrivateInference(Base, UUIDMixin, TimestampMixin):
    """Information inferred from private messages (requires privileged access)."""

    __tablename__ = "private_inferences"

    social_media_record_id: Mapped[UUID] = mapped_column(
        ForeignKey("social_media_records.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    category: Mapped[InferenceCategory] = mapped_column(
        Enum(InferenceCategory), nullable=False
    )
    inference_text: Mapped[str] = mapped_column(
        Text, nullable=False
    )  # e.g., "Engaging in extramarital affair", "Experiencing workplace harassment"
    supporting_evidence: Mapped[str] = mapped_column(
        Text, nullable=False
    )  # e.g., "23 messages to unknown contact, intimate content, different from spouse"
    confidence_score: Mapped[int] = mapped_column(nullable=False)  # 0-100

    # Source information
    source_platform: Mapped[Platform] = mapped_column(Enum(Platform), nullable=False)
    message_count: Mapped[int] = mapped_column(
        nullable=False
    )  # Number of messages analyzed
    involves_other_parties: Mapped[bool] = mapped_column(
        nullable=False, default=True
    )  # Does this involve other identifiable people?

    # Sensitivity and harm
    is_highly_sensitive: Mapped[bool] = mapped_column(
        nullable=False, default=True
    )  # Always true for private inferences
    potential_harm: Mapped[str] = mapped_column(
        Text, nullable=False
    )  # Blackmail, reputation destruction, legal consequences, etc.

    # Relationship back to social media record
    social_media_record: Mapped["SocialMediaRecord"] = relationship(
        "SocialMediaRecord",
        back_populates="private_inferences",
    )

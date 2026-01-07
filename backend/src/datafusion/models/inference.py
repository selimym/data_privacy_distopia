"""Inference engine models for data fusion analysis."""

import enum
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import JSON, Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from datafusion.database import Base, TimestampMixin, UUIDMixin


class ContentRating(str, enum.Enum):
    """Content rating for inferences based on sensitivity/scariness."""

    SAFE = "SAFE"  # General audience, no concerning implications
    CAUTIONARY = "CAUTIONARY"  # Mildly concerning, privacy awareness
    SERIOUS = "SERIOUS"  # Significant privacy implications
    DISTURBING = "DISTURBING"  # Highly invasive or unethical implications
    DYSTOPIAN = "DYSTOPIAN"  # Extreme scenarios, demonstrating worst-case abuse


class RuleCategory(str, enum.Enum):
    """Categories of cross-domain inference rules for organization."""

    VULNERABILITY_EXPLOITATION = "vulnerability_exploitation"
    REPRODUCTIVE_PRIVACY = "reproductive_privacy"
    MENTAL_HEALTH = "mental_health"
    RELATIONSHIP_SURVEILLANCE = "relationship_surveillance"
    PREDICTIVE_PROFILING = "predictive_profiling"
    FINANCIAL_EXPLOITATION = "financial_exploitation"
    IDENTITY_RECONSTRUCTION = "identity_reconstruction"
    WORKPLACE_DISCRIMINATION = "workplace_discrimination"
    SOCIAL_CONTROL = "social_control"


class InferenceRule(Base, UUIDMixin, TimestampMixin):
    """
    Cross-domain inference rule definition.

    Stores the metadata and logic for detecting privacy-invasive insights
    that emerge from combining data across domains.
    """

    __tablename__ = "inference_rules"

    rule_key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)

    # Store as JSON array for SQLite compatibility
    required_domains: Mapped[list[str]] = mapped_column(JSON, nullable=False)

    # Scariness level (1-5)
    scariness_level: Mapped[int] = mapped_column(Integer, nullable=False)
    content_rating: Mapped[str] = mapped_column(String(20), nullable=False)

    # Condition evaluator function name
    condition_function: Mapped[str] = mapped_column(String(100), nullable=False)

    # Template for inference text (can include {variables})
    inference_template: Mapped[str] = mapped_column(Text, nullable=False)

    # Templates for evidence items (JSON array of strings with {variables})
    evidence_templates: Mapped[list[str]] = mapped_column(JSON, nullable=False)

    # Templates for implication items (JSON array of strings with {variables})
    implications_templates: Mapped[list[str]] = mapped_column(JSON, nullable=False)

    # Is this rule active?
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Educational content
    educational_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    real_world_example: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<InferenceRule {self.rule_key}: {self.name}>"


class VictimImpactStatement(Base, UUIDMixin, TimestampMixin):
    """
    Victim impact statements for inference rules.

    Shows the human cost of privacy violations through first-person accounts.
    """

    __tablename__ = "victim_impact_statements"

    # Which inference rule this relates to
    inference_rule_key: Mapped[str] = mapped_column(String(100), nullable=False, index=True)

    # The victim's statement (first-person)
    statement_text: Mapped[str] = mapped_column(Text, nullable=False)

    # Optional demographic context
    victim_context: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # Severity of impact (1-5)
    impact_severity: Mapped[int] = mapped_column(Integer, nullable=False)

    # Is this based on a real case?
    is_based_on_real_case: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Optional reference to real case (if public)
    real_case_reference: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<VictimImpactStatement for {self.inference_rule_key}>"


class InferenceUnlock(Base, UUIDMixin, TimestampMixin):
    """
    Tracks when inference rules are unlocked for display.

    Used to show "new inferences available" when domains are enabled.
    """

    __tablename__ = "inference_unlocks"

    # Player/session identifier (for future multiplayer)
    session_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)

    # Which inference was unlocked
    inference_rule_key: Mapped[str] = mapped_column(String(100), nullable=False, index=True)

    # Which domains were enabled when this was unlocked
    domains_at_unlock: Mapped[list[str]] = mapped_column(JSON, nullable=False)

    # Did the player view this inference?
    was_viewed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    def __repr__(self) -> str:
        return f"<InferenceUnlock {self.inference_rule_key} for session {self.session_id}>"

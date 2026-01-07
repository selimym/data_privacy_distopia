"""Inference engine enums and types for data fusion analysis."""

import enum


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

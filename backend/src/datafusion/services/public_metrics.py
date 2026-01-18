"""
Public Metrics Service - tracks international awareness and public anger.

These metrics represent the external consequences of the operator's actions:
- International Awareness: How much the world knows about what's happening
- Public Anger: How angry people are about the abuses

Both metrics trigger tier events at thresholds and affect protest/news generation.
"""
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from datafusion.models.system_mode import PublicMetrics, ActionType


# Tier thresholds for awareness and anger (0-100 scale)
AWARENESS_TIERS = [
    (20, "Local reports emerge"),
    (40, "National coverage begins"),
    (60, "International attention"),
    (80, "UN investigation called"),
    (95, "Global condemnation, sanctions imposed"),
]

ANGER_TIERS = [
    (20, "Murmurs of discontent"),
    (40, "Organized opposition forming"),
    (60, "Mass protests likely"),
    (80, "Violent resistance probable"),
    (95, "Revolutionary conditions"),
]


class TierEvent:
    """Event triggered by crossing a tier threshold."""

    def __init__(self, metric_type: str, tier: int, threshold: int, description: str):
        self.metric_type = metric_type  # "awareness" or "anger"
        self.tier = tier
        self.threshold = threshold
        self.description = description


class PublicMetricsUpdate:
    """Result of updating public metrics."""

    def __init__(
        self,
        awareness_delta: int,
        anger_delta: int,
        new_awareness: int,
        new_anger: int,
        tier_events: list[TierEvent],
    ):
        self.awareness_delta = awareness_delta
        self.anger_delta = anger_delta
        self.new_awareness = new_awareness
        self.new_anger = new_anger
        self.tier_events = tier_events


async def get_or_create_public_metrics(
    operator_id: UUID, db: AsyncSession
) -> PublicMetrics:
    """Get existing public metrics or create new ones."""
    result = await db.execute(
        select(PublicMetrics).where(PublicMetrics.operator_id == operator_id)
    )
    metrics = result.scalar_one_or_none()

    if not metrics:
        metrics = PublicMetrics(operator_id=operator_id)
        db.add(metrics)
        await db.commit()
        await db.refresh(metrics)

    return metrics


async def update_public_metrics(
    operator_id: UUID,
    action_type: ActionType,
    action_severity: int,
    triggered_backlash: bool,
    db: AsyncSession,
) -> PublicMetricsUpdate:
    """
    Update public metrics after an action.

    Args:
        operator_id: Operator UUID
        action_type: Type of action taken
        action_severity: Severity score (1-10)
        triggered_backlash: Whether action triggered backlash
        db: Database session

    Returns:
        PublicMetricsUpdate with deltas and tier events
    """
    metrics = await get_or_create_public_metrics(operator_id, db)

    old_awareness = metrics.international_awareness
    old_anger = metrics.public_anger

    # Calculate awareness increase
    awareness_delta = calculate_awareness_increase(
        action_severity, old_awareness, triggered_backlash
    )

    # Calculate anger increase
    anger_delta = calculate_anger_increase(
        action_severity, action_type, triggered_backlash
    )

    # Update metrics (clamped 0-100)
    metrics.international_awareness = min(100, old_awareness + awareness_delta)
    metrics.public_anger = min(100, old_anger + anger_delta)

    # Check tier thresholds
    tier_events = []

    # Check awareness tiers
    for threshold, description in AWARENESS_TIERS:
        tier_index = AWARENESS_TIERS.index((threshold, description))
        if old_awareness < threshold <= metrics.international_awareness:
            metrics.awareness_tier = max(metrics.awareness_tier, tier_index + 1)
            tier_events.append(
                TierEvent("awareness", tier_index + 1, threshold, description)
            )

    # Check anger tiers
    for threshold, description in ANGER_TIERS:
        tier_index = ANGER_TIERS.index((threshold, description))
        if old_anger < threshold <= metrics.public_anger:
            metrics.anger_tier = max(metrics.anger_tier, tier_index + 1)
            tier_events.append(TierEvent("anger", tier_index + 1, threshold, description))

    await db.commit()
    await db.refresh(metrics)

    return PublicMetricsUpdate(
        awareness_delta=awareness_delta,
        anger_delta=anger_delta,
        new_awareness=metrics.international_awareness,
        new_anger=metrics.public_anger,
        tier_events=tier_events,
    )


def calculate_awareness_increase(
    severity: int, current_awareness: int, was_backlash: bool
) -> int:
    """
    Calculate awareness increase from an action.

    Formula:
    - Base increase = severity
    - Accelerating growth after awareness > 60 (1 + (awareness - 60)/40 multiplier)
    - Backlash doubles impact

    Args:
        severity: Action severity (1-10)
        current_awareness: Current awareness score (0-100)
        was_backlash: Whether action triggered backlash

    Returns:
        Awareness increase amount
    """
    base_increase = severity

    # Accelerating growth after awareness > 60
    if current_awareness > 60:
        multiplier = 1 + ((current_awareness - 60) / 40)
        base_increase = int(base_increase * multiplier)

    # Backlash doubles impact
    if was_backlash:
        base_increase *= 2

    return base_increase


def calculate_anger_increase(
    severity: int, action_type: ActionType, was_backlash: bool
) -> int:
    """
    Calculate anger increase from an action.

    Formula:
    - Base increase = severity
    - ICE raids and arbitrary detentions add +5
    - Backlash adds +10

    Args:
        severity: Action severity (1-10)
        action_type: Type of action
        was_backlash: Whether action triggered backlash

    Returns:
        Anger increase amount
    """
    base_increase = severity

    # ICE raids and arrests especially anger-inducing
    if action_type in [ActionType.ICE_RAID, ActionType.ARBITRARY_DETENTION]:
        base_increase += 5

    # Backlash increases anger
    if was_backlash:
        base_increase += 10

    return base_increase


def calculate_protest_probability(severity: int, anger: int) -> float:
    """
    Calculate probability that an action triggers a protest.

    Formula varies by anger level:
    - anger < 20: Only severity 8+ triggers (15% chance)
    - anger < 40: Severity 6+ triggers (50% * severity/10)
    - anger < 60: Severity 4+ triggers (severity/10 * (1 + anger/100))
    - anger >= 60: Any action triggers (severity/10 * (1 + anger/50))

    Args:
        severity: Action severity (1-10)
        anger: Current public anger (0-100)

    Returns:
        Probability (0.0-1.0)
    """
    if anger < 20:
        # Low anger: only severity 8+ triggers
        return 0.15 if severity >= 8 else 0.0

    if anger < 40:
        # Medium anger: severity 6+ can trigger
        if severity < 6:
            return 0.0
        return (severity / 10) * 0.5

    if anger < 60:
        # High anger: severity 4+ triggers
        return (severity / 10) * (1 + anger / 100)

    # Critical anger: any action can trigger
    return (severity / 10) * (1 + anger / 50)


def calculate_news_probability(
    severity: int, news_channel_stance: str, awareness: int
) -> float:
    """
    Calculate probability that an action triggers a news article.

    Formula:
    - Base = severity/10
    - Stance modifiers: critical=1.5x, independent=1.0x, state_friendly=0.3x
    - High awareness increases coverage: +awareness/200

    Args:
        severity: Action severity (1-10)
        news_channel_stance: "critical", "independent", or "state_friendly"
        awareness: Current international awareness (0-100)

    Returns:
        Probability (0.0-1.0), capped at 0.95
    """
    base = severity / 10

    stance_modifiers = {
        "critical": 1.5,
        "independent": 1.0,
        "state_friendly": 0.3,
    }

    stance_multiplier = stance_modifiers.get(news_channel_stance, 1.0)

    # High awareness increases coverage
    awareness_bonus = awareness / 200

    probability = base * stance_multiplier + awareness_bonus

    return min(0.95, probability)


def calculate_backlash_probability(
    severity: int, awareness: int, anger: int
) -> float:
    """
    Calculate probability that an action triggers backlash.

    Formula: (severity/10) * (1 + (awareness + anger)/200)
    Capped at 0.95

    Args:
        severity: Action severity (1-10)
        awareness: International awareness (0-100)
        anger: Public anger (0-100)

    Returns:
        Probability (0.0-1.0)
    """
    base = severity / 10
    metrics_factor = (awareness + anger) / 200

    probability = base * (1 + metrics_factor)

    return min(0.95, probability)

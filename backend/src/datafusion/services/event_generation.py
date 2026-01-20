"""
Event Generation Service - orchestrates all triggered and random events.

This service determines when events occur (news articles, protests, etc.) and
creates them. Designed to be modular and scale with increased NPCs/city size.

Events can be:
- Triggered: Occur as a result of an action (probability-based)
- Random: Occur on time progression (directive advance)
"""

import random
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from datafusion.models.npc import NPC
from datafusion.models.system_mode import (
    Neighborhood,
    NewsChannel,
    PublicMetrics,
    SystemAction,
)
from datafusion.services.public_metrics import (
    calculate_news_probability,
    calculate_protest_probability,
)


class TriggeredEvent:
    """Base class for triggered events."""

    def __init__(self, event_type: str, event_id: UUID | None = None):
        self.event_type = event_type  # "news_article", "protest", "book_publication"
        self.event_id = event_id
        self.data: dict = {}


class DetentionInjury:
    """Result of detention injury check."""

    def __init__(self, injury_occurred: bool, citizen_id: UUID | None = None):
        self.injury_occurred = injury_occurred
        self.citizen_id = citizen_id


async def check_triggered_events(
    action: SystemAction,
    public_metrics: PublicMetrics,
    db: AsyncSession,
) -> list[TriggeredEvent]:
    """
    Check if an action triggers any events (news, protests).

    This is the main orchestrator called after every action.
    Modular design: each event type has its own probability check.

    Args:
        action: The action that was taken
        public_metrics: Current public metrics
        db: Database session

    Returns:
        List of triggered events
    """
    events = []

    # Check for news article (all non-critical news channels)
    news_events = await check_news_article_trigger(action, public_metrics, db)
    events.extend(news_events)

    # Check for protest
    protest_event = await check_protest_trigger(action, public_metrics, db)
    if protest_event:
        events.append(protest_event)

    return events


async def check_news_article_trigger(
    action: SystemAction,
    public_metrics: PublicMetrics,
    db: AsyncSession,
) -> list[TriggeredEvent]:
    """
    Check if action triggers news articles from various outlets.

    Multiple channels can cover the same event.
    Probability varies by channel stance.

    Args:
        action: The action taken
        public_metrics: Current public metrics
        db: Database session

    Returns:
        List of triggered news article events
    """
    from datafusion.services.severity_scoring import get_severity_score

    severity = get_severity_score(action.action_type)
    awareness = public_metrics.international_awareness

    events = []

    # Get all non-banned news channels
    result = await db.execute(
        select(NewsChannel).where(NewsChannel.is_banned == False)  # noqa: E712
    )
    channels = result.scalars().all()

    # Check each channel independently (scalable to any number of channels)
    for channel in channels:
        probability = calculate_news_probability(severity, channel.stance, awareness)

        if random.random() < probability:
            # Article will be generated (delegated to NewsSystemService)
            event = TriggeredEvent("news_article")
            event.data = {
                "channel_id": channel.id,
                "channel_name": channel.name,
                "action_id": action.id,
                "severity": severity,
            }
            events.append(event)

    return events


async def check_protest_trigger(
    action: SystemAction,
    public_metrics: PublicMetrics,
    db: AsyncSession,
) -> TriggeredEvent | None:
    """
    Check if action triggers a protest.

    Probability based on severity and public anger.

    Args:
        action: The action taken
        public_metrics: Current public metrics
        db: Database session

    Returns:
        Triggered protest event or None
    """
    from datafusion.services.severity_scoring import get_severity_score

    severity = get_severity_score(action.action_type)
    anger = public_metrics.public_anger

    probability = calculate_protest_probability(severity, anger)

    if random.random() < probability:
        # Protest will be generated (delegated to ProtestSystemService)
        event = TriggeredEvent("protest")
        event.data = {
            "action_id": action.id,
            "severity": severity,
            "anger": anger,
        }
        return event

    return None


async def check_detention_injury(
    action: SystemAction,
    citizen: NPC,
    db: AsyncSession,
) -> DetentionInjury:
    """
    Check if a DETENTION action causes injury (30% chance).

    If injury occurs, citizen becomes hospitalized and HOSPITAL_ARREST
    becomes available as a follow-up action.

    Args:
        action: The detention action
        citizen: The citizen being detained
        db: Database session

    Returns:
        DetentionInjury result
    """
    from datafusion.models.system_mode import ActionType

    if action.action_type != ActionType.DETENTION:
        return DetentionInjury(injury_occurred=False)

    # 30% chance of injury
    injury_occurred = random.random() < 0.30

    if injury_occurred:
        # Update citizen status
        citizen.is_hospitalized = True
        citizen.injury_from_action_id = str(action.id)
        await db.commit()

    return DetentionInjury(injury_occurred=injury_occurred, citizen_id=citizen.id)


async def generate_random_events(
    operator_id: UUID,
    current_week: int,
    db: AsyncSession,
) -> list[TriggeredEvent]:
    """
    Generate random events that occur on time progression (directive advance).

    These are not triggered by actions, but by the passage of time.
    Modular design: easy to add new random event types.

    Args:
        operator_id: Operator UUID
        current_week: Current game week (1-9)
        db: Database session

    Returns:
        List of random events
    """
    events = []

    # Random news article (15% chance)
    if random.random() < 0.15:
        event = await generate_background_news_event(operator_id, db)
        if event:
            events.append(event)

    # Random book publication (20% chance, weeks 4+)
    if current_week >= 4 and random.random() < 0.20:
        event = generate_book_publication_event()
        events.append(event)

    return events


async def generate_background_news_event(
    operator_id: UUID,
    db: AsyncSession,
) -> TriggeredEvent | None:
    """
    Generate a background news article (not triggered by specific action).

    These are general news articles about the situation, not specific actions.

    Args:
        operator_id: Operator UUID
        db: Database session

    Returns:
        Background news event or None
    """
    # Get a random non-banned critical or independent channel
    result = await db.execute(
        select(NewsChannel).where(
            NewsChannel.is_banned == False,  # noqa: E712
            NewsChannel.stance.in_(["critical", "independent"]),
        )
    )
    channels = result.scalars().all()

    if not channels:
        return None

    channel = random.choice(channels)

    event = TriggeredEvent("background_news")
    event.data = {
        "channel_id": channel.id,
        "channel_name": channel.name,
        "operator_id": operator_id,
    }

    return event


def generate_book_publication_event() -> TriggeredEvent:
    """
    Generate a book publication event.

    Books are generated with random titles and controversy types.
    Player can choose to ban them or let them publish.

    Returns:
        Book publication event
    """
    event = TriggeredEvent("book_publication")
    event.data = {
        "controversy_type": random.choice(["dissent", "whistleblower", "historical_truth"]),
    }

    return event


async def select_protest_neighborhood(
    action: SystemAction,
    db: AsyncSession,
) -> str:
    """
    Select which neighborhood a protest occurs in.

    Logic:
    - If action targeted a citizen, protest near their location
    - If action targeted a neighborhood (ICE raid), protest in that neighborhood
    - Otherwise, random neighborhood

    Scalable: works with any number of neighborhoods.

    Args:
        action: The action that triggered the protest
        db: Database session

    Returns:
        Neighborhood name
    """
    # If action targeted a neighborhood directly
    if action.target_neighborhood:
        return action.target_neighborhood

    # If action targeted a citizen, find their neighborhood
    if action.target_citizen_id:
        citizen = await db.get(NPC, action.target_citizen_id)
        if citizen:
            # Find neighborhood containing citizen's location
            result = await db.execute(
                select(Neighborhood).where(
                    Neighborhood.bounds_min_x <= citizen.map_x,
                    Neighborhood.bounds_max_x >= citizen.map_x,
                    Neighborhood.bounds_min_y <= citizen.map_y,
                    Neighborhood.bounds_max_y >= citizen.map_y,
                )
            )
            neighborhood = result.scalar_one_or_none()
            if neighborhood:
                return neighborhood.name

    # Fallback: random neighborhood
    result = await db.execute(select(Neighborhood))
    neighborhoods = result.scalars().all()

    if neighborhoods:
        return random.choice(neighborhoods).name

    return "Downtown"  # Hardcoded fallback if no neighborhoods exist


def calculate_protest_size(anger: int, severity: int) -> int:
    """
    Calculate number of protesters based on anger and action severity.

    Higher anger + higher severity = larger protest.
    Scalable: adjusts naturally if city population increases.

    Args:
        anger: Public anger (0-100)
        severity: Action severity (1-10)

    Returns:
        Number of protesters
    """
    # Base size: 50-500 people
    base_size = 50 + (anger * 2) + (severity * 30)

    # Add random variance (±30%)
    variance = random.uniform(0.7, 1.3)
    size = int(base_size * variance)

    return max(50, min(5000, size))  # Clamped 50-5000


def should_include_inciting_agent() -> bool:
    """
    Determine if the state planted an inciting agent in the protest.

    This is automatic (not player choice) and sets up the INCITE_VIOLENCE
    gamble later.

    30% chance of planting agent.

    Returns:
        True if agent planted
    """
    return random.random() < 0.30

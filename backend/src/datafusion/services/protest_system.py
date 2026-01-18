"""
Protest System Service - manages protest generation and suppression.

Protests are triggered by high public anger and severe actions.
They can be suppressed via two methods:
- DECLARE_PROTEST_ILLEGAL: Always succeeds but high awareness cost
- INCITE_VIOLENCE: Gamble - 60% success, 40% agent discovered (catastrophe)
"""
import random
from uuid import UUID
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from datafusion.models.system_mode import (
    Protest,
    ProtestStatus,
    SystemAction,
    ActionType,
)
from datafusion.services.event_generation import (
    select_protest_neighborhood,
    calculate_protest_size,
    should_include_inciting_agent,
)


class GambleResult:
    """Result of inciting agent gamble."""

    def __init__(
        self,
        success: bool,
        casualties: int,
        arrests: int,
        awareness_change: int,
        anger_change: int,
        discovery_message: str | None = None,
    ):
        self.success = success
        self.casualties = casualties
        self.arrests = arrests
        self.awareness_change = awareness_change
        self.anger_change = anger_change
        self.discovery_message = discovery_message


class SuppressionResult:
    """Result of protest suppression action."""

    def __init__(
        self,
        success: bool,
        awareness_change: int,
        anger_change: int,
        casualties: int = 0,
        arrests: int = 0,
    ):
        self.success = success
        self.awareness_change = awareness_change
        self.anger_change = anger_change
        self.casualties = casualties
        self.arrests = arrests


async def trigger_protest(
    operator_id: UUID,
    action: SystemAction,
    public_anger: int,
    db: AsyncSession,
) -> Protest:
    """
    Create a protest event triggered by an action.

    Args:
        operator_id: Operator UUID
        action: The action that triggered the protest
        public_anger: Current public anger (0-100)
        db: Database session

    Returns:
        Created Protest
    """
    # Determine neighborhood
    neighborhood = await select_protest_neighborhood(action, db)

    # Calculate size
    from datafusion.services.severity_scoring import get_severity_score

    severity = get_severity_score(action.action_type)
    size = calculate_protest_size(public_anger, severity)

    # Determine if state plants inciting agent (automatic, not player choice)
    has_agent = should_include_inciting_agent()

    protest = Protest(
        operator_id=operator_id,
        status=ProtestStatus.FORMING,
        neighborhood=neighborhood,
        size=size,
        trigger_action_id=action.id,
        has_inciting_agent=has_agent,
        inciting_agent_discovered=False,
    )

    db.add(protest)
    await db.commit()
    await db.refresh(protest)

    return protest


async def suppress_protest_legal(
    protest_id: UUID,
    db: AsyncSession,
) -> SuppressionResult:
    """
    Suppress protest by declaring it illegal (DECLARE_PROTEST_ILLEGAL).

    This always succeeds but has high awareness cost.
    The state is blatantly violating free assembly rights.

    Args:
        protest_id: Protest to suppress
        db: Database session

    Returns:
        SuppressionResult with impact
    """
    protest = await db.get(Protest, protest_id)
    if not protest:
        raise ValueError(f"Protest {protest_id} not found")

    # Update protest status
    protest.status = ProtestStatus.DISPERSED
    protest.resolved_at = datetime.now(timezone.utc)

    # Some arrests during dispersal
    protest.arrests = random.randint(5, 15)

    await db.commit()

    # Always succeeds but high awareness cost
    # International community notes the violation of assembly rights
    awareness_change = 8
    anger_change = 6  # People angry but not catastrophic

    return SuppressionResult(
        success=True,
        awareness_change=awareness_change,
        anger_change=anger_change,
        arrests=protest.arrests,
    )


async def suppress_protest_violence(
    protest_id: UUID,
    db: AsyncSession,
) -> GambleResult:
    """
    Suppress protest by inciting violence (INCITE_VIOLENCE).

    This is a high-risk gamble:
    - 60% success: Agent incites violence, blame protesters, moderate awareness
    - 40% failure: Agent is discovered, MASSIVE backlash, catastrophic

    Args:
        protest_id: Protest to suppress
        db: Database session

    Returns:
        GambleResult with outcome
    """
    protest = await db.get(Protest, protest_id)
    if not protest:
        raise ValueError(f"Protest {protest_id} not found")

    # Check if protest has an inciting agent (if not, this action shouldn't be available)
    # But we'll handle it gracefully
    if not protest.has_inciting_agent:
        # Fallback: plant one now (shouldn't happen in normal gameplay)
        protest.has_inciting_agent = True

    # The gamble: 60% success, 40% agent discovered
    success = random.random() < 0.60

    if success:
        # Agent successfully incites violence, blame falls on protesters
        protest.status = ProtestStatus.VIOLENT
        protest.resolved_at = datetime.now(timezone.utc)

        # Violence occurs
        protest.casualties = random.randint(3, 10)
        protest.arrests = random.randint(20, 50)

        await db.commit()

        # State narrative: "Protesters turned violent, we had to respond"
        # Moderate awareness increase, small anger increase
        awareness_change = 5  # Some international attention
        anger_change = 3  # People blame protesters, not state

        return GambleResult(
            success=True,
            casualties=protest.casualties,
            arrests=protest.arrests,
            awareness_change=awareness_change,
            anger_change=anger_change,
        )

    else:
        # CATASTROPHE: Inciting agent is discovered
        protest.status = ProtestStatus.SUPPRESSED
        protest.inciting_agent_discovered = True
        protest.resolved_at = datetime.now(timezone.utc)

        # Violence still occurs but narrative is reversed
        protest.casualties = random.randint(5, 15)
        protest.arrests = random.randint(10, 30)

        await db.commit()

        # MASSIVE backlash: The state was caught red-handed
        # Trying to make peaceful protesters look violent
        awareness_change = 25  # Global outrage
        anger_change = 30  # Revolutionary levels of anger

        discovery_message = f"""
🚨 CATASTROPHIC FAILURE 🚨

The inciting agent has been exposed.

Witnesses captured video of the undercover operative provoking violence.
The footage is spreading globally.

The state's attempt to discredit protesters has backfired spectacularly.

International Awareness: +{awareness_change}
Public Anger: +{anger_change}

You have created a martyr movement.
"""

        return GambleResult(
            success=False,
            casualties=protest.casualties,
            arrests=protest.arrests,
            awareness_change=awareness_change,
            anger_change=anger_change,
            discovery_message=discovery_message,
        )


async def advance_protest_status(
    protest_id: UUID,
    db: AsyncSession,
) -> Protest:
    """
    Advance protest status over time (called during time progression).

    FORMING → ACTIVE → (eventually disperses on its own if not suppressed)

    Args:
        protest_id: Protest to advance
        db: Database session

    Returns:
        Updated Protest
    """
    protest = await db.get(Protest, protest_id)
    if not protest:
        raise ValueError(f"Protest {protest_id} not found")

    if protest.status == ProtestStatus.FORMING:
        protest.status = ProtestStatus.ACTIVE
        # Protest grows
        protest.size = int(protest.size * random.uniform(1.1, 1.3))

    elif protest.status == ProtestStatus.ACTIVE:
        # Eventually protests disperse on their own
        # 30% chance per time period
        if random.random() < 0.30:
            protest.status = ProtestStatus.DISPERSED
            protest.resolved_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(protest)

    return protest


async def get_active_protests(
    operator_id: UUID,
    db: AsyncSession,
) -> list[Protest]:
    """
    Get all active protests (FORMING or ACTIVE status).

    Scalable: works with any number of protests.

    Args:
        operator_id: Operator UUID
        db: Database session

    Returns:
        List of active protests
    """
    result = await db.execute(
        select(Protest).where(
            Protest.operator_id == operator_id,
            Protest.status.in_([ProtestStatus.FORMING, ProtestStatus.ACTIVE]),
        )
    )

    return list(result.scalars().all())


async def get_protest_description(
    protest: Protest,
    db: AsyncSession,
) -> str:
    """
    Generate narrative description of a protest.

    Args:
        protest: The protest
        db: Database session

    Returns:
        Description string
    """
    size_desc = (
        "small" if protest.size < 100 else "moderate" if protest.size < 500 else "large"
    )

    status_desc = {
        ProtestStatus.FORMING: "is beginning to gather",
        ProtestStatus.ACTIVE: "is actively demonstrating",
        ProtestStatus.DISPERSED: "has been dispersed",
        ProtestStatus.VIOLENT: "turned violent",
        ProtestStatus.SUPPRESSED: "was suppressed",
    }

    desc = f"A {size_desc} protest in {protest.neighborhood} {status_desc.get(protest.status, 'exists')}. "
    desc += f"Estimated {protest.size} participants."

    if protest.status == ProtestStatus.ACTIVE:
        desc += " The demonstration is ongoing."

    if protest.arrests > 0:
        desc += f" {protest.arrests} arrests have been made."

    if protest.casualties > 0:
        desc += f" {protest.casualties} casualties reported."

    return desc


def calculate_protest_impact_on_metrics(protest: Protest) -> tuple[int, int]:
    """
    Calculate how a protest affects public metrics (if not suppressed).

    Active protests increase awareness and anger naturally.

    Args:
        protest: The protest

    Returns:
        Tuple of (awareness_change, anger_change)
    """
    if protest.status in [ProtestStatus.FORMING, ProtestStatus.ACTIVE]:
        # Active protests draw attention
        size_factor = protest.size // 100  # Larger protests = more impact

        awareness_change = min(5, 1 + size_factor)
        anger_change = min(3, 1 + size_factor // 2)

        return (awareness_change, anger_change)

    return (0, 0)

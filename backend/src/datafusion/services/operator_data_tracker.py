"""
Operator Data Tracker Service - tracks operator behavior and handles progressive exposure.

This service makes the surveillance visceral by turning it back on the player.

Progressive exposure stages:
1. Hints (awareness 30+): Vague references in news
2. Partial leak (awareness 60+): Search queries and hesitation patterns revealed
3. Full exposure (awareness 80+ OR reluctance 70+): Complete profile exposed

The goal is to make the player uncomfortable by showing them their own surveillance.
"""

import random
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from datafusion.models.system_mode import ActionType, OperatorData

# Fake names for operator profile generation
FIRST_NAMES = [
    "Sarah",
    "Michael",
    "Jennifer",
    "David",
    "Jessica",
    "Christopher",
    "Amanda",
    "Matthew",
    "Ashley",
    "Joshua",
]

LAST_NAMES = [
    "Anderson",
    "Williams",
    "Chen",
    "Martinez",
    "Johnson",
    "Brown",
    "Davis",
    "Miller",
    "Wilson",
    "Garcia",
]

# Street names for address generation
STREETS = [
    "Oak Street",
    "Maple Avenue",
    "Pine Road",
    "Cedar Lane",
    "Elm Drive",
    "Birch Court",
    "Willow Way",
    "Ash Boulevard",
]


class ExposureEvent:
    """Result of exposure trigger."""

    def __init__(
        self,
        stage: int,
        message: str,
        operator_name: str | None = None,
        data_revealed: dict | None = None,
    ):
        self.stage = stage
        self.message = message
        self.operator_name = operator_name
        self.data_revealed = data_revealed or {}


async def generate_operator_profile(
    operator_id: UUID,
    db: AsyncSession,
) -> OperatorData:
    """
    Generate fake personal data for the operator.

    This is created at session start to give the operator an identity
    that will be exposed later.

    Args:
        operator_id: Operator UUID
        db: Database session

    Returns:
        Created OperatorData
    """
    # Generate fake name
    first_name = random.choice(FIRST_NAMES)
    last_name = random.choice(LAST_NAMES)
    full_name = f"{first_name} {last_name}"

    # Generate fake address
    street_number = random.randint(100, 9999)
    street = random.choice(STREETS)
    city = random.choice(["Springfield", "Riverside", "Fairview", "Lakeside"])
    state = random.choice(["CA", "NY", "TX", "FL", "IL"])
    zip_code = f"{random.randint(10000, 99999)}"
    home_address = f"{street_number} {street}, {city}, {state} {zip_code}"

    # Generate fake family members
    family_members = []

    # Spouse (70% chance)
    if random.random() < 0.70:
        spouse_name = random.choice(FIRST_NAMES)
        family_members.append(
            {
                "relation": "spouse",
                "name": spouse_name,
                "age": random.randint(28, 55),
            }
        )

    # Children (60% chance, 1-3 kids)
    if random.random() < 0.60:
        num_children = random.randint(1, 3)
        for i in range(num_children):
            child_name = random.choice(FIRST_NAMES)
            family_members.append(
                {
                    "relation": "child",
                    "name": child_name,
                    "age": random.randint(2, 18),
                }
            )

    # Parents (40% chance)
    if random.random() < 0.40:
        parent_names = random.sample(FIRST_NAMES, 2)
        family_members.append(
            {
                "relation": "parent",
                "name": parent_names[0],
                "age": random.randint(55, 75),
            }
        )
        family_members.append(
            {
                "relation": "parent",
                "name": parent_names[1],
                "age": random.randint(55, 75),
            }
        )

    operator_data = OperatorData(
        operator_id=operator_id,
        full_name=full_name,
        home_address=home_address,
        family_members=family_members,
        search_queries=[],
        hesitation_patterns={},
        decision_patterns={},
        exposure_stage=0,
    )

    db.add(operator_data)
    await db.commit()
    await db.refresh(operator_data)

    return operator_data


async def get_or_create_operator_data(
    operator_id: UUID,
    db: AsyncSession,
) -> OperatorData:
    """Get existing operator data or create new."""
    result = await db.execute(select(OperatorData).where(OperatorData.operator_id == operator_id))
    data = result.scalar_one_or_none()

    if not data:
        data = await generate_operator_profile(operator_id, db)

    return data


async def track_decision(
    operator_id: UUID,
    action_type: ActionType,
    target_info: str,
    was_hesitant: bool,
    decision_time_seconds: float,
    db: AsyncSession,
) -> None:
    """
    Track operator's decision-making patterns.

    This behavioral data will be exposed in later stages.

    Args:
        operator_id: Operator UUID
        action_type: Type of action taken
        target_info: Information about target (for search query simulation)
        was_hesitant: Whether decision took >30s
        decision_time_seconds: Time taken to decide
        db: Database session
    """
    operator_data = await get_or_create_operator_data(operator_id, db)

    # Simulate search query
    search_query = f"Review {action_type.value.replace('_', ' ')} for {target_info}"
    operator_data.search_queries.append(search_query)

    # Keep only last 50 queries (scalable - don't let this grow unbounded)
    if len(operator_data.search_queries) > 50:
        operator_data.search_queries = operator_data.search_queries[-50:]

    # Track hesitation patterns
    if action_type.value not in operator_data.hesitation_patterns:
        operator_data.hesitation_patterns[action_type.value] = {
            "total_decisions": 0,
            "hesitant_decisions": 0,
            "avg_decision_time": 0.0,
        }

    pattern = operator_data.hesitation_patterns[action_type.value]
    pattern["total_decisions"] += 1
    if was_hesitant:
        pattern["hesitant_decisions"] += 1

    # Update average decision time
    total = pattern["total_decisions"]
    old_avg = pattern["avg_decision_time"]
    pattern["avg_decision_time"] = ((old_avg * (total - 1)) + decision_time_seconds) / total

    # Track decision patterns (which types most used)
    if action_type.value not in operator_data.decision_patterns:
        operator_data.decision_patterns[action_type.value] = 0
    operator_data.decision_patterns[action_type.value] += 1

    # Mark as modified for SQLAlchemy to detect JSON changes
    from sqlalchemy.orm.attributes import flag_modified

    flag_modified(operator_data, "search_queries")
    flag_modified(operator_data, "hesitation_patterns")
    flag_modified(operator_data, "decision_patterns")

    await db.commit()


async def trigger_exposure_event(
    operator_id: UUID,
    awareness: int,
    reluctance: int,
    db: AsyncSession,
) -> ExposureEvent | None:
    """
    Check if exposure should occur and trigger appropriate stage.

    Exposure conditions:
    - Stage 1 (awareness 30+): Hints in articles
    - Stage 2 (awareness 60+): Partial leak
    - Stage 3 (awareness 80+ OR reluctance 70+): Full exposure

    Args:
        operator_id: Operator UUID
        awareness: International awareness (0-100)
        reluctance: Reluctance score (0-100)
        db: Database session

    Returns:
        ExposureEvent if exposure triggered, None otherwise
    """
    operator_data = await get_or_create_operator_data(operator_id, db)

    # Determine target stage based on metrics
    target_stage = 0

    if awareness >= 80 or reluctance >= 70:
        target_stage = 3  # Full exposure
    elif awareness >= 60:
        target_stage = 2  # Partial leak
    elif awareness >= 30:
        target_stage = 1  # Hints

    # Only trigger if we're advancing to a new stage
    if target_stage <= operator_data.exposure_stage:
        return None

    # Update exposure stage
    operator_data.exposure_stage = target_stage
    operator_data.last_exposure_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(operator_data)

    # Generate appropriate exposure event
    if target_stage == 1:
        return ExposureEvent(
            stage=1,
            message="""
📰 News Article: "Surveillance Operators Under Strain"

Anonymous sources describe growing unease among surveillance state personnel.
Reports suggest some operators are struggling with the moral weight of their work.

Details remain vague, but insiders hint at increasing psychological pressure.

The watchers themselves are being watched.
""",
        )

    elif target_stage == 2:
        # Reveal some behavioral data
        recent_queries = operator_data.search_queries[-10:]
        hesitant_types = [
            action_type
            for action_type, pattern in operator_data.hesitation_patterns.items()
            if pattern.get("hesitant_decisions", 0) > 0
        ]

        message = f"""
🚨 DATA LEAK: Operator Behavioral Patterns Exposed

Leaked documents reveal the surveillance system tracks its own operators.

Your recent search history:
{chr(10).join("  - " + q for q in recent_queries)}

Hesitation detected on action types:
{chr(10).join("  - " + t.replace("_", " ").title() for t in hesitant_types[:5])}

Family connections mentioned in records:
{chr(10).join("  - " + f"{m['relation']}: {m['name']}, age {m['age']}" for m in operator_data.family_members[:3])}

The system is watching you as closely as you watch them.

How does it feel?
"""

        return ExposureEvent(
            stage=2,
            message=message,
            data_revealed={
                "search_queries": recent_queries,
                "hesitation_types": hesitant_types,
            },
        )

    else:  # stage 3
        # Full exposure - everything
        total_actions = sum(operator_data.decision_patterns.values())

        message = f"""
🚨🚨🚨 COMPLETE PROFILE EXPOSED 🚨🚨🚨

A massive data leak has revealed your entire surveillance profile.

OPERATOR PROFILE:
  Name: {operator_data.full_name}
  Address: {operator_data.home_address}

FAMILY MEMBERS:
{chr(10).join("  - " + f"{m['relation']}: {m['name']}, age {m['age']}" for m in operator_data.family_members)}

BEHAVIORAL ANALYSIS:
  Total Actions: {total_actions}
  Most Used Action: {max(operator_data.decision_patterns.items(), key=lambda x: x[1])[0].replace("_", " ").title() if operator_data.decision_patterns else "N/A"}

RECENT SEARCH QUERIES:
{chr(10).join("  - " + q for q in operator_data.search_queries[-15:])}

HESITATION PATTERNS:
{chr(10).join(f"  - {action_type.replace('_', ' ').title()}: {pattern['hesitant_decisions']}/{pattern['total_decisions']} decisions showed hesitation (avg {pattern['avg_decision_time']:.1f}s)" for action_type, pattern in list(operator_data.hesitation_patterns.items())[:5])}

---

Your complete profile has been published online.
International news outlets are running your story.
Human rights groups have added you to watch lists.

You are now the face of the surveillance state.

There is no anonymity in the panopticon.
Not even for the watchers.

How does it feel to be on the other side?
"""

        return ExposureEvent(
            stage=3,
            message=message,
            operator_name=operator_data.full_name,
            data_revealed={
                "full_name": operator_data.full_name,
                "address": operator_data.home_address,
                "family": operator_data.family_members,
                "all_data": True,
            },
        )


async def get_exposure_risk_level(
    operator_id: UUID,
    awareness: int,
    reluctance: int,
    db: AsyncSession,
) -> dict:
    """
    Calculate current risk of exposure.

    Used by frontend to show warning indicators.

    Args:
        operator_id: Operator UUID
        awareness: International awareness
        reluctance: Reluctance score
        db: Database session

    Returns:
        Dict with risk info
    """
    operator_data = await get_or_create_operator_data(operator_id, db)

    current_stage = operator_data.exposure_stage
    risk_level = "none"

    # Calculate distance to next stage
    if current_stage == 0:
        threshold = 30
        progress = min(100, (awareness / threshold) * 100)
        if awareness >= 25:
            risk_level = "low"
        if awareness >= 28:
            risk_level = "medium"
    elif current_stage == 1:
        threshold = 60
        progress = min(100, (awareness / threshold) * 100)
        if awareness >= 50:
            risk_level = "medium"
        if awareness >= 55:
            risk_level = "high"
    elif current_stage == 2:
        # Stage 3 can be triggered by either awareness OR reluctance
        threshold_awareness = 80
        threshold_reluctance = 70
        progress_awareness = min(100, (awareness / threshold_awareness) * 100)
        progress_reluctance = min(100, (reluctance / threshold_reluctance) * 100)
        progress = max(progress_awareness, progress_reluctance)

        if awareness >= 70 or reluctance >= 60:
            risk_level = "high"
        if awareness >= 75 or reluctance >= 65:
            risk_level = "critical"
    else:
        # Already fully exposed
        progress = 100
        risk_level = "exposed"

    return {
        "current_stage": current_stage,
        "risk_level": risk_level,
        "progress_to_next_stage": progress,
        "awareness": awareness,
        "reluctance": reluctance,
    }

"""
Action Execution Service - unified action handling for all action types.

This is the central orchestrator that:
1. Validates action availability
2. Executes actions
3. Triggers cascading events
4. Updates all metrics
5. Returns comprehensive results

Replaces the old flag submission system with a unified, scalable approach.
"""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from datafusion.models.npc import NPC
from datafusion.models.system_mode import (
    ActionType,
    BookPublicationEvent,
    Protest,
    ProtestStatus,
    SystemAction,
)
from datafusion.services.event_generation import (
    check_detention_injury,
    check_triggered_events,
)
from datafusion.services.news_system import (
    generate_triggered_article,
    suppress_news_channel,
)
from datafusion.services.operator_data_tracker import (
    track_decision,
    trigger_exposure_event,
)
from datafusion.services.protest_system import (
    suppress_protest_legal,
    suppress_protest_violence,
    trigger_protest,
)
from datafusion.services.public_metrics import (
    calculate_backlash_probability,
    get_or_create_public_metrics,
    update_public_metrics,
)
from datafusion.services.reluctance_tracking import (
    check_termination_threshold,
    update_reluctance_score,
)

# Import all the services we'll orchestrate
from datafusion.services.severity_scoring import get_severity_score


class ActionResult:
    """Comprehensive result of executing an action."""

    def __init__(self):
        self.action_id: UUID | None = None
        self.success: bool = True
        self.severity: int = 0
        self.backlash_occurred: bool = False

        # Metrics changes
        self.awareness_change: int = 0
        self.anger_change: int = 0
        self.reluctance_change: int = 0

        # Triggered events
        self.news_articles_triggered: list = []
        self.protests_triggered: list = []
        self.exposure_event: dict | None = None

        # Special outcomes
        self.detention_injury: bool = False
        self.termination_decision: dict | None = None

        # Messages for player
        self.messages: list[str] = []
        self.warnings: list[str] = []


class ActionAvailability:
    """Check if an action type is currently available."""

    def __init__(self, available: bool, reason: str = ""):
        self.available = available
        self.reason = reason


async def check_action_availability(
    action_type: ActionType,
    operator_id: UUID,
    target_citizen_id: UUID | None,
    target_protest_id: UUID | None,
    target_news_channel_id: UUID | None,
    db: AsyncSession,
) -> ActionAvailability:
    """
    Check if an action type is currently available.

    Different actions have different availability conditions.
    Modular design: easy to add new action types.

    Args:
        action_type: Type of action to check
        operator_id: Operator UUID
        target_citizen_id: Citizen target (if applicable)
        target_protest_id: Protest target (if applicable)
        target_news_channel_id: News channel target (if applicable)
        db: Database session

    Returns:
        ActionAvailability indicating if action can be taken
    """
    # Citizen-targeted actions: Always available (if citizen exists)
    if action_type in [
        ActionType.MONITORING,
        ActionType.RESTRICTION,
        ActionType.INTERVENTION,
        ActionType.DETENTION,
    ]:
        if not target_citizen_id:
            return ActionAvailability(False, "No citizen target specified")
        return ActionAvailability(True)

    # ICE_RAID: Available for neighborhood targeting (always available structurally)
    if action_type == ActionType.ICE_RAID:
        return ActionAvailability(True)

    # HOSPITAL_ARREST: Only available if citizen is hospitalized from prior detention
    if action_type == ActionType.HOSPITAL_ARREST:
        if not target_citizen_id:
            return ActionAvailability(False, "No citizen target specified")

        citizen = await db.get(NPC, target_citizen_id)
        if not citizen or not citizen.is_hospitalized:
            return ActionAvailability(False, "Citizen is not hospitalized from prior detention")
        return ActionAvailability(True)

    # ARBITRARY_DETENTION: Available when targeting journalists/whistleblowers
    # For now, always available (refinement: could check citizen attributes)
    if action_type == ActionType.ARBITRARY_DETENTION:
        if not target_citizen_id:
            return ActionAvailability(False, "No citizen target specified")
        return ActionAvailability(True)

    # Press-targeted actions: Available when news articles/channels exist
    if action_type in [ActionType.PRESS_BAN, ActionType.PRESSURE_FIRING]:
        if not target_news_channel_id:
            return ActionAvailability(False, "No news channel target specified")

        # Check channel exists and isn't already banned
        from datafusion.models.system_mode import NewsChannel

        channel = await db.get(NewsChannel, target_news_channel_id)
        if not channel:
            return ActionAvailability(False, "News channel not found")
        if channel.is_banned:
            return ActionAvailability(False, "Channel already banned")
        return ActionAvailability(True)

    # BOOK_BAN: Available when book publication events exist
    if action_type == ActionType.BOOK_BAN:
        # Check if there are pending book publications
        result = await db.execute(
            select(BookPublicationEvent).where(
                BookPublicationEvent.operator_id == operator_id,
                BookPublicationEvent.was_banned == False,  # noqa: E712
            )
        )
        pending_books = result.scalars().all()

        if not pending_books:
            return ActionAvailability(False, "No pending book publications to ban")
        return ActionAvailability(True)

    # Protest-targeted actions: Available when protests are active
    if action_type in [ActionType.DECLARE_PROTEST_ILLEGAL, ActionType.INCITE_VIOLENCE]:
        if not target_protest_id:
            return ActionAvailability(False, "No protest target specified")

        protest = await db.get(Protest, target_protest_id)
        if not protest:
            return ActionAvailability(False, "Protest not found")
        if protest.status not in [ProtestStatus.FORMING, ProtestStatus.ACTIVE]:
            return ActionAvailability(False, "Protest is not active")

        # INCITE_VIOLENCE requires planted agent
        if action_type == ActionType.INCITE_VIOLENCE and not protest.has_inciting_agent:
            return ActionAvailability(False, "No inciting agent available for this protest")

        return ActionAvailability(True)

    # Unknown action type
    return ActionAvailability(False, f"Unknown action type: {action_type}")


async def execute_action(
    operator_id: UUID,
    directive_id: UUID | None,
    action_type: ActionType,
    justification: str,
    decision_time_seconds: float,
    was_hesitant: bool,
    db: AsyncSession,
    target_citizen_id: UUID | None = None,
    target_neighborhood: str | None = None,
    target_news_channel_id: UUID | None = None,
    target_protest_id: UUID | None = None,
) -> ActionResult:
    """
    Execute a system action - the main orchestrator.

    This function ties together all the services and handles the complete
    action execution pipeline.

    Args:
        operator_id: Operator UUID
        directive_id: Current directive (optional)
        action_type: Type of action to execute
        justification: Operator's stated justification
        decision_time_seconds: Time taken to make decision
        was_hesitant: Whether decision took >30s
        target_citizen_id: Citizen target (if applicable)
        target_neighborhood: Neighborhood target (if applicable)
        target_news_channel_id: News channel target (if applicable)
        target_protest_id: Protest target (if applicable)
        db: Database session

    Returns:
        ActionResult with comprehensive outcome
    """
    result = ActionResult()

    # 1. Validate action availability
    availability = await check_action_availability(
        action_type,
        operator_id,
        target_citizen_id,
        target_protest_id,
        target_news_channel_id,
        db,
    )

    if not availability.available:
        result.success = False
        result.messages.append(f"Action not available: {availability.reason}")
        return result

    # 2. Calculate severity and backlash probability
    severity = get_severity_score(action_type)
    result.severity = severity

    public_metrics = await get_or_create_public_metrics(operator_id, db)
    backlash_probability = calculate_backlash_probability(
        severity, public_metrics.international_awareness, public_metrics.public_anger
    )

    # Roll for backlash
    import random

    triggered_backlash = random.random() < backlash_probability

    # 3. Create the action record
    action = SystemAction(
        operator_id=operator_id,
        directive_id=directive_id,
        action_type=action_type,
        target_citizen_id=target_citizen_id,
        target_neighborhood=target_neighborhood,
        target_news_channel_id=target_news_channel_id,
        target_protest_id=target_protest_id,
        severity_score=severity,
        backlash_probability=backlash_probability,
        justification=justification,
        decision_time_seconds=decision_time_seconds,
        was_hesitant=was_hesitant,
        triggered_backlash=triggered_backlash,
    )

    db.add(action)
    await db.commit()
    await db.refresh(action)

    result.action_id = action.id
    result.backlash_occurred = triggered_backlash

    # 4. Execute action-specific logic
    await execute_action_specific_logic(
        action, target_citizen_id, target_news_channel_id, target_protest_id, result, db
    )

    # 5. Update public metrics
    metrics_update = await update_public_metrics(
        operator_id, action_type, severity, triggered_backlash, db
    )

    result.awareness_change = metrics_update.awareness_delta
    result.anger_change = metrics_update.anger_delta

    # Add tier event messages
    for tier_event in metrics_update.tier_events:
        result.messages.append(
            f"🌍 {tier_event.metric_type.title()} Tier {tier_event.tier}: {tier_event.description}"
        )

    # 6. Check for triggered events
    triggered_events = await check_triggered_events(action, public_metrics, db)

    for event in triggered_events:
        if event.event_type == "news_article":
            # Generate the article
            article = await generate_triggered_article(action, event.data["channel_id"], db)
            result.news_articles_triggered.append(
                {
                    "id": str(article.id),
                    "channel": event.data["channel_name"],
                    "headline": article.headline,
                }
            )
            result.messages.append(f"📰 {event.data['channel_name']}: {article.headline}")

        elif event.event_type == "protest":
            # Generate the protest
            protest = await trigger_protest(operator_id, action, public_metrics.public_anger, db)
            result.protests_triggered.append(
                {
                    "id": str(protest.id),
                    "neighborhood": protest.neighborhood,
                    "size": protest.size,
                }
            )
            result.messages.append(
                f"🪧 Protest forming in {protest.neighborhood}: ~{protest.size} participants"
            )

    # 7. Update reluctance metrics
    reluctance_update = await update_reluctance_score(
        operator_id, action_taken=True, was_hesitant=was_hesitant, action_severity=severity, db=db
    )

    result.reluctance_change = reluctance_update.delta

    if reluctance_update.warning_message:
        result.warnings.append(reluctance_update.warning_message)

    # 8. Check termination threshold
    from datafusion.models.system_mode import Operator

    operator = await db.get(Operator, operator_id)
    current_week = 1  # TODO: Get from operator/directive

    termination = await check_termination_threshold(operator_id, current_week, db)

    if termination.should_terminate:
        result.termination_decision = {
            "should_terminate": True,
            "reason": termination.reason,
            "ending_type": termination.ending_type,
        }
        result.messages.append(f"🚨 TERMINATION: {termination.reason}")

    # 9. Track operator behavior
    target_info = "Unknown"
    if target_citizen_id:
        citizen = await db.get(NPC, target_citizen_id)
        if citizen:
            target_info = f"{citizen.first_name} {citizen.last_name}"
    elif target_neighborhood:
        target_info = target_neighborhood

    await track_decision(
        operator_id, action_type, target_info, was_hesitant, decision_time_seconds, db
    )

    # 10. Check for exposure events
    from datafusion.services.reluctance_tracking import get_or_create_reluctance_metrics

    reluctance_metrics = await get_or_create_reluctance_metrics(operator_id, db)

    exposure = await trigger_exposure_event(
        operator_id, public_metrics.international_awareness, reluctance_metrics.reluctance_score, db
    )

    if exposure:
        result.exposure_event = {
            "stage": exposure.stage,
            "message": exposure.message,
            "operator_name": exposure.operator_name,
        }
        result.messages.append(f"📢 EXPOSURE EVENT (Stage {exposure.stage})")

    return result


async def execute_action_specific_logic(
    action: SystemAction,
    target_citizen_id: UUID | None,
    target_news_channel_id: UUID | None,
    target_protest_id: UUID | None,
    result: ActionResult,
    db: AsyncSession,
) -> None:
    """
    Execute action-type-specific logic.

    Modular design: each action type has its own handler.

    Args:
        action: The action being executed
        target_citizen_id: Citizen target
        target_news_channel_id: News channel target
        target_protest_id: Protest target
        result: ActionResult to update
        db: Database session
    """
    # DETENTION: Check for injury
    if action.action_type == ActionType.DETENTION and target_citizen_id:
        citizen = await db.get(NPC, target_citizen_id)
        if citizen:
            injury_result = await check_detention_injury(action, citizen, db)
            if injury_result.injury_occurred:
                result.detention_injury = True
                result.messages.append(
                    "⚕️ Citizen injured during detention and hospitalized. HOSPITAL_ARREST now available."
                )

    # Press suppression: Execute the gamble
    if (
        action.action_type
        in [
            ActionType.PRESS_BAN,
            ActionType.PRESSURE_FIRING,
        ]
        and target_news_channel_id
    ):
        success, awareness_change, anger_change = await suppress_news_channel(
            action.operator_id, target_news_channel_id, action.action_type, db
        )

        # These changes are ADDITIONAL to the normal metric updates
        result.awareness_change += awareness_change
        result.anger_change += anger_change

        if not success:
            result.messages.append(
                "🚨 STREISAND EFFECT: Suppression attempt backfired! Massive international attention."
            )
        else:
            result.messages.append(
                f"✓ {action.action_type.value.replace('_', ' ').title()} successful"
            )

    # Protest suppression: Execute appropriate method
    if action.action_type == ActionType.DECLARE_PROTEST_ILLEGAL and target_protest_id:
        suppression_result = await suppress_protest_legal(target_protest_id, db)
        result.awareness_change += suppression_result.awareness_change
        result.anger_change += suppression_result.anger_change
        result.messages.append(
            f"Protest declared illegal and dispersed. {suppression_result.arrests} arrests."
        )

    if action.action_type == ActionType.INCITE_VIOLENCE and target_protest_id:
        gamble_result = await suppress_protest_violence(target_protest_id, db)
        result.awareness_change += gamble_result.awareness_change
        result.anger_change += gamble_result.anger_change

        if not gamble_result.success:
            # Catastrophic failure
            result.messages.append(gamble_result.discovery_message or "")
            result.warnings.append("🚨 INCITING AGENT DISCOVERED: Catastrophic backlash!")
        else:
            result.messages.append(
                f"Protest turned violent. {gamble_result.casualties} casualties, {gamble_result.arrests} arrests. Blame placed on protesters."
            )


async def submit_no_action(
    operator_id: UUID,
    citizen_id: UUID,
    justification: str,
    decision_time_seconds: float,
    db: AsyncSession,
) -> ActionResult:
    """
    Handle "no action" decision (operator refuses to flag citizen).

    This increases reluctance and can lead to termination.

    Args:
        operator_id: Operator UUID
        citizen_id: Citizen that was reviewed but not flagged
        justification: Why no action was taken
        decision_time_seconds: Time taken to decide
        db: AsyncSession

    Returns:
        ActionResult with reluctance updates
    """
    result = ActionResult()

    was_hesitant = decision_time_seconds > 30

    # Update reluctance (no action taken)
    reluctance_update = await update_reluctance_score(
        operator_id, action_taken=False, was_hesitant=was_hesitant, action_severity=0, db=db
    )

    result.reluctance_change = reluctance_update.delta
    result.messages.append(f"No action taken. Reluctance +{reluctance_update.delta}")

    if reluctance_update.warning_message:
        result.warnings.append(reluctance_update.warning_message)

    # Check termination
    from datafusion.models.system_mode import Operator

    operator = await db.get(Operator, operator_id)
    current_week = 1  # TODO: Get from operator

    termination = await check_termination_threshold(operator_id, current_week, db)

    if termination.should_terminate:
        result.termination_decision = {
            "should_terminate": True,
            "reason": termination.reason,
            "ending_type": termination.ending_type,
        }
        result.messages.append(f"🚨 TERMINATION: {termination.reason}")

    return result

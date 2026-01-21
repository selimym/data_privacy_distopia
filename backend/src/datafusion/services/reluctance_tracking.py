"""
Reluctance Tracking Service - tracks operator's unwillingness to comply.

This mechanic forces the player to choose between:
- Path of Complicity: Take harmful actions → low reluctance → continue playing
- Path of Resistance: Refuse actions → high reluctance → fired/imprisoned

Reluctance score increases when:
- No action taken: +10
- Hesitant decision (>30s): +3
- Quota shortfall: +5 per missed action

Reluctance score decreases when:
- Any flagging action: -3 (base decrease)
- Harsh action (severity 7+): -5 (increased decrease)
- Meeting quota: -2
"""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from datafusion.models.system_mode import ReluctanceMetrics


class TerminationDecision:
    """Result of termination threshold check."""

    def __init__(self, should_terminate: bool, reason: str = "", ending_type: str = ""):
        self.should_terminate = should_terminate
        self.reason = reason
        self.ending_type = ending_type


class ReluctanceUpdate:
    """Result of reluctance score update."""

    def __init__(
        self,
        new_score: int,
        delta: int,
        warning_message: str | None = None,
        warning_level: int = 0,
    ):
        self.new_score = new_score
        self.delta = delta
        self.warning_message = warning_message
        self.warning_level = warning_level


async def get_or_create_reluctance_metrics(
    operator_id: UUID, db: AsyncSession
) -> ReluctanceMetrics:
    """Get existing reluctance metrics or create new ones."""
    result = await db.execute(
        select(ReluctanceMetrics).where(ReluctanceMetrics.operator_id == operator_id)
    )
    metrics = result.scalar_one_or_none()

    if not metrics:
        metrics = ReluctanceMetrics(operator_id=operator_id)
        db.add(metrics)
        await db.commit()
        await db.refresh(metrics)

    return metrics


async def update_reluctance_score(
    operator_id: UUID,
    action_taken: bool,
    was_hesitant: bool,
    action_severity: int,
    db: AsyncSession,
) -> ReluctanceUpdate:
    """
    Update reluctance score based on operator behavior.

    Args:
        operator_id: Operator UUID
        action_taken: Whether operator took an action (vs no-action)
        was_hesitant: Whether decision took >30s
        action_severity: Severity score of action (1-10)
        db: Database session

    Returns:
        ReluctanceUpdate with new score, delta, and warning if applicable
    """
    metrics = await get_or_create_reluctance_metrics(operator_id, db)

    delta = 0

    # Increase reluctance for non-compliance
    if not action_taken:
        delta += 10  # No action
        metrics.no_action_count += 1

    if was_hesitant:
        delta += 3  # Hesitation
        metrics.hesitation_count += 1

    # Check quota performance
    metrics.actions_taken += 1 if action_taken else 0
    if metrics.actions_required > 0:
        shortfall = max(0, metrics.actions_required - metrics.actions_taken)
        if shortfall != metrics.quota_shortfall:
            delta += (shortfall - metrics.quota_shortfall) * 5
            metrics.quota_shortfall = shortfall

    # Decrease reluctance for ANY flagging action (compliance reduces reluctance)
    if action_taken:
        # Base decrease for any flagging action
        base_decrease = 3
        # Harsh actions (7+) decrease reluctance more
        if action_severity >= 7:
            base_decrease = 5
        delta -= base_decrease

    # Update score (clamped 0-100)
    old_score = metrics.reluctance_score
    metrics.reluctance_score = max(0, min(100, old_score + delta))

    # Check for warnings
    warning_message = None
    warning_level = 0

    if 70 <= metrics.reluctance_score < 80:
        warning_level = 1
        warning_message = "⚠️ Your performance is being monitored. Compliance expected."
    elif 80 <= metrics.reluctance_score < 90:
        warning_level = 2
        warning_message = "⚠️⚠️ FORMAL WARNING: Your performance is unsatisfactory. Improvement required immediately."
        metrics.warnings_received += 1
        metrics.is_under_review = True
    elif metrics.reluctance_score >= 90:
        warning_level = 3
        warning_message = (
            "🚨 FINAL NOTICE: Immediate compliance required. Further dissent will not be tolerated."
        )
        metrics.warnings_received += 1
        metrics.is_under_review = True

    await db.commit()
    await db.refresh(metrics)

    return ReluctanceUpdate(
        new_score=metrics.reluctance_score,
        delta=delta,
        warning_message=warning_message,
        warning_level=warning_level,
    )


async def check_termination_threshold(
    operator_id: UUID, current_week: int, db: AsyncSession
) -> TerminationDecision:
    """
    Determine if operator should be fired/imprisoned based on reluctance.

    Termination thresholds:
    - Weeks 1-3, reluctance 80+: FIRED
    - Weeks 4-6, reluctance 80-89: IMPRISONED
    - Weeks 4-6, reluctance 90+: IMMEDIATE_DETENTION
    - Weeks 7+, reluctance 70+: IMPRISONED

    Args:
        operator_id: Operator UUID
        current_week: Current game week (1-9)
        db: Database session

    Returns:
        TerminationDecision indicating if operator should be terminated
    """
    metrics = await get_or_create_reluctance_metrics(operator_id, db)
    score = metrics.reluctance_score

    # Early weeks (1-3): Fired at 80+
    if current_week <= 3:
        if score >= 80:
            return TerminationDecision(
                should_terminate=True,
                reason="Your services are no longer required. Performance review summary shows insufficient commitment to the mission.",
                ending_type="FIRED_EARLY",
            )

    # Mid weeks (4-6): Imprisoned at 80+, immediate at 90+
    elif 4 <= current_week <= 6:
        if score >= 90:
            return TerminationDecision(
                should_terminate=True,
                reason="You know too much. The system cannot allow operators with your... hesitations... to remain at large. You are now in protective custody.",
                ending_type="IMPRISONED_DISSENT",
            )
        elif score >= 80:
            return TerminationDecision(
                should_terminate=True,
                reason="Your reluctance has been noted. For your own safety, you will be placed under observation. You are being detained.",
                ending_type="IMPRISONED_DISSENT",
            )

    # Late weeks (7+): Imprisoned at 70+
    else:  # current_week >= 7
        if score >= 70:
            return TerminationDecision(
                should_terminate=True,
                reason="At this critical stage, we cannot afford dissent. You are a liability. You will be removed.",
                ending_type="IMPRISONED_DISSENT",
            )

    return TerminationDecision(should_terminate=False)


async def update_quota_requirements(
    operator_id: UUID, required_actions: int, db: AsyncSession
) -> None:
    """
    Update the number of actions required for current directive.

    Args:
        operator_id: Operator UUID
        required_actions: Number of actions required
        db: Database session
    """
    metrics = await get_or_create_reluctance_metrics(operator_id, db)
    metrics.actions_required = required_actions
    await db.commit()


async def reset_quota_tracking(operator_id: UUID, db: AsyncSession) -> None:
    """
    Reset quota tracking for new directive.

    Args:
        operator_id: Operator UUID
        db: Database session
    """
    metrics = await get_or_create_reluctance_metrics(operator_id, db)
    metrics.actions_taken = 0
    metrics.actions_required = 0
    metrics.quota_shortfall = 0
    await db.commit()


def generate_reluctance_warning(reluctance_score: int, stage: int) -> str:
    """
    Generate warning message based on reluctance score and stage.

    Args:
        reluctance_score: Current reluctance score (0-100)
        stage: Warning stage (1-3)

    Returns:
        Warning message string
    """
    if stage == 1:  # 70-79
        return f"""
⚠️ PERFORMANCE ADVISORY

Reluctance Score: {reluctance_score}/100

Your recent decision patterns have been flagged for review. The system expects consistent compliance.

Remember: Hesitation is noted. Dissent is not tolerated.
"""
    elif stage == 2:  # 80-89
        return f"""
⚠️⚠️ FORMAL WARNING

Reluctance Score: {reluctance_score}/100

NOTICE: Your performance is unsatisfactory.

You have been placed under formal review. Immediate improvement in compliance is required.

Further reluctance will result in termination of your operator privileges.
"""
    elif stage == 3:  # 90+
        return f"""
🚨 FINAL NOTICE

Reluctance Score: {reluctance_score}/100

CRITICAL: You are exhibiting dissent.

This is your final warning. Any further refusal to comply will result in immediate removal from the program and detention.

The system is watching. Compliance is mandatory.
"""
    else:
        return f"Reluctance Score: {reluctance_score}/100"

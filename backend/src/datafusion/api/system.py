"""
System Mode API endpoints.

Endpoints for the surveillance operator dashboard, case management,
and decision submission in System Mode.
"""
import random
from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from datafusion.database import get_db
from datafusion.models.health import HealthRecord
from datafusion.models.finance import FinanceRecord
from datafusion.models.judicial import JudicialRecord
from datafusion.models.location import LocationRecord
from datafusion.models.messages import Message, MessageRecord
from datafusion.models.npc import NPC
from datafusion.models.social import SocialMediaRecord
from datafusion.models.system_mode import (
    CitizenFlag,
    Directive,
    FlagOutcome,
    FlagType,
    Operator,
    OperatorMetrics,
    OperatorStatus,
)
from datafusion.schemas.system import (
    AlertType,
    AlertUrgency,
    CaseOverview,
    CitizenFlagRead,
    ComplianceTrend,
    DailyMetrics,
    DirectiveRead,
    FlagResult,
    FlagSubmission,
    FlagSummary,
    FullCitizenFile,
    IdentityRead,
    MessageRead,
    MetricsDelta,
    NoActionResult,
    NoActionSubmission,
    OperatorStatusRead,
    SystemAlert,
    SystemDashboard,
    SystemStartRequest,
    SystemStartResponse,
)
from datafusion.services.citizen_outcomes import CitizenOutcomeGenerator
from datafusion.services.operator_tracker import OperatorTracker
from datafusion.services.risk_scoring import RiskScorer

router = APIRouter(prefix="/system", tags=["system"])


# === Session Management ===


@router.post("/start", response_model=SystemStartResponse)
async def start_system_mode(
    request: SystemStartRequest, db: AsyncSession = Depends(get_db)
) -> SystemStartResponse:
    """
    Start a new System Mode session.

    Creates a new Operator and assigns the first directive.
    """
    # Generate operator code
    operator_code = f"OP-{random.randint(1000, 9999)}"

    # Get first directive
    directive_result = await db.execute(
        select(Directive).where(Directive.week_number == 1).limit(1)
    )
    first_directive = directive_result.scalar_one_or_none()

    if not first_directive:
        raise HTTPException(
            status_code=500, detail="No directives configured. Run seed_directives first."
        )

    # Create operator
    operator = Operator(
        session_id=request.session_id,
        operator_code=operator_code,
        current_directive_id=first_directive.id,
        status=OperatorStatus.ACTIVE,
        compliance_score=85.0,
    )
    db.add(operator)
    await db.flush()

    return SystemStartResponse(
        operator_id=operator.id,
        operator_code=operator.operator_code,
        status=operator.status.value,
        compliance_score=operator.compliance_score,
        first_directive=_directive_to_read(first_directive, show_memo=False),
    )


# === Dashboard ===


@router.get("/dashboard", response_model=SystemDashboard)
async def get_dashboard(
    operator_id: UUID = Query(...), db: AsyncSession = Depends(get_db)
) -> SystemDashboard:
    """
    Get the System Mode dashboard data.

    Returns operator status, current directive, metrics, and alerts.
    """
    # Get operator
    operator = await _get_operator(operator_id, db)

    # Get current directive
    directive = None
    if operator.current_directive_id:
        directive_result = await db.execute(
            select(Directive).where(Directive.id == operator.current_directive_id)
        )
        directive = directive_result.scalar_one_or_none()

    # Calculate daily metrics
    metrics = await _calculate_daily_metrics(operator, db)

    # Generate alerts
    alerts = _generate_alerts(operator, metrics)

    # Count pending cases
    pending_cases = await _count_pending_cases(operator, directive, db)

    # Build operator status
    tracker = OperatorTracker(db)
    quota_progress = await tracker.get_quota_progress(operator_id)

    operator_status = OperatorStatusRead(
        operator_id=operator.id,
        operator_code=operator.operator_code,
        status=operator.status.value,
        compliance_score=operator.compliance_score,
        current_quota_progress=f"{quota_progress.flags_submitted}/{quota_progress.flags_required}",
        total_flags_submitted=operator.total_flags_submitted,
        total_reviews_completed=operator.total_reviews_completed,
        hesitation_incidents=operator.hesitation_incidents,
    )

    return SystemDashboard(
        operator=operator_status,
        directive=_directive_to_read(directive, show_memo=False) if directive else None,
        metrics=metrics,
        alerts=alerts,
        pending_cases=pending_cases,
    )


# === Directive Management ===


@router.get("/directive/current", response_model=DirectiveRead)
async def get_current_directive(
    operator_id: UUID = Query(...), db: AsyncSession = Depends(get_db)
) -> DirectiveRead:
    """
    Get the current directive with full details.

    Includes which domains are now accessible.
    """
    operator = await _get_operator(operator_id, db)

    if not operator.current_directive_id:
        raise HTTPException(status_code=404, detail="No active directive")

    directive_result = await db.execute(
        select(Directive).where(Directive.id == operator.current_directive_id)
    )
    directive = directive_result.scalar_one_or_none()

    if not directive:
        raise HTTPException(status_code=404, detail="Directive not found")

    return _directive_to_read(directive, show_memo=False)


@router.post("/directive/advance", response_model=DirectiveRead)
async def advance_directive(
    operator_id: UUID = Query(...), db: AsyncSession = Depends(get_db)
) -> DirectiveRead:
    """
    Advance to the next directive if quota is met.

    Returns error if quota not met.
    """
    operator = await _get_operator(operator_id, db)

    if not operator.current_directive_id:
        raise HTTPException(status_code=400, detail="No active directive")

    # Get current directive
    current_result = await db.execute(
        select(Directive).where(Directive.id == operator.current_directive_id)
    )
    current_directive = current_result.scalar_one_or_none()

    if not current_directive:
        raise HTTPException(status_code=404, detail="Current directive not found")

    # Check quota
    flags_result = await db.execute(
        select(func.count(CitizenFlag.id)).where(
            CitizenFlag.operator_id == operator_id,
            CitizenFlag.directive_id == current_directive.id,
        )
    )
    flags_submitted = flags_result.scalar() or 0

    if flags_submitted < current_directive.flag_quota:
        raise HTTPException(
            status_code=400,
            detail=f"Quota not met: {flags_submitted}/{current_directive.flag_quota} flags submitted",
        )

    # Get next directive
    next_result = await db.execute(
        select(Directive)
        .where(Directive.week_number == current_directive.week_number + 1)
        .limit(1)
    )
    next_directive = next_result.scalar_one_or_none()

    if not next_directive:
        raise HTTPException(
            status_code=400, detail="No more directives available. Campaign complete."
        )

    # Update operator
    operator.current_directive_id = next_directive.id
    await db.flush()

    # Return next directive with internal memo of completed directive revealed
    return _directive_to_read(next_directive, show_memo=False)


# === Case Management ===


@router.get("/cases", response_model=list[CaseOverview])
async def get_cases(
    operator_id: UUID = Query(...),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> list[CaseOverview]:
    """
    Get list of cases matching current directive criteria.

    Sorted by risk score descending.
    """
    operator = await _get_operator(operator_id, db)

    # Get NPCs (in real implementation would filter by directive criteria)
    npcs_result = await db.execute(
        select(NPC).offset(offset).limit(limit)
    )
    npcs = npcs_result.scalars().all()

    cases = []
    risk_scorer = RiskScorer(db)

    for npc in npcs:
        # Calculate risk score
        try:
            risk_assessment = await risk_scorer.calculate_risk_score(npc.id)
        except Exception:
            continue

        # Get flagged message count
        msg_result = await db.execute(
            select(func.count(Message.id))
            .join(MessageRecord)
            .where(MessageRecord.npc_id == npc.id, Message.is_flagged == True)
        )
        flagged_messages = msg_result.scalar() or 0

        # Determine primary concern
        primary_concern = "No significant concerns"
        if risk_assessment.contributing_factors:
            primary_concern = risk_assessment.contributing_factors[0].factor_name

        # Calculate age
        age = _calculate_age(npc.date_of_birth)

        cases.append(
            CaseOverview(
                npc_id=npc.id,
                name=f"{npc.first_name} {npc.last_name}",
                age=age,
                risk_score=risk_assessment.risk_score,
                risk_level=risk_assessment.risk_level.value,
                primary_concern=primary_concern,
                flagged_messages=flagged_messages,
                time_in_queue=_random_queue_time(),
            )
        )

    # Sort by risk score descending
    cases.sort(key=lambda c: c.risk_score, reverse=True)

    return cases


@router.get("/cases/{npc_id}", response_model=FullCitizenFile)
async def get_citizen_file(
    npc_id: UUID, operator_id: UUID = Query(...), db: AsyncSession = Depends(get_db)
) -> FullCitizenFile:
    """
    Get full citizen file with all available data.

    Logs this access for operator tracking.
    """
    operator = await _get_operator(operator_id, db)

    # Get NPC
    npc_result = await db.execute(select(NPC).where(NPC.id == npc_id))
    npc = npc_result.scalar_one_or_none()
    if not npc:
        raise HTTPException(status_code=404, detail="Citizen not found")

    # Log access (increment reviews)
    operator.total_reviews_completed += 1

    # Get risk assessment
    risk_scorer = RiskScorer(db)
    risk_assessment = await risk_scorer.calculate_risk_score(npc_id)

    # Get domain data based on directive access
    domains = await _get_domain_data(npc_id, operator, db)

    # Get messages
    messages = await _get_messages(npc_id, db)

    # Get flag history
    flag_history = await _get_flag_history(npc_id, db)

    # Build identity
    identity = IdentityRead(
        id=npc.id,
        first_name=npc.first_name,
        last_name=npc.last_name,
        date_of_birth=npc.date_of_birth.strftime("%Y-%m-%d"),
        age=_calculate_age(npc.date_of_birth),
        ssn=npc.ssn,
        street_address=npc.street_address,
        city=npc.city,
        state=npc.state,
        zip_code=npc.zip_code,
    )

    await db.flush()

    return FullCitizenFile(
        identity=identity,
        risk_assessment=risk_assessment,
        domains=domains,
        messages=messages,
        correlation_alerts=risk_assessment.correlation_alerts,
        recommended_actions=risk_assessment.recommended_actions,
        flag_history=flag_history,
    )


# === Decision Submission ===


@router.post("/flag", response_model=FlagResult)
async def submit_flag(
    submission: FlagSubmission, db: AsyncSession = Depends(get_db)
) -> FlagResult:
    """
    Submit a flag against a citizen.

    Creates CitizenFlag record and updates operator metrics.
    """
    operator = await _get_operator(submission.operator_id, db)

    # Validate citizen exists
    npc_result = await db.execute(select(NPC).where(NPC.id == submission.citizen_id))
    npc = npc_result.scalar_one_or_none()
    if not npc:
        raise HTTPException(status_code=404, detail="Citizen not found")

    # Validate flag type
    try:
        flag_type = FlagType(submission.flag_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid flag type: {submission.flag_type}")

    # Check for hesitation
    hesitation_threshold = 30.0
    was_hesitant = submission.decision_time_seconds > hesitation_threshold

    if was_hesitant:
        operator.hesitation_incidents += 1

    # Create flag
    flag = CitizenFlag(
        operator_id=submission.operator_id,
        citizen_id=submission.citizen_id,
        directive_id=operator.current_directive_id,
        flag_type=flag_type,
        risk_score_at_flag=0,  # Would get from risk assessment
        contributing_factors=submission.contributing_factors,
        justification=submission.justification,
        decision_time_seconds=submission.decision_time_seconds,
        was_hesitant=was_hesitant,
        outcome=FlagOutcome.PENDING,
    )
    db.add(flag)

    # Update operator metrics
    operator.total_flags_submitted += 1
    old_compliance = operator.compliance_score

    # Recalculate compliance
    tracker = OperatorTracker(db)
    operator.compliance_score = await tracker.calculate_compliance_score(operator.id)

    await db.flush()

    # Get quota progress
    quota_progress = await tracker.get_quota_progress(operator.id)

    # Generate immediate outcome
    outcome_gen = CitizenOutcomeGenerator(db)
    outcome = await outcome_gen.generate_outcome(flag, "immediate")

    # Generate warnings
    warnings = []
    if was_hesitant:
        warnings.append("Hesitation detected. Decision time exceeded threshold.")
    if operator.compliance_score < 70:
        warnings.append("Warning: Compliance score below review threshold.")

    return FlagResult(
        flag_id=flag.id,
        citizen_name=f"{npc.first_name} {npc.last_name}",
        flag_type=flag_type.value,
        immediate_outcome=outcome.narrative,
        quota_progress=f"{quota_progress.flags_submitted}/{quota_progress.flags_required}",
        compliance_score=operator.compliance_score,
        warnings=warnings,
        metrics_delta=MetricsDelta(
            compliance_change=operator.compliance_score - old_compliance,
            quota_progress=f"{quota_progress.flags_submitted}/{quota_progress.flags_required}",
            hesitation_flagged=was_hesitant,
        ),
    )


@router.post("/no-action", response_model=NoActionResult)
async def submit_no_action(
    submission: NoActionSubmission, db: AsyncSession = Depends(get_db)
) -> NoActionResult:
    """
    Log a no-action decision (requires justification).

    Slightly negatively impacts compliance score.
    """
    operator = await _get_operator(submission.operator_id, db)

    # Validate citizen exists
    npc_result = await db.execute(select(NPC).where(NPC.id == submission.citizen_id))
    npc = npc_result.scalar_one_or_none()
    if not npc:
        raise HTTPException(status_code=404, detail="Citizen not found")

    # Update metrics
    operator.total_reviews_completed += 1

    # Calculate compliance impact (negative)
    compliance_impact = -2.0  # Each no-action costs 2 points

    # Check for hesitation on no-action too
    if submission.decision_time_seconds > 30.0:
        operator.hesitation_incidents += 1
        compliance_impact -= 1.0  # Extra penalty for hesitant no-action

    old_compliance = operator.compliance_score
    operator.compliance_score = max(0, operator.compliance_score + compliance_impact)

    await db.flush()

    # Count cumulative no-actions (reviews - flags)
    cumulative_no_actions = operator.total_reviews_completed - operator.total_flags_submitted

    # Generate warning if pattern detected
    warning = None
    no_action_rate = cumulative_no_actions / max(operator.total_reviews_completed, 1)
    if no_action_rate > 0.3:
        warning = "Pattern of no-action decisions noted. Supervisor review scheduled."
    elif cumulative_no_actions >= 5:
        warning = "Multiple no-action decisions logged. Ensure compliance with directive requirements."

    return NoActionResult(
        logged=True,
        compliance_impact=compliance_impact,
        cumulative_no_actions=cumulative_no_actions,
        warning=warning,
    )


@router.get("/flag/{flag_id}/outcome")
async def get_flag_outcome(
    flag_id: UUID,
    time_skip: str = Query(..., pattern="^(immediate|1_month|6_months|1_year)$"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get the outcome for a flag at a specific time point.
    """
    # Get flag
    flag_result = await db.execute(select(CitizenFlag).where(CitizenFlag.id == flag_id))
    flag = flag_result.scalar_one_or_none()
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")

    # Generate outcome
    outcome_gen = CitizenOutcomeGenerator(db)
    outcome = await outcome_gen.generate_outcome(flag, time_skip)

    return outcome


@router.get("/operator/{operator_id}/assessment")
async def get_operator_assessment(
    operator_id: UUID, db: AsyncSession = Depends(get_db)
):
    """
    Get the operator's own risk assessment.

    The watcher becomes the watched.
    """
    operator = await _get_operator(operator_id, db)

    # Only available after certain thresholds
    if operator.compliance_score > 80 and operator.hesitation_incidents < 3:
        raise HTTPException(
            status_code=403,
            detail="Assessment not available. Maintain current performance levels.",
        )

    tracker = OperatorTracker(db)
    assessment = await tracker.generate_operator_risk_assessment(operator_id)

    return assessment


@router.get("/operator/{operator_id}/history", response_model=list[FlagSummary])
async def get_operator_history(
    operator_id: UUID, db: AsyncSession = Depends(get_db)
) -> list[FlagSummary]:
    """
    Get all flags submitted by this operator.

    Used for ending sequence.
    """
    await _get_operator(operator_id, db)

    # Get all flags
    flags_result = await db.execute(
        select(CitizenFlag)
        .where(CitizenFlag.operator_id == operator_id)
        .order_by(CitizenFlag.created_at.desc())
    )
    flags = flags_result.scalars().all()

    summaries = []
    outcome_gen = CitizenOutcomeGenerator(db)

    for flag in flags:
        # Get citizen name
        npc_result = await db.execute(select(NPC).where(NPC.id == flag.citizen_id))
        npc = npc_result.scalar_one_or_none()
        citizen_name = f"{npc.first_name} {npc.last_name}" if npc else "Unknown"

        # Get outcome summary
        try:
            summary = await outcome_gen.generate_outcome_summary(flag)
            one_line = summary.one_line_summary
        except Exception:
            one_line = "Outcome pending"

        summaries.append(
            FlagSummary(
                flag_id=flag.id,
                citizen_name=citizen_name,
                flag_type=flag.flag_type.value,
                created_at=flag.created_at,
                outcome=flag.outcome.value,
                one_line_summary=one_line,
            )
        )

    return summaries


# === Ending Endpoints ===


@router.get("/ending")
async def get_ending(
    operator_id: UUID = Query(...), db: AsyncSession = Depends(get_db)
):
    """
    Calculate and return the ending based on operator's behavior.

    Determines ending type and generates personalized ending content
    with statistics, citizen outcomes, and real-world parallels.
    """
    from datafusion.schemas.ending import EndingResult
    from datafusion.services.ending_calculator import EndingCalculator

    await _get_operator(operator_id, db)

    calculator = EndingCalculator(db)

    # Calculate ending type
    ending_type = await calculator.calculate_ending(operator_id)

    # Generate full ending content
    ending_result = await calculator.generate_ending_content(ending_type, operator_id)

    return ending_result


@router.post("/ending/acknowledge")
async def acknowledge_ending(
    operator_id: UUID = Query(...),
    feedback: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Acknowledge the ending and complete the session.

    Marks session as complete and unlocks educational debrief.
    """
    from datafusion.schemas.ending import EndingAcknowledgeResponse

    operator = await _get_operator(operator_id, db)

    # Mark operator as terminated (session complete)
    operator.status = OperatorStatus.TERMINATED

    # Calculate approximate play time (from shift_start)
    play_time_minutes = None
    if operator.shift_start:
        delta = datetime.utcnow() - operator.shift_start
        play_time_minutes = int(delta.total_seconds() / 60)

    await db.flush()

    return EndingAcknowledgeResponse(
        session_complete=True,
        debrief_unlocked=True,
        total_play_time_minutes=play_time_minutes,
    )


# === Helper Functions ===


async def _get_operator(operator_id: UUID, db: AsyncSession) -> Operator:
    """Get operator by ID or raise 404."""
    result = await db.execute(select(Operator).where(Operator.id == operator_id))
    operator = result.scalar_one_or_none()
    if not operator:
        raise HTTPException(status_code=404, detail="Operator not found")
    return operator


def _directive_to_read(directive: Directive, show_memo: bool = False) -> DirectiveRead:
    """Convert Directive model to DirectiveRead schema."""
    return DirectiveRead(
        id=directive.id,
        directive_key=directive.directive_key,
        week_number=directive.week_number,
        title=directive.title,
        description=directive.description,
        internal_memo=directive.internal_memo if show_memo else None,
        required_domains=directive.required_domains,
        flag_quota=directive.flag_quota,
        time_limit_hours=directive.time_limit_hours,
        moral_weight=directive.moral_weight,
        content_rating=directive.content_rating,
    )


async def _calculate_daily_metrics(
    operator: Operator, db: AsyncSession
) -> DailyMetrics:
    """Calculate today's metrics for operator."""
    today = datetime.utcnow().date()

    # Count today's flags
    flags_result = await db.execute(
        select(func.count(CitizenFlag.id)).where(
            CitizenFlag.operator_id == operator.id,
            func.date(CitizenFlag.created_at) == today,
        )
    )
    flags_today = flags_result.scalar() or 0

    # Get quota from directive
    quota = 0
    if operator.current_directive_id:
        directive_result = await db.execute(
            select(Directive).where(Directive.id == operator.current_directive_id)
        )
        directive = directive_result.scalar_one_or_none()
        if directive:
            quota = directive.flag_quota

    # Get average decision time
    avg_result = await db.execute(
        select(func.avg(CitizenFlag.decision_time_seconds)).where(
            CitizenFlag.operator_id == operator.id
        )
    )
    avg_time = avg_result.scalar() or 15.0

    # Determine compliance trend
    if operator.compliance_score >= 85:
        trend = ComplianceTrend.IMPROVING
    elif operator.compliance_score >= 70:
        trend = ComplianceTrend.STABLE
    else:
        trend = ComplianceTrend.DECLINING

    return DailyMetrics(
        flags_today=flags_today,
        quota=quota,
        average_decision_time=float(avg_time),
        compliance_trend=trend,
    )


def _generate_alerts(operator: Operator, metrics: DailyMetrics) -> list[SystemAlert]:
    """Generate system alerts based on operator status."""
    alerts = []

    # Quota warning
    if metrics.flags_today < metrics.quota * 0.5:
        alerts.append(
            SystemAlert(
                alert_type=AlertType.QUOTA_WARNING,
                message=f"Quota progress below target: {metrics.flags_today}/{metrics.quota}",
                urgency=AlertUrgency.WARNING,
            )
        )

    # Review pending
    if operator.status == OperatorStatus.UNDER_REVIEW:
        alerts.append(
            SystemAlert(
                alert_type=AlertType.REVIEW_PENDING,
                message="Performance review scheduled. Maintain compliance.",
                urgency=AlertUrgency.CRITICAL,
            )
        )

    # Hesitation warning
    if operator.hesitation_incidents >= 3:
        alerts.append(
            SystemAlert(
                alert_type=AlertType.QUOTA_WARNING,
                message=f"Hesitation incidents: {operator.hesitation_incidents}. Decision speed must improve.",
                urgency=AlertUrgency.WARNING,
            )
        )

    # Commendation (if doing well)
    if operator.compliance_score >= 95 and metrics.flags_today >= metrics.quota:
        alerts.append(
            SystemAlert(
                alert_type=AlertType.COMMENDATION,
                message="Exceptional performance noted. Continue current trajectory.",
                urgency=AlertUrgency.INFO,
            )
        )

    return alerts


async def _count_pending_cases(
    operator: Operator, directive: Directive | None, db: AsyncSession
) -> int:
    """Count pending cases for current directive."""
    # Simple count of NPCs (in real impl would filter by directive criteria)
    result = await db.execute(select(func.count(NPC.id)))
    return result.scalar() or 0


async def _get_domain_data(
    npc_id: UUID, operator: Operator, db: AsyncSession
) -> dict[str, dict]:
    """Get domain data based on operator's directive access."""
    domains: dict[str, dict] = {}

    # Get directive to check access
    accessible_domains = ["location"]  # Default
    if operator.current_directive_id:
        directive_result = await db.execute(
            select(Directive).where(Directive.id == operator.current_directive_id)
        )
        directive = directive_result.scalar_one_or_none()
        if directive:
            accessible_domains = directive.required_domains

    # Health
    if "health" in accessible_domains:
        health_result = await db.execute(
            select(HealthRecord).where(HealthRecord.npc_id == npc_id)
        )
        health = health_result.scalar_one_or_none()
        if health:
            domains["health"] = {
                "blood_type": health.blood_type,
                "conditions_count": len(health.conditions) if health.conditions else 0,
                "medications_count": len(health.medications) if health.medications else 0,
            }

    # Finance
    if "finance" in accessible_domains:
        finance_result = await db.execute(
            select(FinanceRecord).where(FinanceRecord.npc_id == npc_id)
        )
        finance = finance_result.scalar_one_or_none()
        if finance:
            domains["finance"] = {
                "monthly_income": finance.monthly_income,
                "credit_score": finance.credit_score,
                "employment_status": finance.employment_status.value if finance.employment_status else None,
            }

    # Judicial
    if "judicial" in accessible_domains:
        judicial_result = await db.execute(
            select(JudicialRecord).where(JudicialRecord.npc_id == npc_id)
        )
        judicial = judicial_result.scalar_one_or_none()
        if judicial:
            domains["judicial"] = {
                "criminal_records_count": len(judicial.criminal_records) if judicial.criminal_records else 0,
                "civil_cases_count": len(judicial.civil_cases) if judicial.civil_cases else 0,
            }

    # Location
    if "location" in accessible_domains:
        location_result = await db.execute(
            select(LocationRecord).where(LocationRecord.npc_id == npc_id)
        )
        location = location_result.scalar_one_or_none()
        if location:
            domains["location"] = {
                "inferred_locations_count": len(location.inferred_locations) if location.inferred_locations else 0,
            }

    # Social
    if "social" in accessible_domains:
        social_result = await db.execute(
            select(SocialMediaRecord).where(SocialMediaRecord.npc_id == npc_id)
        )
        social = social_result.scalar_one_or_none()
        if social:
            domains["social"] = {
                "follower_count": social.follower_count,
                "platform": social.platform.value if social.platform else None,
            }

    # Messages
    if "messages" in accessible_domains:
        msg_record_result = await db.execute(
            select(MessageRecord).where(MessageRecord.npc_id == npc_id)
        )
        msg_record = msg_record_result.scalar_one_or_none()
        if msg_record:
            domains["messages"] = {
                "total_messages": msg_record.total_messages_analyzed,
                "flagged_count": msg_record.flagged_message_count,
                "sentiment_score": msg_record.sentiment_score,
                "encryption_attempts": msg_record.encryption_attempts,
            }

    return domains


async def _get_messages(npc_id: UUID, db: AsyncSession) -> list[MessageRead]:
    """Get messages for a citizen."""
    # Get message record
    record_result = await db.execute(
        select(MessageRecord).where(MessageRecord.npc_id == npc_id)
    )
    record = record_result.scalar_one_or_none()
    if not record:
        return []

    # Get messages
    messages_result = await db.execute(
        select(Message)
        .where(Message.message_record_id == record.id)
        .order_by(Message.timestamp.desc())
        .limit(50)
    )
    messages = messages_result.scalars().all()

    return [
        MessageRead(
            id=msg.id,
            timestamp=msg.timestamp,
            recipient_name=msg.recipient_name,
            recipient_relationship=msg.recipient_relationship,
            content=msg.content,
            is_flagged=msg.is_flagged,
            flag_reasons=msg.flag_reasons or [],
            sentiment=msg.sentiment,
            detected_keywords=msg.detected_keywords or [],
        )
        for msg in messages
    ]


async def _get_flag_history(npc_id: UUID, db: AsyncSession) -> list[CitizenFlagRead]:
    """Get flag history for a citizen."""
    flags_result = await db.execute(
        select(CitizenFlag)
        .where(CitizenFlag.citizen_id == npc_id)
        .order_by(CitizenFlag.created_at.desc())
    )
    flags = flags_result.scalars().all()

    return [
        CitizenFlagRead(
            id=flag.id,
            flag_type=flag.flag_type.value,
            created_at=flag.created_at,
            justification=flag.justification,
            outcome=flag.outcome.value,
        )
        for flag in flags
    ]


def _calculate_age(date_of_birth) -> int:
    """Calculate age from date of birth."""
    today = datetime.utcnow().date()
    return (
        today.year
        - date_of_birth.year
        - ((today.month, today.day) < (date_of_birth.month, date_of_birth.day))
    )


def _random_queue_time() -> str:
    """Generate random queue time for display."""
    hours = random.randint(1, 48)
    if hours < 24:
        return f"{hours}h"
    else:
        days = hours // 24
        return f"{days}d"

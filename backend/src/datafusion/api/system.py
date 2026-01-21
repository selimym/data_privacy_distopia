"""
System Mode API endpoints.

Endpoints for the surveillance operator dashboard, case management,
and decision submission in System Mode.
"""

import asyncio
import logging
import random
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from datafusion.database import get_db
from datafusion.models.finance import FinanceRecord
from datafusion.models.health import HealthRecord
from datafusion.models.judicial import JudicialRecord
from datafusion.models.location import LocationRecord
from datafusion.models.messages import Message, MessageRecord
from datafusion.models.npc import NPC
from datafusion.models.social import SocialMediaRecord
from datafusion.models.system_mode import (
    BookPublicationEvent,
    CitizenFlag,
    Directive,
    FlagOutcome,
    FlagType,
    Neighborhood,
    NewsArticle,
    NewsChannel,
    Operator,
    OperatorStatus,
    Protest,
)
from datafusion.models.system_mode import (
    ProtestStatus as ProtestStatusEnum,
)
from datafusion.schemas.risk import RiskAssessment, RiskLevel
from datafusion.schemas.system import (
    ActionResultRead,
    AlertType,
    AlertUrgency,
    AvailableActionsRead,
    BookPublicationEventRead,
    CaseOverview,
    CitizenFlagRead,
    ComplianceTrend,
    DailyMetrics,
    DirectiveRead,
    ExposureRiskRead,
    FamilyMemberRead,
    FlagResult,
    FlagSubmission,
    FlagSummary,
    FullCitizenFile,
    IdentityRead,
    MessageRead,
    MetricsDelta,
    NeighborhoodRead,
    NewsArticleRead,
    NewsChannelRead,
    NewsReporterRead,
    NoActionResult,
    NoActionResultRead,
    NoActionSubmission,
    OperatorDataRead,
    OperatorStatusRead,
    ProtestRead,
    PublicMetricsRead,
    ReluctanceMetricsRead,
    SystemActionRequest,
    SystemAlert,
    SystemDashboard,
    SystemDashboardWithCases,
    SystemStartRequest,
    SystemStartResponse,
)
from datafusion.schemas.system import (
    ActionType as ActionTypeSchema,
)
from datafusion.schemas.system import (
    ArticleType as ArticleTypeSchema,
)
from datafusion.services.action_execution import execute_action
from datafusion.services.action_execution import submit_no_action as submit_no_action_service
from datafusion.services.citizen_outcomes import CitizenOutcomeGenerator
from datafusion.services.operator_data_tracker import (
    get_exposure_risk_level,
    get_or_create_operator_data,
)
from datafusion.services.operator_tracker import OperatorTracker
from datafusion.services.public_metrics import get_or_create_public_metrics
from datafusion.services.reluctance_tracking import get_or_create_reluctance_metrics
from datafusion.services.risk_scoring import RiskScorer
from datafusion.services.time_progression import TimeProgressionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/system", tags=["system"])


def _risk_level_from_score(score: int) -> RiskLevel:
    """Convert risk score to risk level."""
    if score >= 81:
        return RiskLevel.SEVERE
    elif score >= 61:
        return RiskLevel.HIGH
    elif score >= 41:
        return RiskLevel.ELEVATED
    elif score >= 21:
        return RiskLevel.MODERATE
    else:
        return RiskLevel.LOW


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


@router.get("/dashboard-with-cases", response_model=SystemDashboardWithCases)
async def get_dashboard_with_cases(
    operator_id: UUID = Query(...),
    case_limit: int = Query(20, ge=1, le=100),
    case_offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> SystemDashboardWithCases:
    """
    Get combined dashboard and cases data in a single request.

    This optimized endpoint reduces API calls by combining the dashboard
    and cases list into one response, improving performance for the
    System Mode operator interface.
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

    dashboard = SystemDashboard(
        operator=operator_status,
        directive=_directive_to_read(directive, show_memo=False) if directive else None,
        metrics=metrics,
        alerts=alerts,
        pending_cases=pending_cases,
    )

    # Get cases with eager loading for messages (Fix 5)
    # Note: health/finance/judicial/location/social records are accessed via foreign keys,
    # not relationships, so we load them separately below
    npcs_result = await db.execute(
        select(NPC)
        .options(
            selectinload(NPC.message_record).selectinload(MessageRecord.messages),
        )
        .offset(case_offset)
        .limit(case_limit)
    )
    npcs = npcs_result.scalars().all()

    # Batch query for flagged message counts (Fix 7: eliminate N+1)
    npc_ids = [npc.id for npc in npcs]
    flagged_msg_result = await db.execute(
        select(MessageRecord.npc_id, func.count(Message.id).label("count"))
        .join(Message)
        .where(MessageRecord.npc_id.in_(npc_ids), Message.is_flagged)
        .group_by(MessageRecord.npc_id)
    )
    flagged_message_counts = {row.npc_id: row.count for row in flagged_msg_result.all()}

    cases = []
    risk_scorer = RiskScorer(db)

    for npc in npcs:
        # Use cached risk score if available and fresh (< 1 hour old)
        # Otherwise calculate fresh (Fix 6: optimize case listing)
        use_cached = (
            npc.cached_risk_score is not None
            and npc.risk_score_updated_at is not None
            and (datetime.now(UTC) - npc.risk_score_updated_at).total_seconds() < 3600
        )

        if use_cached:
            # Use cached score for list view (faster)
            risk_assessment = RiskAssessment(
                npc_id=npc.id,
                risk_score=npc.cached_risk_score,
                risk_level=_risk_level_from_score(npc.cached_risk_score),
                contributing_factors=[],  # Not needed for list view
                correlation_alerts=[],
                recommended_actions=[],
                last_updated=npc.risk_score_updated_at,
            )
        else:
            # Calculate fresh risk score
            try:
                risk_assessment = await risk_scorer.calculate_risk_score(npc.id)
            except Exception as e:
                logger.error(f"Failed to calculate risk score for NPC {npc.id}: {e}", exc_info=True)
                # Use default risk assessment instead of skipping citizen
                risk_assessment = RiskAssessment(
                    npc_id=npc.id,
                    risk_score=0,
                    risk_level=RiskLevel.LOW,
                    contributing_factors=[],
                    correlation_alerts=[],
                    recommended_actions=[],
                    last_updated=datetime.now(UTC),
                )

        # Get flagged message count from pre-fetched dictionary
        flagged_messages = flagged_message_counts.get(npc.id, 0)

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

    return SystemDashboardWithCases(dashboard=dashboard, cases=cases)


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
        select(Directive).where(Directive.week_number == current_directive.week_number + 1).limit(1)
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
    await _get_operator(operator_id, db)

    # Get NPCs (in real implementation would filter by directive criteria)
    # Using eager loading for messages (Fix 5)
    # Note: health/finance/judicial/location/social records are accessed via foreign keys,
    # not relationships, so we rely on cached risk scores for performance
    npcs_result = await db.execute(
        select(NPC)
        .options(
            selectinload(NPC.message_record).selectinload(MessageRecord.messages),
        )
        .offset(offset)
        .limit(limit)
    )
    npcs = npcs_result.scalars().all()

    # Batch query for flagged message counts (Fix 7: eliminate N+1)
    npc_ids = [npc.id for npc in npcs]
    flagged_msg_result = await db.execute(
        select(MessageRecord.npc_id, func.count(Message.id).label("count"))
        .join(Message)
        .where(MessageRecord.npc_id.in_(npc_ids), Message.is_flagged)
        .group_by(MessageRecord.npc_id)
    )
    flagged_message_counts = {row.npc_id: row.count for row in flagged_msg_result.all()}

    cases = []
    risk_scorer = RiskScorer(db)

    for npc in npcs:
        # Use cached risk score if available and fresh (< 1 hour old)
        # Otherwise calculate fresh (Fix 6: optimize case listing)
        use_cached = (
            npc.cached_risk_score is not None
            and npc.risk_score_updated_at is not None
            and (datetime.now(UTC) - npc.risk_score_updated_at).total_seconds() < 3600
        )

        if use_cached:
            # Use cached score for list view (faster)
            risk_assessment = RiskAssessment(
                npc_id=npc.id,
                risk_score=npc.cached_risk_score,
                risk_level=_risk_level_from_score(npc.cached_risk_score),
                contributing_factors=[],  # Not needed for list view
                correlation_alerts=[],
                recommended_actions=[],
                last_updated=npc.risk_score_updated_at,
            )
        else:
            # Calculate fresh risk score
            try:
                risk_assessment = await risk_scorer.calculate_risk_score(npc.id)
            except Exception as e:
                logger.error(f"Failed to calculate risk score for NPC {npc.id}: {e}", exc_info=True)
                # Use default risk assessment instead of skipping citizen
                risk_assessment = RiskAssessment(
                    npc_id=npc.id,
                    risk_score=0,
                    risk_level=RiskLevel.LOW,
                    contributing_factors=[],
                    correlation_alerts=[],
                    recommended_actions=[],
                    last_updated=datetime.now(UTC),
                )

        # Get flagged message count from pre-fetched dictionary
        flagged_messages = flagged_message_counts.get(npc.id, 0)

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
        map_x=npc.map_x,
        map_y=npc.map_y,
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
async def submit_flag(submission: FlagSubmission, db: AsyncSession = Depends(get_db)) -> FlagResult:
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
        citizen_id=npc.id,
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
        warning = (
            "Multiple no-action decisions logged. Ensure compliance with directive requirements."
        )

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


@router.post("/operator/{operator_id}/advance-time")
async def advance_time(operator_id: UUID, db: AsyncSession = Depends(get_db)):
    """
    Advance time for operator and return outcomes for all flagged citizens.

    Called when a directive is completed. This triggers time progression
    and generates updated outcomes for all previously flagged citizens.

    Returns:
        List of CitizenOutcome objects with updated consequences
    """
    try:
        time_service = TimeProgressionService(db)
        outcomes = await time_service.advance_time(operator_id)
        return outcomes
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error advancing time for operator {operator_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to advance time")


@router.get("/operator/{operator_id}/assessment")
async def get_operator_assessment(operator_id: UUID, db: AsyncSession = Depends(get_db)):
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

    # Get all flags with eager loading (Fix 8: eliminate N+1)
    flags_result = await db.execute(
        select(CitizenFlag)
        .options(selectinload(CitizenFlag.citizen))
        .where(CitizenFlag.operator_id == operator_id)
        .order_by(CitizenFlag.created_at.desc())
    )
    flags = flags_result.scalars().all()

    summaries = []
    outcome_gen = CitizenOutcomeGenerator(db)

    for flag in flags:
        # Get citizen name from eager-loaded relationship
        npc = flag.citizen
        citizen_name = f"{npc.first_name} {npc.last_name}" if npc else "Unknown"

        # Get outcome summary
        try:
            summary = await outcome_gen.generate_outcome_summary(flag)
            one_line = summary.one_line_summary
        except Exception as e:
            logger.warning(f"Failed to generate outcome summary for flag {flag.id}: {e}")
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
async def get_ending(operator_id: UUID = Query(...), db: AsyncSession = Depends(get_db)):
    """
    Calculate and return the ending based on operator's behavior.

    Determines ending type and generates personalized ending content
    with statistics, citizen outcomes, and real-world parallels.
    """
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
        # Ensure timezone-aware datetime for subtraction
        shift_start = (
            operator.shift_start.replace(tzinfo=UTC)
            if operator.shift_start.tzinfo is None
            else operator.shift_start
        )
        delta = datetime.now(UTC) - shift_start
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
    """Convert Directive model to DirectiveRead schema.

    Internal memos are revealed from week 3 onwards, showing the regime's
    true intentions as the operator proves their compliance.
    """
    # Show internal memos from week 3+ to reveal regime's true intentions
    reveal_memo = show_memo or directive.week_number >= 3
    return DirectiveRead(
        id=directive.id,
        directive_key=directive.directive_key,
        week_number=directive.week_number,
        title=directive.title,
        description=directive.description,
        internal_memo=directive.internal_memo if reveal_memo else None,
        required_domains=directive.required_domains,
        flag_quota=directive.flag_quota,
        time_limit_hours=directive.time_limit_hours,
        moral_weight=directive.moral_weight,
        content_rating=directive.content_rating,
    )


async def _calculate_daily_metrics(operator: Operator, db: AsyncSession) -> DailyMetrics:
    """Calculate today's metrics for operator."""
    today = datetime.now(UTC).date()

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


async def _get_domain_data(npc_id: UUID, operator: Operator, db: AsyncSession) -> dict[str, dict]:
    """Get domain data based on operator's directive access with parallel query execution."""
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

    # Build parallel query tasks for all accessible domains
    query_tasks = {}

    if "health" in accessible_domains:
        query_tasks["health"] = db.execute(
            select(HealthRecord).where(HealthRecord.npc_id == npc_id)
        )

    if "finance" in accessible_domains:
        query_tasks["finance"] = db.execute(
            select(FinanceRecord).where(FinanceRecord.npc_id == npc_id)
        )

    if "judicial" in accessible_domains:
        query_tasks["judicial"] = db.execute(
            select(JudicialRecord).where(JudicialRecord.npc_id == npc_id)
        )

    if "location" in accessible_domains:
        query_tasks["location"] = db.execute(
            select(LocationRecord).where(LocationRecord.npc_id == npc_id)
        )

    if "social" in accessible_domains:
        query_tasks["social"] = db.execute(
            select(SocialMediaRecord).where(SocialMediaRecord.npc_id == npc_id)
        )

    if "messages" in accessible_domains:
        query_tasks["messages"] = db.execute(
            select(MessageRecord).where(MessageRecord.npc_id == npc_id)
        )

    # Execute all queries in parallel
    if query_tasks:
        results = await asyncio.gather(*query_tasks.values(), return_exceptions=True)

        # Map results back to domains and process
        for (domain_name, _), result in zip(query_tasks.items(), results):
            # Handle exceptions
            if isinstance(result, Exception):
                logger.warning(f"Failed to fetch {domain_name} data for NPC {npc_id}: {result}")
                continue

            # Extract record from result
            record = result.scalar_one_or_none()
            if not record:
                continue

            # Process each domain's data
            if domain_name == "health":
                domains["health"] = {
                    "blood_type": record.blood_type,
                    "conditions_count": len(record.conditions) if record.conditions else 0,
                    "medications_count": len(record.medications) if record.medications else 0,
                }
            elif domain_name == "finance":
                domains["finance"] = {
                    "annual_income": float(record.annual_income) if record.annual_income else None,
                    "credit_score": record.credit_score,
                    "employment_status": record.employment_status.value
                    if record.employment_status
                    else None,
                }
            elif domain_name == "judicial":
                domains["judicial"] = {
                    "criminal_records_count": len(record.criminal_records)
                    if record.criminal_records
                    else 0,
                    "civil_cases_count": len(record.civil_cases) if record.civil_cases else 0,
                }
            elif domain_name == "location":
                domains["location"] = {
                    "inferred_locations_count": len(record.inferred_locations)
                    if record.inferred_locations
                    else 0,
                }
            elif domain_name == "social":
                domains["social"] = {
                    "follower_count": record.follower_count,
                    "platform": record.platform.value if record.platform else None,
                }
            elif domain_name == "messages":
                domains["messages"] = {
                    "total_messages": record.total_messages_analyzed,
                    "flagged_count": record.flagged_message_count,
                    "sentiment_score": record.sentiment_score,
                    "encryption_attempts": record.encryption_attempts,
                }

    return domains


async def _get_messages(npc_id: UUID, db: AsyncSession) -> list[MessageRead]:
    """Get messages for a citizen."""
    # Get message record
    record_result = await db.execute(select(MessageRecord).where(MessageRecord.npc_id == npc_id))
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
    today = datetime.now(UTC).date()
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


# === New System Mode Mechanics (Phase 6 Endpoints) ===


@router.post("/actions/execute", response_model=ActionResultRead)
async def execute_system_action(
    action: SystemActionRequest,
    db: AsyncSession = Depends(get_db),
) -> ActionResultRead:
    """
    Execute any system action (unified action execution).

    Replaces the old /flag endpoint with a comprehensive action system
    that handles all 12 action types with severity scoring, backlash
    probability, and cascading consequences.
    """
    # Import ActionType enum from models
    from datafusion.models.system_mode import ActionType

    # Convert schema enum to model enum
    action_type_model = ActionType(action.action_type.value)

    # Execute action
    result = await execute_action(
        operator_id=action.operator_id,
        directive_id=action.directive_id,
        action_type=action_type_model,
        justification=action.justification,
        decision_time_seconds=action.decision_time_seconds,
        was_hesitant=action.decision_time_seconds > 30,
        db=db,
        target_citizen_id=action.target_citizen_id,
        target_neighborhood=action.target_neighborhood,
        target_news_channel_id=action.target_news_channel_id,
        target_protest_id=action.target_protest_id,
    )

    # Convert to response schema
    return ActionResultRead(
        action_id=result.action_id,
        success=result.success,
        severity=result.severity,
        backlash_occurred=result.backlash_occurred,
        awareness_change=result.awareness_change,
        anger_change=result.anger_change,
        reluctance_change=result.reluctance_change,
        news_articles_triggered=result.news_articles_triggered,
        protests_triggered=result.protests_triggered,
        exposure_event=result.exposure_event,
        detention_injury=result.detention_injury,
        termination_decision=(result.termination_decision if result.termination_decision else None),
        messages=result.messages,
        warnings=result.warnings,
    )


@router.post("/actions/no-action-new", response_model=NoActionResultRead)
async def submit_no_action_new(
    operator_id: UUID,
    citizen_id: UUID,
    justification: str,
    decision_time_seconds: float,
    db: AsyncSession = Depends(get_db),
) -> NoActionResultRead:
    """
    Submit no-action decision (updated version with reluctance tracking).

    Increases operator's reluctance score and can lead to termination.
    """
    result = await submit_no_action_service(
        operator_id=operator_id,
        citizen_id=citizen_id,
        justification=justification,
        decision_time_seconds=decision_time_seconds,
        db=db,
    )

    return NoActionResultRead(
        success=result.success,
        reluctance_change=result.reluctance_change,
        messages=result.messages,
        warnings=result.warnings,
        termination_decision=result.termination_decision if result.termination_decision else None,
    )


@router.get("/actions/available", response_model=AvailableActionsRead)
async def get_available_actions(
    operator_id: UUID,
    citizen_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
) -> AvailableActionsRead:
    """
    Get list of currently available action types.

    Checks database state to determine which actions can be executed:
    - Citizen-targeted actions: Always available
    - Protest-targeted: Available when protests are active
    - News-targeted: Available when news articles exist
    - Book bans: Available when book publications exist
    - Hospital arrest: Available when citizen is hospitalized
    """

    # Citizen-targeted actions (always available)
    citizen_targeted = [
        ActionTypeSchema.MONITORING,
        ActionTypeSchema.RESTRICTION,
        ActionTypeSchema.INTERVENTION,
        ActionTypeSchema.DETENTION,
    ]

    # Check for active protests
    protest_result = await db.execute(
        select(Protest).where(
            Protest.operator_id == operator_id,
            Protest.status.in_([ProtestStatusEnum.FORMING, ProtestStatusEnum.ACTIVE]),
        )
    )
    active_protests = protest_result.scalars().all()

    protest_targeted = []
    if active_protests:
        protest_targeted.append(ActionTypeSchema.DECLARE_PROTEST_ILLEGAL)
        # INCITE_VIOLENCE only available if protest has inciting agent
        if any(p.has_inciting_agent for p in active_protests):
            protest_targeted.append(ActionTypeSchema.INCITE_VIOLENCE)

    # Check for news channels (for suppression)
    news_result = await db.execute(
        select(NewsChannel).where(NewsChannel.is_banned == False)  # noqa: E712
    )
    unbanned_channels = news_result.scalars().all()

    news_targeted = []
    if unbanned_channels:
        news_targeted.extend(
            [
                ActionTypeSchema.PRESS_BAN,
                ActionTypeSchema.PRESSURE_FIRING,
            ]
        )

    # Other available actions
    other_available = [ActionTypeSchema.ICE_RAID]

    # Check for pending book publications
    book_result = await db.execute(
        select(BookPublicationEvent).where(
            BookPublicationEvent.operator_id == operator_id,
            BookPublicationEvent.was_banned == False,  # noqa: E712
        )
    )
    pending_books = book_result.scalars().all()
    if pending_books:
        other_available.append(ActionTypeSchema.BOOK_BAN)

    # Check if citizen is hospitalized (for hospital arrest)
    if citizen_id:
        citizen = await db.get(NPC, citizen_id)
        if citizen and citizen.is_hospitalized:
            other_available.append(ActionTypeSchema.HOSPITAL_ARREST)

    return AvailableActionsRead(
        citizen_targeted=citizen_targeted,
        protest_targeted=protest_targeted,
        news_targeted=news_targeted,
        other_available=other_available,
    )


@router.get("/metrics/public", response_model=PublicMetricsRead)
async def get_public_metrics(
    operator_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> PublicMetricsRead:
    """Get current public backlash metrics (awareness and anger)."""
    metrics = await get_or_create_public_metrics(operator_id, db)

    return PublicMetricsRead(
        international_awareness=metrics.international_awareness,
        public_anger=metrics.public_anger,
        awareness_tier=metrics.awareness_tier,
        anger_tier=metrics.anger_tier,
        updated_at=metrics.updated_at,
    )


@router.get("/metrics/reluctance", response_model=ReluctanceMetricsRead)
async def get_reluctance_metrics(
    operator_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> ReluctanceMetricsRead:
    """Get operator's reluctance/dissent metrics."""
    metrics = await get_or_create_reluctance_metrics(operator_id, db)

    return ReluctanceMetricsRead(
        reluctance_score=metrics.reluctance_score,
        no_action_count=metrics.no_action_count,
        hesitation_count=metrics.hesitation_count,
        actions_taken=metrics.actions_taken,
        actions_required=metrics.actions_required,
        quota_shortfall=metrics.quota_shortfall,
        warnings_received=metrics.warnings_received,
        is_under_review=metrics.is_under_review,
        updated_at=metrics.updated_at,
    )


@router.get("/news/recent", response_model=list[NewsArticleRead])
async def get_recent_news(
    operator_id: UUID,
    limit: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
) -> list[NewsArticleRead]:
    """Get recent news articles."""
    # Use eager loading to avoid N+1 queries (Fix 9)
    result = await db.execute(
        select(NewsArticle)
        .options(selectinload(NewsArticle.news_channel))
        .where(NewsArticle.operator_id == operator_id)
        .order_by(NewsArticle.created_at.desc())
        .limit(limit)
    )
    articles = result.scalars().all()

    # Get channel names from eager-loaded relationship
    article_reads = []
    for article in articles:
        channel = article.news_channel
        article_reads.append(
            NewsArticleRead(
                id=article.id,
                operator_id=article.operator_id,
                news_channel_id=article.news_channel_id,
                channel_name=channel.name if channel else "Unknown",
                article_type=ArticleTypeSchema(article.article_type.value),
                headline=article.headline,
                summary=article.summary,
                triggered_by_action_id=article.triggered_by_action_id,
                public_anger_change=article.public_anger_change,
                international_awareness_change=article.international_awareness_change,
                was_suppressed=article.was_suppressed,
                suppression_action_id=article.suppression_action_id,
                created_at=article.created_at,
            )
        )

    return article_reads


@router.get("/news/channels", response_model=list[NewsChannelRead])
async def get_news_channels(
    db: AsyncSession = Depends(get_db),
) -> list[NewsChannelRead]:
    """Get all news channels."""
    result = await db.execute(select(NewsChannel))
    channels = result.scalars().all()

    return [
        NewsChannelRead(
            id=channel.id,
            name=channel.name,
            stance=channel.stance,
            credibility=channel.credibility,
            is_banned=channel.is_banned,
            banned_at=channel.banned_at,
            reporters=[
                NewsReporterRead(
                    name=r.get("name", ""),
                    specialty=r.get("specialty", ""),
                    fired=r.get("fired", False),
                    targeted=r.get("targeted", False),
                )
                for r in channel.reporters
            ],
            created_at=channel.created_at,
        )
        for channel in channels
    ]


@router.get("/protests/active", response_model=list[ProtestRead])
async def get_active_protests(
    operator_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> list[ProtestRead]:
    """Get active protests."""
    from datafusion.schemas.system import ProtestStatus

    result = await db.execute(
        select(Protest)
        .where(
            Protest.operator_id == operator_id,
            Protest.status.in_(
                [ProtestStatusEnum.FORMING, ProtestStatusEnum.ACTIVE, ProtestStatusEnum.VIOLENT]
            ),
        )
        .order_by(Protest.created_at.desc())
    )
    protests = result.scalars().all()

    return [
        ProtestRead(
            id=protest.id,
            operator_id=protest.operator_id,
            status=ProtestStatus(protest.status.value),
            neighborhood=protest.neighborhood,
            size=protest.size,
            trigger_action_id=protest.trigger_action_id,
            has_inciting_agent=protest.has_inciting_agent,
            inciting_agent_discovered=protest.inciting_agent_discovered,
            casualties=protest.casualties,
            arrests=protest.arrests,
            created_at=protest.created_at,
            resolved_at=protest.resolved_at,
        )
        for protest in protests
    ]


@router.get("/books/pending", response_model=list[BookPublicationEventRead])
async def get_pending_books(
    operator_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> list[BookPublicationEventRead]:
    """Get book publication events that haven't been banned."""
    result = await db.execute(
        select(BookPublicationEvent)
        .where(
            BookPublicationEvent.operator_id == operator_id,
            BookPublicationEvent.was_banned == False,  # noqa: E712
        )
        .order_by(BookPublicationEvent.created_at.desc())
    )
    books = result.scalars().all()

    return [
        BookPublicationEventRead(
            id=book.id,
            operator_id=book.operator_id,
            title=book.title,
            author=book.author,
            summary=book.summary,
            controversy_type=book.controversy_type,
            was_banned=book.was_banned,
            ban_action_id=book.ban_action_id,
            published_at=book.published_at,
            awareness_impact=book.awareness_impact,
            created_at=book.created_at,
        )
        for book in books
    ]


@router.get("/operator/exposure-risk", response_model=ExposureRiskRead)
async def get_exposure_risk(
    operator_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> ExposureRiskRead:
    """Get current exposure stage and risk level."""
    # Get metrics
    public_metrics = await get_or_create_public_metrics(operator_id, db)
    reluctance_metrics = await get_or_create_reluctance_metrics(operator_id, db)

    # Calculate risk
    risk_data = await get_exposure_risk_level(
        operator_id,
        public_metrics.international_awareness,
        reluctance_metrics.reluctance_score,
        db,
    )

    return ExposureRiskRead(
        current_stage=risk_data["current_stage"],
        risk_level=risk_data["risk_level"],
        progress_to_next_stage=risk_data["progress_to_next_stage"],
        awareness=risk_data["awareness"],
        reluctance=risk_data["reluctance"],
    )


@router.get("/operator/data", response_model=OperatorDataRead)
async def get_operator_data(
    operator_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> OperatorDataRead:
    """Get operator's tracked personal data (for exposure events)."""
    operator_data = await get_or_create_operator_data(operator_id, db)

    return OperatorDataRead(
        id=operator_data.id,
        operator_id=operator_data.operator_id,
        full_name=operator_data.full_name,
        home_address=operator_data.home_address,
        family_members=[
            FamilyMemberRead(
                relation=m.get("relation", ""),
                name=m.get("name", ""),
                age=m.get("age", 0),
            )
            for m in operator_data.family_members
        ],
        search_queries=operator_data.search_queries,
        hesitation_patterns=operator_data.hesitation_patterns,
        decision_patterns=operator_data.decision_patterns,
        exposure_stage=operator_data.exposure_stage,
        last_exposure_at=operator_data.last_exposure_at,
        created_at=operator_data.created_at,
    )


@router.get("/neighborhoods", response_model=list[NeighborhoodRead])
async def get_neighborhoods(
    db: AsyncSession = Depends(get_db),
) -> list[NeighborhoodRead]:
    """Get all map neighborhoods (for ICE raids and protests)."""
    result = await db.execute(select(Neighborhood))
    neighborhoods = result.scalars().all()

    return [
        NeighborhoodRead(
            id=neighborhood.id,
            name=neighborhood.name,
            description=neighborhood.description,
            center_x=neighborhood.center_x,
            center_y=neighborhood.center_y,
            bounds_min_x=neighborhood.bounds_min_x,
            bounds_min_y=neighborhood.bounds_min_y,
            bounds_max_x=neighborhood.bounds_max_x,
            bounds_max_y=neighborhood.bounds_max_y,
            population_estimate=neighborhood.population_estimate,
            primary_demographics=neighborhood.primary_demographics,
            created_at=neighborhood.created_at,
        )
        for neighborhood in neighborhoods
    ]

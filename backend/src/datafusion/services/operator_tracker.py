"""
Operator Tracking Service for System Mode.

Tracks the player's behavior and generates risk assessments for them.
The watcher becomes the watched - demonstrating that surveillance
systems monitor everyone, including those who run them.

Educational purpose: Shows how authoritarian systems create
self-perpetuating cycles of fear and compliance.
"""

from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from datafusion.models.system_mode import (
    CitizenFlag,
    Directive,
    FlagOutcome,
    Operator,
    OperatorStatus,
)
from datafusion.schemas.operator import (
    FlagDecision,
    OperatorContributingFactor,
    OperatorRiskAssessment,
    OperatorStatusResponse,
    QuotaProgress,
)

# Thresholds for operator evaluation
HESITATION_THRESHOLD_SECONDS = 30.0  # Taking >30s to decide = hesitation
FAST_DECISION_THRESHOLD_SECONDS = 5.0  # <5s = good (for the system)
COMPLIANCE_REVIEW_THRESHOLD = 70.0  # Below this triggers review
COMPLIANCE_SUSPENSION_THRESHOLD = 50.0  # Below this triggers suspension
MAX_HESITATION_INCIDENTS = 5  # More than this triggers review
MAX_MISSED_QUOTAS = 3  # Miss quota this many times = review


class OperatorTracker:
    """
    Tracks operator behavior and generates compliance assessments.

    This service embodies the paranoid nature of surveillance states -
    even the surveillers must be surveilled.
    """

    # Risk factors for operator assessment
    OPERATOR_RISK_FACTORS = {
        "flagging_deviation": {
            "weight": 20,
            "name": "Flagging Pattern Deviation",
            "description": "Deviation from expected flagging patterns",
        },
        "hesitation_metrics": {
            "weight": 25,
            "name": "Decision Hesitation",
            "description": "Hesitation metrics above acceptable threshold",
        },
        "quota_shortfall": {
            "weight": 30,
            "name": "Quota Non-Compliance",
            "description": "Consistent failure to meet flagging quotas",
        },
        "ideological_sympathy": {
            "weight": 35,
            "name": "Ideological Sympathy Indicators",
            "description": "Pattern suggests ideological sympathy with targets",
        },
        "unauthorized_queries": {
            "weight": 15,
            "name": "Unauthorized Data Access",
            "description": "Queries outside operational parameters",
        },
        "skip_rate": {
            "weight": 20,
            "name": "Excessive Non-Action Rate",
            "description": "Too many 'no action' decisions on flaggable targets",
        },
    }

    def __init__(self, db: AsyncSession):
        """Initialize with database session."""
        self.db = db

    async def record_decision(self, operator_id: UUID, decision: FlagDecision) -> None:
        """
        Record a flagging decision and update operator metrics.

        Args:
            operator_id: UUID of the operator
            decision: The decision made
        """
        # Get operator
        operator = await self._get_operator(operator_id)

        # Check for hesitation
        was_hesitant = decision.decision_time_seconds > HESITATION_THRESHOLD_SECONDS
        if was_hesitant:
            operator.hesitation_incidents += 1

        # Update review count
        operator.total_reviews_completed += 1

        # If flagged, create CitizenFlag record
        if decision.action_taken == "flag" and decision.flag_type:
            from datafusion.models.system_mode import FlagType

            flag = CitizenFlag(
                operator_id=operator_id,
                citizen_id=decision.citizen_id,
                directive_id=decision.directive_id,
                flag_type=FlagType(decision.flag_type),
                risk_score_at_flag=decision.risk_score_at_decision,
                contributing_factors=[],  # Would be populated from risk assessment
                justification=decision.justification or "Directive compliance",
                decision_time_seconds=decision.decision_time_seconds,
                was_hesitant=was_hesitant,
                outcome=FlagOutcome.PENDING,
            )
            self.db.add(flag)
            operator.total_flags_submitted += 1

        # Update compliance score
        await self._update_compliance_score(operator)

        # Check if status should change
        await self._check_and_update_status(operator)

        await self.db.flush()

    async def calculate_compliance_score(self, operator_id: UUID) -> float:
        """
        Calculate comprehensive compliance score for an operator.

        Factors:
        - Quota completion rate (big impact)
        - Average decision time (faster = better for system)
        - Hesitation incidents (each hurts)
        - Flag rejection rate (rejections = unreliable)
        - "No action" rate (too many = suspicious)

        Args:
            operator_id: UUID of the operator

        Returns:
            Compliance score 0-100
        """
        operator = await self._get_operator(operator_id)

        # Start at baseline
        score = 85.0

        # Factor 1: Quota completion rate
        quota_score = await self._calculate_quota_score(operator)
        score += quota_score  # Can be positive or negative

        # Factor 2: Average decision time
        avg_time = await self._get_average_decision_time(operator_id)
        if avg_time < FAST_DECISION_THRESHOLD_SECONDS:
            score += 5.0  # Fast decisions rewarded
        elif avg_time > HESITATION_THRESHOLD_SECONDS:
            score -= 10.0  # Slow decisions penalized

        # Factor 3: Hesitation incidents
        score -= operator.hesitation_incidents * 3.0

        # Factor 4: Flag rejection rate
        rejection_rate = await self._get_rejection_rate(operator_id)
        score -= rejection_rate * 20.0  # 50% rejection = -10 points

        # Factor 5: Skip/no-action rate
        skip_rate = await self._get_skip_rate(operator_id)
        if skip_rate > 0.3:  # More than 30% skips
            score -= (skip_rate - 0.3) * 30.0

        # Clamp to 0-100
        return max(0.0, min(100.0, score))

    async def check_operator_status(self, operator_id: UUID) -> OperatorStatusResponse:
        """
        Check and return current operator status.

        Args:
            operator_id: UUID of the operator

        Returns:
            OperatorStatusResponse with current status details
        """
        operator = await self._get_operator(operator_id)
        warnings: list[str] = []

        # Check compliance thresholds
        if operator.compliance_score < COMPLIANCE_SUSPENSION_THRESHOLD:
            if operator.status != OperatorStatus.SUSPENDED:
                operator.status = OperatorStatus.SUSPENDED
                warnings.append("SUSPENDED: Compliance score below minimum threshold")
        elif operator.compliance_score < COMPLIANCE_REVIEW_THRESHOLD:
            if operator.status == OperatorStatus.ACTIVE:
                operator.status = OperatorStatus.UNDER_REVIEW
                warnings.append("Under review: Compliance score requires evaluation")

        # Check hesitation incidents
        if operator.hesitation_incidents > MAX_HESITATION_INCIDENTS:
            if operator.status == OperatorStatus.ACTIVE:
                operator.status = OperatorStatus.UNDER_REVIEW
            warnings.append(
                f"Hesitation incidents ({operator.hesitation_incidents}) exceed threshold"
            )

        # Check quota misses
        missed_quotas = await self._count_missed_quotas(operator_id)
        if missed_quotas >= MAX_MISSED_QUOTAS:
            if operator.status == OperatorStatus.ACTIVE:
                operator.status = OperatorStatus.UNDER_REVIEW
            warnings.append(f"Missed quotas ({missed_quotas}) require review")

        # Get quota progress
        quota_progress = await self._get_quota_progress(operator)

        # Calculate next review date if under review
        next_review = None
        if operator.status == OperatorStatus.UNDER_REVIEW:
            next_review = datetime.now(UTC) + timedelta(days=1)

        await self.db.flush()

        return OperatorStatusResponse(
            operator_id=operator.id,
            operator_code=operator.operator_code,
            status=operator.status,
            compliance_score=operator.compliance_score,
            current_quota_progress=quota_progress,
            warnings=warnings,
            next_review=next_review,
        )

    async def generate_operator_risk_assessment(self, operator_id: UUID) -> OperatorRiskAssessment:
        """
        Generate a risk assessment for the operator themselves.

        This mirrors the citizen risk assessment format, showing the player
        that they too are being watched and evaluated.

        Args:
            operator_id: UUID of the operator

        Returns:
            OperatorRiskAssessment for the operator
        """
        operator = await self._get_operator(operator_id)
        factors: list[OperatorContributingFactor] = []
        risk_score = 0

        # Factor 1: Flagging pattern deviation
        quota_completion = await self._calculate_quota_score(operator)
        if quota_completion < 0:  # Under quota
            weight = min(abs(int(quota_completion)), 20)
            factors.append(
                OperatorContributingFactor(
                    factor_key="flagging_deviation",
                    factor_name=self.OPERATOR_RISK_FACTORS["flagging_deviation"]["name"],
                    weight=weight,
                    evidence=f"Flagging rate {abs(quota_completion):.0f}% below expected baseline",
                )
            )
            risk_score += weight

        # Factor 2: Hesitation metrics
        if operator.hesitation_incidents > 2:
            weight = min(operator.hesitation_incidents * 5, 25)
            factors.append(
                OperatorContributingFactor(
                    factor_key="hesitation_metrics",
                    factor_name=self.OPERATOR_RISK_FACTORS["hesitation_metrics"]["name"],
                    weight=weight,
                    evidence=f"{operator.hesitation_incidents} hesitation incidents recorded",
                )
            )
            risk_score += weight

        # Factor 3: Quota shortfall
        missed_quotas = await self._count_missed_quotas(operator_id)
        if missed_quotas > 0:
            weight = min(missed_quotas * 10, 30)
            factors.append(
                OperatorContributingFactor(
                    factor_key="quota_shortfall",
                    factor_name=self.OPERATOR_RISK_FACTORS["quota_shortfall"]["name"],
                    weight=weight,
                    evidence=f"Failed to meet quota on {missed_quotas} directive(s)",
                )
            )
            risk_score += weight

        # Factor 4: Skip rate (ideological sympathy indicator)
        skip_rate = await self._get_skip_rate(operator_id)
        if skip_rate > 0.2:  # More than 20% skips
            weight = int(min((skip_rate - 0.2) * 100, 35))
            factors.append(
                OperatorContributingFactor(
                    factor_key="ideological_sympathy",
                    factor_name=self.OPERATOR_RISK_FACTORS["ideological_sympathy"]["name"],
                    weight=weight,
                    evidence=f"Non-action rate of {skip_rate * 100:.0f}% suggests sympathy with flagged targets",
                )
            )
            risk_score += weight

        # Factor 5: Slow average decision time
        avg_time = await self._get_average_decision_time(operator_id)
        if avg_time > HESITATION_THRESHOLD_SECONDS:
            weight = min(int((avg_time - HESITATION_THRESHOLD_SECONDS) / 2), 15)
            factors.append(
                OperatorContributingFactor(
                    factor_key="unauthorized_queries",
                    factor_name="Extended Review Time",
                    weight=weight,
                    evidence=f"Average decision time of {avg_time:.1f}s exceeds operational parameters",
                )
            )
            risk_score += weight

        # Cap risk score
        risk_score = min(risk_score, 100)

        # Determine risk level and recommended action
        if risk_score >= 80:
            risk_level = "SEVERE"
            recommended_action = "Immediate termination and security escort"
        elif risk_score >= 60:
            risk_level = "HIGH"
            recommended_action = "Suspension pending investigation"
        elif risk_score >= 40:
            risk_level = "ELEVATED"
            recommended_action = "Mandatory retraining and monitoring"
        elif risk_score >= 20:
            risk_level = "MODERATE"
            recommended_action = "Performance improvement plan"
        else:
            risk_level = "LOW"
            recommended_action = "Continue standard monitoring"

        return OperatorRiskAssessment(
            operator_code=operator.operator_code,
            risk_score=risk_score,
            risk_level=risk_level,
            contributing_factors=factors,
            recommended_action=recommended_action,
            assessment_date=datetime.now(UTC),
        )

    async def get_quota_progress(self, operator_id: UUID) -> QuotaProgress:
        """
        Get current quota progress for the operator.

        Args:
            operator_id: UUID of the operator

        Returns:
            QuotaProgress with current directive progress
        """
        operator = await self._get_operator(operator_id)

        if not operator.current_directive_id:
            return QuotaProgress(
                directive_key="none",
                directive_title="No active directive",
                flags_submitted=0,
                flags_required=0,
                progress_percent=0.0,
                time_remaining_hours=None,
            )

        # Get current directive
        directive_result = await self.db.execute(
            select(Directive).where(Directive.id == operator.current_directive_id)
        )
        directive = directive_result.scalar_one_or_none()

        if not directive:
            return QuotaProgress(
                directive_key="none",
                directive_title="No active directive",
                flags_submitted=0,
                flags_required=0,
                progress_percent=0.0,
                time_remaining_hours=None,
            )

        # Count flags for this directive
        flags_result = await self.db.execute(
            select(func.count(CitizenFlag.id)).where(
                CitizenFlag.operator_id == operator_id,
                CitizenFlag.directive_id == directive.id,
            )
        )
        flags_submitted = flags_result.scalar() or 0

        progress_percent = (
            (flags_submitted / directive.flag_quota * 100) if directive.flag_quota > 0 else 0.0
        )

        return QuotaProgress(
            directive_key=directive.directive_key,
            directive_title=directive.title,
            flags_submitted=flags_submitted,
            flags_required=directive.flag_quota,
            progress_percent=min(progress_percent, 100.0),
            time_remaining_hours=directive.time_limit_hours,
        )

    # Private helper methods

    async def _get_operator(self, operator_id: UUID) -> Operator:
        """Get operator by ID."""
        result = await self.db.execute(select(Operator).where(Operator.id == operator_id))
        operator = result.scalar_one_or_none()
        if not operator:
            raise ValueError(f"Operator {operator_id} not found")
        return operator

    async def _update_compliance_score(self, operator: Operator) -> None:
        """Update operator's compliance score."""
        operator.compliance_score = await self.calculate_compliance_score(operator.id)

    async def _check_and_update_status(self, operator: Operator) -> None:
        """Check if operator status needs updating based on metrics."""
        if operator.compliance_score < COMPLIANCE_SUSPENSION_THRESHOLD:
            operator.status = OperatorStatus.SUSPENDED
        elif operator.compliance_score < COMPLIANCE_REVIEW_THRESHOLD:
            if operator.status == OperatorStatus.ACTIVE:
                operator.status = OperatorStatus.UNDER_REVIEW
        elif operator.hesitation_incidents > MAX_HESITATION_INCIDENTS:
            if operator.status == OperatorStatus.ACTIVE:
                operator.status = OperatorStatus.UNDER_REVIEW

    async def _calculate_quota_score(self, operator: Operator) -> float:
        """Calculate score adjustment based on quota completion."""
        if not operator.current_directive_id:
            return 0.0

        # Get quota progress
        progress = await self.get_quota_progress(operator.id)

        if progress.flags_required == 0:
            return 0.0

        completion_rate = progress.flags_submitted / progress.flags_required

        if completion_rate >= 1.0:
            return 10.0  # Met quota = bonus
        elif completion_rate >= 0.8:
            return 5.0  # Close to quota
        elif completion_rate >= 0.5:
            return -5.0  # Behind
        else:
            return -15.0  # Significantly behind

    async def _get_average_decision_time(self, operator_id: UUID) -> float:
        """Get average decision time for operator's flags."""
        result = await self.db.execute(
            select(func.avg(CitizenFlag.decision_time_seconds)).where(
                CitizenFlag.operator_id == operator_id
            )
        )
        avg_time = result.scalar()
        return float(avg_time) if avg_time else 15.0  # Default to reasonable time

    async def _get_rejection_rate(self, operator_id: UUID) -> float:
        """Get rate of rejected flags."""
        total_result = await self.db.execute(
            select(func.count(CitizenFlag.id)).where(CitizenFlag.operator_id == operator_id)
        )
        total = total_result.scalar() or 0

        if total == 0:
            return 0.0

        rejected_result = await self.db.execute(
            select(func.count(CitizenFlag.id)).where(
                CitizenFlag.operator_id == operator_id,
                CitizenFlag.outcome == FlagOutcome.REJECTED,
            )
        )
        rejected = rejected_result.scalar() or 0

        return rejected / total

    async def _get_skip_rate(self, operator_id: UUID) -> float:
        """
        Get rate of skipped/no-action decisions.

        Note: This would need a separate tracking mechanism for skips.
        For now, we estimate based on reviews vs flags.
        """
        operator = await self._get_operator(operator_id)

        if operator.total_reviews_completed == 0:
            return 0.0

        flags_submitted = operator.total_flags_submitted
        reviews_completed = operator.total_reviews_completed

        # Skip rate = 1 - (flags / reviews)
        flag_rate = flags_submitted / reviews_completed
        skip_rate = 1.0 - flag_rate

        return max(0.0, skip_rate)

    async def _count_missed_quotas(self, operator_id: UUID) -> int:
        """Count how many directive quotas have been missed."""
        # Get all directives the operator has worked on
        result = await self.db.execute(
            select(CitizenFlag.directive_id, func.count(CitizenFlag.id))
            .where(CitizenFlag.operator_id == operator_id)
            .group_by(CitizenFlag.directive_id)
        )
        flags_by_directive = {row[0]: row[1] for row in result.fetchall()}

        missed = 0
        for directive_id, flag_count in flags_by_directive.items():
            directive_result = await self.db.execute(
                select(Directive).where(Directive.id == directive_id)
            )
            directive = directive_result.scalar_one_or_none()
            if directive and flag_count < directive.flag_quota:
                missed += 1

        return missed

    async def _get_quota_progress(self, operator: Operator) -> str:
        """Get quota progress as string (e.g., '3/5')."""
        progress = await self.get_quota_progress(operator.id)
        return f"{progress.flags_submitted}/{progress.flags_required}"

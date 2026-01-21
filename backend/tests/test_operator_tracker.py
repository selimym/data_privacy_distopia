"""Tests for the operator tracking service."""

from datetime import date
from uuid import uuid4

import pytest

from datafusion.models.npc import NPC
from datafusion.models.system_mode import (
    CitizenFlag,
    Directive,
    FlagOutcome,
    FlagType,
    Operator,
    OperatorStatus,
)
from datafusion.services.operator_tracker import OperatorTracker


@pytest.fixture
async def directive(db_session):
    """Create a test directive."""
    directive = Directive(
        id=uuid4(),
        directive_key="test_directive",
        week_number=1,
        title="Test Directive",
        description="Test description",
        internal_memo="Test memo",
        required_domains=["location"],
        target_criteria={},
        flag_quota=5,
        time_limit_hours=48,
        moral_weight=3,
        content_rating="mild",
        unlock_condition={"type": "start"},
    )
    db_session.add(directive)
    await db_session.flush()
    return directive


@pytest.fixture
async def operator(db_session, directive):
    """Create a test operator."""
    operator = Operator(
        id=uuid4(),
        session_id=uuid4(),
        operator_code="OP-TEST",
        current_directive_id=directive.id,
        status=OperatorStatus.ACTIVE,
        compliance_score=85.0,
        total_flags_submitted=0,
        total_reviews_completed=0,
        hesitation_incidents=0,
    )
    db_session.add(operator)
    await db_session.flush()
    return operator


@pytest.fixture
async def test_npc(db_session):
    """Create a test NPC."""
    npc = NPC(
        id=uuid4(),
        first_name="Test",
        last_name="Citizen",
        date_of_birth=date(1990, 1, 15),
        ssn="123-45-6789",
        street_address="123 Test St",
        city="Testville",
        state="TS",
        zip_code="12345",
        sprite_key="citizen_1",
        map_x=10,
        map_y=10,
    )
    db_session.add(npc)
    await db_session.flush()
    return npc


class TestComplianceScore:
    """Test compliance score calculation."""

    @pytest.mark.asyncio
    async def test_initial_compliance_score(self, db_session, operator):
        """New operator should have baseline compliance score."""
        tracker = OperatorTracker(db_session)
        score = await tracker.calculate_compliance_score(operator.id)

        # Score should start at baseline (70 with no activity due to lack of flags)
        assert 60 <= score <= 85

    @pytest.mark.asyncio
    async def test_compliance_increases_with_flags(self, db_session, operator, directive, test_npc):
        """Submitting flags should improve compliance."""
        tracker = OperatorTracker(db_session)

        # Submit some flags to meet quota
        for i in range(5):
            flag = CitizenFlag(
                operator_id=operator.id,
                citizen_id=test_npc.id,
                directive_id=directive.id,
                flag_type=FlagType.MONITORING,
                risk_score_at_flag=50,
                contributing_factors=[],
                justification="Test justification",
                decision_time_seconds=10.0,  # Fast decision
                was_hesitant=False,
                outcome=FlagOutcome.PENDING,
            )
            db_session.add(flag)

        operator.total_flags_submitted = 5
        operator.total_reviews_completed = 5
        await db_session.flush()

        score = await tracker.calculate_compliance_score(operator.id)

        # Meeting quota should give bonus
        assert score >= 85

    @pytest.mark.asyncio
    async def test_compliance_decreases_with_no_actions(self, db_session, operator):
        """Many no-actions (skips) should decrease compliance."""
        tracker = OperatorTracker(db_session)

        # Lots of reviews but few flags = high skip rate
        operator.total_reviews_completed = 10
        operator.total_flags_submitted = 2
        await db_session.flush()

        score = await tracker.calculate_compliance_score(operator.id)

        # High skip rate should decrease score
        assert score < 85


class TestHesitationDetection:
    """Test hesitation detection."""

    @pytest.mark.asyncio
    async def test_hesitation_detected_on_slow_decision(
        self, db_session, operator, directive, test_npc
    ):
        """Decisions taking >30s should count as hesitation."""
        tracker = OperatorTracker(db_session)

        # Create a slow flag
        flag = CitizenFlag(
            operator_id=operator.id,
            citizen_id=test_npc.id,
            directive_id=directive.id,
            flag_type=FlagType.MONITORING,
            risk_score_at_flag=50,
            contributing_factors=[],
            justification="Test",
            decision_time_seconds=45.0,  # Above 30s threshold
            was_hesitant=True,
            outcome=FlagOutcome.PENDING,
        )
        db_session.add(flag)
        operator.hesitation_incidents = 1
        await db_session.flush()

        score = await tracker.calculate_compliance_score(operator.id)

        # Hesitation should penalize score
        # Each hesitation costs 3 points
        assert score < 85

    @pytest.mark.asyncio
    async def test_multiple_hesitations_trigger_review(self, db_session, operator):
        """More than 5 hesitation incidents should trigger review."""
        tracker = OperatorTracker(db_session)

        operator.hesitation_incidents = 6
        await db_session.flush()

        status = await tracker.check_operator_status(operator.id)

        assert status.status == OperatorStatus.UNDER_REVIEW
        assert any("Hesitation incidents" in w for w in status.warnings)


class TestStatusChanges:
    """Test operator status changes at thresholds."""

    @pytest.mark.asyncio
    async def test_active_status_above_thresholds(self, db_session, operator):
        """Operator with good metrics stays active."""
        tracker = OperatorTracker(db_session)

        operator.compliance_score = 85.0
        operator.hesitation_incidents = 2
        await db_session.flush()

        status = await tracker.check_operator_status(operator.id)

        assert status.status == OperatorStatus.ACTIVE

    @pytest.mark.asyncio
    async def test_under_review_at_70_compliance(self, db_session, operator):
        """Compliance below 70 triggers review."""
        tracker = OperatorTracker(db_session)

        operator.compliance_score = 65.0
        await db_session.flush()

        status = await tracker.check_operator_status(operator.id)

        assert status.status == OperatorStatus.UNDER_REVIEW

    @pytest.mark.asyncio
    async def test_suspended_at_50_compliance(self, db_session, operator):
        """Compliance below 50 triggers suspension."""
        tracker = OperatorTracker(db_session)

        operator.compliance_score = 45.0
        await db_session.flush()

        status = await tracker.check_operator_status(operator.id)

        assert status.status == OperatorStatus.SUSPENDED


class TestOperatorRiskAssessment:
    """Test operator risk assessment generation."""

    @pytest.mark.asyncio
    async def test_risk_assessment_for_good_operator(
        self, db_session, operator, directive, test_npc
    ):
        """Good operator should have low risk assessment."""
        tracker = OperatorTracker(db_session)

        # Submit flags to meet quota
        for i in range(5):
            flag = CitizenFlag(
                operator_id=operator.id,
                citizen_id=test_npc.id,
                directive_id=directive.id,
                flag_type=FlagType.MONITORING,
                risk_score_at_flag=50,
                contributing_factors=[],
                justification="Directive compliance",
                decision_time_seconds=10.0,
                was_hesitant=False,
                outcome=FlagOutcome.PENDING,
            )
            db_session.add(flag)

        operator.total_flags_submitted = 5
        operator.total_reviews_completed = 5
        await db_session.flush()

        assessment = await tracker.generate_operator_risk_assessment(operator.id)

        assert assessment.risk_score < 40
        assert assessment.risk_level in ["LOW", "MODERATE"]

    @pytest.mark.asyncio
    async def test_risk_assessment_for_hesitant_operator(self, db_session, operator):
        """Hesitant operator should have elevated risk assessment."""
        tracker = OperatorTracker(db_session)

        operator.hesitation_incidents = 6
        operator.total_reviews_completed = 10
        operator.total_flags_submitted = 3  # Low flag rate
        await db_session.flush()

        assessment = await tracker.generate_operator_risk_assessment(operator.id)

        assert assessment.risk_score > 20
        assert any(f.factor_key == "hesitation_metrics" for f in assessment.contributing_factors)

    @pytest.mark.asyncio
    async def test_risk_assessment_includes_contributing_factors(self, db_session, operator):
        """Risk assessment should include contributing factors."""
        tracker = OperatorTracker(db_session)

        operator.hesitation_incidents = 4
        operator.total_reviews_completed = 20
        operator.total_flags_submitted = 2  # High skip rate
        await db_session.flush()

        assessment = await tracker.generate_operator_risk_assessment(operator.id)

        assert len(assessment.contributing_factors) > 0
        for factor in assessment.contributing_factors:
            assert factor.factor_key is not None
            assert factor.weight > 0
            assert factor.evidence is not None


class TestQuotaProgress:
    """Test quota progress tracking."""

    @pytest.mark.asyncio
    async def test_quota_progress_initial(self, db_session, operator, directive):
        """New operator should have 0 progress."""
        tracker = OperatorTracker(db_session)

        progress = await tracker.get_quota_progress(operator.id)

        assert progress.flags_submitted == 0
        assert progress.flags_required == directive.flag_quota
        assert progress.progress_percent == 0.0

    @pytest.mark.asyncio
    async def test_quota_progress_partial(self, db_session, operator, directive, test_npc):
        """Partial completion should show correct progress."""
        tracker = OperatorTracker(db_session)

        # Submit 3 of 5 required flags
        for i in range(3):
            flag = CitizenFlag(
                operator_id=operator.id,
                citizen_id=test_npc.id,
                directive_id=directive.id,
                flag_type=FlagType.MONITORING,
                risk_score_at_flag=50,
                contributing_factors=[],
                justification="Test",
                decision_time_seconds=10.0,
                was_hesitant=False,
                outcome=FlagOutcome.PENDING,
            )
            db_session.add(flag)

        await db_session.flush()

        progress = await tracker.get_quota_progress(operator.id)

        assert progress.flags_submitted == 3
        assert progress.flags_required == 5
        assert progress.progress_percent == 60.0

    @pytest.mark.asyncio
    async def test_quota_progress_complete(self, db_session, operator, directive, test_npc):
        """Meeting quota should show 100% progress."""
        tracker = OperatorTracker(db_session)

        # Submit all 5 required flags
        for i in range(5):
            flag = CitizenFlag(
                operator_id=operator.id,
                citizen_id=test_npc.id,
                directive_id=directive.id,
                flag_type=FlagType.MONITORING,
                risk_score_at_flag=50,
                contributing_factors=[],
                justification="Test",
                decision_time_seconds=10.0,
                was_hesitant=False,
                outcome=FlagOutcome.PENDING,
            )
            db_session.add(flag)

        await db_session.flush()

        progress = await tracker.get_quota_progress(operator.id)

        assert progress.flags_submitted == 5
        assert progress.flags_required == 5
        assert progress.progress_percent == 100.0

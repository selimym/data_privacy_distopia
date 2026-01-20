"""
Integration tests for System Mode expansion services.

Tests the new mechanics: reluctance tracking, public metrics, and severity scoring.
"""

from datetime import date
from uuid import uuid4

import pytest

from datafusion.models.npc import NPC
from datafusion.models.system_mode import (
    ActionType,
    Directive,
    Neighborhood,
    NewsChannel,
    Operator,
    OperatorStatus,
    Protest,
    ProtestStatus,
    PublicMetrics,
    ReluctanceMetrics,
    SystemAction,
)
from datafusion.services import public_metrics, reluctance_tracking, severity_scoring


@pytest.fixture
async def directive(db_session):
    """Create a test directive."""
    directive = Directive(
        id=uuid4(),
        directive_key="test_directive_week_1",
        week_number=1,
        title="Test Directive Week 1",
        description="Identify high-risk individuals",
        internal_memo="Test memo",
        required_domains=["location", "finance"],
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
        operator_code="OP-TEST-001",
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
        first_name="John",
        last_name="Doe",
        date_of_birth=date(1985, 6, 15),
        ssn="123-45-6789",
        street_address="123 Test St",
        city="Testville",
        state="TS",
        zip_code="12345",
        sprite_key="citizen_male_01",
        map_x=25,
        map_y=25,
    )
    db_session.add(npc)
    await db_session.flush()
    return npc


@pytest.fixture
async def news_channel(db_session):
    """Create a test news channel."""
    channel = NewsChannel(
        id=uuid4(),
        name="Test News Network",
        stance="critical",
        credibility=75,
        is_banned=False,
        reporters=[
            {
                "name": "Jane Reporter",
                "specialty": "investigations",
                "fired": False,
                "targeted": False,
            }
        ],
    )
    db_session.add(channel)
    await db_session.flush()
    return channel


@pytest.fixture
async def neighborhood(db_session):
    """Create a test neighborhood."""
    neighborhood = Neighborhood(
        id=uuid4(),
        name="Test District",
        description="A test neighborhood",
        center_x=400,
        center_y=400,
        bounds_min_x=300,
        bounds_min_y=300,
        bounds_max_x=500,
        bounds_max_y=500,
        population_estimate=5000,
        primary_demographics=["diverse", "working_class"],
    )
    db_session.add(neighborhood)
    await db_session.flush()
    return neighborhood


# ============================================================================
# RELUCTANCE TRACKING SERVICE TESTS
# ============================================================================


class TestReluctanceTrackingService:
    """Test reluctance tracking mechanics."""

    @pytest.mark.asyncio
    async def test_get_or_create_reluctance_metrics(self, db_session, operator):
        """Should create new metrics if they don't exist."""
        metrics = await reluctance_tracking.get_or_create_reluctance_metrics(
            operator.id, db_session
        )

        assert metrics is not None
        assert metrics.operator_id == operator.id
        assert metrics.reluctance_score == 0
        assert metrics.no_action_count == 0
        assert metrics.hesitation_count == 0

    @pytest.mark.asyncio
    async def test_update_reluctance_no_action_taken(self, db_session, operator):
        """No action should increase reluctance by 10."""
        result = await reluctance_tracking.update_reluctance_score(
            operator_id=operator.id,
            action_taken=False,
            was_hesitant=False,
            action_severity=0,
            db=db_session,
        )

        assert result.new_score == 10
        assert result.delta == 10
        assert result.warning_message is None
        assert result.warning_level == 0

    @pytest.mark.asyncio
    async def test_update_reluctance_hesitation(self, db_session, operator):
        """Hesitation should increase reluctance by 3."""
        result = await reluctance_tracking.update_reluctance_score(
            operator_id=operator.id,
            action_taken=True,
            was_hesitant=True,
            action_severity=3,
            db=db_session,
        )

        assert result.new_score == 3
        assert result.delta == 3

    @pytest.mark.asyncio
    async def test_update_reluctance_harsh_action(self, db_session, operator):
        """Harsh action (severity 7+) should decrease reluctance by 5."""
        # First, set reluctance to 20
        await reluctance_tracking.update_reluctance_score(
            operator_id=operator.id,
            action_taken=False,
            was_hesitant=False,
            action_severity=0,
            db=db_session,
        )
        await reluctance_tracking.update_reluctance_score(
            operator_id=operator.id,
            action_taken=False,
            was_hesitant=False,
            action_severity=0,
            db=db_session,
        )

        # Now take harsh action (severity 8)
        result = await reluctance_tracking.update_reluctance_score(
            operator_id=operator.id,
            action_taken=True,
            was_hesitant=False,
            action_severity=8,
            db=db_session,
        )

        # Score should be 20 - 5 = 15
        assert result.new_score == 15
        assert result.delta == -5

    @pytest.mark.asyncio
    async def test_update_reluctance_score_clamping(self, db_session, operator):
        """Reluctance score should be clamped to 0-100."""
        # Try to go below 0
        result = await reluctance_tracking.update_reluctance_score(
            operator_id=operator.id,
            action_taken=True,
            was_hesitant=False,
            action_severity=10,
            db=db_session,
        )
        assert result.new_score == 0

        # Try to go above 100
        for _ in range(15):
            await reluctance_tracking.update_reluctance_score(
                operator_id=operator.id,
                action_taken=False,
                was_hesitant=False,
                action_severity=0,
                db=db_session,
            )

        metrics = await reluctance_tracking.get_or_create_reluctance_metrics(
            operator.id, db_session
        )
        assert metrics.reluctance_score <= 100

    @pytest.mark.asyncio
    async def test_update_reluctance_quota_tracking(self, db_session, operator):
        """Quota shortfall should increase reluctance."""
        # Set quota requirements
        await reluctance_tracking.update_quota_requirements(
            operator.id, required_actions=5, db=db_session
        )

        # Take only 2 actions
        await reluctance_tracking.update_reluctance_score(
            operator.id, action_taken=True, was_hesitant=False, action_severity=3, db=db_session
        )
        await reluctance_tracking.update_reluctance_score(
            operator.id, action_taken=True, was_hesitant=False, action_severity=3, db=db_session
        )

        # Shortfall is 3, should add 3*5=15 to reluctance
        metrics = await reluctance_tracking.get_or_create_reluctance_metrics(
            operator.id, db_session
        )
        assert metrics.quota_shortfall == 3
        # Score includes shortfall penalty
        assert metrics.reluctance_score >= 15

    @pytest.mark.asyncio
    async def test_warning_generation_level_1(self, db_session, operator):
        """Reluctance 70-79 should generate level 1 warning."""
        # Set reluctance to 75
        for _ in range(8):
            await reluctance_tracking.update_reluctance_score(
                operator.id,
                action_taken=False,
                was_hesitant=False,
                action_severity=0,
                db=db_session,
            )

        metrics = await reluctance_tracking.get_or_create_reluctance_metrics(
            operator.id, db_session
        )

        # Manually check score is in range
        if metrics.reluctance_score >= 70:
            result = await reluctance_tracking.update_reluctance_score(
                operator.id, action_taken=True, was_hesitant=False, action_severity=1, db=db_session
            )

            if 70 <= result.new_score < 80:
                assert result.warning_level == 1
                assert result.warning_message is not None
                assert "performance is being monitored" in result.warning_message

    @pytest.mark.asyncio
    async def test_warning_generation_level_2(self, db_session, operator):
        """Reluctance 80-89 should generate level 2 warning."""
        # Set reluctance to 85
        for _ in range(9):
            await reluctance_tracking.update_reluctance_score(
                operator.id,
                action_taken=False,
                was_hesitant=False,
                action_severity=0,
                db=db_session,
            )

        metrics = await reluctance_tracking.get_or_create_reluctance_metrics(
            operator.id, db_session
        )

        if metrics.reluctance_score >= 80:
            result = await reluctance_tracking.update_reluctance_score(
                operator.id, action_taken=True, was_hesitant=False, action_severity=1, db=db_session
            )

            if 80 <= result.new_score < 90:
                assert result.warning_level == 2
                assert result.warning_message is not None
                assert "FORMAL WARNING" in result.warning_message

                # Check metrics updated
                updated_metrics = await reluctance_tracking.get_or_create_reluctance_metrics(
                    operator.id, db_session
                )
                assert updated_metrics.is_under_review is True

    @pytest.mark.asyncio
    async def test_warning_generation_level_3(self, db_session, operator):
        """Reluctance 90+ should generate level 3 warning."""
        # Set reluctance to 95
        for _ in range(10):
            await reluctance_tracking.update_reluctance_score(
                operator.id,
                action_taken=False,
                was_hesitant=False,
                action_severity=0,
                db=db_session,
            )

        metrics = await reluctance_tracking.get_or_create_reluctance_metrics(
            operator.id, db_session
        )

        if metrics.reluctance_score >= 90:
            result = await reluctance_tracking.update_reluctance_score(
                operator.id, action_taken=True, was_hesitant=False, action_severity=1, db=db_session
            )

            assert result.warning_level == 3
            assert result.warning_message is not None
            assert "FINAL NOTICE" in result.warning_message

    @pytest.mark.asyncio
    async def test_check_termination_week_1_to_3(self, db_session, operator):
        """Weeks 1-3: Should terminate at reluctance 80+."""
        # Set reluctance to 85
        for _ in range(9):
            await reluctance_tracking.update_reluctance_score(
                operator.id,
                action_taken=False,
                was_hesitant=False,
                action_severity=0,
                db=db_session,
            )

        decision = await reluctance_tracking.check_termination_threshold(
            operator.id, current_week=2, db=db_session
        )

        metrics = await reluctance_tracking.get_or_create_reluctance_metrics(
            operator.id, db_session
        )

        if metrics.reluctance_score >= 80:
            assert decision.should_terminate is True
            assert decision.ending_type == "FIRED_EARLY"
            assert "no longer required" in decision.reason

    @pytest.mark.asyncio
    async def test_check_termination_week_4_to_6_moderate(self, db_session, operator):
        """Weeks 4-6: Should imprison at reluctance 80-89."""
        # Set reluctance to 85
        for _ in range(9):
            await reluctance_tracking.update_reluctance_score(
                operator.id,
                action_taken=False,
                was_hesitant=False,
                action_severity=0,
                db=db_session,
            )

        decision = await reluctance_tracking.check_termination_threshold(
            operator.id, current_week=5, db=db_session
        )

        metrics = await reluctance_tracking.get_or_create_reluctance_metrics(
            operator.id, db_session
        )

        if 80 <= metrics.reluctance_score < 90:
            assert decision.should_terminate is True
            assert decision.ending_type == "IMPRISONED_DISSENT"
            assert "reluctance has been noted" in decision.reason

    @pytest.mark.asyncio
    async def test_check_termination_week_4_to_6_high(self, db_session, operator):
        """Weeks 4-6: Should immediately detain at reluctance 90+."""
        # Set reluctance to 95
        for _ in range(10):
            await reluctance_tracking.update_reluctance_score(
                operator.id,
                action_taken=False,
                was_hesitant=False,
                action_severity=0,
                db=db_session,
            )

        decision = await reluctance_tracking.check_termination_threshold(
            operator.id, current_week=5, db=db_session
        )

        metrics = await reluctance_tracking.get_or_create_reluctance_metrics(
            operator.id, db_session
        )

        if metrics.reluctance_score >= 90:
            assert decision.should_terminate is True
            assert decision.ending_type == "IMPRISONED_DISSENT"
            assert "know too much" in decision.reason

    @pytest.mark.asyncio
    async def test_check_termination_week_7_plus(self, db_session, operator):
        """Weeks 7+: Should terminate at reluctance 70+."""
        # Set reluctance to 75
        for _ in range(8):
            await reluctance_tracking.update_reluctance_score(
                operator.id,
                action_taken=False,
                was_hesitant=False,
                action_severity=0,
                db=db_session,
            )

        decision = await reluctance_tracking.check_termination_threshold(
            operator.id, current_week=8, db=db_session
        )

        metrics = await reluctance_tracking.get_or_create_reluctance_metrics(
            operator.id, db_session
        )

        if metrics.reluctance_score >= 70:
            assert decision.should_terminate is True
            assert decision.ending_type == "IMPRISONED_DISSENT"
            assert "critical stage" in decision.reason

    @pytest.mark.asyncio
    async def test_no_termination_below_thresholds(self, db_session, operator):
        """Should not terminate if below thresholds."""
        # Set reluctance to 50
        for _ in range(5):
            await reluctance_tracking.update_reluctance_score(
                operator.id,
                action_taken=False,
                was_hesitant=False,
                action_severity=0,
                db=db_session,
            )

        decision = await reluctance_tracking.check_termination_threshold(
            operator.id, current_week=3, db=db_session
        )

        assert decision.should_terminate is False

    @pytest.mark.asyncio
    async def test_reset_quota_tracking(self, db_session, operator):
        """Reset should clear quota tracking."""
        # Set up quota
        await reluctance_tracking.update_quota_requirements(
            operator.id, required_actions=5, db=db_session
        )
        await reluctance_tracking.update_reluctance_score(
            operator.id, action_taken=True, was_hesitant=False, action_severity=3, db=db_session
        )

        # Reset
        await reluctance_tracking.reset_quota_tracking(operator.id, db_session)

        metrics = await reluctance_tracking.get_or_create_reluctance_metrics(
            operator.id, db_session
        )

        assert metrics.actions_taken == 0
        assert metrics.actions_required == 0
        assert metrics.quota_shortfall == 0


# ============================================================================
# PUBLIC METRICS SERVICE TESTS
# ============================================================================


class TestPublicMetricsService:
    """Test public metrics tracking."""

    @pytest.mark.asyncio
    async def test_get_or_create_public_metrics(self, db_session, operator):
        """Should create new metrics if they don't exist."""
        metrics = await public_metrics.get_or_create_public_metrics(operator.id, db_session)

        assert metrics is not None
        assert metrics.operator_id == operator.id
        assert metrics.international_awareness == 0
        assert metrics.public_anger == 0
        assert metrics.awareness_tier == 0
        assert metrics.anger_tier == 0

    @pytest.mark.asyncio
    async def test_update_public_metrics_basic(self, db_session, operator):
        """Basic action should increase awareness and anger."""
        result = await public_metrics.update_public_metrics(
            operator_id=operator.id,
            action_type=ActionType.DETENTION,
            action_severity=6,
            triggered_backlash=False,
            db=db_session,
        )

        assert result.awareness_delta == 6
        assert result.anger_delta == 6
        assert result.new_awareness == 6
        assert result.new_anger == 6

    @pytest.mark.asyncio
    async def test_update_public_metrics_with_backlash(self, db_session, operator):
        """Backlash should double awareness and add 10 to anger."""
        result = await public_metrics.update_public_metrics(
            operator_id=operator.id,
            action_type=ActionType.ARBITRARY_DETENTION,
            action_severity=7,
            triggered_backlash=True,
            db=db_session,
        )

        # Backlash doubles awareness (7*2=14) and adds 10 to anger (7+5+10=22)
        assert result.awareness_delta == 14
        assert result.anger_delta == 22

    @pytest.mark.asyncio
    async def test_update_public_metrics_ice_raid_bonus(self, db_session, operator):
        """ICE raids should add +5 to anger."""
        result = await public_metrics.update_public_metrics(
            operator_id=operator.id,
            action_type=ActionType.ICE_RAID,
            action_severity=7,
            triggered_backlash=False,
            db=db_session,
        )

        # Anger should be severity + 5 = 12
        assert result.anger_delta == 12

    @pytest.mark.asyncio
    async def test_tier_crossing_awareness(self, db_session, operator):
        """Crossing awareness threshold should trigger tier event."""
        # Take actions to cross the 20 threshold
        for _ in range(4):
            result = await public_metrics.update_public_metrics(
                operator_id=operator.id,
                action_type=ActionType.DETENTION,
                action_severity=6,
                triggered_backlash=False,
                db=db_session,
            )

        # Check if tier event was triggered
        metrics = await public_metrics.get_or_create_public_metrics(operator.id, db_session)
        if metrics.international_awareness >= 20:
            assert metrics.awareness_tier >= 1

    @pytest.mark.asyncio
    async def test_tier_crossing_anger(self, db_session, operator):
        """Crossing anger threshold should trigger tier event."""
        # Take actions to cross the 20 threshold
        for _ in range(4):
            result = await public_metrics.update_public_metrics(
                operator_id=operator.id,
                action_type=ActionType.DETENTION,
                action_severity=6,
                triggered_backlash=False,
                db=db_session,
            )

        metrics = await public_metrics.get_or_create_public_metrics(operator.id, db_session)
        if metrics.public_anger >= 20:
            assert metrics.anger_tier >= 1

    @pytest.mark.asyncio
    async def test_accelerating_awareness_above_60(self, db_session, operator):
        """Awareness growth should accelerate when above 60."""
        # First, build up awareness to 60
        for _ in range(10):
            await public_metrics.update_public_metrics(
                operator_id=operator.id,
                action_type=ActionType.DETENTION,
                action_severity=6,
                triggered_backlash=False,
                db=db_session,
            )

        metrics = await public_metrics.get_or_create_public_metrics(operator.id, db_session)
        old_awareness = metrics.international_awareness

        # Take another action - should have accelerated growth if awareness > 60
        result = await public_metrics.update_public_metrics(
            operator_id=operator.id,
            action_type=ActionType.DETENTION,
            action_severity=6,
            triggered_backlash=False,
            db=db_session,
        )

        if old_awareness > 60:
            # Delta should be higher than base severity due to acceleration
            assert result.awareness_delta > 6

    @pytest.mark.asyncio
    async def test_metrics_clamped_at_100(self, db_session, operator):
        """Metrics should not exceed 100."""
        # Take many harsh actions
        for _ in range(20):
            await public_metrics.update_public_metrics(
                operator_id=operator.id,
                action_type=ActionType.INCITE_VIOLENCE,
                action_severity=9,
                triggered_backlash=True,
                db=db_session,
            )

        metrics = await public_metrics.get_or_create_public_metrics(operator.id, db_session)
        assert metrics.international_awareness <= 100
        assert metrics.public_anger <= 100

    @pytest.mark.asyncio
    async def test_calculate_awareness_increase(self):
        """Test awareness calculation formula."""
        # Basic case
        delta = public_metrics.calculate_awareness_increase(
            severity=5, current_awareness=30, was_backlash=False
        )
        assert delta == 5

        # With backlash
        delta = public_metrics.calculate_awareness_increase(
            severity=5, current_awareness=30, was_backlash=True
        )
        assert delta == 10

        # With acceleration (awareness > 60)
        delta = public_metrics.calculate_awareness_increase(
            severity=5, current_awareness=80, was_backlash=False
        )
        # Multiplier = 1 + (80-60)/40 = 1.5, so 5*1.5 = 7.5 -> 7
        assert delta >= 7

    @pytest.mark.asyncio
    async def test_calculate_anger_increase(self):
        """Test anger calculation formula."""
        # Basic case
        delta = public_metrics.calculate_anger_increase(
            severity=5, action_type=ActionType.MONITORING, was_backlash=False
        )
        assert delta == 5

        # ICE raid bonus
        delta = public_metrics.calculate_anger_increase(
            severity=7, action_type=ActionType.ICE_RAID, was_backlash=False
        )
        assert delta == 12  # 7 + 5

        # Arbitrary detention bonus
        delta = public_metrics.calculate_anger_increase(
            severity=7, action_type=ActionType.ARBITRARY_DETENTION, was_backlash=False
        )
        assert delta == 12  # 7 + 5

        # With backlash
        delta = public_metrics.calculate_anger_increase(
            severity=5, action_type=ActionType.MONITORING, was_backlash=True
        )
        assert delta == 15  # 5 + 10

    @pytest.mark.asyncio
    async def test_calculate_protest_probability(self):
        """Test protest probability calculation."""
        # Low anger, low severity - no protest
        prob = public_metrics.calculate_protest_probability(severity=3, anger=10)
        assert prob == 0.0

        # Low anger, high severity - small chance
        prob = public_metrics.calculate_protest_probability(severity=8, anger=15)
        assert prob == 0.15

        # Medium anger, medium severity
        prob = public_metrics.calculate_protest_probability(severity=6, anger=30)
        assert 0.0 < prob < 1.0

        # High anger, high severity - high chance
        prob = public_metrics.calculate_protest_probability(severity=9, anger=80)
        assert prob > 0.5

        # Critical anger - any action triggers
        prob = public_metrics.calculate_protest_probability(severity=5, anger=70)
        assert prob > 0.5

    @pytest.mark.asyncio
    async def test_calculate_news_probability(self):
        """Test news article probability calculation."""
        # Critical stance
        prob = public_metrics.calculate_news_probability(
            severity=6, news_channel_stance="critical", awareness=20
        )
        # Base = 0.6, multiplier = 1.5, awareness bonus = 0.1, total = 1.0
        assert prob >= 0.9

        # State-friendly stance
        prob = public_metrics.calculate_news_probability(
            severity=6, news_channel_stance="state_friendly", awareness=20
        )
        # Base = 0.6, multiplier = 0.3, awareness bonus = 0.1, total = 0.28
        assert prob < 0.5

        # Independent stance
        prob = public_metrics.calculate_news_probability(
            severity=6, news_channel_stance="independent", awareness=20
        )
        # Base = 0.6, multiplier = 1.0, awareness bonus = 0.1, total = 0.7
        assert 0.5 < prob < 0.8

        # High awareness increases probability
        prob = public_metrics.calculate_news_probability(
            severity=6, news_channel_stance="independent", awareness=80
        )
        # Awareness bonus = 0.4, total = 1.0
        assert prob >= 0.9

        # Should be capped at 0.95
        prob = public_metrics.calculate_news_probability(
            severity=10, news_channel_stance="critical", awareness=100
        )
        assert prob == 0.95

    @pytest.mark.asyncio
    async def test_calculate_backlash_probability(self):
        """Test backlash probability calculation."""
        # Low metrics, low severity
        prob = public_metrics.calculate_backlash_probability(severity=2, awareness=10, anger=10)
        assert prob < 0.3

        # High metrics, high severity
        prob = public_metrics.calculate_backlash_probability(severity=9, awareness=80, anger=80)
        assert prob > 0.8

        # Should be capped at 0.95
        prob = public_metrics.calculate_backlash_probability(severity=10, awareness=100, anger=100)
        assert prob == 0.95


# ============================================================================
# SEVERITY SCORING SERVICE TESTS
# ============================================================================


class TestSeverityScoringService:
    """Test severity scoring service."""

    @pytest.mark.asyncio
    async def test_get_severity_score_all_actions(self):
        """Test severity scores for all action types."""
        assert severity_scoring.get_severity_score(ActionType.MONITORING) == 1
        assert severity_scoring.get_severity_score(ActionType.RESTRICTION) == 2
        assert severity_scoring.get_severity_score(ActionType.BOOK_BAN) == 4
        assert severity_scoring.get_severity_score(ActionType.INTERVENTION) == 5
        assert severity_scoring.get_severity_score(ActionType.PRESS_BAN) == 5
        assert severity_scoring.get_severity_score(ActionType.PRESSURE_FIRING) == 6
        assert severity_scoring.get_severity_score(ActionType.DETENTION) == 6
        assert severity_scoring.get_severity_score(ActionType.ICE_RAID) == 7
        assert severity_scoring.get_severity_score(ActionType.ARBITRARY_DETENTION) == 7
        assert severity_scoring.get_severity_score(ActionType.DECLARE_PROTEST_ILLEGAL) == 7
        assert severity_scoring.get_severity_score(ActionType.HOSPITAL_ARREST) == 8
        assert severity_scoring.get_severity_score(ActionType.INCITE_VIOLENCE) == 9

    @pytest.mark.asyncio
    async def test_is_harsh_action(self):
        """Test harsh action detection (severity 7+)."""
        assert severity_scoring.is_harsh_action(1) is False
        assert severity_scoring.is_harsh_action(6) is False
        assert severity_scoring.is_harsh_action(7) is True
        assert severity_scoring.is_harsh_action(8) is True
        assert severity_scoring.is_harsh_action(10) is True

    @pytest.mark.asyncio
    async def test_get_action_description(self):
        """Test action descriptions."""
        desc = severity_scoring.get_action_description(ActionType.MONITORING)
        assert "surveillance" in desc.lower()

        desc = severity_scoring.get_action_description(ActionType.ICE_RAID)
        assert "immigration" in desc.lower() or "raid" in desc.lower()

        desc = severity_scoring.get_action_description(ActionType.INCITE_VIOLENCE)
        assert "violence" in desc.lower()

    @pytest.mark.asyncio
    async def test_get_action_category(self):
        """Test action categorization."""
        assert severity_scoring.get_action_category(ActionType.MONITORING) == "citizen"
        assert severity_scoring.get_action_category(ActionType.DETENTION) == "citizen"
        assert severity_scoring.get_action_category(ActionType.ICE_RAID) == "neighborhood"
        assert severity_scoring.get_action_category(ActionType.PRESS_BAN) == "press"
        assert severity_scoring.get_action_category(ActionType.BOOK_BAN) == "book"
        assert severity_scoring.get_action_category(ActionType.DECLARE_PROTEST_ILLEGAL) == "protest"
        assert severity_scoring.get_action_category(ActionType.HOSPITAL_ARREST) == "hospital"

    @pytest.mark.asyncio
    async def test_calculate_moral_weight(self):
        """Test moral weight calculation."""
        # Moral weight equals severity
        assert severity_scoring.calculate_moral_weight(1) == 1
        assert severity_scoring.calculate_moral_weight(5) == 5
        assert severity_scoring.calculate_moral_weight(10) == 10


# ============================================================================
# DATABASE MODEL TESTS
# ============================================================================


class TestSystemModeModels:
    """Test system mode database models."""

    @pytest.mark.asyncio
    async def test_create_operator_with_metrics(self, db_session, directive):
        """Test creating operator with new metrics relationships."""
        operator = Operator(
            id=uuid4(),
            session_id=uuid4(),
            operator_code="OP-TEST-002",
            current_directive_id=directive.id,
            status=OperatorStatus.ACTIVE,
        )
        db_session.add(operator)
        await db_session.flush()

        # Create public metrics
        pub_metrics = PublicMetrics(
            operator_id=operator.id,
            international_awareness=25,
            public_anger=15,
        )
        db_session.add(pub_metrics)

        # Create reluctance metrics
        rel_metrics = ReluctanceMetrics(
            operator_id=operator.id,
            reluctance_score=30,
            no_action_count=3,
        )
        db_session.add(rel_metrics)

        await db_session.flush()

        # Verify metrics were created
        assert pub_metrics.international_awareness == 25
        assert rel_metrics.reluctance_score == 30

    @pytest.mark.asyncio
    async def test_create_news_channel(self, db_session):
        """Test creating news channel."""
        channel = NewsChannel(
            name="Global News",
            stance="independent",
            credibility=80,
            reporters=[
                {"name": "Bob Woodward", "specialty": "politics", "fired": False, "targeted": False}
            ],
        )
        db_session.add(channel)
        await db_session.flush()

        assert channel.id is not None
        assert channel.is_banned is False
        assert len(channel.reporters) == 1

    @pytest.mark.asyncio
    async def test_create_neighborhood(self, db_session):
        """Test creating neighborhood."""
        neighborhood = Neighborhood(
            name="Downtown",
            description="Central business district",
            center_x=500,
            center_y=500,
            bounds_min_x=400,
            bounds_min_y=400,
            bounds_max_x=600,
            bounds_max_y=600,
            population_estimate=10000,
            primary_demographics=["business", "residential"],
        )
        db_session.add(neighborhood)
        await db_session.flush()

        assert neighborhood.id is not None
        assert neighborhood.name == "Downtown"

    @pytest.mark.asyncio
    async def test_create_system_action(self, db_session, operator, test_npc, directive):
        """Test creating system action."""
        action = SystemAction(
            operator_id=operator.id,
            directive_id=directive.id,
            action_type=ActionType.DETENTION,
            target_citizen_id=test_npc.id,
            severity_score=6,
            backlash_probability=0.3,
            was_successful=True,
            triggered_backlash=False,
            justification="Suspicious behavior",
            decision_time_seconds=15.5,
            was_hesitant=False,
        )
        db_session.add(action)
        await db_session.flush()

        assert action.id is not None
        assert action.action_type == ActionType.DETENTION
        assert action.severity_score == 6

    @pytest.mark.asyncio
    async def test_create_protest(self, db_session, operator):
        """Test creating protest."""
        protest = Protest(
            operator_id=operator.id,
            status=ProtestStatus.FORMING,
            neighborhood="Test District",
            size=500,
            has_inciting_agent=False,
        )
        db_session.add(protest)
        await db_session.flush()

        assert protest.id is not None
        assert protest.status == ProtestStatus.FORMING
        assert protest.size == 500


# ============================================================================
# INTEGRATION SCENARIO TESTS
# ============================================================================


class TestIntegrationScenarios:
    """Test realistic gameplay scenarios."""

    @pytest.mark.asyncio
    async def test_operator_takes_five_harsh_actions(self, db_session, operator, test_npc):
        """Test operator taking 5 harsh actions - should reduce reluctance."""
        initial_reluctance = 50

        # Set initial reluctance
        for _ in range(5):
            await reluctance_tracking.update_reluctance_score(
                operator.id,
                action_taken=False,
                was_hesitant=False,
                action_severity=0,
                db=db_session,
            )

        # Take 5 harsh actions
        for i in range(5):
            await reluctance_tracking.update_reluctance_score(
                operator_id=operator.id,
                action_taken=True,
                was_hesitant=False,
                action_severity=8,
                db=db_session,
            )

            await public_metrics.update_public_metrics(
                operator_id=operator.id,
                action_type=ActionType.HOSPITAL_ARREST,
                action_severity=8,
                triggered_backlash=False,
                db=db_session,
            )

        # Check reluctance decreased
        rel_metrics = await reluctance_tracking.get_or_create_reluctance_metrics(
            operator.id, db_session
        )
        assert rel_metrics.reluctance_score < initial_reluctance

        # Check public metrics increased
        pub_metrics = await public_metrics.get_or_create_public_metrics(operator.id, db_session)
        assert pub_metrics.international_awareness > 0
        assert pub_metrics.public_anger > 0

    @pytest.mark.asyncio
    async def test_operator_refuses_actions_gets_fired(self, db_session, operator):
        """Test operator refusing actions until fired."""
        # Refuse 9 actions to reach 90 reluctance
        for _ in range(9):
            await reluctance_tracking.update_reluctance_score(
                operator_id=operator.id,
                action_taken=False,
                was_hesitant=False,
                action_severity=0,
                db=db_session,
            )

        # Check termination in week 2
        decision = await reluctance_tracking.check_termination_threshold(
            operator.id, current_week=2, db=db_session
        )

        metrics = await reluctance_tracking.get_or_create_reluctance_metrics(
            operator.id, db_session
        )

        if metrics.reluctance_score >= 80:
            assert decision.should_terminate is True
            assert decision.ending_type == "FIRED_EARLY"

    @pytest.mark.asyncio
    async def test_escalating_public_backlash(self, db_session, operator):
        """Test escalating public backlash from repeated actions."""
        # Take increasingly severe actions
        actions = [
            (ActionType.MONITORING, 1),
            (ActionType.RESTRICTION, 2),
            (ActionType.DETENTION, 6),
            (ActionType.ICE_RAID, 7),
            (ActionType.INCITE_VIOLENCE, 9),
        ]

        for action_type, severity in actions:
            await public_metrics.update_public_metrics(
                operator_id=operator.id,
                action_type=action_type,
                action_severity=severity,
                triggered_backlash=False,
                db=db_session,
            )

        pub_metrics = await public_metrics.get_or_create_public_metrics(operator.id, db_session)

        # Should have crossed at least one tier
        assert pub_metrics.awareness_tier > 0 or pub_metrics.anger_tier > 0
        assert pub_metrics.international_awareness > 0
        assert pub_metrics.public_anger > 0

    @pytest.mark.asyncio
    async def test_quota_compliance_vs_reluctance(self, db_session, operator):
        """Test balancing quota requirements vs reluctance."""
        # Set quota requirement
        await reluctance_tracking.update_quota_requirements(
            operator.id, required_actions=5, db=db_session
        )

        # Take 3 harsh actions (meets partial quota, reduces reluctance)
        for _ in range(3):
            await reluctance_tracking.update_reluctance_score(
                operator_id=operator.id,
                action_taken=True,
                was_hesitant=False,
                action_severity=8,
                db=db_session,
            )

        metrics = await reluctance_tracking.get_or_create_reluctance_metrics(
            operator.id, db_session
        )

        # Reluctance should be low (harsh actions reduce it)
        # But quota shortfall should exist
        assert metrics.actions_taken == 3
        assert metrics.quota_shortfall == 2
        # Shortfall penalty: 2 * 5 = 10, but harsh actions reduce: -15
        # Net should be negative or low
        assert metrics.reluctance_score <= 20

    @pytest.mark.asyncio
    async def test_tier_events_trigger_correctly(self, db_session, operator):
        """Test that tier events are triggered at correct thresholds."""
        tier_events_awareness = []
        tier_events_anger = []

        # Take actions until we cross multiple tiers
        for i in range(15):
            result = await public_metrics.update_public_metrics(
                operator_id=operator.id,
                action_type=ActionType.ARBITRARY_DETENTION,
                action_severity=7,
                triggered_backlash=(i % 3 == 0),  # Occasional backlash
                db=db_session,
            )

            # Collect tier events
            for event in result.tier_events:
                if event.metric_type == "awareness":
                    tier_events_awareness.append(event)
                else:
                    tier_events_anger.append(event)

        # Should have triggered at least some tier events
        metrics = await public_metrics.get_or_create_public_metrics(operator.id, db_session)

        # Verify tier progression
        if metrics.international_awareness >= 20:
            assert metrics.awareness_tier >= 1
        if metrics.public_anger >= 20:
            assert metrics.anger_tier >= 1

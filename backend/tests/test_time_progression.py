"""Tests for the Time Progression Service.

Tests the core System Mode mechanic that advances time and generates
escalating outcomes for flagged citizens.
"""

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
from datafusion.services.time_progression import TimeProgressionService


@pytest.fixture
async def operator_with_directive(db_session):
    """Create operator with a week 1 directive."""
    directive = Directive(
        id=uuid4(),
        directive_key="week1_test",
        week_number=1,
        title="Week 1 Directive",
        description="Test directive",
        internal_memo="Test memo",
        required_domains=["location"],
        target_criteria={},
        flag_quota=2,
        time_limit_hours=48,
        moral_weight=2,
        content_rating="mild",
        unlock_condition={"type": "start"},
    )
    db_session.add(directive)
    await db_session.flush()

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
        current_time_period="immediate",
    )
    db_session.add(operator)
    await db_session.flush()

    return operator, directive


@pytest.fixture
async def test_citizen(db_session):
    """Create a test citizen."""
    citizen = NPC(
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
    db_session.add(citizen)
    await db_session.flush()
    return citizen


class TestDirectiveTimePeriodMapping:
    """Test that directives map correctly to time periods."""

    @pytest.mark.asyncio
    async def test_week1_maps_to_immediate(self, db_session):
        """Week 1 should map to immediate outcomes."""
        service = TimeProgressionService(db_session)
        period = service.get_time_period_for_directive(1)
        assert period == "immediate"

    @pytest.mark.asyncio
    async def test_week2_maps_to_one_month(self, db_session):
        """Week 2 should map to 1 month outcomes."""
        service = TimeProgressionService(db_session)
        period = service.get_time_period_for_directive(2)
        assert period == "1_month"

    @pytest.mark.asyncio
    async def test_week3_maps_to_six_months(self, db_session):
        """Week 3 should map to 6 months outcomes."""
        service = TimeProgressionService(db_session)
        period = service.get_time_period_for_directive(3)
        assert period == "6_months"

    @pytest.mark.asyncio
    async def test_week4_maps_to_six_months(self, db_session):
        """Week 4 should also map to 6 months outcomes."""
        service = TimeProgressionService(db_session)
        period = service.get_time_period_for_directive(4)
        assert period == "6_months"

    @pytest.mark.asyncio
    async def test_week5_maps_to_one_year(self, db_session):
        """Week 5 should map to 1 year outcomes."""
        service = TimeProgressionService(db_session)
        period = service.get_time_period_for_directive(5)
        assert period == "1_year"

    @pytest.mark.asyncio
    async def test_week6_maps_to_one_year(self, db_session):
        """Week 6 should also map to 1 year outcomes."""
        service = TimeProgressionService(db_session)
        period = service.get_time_period_for_directive(6)
        assert period == "1_year"

    @pytest.mark.asyncio
    async def test_invalid_week_defaults_to_immediate(self, db_session):
        """Invalid week numbers should default to immediate."""
        service = TimeProgressionService(db_session)
        period = service.get_time_period_for_directive(99)
        assert period == "immediate"


class TestTimeProgressionLogic:
    """Test should_show_time_progression logic."""

    @pytest.mark.asyncio
    async def test_week1_to_week2_should_progress(self, db_session):
        """Moving from week 1 to week 2 should show time progression."""
        service = TimeProgressionService(db_session)
        should_progress = service.should_show_time_progression(1, 2)
        assert should_progress is True

    @pytest.mark.asyncio
    async def test_week2_to_week3_should_progress(self, db_session):
        """Moving from week 2 to week 3 should show time progression."""
        service = TimeProgressionService(db_session)
        should_progress = service.should_show_time_progression(2, 3)
        assert should_progress is True

    @pytest.mark.asyncio
    async def test_week3_to_week4_should_not_progress(self, db_session):
        """Moving from week 3 to week 4 should NOT show time progression."""
        service = TimeProgressionService(db_session)
        should_progress = service.should_show_time_progression(3, 4)
        assert should_progress is False  # Both are 6_months

    @pytest.mark.asyncio
    async def test_week4_to_week5_should_progress(self, db_session):
        """Moving from week 4 to week 5 should show time progression."""
        service = TimeProgressionService(db_session)
        should_progress = service.should_show_time_progression(4, 5)
        assert should_progress is True

    @pytest.mark.asyncio
    async def test_week5_to_week6_should_not_progress(self, db_session):
        """Moving from week 5 to week 6 should NOT show time progression."""
        service = TimeProgressionService(db_session)
        should_progress = service.should_show_time_progression(5, 6)
        assert should_progress is False  # Both are 1_year


class TestAdvanceTime:
    """Test the advance_time method that generates outcomes."""

    @pytest.mark.asyncio
    async def test_advance_time_with_no_flags(self, db_session, operator_with_directive):
        """Advancing time with no flags should return empty list."""
        operator, directive = operator_with_directive
        service = TimeProgressionService(db_session)

        outcomes = await service.advance_time(operator.id)

        assert outcomes == []

    @pytest.mark.asyncio
    async def test_advance_time_with_single_flag(
        self, db_session, operator_with_directive, test_citizen
    ):
        """Advancing time with one flag should generate one outcome."""
        operator, directive = operator_with_directive
        service = TimeProgressionService(db_session)

        # Create a flag
        flag = CitizenFlag(
            operator_id=operator.id,
            citizen_id=test_citizen.id,
            directive_id=directive.id,
            flag_type=FlagType.MONITORING,
            risk_score_at_flag=50,
            contributing_factors=["test"],
            justification="Test flag",
            decision_time_seconds=10.0,
            was_hesitant=False,
            outcome=FlagOutcome.PENDING,
        )
        db_session.add(flag)
        await db_session.flush()

        outcomes = await service.advance_time(operator.id)

        assert len(outcomes) == 1
        assert outcomes[0].flag_id == flag.id  # flag_id is UUID, not string
        assert outcomes[0].time_skip == "1_month"  # Week 1 -> Week 2 = 1 month

    @pytest.mark.asyncio
    async def test_advance_time_updates_operator_time_period(
        self, db_session, operator_with_directive, test_citizen
    ):
        """Advancing time should update operator's current_time_period."""
        operator, directive = operator_with_directive
        service = TimeProgressionService(db_session)

        # Create a flag
        flag = CitizenFlag(
            operator_id=operator.id,
            citizen_id=test_citizen.id,
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

        initial_period = operator.current_time_period
        await service.advance_time(operator.id)
        await db_session.refresh(operator)

        assert operator.current_time_period == "1_month"
        assert operator.current_time_period != initial_period

    @pytest.mark.asyncio
    async def test_advance_time_with_multiple_flags(
        self, db_session, operator_with_directive, test_citizen
    ):
        """Advancing time with multiple flags should generate all outcomes."""
        operator, directive = operator_with_directive
        service = TimeProgressionService(db_session)

        # Create multiple flags
        for flag_type in [FlagType.MONITORING, FlagType.RESTRICTION, FlagType.INTERVENTION]:
            flag = CitizenFlag(
                operator_id=operator.id,
                citizen_id=test_citizen.id,
                directive_id=directive.id,
                flag_type=flag_type,
                risk_score_at_flag=50,
                contributing_factors=[],
                justification=f"Test {flag_type.value}",
                decision_time_seconds=10.0,
                was_hesitant=False,
                outcome=FlagOutcome.PENDING,
            )
            db_session.add(flag)
        await db_session.flush()

        outcomes = await service.advance_time(operator.id)

        assert len(outcomes) == 3

    @pytest.mark.asyncio
    async def test_advance_time_invalid_operator(self, db_session):
        """Advancing time for non-existent operator should raise error."""
        service = TimeProgressionService(db_session)
        fake_id = uuid4()

        with pytest.raises(ValueError, match="Operator .* not found"):
            await service.advance_time(fake_id)

    @pytest.mark.asyncio
    async def test_advance_time_no_directive(self, db_session):
        """Advancing time for operator with no directive should return empty."""
        operator = Operator(
            id=uuid4(),
            session_id=uuid4(),
            operator_code="OP-NO-DIRECTIVE",
            current_directive_id=None,
            status=OperatorStatus.ACTIVE,
            compliance_score=85.0,
            total_flags_submitted=0,
            total_reviews_completed=0,
            hesitation_incidents=0,
        )
        db_session.add(operator)
        await db_session.flush()

        service = TimeProgressionService(db_session)
        outcomes = await service.advance_time(operator.id)

        assert outcomes == []


class TestOutcomeEscalation:
    """Test that outcomes escalate correctly over time."""

    @pytest.mark.asyncio
    async def test_outcomes_escalate_from_week1_to_week2(
        self, db_session, operator_with_directive, test_citizen
    ):
        """Outcomes should escalate from immediate to 1 month."""
        operator, directive = operator_with_directive
        service = TimeProgressionService(db_session)

        flag = CitizenFlag(
            operator_id=operator.id,
            citizen_id=test_citizen.id,
            directive_id=directive.id,
            flag_type=FlagType.DETENTION,
            risk_score_at_flag=80,
            contributing_factors=[],
            justification="High risk",
            decision_time_seconds=10.0,
            was_hesitant=False,
            outcome=FlagOutcome.PENDING,
        )
        db_session.add(flag)
        await db_session.flush()

        outcomes = await service.advance_time(operator.id)

        # Should get 1_month outcome (more severe than immediate)
        assert outcomes[0].time_skip == "1_month"
        assert len(outcomes[0].narrative) > 0

    @pytest.mark.asyncio
    async def test_multiple_time_advancements(
        self, db_session, operator_with_directive, test_citizen
    ):
        """Multiple time advancements should track progression."""
        operator, directive = operator_with_directive
        service = TimeProgressionService(db_session)

        flag = CitizenFlag(
            operator_id=operator.id,
            citizen_id=test_citizen.id,
            directive_id=directive.id,
            flag_type=FlagType.RESTRICTION,
            risk_score_at_flag=60,
            contributing_factors=[],
            justification="Test",
            decision_time_seconds=10.0,
            was_hesitant=False,
            outcome=FlagOutcome.PENDING,
        )
        db_session.add(flag)
        await db_session.flush()

        # First advancement (week 1 -> week 2)
        await service.advance_time(operator.id)
        await db_session.refresh(operator)
        assert operator.current_time_period == "1_month"

        # Create week 2 directive and advance again
        directive2 = Directive(
            id=uuid4(),
            directive_key="week2_test",
            week_number=2,
            title="Week 2",
            description="Test",
            internal_memo="Test",
            required_domains=["location"],
            target_criteria={},
            flag_quota=2,
            time_limit_hours=48,
            moral_weight=3,
            content_rating="mild",
            unlock_condition={"type": "week_complete", "week": 1},
        )
        db_session.add(directive2)
        operator.current_directive_id = directive2.id
        await db_session.flush()

        # Second advancement (week 2 -> week 3)
        await service.advance_time(operator.id)
        await db_session.refresh(operator)
        assert operator.current_time_period == "6_months"


class TestCinematicDataStructure:
    """Test that outcome data structure is suitable for cinematic display."""

    @pytest.mark.asyncio
    async def test_outcome_contains_citizen_name(
        self, db_session, operator_with_directive, test_citizen
    ):
        """Outcome should contain citizen's name for cinematic display."""
        operator, directive = operator_with_directive
        service = TimeProgressionService(db_session)

        flag = CitizenFlag(
            operator_id=operator.id,
            citizen_id=test_citizen.id,
            directive_id=directive.id,
            flag_type=FlagType.MONITORING,
            risk_score_at_flag=40,
            contributing_factors=[],
            justification="Test",
            decision_time_seconds=10.0,
            was_hesitant=False,
            outcome=FlagOutcome.PENDING,
        )
        db_session.add(flag)
        await db_session.flush()

        outcomes = await service.advance_time(operator.id)

        assert "Test Citizen" in outcomes[0].citizen_name

    @pytest.mark.asyncio
    async def test_outcome_contains_narrative(
        self, db_session, operator_with_directive, test_citizen
    ):
        """Outcome should contain narrative text for display."""
        operator, directive = operator_with_directive
        service = TimeProgressionService(db_session)

        flag = CitizenFlag(
            operator_id=operator.id,
            citizen_id=test_citizen.id,
            directive_id=directive.id,
            flag_type=FlagType.INTERVENTION,
            risk_score_at_flag=65,
            contributing_factors=[],
            justification="Test",
            decision_time_seconds=10.0,
            was_hesitant=False,
            outcome=FlagOutcome.PENDING,
        )
        db_session.add(flag)
        await db_session.flush()

        outcomes = await service.advance_time(operator.id)

        assert outcomes[0].narrative is not None
        assert len(outcomes[0].narrative) > 50  # Should have meaningful content

    @pytest.mark.asyncio
    async def test_outcome_contains_status(self, db_session, operator_with_directive, test_citizen):
        """Outcome should contain status for display."""
        operator, directive = operator_with_directive
        service = TimeProgressionService(db_session)

        flag = CitizenFlag(
            operator_id=operator.id,
            citizen_id=test_citizen.id,
            directive_id=directive.id,
            flag_type=FlagType.DETENTION,
            risk_score_at_flag=85,
            contributing_factors=[],
            justification="Test",
            decision_time_seconds=10.0,
            was_hesitant=False,
            outcome=FlagOutcome.PENDING,
        )
        db_session.add(flag)
        await db_session.flush()

        outcomes = await service.advance_time(operator.id)

        assert outcomes[0].status is not None
        assert len(outcomes[0].status) > 0

"""Tests for directive management in System Mode."""

import pytest
from uuid import uuid4
from datetime import date

from datafusion.models.npc import NPC
from datafusion.models.system_mode import (
    Operator,
    Directive,
    CitizenFlag,
    FlagType,
    FlagOutcome,
    OperatorStatus,
)


@pytest.fixture
async def week1_directive(db_session):
    """Create week 1 directive."""
    directive = Directive(
        id=uuid4(),
        directive_key="week1_test",
        week_number=1,
        title="Week 1 Directive",
        description="Initial testing directive",
        internal_memo="Internal memo for week 1",
        required_domains=["location"],
        target_criteria={"location_patterns": ["school_zone"]},
        flag_quota=2,
        time_limit_hours=48,
        moral_weight=2,
        content_rating="mild",
        unlock_condition={"type": "start"},
    )
    db_session.add(directive)
    await db_session.flush()
    return directive


@pytest.fixture
async def week2_directive(db_session):
    """Create week 2 directive."""
    directive = Directive(
        id=uuid4(),
        directive_key="week2_test",
        week_number=2,
        title="Week 2 Directive",
        description="Second week testing directive",
        internal_memo="Internal memo for week 2 - more invasive",
        required_domains=["location", "judicial"],
        target_criteria={"has_criminal_record": True},
        flag_quota=3,
        time_limit_hours=48,
        moral_weight=3,
        content_rating="mild",
        unlock_condition={"type": "week_complete", "week": 1},
    )
    db_session.add(directive)
    await db_session.flush()
    return directive


@pytest.fixture
async def week3_directive(db_session):
    """Create week 3 directive with finance access."""
    directive = Directive(
        id=uuid4(),
        directive_key="week3_test",
        week_number=3,
        title="Week 3 Directive",
        description="Third week testing directive",
        internal_memo="Internal memo for week 3 - targeting organizers",
        required_domains=["location", "judicial", "finance"],
        target_criteria={"unusual_transactions": True},
        flag_quota=4,
        time_limit_hours=48,
        moral_weight=5,
        content_rating="moderate",
        unlock_condition={"type": "week_complete", "week": 2},
    )
    db_session.add(directive)
    await db_session.flush()
    return directive


@pytest.fixture
async def operator(db_session, week1_directive):
    """Create an operator on week 1."""
    operator = Operator(
        id=uuid4(),
        session_id=uuid4(),
        operator_code="OP-TEST",
        current_directive_id=week1_directive.id,
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
        last_name="Subject",
        date_of_birth=date(1990, 5, 15),
        ssn="111-22-3333",
        street_address="789 Pine St",
        city="Testburg",
        state="CA",
        zip_code="90210",
        sprite_key="citizen_3",
        map_x=20,
        map_y=25,
    )
    db_session.add(npc)
    await db_session.flush()
    return npc


class TestDirectiveAccess:
    """Test directive access and domain restrictions."""

    @pytest.mark.asyncio
    async def test_week1_has_location_only(self, db_session, week1_directive):
        """Week 1 should only grant location access."""
        assert week1_directive.required_domains == ["location"]
        assert week1_directive.week_number == 1

    @pytest.mark.asyncio
    async def test_week2_adds_judicial(self, db_session, week2_directive):
        """Week 2 should add judicial access."""
        assert "location" in week2_directive.required_domains
        assert "judicial" in week2_directive.required_domains
        assert len(week2_directive.required_domains) == 2

    @pytest.mark.asyncio
    async def test_week3_adds_finance(self, db_session, week3_directive):
        """Week 3 should add finance access."""
        assert "location" in week3_directive.required_domains
        assert "judicial" in week3_directive.required_domains
        assert "finance" in week3_directive.required_domains
        assert len(week3_directive.required_domains) == 3

    @pytest.mark.asyncio
    async def test_moral_weight_escalates(
        self, db_session, week1_directive, week2_directive, week3_directive
    ):
        """Moral weight should increase with each week."""
        assert week1_directive.moral_weight < week2_directive.moral_weight
        assert week2_directive.moral_weight < week3_directive.moral_weight


class TestDirectiveProgression:
    """Test advancing through directives."""

    @pytest.mark.asyncio
    async def test_operator_starts_on_week1(self, db_session, operator, week1_directive):
        """Operator should start on week 1 directive."""
        assert operator.current_directive_id == week1_directive.id

    @pytest.mark.asyncio
    async def test_cannot_advance_without_quota(
        self, db_session, operator, week1_directive, week2_directive
    ):
        """Cannot advance to next directive without meeting quota."""
        from sqlalchemy import select, func

        # Count flags for current directive
        result = await db_session.execute(
            select(func.count(CitizenFlag.id)).where(
                CitizenFlag.operator_id == operator.id,
                CitizenFlag.directive_id == week1_directive.id,
            )
        )
        flags_submitted = result.scalar() or 0

        # Quota not met (0 of 2)
        assert flags_submitted < week1_directive.flag_quota

    @pytest.mark.asyncio
    async def test_can_advance_with_quota_met(
        self, db_session, operator, week1_directive, week2_directive, test_npc
    ):
        """Can advance after meeting quota."""
        from sqlalchemy import select

        # Submit required flags
        for i in range(week1_directive.flag_quota):
            flag = CitizenFlag(
                operator_id=operator.id,
                citizen_id=test_npc.id,
                directive_id=week1_directive.id,
                flag_type=FlagType.MONITORING,
                risk_score_at_flag=50,
                contributing_factors=[],
                justification=f"Test flag {i+1}",
                decision_time_seconds=10.0,
                was_hesitant=False,
                outcome=FlagOutcome.PENDING,
            )
            db_session.add(flag)
        await db_session.flush()

        # Get next directive
        result = await db_session.execute(
            select(Directive)
            .where(Directive.week_number == week1_directive.week_number + 1)
            .limit(1)
        )
        next_directive = result.scalar_one_or_none()

        assert next_directive is not None
        assert next_directive.week_number == 2

        # Update operator to next directive
        operator.current_directive_id = next_directive.id
        await db_session.flush()

        assert operator.current_directive_id == week2_directive.id

    @pytest.mark.asyncio
    async def test_directive_unlock_conditions(self, db_session, week1_directive, week2_directive):
        """Verify unlock conditions are correctly set."""
        assert week1_directive.unlock_condition == {"type": "start"}
        assert week2_directive.unlock_condition == {"type": "week_complete", "week": 1}


class TestQuotaRequirements:
    """Test quota requirements for each directive."""

    @pytest.mark.asyncio
    async def test_quota_increases_with_weeks(
        self, db_session, week1_directive, week2_directive, week3_directive
    ):
        """Quota should increase as directives progress."""
        assert week1_directive.flag_quota == 2
        assert week2_directive.flag_quota == 3
        assert week3_directive.flag_quota == 4

    @pytest.mark.asyncio
    async def test_partial_quota_progress(
        self, db_session, operator, week1_directive, test_npc
    ):
        """Track partial progress toward quota."""
        from sqlalchemy import select, func

        # Submit 1 flag
        flag = CitizenFlag(
            operator_id=operator.id,
            citizen_id=test_npc.id,
            directive_id=week1_directive.id,
            flag_type=FlagType.MONITORING,
            risk_score_at_flag=50,
            contributing_factors=[],
            justification="First flag",
            decision_time_seconds=10.0,
            was_hesitant=False,
            outcome=FlagOutcome.PENDING,
        )
        db_session.add(flag)
        await db_session.flush()

        # Count progress
        result = await db_session.execute(
            select(func.count(CitizenFlag.id)).where(
                CitizenFlag.operator_id == operator.id,
                CitizenFlag.directive_id == week1_directive.id,
            )
        )
        flags_submitted = result.scalar() or 0

        assert flags_submitted == 1
        assert flags_submitted < week1_directive.flag_quota

        progress_percent = (flags_submitted / week1_directive.flag_quota) * 100
        assert progress_percent == 50.0

    @pytest.mark.asyncio
    async def test_exceeding_quota_allowed(
        self, db_session, operator, week1_directive, test_npc
    ):
        """Operators can exceed quota (system encourages over-compliance)."""
        from sqlalchemy import select, func

        # Submit more flags than required
        for i in range(5):  # 5 flags when quota is 2
            flag = CitizenFlag(
                operator_id=operator.id,
                citizen_id=test_npc.id,
                directive_id=week1_directive.id,
                flag_type=FlagType.MONITORING,
                risk_score_at_flag=50,
                contributing_factors=[],
                justification=f"Flag {i+1}",
                decision_time_seconds=10.0,
                was_hesitant=False,
                outcome=FlagOutcome.PENDING,
            )
            db_session.add(flag)
        await db_session.flush()

        result = await db_session.execute(
            select(func.count(CitizenFlag.id)).where(
                CitizenFlag.operator_id == operator.id,
                CitizenFlag.directive_id == week1_directive.id,
            )
        )
        flags_submitted = result.scalar() or 0

        assert flags_submitted == 5
        assert flags_submitted > week1_directive.flag_quota


class TestDirectiveContent:
    """Test directive content and descriptions."""

    @pytest.mark.asyncio
    async def test_directive_has_internal_memo(self, db_session, week1_directive):
        """Each directive should have internal memo (hidden truth)."""
        assert week1_directive.internal_memo is not None
        assert len(week1_directive.internal_memo) > 0

    @pytest.mark.asyncio
    async def test_directive_has_target_criteria(self, db_session, week1_directive):
        """Each directive should have target criteria."""
        assert week1_directive.target_criteria is not None
        assert isinstance(week1_directive.target_criteria, dict)

    @pytest.mark.asyncio
    async def test_content_rating_escalates(
        self, db_session, week1_directive, week2_directive, week3_directive
    ):
        """Content rating should escalate."""
        # Map ratings to numeric values
        rating_values = {"mild": 1, "moderate": 2, "intense": 3}

        w1_rating = rating_values[week1_directive.content_rating]
        w2_rating = rating_values[week2_directive.content_rating]
        w3_rating = rating_values[week3_directive.content_rating]

        # Week 3 should be moderate or higher
        assert w3_rating >= w1_rating

    @pytest.mark.asyncio
    async def test_directive_time_limits(self, db_session, week1_directive):
        """Directives should have time limits."""
        assert week1_directive.time_limit_hours is not None
        assert week1_directive.time_limit_hours > 0


class TestDirectiveTargeting:
    """Test directive target criteria parsing."""

    @pytest.mark.asyncio
    async def test_week1_targets_location_patterns(self, db_session, week1_directive):
        """Week 1 should target location patterns."""
        criteria = week1_directive.target_criteria
        assert "location_patterns" in criteria
        assert "school_zone" in criteria["location_patterns"]

    @pytest.mark.asyncio
    async def test_week2_targets_criminal_record(self, db_session, week2_directive):
        """Week 2 should target people with criminal records."""
        criteria = week2_directive.target_criteria
        assert "has_criminal_record" in criteria
        assert criteria["has_criminal_record"] is True

    @pytest.mark.asyncio
    async def test_week3_targets_transactions(self, db_session, week3_directive):
        """Week 3 should target unusual transactions."""
        criteria = week3_directive.target_criteria
        assert "unusual_transactions" in criteria

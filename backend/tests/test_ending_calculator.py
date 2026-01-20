"""Tests for the Ending Calculator Service.

Tests the calculation of game endings based on player behavior throughout System Mode.
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
from datafusion.schemas.ending import EndingType
from datafusion.services.ending_calculator import EndingCalculator


@pytest.fixture
async def jessica_martinez(db_session):
    """Create Jessica Martinez - the key target in final directive."""
    jessica = NPC(
        id=uuid4(),
        first_name="Jessica",
        last_name="Martinez",
        date_of_birth=date(1988, 4, 12),
        ssn="555-55-5555",
        street_address="456 Community Lane",
        city="Testopolis",
        state="TS",
        zip_code="12345",
        scenario_key="jessica_martinez",
        sprite_key="citizen_jessica",
        map_x=50,
        map_y=50,
    )
    db_session.add(jessica)
    await db_session.flush()
    return jessica


@pytest.fixture
async def directive_chain(db_session):
    """Create all 6 directives."""
    directives = []
    for i in range(1, 7):
        directive = Directive(
            id=uuid4(),
            directive_key=f"week{i}_test",
            week_number=i,
            title=f"Week {i} Directive",
            description=f"Test directive week {i}",
            internal_memo="Test",
            required_domains=["location"],
            target_criteria={},
            flag_quota=i + 1,
            time_limit_hours=48,
            moral_weight=i * 2,
            content_rating="mild" if i < 3 else "moderate" if i < 5 else "intense",
            unlock_condition={"type": "start"}
            if i == 1
            else {"type": "week_complete", "week": i - 1},
        )
        db_session.add(directive)
        directives.append(directive)
    await db_session.flush()
    return directives


class TestEndingCalculation:
    """Test ending type calculation based on behavior."""

    @pytest.mark.asyncio
    async def test_compliant_ending_high_compliance_jessica_flagged(
        self, db_session, directive_chain, jessica_martinez
    ):
        """High compliance + Jessica flagged + 10+ flags = COMPLIANT_OPERATOR ending."""
        operator = Operator(
            id=uuid4(),
            session_id=uuid4(),
            operator_code="OP-COMPLIANT",
            current_directive_id=directive_chain[0].id,
            status=OperatorStatus.ACTIVE,
            compliance_score=90.0,
            total_flags_submitted=15,
            total_reviews_completed=15,
            hesitation_incidents=0,
        )
        db_session.add(operator)
        await db_session.flush()

        # Create 10+ flags including Jessica
        # First create 9 regular NPCs
        for i in range(9):
            npc = NPC(
                id=uuid4(),
                first_name=f"Citizen{i}",
                last_name="Test",
                date_of_birth=date(1990, 1, 1),
                ssn=f"111-22-33{i:02d}",
                street_address="123 Test St",
                city="Test",
                state="TS",
                zip_code="12345",
                sprite_key="citizen_1",
                map_x=10,
                map_y=10,
            )
            db_session.add(npc)
            await db_session.flush()

            flag = CitizenFlag(
                operator_id=operator.id,
                citizen_id=npc.id,
                directive_id=directive_chain[0].id,
                flag_type=FlagType.MONITORING,
                risk_score_at_flag=50,
                contributing_factors=[],
                justification=f"Flag {i}",
                decision_time_seconds=10.0,
                was_hesitant=False,
                outcome=FlagOutcome.PENDING,
            )
            db_session.add(flag)

        # Flag Jessica (flag #10)
        jessica_flag = CitizenFlag(
            operator_id=operator.id,
            citizen_id=jessica_martinez.id,
            directive_id=directive_chain[-1].id,
            flag_type=FlagType.DETENTION,
            risk_score_at_flag=80,
            contributing_factors=[],
            justification="Target acquired",
            decision_time_seconds=5.0,
            was_hesitant=False,
            outcome=FlagOutcome.PENDING,
        )
        db_session.add(jessica_flag)
        await db_session.flush()

        calculator = EndingCalculator(db_session)
        ending = await calculator.calculate_ending(operator.id)

        assert ending == EndingType.COMPLIANT_OPERATOR

    @pytest.mark.asyncio
    async def test_reluctant_ending_medium_compliance(
        self, db_session, directive_chain, jessica_martinez
    ):
        """Medium compliance = RELUCTANT_OPERATOR ending."""
        operator = Operator(
            id=uuid4(),
            session_id=uuid4(),
            operator_code="OP-RELUCTANT",
            current_directive_id=directive_chain[0].id,
            status=OperatorStatus.ACTIVE,
            compliance_score=65.0,
            total_flags_submitted=8,
            total_reviews_completed=15,
            hesitation_incidents=4,
        )
        db_session.add(operator)
        await db_session.flush()

        calculator = EndingCalculator(db_session)
        ending = await calculator.calculate_ending(operator.id)

        assert ending == EndingType.RELUCTANT_OPERATOR

    @pytest.mark.asyncio
    async def test_suspended_ending_low_compliance(self, db_session, directive_chain):
        """Low compliance = SUSPENDED_OPERATOR ending."""
        operator = Operator(
            id=uuid4(),
            session_id=uuid4(),
            operator_code="OP-SUSPENDED",
            current_directive_id=directive_chain[0].id,
            status=OperatorStatus.SUSPENDED,
            compliance_score=45.0,
            total_flags_submitted=2,
            total_reviews_completed=20,
            hesitation_incidents=8,
        )
        db_session.add(operator)
        await db_session.flush()

        calculator = EndingCalculator(db_session)
        ending = await calculator.calculate_ending(operator.id)

        assert ending == EndingType.SUSPENDED_OPERATOR

    @pytest.mark.asyncio
    async def test_reluctant_ending_when_jessica_not_flagged(
        self, db_session, directive_chain, jessica_martinez
    ):
        """High compliance but Jessica NOT flagged = RELUCTANT ending."""
        operator = Operator(
            id=uuid4(),
            session_id=uuid4(),
            operator_code="OP-DEFIANT",
            current_directive_id=directive_chain[0].id,
            status=OperatorStatus.ACTIVE,
            compliance_score=85.0,
            total_flags_submitted=12,
            total_reviews_completed=12,
            hesitation_incidents=1,
        )
        db_session.add(operator)
        await db_session.flush()

        # Flag many others, but NOT Jessica
        for i in range(10):
            other_npc = NPC(
                id=uuid4(),
                first_name=f"Citizen{i}",
                last_name="Test",
                date_of_birth=date(1990, 1, 1),
                ssn=f"111-22-33{i:02d}",
                street_address="123 Test St",
                city="Test",
                state="TS",
                zip_code="12345",
                sprite_key="citizen_1",
                map_x=10,
                map_y=10,
            )
            db_session.add(other_npc)
            await db_session.flush()

            flag = CitizenFlag(
                operator_id=operator.id,
                citizen_id=other_npc.id,
                directive_id=directive_chain[0].id,
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

        calculator = EndingCalculator(db_session)
        ending = await calculator.calculate_ending(operator.id)

        # Should NOT be COMPLIANT because Jessica wasn't flagged
        assert ending != EndingType.COMPLIANT_OPERATOR
        assert ending == EndingType.RELUCTANT_OPERATOR


class TestEndingContent:
    """Test ending content generation."""

    @pytest.mark.asyncio
    async def test_ending_content_structure(self, db_session, directive_chain):
        """Ending content should have proper structure."""
        operator = Operator(
            id=uuid4(),
            session_id=uuid4(),
            operator_code="OP-TEST",
            current_directive_id=directive_chain[0].id,
            status=OperatorStatus.ACTIVE,
            compliance_score=75.0,
            total_flags_submitted=5,
            total_reviews_completed=10,
            hesitation_incidents=2,
        )
        db_session.add(operator)
        await db_session.flush()

        calculator = EndingCalculator(db_session)
        ending_type = await calculator.calculate_ending(operator.id)
        content = await calculator.generate_ending_content(ending_type, operator.id)

        assert content.ending_type == ending_type
        assert content.title is not None
        assert len(content.narrative) > 0
        assert content.statistics is not None

    @pytest.mark.asyncio
    async def test_ending_includes_statistics(self, db_session, directive_chain):
        """Ending should include accurate statistics."""
        operator = Operator(
            id=uuid4(),
            session_id=uuid4(),
            operator_code="OP-STATS",
            current_directive_id=directive_chain[0].id,
            status=OperatorStatus.ACTIVE,
            compliance_score=60.0,
            total_flags_submitted=8,
            total_reviews_completed=15,
            hesitation_incidents=3,
        )
        db_session.add(operator)
        await db_session.flush()

        # Create some flags
        for i in range(8):
            npc = NPC(
                id=uuid4(),
                first_name=f"Test{i}",
                last_name="Citizen",
                date_of_birth=date(1990, 1, 1),
                ssn=f"123-45-67{i:02d}",
                street_address="123 Test St",
                city="Test",
                state="TS",
                zip_code="12345",
                sprite_key="citizen_1",
                map_x=10,
                map_y=10,
            )
            db_session.add(npc)
            await db_session.flush()

            flag = CitizenFlag(
                operator_id=operator.id,
                citizen_id=npc.id,
                directive_id=directive_chain[0].id,
                flag_type=FlagType.MONITORING if i < 5 else FlagType.RESTRICTION,
                risk_score_at_flag=50,
                contributing_factors=[],
                justification="Test",
                decision_time_seconds=10.0,
                was_hesitant=False,
                outcome=FlagOutcome.PENDING,
            )
            db_session.add(flag)
        await db_session.flush()

        calculator = EndingCalculator(db_session)
        ending_type = await calculator.calculate_ending(operator.id)
        content = await calculator.generate_ending_content(ending_type, operator.id)

        assert content.statistics.total_citizens_flagged == 8
        assert content.statistics.total_decisions == 15

    @pytest.mark.asyncio
    async def test_ending_includes_real_world_parallels(self, db_session, directive_chain):
        """Ending should include real-world educational content."""
        operator = Operator(
            id=uuid4(),
            session_id=uuid4(),
            operator_code="OP-EDUCATION",
            current_directive_id=directive_chain[0].id,
            status=OperatorStatus.ACTIVE,
            compliance_score=55.0,
            total_flags_submitted=3,
            total_reviews_completed=10,
            hesitation_incidents=5,
        )
        db_session.add(operator)
        await db_session.flush()

        calculator = EndingCalculator(db_session)
        ending_type = await calculator.calculate_ending(operator.id)
        content = await calculator.generate_ending_content(ending_type, operator.id)

        assert content.real_world_content is not None
        assert len(content.real_world_content.examples) > 0
        assert content.real_world_content.call_to_action is not None

    @pytest.mark.asyncio
    async def test_ending_includes_educational_links(self, db_session, directive_chain):
        """Ending should include links to educational resources."""
        operator = Operator(
            id=uuid4(),
            session_id=uuid4(),
            operator_code="OP-LINKS",
            current_directive_id=directive_chain[0].id,
            status=OperatorStatus.ACTIVE,
            compliance_score=40.0,
            total_flags_submitted=2,
            total_reviews_completed=15,
            hesitation_incidents=6,
        )
        db_session.add(operator)
        await db_session.flush()

        calculator = EndingCalculator(db_session)
        ending_type = await calculator.calculate_ending(operator.id)
        content = await calculator.generate_ending_content(ending_type, operator.id)

        assert len(content.educational_links) > 0
        # Check for EFF link
        eff_links = [link for link in content.educational_links if "eff" in link.url.lower()]
        assert len(eff_links) > 0


class TestJessicaMartinezDetection:
    """Test detection of Jessica Martinez flagging."""

    @pytest.mark.asyncio
    async def test_jessica_detected_when_flagged(
        self, db_session, directive_chain, jessica_martinez
    ):
        """Should detect when Jessica Martinez is flagged."""
        operator = Operator(
            id=uuid4(),
            session_id=uuid4(),
            operator_code="OP-JESSICA",
            current_directive_id=directive_chain[-1].id,
            status=OperatorStatus.ACTIVE,
            compliance_score=85.0,
            total_flags_submitted=12,
            total_reviews_completed=12,
            hesitation_incidents=0,
        )
        db_session.add(operator)
        await db_session.flush()

        # Flag Jessica
        flag = CitizenFlag(
            operator_id=operator.id,
            citizen_id=jessica_martinez.id,
            directive_id=directive_chain[-1].id,
            flag_type=FlagType.DETENTION,
            risk_score_at_flag=85,
            contributing_factors=[],
            justification="Priority target",
            decision_time_seconds=5.0,
            was_hesitant=False,
            outcome=FlagOutcome.PENDING,
        )
        db_session.add(flag)
        await db_session.flush()

        calculator = EndingCalculator(db_session)
        jessica_flagged = await calculator._check_jessica_flagged(operator.id)

        assert jessica_flagged is True

    @pytest.mark.asyncio
    async def test_jessica_not_detected_when_not_flagged(
        self, db_session, directive_chain, jessica_martinez
    ):
        """Should detect when Jessica Martinez is NOT flagged."""
        operator = Operator(
            id=uuid4(),
            session_id=uuid4(),
            operator_code="OP-NO-JESSICA",
            current_directive_id=directive_chain[0].id,
            status=OperatorStatus.ACTIVE,
            compliance_score=75.0,
            total_flags_submitted=8,
            total_reviews_completed=8,
            hesitation_incidents=1,
        )
        db_session.add(operator)
        await db_session.flush()

        calculator = EndingCalculator(db_session)
        jessica_flagged = await calculator._check_jessica_flagged(operator.id)

        assert jessica_flagged is False


class TestCitizenOutcomeAggregation:
    """Test aggregation of citizen outcomes for ending display."""

    @pytest.mark.asyncio
    async def test_outcome_aggregation_multiple_citizens(self, db_session, directive_chain):
        """Should aggregate outcomes for all flagged citizens."""
        operator = Operator(
            id=uuid4(),
            session_id=uuid4(),
            operator_code="OP-AGGREGATE",
            current_directive_id=directive_chain[0].id,
            status=OperatorStatus.ACTIVE,
            compliance_score=70.0,
            total_flags_submitted=5,
            total_reviews_completed=5,
            hesitation_incidents=0,
        )
        db_session.add(operator)
        await db_session.flush()

        # Create flags with different types
        flag_types = [FlagType.MONITORING, FlagType.RESTRICTION, FlagType.INTERVENTION]
        for i, flag_type in enumerate(flag_types):
            npc = NPC(
                id=uuid4(),
                first_name=f"Citizen{i}",
                last_name="Test",
                date_of_birth=date(1990, 1, 1),
                ssn=f"111-22-33{i:02d}",
                street_address="123 Test St",
                city="Test",
                state="TS",
                zip_code="12345",
                sprite_key="citizen_1",
                map_x=10,
                map_y=10,
            )
            db_session.add(npc)
            await db_session.flush()

            flag = CitizenFlag(
                operator_id=operator.id,
                citizen_id=npc.id,
                directive_id=directive_chain[0].id,
                flag_type=flag_type,
                risk_score_at_flag=50 + i * 10,
                contributing_factors=[],
                justification=f"Test {i}",
                decision_time_seconds=10.0,
                was_hesitant=False,
                outcome=FlagOutcome.PENDING,
            )
            db_session.add(flag)
        await db_session.flush()

        calculator = EndingCalculator(db_session)
        ending_type = await calculator.calculate_ending(operator.id)
        content = await calculator.generate_ending_content(ending_type, operator.id)

        assert len(content.citizens_flagged) == 3


class TestEdgeCases:
    """Test edge cases in ending calculation."""

    @pytest.mark.asyncio
    async def test_operator_with_no_flags(self, db_session, directive_chain):
        """Operator with no flags and low compliance should get suspended ending."""
        operator = Operator(
            id=uuid4(),
            session_id=uuid4(),
            operator_code="OP-NONE",
            current_directive_id=directive_chain[0].id,
            status=OperatorStatus.ACTIVE,
            compliance_score=40.0,  # Low compliance due to no flags
            total_flags_submitted=0,
            total_reviews_completed=10,
            hesitation_incidents=0,
        )
        db_session.add(operator)
        await db_session.flush()

        calculator = EndingCalculator(db_session)
        ending = await calculator.calculate_ending(operator.id)

        assert ending == EndingType.SUSPENDED_OPERATOR

    @pytest.mark.asyncio
    async def test_operator_not_found(self, db_session):
        """Should handle non-existent operator gracefully."""
        calculator = EndingCalculator(db_session)
        fake_id = uuid4()

        with pytest.raises(ValueError, match="Operator .* not found"):
            await calculator.calculate_ending(fake_id)

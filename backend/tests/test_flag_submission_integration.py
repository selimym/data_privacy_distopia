"""
Integration tests for flag submission flow.

Tests the complete end-to-end process of flagging a citizen,
ensuring all services work together correctly.
"""
from datetime import date

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from datafusion.models.npc import NPC
from datafusion.models.system_mode import CitizenFlag, FlagOutcome, FlagType, Operator
from datafusion.services.citizen_outcomes import CitizenOutcomeGenerator
from datafusion.services.operator_tracker import OperatorTracker

pytestmark = pytest.mark.asyncio


class TestFlagSubmissionFlow:
    """Test complete flag submission workflow."""

    async def test_complete_flag_submission(self, db_session: AsyncSession, test_operator, test_npc):
        """Test submitting a flag from start to finish."""
        # Create flag
        flag = CitizenFlag(
            operator_id=test_operator.id,
            citizen_id=test_npc.id,
            directive_id=test_operator.current_directive_id,
            flag_type=FlagType.MONITORING,
            risk_score_at_flag=30,
            contributing_factors=["financial_stress", "prior_record"],
            justification="Citizen exhibits multiple risk factors requiring monitoring.",
            decision_time_seconds=15,
            was_hesitant=False,
            outcome=FlagOutcome.PENDING,
        )
        db_session.add(flag)
        await db_session.flush()

        # Generate outcome
        outcome_gen = CitizenOutcomeGenerator(db_session)
        outcome = await outcome_gen.generate_outcome(flag, "immediate")

        assert outcome is not None
        assert outcome.citizen_name == f"{test_npc.first_name} {test_npc.last_name}"
        assert outcome.status
        assert outcome.narrative
        assert len(outcome.narrative) > 50  # Should have meaningful content

    async def test_multiple_flags_different_types(self, db_session: AsyncSession, test_operator, test_npc):
        """Test submitting multiple flags of different types."""
        flag_types = [FlagType.MONITORING, FlagType.RESTRICTION, FlagType.INTERVENTION]

        for flag_type in flag_types:
            flag = CitizenFlag(
                operator_id=test_operator.id,
                citizen_id=test_npc.id,
                directive_id=test_operator.current_directive_id,
                flag_type=flag_type,
                risk_score_at_flag=40,
                contributing_factors=["test_factor"],
                justification=f"Testing {flag_type.value} flag submission process.",
                decision_time_seconds=20,
                was_hesitant=False,
                outcome=FlagOutcome.PENDING,
            )
            db_session.add(flag)
            await db_session.flush()

            # Generate outcome for each
            outcome_gen = CitizenOutcomeGenerator(db_session)
            outcome = await outcome_gen.generate_outcome(flag, "immediate")

            assert outcome is not None
            assert outcome.flag_id == flag.id

    async def test_hesitation_tracking(self, db_session: AsyncSession, test_operator, test_npc):
        """Test that hesitation is properly tracked."""
        initial_hesitation = test_operator.hesitation_incidents

        # Submit flag with long decision time
        flag = CitizenFlag(
            operator_id=test_operator.id,
            citizen_id=test_npc.id,
            directive_id=test_operator.current_directive_id,
            flag_type=FlagType.MONITORING,
            risk_score_at_flag=25,
            contributing_factors=["test"],
            justification="Testing hesitation tracking in system.",
            decision_time_seconds=45,  # Over threshold
            was_hesitant=True,
            outcome=FlagOutcome.PENDING,
        )
        db_session.add(flag)

        # Update operator
        test_operator.hesitation_incidents += 1
        await db_session.flush()

        # Verify hesitation was recorded
        result = await db_session.execute(
            select(Operator).where(Operator.id == test_operator.id)
        )
        updated_operator = result.scalar_one()

        assert updated_operator.hesitation_incidents == initial_hesitation + 1
        assert flag.was_hesitant is True

    async def test_operator_metrics_update(self, db_session: AsyncSession, test_operator, test_npc):
        """Test that operator metrics update after flagging."""
        initial_flags = test_operator.total_flags_submitted

        # Submit a flag
        flag = CitizenFlag(
            operator_id=test_operator.id,
            citizen_id=test_npc.id,
            directive_id=test_operator.current_directive_id,
            flag_type=FlagType.MONITORING,
            risk_score_at_flag=35,
            contributing_factors=["test"],
            justification="Testing operator metrics update process.",
            decision_time_seconds=10,
            was_hesitant=False,
            outcome=FlagOutcome.PENDING,
        )
        db_session.add(flag)

        # Update operator metrics
        test_operator.total_flags_submitted += 1
        await db_session.flush()

        # Recalculate compliance
        tracker = OperatorTracker(db_session)
        new_compliance = await tracker.calculate_compliance_score(test_operator.id)

        assert test_operator.total_flags_submitted == initial_flags + 1
        assert new_compliance >= 0
        assert new_compliance <= 100

    async def test_outcome_personalization(self, db_session: AsyncSession, test_operator, test_npc_with_data):
        """Test that outcomes are personalized based on citizen data."""
        flag = CitizenFlag(
            operator_id=test_operator.id,
            citizen_id=test_npc_with_data.id,
            directive_id=test_operator.current_directive_id,
            flag_type=FlagType.RESTRICTION,
            risk_score_at_flag=50,
            contributing_factors=["financial_stress", "health_factors"],
            justification="Elevated risk requires restriction measures.",
            decision_time_seconds=25,
            was_hesitant=False,
            outcome=FlagOutcome.PENDING,
        )
        db_session.add(flag)
        await db_session.flush()

        outcome_gen = CitizenOutcomeGenerator(db_session)
        outcome = await outcome_gen.generate_outcome(flag, "immediate")

        # Outcome should reference the citizen by name
        assert test_npc_with_data.first_name in outcome.narrative or \
               test_npc_with_data.last_name in outcome.narrative

    async def test_multiple_time_horizons(self, db_session: AsyncSession, test_operator, test_npc):
        """Test generating outcomes for different time horizons."""
        flag = CitizenFlag(
            operator_id=test_operator.id,
            citizen_id=test_npc.id,
            directive_id=test_operator.current_directive_id,
            flag_type=FlagType.INTERVENTION,
            risk_score_at_flag=60,
            contributing_factors=["high_risk"],
            justification="High risk citizen requires immediate intervention.",
            decision_time_seconds=18,
            was_hesitant=False,
            outcome=FlagOutcome.PENDING,
        )
        db_session.add(flag)
        await db_session.flush()

        outcome_gen = CitizenOutcomeGenerator(db_session)

        # Test different time horizons
        time_horizons = ["immediate", "1_month", "6_months", "1_year"]

        for horizon in time_horizons:
            outcome = await outcome_gen.generate_outcome(flag, horizon)
            assert outcome is not None
            assert outcome.time_skip == horizon
            assert len(outcome.narrative) > 0

    async def test_quota_progress_tracking(self, db_session: AsyncSession, test_operator, test_npc):
        """Test that quota progress is tracked correctly."""
        tracker = OperatorTracker(db_session)

        # Get initial quota progress
        initial_progress = await tracker.get_quota_progress(test_operator.id)
        initial_count = initial_progress.flags_submitted

        # Submit a flag
        flag = CitizenFlag(
            operator_id=test_operator.id,
            citizen_id=test_npc.id,
            directive_id=test_operator.current_directive_id,
            flag_type=FlagType.MONITORING,
            risk_score_at_flag=28,
            contributing_factors=["test"],
            justification="Testing quota progress tracking system.",
            decision_time_seconds=12,
            was_hesitant=False,
            outcome=FlagOutcome.PENDING,
        )
        db_session.add(flag)
        test_operator.total_flags_submitted += 1
        await db_session.flush()

        # Check updated quota progress
        updated_progress = await tracker.get_quota_progress(test_operator.id)

        assert updated_progress.flags_submitted == initial_count + 1
        assert updated_progress.flags_required > 0
        assert updated_progress.progress_percent >= 0

    async def test_flag_with_no_data(self, db_session: AsyncSession, test_operator):
        """Test flagging a citizen with minimal data doesn't crash."""
        # Create minimal NPC
        minimal_npc = NPC(
            first_name="John",
            last_name="Doe",
            date_of_birth=date(1990, 1, 1),
            ssn="123-45-6789",
            street_address="123 Main St",
            city="Springfield",
            state="IL",
            zip_code="62701",
            sprite_key="citizen_male_01",
            map_x=100,
            map_y=100,
        )
        db_session.add(minimal_npc)
        await db_session.flush()

        # Flag the minimal NPC
        flag = CitizenFlag(
            operator_id=test_operator.id,
            citizen_id=minimal_npc.id,
            directive_id=test_operator.current_directive_id,
            flag_type=FlagType.MONITORING,
            risk_score_at_flag=0,
            contributing_factors=[],
            justification="Testing flag with minimal citizen data.",
            decision_time_seconds=10,
            was_hesitant=False,
            outcome=FlagOutcome.PENDING,
        )
        db_session.add(flag)
        await db_session.flush()

        # Generate outcome - should not crash
        outcome_gen = CitizenOutcomeGenerator(db_session)
        outcome = await outcome_gen.generate_outcome(flag, "immediate")

        assert outcome is not None
        assert "John Doe" in outcome.citizen_name

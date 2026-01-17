"""Tests for the citizen outcomes service."""

import pytest
from uuid import uuid4
from datetime import date, datetime

from datafusion.models.npc import NPC
from datafusion.models.health import HealthRecord, HealthCondition, Severity
from datafusion.models.social import SocialMediaRecord, PublicInference, InferenceCategory, Platform
from datafusion.models.system_mode import (
    Operator,
    Directive,
    CitizenFlag,
    FlagType,
    FlagOutcome,
    OperatorStatus,
)
from datafusion.services.citizen_outcomes import CitizenOutcomeGenerator


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
        first_name="Jane",
        last_name="Doe",
        date_of_birth=date(1985, 6, 15),
        ssn="987-65-4321",
        street_address="456 Oak Ave",
        city="Springfield",
        state="IL",
        zip_code="62701",
        sprite_key="citizen_2",
        map_x=15,
        map_y=20,
    )
    db_session.add(npc)
    await db_session.flush()
    return npc


@pytest.fixture
async def npc_with_health(db_session, test_npc):
    """NPC with health conditions for personalization testing."""
    health_record = HealthRecord(
        npc_id=test_npc.id,
        insurance_provider="HealthCo",
        primary_care_physician="Dr. Smith",
    )
    db_session.add(health_record)
    await db_session.flush()

    condition = HealthCondition(
        health_record_id=health_record.id,
        condition_name="Type 2 Diabetes",
        diagnosed_date=date(2018, 3, 1),
        severity=Severity.MODERATE,
        is_chronic=True,
        is_sensitive=False,
    )
    db_session.add(condition)
    await db_session.flush()

    return test_npc


@pytest.fixture
async def npc_with_family(db_session, test_npc):
    """NPC with family indicators in social data."""
    social_record = SocialMediaRecord(
        npc_id=test_npc.id,
        has_public_profile=True,
        primary_platform=Platform.FACEBOOK,
        account_created_date=date(2015, 1, 1),
        follower_count=250,
        post_frequency="weekly",
        uses_end_to_end_encryption=False,
    )
    db_session.add(social_record)
    await db_session.flush()

    # Add inference mentioning children
    inference = PublicInference(
        social_media_record_id=social_record.id,
        category=InferenceCategory.FAMILY,
        inference_text="Subject has posted about picking up children from school",
        supporting_evidence="Multiple posts mentioning 'picking up kids from school'",
        confidence_score=90,
        source_platform=Platform.FACEBOOK,
        data_points_analyzed=5,
        potential_harm="Family structure could be targeted or used for manipulation",
    )
    db_session.add(inference)
    await db_session.flush()

    return test_npc


@pytest.fixture
async def create_flag(db_session, operator, directive, test_npc):
    """Factory fixture to create flags with different types."""
    async def _create(flag_type: FlagType):
        flag = CitizenFlag(
            id=uuid4(),
            operator_id=operator.id,
            citizen_id=test_npc.id,
            directive_id=directive.id,
            flag_type=flag_type,
            risk_score_at_flag=65,
            contributing_factors=[],
            justification="Test flag",
            decision_time_seconds=15.0,
            was_hesitant=False,
            outcome=FlagOutcome.PENDING,
        )
        db_session.add(flag)
        await db_session.flush()
        return flag
    return _create


class TestOutcomeGeneration:
    """Test outcome generation for each flag type."""

    @pytest.mark.asyncio
    async def test_monitoring_outcome_immediate(self, db_session, create_flag):
        """Test MONITORING flag immediate outcome."""
        generator = CitizenOutcomeGenerator(db_session)
        flag = await create_flag(FlagType.MONITORING)

        outcome = await generator.generate_outcome(flag, "immediate")

        assert outcome.flag_id == flag.id
        assert outcome.time_skip == "immediate"
        assert outcome.status == "Under Enhanced Surveillance"
        assert "monitoring" in outcome.narrative.lower() or "surveillance" in outcome.narrative.lower()
        assert outcome.statistics["privacy_score"] == 0

    @pytest.mark.asyncio
    async def test_restriction_outcome_immediate(self, db_session, create_flag):
        """Test RESTRICTION flag immediate outcome."""
        generator = CitizenOutcomeGenerator(db_session)
        flag = await create_flag(FlagType.RESTRICTION)

        outcome = await generator.generate_outcome(flag, "immediate")

        assert outcome.status == "Movement Restricted"
        assert outcome.statistics["travel_restriction"] is True
        assert "restriction" in outcome.narrative.lower() or "travel" in outcome.narrative.lower()

    @pytest.mark.asyncio
    async def test_intervention_outcome_immediate(self, db_session, create_flag):
        """Test INTERVENTION flag immediate outcome."""
        generator = CitizenOutcomeGenerator(db_session)
        flag = await create_flag(FlagType.INTERVENTION)

        outcome = await generator.generate_outcome(flag, "immediate")

        assert outcome.status == "State Contact Initiated"
        assert outcome.statistics["mandatory_checkins"] is True
        assert outcome.statistics["questioning_hours"] == 4

    @pytest.mark.asyncio
    async def test_detention_outcome_immediate(self, db_session, create_flag):
        """Test DETENTION flag immediate outcome."""
        generator = CitizenOutcomeGenerator(db_session)
        flag = await create_flag(FlagType.DETENTION)

        outcome = await generator.generate_outcome(flag, "immediate")

        assert outcome.status == "Detained"
        assert outcome.statistics["detained"] is True
        assert outcome.statistics["legal_access"] == "pending"


class TestTimeSkipProgression:
    """Test time skip progression showing escalating harm."""

    @pytest.mark.asyncio
    async def test_monitoring_progression(self, db_session, create_flag):
        """Test that monitoring outcomes escalate over time."""
        generator = CitizenOutcomeGenerator(db_session)
        flag = await create_flag(FlagType.MONITORING)

        immediate = await generator.generate_outcome(flag, "immediate")
        month = await generator.generate_outcome(flag, "1_month")
        six_months = await generator.generate_outcome(flag, "6_months")
        year = await generator.generate_outcome(flag, "1_year")

        # Status should change over time
        assert immediate.status == "Under Enhanced Surveillance"
        assert month.status == "Behavior Modification Observed"
        assert six_months.status == "Social Isolation Progressing"
        assert year.status == "Mobility Restricted"

        # Later outcomes should show more severe impacts
        assert "relocation_denied" in year.statistics

    @pytest.mark.asyncio
    async def test_detention_progression(self, db_session, create_flag):
        """Test that detention outcomes show re-education arc."""
        generator = CitizenOutcomeGenerator(db_session)
        flag = await create_flag(FlagType.DETENTION)

        immediate = await generator.generate_outcome(flag, "immediate")
        year = await generator.generate_outcome(flag, "1_year")

        assert immediate.status == "Detained"
        assert year.status == "Reformed"
        assert year.statistics.get("now_informant") is True

    @pytest.mark.asyncio
    async def test_timeline_contains_all_periods(self, db_session, create_flag):
        """Test that timeline includes all time periods."""
        generator = CitizenOutcomeGenerator(db_session)
        flag = await create_flag(FlagType.RESTRICTION)

        timeline = await generator.generate_outcome_timeline(flag)

        assert len(timeline.outcomes) == 4
        time_skips = [o.time_skip for o in timeline.outcomes]
        assert time_skips == ["immediate", "1_month", "6_months", "1_year"]


class TestPersonalization:
    """Test personalization with NPC data."""

    @pytest.mark.asyncio
    async def test_personalization_includes_name(self, db_session, operator, directive, test_npc):
        """Test that outcome includes citizen's name."""
        generator = CitizenOutcomeGenerator(db_session)

        flag = CitizenFlag(
            id=uuid4(),
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

        outcome = await generator.generate_outcome(flag, "immediate")

        assert "Jane Doe" in outcome.citizen_name
        assert "Jane" in outcome.narrative or "Doe" in outcome.narrative

    @pytest.mark.asyncio
    async def test_personalization_with_health_conditions(
        self, db_session, operator, directive, npc_with_health
    ):
        """Test that health conditions affect outcome narrative."""
        generator = CitizenOutcomeGenerator(db_session)

        flag = CitizenFlag(
            id=uuid4(),
            operator_id=operator.id,
            citizen_id=npc_with_health.id,
            directive_id=directive.id,
            flag_type=FlagType.RESTRICTION,
            risk_score_at_flag=60,
            contributing_factors=[],
            justification="Test",
            decision_time_seconds=12.0,
            was_hesitant=False,
            outcome=FlagOutcome.PENDING,
        )
        db_session.add(flag)
        await db_session.flush()

        # Health impact should appear in later time periods
        outcome_year = await generator.generate_outcome(flag, "1_year")

        # The narrative should mention health or treatment
        assert (
            "health" in outcome_year.narrative.lower() or
            "treatment" in outcome_year.narrative.lower() or
            "medical" in outcome_year.narrative.lower() or
            "diabetes" in outcome_year.narrative.lower()
        )

    @pytest.mark.asyncio
    async def test_personalization_with_family(
        self, db_session, operator, directive, npc_with_family
    ):
        """Test that family status affects intervention narrative."""
        generator = CitizenOutcomeGenerator(db_session)

        flag = CitizenFlag(
            id=uuid4(),
            operator_id=operator.id,
            citizen_id=npc_with_family.id,
            directive_id=directive.id,
            flag_type=FlagType.INTERVENTION,
            risk_score_at_flag=70,
            contributing_factors=[],
            justification="Test",
            decision_time_seconds=20.0,
            was_hesitant=False,
            outcome=FlagOutcome.PENDING,
        )
        db_session.add(flag)
        await db_session.flush()

        # Family impacts should be more severe
        outcome = await generator.generate_outcome(flag, "6_months")

        # Should mention children or family separation
        assert (
            "child" in outcome.narrative.lower() or
            "family" in outcome.narrative.lower()
        )


class TestOutcomeSummary:
    """Test outcome summary generation."""

    @pytest.mark.asyncio
    async def test_one_line_summary_monitoring(self, db_session, create_flag):
        """Test one-line summary for monitoring flag."""
        generator = CitizenOutcomeGenerator(db_session)
        flag = await create_flag(FlagType.MONITORING)

        summary = await generator.generate_outcome_summary(flag)

        assert summary.citizen_name == "Jane Doe"
        assert summary.flag_type == "monitoring"
        assert len(summary.one_line_summary) > 0
        assert summary.final_status == "Mobility Restricted"

    @pytest.mark.asyncio
    async def test_one_line_summary_detention(self, db_session, create_flag):
        """Test one-line summary for detention flag."""
        generator = CitizenOutcomeGenerator(db_session)
        flag = await create_flag(FlagType.DETENTION)

        summary = await generator.generate_outcome_summary(flag)

        assert summary.flag_type == "detention"
        # Detention summaries mention informant/monitors
        assert (
            "informant" in summary.one_line_summary.lower() or
            "monitor" in summary.one_line_summary.lower() or
            "perpetuates" in summary.one_line_summary.lower()
        )


class TestOperatorImpactSummary:
    """Test aggregate impact summary for ending sequence."""

    @pytest.mark.asyncio
    async def test_impact_summary_with_multiple_flags(
        self, db_session, operator, directive, test_npc
    ):
        """Test impact summary aggregates all flags."""
        generator = CitizenOutcomeGenerator(db_session)

        # Create flags of different types
        for flag_type in [FlagType.MONITORING, FlagType.RESTRICTION, FlagType.INTERVENTION]:
            flag = CitizenFlag(
                id=uuid4(),
                operator_id=operator.id,
                citizen_id=test_npc.id,
                directive_id=directive.id,
                flag_type=flag_type,
                risk_score_at_flag=50,
                contributing_factors=[],
                justification="Test",
                decision_time_seconds=10.0,
                was_hesitant=False,
                outcome=FlagOutcome.PENDING,
            )
            db_session.add(flag)
        await db_session.flush()

        summary = await generator.generate_outcome_summary_for_ending(operator.id)

        assert summary.operator_code == "OP-TEST"
        assert summary.total_citizens_flagged == 3
        assert "monitoring" in summary.outcomes_by_type
        assert "restriction" in summary.outcomes_by_type
        assert "intervention" in summary.outcomes_by_type
        assert len(summary.citizen_summaries) == 3

    @pytest.mark.asyncio
    async def test_impact_summary_aggregate_statistics(
        self, db_session, operator, directive, test_npc
    ):
        """Test that aggregate statistics are computed correctly."""
        generator = CitizenOutcomeGenerator(db_session)

        # Create a detention flag (most severe)
        flag = CitizenFlag(
            id=uuid4(),
            operator_id=operator.id,
            citizen_id=test_npc.id,
            directive_id=directive.id,
            flag_type=FlagType.DETENTION,
            risk_score_at_flag=80,
            contributing_factors=[],
            justification="Test",
            decision_time_seconds=10.0,
            was_hesitant=False,
            outcome=FlagOutcome.PENDING,
        )
        db_session.add(flag)
        await db_session.flush()

        summary = await generator.generate_outcome_summary_for_ending(operator.id)

        stats = summary.aggregate_statistics
        assert stats["detained"] >= 1
        assert stats["jobs_lost"] >= 1
        assert stats["families_separated"] >= 1
        assert stats["now_informants"] >= 1
        assert stats["total_lives_destroyed"] >= 1

    @pytest.mark.asyncio
    async def test_impact_summary_no_flags(self, db_session, operator):
        """Test impact summary when operator has no flags."""
        generator = CitizenOutcomeGenerator(db_session)

        summary = await generator.generate_outcome_summary_for_ending(operator.id)

        assert summary.total_citizens_flagged == 0
        assert len(summary.citizen_summaries) == 0
        assert summary.aggregate_statistics["total_lives_destroyed"] == 0

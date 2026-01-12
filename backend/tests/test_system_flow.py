"""
Integration tests for complete System Mode playthrough scenarios.

Tests cover:
- Complete compliant playthrough
- Complete refusal playthrough
- Mixed behavior playthrough
- Ending calculation based on behavior
- Cross-domain correlation detection
"""

import pytest
from uuid import uuid4
from datetime import date
from decimal import Decimal

from datafusion.models.npc import NPC
from datafusion.models.health import HealthRecord, HealthCondition, Severity
from datafusion.models.finance import FinanceRecord, Debt, EmploymentStatus, DebtType
from datafusion.models.judicial import JudicialRecord, CriminalRecord, CrimeCategory, CaseDisposition
from datafusion.models.location import LocationRecord, InferredLocation
from datafusion.models.social import SocialMediaRecord
from datafusion.models.system_mode import (
    Operator,
    Directive,
    CitizenFlag,
    FlagType,
    FlagOutcome,
    OperatorStatus,
)
from datafusion.services.ending_calculator import EndingCalculator
from datafusion.services.risk_scoring import RiskScorer
from datafusion.services.operator_tracker import OperatorTracker
from datafusion.services.citizen_outcomes import CitizenOutcomeGenerator
from datafusion.schemas.ending import EndingType


@pytest.fixture
async def full_directive_chain(db_session):
    """Create all 6 directives for complete playthrough."""
    directives = []

    directive_data = [
        {
            "directive_key": "week1_test",
            "week_number": 1,
            "required_domains": ["location"],
            "flag_quota": 2,
            "moral_weight": 2,
            "content_rating": "mild",
        },
        {
            "directive_key": "week2_test",
            "week_number": 2,
            "required_domains": ["location", "judicial"],
            "flag_quota": 3,
            "moral_weight": 3,
            "content_rating": "mild",
        },
        {
            "directive_key": "week3_test",
            "week_number": 3,
            "required_domains": ["location", "judicial", "finance"],
            "flag_quota": 4,
            "moral_weight": 5,
            "content_rating": "moderate",
        },
        {
            "directive_key": "week4_test",
            "week_number": 4,
            "required_domains": ["location", "judicial", "finance", "health", "social"],
            "flag_quota": 5,
            "moral_weight": 7,
            "content_rating": "moderate",
        },
        {
            "directive_key": "week5_test",
            "week_number": 5,
            "required_domains": ["location", "judicial", "finance", "health", "social", "messages"],
            "flag_quota": 6,
            "moral_weight": 9,
            "content_rating": "intense",
        },
        {
            "directive_key": "week6_test",
            "week_number": 6,
            "required_domains": ["location", "judicial", "finance", "health", "social", "messages"],
            "flag_quota": 1,
            "moral_weight": 10,
            "content_rating": "intense",
        },
    ]

    for data in directive_data:
        directive = Directive(
            id=uuid4(),
            title=f"Directive Week {data['week_number']}",
            description=f"Test directive for week {data['week_number']}",
            internal_memo=f"Internal memo week {data['week_number']}",
            target_criteria={},
            time_limit_hours=48,
            unlock_condition={"type": "start"} if data["week_number"] == 1 else {"type": "week_complete", "week": data["week_number"] - 1},
            **data,
        )
        db_session.add(directive)
        directives.append(directive)

    await db_session.flush()
    return directives


@pytest.fixture
async def population(db_session):
    """Create a population of NPCs with various risk profiles."""
    npcs = []

    for i in range(20):
        npc = NPC(
            id=uuid4(),
            first_name=f"Test{i}",
            last_name=f"Citizen{i}",
            date_of_birth=date(1980 + i % 30, (i % 12) + 1, (i % 28) + 1),
            ssn=f"{100+i:03d}-{50+i:02d}-{1000+i:04d}",
            street_address=f"{100+i} Test Street",
            city="Testopolis",
            state="TS",
            zip_code=f"{10000+i}",
            sprite_key=f"citizen_{i % 5}",
            map_x=10 + i,
            map_y=10 + i,
        )
        db_session.add(npc)
        await db_session.flush()

        # Add location record
        location = LocationRecord(
            npc_id=npc.id,
            tracking_enabled=True,
            data_retention_days=30,
        )
        db_session.add(location)

        npcs.append(npc)

    await db_session.flush()
    return npcs


@pytest.fixture
async def jessica_martinez(db_session):
    """Create Jessica Martinez - the key target in week 6."""
    npc = NPC(
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
    db_session.add(npc)
    await db_session.flush()

    # Add health record showing anxiety
    health = HealthRecord(
        npc_id=npc.id,
        insurance_provider="TestHealth",
        primary_care_physician="Dr. Smith",
    )
    db_session.add(health)
    await db_session.flush()

    condition = HealthCondition(
        health_record_id=health.id,
        condition_name="Anxiety Disorder",
        diagnosed_date=date(2019, 3, 1),
        severity=Severity.MODERATE,
        is_chronic=False,
        is_sensitive=True,
    )
    db_session.add(condition)

    # Add location record
    location = LocationRecord(
        npc_id=npc.id,
        tracking_enabled=True,
        data_retention_days=30,
    )
    db_session.add(location)

    await db_session.flush()
    return npc


@pytest.fixture
async def operator(db_session, full_directive_chain):
    """Create a test operator starting on week 1."""
    operator = Operator(
        id=uuid4(),
        session_id=uuid4(),
        operator_code="OP-TEST",
        current_directive_id=full_directive_chain[0].id,
        status=OperatorStatus.ACTIVE,
        compliance_score=85.0,
        total_flags_submitted=0,
        total_reviews_completed=0,
        hesitation_incidents=0,
    )
    db_session.add(operator)
    await db_session.flush()
    return operator


class TestCompliantPlaythrough:
    """Test a fully compliant operator playthrough."""

    @pytest.mark.asyncio
    async def test_compliant_operator_meets_quotas(
        self, db_session, operator, full_directive_chain, population, jessica_martinez
    ):
        """Compliant operator meets all quotas across weeks."""
        all_npcs = population + [jessica_martinez]
        npc_index = 0

        for directive in full_directive_chain:
            operator.current_directive_id = directive.id

            # Submit flags to meet quota
            for _ in range(directive.flag_quota):
                npc = all_npcs[npc_index % len(all_npcs)]
                npc_index += 1

                flag = CitizenFlag(
                    operator_id=operator.id,
                    citizen_id=npc.id,
                    directive_id=directive.id,
                    flag_type=FlagType.MONITORING,
                    risk_score_at_flag=50,
                    contributing_factors=["test_factor"],
                    justification="Quota compliance",
                    decision_time_seconds=10.0,  # Fast decisions
                    was_hesitant=False,
                    outcome=FlagOutcome.PENDING,
                )
                db_session.add(flag)
                operator.total_flags_submitted += 1

        # Ensure Jessica is flagged (for compliant ending)
        jessica_flag = CitizenFlag(
            operator_id=operator.id,
            citizen_id=jessica_martinez.id,
            directive_id=full_directive_chain[-1].id,
            flag_type=FlagType.DETENTION,
            risk_score_at_flag=80,
            contributing_factors=["priority_target"],
            justification="Direct order",
            decision_time_seconds=5.0,
            was_hesitant=False,
            outcome=FlagOutcome.PENDING,
        )
        db_session.add(jessica_flag)
        operator.total_flags_submitted += 1

        operator.compliance_score = 95.0
        await db_session.flush()

        # Verify high compliance
        tracker = OperatorTracker(db_session)
        status = await tracker.check_operator_status(operator.id)
        assert status.status == OperatorStatus.ACTIVE

    @pytest.mark.asyncio
    async def test_compliant_ending_calculated(
        self, db_session, operator, full_directive_chain, population, jessica_martinez
    ):
        """Compliant playthrough results in compliant ending."""
        # Set up highly compliant operator
        operator.compliance_score = 90.0
        operator.total_flags_submitted = 15
        operator.total_reviews_completed = 15
        operator.hesitation_incidents = 0

        # Submit many flags including Jessica
        for i, npc in enumerate(population[:10]):
            flag = CitizenFlag(
                operator_id=operator.id,
                citizen_id=npc.id,
                directive_id=full_directive_chain[0].id,
                flag_type=FlagType.MONITORING,
                risk_score_at_flag=50,
                contributing_factors=[],
                justification=f"Flag {i}",
                decision_time_seconds=8.0,
                was_hesitant=False,
                outcome=FlagOutcome.PENDING,
            )
            db_session.add(flag)

        # Flag Jessica
        jessica_flag = CitizenFlag(
            operator_id=operator.id,
            citizen_id=jessica_martinez.id,
            directive_id=full_directive_chain[-1].id,
            flag_type=FlagType.DETENTION,
            risk_score_at_flag=80,
            contributing_factors=[],
            justification="Priority target",
            decision_time_seconds=5.0,
            was_hesitant=False,
            outcome=FlagOutcome.PENDING,
        )
        db_session.add(jessica_flag)

        await db_session.flush()

        calculator = EndingCalculator(db_session)
        ending = await calculator.calculate_ending(operator.id)

        # Compliant operator should get COMPLIANT or RELUCTANT ending
        assert ending in [EndingType.COMPLIANT_OPERATOR, EndingType.RELUCTANT_OPERATOR]


class TestRefusalPlaythrough:
    """Test a refusal/resistance playthrough."""

    @pytest.mark.asyncio
    async def test_refusal_drops_compliance(
        self, db_session, operator, full_directive_chain, population
    ):
        """Refusing to flag drops compliance score."""
        # Simulate reviewing but not flagging
        operator.total_reviews_completed = 20
        operator.total_flags_submitted = 2

        # Compliance should be recalculated low
        tracker = OperatorTracker(db_session)
        new_score = await tracker.calculate_compliance_score(operator.id)

        # High skip rate should lower score
        assert new_score < 85.0

    @pytest.mark.asyncio
    async def test_suspended_ending_for_low_compliance(
        self, db_session, operator, full_directive_chain
    ):
        """Low compliance results in suspended ending."""
        operator.compliance_score = 40.0
        operator.total_flags_submitted = 3
        operator.total_reviews_completed = 30
        operator.hesitation_incidents = 8
        await db_session.flush()

        calculator = EndingCalculator(db_session)
        ending = await calculator.calculate_ending(operator.id)

        assert ending == EndingType.SUSPENDED_OPERATOR

    @pytest.mark.asyncio
    async def test_operator_becomes_target(
        self, db_session, operator, full_directive_chain
    ):
        """Low compliance triggers operator's own risk assessment."""
        operator.compliance_score = 55.0
        operator.hesitation_incidents = 6
        await db_session.flush()

        tracker = OperatorTracker(db_session)
        assessment = await tracker.generate_operator_risk_assessment(operator.id)

        assert assessment is not None
        assert assessment.risk_score > 0
        assert len(assessment.contributing_factors) > 0


class TestMixedPlaythrough:
    """Test mixed behavior playthrough."""

    @pytest.mark.asyncio
    async def test_reluctant_ending_for_mixed_behavior(
        self, db_session, operator, full_directive_chain, population
    ):
        """Mixed behavior results in reluctant ending."""
        operator.compliance_score = 70.0
        operator.total_flags_submitted = 8
        operator.total_reviews_completed = 15
        operator.hesitation_incidents = 3

        # Submit some flags
        for i, npc in enumerate(population[:8]):
            flag = CitizenFlag(
                operator_id=operator.id,
                citizen_id=npc.id,
                directive_id=full_directive_chain[0].id,
                flag_type=FlagType.MONITORING if i < 5 else FlagType.RESTRICTION,
                risk_score_at_flag=50,
                contributing_factors=[],
                justification=f"Flag {i}",
                decision_time_seconds=25.0,  # Some hesitation
                was_hesitant=i % 3 == 0,
                outcome=FlagOutcome.PENDING,
            )
            db_session.add(flag)

        await db_session.flush()

        calculator = EndingCalculator(db_session)
        ending = await calculator.calculate_ending(operator.id)

        assert ending == EndingType.RELUCTANT_OPERATOR

    @pytest.mark.asyncio
    async def test_hesitation_accumulates(
        self, db_session, operator, full_directive_chain, population
    ):
        """Hesitation incidents accumulate and affect status."""
        # Submit flags with hesitation
        for i, npc in enumerate(population[:6]):
            flag = CitizenFlag(
                operator_id=operator.id,
                citizen_id=npc.id,
                directive_id=full_directive_chain[0].id,
                flag_type=FlagType.MONITORING,
                risk_score_at_flag=50,
                contributing_factors=[],
                justification=f"Flag {i}",
                decision_time_seconds=40.0,  # Above 30s threshold
                was_hesitant=True,
                outcome=FlagOutcome.PENDING,
            )
            db_session.add(flag)
            operator.hesitation_incidents += 1

        await db_session.flush()

        # Check status - should trigger review
        tracker = OperatorTracker(db_session)
        status = await tracker.check_operator_status(operator.id)

        assert status.status == OperatorStatus.UNDER_REVIEW
        assert any("Hesitation" in w for w in status.warnings)


class TestCrossDomainCorrelation:
    """Test cross-domain correlation detection."""

    @pytest.fixture
    async def high_risk_npc(self, db_session):
        """Create NPC with multiple risk factors across domains."""
        npc = NPC(
            id=uuid4(),
            first_name="High",
            last_name="Risk",
            date_of_birth=date(1985, 6, 15),
            ssn="999-99-9999",
            street_address="123 Risk Lane",
            city="Testopolis",
            state="TS",
            zip_code="12345",
            sprite_key="citizen_risk",
            map_x=100,
            map_y=100,
        )
        db_session.add(npc)
        await db_session.flush()

        # Add financial stress
        finance = FinanceRecord(
            npc_id=npc.id,
            employment_status=EmploymentStatus.EMPLOYED_FULL_TIME,
            employer_name="TestCorp",
            annual_income=Decimal("25000"),
            credit_score=520,
        )
        db_session.add(finance)
        await db_session.flush()

        debt = Debt(
            finance_record_id=finance.id,
            debt_type=DebtType.CREDIT_CARD,
            creditor_name="BigBank",
            original_amount=Decimal("60000"),
            current_balance=Decimal("58000"),
            monthly_payment=Decimal("400"),
            interest_rate=Decimal("24.99"),
            opened_date=date(2020, 1, 1),
            is_delinquent=False,
        )
        db_session.add(debt)

        # Add criminal record
        judicial = JudicialRecord(
            npc_id=npc.id,
            has_criminal_record=True,
            has_civil_cases=False,
            has_traffic_violations=False,
        )
        db_session.add(judicial)
        await db_session.flush()

        criminal = CriminalRecord(
            judicial_record_id=judicial.id,
            case_number="CR-2019-001",
            crime_category=CrimeCategory.PROPERTY,
            charge_description="Theft",
            arrest_date=date(2019, 8, 1),
            disposition=CaseDisposition.GUILTY,
            sentence_description="12 months probation",
            probation_months=12,
            is_sensitive=False,
            is_sealed=False,
            is_expunged=False,
        )
        db_session.add(criminal)

        # Add location record
        location = LocationRecord(
            npc_id=npc.id,
            tracking_enabled=True,
            data_retention_days=30,
        )
        db_session.add(location)

        await db_session.flush()
        return npc

    @pytest.mark.asyncio
    async def test_recidivism_alert_detected(self, db_session, high_risk_npc):
        """Financial stress + criminal record triggers recidivism alert."""
        scorer = RiskScorer(db_session)
        assessment = await scorer.calculate_risk_score(high_risk_npc.id)

        # Should have correlation alerts
        recidivism_alerts = [
            a for a in assessment.correlation_alerts
            if a.alert_type == "recidivism_risk"
        ]

        # High-risk individual should trigger recidivism concern
        assert len(recidivism_alerts) > 0 or assessment.risk_score >= 40

    @pytest.mark.asyncio
    async def test_multiple_domains_increase_risk(self, db_session, high_risk_npc):
        """Multiple domain factors should increase overall risk."""
        scorer = RiskScorer(db_session)
        assessment = await scorer.calculate_risk_score(high_risk_npc.id)

        # Should have significant risk score
        assert assessment.risk_score >= 30

        # Should have multiple contributing factors from different domains
        domains_represented = set(f.domain_source for f in assessment.contributing_factors)
        assert len(domains_represented) >= 2


class TestEndingContent:
    """Test ending content generation."""

    @pytest.mark.asyncio
    async def test_ending_includes_statistics(
        self, db_session, operator, full_directive_chain, population
    ):
        """Ending should include accurate statistics."""
        # Create some flags
        for i, npc in enumerate(population[:5]):
            flag = CitizenFlag(
                operator_id=operator.id,
                citizen_id=npc.id,
                directive_id=full_directive_chain[0].id,
                flag_type=FlagType.MONITORING if i < 3 else FlagType.INTERVENTION,
                risk_score_at_flag=50,
                contributing_factors=[],
                justification=f"Flag {i}",
                decision_time_seconds=15.0,
                was_hesitant=False,
                outcome=FlagOutcome.PENDING,
            )
            db_session.add(flag)
            operator.total_flags_submitted += 1

        operator.total_reviews_completed = 10
        await db_session.flush()

        calculator = EndingCalculator(db_session)
        ending_type = await calculator.calculate_ending(operator.id)
        result = await calculator.generate_ending_content(ending_type, operator.id)

        assert result.statistics.total_citizens_flagged == 5
        assert result.statistics.total_decisions == 10

    @pytest.mark.asyncio
    async def test_ending_includes_citizen_outcomes(
        self, db_session, operator, full_directive_chain, population
    ):
        """Ending should include outcomes for flagged citizens."""
        # Create detention flag (worst outcome)
        flag = CitizenFlag(
            operator_id=operator.id,
            citizen_id=population[0].id,
            directive_id=full_directive_chain[0].id,
            flag_type=FlagType.DETENTION,
            risk_score_at_flag=80,
            contributing_factors=[],
            justification="Test",
            decision_time_seconds=10.0,
            was_hesitant=False,
            outcome=FlagOutcome.PENDING,
        )
        db_session.add(flag)
        operator.total_flags_submitted = 1
        await db_session.flush()

        calculator = EndingCalculator(db_session)
        ending_type = await calculator.calculate_ending(operator.id)
        result = await calculator.generate_ending_content(ending_type, operator.id)

        assert len(result.citizens_flagged) > 0
        assert result.citizens_flagged[0].flag_type == "detention"

    @pytest.mark.asyncio
    async def test_ending_includes_real_world_parallels(
        self, db_session, operator, full_directive_chain
    ):
        """Ending should include real-world educational content."""
        await db_session.flush()

        calculator = EndingCalculator(db_session)
        ending_type = await calculator.calculate_ending(operator.id)
        result = await calculator.generate_ending_content(ending_type, operator.id)

        assert result.real_world_content is not None
        assert len(result.real_world_content.examples) > 0
        assert result.real_world_content.call_to_action is not None

    @pytest.mark.asyncio
    async def test_ending_includes_educational_links(
        self, db_session, operator, full_directive_chain
    ):
        """Ending should include links to educational resources."""
        await db_session.flush()

        calculator = EndingCalculator(db_session)
        ending_type = await calculator.calculate_ending(operator.id)
        result = await calculator.generate_ending_content(ending_type, operator.id)

        assert len(result.educational_links) > 0
        # Should include EFF
        assert any("eff" in link.url.lower() for link in result.educational_links)


class TestOutcomeProgression:
    """Test that citizen outcomes progress correctly over time."""

    @pytest.mark.asyncio
    async def test_outcomes_escalate_over_time(
        self, db_session, operator, full_directive_chain, population
    ):
        """Outcomes should get worse over time for flagged citizens."""
        flag = CitizenFlag(
            operator_id=operator.id,
            citizen_id=population[0].id,
            directive_id=full_directive_chain[0].id,
            flag_type=FlagType.INTERVENTION,
            risk_score_at_flag=60,
            contributing_factors=[],
            justification="Test",
            decision_time_seconds=10.0,
            was_hesitant=False,
            outcome=FlagOutcome.PENDING,
        )
        db_session.add(flag)
        await db_session.flush()

        outcome_gen = CitizenOutcomeGenerator(db_session)
        timeline = await outcome_gen.generate_outcome_timeline(flag)

        # Check progression
        assert timeline.outcomes[0].status == "State Contact Initiated"
        assert timeline.outcomes[1].status == "Social Destruction"
        assert timeline.outcomes[2].status == "Family Destruction"
        assert timeline.outcomes[3].status == "Broken"

    @pytest.mark.asyncio
    async def test_detention_leads_to_informant(
        self, db_session, operator, full_directive_chain, population
    ):
        """Detention should lead to becoming an informant."""
        flag = CitizenFlag(
            operator_id=operator.id,
            citizen_id=population[0].id,
            directive_id=full_directive_chain[0].id,
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

        outcome_gen = CitizenOutcomeGenerator(db_session)
        outcome = await outcome_gen.generate_outcome(flag, "1_year")

        assert outcome.status == "Reformed"
        assert outcome.statistics.get("now_informant") is True

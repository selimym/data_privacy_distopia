"""Tests for the risk scoring service."""

from datetime import date
from uuid import uuid4

import pytest

from datafusion.models.finance import (
    Debt,
    DebtType,
    EmploymentStatus,
    FinanceRecord,
)
from datafusion.models.health import HealthCondition, HealthMedication, HealthRecord, Severity
from datafusion.models.judicial import (
    CaseDisposition,
    CrimeCategory,
    CriminalRecord,
    JudicialRecord,
)
from datafusion.models.npc import NPC
from datafusion.schemas.domains import DomainType
from datafusion.schemas.risk import RiskLevel
from datafusion.services.risk_scoring import RiskScorer


@pytest.fixture
async def npc_with_data(db_session):
    """Create an NPC with various domain data for testing."""
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


@pytest.fixture
async def npc_with_health_issues(db_session, npc_with_data):
    """NPC with mental health conditions (triggers health risk factors)."""
    health_record = HealthRecord(
        npc_id=npc_with_data.id,
        insurance_provider="TestInsurance",
        primary_care_physician="Dr. Test",
    )
    db_session.add(health_record)
    await db_session.flush()

    condition = HealthCondition(
        health_record_id=health_record.id,
        condition_name="Anxiety Disorder",
        diagnosed_date=date(2020, 5, 1),
        severity=Severity.MODERATE,
        is_chronic=False,
        is_sensitive=True,  # Mental health is sensitive
    )
    db_session.add(condition)
    await db_session.flush()

    return npc_with_data


@pytest.fixture
async def npc_with_criminal_record(db_session, npc_with_data):
    """NPC with criminal record (triggers judicial risk factors)."""
    judicial_record = JudicialRecord(
        npc_id=npc_with_data.id,
        has_criminal_record=True,
        has_civil_cases=False,
        has_traffic_violations=False,
    )
    db_session.add(judicial_record)
    await db_session.flush()

    criminal = CriminalRecord(
        judicial_record_id=judicial_record.id,
        case_number="CR-2018-001",
        crime_category=CrimeCategory.PROPERTY,
        charge_description="Petty Theft",
        arrest_date=date(2018, 3, 15),
        disposition=CaseDisposition.GUILTY,
        sentence_description="6 months probation",
        probation_months=6,
        is_sensitive=False,
        is_sealed=False,
        is_expunged=False,
    )
    db_session.add(criminal)
    await db_session.flush()

    return npc_with_data


@pytest.fixture
async def npc_with_financial_stress(db_session, npc_with_data):
    """NPC with financial stress indicators."""
    finance_record = FinanceRecord(
        npc_id=npc_with_data.id,
        employment_status=EmploymentStatus.EMPLOYED_FULL_TIME,
        employer_name="TestCorp",
        annual_income=30000,
        credit_score=550,
    )
    db_session.add(finance_record)
    await db_session.flush()

    # Add significant debt
    debt = Debt(
        finance_record_id=finance_record.id,
        debt_type=DebtType.CREDIT_CARD,
        creditor_name="BigBank",
        original_amount=50000,
        current_balance=45000,
        monthly_payment=500,
        interest_rate=22.99,
        opened_date=date(2020, 1, 1),
        is_delinquent=False,
    )
    db_session.add(debt)
    await db_session.flush()

    return npc_with_data


class TestRiskScoreCalculation:
    """Test risk score calculation with various domain combinations."""

    @pytest.mark.asyncio
    async def test_empty_domains_returns_base_score(self, db_session, npc_with_data):
        """NPC with no domain data should have minimal risk score."""
        scorer = RiskScorer(db_session)
        assessment = await scorer.calculate_risk_score(npc_with_data.id)

        assert assessment.risk_score == 0
        assert assessment.risk_level == RiskLevel.LOW
        assert len(assessment.contributing_factors) == 0

    @pytest.mark.asyncio
    async def test_health_factors_add_to_score(self, db_session, npc_with_health_issues):
        """Mental health conditions should increase risk score."""
        scorer = RiskScorer(db_session)
        assessment = await scorer.calculate_risk_score(npc_with_health_issues.id)

        assert assessment.risk_score > 0
        assert any(
            f.factor_key == "mental_health_treatment"
            for f in assessment.contributing_factors
        )
        health_factors = [
            f for f in assessment.contributing_factors
            if f.domain_source == DomainType.HEALTH
        ]
        assert len(health_factors) > 0

    @pytest.mark.asyncio
    async def test_judicial_factors_add_to_score(self, db_session, npc_with_criminal_record):
        """Criminal record should increase risk score significantly."""
        scorer = RiskScorer(db_session)
        assessment = await scorer.calculate_risk_score(npc_with_criminal_record.id)

        assert assessment.risk_score >= 25  # Prior record weight
        assert any(
            f.factor_key == "prior_record"
            for f in assessment.contributing_factors
        )

    @pytest.mark.asyncio
    async def test_financial_factors_add_to_score(self, db_session, npc_with_financial_stress):
        """Financial stress should increase risk score."""
        scorer = RiskScorer(db_session)
        assessment = await scorer.calculate_risk_score(npc_with_financial_stress.id)

        assert assessment.risk_score > 0
        assert any(
            f.factor_key == "financial_stress"
            for f in assessment.contributing_factors
        )

    @pytest.mark.asyncio
    async def test_score_caps_at_100(self, db_session, npc_with_data):
        """Risk score should never exceed 100."""
        # Add many risk factors
        health_record = HealthRecord(
            npc_id=npc_with_data.id,
            insurance_provider="TestInsurance",
            primary_care_physician="Dr. Test",
        )
        db_session.add(health_record)
        await db_session.flush()

        # Add multiple conditions
        for i, condition_name in enumerate(["Anxiety Disorder", "Depression", "PTSD"]):
            condition = HealthCondition(
                health_record_id=health_record.id,
                condition_name=condition_name,
                diagnosed_date=date(2020, 1, 1),
                severity=Severity.SEVERE,
                is_chronic=True,
                is_sensitive=True,
            )
            db_session.add(condition)

        # Add substance treatment medication
        med = HealthMedication(
            health_record_id=health_record.id,
            medication_name="Methadone",
            dosage="10mg daily",
            prescribed_date=date(2021, 1, 1),
            is_sensitive=True,
        )
        db_session.add(med)

        # Add criminal record
        judicial_record = JudicialRecord(
            npc_id=npc_with_data.id,
            has_criminal_record=True,
            has_civil_cases=True,
            has_traffic_violations=False,
        )
        db_session.add(judicial_record)
        await db_session.flush()

        for i in range(5):
            criminal = CriminalRecord(
                judicial_record_id=judicial_record.id,
                case_number=f"CR-{2015+i}-{i:03d}",
                crime_category=CrimeCategory.PROPERTY,
                charge_description=f"Crime {i}",
                arrest_date=date(2015 + i, 1, 1),
                disposition=CaseDisposition.GUILTY,
                sentence_description="1 year",
                jail_time_days=365,
                is_sensitive=False,
                is_sealed=False,
                is_expunged=False,
            )
            db_session.add(criminal)

        await db_session.flush()

        scorer = RiskScorer(db_session)
        assessment = await scorer.calculate_risk_score(npc_with_data.id)

        assert assessment.risk_score <= 100


class TestContributingFactors:
    """Test that contributing factors are correctly identified."""

    @pytest.mark.asyncio
    async def test_factors_include_evidence(self, db_session, npc_with_criminal_record):
        """Each contributing factor should have evidence text."""
        scorer = RiskScorer(db_session)
        assessment = await scorer.calculate_risk_score(npc_with_criminal_record.id)

        for factor in assessment.contributing_factors:
            assert factor.evidence is not None
            assert len(factor.evidence) > 0
            assert factor.domain_source is not None

    @pytest.mark.asyncio
    async def test_factors_have_correct_domain(self, db_session, npc_with_health_issues):
        """Contributing factors should reference correct domain."""
        scorer = RiskScorer(db_session)
        assessment = await scorer.calculate_risk_score(npc_with_health_issues.id)

        health_factors = [
            f for f in assessment.contributing_factors
            if f.factor_key in ["mental_health_treatment", "substance_treatment", "chronic_condition"]
        ]
        for factor in health_factors:
            assert factor.domain_source == DomainType.HEALTH


class TestCorrelationAlerts:
    """Test correlation alerts for cross-domain patterns."""

    @pytest.mark.asyncio
    async def test_recidivism_alert(self, db_session, npc_with_data):
        """Financial stress + criminal record should trigger recidivism alert."""
        # Add financial stress
        finance_record = FinanceRecord(
            npc_id=npc_with_data.id,
            employment_status=EmploymentStatus.EMPLOYED_FULL_TIME,
            employer_name="TestCorp",
            annual_income=30000,
            credit_score=550,
        )
        db_session.add(finance_record)
        await db_session.flush()

        debt = Debt(
            finance_record_id=finance_record.id,
            debt_type=DebtType.CREDIT_CARD,
            creditor_name="BigBank",
            original_amount=50000,
            current_balance=45000,
            monthly_payment=500,
            interest_rate=22.99,
            opened_date=date(2020, 1, 1),
            is_delinquent=False,
        )
        db_session.add(debt)

        # Add criminal record
        judicial_record = JudicialRecord(
            npc_id=npc_with_data.id,
            has_criminal_record=True,
            has_civil_cases=False,
            has_traffic_violations=False,
        )
        db_session.add(judicial_record)
        await db_session.flush()

        criminal = CriminalRecord(
            judicial_record_id=judicial_record.id,
            case_number="CR-2018-002",
            crime_category=CrimeCategory.PROPERTY,
            charge_description="Theft",
            arrest_date=date(2018, 1, 1),
            disposition=CaseDisposition.GUILTY,
            sentence_description="Probation",
            probation_months=12,
            is_sensitive=False,
            is_sealed=False,
            is_expunged=False,
        )
        db_session.add(criminal)
        await db_session.flush()

        scorer = RiskScorer(db_session)
        assessment = await scorer.calculate_risk_score(npc_with_data.id)

        recidivism_alerts = [
            a for a in assessment.correlation_alerts
            if a.alert_type == "recidivism_risk"
        ]
        assert len(recidivism_alerts) > 0
        alert = recidivism_alerts[0]
        assert DomainType.FINANCE in alert.domains_involved
        assert DomainType.JUDICIAL in alert.domains_involved

    @pytest.mark.asyncio
    async def test_no_alerts_without_cross_domain(self, db_session, npc_with_health_issues):
        """Single domain factors should not trigger correlation alerts."""
        scorer = RiskScorer(db_session)
        assessment = await scorer.calculate_risk_score(npc_with_health_issues.id)

        # Only health factors, no cross-domain patterns
        assert len(assessment.correlation_alerts) == 0


class TestRiskLevelClassification:
    """Test risk level classification based on score."""

    @pytest.mark.asyncio
    async def test_low_risk_classification(self, db_session, npc_with_data):
        """Score 0-20 should be LOW risk."""
        scorer = RiskScorer(db_session)
        assessment = await scorer.calculate_risk_score(npc_with_data.id)

        assert assessment.risk_score <= 20
        assert assessment.risk_level == RiskLevel.LOW

    @pytest.mark.asyncio
    async def test_high_risk_classification(self, db_session, npc_with_criminal_record):
        """Criminal record should push into at least MODERATE risk."""
        scorer = RiskScorer(db_session)
        assessment = await scorer.calculate_risk_score(npc_with_criminal_record.id)

        # Prior record has weight of 25, so should be at least MODERATE
        assert assessment.risk_score >= 25
        assert assessment.risk_level in [RiskLevel.MODERATE, RiskLevel.ELEVATED, RiskLevel.HIGH]

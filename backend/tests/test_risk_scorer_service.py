"""
Service-level tests for RiskScorer.

Tests the RiskScorer service in isolation with various data scenarios.
"""

from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from datafusion.models.finance import (
    Debt,
    DebtType,
    EmploymentStatus,
    FinanceRecord,
    Transaction,
    TransactionCategory,
)
from datafusion.models.health import HealthCondition, HealthRecord, Severity
from datafusion.models.judicial import (
    CaseDisposition,
    CrimeCategory,
    CriminalRecord,
    JudicialRecord,
)
from datafusion.models.location import InferredLocation, LocationRecord, LocationType
from datafusion.services.risk_scoring import RiskScorer

pytestmark = pytest.mark.asyncio


class TestRiskScorerService:
    """Test RiskScorer service functionality."""

    async def test_npc_with_no_data_returns_zero_risk(self, db_session: AsyncSession, test_npc):
        """NPC with no domain data should have 0 risk score."""
        scorer = RiskScorer(db_session)
        assessment = await scorer.calculate_risk_score(test_npc.id)

        assert assessment.risk_score == 0
        assert assessment.risk_level.value == "low"
        assert len(assessment.contributing_factors) == 0

    async def test_financial_stress_factor(self, db_session: AsyncSession, test_npc):
        """High debt-to-income ratio should trigger financial stress factor."""
        # Add finance record with high debt
        finance = FinanceRecord(
            npc_id=test_npc.id,
            employment_status=EmploymentStatus.EMPLOYED_FULL_TIME,
            employer_name="TestCorp",
            annual_income=Decimal("40000"),
            credit_score=550,
        )
        db_session.add(finance)
        await db_session.flush()

        # Add significant debt (100% of annual income)
        debt = Debt(
            finance_record_id=finance.id,
            debt_type=DebtType.CREDIT_CARD,
            creditor_name="BigBank",
            original_amount=Decimal("40000"),
            current_balance=Decimal("40000"),
            monthly_payment=Decimal("500"),
            interest_rate=Decimal("22.99"),
            opened_date=date(2020, 1, 1),
            is_delinquent=False,
        )
        db_session.add(debt)
        await db_session.flush()

        scorer = RiskScorer(db_session)
        assessment = await scorer.calculate_risk_score(test_npc.id)

        # Should have financial stress factor
        assert assessment.risk_score > 0
        factor_keys = [f.factor_key for f in assessment.contributing_factors]
        assert "financial_stress" in factor_keys

    async def test_multiple_factors_accumulate(self, db_session: AsyncSession, test_npc):
        """Multiple risk factors should accumulate risk score."""
        # Add financial data
        finance = FinanceRecord(
            npc_id=test_npc.id,
            employment_status=EmploymentStatus.UNEMPLOYED,
            employer_name="N/A",
            annual_income=Decimal("0"),
            credit_score=450,
        )
        db_session.add(finance)

        # Add health data with chronic condition
        health = HealthRecord(
            npc_id=test_npc.id,
            insurance_provider="TestHealth",
            primary_care_physician="Dr. Test",
        )
        db_session.add(health)
        await db_session.flush()

        condition = HealthCondition(
            health_record_id=health.id,
            condition_name="Chronic Test Condition",
            diagnosed_date=date(2020, 1, 1),
            severity=Severity.SEVERE,
            is_chronic=True,
            is_sensitive=False,
        )
        db_session.add(condition)

        # Add judicial record
        judicial = JudicialRecord(
            npc_id=test_npc.id,
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
            arrest_date=date(2019, 5, 10),
            disposition=CaseDisposition.GUILTY,
            is_sensitive=False,
            is_sealed=False,
            is_expunged=False,
        )
        db_session.add(criminal)
        await db_session.flush()

        scorer = RiskScorer(db_session)
        assessment = await scorer.calculate_risk_score(test_npc.id)

        # Should have multiple factors
        assert len(assessment.contributing_factors) >= 2
        assert assessment.risk_score > 20

    async def test_risk_level_classification(self, db_session: AsyncSession):
        """Test that risk scores are correctly classified into levels."""
        scorer = RiskScorer(db_session)

        # Test boundaries
        test_cases = [
            (0, "low"),
            (10, "low"),
            (20, "low"),
            (25, "moderate"),
            (35, "moderate"),
            (45, "elevated"),
            (55, "elevated"),
            (65, "high"),
            (75, "high"),
            (85, "severe"),
            (100, "severe"),
        ]

        for score, expected_level in test_cases:
            level = scorer._classify_risk_level(score)
            assert level.value == expected_level, (
                f"Score {score} should be {expected_level}, got {level.value}"
            )

    async def test_criminal_record_factor(self, db_session: AsyncSession, test_npc):
        """Criminal record should contribute to risk score."""
        judicial = JudicialRecord(
            npc_id=test_npc.id,
            has_criminal_record=True,
            has_civil_cases=False,
            has_traffic_violations=False,
        )
        db_session.add(judicial)
        await db_session.flush()

        criminal = CriminalRecord(
            judicial_record_id=judicial.id,
            case_number="CR-2020-042",
            crime_category=CrimeCategory.VIOLENT,
            charge_description="Assault",
            arrest_date=date(2020, 3, 15),
            disposition=CaseDisposition.GUILTY,
            sentence_description="6 months probation",
            probation_months=6,
            is_sensitive=True,
            is_sealed=False,
            is_expunged=False,
        )
        db_session.add(criminal)
        await db_session.flush()

        scorer = RiskScorer(db_session)
        assessment = await scorer.calculate_risk_score(test_npc.id)

        factor_keys = [f.factor_key for f in assessment.contributing_factors]
        assert "prior_record" in factor_keys
        assert assessment.risk_score > 0

    async def test_location_patterns_factor(self, db_session: AsyncSession, test_npc):
        """Suspicious location patterns should contribute to risk."""
        location_record = LocationRecord(
            npc_id=test_npc.id,
            tracking_enabled=True,
            data_retention_days=90,
        )
        db_session.add(location_record)
        await db_session.flush()

        # Add many diverse locations
        for i in range(15):
            location = InferredLocation(
                location_record_id=location_record.id,
                location_type=LocationType.OTHER,
                location_name=f"Location {i}",
                street_address=f"{i} Test St",
                city="TestCity",
                state="TS",
                zip_code="12345",
                typical_days="Various",
                visit_frequency="Occasional",
                privacy_implications="Test",
                is_sensitive=False,
                confidence_score=75,
            )
            db_session.add(location)

        await db_session.flush()

        scorer = RiskScorer(db_session)
        assessment = await scorer.calculate_risk_score(test_npc.id)

        # High location diversity should be flagged
        factor_keys = [f.factor_key for f in assessment.contributing_factors]
        assert "irregular_patterns" in factor_keys

    async def test_health_condition_with_correct_fields(self, db_session: AsyncSession, test_npc):
        """Test that health conditions use correct field names."""
        health = HealthRecord(
            npc_id=test_npc.id,
            insurance_provider="Test Insurance",
            primary_care_physician="Dr. Test",
        )
        db_session.add(health)
        await db_session.flush()

        # Add mental health condition
        condition = HealthCondition(
            health_record_id=health.id,
            condition_name="Anxiety Disorder",  # Note: condition_name, not name
            diagnosed_date=date(2021, 6, 15),
            severity=Severity.MODERATE,
            is_chronic=True,
            is_sensitive=True,
        )
        db_session.add(condition)
        await db_session.flush()

        scorer = RiskScorer(db_session)
        # Should not raise AttributeError
        assessment = await scorer.calculate_risk_score(test_npc.id)

        assert assessment is not None
        factor_keys = [f.factor_key for f in assessment.contributing_factors]
        assert "mental_health_treatment" in factor_keys

    async def test_correlation_alerts_generation(self, db_session: AsyncSession, test_npc):
        """Test that cross-domain correlation alerts are generated."""
        # Add finance data (financial stress)
        finance = FinanceRecord(
            npc_id=test_npc.id,
            employment_status=EmploymentStatus.UNEMPLOYED,
            employer_name="N/A",
            annual_income=Decimal("24000"),  # Need income > 0 for debt-to-income calculation
            credit_score=400,
        )
        db_session.add(finance)
        await db_session.flush()

        # Add debt to trigger financial_stress factor
        debt = Debt(
            finance_record_id=finance.id,
            debt_type=DebtType.MEDICAL_DEBT,
            creditor_name="City Hospital",
            original_amount=Decimal("15000"),
            current_balance=Decimal("15000"),
            monthly_payment=Decimal("200"),
            interest_rate=Decimal("0"),  # Medical debt typically has 0% interest
            opened_date=date(2023, 1, 1),
            is_delinquent=True,
        )
        db_session.add(debt)
        await db_session.flush()

        # Add criminal record
        judicial = JudicialRecord(
            npc_id=test_npc.id,
            has_criminal_record=True,
            has_civil_cases=False,
            has_traffic_violations=False,
        )
        db_session.add(judicial)
        await db_session.flush()

        criminal = CriminalRecord(
            judicial_record_id=judicial.id,
            case_number="CR-2021-010",
            crime_category=CrimeCategory.PROPERTY,
            charge_description="Shoplifting",
            arrest_date=date(2021, 8, 20),
            disposition=CaseDisposition.GUILTY,
            is_sensitive=False,
            is_sealed=False,
            is_expunged=False,
        )
        db_session.add(criminal)
        await db_session.flush()

        scorer = RiskScorer(db_session)
        assessment = await scorer.calculate_risk_score(test_npc.id)

        # Should have correlation alert for financial stress + criminal record
        assert len(assessment.correlation_alerts) > 0
        alert_types = [alert.alert_type for alert in assessment.correlation_alerts]
        assert "recidivism_risk" in alert_types

    async def test_recommended_actions_generated(self, db_session: AsyncSession, test_npc):
        """Test that recommended actions are generated for high-risk citizens."""
        # Create high-risk scenario with multiple factors
        finance = FinanceRecord(
            npc_id=test_npc.id,
            employment_status=EmploymentStatus.UNEMPLOYED,
            employer_name="N/A",
            annual_income=Decimal("20000"),  # Need income > 0 for debt-to-income calculation
            credit_score=300,
        )
        db_session.add(finance)
        await db_session.flush()

        # Add debt to trigger financial_stress factor (weight: 12)
        debt = Debt(
            finance_record_id=finance.id,
            debt_type=DebtType.CREDIT_CARD,
            creditor_name="Bank of America",
            original_amount=Decimal("18000"),
            current_balance=Decimal("18000"),  # 90% debt-to-income ratio
            monthly_payment=Decimal("300"),
            interest_rate=Decimal("24.99"),  # Typical credit card APR
            opened_date=date(2023, 1, 1),
            is_delinquent=True,
        )
        db_session.add(debt)

        # Add transactions to trigger unusual_transactions factor (weight: 18)
        for i in range(10):
            small_tx = Transaction(
                finance_record_id=finance.id,
                transaction_date=date(2024, 1, i + 1),
                merchant_name="Small Purchase",
                amount=Decimal("10"),
                category=TransactionCategory.GROCERIES,
            )
            db_session.add(small_tx)

        # Add large transaction (10x average to trigger unusual_transactions)
        large_tx = Transaction(
            finance_record_id=finance.id,
            transaction_date=date(2024, 1, 15),
            merchant_name="Large Purchase",
            amount=Decimal("500"),  # 50x the small transactions
            category=TransactionCategory.OTHER,
        )
        db_session.add(large_tx)
        await db_session.flush()

        # Add criminal record (prior_record weight: 25)
        judicial = JudicialRecord(
            npc_id=test_npc.id,
            has_criminal_record=True,
            has_civil_cases=False,
            has_traffic_violations=False,
        )
        db_session.add(judicial)
        await db_session.flush()

        criminal = CriminalRecord(
            judicial_record_id=judicial.id,
            case_number="CR-2022-099",
            crime_category=CrimeCategory.VIOLENT,
            charge_description="Aggravated Assault",
            arrest_date=date(2022, 2, 10),
            disposition=CaseDisposition.GUILTY,
            is_sensitive=True,
            is_sealed=False,
            is_expunged=False,
        )
        db_session.add(criminal)

        # Add mental health treatment to push risk higher (weight: 15)
        health = HealthRecord(
            npc_id=test_npc.id,
            insurance_provider="State Health",
            primary_care_physician="Dr. Smith",
        )
        db_session.add(health)
        await db_session.flush()

        condition = HealthCondition(
            health_record_id=health.id,
            condition_name="Major Depressive Disorder",
            diagnosed_date=date(2021, 5, 1),
            severity=Severity.SEVERE,
            is_chronic=True,
            is_sensitive=True,
        )
        db_session.add(condition)
        await db_session.flush()

        scorer = RiskScorer(db_session)
        assessment = await scorer.calculate_risk_score(test_npc.id)

        # Actual: 25 (prior_record) + 12 (financial_stress) + 18 (unusual_transactions) + 5 (chronic_condition) = 60 (elevated)
        # Elevated/high risk should generate action recommendations
        assert len(assessment.recommended_actions) > 0
        # Accept elevated, high, or severe - all indicate significant risk
        assert assessment.risk_level.value in ["elevated", "high", "severe"]
        assert assessment.risk_score >= 60  # Verify we have a substantial risk score

    async def test_empty_domain_records_handled(self, db_session: AsyncSession, test_npc):
        """Test that empty domain records (no data) are handled gracefully."""
        # Add empty records
        finance = FinanceRecord(
            npc_id=test_npc.id,
            employment_status=EmploymentStatus.EMPLOYED_FULL_TIME,
            employer_name="TestCorp",
            annual_income=Decimal("50000"),
            credit_score=700,
        )
        db_session.add(finance)

        health = HealthRecord(
            npc_id=test_npc.id,
            insurance_provider="Test Health",
            primary_care_physician="Dr. Test",
        )
        db_session.add(health)

        judicial = JudicialRecord(
            npc_id=test_npc.id,
            has_criminal_record=False,
            has_civil_cases=False,
            has_traffic_violations=False,
        )
        db_session.add(judicial)
        await db_session.flush()

        scorer = RiskScorer(db_session)
        # Should not crash
        assessment = await scorer.calculate_risk_score(test_npc.id)

        # Clean record should have low risk
        assert assessment.risk_score < 30
        assert assessment.risk_level.value in ["low", "moderate"]

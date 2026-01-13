"""
Tests for risk score caching functionality.

Verifies that:
1. Cache is populated on first calculation
2. Cache is used on subsequent calls (within TTL)
3. Cache is invalidated after TTL expires
4. Risk scores match between cached and fresh calculations
"""
import pytest
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from datafusion.models.npc import NPC
from datafusion.models.finance import FinanceRecord, EmploymentStatus, Debt, DebtType
from datafusion.models.judicial import JudicialRecord, CriminalRecord, CaseDisposition, CrimeCategory
from datafusion.services.risk_scoring import RiskScorer

pytestmark = pytest.mark.asyncio


class TestRiskScoreCaching:
    """Test risk score caching functionality."""

    async def test_cache_populated_on_first_calculation(self, db_session: AsyncSession, test_npc):
        """First risk score calculation should populate the cache."""
        # Verify cache is empty initially
        result = await db_session.execute(select(NPC).where(NPC.id == test_npc.id))
        npc = result.scalar_one()
        assert npc.cached_risk_score is None
        assert npc.risk_score_updated_at is None

        # Calculate risk score
        scorer = RiskScorer(db_session)
        assessment = await scorer.calculate_risk_score(test_npc.id)

        # Verify cache is populated
        await db_session.refresh(npc)
        assert npc.cached_risk_score is not None
        assert npc.risk_score_updated_at is not None
        assert npc.cached_risk_score == assessment.risk_score

    async def test_cache_used_on_subsequent_calls(self, db_session: AsyncSession, test_npc):
        """Subsequent calls within TTL should use cached value."""
        # Add some data to generate non-zero risk score
        finance = FinanceRecord(
            npc_id=test_npc.id,
            employment_status=EmploymentStatus.EMPLOYED_FULL_TIME,
            employer_name="TestCorp",
            annual_income=Decimal("40000"),
            credit_score=550,
        )
        db_session.add(finance)

        # Add significant debt
        await db_session.flush()
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

        # First calculation
        scorer = RiskScorer(db_session)
        assessment1 = await scorer.calculate_risk_score(test_npc.id)

        # Get cache timestamp
        result = await db_session.execute(select(NPC).where(NPC.id == test_npc.id))
        npc = result.scalar_one()
        first_cache_time = npc.risk_score_updated_at

        # Second calculation (should use cache)
        assessment2 = await scorer.calculate_risk_score(test_npc.id)

        # Verify cache timestamp hasn't changed (cache was used)
        await db_session.refresh(npc)
        assert npc.risk_score_updated_at == first_cache_time

        # Verify scores match
        assert assessment1.risk_score == assessment2.risk_score
        assert assessment1.risk_score > 0  # Should have financial stress

    async def test_cache_invalidated_after_ttl(self, db_session: AsyncSession, test_npc):
        """Cache should be recalculated after TTL expires."""
        # Calculate initial risk score
        scorer = RiskScorer(db_session)
        assessment1 = await scorer.calculate_risk_score(test_npc.id)

        # Get NPC and manually set cache timestamp to past (simulate TTL expiration)
        result = await db_session.execute(select(NPC).where(NPC.id == test_npc.id))
        npc = result.scalar_one()

        # Set cache timestamp to 2 hours ago (past TTL of 1 hour)
        old_timestamp = datetime.now(timezone.utc) - timedelta(hours=2)
        npc.risk_score_updated_at = old_timestamp
        await db_session.commit()

        # Calculate again (should recalculate due to stale cache)
        assessment2 = await scorer.calculate_risk_score(test_npc.id)

        # Verify cache was updated (timestamp changed)
        await db_session.refresh(npc)
        # Make timestamp timezone-aware for comparison
        new_timestamp = npc.risk_score_updated_at
        if new_timestamp.tzinfo is None:
            new_timestamp = new_timestamp.replace(tzinfo=timezone.utc)
        assert new_timestamp > old_timestamp

        # Scores should still match (same underlying data)
        assert assessment1.risk_score == assessment2.risk_score

    async def test_cached_and_fresh_scores_match(self, db_session: AsyncSession, test_npc):
        """Cached scores should match freshly calculated scores."""
        # Add data that will generate a significant risk score
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

        # First calculation (populates cache)
        scorer = RiskScorer(db_session)
        assessment1 = await scorer.calculate_risk_score(test_npc.id)

        # Verify cache is populated with correct score
        result = await db_session.execute(select(NPC).where(NPC.id == test_npc.id))
        npc = result.scalar_one()
        assert npc.cached_risk_score == assessment1.risk_score

        # Second calculation (uses cache)
        assessment2 = await scorer.calculate_risk_score(test_npc.id)

        # Verify both assessments have the same score
        assert assessment1.risk_score == assessment2.risk_score
        assert assessment1.risk_score == 25  # Should be the prior_record weight

    async def test_npc_with_no_cache_calculates_fresh(self, db_session: AsyncSession, test_npc):
        """NPC with no cache should calculate fresh score."""
        # Verify no cache
        result = await db_session.execute(select(NPC).where(NPC.id == test_npc.id))
        npc = result.scalar_one()
        assert npc.cached_risk_score is None

        # Calculate score
        scorer = RiskScorer(db_session)
        assessment = await scorer.calculate_risk_score(test_npc.id)

        # Verify cache was populated
        await db_session.refresh(npc)
        assert npc.cached_risk_score == assessment.risk_score
        assert npc.cached_risk_score == 0  # No domain data = 0 risk

    async def test_cache_ttl_is_one_hour(self, db_session: AsyncSession):
        """Verify cache TTL constant is set to 1 hour."""
        scorer = RiskScorer(db_session)
        assert scorer.CACHE_TTL_HOURS == 1

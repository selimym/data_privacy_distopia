"""Tests for Finance, Judicial, Location, and Social Media domains."""

from datetime import date
from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from datafusion.generators.finance import generate_finance_record
from datafusion.generators.judicial import generate_judicial_record
from datafusion.generators.location import generate_location_record
from datafusion.generators.social import generate_social_media_record
from datafusion.models.finance import (
    BankAccount,
    Debt,
    FinanceRecord,
    Transaction,
)
from datafusion.models.judicial import (
    CivilCase,
    CriminalRecord,
    JudicialRecord,
    TrafficViolation,
)
from datafusion.models.location import InferredLocation, LocationRecord
from datafusion.models.npc import NPC, Role
from datafusion.models.social import (
    PrivateInference,
    PublicInference,
    SocialMediaRecord,
)


@pytest.fixture
async def test_npc(db_session: AsyncSession):
    """Create a basic test NPC."""
    npc = NPC(
        id=uuid4(),
        first_name="Test",
        last_name="Person",
        date_of_birth=date(1990, 1, 1),
        ssn="111-22-3333",
        street_address="123 Test St",
        city="Test City",
        state="TS",
        zip_code="12345",
        role=Role.CITIZEN,
        sprite_key="citizen_1",
        map_x=10,
        map_y=20,
        is_scenario_npc=False,
        scenario_key=None,
    )
    db_session.add(npc)
    await db_session.commit()
    await db_session.refresh(npc)
    return npc


# Finance Domain Tests


@pytest.mark.asyncio
async def test_generate_finance_record():
    """Test finance record generation produces valid data."""
    npc_id = uuid4()
    finance_data = generate_finance_record(npc_id, seed=42)

    assert finance_data["npc_id"] == npc_id
    assert "employment_status" in finance_data
    assert "annual_income" in finance_data
    assert isinstance(finance_data["annual_income"], Decimal)
    assert finance_data["credit_score"] >= 300
    assert finance_data["credit_score"] <= 850
    assert "bank_accounts" in finance_data
    assert "debts" in finance_data
    assert "transactions" in finance_data


@pytest.mark.asyncio
async def test_create_finance_record(db_session: AsyncSession, test_npc):
    """Test creating finance record in database."""
    finance_record = FinanceRecord(
        id=uuid4(),
        npc_id=test_npc.id,
        employment_status="EMPLOYED_FULL_TIME",
        employer_name="Test Corp",
        annual_income=Decimal("75000.00"),
        credit_score=720,
    )
    db_session.add(finance_record)

    # Add a bank account
    bank_account = BankAccount(
        id=uuid4(),
        finance_record_id=finance_record.id,
        account_type="CHECKING",
        bank_name="Test Bank",
        account_number_last4="1234",
        balance=Decimal("5000.00"),
        opened_date=date(2020, 1, 1),
    )
    db_session.add(bank_account)

    await db_session.commit()
    await db_session.refresh(finance_record)

    assert finance_record.npc_id == test_npc.id
    assert len(finance_record.bank_accounts) == 1
    assert finance_record.bank_accounts[0].account_type == "CHECKING"


# Judicial Domain Tests


@pytest.mark.asyncio
async def test_generate_judicial_record():
    """Test judicial record generation produces valid data."""
    npc_id = uuid4()
    judicial_data = generate_judicial_record(npc_id, seed=42)

    assert judicial_data["npc_id"] == npc_id
    assert "has_criminal_record" in judicial_data
    assert "has_civil_cases" in judicial_data
    assert "has_traffic_violations" in judicial_data
    assert "criminal_records" in judicial_data
    assert "civil_cases" in judicial_data
    assert "traffic_violations" in judicial_data


@pytest.mark.asyncio
async def test_create_judicial_record(db_session: AsyncSession, test_npc):
    """Test creating judicial record in database."""
    judicial_record = JudicialRecord(
        id=uuid4(),
        npc_id=test_npc.id,
        has_criminal_record=False,
        has_civil_cases=False,
        has_traffic_violations=True,
    )
    db_session.add(judicial_record)

    # Add a traffic violation
    violation = TrafficViolation(
        id=uuid4(),
        judicial_record_id=judicial_record.id,
        citation_number="TEST-12345",
        violation_type="SPEEDING",
        violation_description="Exceeding speed limit by 15mph",
        violation_date=date(2023, 6, 15),
        location="Highway 101",
        fine_amount=Decimal("150.00"),
        points=2,
        was_contested=False,
        is_paid=True,
        is_serious=False,
    )
    db_session.add(violation)

    await db_session.commit()
    await db_session.refresh(judicial_record)

    assert judicial_record.npc_id == test_npc.id
    assert judicial_record.has_traffic_violations is True
    assert len(judicial_record.traffic_violations) == 1
    assert judicial_record.traffic_violations[0].citation_number == "TEST-12345"


# Location Domain Tests


@pytest.mark.asyncio
async def test_generate_location_record():
    """Test location record generation produces valid data."""
    npc_id = uuid4()
    location_data = generate_location_record(npc_id, seed=42)

    assert location_data["npc_id"] == npc_id
    assert "tracking_enabled" in location_data
    assert "data_retention_days" in location_data
    assert "inferred_locations" in location_data

    # If tracking is enabled, should have locations
    if location_data["tracking_enabled"]:
        assert len(location_data["inferred_locations"]) > 0
        for location in location_data["inferred_locations"]:
            assert "location_type" in location
            assert "location_name" in location
            assert "privacy_implications" in location
            assert "confidence_score" in location


@pytest.mark.asyncio
async def test_create_location_record(db_session: AsyncSession, test_npc):
    """Test creating location record in database."""
    location_record = LocationRecord(
        id=uuid4(),
        npc_id=test_npc.id,
        tracking_enabled=True,
        data_retention_days=90,
    )
    db_session.add(location_record)

    # Add an inferred location
    inferred_location = InferredLocation(
        id=uuid4(),
        location_record_id=location_record.id,
        location_type="WORKPLACE",
        location_name="Test Office",
        street_address="456 Work Ave",
        city="Work City",
        state="WC",
        zip_code="54321",
        typical_days="Weekdays",
        visit_frequency="Daily",
        privacy_implications="Employer can be identified, work schedule exposed",
        is_sensitive=False,
        confidence_score=95,
    )
    db_session.add(inferred_location)

    await db_session.commit()
    await db_session.refresh(location_record)

    assert location_record.npc_id == test_npc.id
    assert location_record.tracking_enabled is True
    assert len(location_record.inferred_locations) == 1
    assert location_record.inferred_locations[0].location_type == "WORKPLACE"


# Social Media Domain Tests


@pytest.mark.asyncio
async def test_generate_social_media_record():
    """Test social media record generation produces valid data."""
    npc_id = uuid4()
    social_data = generate_social_media_record(npc_id, seed=42)

    assert social_data["npc_id"] == npc_id
    assert "has_public_profile" in social_data
    assert "uses_end_to_end_encryption" in social_data
    assert "public_inferences" in social_data
    assert "private_inferences" in social_data

    # If encryption is enabled, should have no private inferences
    if social_data["uses_end_to_end_encryption"]:
        assert len(social_data["private_inferences"]) == 0
        assert social_data["encryption_explanation"] is not None


@pytest.mark.asyncio
async def test_create_social_media_record(db_session: AsyncSession, test_npc):
    """Test creating social media record in database."""
    social_record = SocialMediaRecord(
        id=uuid4(),
        npc_id=test_npc.id,
        has_public_profile=True,
        primary_platform="FACEBOOK",
        account_created_date=date(2015, 3, 20),
        follower_count=250,
        post_frequency="Weekly",
        uses_end_to_end_encryption=False,
        encryption_explanation=None,
    )
    db_session.add(social_record)

    # Add a public inference
    public_inference = PublicInference(
        id=uuid4(),
        social_media_record_id=social_record.id,
        category="POLITICAL_VIEWS",
        inference_text="Likely supports progressive policies",
        supporting_evidence="Shared 10+ articles about climate change",
        confidence_score=85,
        source_platform="FACEBOOK",
        data_points_analyzed=25,
        potential_harm="Could face discrimination in conservative workplaces",
    )
    db_session.add(public_inference)

    await db_session.commit()
    await db_session.refresh(social_record)

    assert social_record.npc_id == test_npc.id
    assert social_record.has_public_profile is True
    assert len(social_record.public_inferences) == 1
    assert social_record.public_inferences[0].category == "POLITICAL_VIEWS"


# Integration Tests


@pytest.mark.asyncio
async def test_generate_all_domains_integration():
    """Test generating data for all domains produces consistent data."""
    npc_id = uuid4()
    seed = 42

    # Generate all domain data
    finance_data = generate_finance_record(npc_id, seed=seed + 1000)
    judicial_data = generate_judicial_record(npc_id, seed=seed + 2000)
    location_data = generate_location_record(npc_id, seed=seed + 3000)
    social_data = generate_social_media_record(npc_id, seed=seed + 4000)

    # All should reference the same NPC
    assert finance_data["npc_id"] == npc_id
    assert judicial_data["npc_id"] == npc_id
    assert location_data["npc_id"] == npc_id
    assert social_data["npc_id"] == npc_id

    # All should have generated some data
    assert len(finance_data["bank_accounts"]) > 0 or len(finance_data["transactions"]) > 0
    # Judicial may have no records (clean record)
    assert location_data["tracking_enabled"] is not None
    assert social_data["has_public_profile"] is not None

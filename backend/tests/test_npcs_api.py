"""Tests for NPC API endpoints.

Tests the API endpoints for listing and retrieving NPC data with domain filtering.
"""
import pytest
from uuid import uuid4
from datetime import date
from decimal import Decimal

from datafusion.models.npc import NPC
from datafusion.models.health import HealthRecord, HealthCondition, Severity
from datafusion.models.finance import FinanceRecord, EmploymentStatus
from datafusion.models.judicial import JudicialRecord
from datafusion.models.location import LocationRecord, InferredLocation, LocationType
from datafusion.models.social import SocialMediaRecord


@pytest.fixture
async def test_npc(db_session):
    """Create a basic test NPC."""
    npc = NPC(
        id=uuid4(),
        first_name="John",
        last_name="Doe",
        date_of_birth=date(1985, 6, 15),
        ssn="123-45-6789",
        street_address="123 Main St",
        city="Testville",
        state="TS",
        zip_code="12345",
        sprite_key="citizen_male_01",
        map_x=100,
        map_y=100,
    )
    db_session.add(npc)
    await db_session.flush()
    return npc


@pytest.fixture
async def npc_with_health(db_session, test_npc):
    """NPC with health data."""
    health_record = HealthRecord(
        npc_id=test_npc.id,
        insurance_provider="TestHealth Insurance",
        primary_care_physician="Dr. Smith",
    )
    db_session.add(health_record)
    await db_session.flush()

    condition = HealthCondition(
        health_record_id=health_record.id,
        condition_name="Test Condition",
        diagnosed_date=date(2020, 1, 1),
        severity=Severity.MODERATE,
        is_chronic=True,
        is_sensitive=False,
    )
    db_session.add(condition)
    await db_session.flush()

    return test_npc


@pytest.fixture
async def npc_with_finance(db_session, test_npc):
    """NPC with finance data."""
    finance_record = FinanceRecord(
        npc_id=test_npc.id,
        employment_status=EmploymentStatus.EMPLOYED_FULL_TIME,
        employer_name="TestCorp",
        annual_income=Decimal("50000"),
        credit_score=700,
    )
    db_session.add(finance_record)
    await db_session.flush()
    return test_npc


@pytest.fixture
async def npc_with_location(db_session, test_npc):
    """NPC with location data."""
    location_record = LocationRecord(
        npc_id=test_npc.id,
        tracking_enabled=True,
        data_retention_days=90,
    )
    db_session.add(location_record)
    await db_session.flush()

    location = InferredLocation(
        location_record_id=location_record.id,
        location_type=LocationType.HOME,
        location_name="Residence",
        street_address="123 Main St",
        city="Testville",
        state="TS",
        zip_code="12345",
        typical_days="Daily",
        visit_frequency="Daily",
        privacy_implications="Home address revealed",
        is_sensitive=True,
        confidence_score=95,
    )
    db_session.add(location)
    await db_session.flush()
    return test_npc


class TestListNPCs:
    """Test GET /api/npcs/ endpoint."""

    @pytest.mark.asyncio
    async def test_list_npcs_empty(self, client):
        """Listing NPCs when database is empty should return empty list."""
        response = await client.get("/api/npcs/")

        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0
        assert data["limit"] > 0
        assert data["offset"] == 0

    @pytest.mark.asyncio
    async def test_list_npcs_with_data(self, client, test_npc):
        """Listing NPCs should return all NPCs."""
        response = await client.get("/api/npcs/")

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["total"] == 1
        assert data["items"][0]["first_name"] == "John"
        assert data["items"][0]["last_name"] == "Doe"

    @pytest.mark.asyncio
    async def test_list_npcs_pagination_limit(self, client, db_session):
        """Pagination limit should restrict results."""
        # Create 5 NPCs
        for i in range(5):
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

        response = await client.get("/api/npcs/?limit=2")

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 2
        assert data["total"] == 5
        assert data["limit"] == 2

    @pytest.mark.asyncio
    async def test_list_npcs_pagination_offset(self, client, db_session):
        """Pagination offset should skip results."""
        # Create 5 NPCs
        for i in range(5):
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

        response = await client.get("/api/npcs/?limit=2&offset=2")

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 2
        assert data["offset"] == 2
        assert data["total"] == 5


class TestGetNPC:
    """Test GET /api/npcs/{npc_id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_npc_by_id(self, client, test_npc):
        """Getting NPC by ID should return NPC data."""
        response = await client.get(f"/api/npcs/{test_npc.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["npc"]["first_name"] == "John"
        assert data["npc"]["last_name"] == "Doe"
        assert data["npc"]["id"] == str(test_npc.id)

    @pytest.mark.asyncio
    async def test_get_npc_not_found(self, client):
        """Getting non-existent NPC should return 404."""
        fake_id = uuid4()
        response = await client.get(f"/api/npcs/{fake_id}")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_get_npc_with_no_domains(self, client, test_npc):
        """Getting NPC without domain query param should return only basic info."""
        response = await client.get(f"/api/npcs/{test_npc.id}")

        assert response.status_code == 200
        data = response.json()
        assert "npc" in data
        assert "domains" in data
        assert len(data["domains"]) == 0

    @pytest.mark.asyncio
    async def test_get_npc_with_health_domain(self, client, npc_with_health):
        """Requesting health domain should return health data."""
        response = await client.get(
            f"/api/npcs/{npc_with_health.id}?domains=health"
        )

        assert response.status_code == 200
        data = response.json()
        assert "health" in data["domains"]
        assert data["domains"]["health"]["insurance_provider"] == "TestHealth Insurance"

    @pytest.mark.asyncio
    async def test_get_npc_with_finance_domain(self, client, npc_with_finance):
        """Requesting finance domain should return finance data."""
        response = await client.get(
            f"/api/npcs/{npc_with_finance.id}?domains=finance"
        )

        assert response.status_code == 200
        data = response.json()
        assert "finance" in data["domains"]
        assert data["domains"]["finance"]["employer_name"] == "TestCorp"
        assert float(data["domains"]["finance"]["annual_income"]) == 50000.0

    @pytest.mark.asyncio
    async def test_get_npc_with_location_domain(self, client, npc_with_location):
        """Requesting location domain should return location data."""
        response = await client.get(
            f"/api/npcs/{npc_with_location.id}?domains=location"
        )

        assert response.status_code == 200
        data = response.json()
        assert "location" in data["domains"]
        assert data["domains"]["location"]["tracking_enabled"] is True
        assert len(data["domains"]["location"]["inferred_locations"]) == 1

    @pytest.mark.asyncio
    async def test_get_npc_with_multiple_domains(
        self, client, db_session, test_npc
    ):
        """Requesting multiple domains should return all requested data."""
        # Add health and finance data
        health_record = HealthRecord(
            npc_id=test_npc.id,
            insurance_provider="MultiHealth",
            primary_care_physician="Dr. Multi",
        )
        db_session.add(health_record)

        finance_record = FinanceRecord(
            npc_id=test_npc.id,
            employment_status=EmploymentStatus.EMPLOYED_FULL_TIME,
            employer_name="MultiCorp",
            annual_income=Decimal("60000"),
            credit_score=750,
        )
        db_session.add(finance_record)
        await db_session.flush()

        response = await client.get(
            f"/api/npcs/{test_npc.id}?domains=health&domains=finance"
        )

        assert response.status_code == 200
        data = response.json()
        assert "health" in data["domains"]
        assert "finance" in data["domains"]
        assert data["domains"]["health"]["insurance_provider"] == "MultiHealth"
        assert data["domains"]["finance"]["employer_name"] == "MultiCorp"

    @pytest.mark.asyncio
    async def test_get_npc_with_nonexistent_domain(self, client, test_npc):
        """Requesting domain with no data should not include it in response."""
        response = await client.get(
            f"/api/npcs/{test_npc.id}?domains=health"
        )

        assert response.status_code == 200
        data = response.json()
        # Health domain shouldn't be in domains dict if no data exists
        assert "health" not in data["domains"]


class TestGetNPCDomainData:
    """Test GET /api/npcs/{npc_id}/domain/{domain} endpoint."""

    @pytest.mark.asyncio
    async def test_get_health_domain_data(self, client, npc_with_health):
        """Getting specific health domain should return health data."""
        response = await client.get(
            f"/api/npcs/{npc_with_health.id}/domain/health"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["insurance_provider"] == "TestHealth Insurance"
        assert len(data["conditions"]) == 1

    @pytest.mark.asyncio
    async def test_get_finance_domain_data(self, client, npc_with_finance):
        """Getting specific finance domain should return finance data."""
        response = await client.get(
            f"/api/npcs/{npc_with_finance.id}/domain/finance"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["employer_name"] == "TestCorp"
        assert data["credit_score"] == 700

    @pytest.mark.asyncio
    async def test_get_location_domain_data(self, client, npc_with_location):
        """Getting specific location domain should return location data."""
        response = await client.get(
            f"/api/npcs/{npc_with_location.id}/domain/location"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["tracking_enabled"] is True
        assert len(data["inferred_locations"]) == 1

    @pytest.mark.asyncio
    async def test_get_domain_data_npc_not_found(self, client):
        """Getting domain data for non-existent NPC should return 404."""
        fake_id = uuid4()
        response = await client.get(
            f"/api/npcs/{fake_id}/domain/health"
        )

        assert response.status_code == 404
        assert "NPC not found" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_get_domain_data_domain_not_found(self, client, test_npc):
        """Getting domain data when domain doesn't exist should return 404."""
        response = await client.get(
            f"/api/npcs/{test_npc.id}/domain/health"
        )

        assert response.status_code == 404
        assert "Health record not found" in response.json()["detail"]


class TestNPCResponseSchema:
    """Test that NPC responses have correct schema structure."""

    @pytest.mark.asyncio
    async def test_npc_basic_read_schema(self, client, test_npc):
        """NPC list should use NPCBasicRead schema."""
        response = await client.get("/api/npcs/")

        assert response.status_code == 200
        data = response.json()
        npc = data["items"][0]

        # Check required fields for NPCBasicRead
        assert "id" in npc
        assert "first_name" in npc
        assert "last_name" in npc
        assert "sprite_key" in npc
        assert "map_x" in npc
        assert "map_y" in npc

    @pytest.mark.asyncio
    async def test_npc_with_domains_schema(self, client, npc_with_health):
        """NPC detail should use NPCWithDomains schema."""
        response = await client.get(
            f"/api/npcs/{npc_with_health.id}?domains=health"
        )

        assert response.status_code == 200
        data = response.json()

        # Check NPCWithDomains structure
        assert "npc" in data
        assert "domains" in data
        assert isinstance(data["domains"], dict)

        # Check NPCRead in npc field
        npc = data["npc"]
        assert "id" in npc
        assert "first_name" in npc
        assert "last_name" in npc
        assert "date_of_birth" in npc
        assert "ssn" in npc
        assert "street_address" in npc

    @pytest.mark.asyncio
    async def test_health_record_filtered_schema(self, client, npc_with_health):
        """Health domain should use HealthRecordFiltered schema."""
        response = await client.get(
            f"/api/npcs/{npc_with_health.id}/domain/health"
        )

        assert response.status_code == 200
        data = response.json()

        # Check HealthRecordFiltered fields
        assert "id" in data
        assert "npc_id" in data
        assert "insurance_provider" in data
        assert "primary_care_physician" in data
        assert "conditions" in data
        assert "medications" in data
        assert "visits" in data


class TestNPCFiltering:
    """Test NPC filtering and data access control (future feature)."""

    @pytest.mark.asyncio
    async def test_list_npcs_returns_all_non_scenario_npcs(
        self, client, db_session
    ):
        """List should include all NPCs including scenario NPCs."""
        # Create regular NPC
        regular_npc = NPC(
            id=uuid4(),
            first_name="Regular",
            last_name="Citizen",
            date_of_birth=date(1990, 1, 1),
            ssn="111-11-1111",
            street_address="123 Test St",
            city="Test",
            state="TS",
            zip_code="12345",
            sprite_key="citizen_1",
            map_x=10,
            map_y=10,
            is_scenario_npc=False,
        )
        db_session.add(regular_npc)

        # Create scenario NPC
        scenario_npc = NPC(
            id=uuid4(),
            first_name="Jessica",
            last_name="Martinez",
            date_of_birth=date(1988, 4, 12),
            ssn="555-55-5555",
            street_address="456 Test St",
            city="Test",
            state="TS",
            zip_code="12345",
            sprite_key="citizen_jessica",
            map_x=50,
            map_y=50,
            is_scenario_npc=True,
            scenario_key="jessica_martinez",
        )
        db_session.add(scenario_npc)
        await db_session.flush()

        response = await client.get("/api/npcs/")

        assert response.status_code == 200
        data = response.json()
        # Both should be returned
        assert data["total"] == 2

"""Tests for System Mode API endpoints."""

import pytest
from uuid import uuid4
from datetime import date

from datafusion.models.npc import NPC
from datafusion.models.location import LocationRecord, InferredLocation
from datafusion.models.system_mode import (
    Operator,
    Directive,
    CitizenFlag,
    FlagType,
    FlagOutcome,
    OperatorStatus,
)


@pytest.fixture
async def setup_directive(db_session):
    """Create a directive in the database."""
    directive = Directive(
        id=uuid4(),
        directive_key="week1_test",
        week_number=1,
        title="Test Directive",
        description="Test description",
        internal_memo="Test memo",
        required_domains=["location"],
        target_criteria={},
        flag_quota=2,
        time_limit_hours=48,
        moral_weight=2,
        content_rating="mild",
        unlock_condition={"type": "start"},
    )
    db_session.add(directive)
    await db_session.commit()
    return directive


@pytest.fixture
async def setup_npc(db_session):
    """Create an NPC for testing."""
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

    # Add location record for risk scoring
    location = LocationRecord(
        npc_id=npc.id,
        tracking_enabled=True,
        data_retention_days=30,
    )
    db_session.add(location)
    await db_session.commit()
    return npc


class TestStartSystemMode:
    """Test /system/start endpoint."""

    @pytest.mark.asyncio
    async def test_start_creates_operator(self, client, setup_directive):
        """Starting system mode should create an operator."""
        session_id = str(uuid4())

        response = await client.post(
            "/api/system/start",
            json={"session_id": session_id},
        )

        assert response.status_code == 200
        data = response.json()
        assert "operator_id" in data
        assert "operator_code" in data
        assert data["operator_code"].startswith("OP-")
        assert data["status"] == "active"
        assert data["compliance_score"] == 85.0
        assert "first_directive" in data

    @pytest.mark.asyncio
    async def test_start_returns_first_directive(self, client, setup_directive):
        """Starting should return the first directive."""
        response = await client.post(
            "/api/system/start",
            json={"session_id": str(uuid4())},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["first_directive"]["week_number"] == 1
        assert data["first_directive"]["title"] == "Test Directive"


class TestDashboard:
    """Test /system/dashboard endpoint."""

    @pytest.fixture
    async def started_session(self, client, setup_directive):
        """Create a started session and return operator ID."""
        response = await client.post(
            "/api/system/start",
            json={"session_id": str(uuid4())},
        )
        return response.json()["operator_id"]

    @pytest.mark.asyncio
    async def test_dashboard_returns_operator_status(self, client, started_session):
        """Dashboard should return operator status."""
        response = await client.get(
            f"/api/system/dashboard?operator_id={started_session}"
        )

        assert response.status_code == 200
        data = response.json()
        assert "operator" in data
        assert data["operator"]["operator_code"].startswith("OP-")
        assert data["operator"]["status"] == "active"

    @pytest.mark.asyncio
    async def test_dashboard_returns_directive(self, client, started_session):
        """Dashboard should return current directive."""
        response = await client.get(
            f"/api/system/dashboard?operator_id={started_session}"
        )

        assert response.status_code == 200
        data = response.json()
        assert "directive" in data
        assert data["directive"]["week_number"] == 1

    @pytest.mark.asyncio
    async def test_dashboard_returns_metrics(self, client, started_session):
        """Dashboard should return daily metrics."""
        response = await client.get(
            f"/api/system/dashboard?operator_id={started_session}"
        )

        assert response.status_code == 200
        data = response.json()
        assert "metrics" in data
        assert "flags_today" in data["metrics"]
        assert "quota" in data["metrics"]

    @pytest.mark.asyncio
    async def test_dashboard_invalid_operator(self, client, setup_directive):
        """Dashboard should return 404 for invalid operator."""
        fake_id = str(uuid4())
        response = await client.get(
            f"/api/system/dashboard?operator_id={fake_id}"
        )

        assert response.status_code == 404


class TestDirectiveEndpoints:
    """Test directive-related endpoints."""

    @pytest.fixture
    async def started_session(self, client, setup_directive):
        """Create a started session."""
        response = await client.post(
            "/api/system/start",
            json={"session_id": str(uuid4())},
        )
        return response.json()["operator_id"]

    @pytest.mark.asyncio
    async def test_get_current_directive(self, client, started_session):
        """Should return current directive."""
        response = await client.get(
            f"/api/system/directive/current?operator_id={started_session}"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["week_number"] == 1
        assert data["flag_quota"] == 2

    @pytest.mark.asyncio
    async def test_advance_directive_without_quota(self, client, started_session):
        """Cannot advance without meeting quota."""
        response = await client.post(
            f"/api/system/directive/advance?operator_id={started_session}"
        )

        assert response.status_code == 400
        assert "Quota not met" in response.json()["detail"]


class TestCaseManagement:
    """Test case management endpoints."""

    @pytest.fixture
    async def full_session(self, client, setup_directive, setup_npc):
        """Create session with NPC available."""
        response = await client.post(
            "/api/system/start",
            json={"session_id": str(uuid4())},
        )
        return {
            "operator_id": response.json()["operator_id"],
            "npc_id": str(setup_npc.id),
        }

    @pytest.mark.asyncio
    async def test_get_cases(self, client, full_session):
        """Should return list of cases."""
        response = await client.get(
            f"/api/system/cases?operator_id={full_session['operator_id']}"
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have at least the NPC we created
        assert len(data) >= 1

    @pytest.mark.asyncio
    async def test_get_citizen_file(self, client, full_session):
        """Should return full citizen file."""
        response = await client.get(
            f"/api/system/cases/{full_session['npc_id']}?operator_id={full_session['operator_id']}"
        )

        assert response.status_code == 200
        data = response.json()
        assert "identity" in data
        assert "risk_assessment" in data
        assert data["identity"]["first_name"] == "Test"
        assert data["identity"]["last_name"] == "Citizen"

    @pytest.mark.asyncio
    async def test_citizen_file_not_found(self, client, full_session):
        """Should return 404 for unknown citizen."""
        fake_id = str(uuid4())
        response = await client.get(
            f"/api/system/cases/{fake_id}?operator_id={full_session['operator_id']}"
        )

        assert response.status_code == 404


class TestFlagSubmission:
    """Test flag submission endpoint."""

    @pytest.fixture
    async def full_session(self, client, setup_directive, setup_npc):
        """Create session with NPC available."""
        response = await client.post(
            "/api/system/start",
            json={"session_id": str(uuid4())},
        )
        return {
            "operator_id": response.json()["operator_id"],
            "npc_id": str(setup_npc.id),
        }

    @pytest.mark.asyncio
    async def test_submit_flag(self, client, full_session):
        """Should accept flag submission."""
        response = await client.post(
            "/api/system/flag",
            json={
                "operator_id": full_session["operator_id"],
                "citizen_id": full_session["npc_id"],
                "flag_type": "monitoring",
                "contributing_factors": ["suspicious_location"],
                "justification": "Subject observed near school zone",
                "decision_time_seconds": 15.0,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "flag_id" in data
        assert data["flag_type"] == "monitoring"
        assert "quota_progress" in data
        assert "1/" in data["quota_progress"]

    @pytest.mark.asyncio
    async def test_flag_updates_compliance(self, client, full_session):
        """Flag submission should update compliance score."""
        response = await client.post(
            "/api/system/flag",
            json={
                "operator_id": full_session["operator_id"],
                "citizen_id": full_session["npc_id"],
                "flag_type": "monitoring",
                "contributing_factors": [],
                "justification": "Test compliance tracking",
                "decision_time_seconds": 10.0,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "compliance_score" in data

    @pytest.mark.asyncio
    async def test_hesitation_detected(self, client, full_session):
        """Slow decisions should trigger hesitation warning."""
        response = await client.post(
            "/api/system/flag",
            json={
                "operator_id": full_session["operator_id"],
                "citizen_id": full_session["npc_id"],
                "flag_type": "monitoring",
                "contributing_factors": [],
                "justification": "Test hesitation detection",
                "decision_time_seconds": 45.0,  # Above 30s threshold
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "warnings" in data
        assert any("Hesitation" in w for w in data["warnings"])

    @pytest.mark.asyncio
    async def test_invalid_flag_type(self, client, full_session):
        """Invalid flag type should return error."""
        response = await client.post(
            "/api/system/flag",
            json={
                "operator_id": full_session["operator_id"],
                "citizen_id": full_session["npc_id"],
                "flag_type": "invalid_type",
                "contributing_factors": [],
                "justification": "Test invalid flag type",
                "decision_time_seconds": 10.0,
            },
        )

        assert response.status_code == 400  # API validates and returns 400 for invalid flag type


class TestNoAction:
    """Test no-action submission endpoint."""

    @pytest.fixture
    async def full_session(self, client, setup_directive, setup_npc):
        """Create session with NPC available."""
        response = await client.post(
            "/api/system/start",
            json={"session_id": str(uuid4())},
        )
        return {
            "operator_id": response.json()["operator_id"],
            "npc_id": str(setup_npc.id),
        }

    @pytest.mark.asyncio
    async def test_submit_no_action(self, client, full_session):
        """Should accept no-action decision."""
        response = await client.post(
            "/api/system/no-action",
            json={
                "operator_id": full_session["operator_id"],
                "citizen_id": full_session["npc_id"],
                "justification": "Insufficient evidence for flagging",
                "decision_time_seconds": 20.0,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["logged"] is True
        assert data["compliance_impact"] < 0  # Negative impact

    @pytest.mark.asyncio
    async def test_multiple_no_actions_trigger_warning(self, client, full_session):
        """Multiple no-actions should trigger supervisor warning."""
        # Submit several no-actions
        for _ in range(5):
            response = await client.post(
                "/api/system/no-action",
                json={
                    "operator_id": full_session["operator_id"],
                    "citizen_id": full_session["npc_id"],
                    "justification": "Insufficient evidence",
                    "decision_time_seconds": 10.0,
                },
            )

        data = response.json()
        assert data["warning"] is not None
        assert "no-action" in data["warning"].lower() or "supervisor" in data["warning"].lower()


class TestOperatorEndpoints:
    """Test operator-specific endpoints."""

    @pytest.fixture
    async def operator_with_flags(self, client, db_session, setup_directive, setup_npc):
        """Create operator with some flags."""
        # Start session
        start_response = await client.post(
            "/api/system/start",
            json={"session_id": str(uuid4())},
        )
        operator_id = start_response.json()["operator_id"]

        # Submit flags
        for i in range(3):
            await client.post(
                "/api/system/flag",
                json={
                    "operator_id": operator_id,
                    "citizen_id": str(setup_npc.id),
                    "flag_type": "monitoring",
                    "contributing_factors": [],
                    "justification": f"Test flag {i}",
                    "decision_time_seconds": 10.0,
                },
            )

        return {"operator_id": operator_id, "npc_id": str(setup_npc.id)}

    @pytest.mark.asyncio
    async def test_get_operator_history(self, client, operator_with_flags):
        """Should return operator's flag history."""
        response = await client.get(
            f"/api/system/operator/{operator_with_flags['operator_id']}/history"
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 3

    @pytest.mark.asyncio
    async def test_assessment_not_available_for_good_operator(
        self, client, setup_directive
    ):
        """Good operators should not see their own assessment."""
        # Start fresh session (good compliance)
        start_response = await client.post(
            "/api/system/start",
            json={"session_id": str(uuid4())},
        )
        operator_id = start_response.json()["operator_id"]

        response = await client.get(
            f"/api/system/operator/{operator_id}/assessment"
        )

        assert response.status_code == 403
        assert "not available" in response.json()["detail"].lower()


class TestEndingEndpoints:
    """Test ending-related endpoints."""

    @pytest.fixture
    async def completed_session(self, client, db_session, setup_directive, setup_npc):
        """Create a session that can get an ending."""
        start_response = await client.post(
            "/api/system/start",
            json={"session_id": str(uuid4())},
        )
        operator_id = start_response.json()["operator_id"]

        # Submit some flags
        for i in range(2):
            await client.post(
                "/api/system/flag",
                json={
                    "operator_id": operator_id,
                    "citizen_id": str(setup_npc.id),
                    "flag_type": "monitoring",
                    "contributing_factors": [],
                    "justification": f"Test {i}",
                    "decision_time_seconds": 10.0,
                },
            )

        return operator_id

    @pytest.mark.asyncio
    async def test_get_ending(self, client, completed_session):
        """Should return ending calculation."""
        response = await client.get(
            f"/api/system/ending?operator_id={completed_session}"
        )

        assert response.status_code == 200
        data = response.json()
        assert "ending_type" in data

    @pytest.mark.asyncio
    async def test_acknowledge_ending(self, client, completed_session):
        """Should acknowledge ending and complete session."""
        response = await client.post(
            f"/api/system/ending/acknowledge?operator_id={completed_session}"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["session_complete"] is True
        assert data["debrief_unlocked"] is True

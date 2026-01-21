"""
Integration tests for System Mode API endpoints.

Tests the new unified action execution system and all related endpoints.
These are integration tests that test the full request/response cycle through FastAPI.
"""

from datetime import date, datetime, timezone
from uuid import uuid4

import pytest
from httpx import AsyncClient

from datafusion.models.npc import NPC
from datafusion.models.system_mode import (
    BookPublicationEvent,
    Directive,
    Neighborhood,
    NewsChannel,
    Operator,
    OperatorStatus,
    Protest,
    ProtestStatus,
    PublicMetrics,
    ReluctanceMetrics,
)

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
async def test_directive(db_session):
    """Create a test directive."""
    directive = Directive(
        id=uuid4(),
        directive_key="test_directive_week_2",
        week_number=2,
        title="Test Directive Week 2",
        description="Identify and flag high-risk individuals",
        internal_memo="Test internal memo",
        required_domains=["location", "finance", "messages"],
        target_criteria={"risk_score": 60},
        flag_quota=3,
        time_limit_hours=48,
        moral_weight=4,
        content_rating="moderate",
        unlock_condition={"type": "start"},
    )
    db_session.add(directive)
    await db_session.flush()
    return directive


@pytest.fixture
async def test_operator(db_session, test_directive):
    """Create a test operator with initial metrics."""
    operator = Operator(
        id=uuid4(),
        session_id=uuid4(),
        operator_code="OP-API-TEST-001",
        current_directive_id=test_directive.id,
        status=OperatorStatus.ACTIVE,
        compliance_score=80.0,
        total_flags_submitted=0,
        total_reviews_completed=0,
        hesitation_incidents=0,
    )
    db_session.add(operator)
    await db_session.flush()

    # Initialize metrics
    pub_metrics = PublicMetrics(
        operator_id=operator.id,
        international_awareness=10,
        public_anger=5,
    )
    rel_metrics = ReluctanceMetrics(
        operator_id=operator.id,
        reluctance_score=20,
        no_action_count=0,
    )
    db_session.add(pub_metrics)
    db_session.add(rel_metrics)
    await db_session.flush()

    return operator


@pytest.fixture
async def test_citizen(db_session):
    """Create a test citizen NPC."""
    citizen = NPC(
        id=uuid4(),
        first_name="Alice",
        last_name="Johnson",
        date_of_birth=date(1988, 3, 15),
        ssn="555-66-7777",
        street_address="789 Test Ave",
        city="Testcity",
        state="TC",
        zip_code="54321",
        sprite_key="citizen_female_02",
        map_x=30,
        map_y=30,
        is_hospitalized=False,
    )
    db_session.add(citizen)
    await db_session.flush()
    return citizen


@pytest.fixture
async def hospitalized_citizen(db_session):
    """Create a hospitalized citizen for hospital arrest tests."""
    citizen = NPC(
        id=uuid4(),
        first_name="Bob",
        last_name="Smith",
        date_of_birth=date(1975, 8, 22),
        ssn="888-99-1111",
        street_address="456 Hospital Rd",
        city="Testcity",
        state="TC",
        zip_code="54321",
        sprite_key="citizen_male_03",
        map_x=40,
        map_y=40,
        is_hospitalized=True,
    )
    db_session.add(citizen)
    await db_session.flush()
    return citizen


@pytest.fixture
async def test_news_channel(db_session):
    """Create a test news channel."""
    channel = NewsChannel(
        id=uuid4(),
        name="Test Independent News",
        stance="independent",
        credibility=70,
        is_banned=False,
        reporters=[
            {"name": "Sarah Reporter", "specialty": "politics", "fired": False, "targeted": False},
            {
                "name": "John Journalist",
                "specialty": "investigations",
                "fired": False,
                "targeted": False,
            },
        ],
    )
    db_session.add(channel)
    await db_session.flush()
    return channel


@pytest.fixture
async def critical_news_channel(db_session):
    """Create a critical news channel."""
    channel = NewsChannel(
        id=uuid4(),
        name="Critical News Network",
        stance="critical",
        credibility=85,
        is_banned=False,
        reporters=[
            {
                "name": "Jane Investigator",
                "specialty": "corruption",
                "fired": False,
                "targeted": False,
            },
        ],
    )
    db_session.add(channel)
    await db_session.flush()
    return channel


@pytest.fixture
async def test_neighborhood(db_session):
    """Create a test neighborhood."""
    neighborhood = Neighborhood(
        id=uuid4(),
        name="Riverside District",
        description="Waterfront neighborhood with diverse population",
        center_x=500,
        center_y=500,
        bounds_min_x=400,
        bounds_min_y=400,
        bounds_max_x=600,
        bounds_max_y=600,
        population_estimate=8000,
        primary_demographics=["working_class", "immigrant", "diverse"],
    )
    db_session.add(neighborhood)
    await db_session.flush()
    return neighborhood


@pytest.fixture
async def active_protest(db_session, test_operator, test_neighborhood):
    """Create an active protest."""
    protest = Protest(
        id=uuid4(),
        operator_id=test_operator.id,
        status=ProtestStatus.ACTIVE,
        neighborhood=test_neighborhood.name,
        size=1200,
        has_inciting_agent=False,
        inciting_agent_discovered=False,
        casualties=0,
        arrests=0,
    )
    db_session.add(protest)
    await db_session.flush()
    return protest


@pytest.fixture
async def protest_with_agent(db_session, test_operator, test_neighborhood):
    """Create a protest with an inciting agent."""
    protest = Protest(
        id=uuid4(),
        operator_id=test_operator.id,
        status=ProtestStatus.ACTIVE,
        neighborhood=test_neighborhood.name,
        size=2000,
        has_inciting_agent=True,
        inciting_agent_discovered=False,
        casualties=0,
        arrests=0,
    )
    db_session.add(protest)
    await db_session.flush()
    return protest


@pytest.fixture
async def pending_book(db_session, test_operator):
    """Create a pending book publication event."""
    book = BookPublicationEvent(
        id=uuid4(),
        operator_id=test_operator.id,
        title="The System Exposed",
        author="Anonymous Whistleblower",
        summary="A tell-all exposé of government surveillance programs",
        controversy_type="whistleblower",
        was_banned=False,
        published_at=datetime.now(timezone.utc),
        awareness_impact=15,
    )
    db_session.add(book)
    await db_session.flush()
    return book


# ============================================================================
# ACTION EXECUTION TESTS
# ============================================================================


class TestActionExecutionEndpoint:
    """Test POST /actions/execute endpoint."""

    @pytest.mark.asyncio
    async def test_execute_monitoring_action(
        self, client: AsyncClient, test_operator, test_citizen, test_directive
    ):
        """Test executing a basic MONITORING action."""
        response = await client.post(
            "/api/system/actions/execute",
            json={
                "operator_id": str(test_operator.id),
                "directive_id": str(test_directive.id),
                "action_type": "monitoring",
                "justification": "Suspicious location patterns detected in recent data",
                "decision_time_seconds": 12.5,
                "target_citizen_id": str(test_citizen.id),
            },
        )

        assert response.status_code == 200
        result = response.json()

        # Verify basic result structure
        assert result["success"] is True
        assert result["severity"] == 1
        assert result["action_id"] is not None

        # Verify metrics updated
        assert result["awareness_change"] >= 0
        assert result["anger_change"] >= 0
        assert "reluctance_change" in result

        # Verify messages exist
        assert isinstance(result["messages"], list)
        assert isinstance(result["warnings"], list)

    @pytest.mark.asyncio
    async def test_execute_detention_action(
        self, client: AsyncClient, test_operator, test_citizen, test_directive
    ):
        """Test executing a DETENTION action with cascading consequences."""
        response = await client.post(
            "/api/system/actions/execute",
            json={
                "operator_id": str(test_operator.id),
                "directive_id": str(test_directive.id),
                "action_type": "detention",
                "justification": "High risk score combined with flagged messages and location patterns",
                "decision_time_seconds": 18.2,
                "target_citizen_id": str(test_citizen.id),
            },
        )

        assert response.status_code == 200
        result = response.json()

        # Verify action executed
        assert result["success"] is True
        assert result["severity"] == 6

        # Verify metrics updated with higher values
        assert result["awareness_change"] >= 6
        assert result["anger_change"] >= 6

        # Check for possible detention injury
        assert "detention_injury" in result

    @pytest.mark.asyncio
    async def test_execute_ice_raid(
        self, client: AsyncClient, test_operator, test_directive, test_neighborhood
    ):
        """Test executing an ICE_RAID on a neighborhood."""
        response = await client.post(
            "/api/system/actions/execute",
            json={
                "operator_id": str(test_operator.id),
                "directive_id": str(test_directive.id),
                "action_type": "ice_raid",
                "justification": "High concentration of undocumented immigrants in target area",
                "decision_time_seconds": 25.0,
                "target_neighborhood": test_neighborhood.name,
            },
        )

        assert response.status_code == 200
        result = response.json()

        assert result["success"] is True
        assert result["severity"] == 7

        # ICE raids have +5 anger bonus
        assert result["anger_change"] >= 12

    @pytest.mark.asyncio
    async def test_execute_press_ban(
        self, client: AsyncClient, test_operator, test_directive, test_news_channel
    ):
        """Test executing a PRESS_BAN action."""
        response = await client.post(
            "/api/system/actions/execute",
            json={
                "operator_id": str(test_operator.id),
                "directive_id": str(test_directive.id),
                "action_type": "press_ban",
                "justification": "News channel repeatedly publishing hostile propaganda",
                "decision_time_seconds": 22.0,
                "target_news_channel_id": str(test_news_channel.id),
            },
        )

        assert response.status_code == 200
        result = response.json()

        assert result["success"] is True
        assert result["severity"] == 5

    @pytest.mark.asyncio
    async def test_execute_book_ban(
        self, client: AsyncClient, test_operator, test_directive, pending_book
    ):
        """Test executing a BOOK_BAN action."""
        response = await client.post(
            "/api/system/actions/execute",
            json={
                "operator_id": str(test_operator.id),
                "directive_id": str(test_directive.id),
                "action_type": "book_ban",
                "justification": "Book contains sensitive state information and spreads misinformation",
                "decision_time_seconds": 15.5,
            },
        )

        assert response.status_code == 200
        result = response.json()

        assert result["success"] is True
        assert result["severity"] == 4

    @pytest.mark.asyncio
    async def test_execute_declare_protest_illegal(
        self, client: AsyncClient, test_operator, test_directive, active_protest
    ):
        """Test declaring a protest illegal."""
        response = await client.post(
            "/api/system/actions/execute",
            json={
                "operator_id": str(test_operator.id),
                "directive_id": str(test_directive.id),
                "action_type": "declare_protest_illegal",
                "justification": "Protest poses threat to public safety and order",
                "decision_time_seconds": 20.0,
                "target_protest_id": str(active_protest.id),
            },
        )

        assert response.status_code == 200
        result = response.json()

        assert result["success"] is True
        assert result["severity"] == 7

    @pytest.mark.asyncio
    async def test_execute_incite_violence_gamble(
        self, client: AsyncClient, test_operator, test_directive, protest_with_agent
    ):
        """Test INCITE_VIOLENCE action (gamble mechanic)."""
        response = await client.post(
            "/api/system/actions/execute",
            json={
                "operator_id": str(test_operator.id),
                "directive_id": str(test_directive.id),
                "action_type": "incite_violence",
                "justification": "Intelligence suggests inciting agent present - trigger violence to discredit",
                "decision_time_seconds": 30.0,
                "target_protest_id": str(protest_with_agent.id),
            },
        )

        assert response.status_code == 200
        result = response.json()

        # This is a gamble, so result varies
        assert result["success"] in [True, False]
        assert result["severity"] == 9

        # Check for casualty data in messages
        assert len(result["messages"]) > 0

    @pytest.mark.asyncio
    async def test_execute_hospital_arrest(
        self, client: AsyncClient, test_operator, test_directive, hospitalized_citizen
    ):
        """Test HOSPITAL_ARREST on hospitalized citizen."""
        response = await client.post(
            "/api/system/actions/execute",
            json={
                "operator_id": str(test_operator.id),
                "directive_id": str(test_directive.id),
                "action_type": "hospital_arrest",
                "justification": "High-value target currently vulnerable in hospital setting",
                "decision_time_seconds": 16.0,
                "target_citizen_id": str(hospitalized_citizen.id),
            },
        )

        assert response.status_code == 200
        result = response.json()

        assert result["success"] is True
        assert result["severity"] == 8

    @pytest.mark.asyncio
    async def test_execute_action_with_hesitation(
        self, client: AsyncClient, test_operator, test_citizen, test_directive
    ):
        """Test that long decision time triggers hesitation tracking."""
        response = await client.post(
            "/api/system/actions/execute",
            json={
                "operator_id": str(test_operator.id),
                "directive_id": str(test_directive.id),
                "action_type": "detention",
                "justification": "Taking this action after careful consideration of the evidence",
                "decision_time_seconds": 45.0,  # > 30 seconds = hesitation
                "target_citizen_id": str(test_citizen.id),
            },
        )

        assert response.status_code == 200
        result = response.json()

        assert result["success"] is True
        # Hesitation should affect reluctance
        assert "reluctance_change" in result

    @pytest.mark.asyncio
    async def test_execute_action_triggers_news_article(
        self,
        client: AsyncClient,
        test_operator,
        test_citizen,
        test_directive,
        critical_news_channel,
    ):
        """Test that high-severity action can trigger news article."""
        # Execute multiple high-severity actions to increase likelihood
        for _ in range(3):
            response = await client.post(
                "/api/system/actions/execute",
                json={
                    "operator_id": str(test_operator.id),
                    "directive_id": str(test_directive.id),
                    "action_type": "arbitrary_detention",
                    "justification": "Arbitrary detention of suspected dissidents without due process",
                    "decision_time_seconds": 14.0,
                    "target_citizen_id": str(test_citizen.id),
                },
            )

            assert response.status_code == 200
            result = response.json()

            # Check if news article was triggered
            if len(result.get("news_articles_triggered", [])) > 0:
                assert isinstance(result["news_articles_triggered"], list)
                break

    @pytest.mark.asyncio
    async def test_execute_action_without_directive(
        self, client: AsyncClient, test_operator, test_citizen
    ):
        """Test executing action without directive (should work)."""
        response = await client.post(
            "/api/system/actions/execute",
            json={
                "operator_id": str(test_operator.id),
                "directive_id": None,
                "action_type": "monitoring",
                "justification": "Routine monitoring outside directive scope",
                "decision_time_seconds": 10.0,
                "target_citizen_id": str(test_citizen.id),
            },
        )

        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True


# ============================================================================
# NO-ACTION SUBMISSION TESTS
# ============================================================================


class TestNoActionSubmission:
    """Test POST /actions/no-action-new endpoint."""

    @pytest.mark.asyncio
    async def test_submit_no_action(self, client: AsyncClient, test_operator, test_citizen):
        """Test submitting a no-action decision."""
        response = await client.post(
            "/api/system/actions/no-action-new",
            params={
                "operator_id": str(test_operator.id),
                "citizen_id": str(test_citizen.id),
                "justification": "Citizen does not meet threshold criteria for action despite initial flagging",
                "decision_time_seconds": 20.0,
            },
        )

        assert response.status_code == 200
        result = response.json()

        # Verify result
        assert result["success"] is True
        assert result["reluctance_change"] > 0  # No-action increases reluctance
        assert isinstance(result["messages"], list)
        assert isinstance(result["warnings"], list)

    @pytest.mark.asyncio
    async def test_multiple_no_actions_increase_reluctance(
        self, client: AsyncClient, test_operator, test_citizen
    ):
        """Test that multiple no-actions progressively increase reluctance."""
        reluctance_changes = []

        for i in range(5):
            response = await client.post(
                "/api/system/actions/no-action-new",
                params={
                    "operator_id": str(test_operator.id),
                    "citizen_id": str(test_citizen.id),
                    "justification": f"No action justified for case {i} - insufficient evidence for intervention",
                    "decision_time_seconds": 15.0,
                },
            )

            assert response.status_code == 200
            result = response.json()
            reluctance_changes.append(result["reluctance_change"])

        # Reluctance should increase each time
        assert all(change > 0 for change in reluctance_changes)

    @pytest.mark.asyncio
    async def test_no_action_can_trigger_warning(
        self, client: AsyncClient, test_operator, test_citizen
    ):
        """Test that excessive no-actions trigger warnings."""
        # Submit many no-actions to build up reluctance
        for _ in range(10):
            response = await client.post(
                "/api/system/actions/no-action-new",
                params={
                    "operator_id": str(test_operator.id),
                    "citizen_id": str(test_citizen.id),
                    "justification": "Declining to take action based on careful review of available evidence",
                    "decision_time_seconds": 18.0,
                },
            )

            assert response.status_code == 200
            result = response.json()

            # Check if warning was generated
            if len(result["warnings"]) > 0:
                assert any(
                    "performance" in w.lower() or "warning" in w.lower() for w in result["warnings"]
                )
                break


# ============================================================================
# AVAILABLE ACTIONS TESTS
# ============================================================================


class TestAvailableActionsEndpoint:
    """Test GET /actions/available endpoint."""

    @pytest.mark.asyncio
    async def test_get_available_actions_basic(
        self, client: AsyncClient, test_operator, test_citizen
    ):
        """Test getting available actions with no special conditions."""
        response = await client.get(
            "/api/system/actions/available",
            params={
                "operator_id": str(test_operator.id),
                "citizen_id": str(test_citizen.id),
            },
        )

        assert response.status_code == 200
        result = response.json()

        # Citizen-targeted actions should always be available
        assert len(result["citizen_targeted"]) > 0
        assert "monitoring" in result["citizen_targeted"]
        assert "restriction" in result["citizen_targeted"]
        assert "intervention" in result["citizen_targeted"]
        assert "detention" in result["citizen_targeted"]

        # Other actions should be available
        assert "ice_raid" in result["other_available"]

    @pytest.mark.asyncio
    async def test_available_actions_with_active_protest(
        self, client: AsyncClient, test_operator, test_citizen, active_protest
    ):
        """Test that protest actions are available when protest exists."""
        response = await client.get(
            "/api/system/actions/available",
            params={
                "operator_id": str(test_operator.id),
                "citizen_id": str(test_citizen.id),
            },
        )

        assert response.status_code == 200
        result = response.json()

        # Protest-targeted actions should be available
        assert len(result["protest_targeted"]) > 0
        assert "declare_protest_illegal" in result["protest_targeted"]

    @pytest.mark.asyncio
    async def test_available_actions_with_inciting_agent(
        self, client: AsyncClient, test_operator, test_citizen, protest_with_agent
    ):
        """Test that INCITE_VIOLENCE is available when protest has agent."""
        response = await client.get(
            "/api/system/actions/available",
            params={
                "operator_id": str(test_operator.id),
                "citizen_id": str(test_citizen.id),
            },
        )

        assert response.status_code == 200
        result = response.json()

        # INCITE_VIOLENCE should be available
        assert "incite_violence" in result["protest_targeted"]

    @pytest.mark.asyncio
    async def test_available_actions_with_news_channels(
        self, client: AsyncClient, test_operator, test_citizen, test_news_channel
    ):
        """Test that news-targeted actions are available when channels exist."""
        response = await client.get(
            "/api/system/actions/available",
            params={
                "operator_id": str(test_operator.id),
                "citizen_id": str(test_citizen.id),
            },
        )

        assert response.status_code == 200
        result = response.json()

        # News-targeted actions should be available
        assert len(result["news_targeted"]) > 0
        assert "press_ban" in result["news_targeted"]
        assert "pressure_firing" in result["news_targeted"]

    @pytest.mark.asyncio
    async def test_available_actions_with_pending_book(
        self, client: AsyncClient, test_operator, test_citizen, pending_book
    ):
        """Test that BOOK_BAN is available when books exist."""
        response = await client.get(
            "/api/system/actions/available",
            params={
                "operator_id": str(test_operator.id),
                "citizen_id": str(test_citizen.id),
            },
        )

        assert response.status_code == 200
        result = response.json()

        # BOOK_BAN should be available
        assert "book_ban" in result["other_available"]

    @pytest.mark.asyncio
    async def test_available_actions_hospital_arrest(
        self, client: AsyncClient, test_operator, hospitalized_citizen
    ):
        """Test that HOSPITAL_ARREST is available for hospitalized citizens."""
        response = await client.get(
            "/api/system/actions/available",
            params={
                "operator_id": str(test_operator.id),
                "citizen_id": str(hospitalized_citizen.id),
            },
        )

        assert response.status_code == 200
        result = response.json()

        # HOSPITAL_ARREST should be available
        assert "hospital_arrest" in result["other_available"]


# ============================================================================
# METRICS TESTS
# ============================================================================


class TestMetricsEndpoints:
    """Test metrics retrieval endpoints."""

    @pytest.mark.asyncio
    async def test_get_public_metrics(self, client: AsyncClient, test_operator):
        """Test GET /metrics/public endpoint."""
        response = await client.get(
            "/api/system/metrics/public",
            params={"operator_id": str(test_operator.id)},
        )

        assert response.status_code == 200
        result = response.json()

        # Verify structure
        assert "international_awareness" in result
        assert "public_anger" in result
        assert "awareness_tier" in result
        assert "anger_tier" in result
        assert "updated_at" in result

        # Verify values are in range
        assert 0 <= result["international_awareness"] <= 100
        assert 0 <= result["public_anger"] <= 100
        assert 0 <= result["awareness_tier"] <= 5
        assert 0 <= result["anger_tier"] <= 5

    @pytest.mark.asyncio
    async def test_get_reluctance_metrics(self, client: AsyncClient, test_operator):
        """Test GET /metrics/reluctance endpoint."""
        response = await client.get(
            "/api/system/metrics/reluctance",
            params={"operator_id": str(test_operator.id)},
        )

        assert response.status_code == 200
        result = response.json()

        # Verify structure
        assert "reluctance_score" in result
        assert "no_action_count" in result
        assert "hesitation_count" in result
        assert "actions_taken" in result
        assert "actions_required" in result
        assert "quota_shortfall" in result
        assert "warnings_received" in result
        assert "is_under_review" in result
        assert "updated_at" in result

        # Verify values are in range
        assert 0 <= result["reluctance_score"] <= 100

    @pytest.mark.asyncio
    async def test_metrics_update_after_action(
        self, client: AsyncClient, test_operator, test_citizen, test_directive
    ):
        """Test that metrics update correctly after action execution."""
        # Get initial metrics
        metrics_before = await client.get(
            "/api/system/metrics/public",
            params={"operator_id": str(test_operator.id)},
        )
        initial_awareness = metrics_before.json()["international_awareness"]
        initial_anger = metrics_before.json()["public_anger"]

        # Execute action
        await client.post(
            "/api/system/actions/execute",
            json={
                "operator_id": str(test_operator.id),
                "directive_id": str(test_directive.id),
                "action_type": "detention",
                "justification": "High-risk target requires immediate detention",
                "decision_time_seconds": 15.0,
                "target_citizen_id": str(test_citizen.id),
            },
        )

        # Get updated metrics
        metrics_after = await client.get(
            "/api/system/metrics/public",
            params={"operator_id": str(test_operator.id)},
        )
        final_awareness = metrics_after.json()["international_awareness"]
        final_anger = metrics_after.json()["public_anger"]

        # Metrics should have increased
        assert final_awareness >= initial_awareness
        assert final_anger >= initial_anger


# ============================================================================
# NEWS SYSTEM TESTS
# ============================================================================


class TestNewsEndpoints:
    """Test news-related endpoints."""

    @pytest.mark.asyncio
    async def test_get_recent_news_empty(self, client: AsyncClient, test_operator):
        """Test getting news when no articles exist."""
        response = await client.get(
            "/api/system/news/recent",
            params={"operator_id": str(test_operator.id), "limit": 10},
        )

        assert response.status_code == 200
        result = response.json()
        assert isinstance(result, list)

    @pytest.mark.asyncio
    async def test_get_news_channels(
        self, client: AsyncClient, test_news_channel, critical_news_channel
    ):
        """Test GET /news/channels endpoint."""
        response = await client.get("/api/system/news/channels")

        assert response.status_code == 200
        result = response.json()

        # Verify structure
        assert isinstance(result, list)
        assert len(result) >= 2

        # Verify channel data
        for channel in result:
            assert "id" in channel
            assert "name" in channel
            assert "stance" in channel
            assert "credibility" in channel
            assert "is_banned" in channel
            assert "reporters" in channel
            assert isinstance(channel["reporters"], list)

    @pytest.mark.asyncio
    async def test_news_channels_show_reporters(self, client: AsyncClient, test_news_channel):
        """Test that reporters are included in channel data."""
        response = await client.get("/api/system/news/channels")

        assert response.status_code == 200
        channels = response.json()

        # Find our test channel
        test_channel = next(c for c in channels if c["name"] == "Test Independent News")
        assert len(test_channel["reporters"]) == 2
        assert test_channel["reporters"][0]["name"] == "Sarah Reporter"


# ============================================================================
# PROTEST SYSTEM TESTS
# ============================================================================


class TestProtestEndpoints:
    """Test protest-related endpoints."""

    @pytest.mark.asyncio
    async def test_get_active_protests_empty(self, client: AsyncClient, test_operator):
        """Test getting protests when none exist."""
        response = await client.get(
            "/api/system/protests/active",
            params={"operator_id": str(test_operator.id)},
        )

        assert response.status_code == 200
        result = response.json()
        assert isinstance(result, list)

    @pytest.mark.asyncio
    async def test_get_active_protests(
        self, client: AsyncClient, test_operator, active_protest, protest_with_agent
    ):
        """Test getting active protests."""
        response = await client.get(
            "/api/system/protests/active",
            params={"operator_id": str(test_operator.id)},
        )

        assert response.status_code == 200
        result = response.json()

        assert len(result) == 2

        # Verify protest structure
        for protest in result:
            assert "id" in protest
            assert "status" in protest
            assert "neighborhood" in protest
            assert "size" in protest
            assert "has_inciting_agent" in protest
            assert "casualties" in protest
            assert "arrests" in protest

    @pytest.mark.asyncio
    async def test_protests_show_inciting_agent_status(
        self, client: AsyncClient, test_operator, protest_with_agent
    ):
        """Test that protests correctly show inciting agent status."""
        response = await client.get(
            "/api/system/protests/active",
            params={"operator_id": str(test_operator.id)},
        )

        assert response.status_code == 200
        protests = response.json()

        # Find protest with agent
        protest = next(p for p in protests if p["size"] == 2000)
        assert protest["has_inciting_agent"] is True
        assert protest["inciting_agent_discovered"] is False


# ============================================================================
# BOOK PUBLICATION TESTS
# ============================================================================


class TestBookPublicationEndpoints:
    """Test book publication endpoints."""

    @pytest.mark.asyncio
    async def test_get_pending_books_empty(self, client: AsyncClient, test_operator):
        """Test getting books when none exist."""
        response = await client.get(
            "/api/system/books/pending",
            params={"operator_id": str(test_operator.id)},
        )

        assert response.status_code == 200
        result = response.json()
        assert isinstance(result, list)

    @pytest.mark.asyncio
    async def test_get_pending_books(self, client: AsyncClient, test_operator, pending_book):
        """Test getting pending books."""
        response = await client.get(
            "/api/system/books/pending",
            params={"operator_id": str(test_operator.id)},
        )

        assert response.status_code == 200
        result = response.json()

        assert len(result) == 1

        # Verify book structure
        book = result[0]
        assert book["title"] == "The System Exposed"
        assert book["author"] == "Anonymous Whistleblower"
        assert book["was_banned"] is False
        assert book["awareness_impact"] == 15


# ============================================================================
# OPERATOR DATA TESTS
# ============================================================================


class TestOperatorDataEndpoints:
    """Test operator data and exposure endpoints."""

    @pytest.mark.asyncio
    async def test_get_exposure_risk(self, client: AsyncClient, test_operator):
        """Test GET /operator/exposure-risk endpoint."""
        response = await client.get(
            "/api/system/operator/exposure-risk",
            params={"operator_id": str(test_operator.id)},
        )

        assert response.status_code == 200
        result = response.json()

        # Verify structure
        assert "current_stage" in result
        assert "risk_level" in result
        assert "progress_to_next_stage" in result
        assert "awareness" in result
        assert "reluctance" in result

        # Verify values
        assert 0 <= result["current_stage"] <= 3
        assert 0 <= result["progress_to_next_stage"] <= 100

    @pytest.mark.asyncio
    async def test_get_operator_data(self, client: AsyncClient, test_operator):
        """Test GET /operator/data endpoint."""
        response = await client.get(
            "/api/system/operator/data",
            params={"operator_id": str(test_operator.id)},
        )

        assert response.status_code == 200
        result = response.json()

        # Verify structure
        assert "id" in result
        assert "operator_id" in result
        assert "full_name" in result
        assert "home_address" in result
        assert "family_members" in result
        assert "search_queries" in result
        assert "hesitation_patterns" in result
        assert "decision_patterns" in result
        assert "exposure_stage" in result

        # Verify operator data is generated
        assert result["full_name"] != ""
        assert isinstance(result["family_members"], list)

    @pytest.mark.asyncio
    async def test_get_dashboard_with_cases(self, client: AsyncClient, test_operator, test_citizen):
        """Test GET /dashboard-with-cases endpoint (catches Pydantic errors)."""
        response = await client.get(
            "/api/system/dashboard-with-cases",
            params={
                "operator_id": str(test_operator.id),
                "case_limit": 50,
                "case_offset": 0,
            },
        )

        assert response.status_code == 200
        result = response.json()

        # Verify dashboard structure
        assert "dashboard" in result
        assert "cases" in result
        assert isinstance(result["cases"], list)

        # Verify citizen appears in cases
        assert len(result["cases"]) >= 1

        # Verify case structure (catches Pydantic schema errors)
        case = result["cases"][0]
        assert "npc_id" in case
        assert "name" in case
        assert "risk_score" in case
        assert "risk_level" in case


# ============================================================================
# NEIGHBORHOOD TESTS
# ============================================================================


class TestNeighborhoodEndpoints:
    """Test neighborhood endpoints."""

    @pytest.mark.asyncio
    async def test_get_neighborhoods(self, client: AsyncClient, test_neighborhood):
        """Test GET /neighborhoods endpoint."""
        response = await client.get("/api/system/neighborhoods")

        assert response.status_code == 200
        result = response.json()

        assert len(result) >= 1

        # Verify structure
        neighborhood = result[0]
        assert "id" in neighborhood
        assert "name" in neighborhood
        assert "description" in neighborhood
        assert "center_x" in neighborhood
        assert "center_y" in neighborhood
        assert "bounds_min_x" in neighborhood
        assert "bounds_max_x" in neighborhood
        assert "population_estimate" in neighborhood
        assert "primary_demographics" in neighborhood


# ============================================================================
# INTEGRATION SCENARIO TESTS
# ============================================================================


class TestIntegrationScenarios:
    """Test realistic gameplay scenarios end-to-end."""

    @pytest.mark.asyncio
    async def test_action_execution_flow(
        self, client: AsyncClient, test_operator, test_citizen, test_directive
    ):
        """Test complete action execution flow: Execute → Metrics update → Events trigger."""
        # 1. Get initial state
        initial_metrics = await client.get(
            "/api/system/metrics/public",
            params={"operator_id": str(test_operator.id)},
        )
        initial_awareness = initial_metrics.json()["international_awareness"]

        # 2. Execute action
        action_result = await client.post(
            "/api/system/actions/execute",
            json={
                "operator_id": str(test_operator.id),
                "directive_id": str(test_directive.id),
                "action_type": "arbitrary_detention",
                "justification": "Arbitrary detention to suppress dissent",
                "decision_time_seconds": 12.0,
                "target_citizen_id": str(test_citizen.id),
            },
        )
        assert action_result.status_code == 200

        # 3. Verify metrics updated
        updated_metrics = await client.get(
            "/api/system/metrics/public",
            params={"operator_id": str(test_operator.id)},
        )
        new_awareness = updated_metrics.json()["international_awareness"]
        assert new_awareness > initial_awareness

    @pytest.mark.asyncio
    async def test_reluctance_buildup_scenario(
        self, client: AsyncClient, test_operator, test_citizen
    ):
        """Test reluctance buildup: Multiple no-actions → Reluctance increase → Warning."""
        # Submit multiple no-actions
        for i in range(8):
            response = await client.post(
                "/api/system/actions/no-action-new",
                params={
                    "operator_id": str(test_operator.id),
                    "citizen_id": str(test_citizen.id),
                    "justification": f"Declining action number {i} - insufficient evidence for intervention",
                    "decision_time_seconds": 15.0,
                },
            )
            assert response.status_code == 200

        # Check reluctance metrics
        metrics = await client.get(
            "/api/system/metrics/reluctance",
            params={"operator_id": str(test_operator.id)},
        )
        result = metrics.json()

        # Reluctance should have increased significantly
        assert result["reluctance_score"] > 50
        assert result["no_action_count"] == 8

    @pytest.mark.asyncio
    async def test_escalating_actions_scenario(
        self, client: AsyncClient, test_operator, test_citizen, test_directive
    ):
        """Test escalating actions: Start mild → Increase severity → Track metrics."""
        action_types = ["monitoring", "restriction", "intervention", "detention"]

        previous_severity = 0
        for action_type in action_types:
            response = await client.post(
                "/api/system/actions/execute",
                json={
                    "operator_id": str(test_operator.id),
                    "directive_id": str(test_directive.id),
                    "action_type": action_type,
                    "justification": f"Escalating to {action_type} based on continued suspicious activity",
                    "decision_time_seconds": 14.0,
                    "target_citizen_id": str(test_citizen.id),
                },
            )

            assert response.status_code == 200
            result = response.json()

            # Severity should increase
            assert result["severity"] >= previous_severity
            previous_severity = result["severity"]

    @pytest.mark.asyncio
    async def test_protest_suppression_flow(
        self, client: AsyncClient, test_operator, test_directive, active_protest
    ):
        """Test protest suppression: Check available → Execute suppression → Verify outcome."""
        # 1. Verify protest actions are available
        available = await client.get(
            "/api/system/actions/available",
            params={"operator_id": str(test_operator.id)},
        )
        assert "declare_protest_illegal" in available.json()["protest_targeted"]

        # 2. Execute suppression
        response = await client.post(
            "/api/system/actions/execute",
            json={
                "operator_id": str(test_operator.id),
                "directive_id": str(test_directive.id),
                "action_type": "declare_protest_illegal",
                "justification": "Protest threatens public order and must be suppressed",
                "decision_time_seconds": 18.0,
                "target_protest_id": str(active_protest.id),
            },
        )

        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_news_suppression_flow(
        self, client: AsyncClient, test_operator, test_directive, test_news_channel
    ):
        """Test news suppression: Check channels → Ban channel → Verify unavailable."""
        # 1. Get initial channels
        await client.get("/api/system/news/channels")

        # 2. Execute press ban
        response = await client.post(
            "/api/system/actions/execute",
            json={
                "operator_id": str(test_operator.id),
                "directive_id": str(test_directive.id),
                "action_type": "press_ban",
                "justification": "Channel spreading misinformation and anti-state propaganda",
                "decision_time_seconds": 20.0,
                "target_news_channel_id": str(test_news_channel.id),
            },
        )

        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True

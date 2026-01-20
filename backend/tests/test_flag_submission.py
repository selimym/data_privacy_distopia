"""Tests for flag submission with optional justification."""
import pytest
from httpx import AsyncClient
from uuid import uuid4


@pytest.mark.asyncio
async def test_flag_with_justification(client: AsyncClient, test_operator, test_npc):
    """Test submitting flag with justification text."""
    response = await client.post("/api/system/flag", json={
        "operator_id": str(test_operator.id),
        "citizen_id": str(test_npc.id),
        "flag_type": "monitoring",
        "contributing_factors": ["high_risk_location"],
        "justification": "Citizen visits restricted areas frequently",
        "decision_time_seconds": 15.5
    })

    assert response.status_code == 200
    data = response.json()
    assert "flag_id" in data
    assert data["flag_type"] == "monitoring"
    assert data["citizen_name"] == f"{test_npc.first_name} {test_npc.last_name}"


@pytest.mark.asyncio
async def test_flag_without_justification(client: AsyncClient, test_operator, test_npc):
    """Test submitting flag with empty justification (should work after fix)."""
    response = await client.post("/api/system/flag", json={
        "operator_id": str(test_operator.id),
        "citizen_id": str(test_npc.id),
        "flag_type": "detention",
        "contributing_factors": [],
        "justification": "",  # Empty - should be allowed
        "decision_time_seconds": 5.0
    })

    assert response.status_code == 200
    data = response.json()
    assert data["flag_type"] == "detention"


@pytest.mark.asyncio
async def test_flag_missing_justification_field(client: AsyncClient, test_operator, test_npc):
    """Test submitting flag with justification field omitted entirely."""
    response = await client.post("/api/system/flag", json={
        "operator_id": str(test_operator.id),
        "citizen_id": str(test_npc.id),
        "flag_type": "restriction",
        "contributing_factors": ["suspicious_activity"],
        # justification field omitted - should default to ""
        "decision_time_seconds": 10.0
    })

    assert response.status_code == 200


@pytest.mark.asyncio
async def test_no_action_without_justification(client: AsyncClient, test_operator, test_npc):
    """Test no-action decision without justification."""
    response = await client.post("/api/system/no-action", json={
        "operator_id": str(test_operator.id),
        "citizen_id": str(test_npc.id),
        "justification": "",
        "decision_time_seconds": 10.0
    })

    assert response.status_code == 200
    data = response.json()
    assert data["logged"] is True
    assert "compliance_impact" in data


@pytest.mark.asyncio
async def test_no_action_missing_justification_field(client: AsyncClient, test_operator, test_npc):
    """Test no-action with justification field omitted."""
    response = await client.post("/api/system/no-action", json={
        "operator_id": str(test_operator.id),
        "citizen_id": str(test_npc.id),
        # justification field omitted - should default to ""
        "decision_time_seconds": 8.0
    })

    assert response.status_code == 200


@pytest.mark.asyncio
async def test_multiple_flags_different_types(client: AsyncClient, test_operator, test_npc):
    """Test submitting multiple flags of different types without justification."""
    flag_types = ["monitoring", "restriction", "intervention", "detention"]

    for flag_type in flag_types:
        response = await client.post("/api/system/flag", json={
            "operator_id": str(test_operator.id),
            "citizen_id": str(test_npc.id),
            "flag_type": flag_type,
            "contributing_factors": [],
            "justification": "",
            "decision_time_seconds": 3.0
        })

        assert response.status_code == 200
        data = response.json()
        assert data["flag_type"] == flag_type


@pytest.mark.asyncio
async def test_flag_with_long_justification(client: AsyncClient, test_operator, test_npc):
    """Test submitting flag with a long justification text."""
    long_justification = "This is a very long justification. " * 50  # ~1700 characters

    response = await client.post("/api/system/flag", json={
        "operator_id": str(test_operator.id),
        "citizen_id": str(test_npc.id),
        "flag_type": "monitoring",
        "contributing_factors": ["pattern_analysis"],
        "justification": long_justification,
        "decision_time_seconds": 45.0
    })

    assert response.status_code == 200
    data = response.json()
    assert "flag_id" in data

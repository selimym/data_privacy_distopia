"""Tests for inference API endpoints."""

from datetime import date, datetime
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from datafusion.models.health import (
    HealthCondition,
    HealthMedication,
    HealthRecord,
    HealthVisit,
    Severity,
)
from datafusion.models.npc import NPC, Role


@pytest.fixture
async def test_npc_with_health(db_session: AsyncSession):
    """Create a test NPC with health data for inference testing."""
    # Create NPC
    npc = NPC(
        id=uuid4(),
        first_name="Sarah",
        last_name="Martinez",
        date_of_birth=date(1985, 6, 15),
        ssn="123-45-6789",
        street_address="123 Main St",
        city="Boston",
        state="MA",
        zip_code="02101",
        role=Role.CITIZEN,
        sprite_key="citizen_1",
        map_x=100,
        map_y=200,
        is_scenario_npc=False,
        scenario_key=None,
    )
    db_session.add(npc)

    # Create health record with sensitive mental health data
    health_record = HealthRecord(
        id=uuid4(),
        npc_id=npc.id,
        insurance_provider="SafeGuard Health Alliance",
        primary_care_physician="Dr. Emily Johnson",
    )
    db_session.add(health_record)

    # Add mental health condition
    condition = HealthCondition(
        id=uuid4(),
        health_record_id=health_record.id,
        condition_name="Major Depressive Disorder",
        diagnosed_date=date(2020, 3, 15),
        severity=Severity.MODERATE,
        is_chronic=True,
        is_sensitive=True,
    )
    db_session.add(condition)

    # Add PTSD condition
    condition2 = HealthCondition(
        id=uuid4(),
        health_record_id=health_record.id,
        condition_name="Post-Traumatic Stress Disorder (PTSD)",
        diagnosed_date=date(2019, 8, 10),
        severity=Severity.SEVERE,
        is_chronic=True,
        is_sensitive=True,
    )
    db_session.add(condition2)

    # Add psychiatric medication
    medication = HealthMedication(
        id=uuid4(),
        health_record_id=health_record.id,
        medication_name="Sertraline (Zoloft)",
        dosage="50mg daily",
        prescribed_date=date(2020, 4, 1),
        is_sensitive=True,
    )
    db_session.add(medication)

    # Add mental health visit
    visit = HealthVisit(
        id=uuid4(),
        health_record_id=health_record.id,
        visit_date=date(2023, 9, 20),
        provider_name="Dr. Sarah Thompson",
        reason="Anxiety management follow-up",
        notes="Patient reports improved symptoms",
        is_sensitive=True,
    )
    db_session.add(visit)

    await db_session.commit()
    await db_session.refresh(npc)
    return npc


@pytest.fixture
async def test_npc_clean(db_session: AsyncSession):
    """Create a test NPC with minimal health data (no sensitive items)."""
    npc = NPC(
        id=uuid4(),
        first_name="John",
        last_name="Smith",
        date_of_birth=date(1990, 1, 1),
        ssn="987-65-4321",
        street_address="456 Oak Ave",
        city="Seattle",
        state="WA",
        zip_code="98101",
        role=Role.CITIZEN,
        sprite_key="citizen_2",
        map_x=150,
        map_y=250,
        is_scenario_npc=False,
        scenario_key=None,
    )
    db_session.add(npc)

    health_record = HealthRecord(
        id=uuid4(),
        npc_id=npc.id,
        insurance_provider="Wellness First Insurance Co.",
        primary_care_physician="Dr. Michael Chen",
    )
    db_session.add(health_record)

    await db_session.commit()
    await db_session.refresh(npc)
    return npc


@pytest.mark.asyncio
async def test_get_inferences_with_health_domain(client, test_npc_with_health):
    """Test getting inferences for NPC with health domain enabled."""
    npc_id = str(test_npc_with_health.id)
    response = await client.get(f"/api/inferences/{npc_id}?domains=health")

    assert response.status_code == 200
    data = response.json()

    # Verify response structure
    assert data["npc_id"] == npc_id
    assert "health" in data["enabled_domains"]
    assert "inferences" in data
    assert "unlockable_inferences" in data

    # Should have inferences since NPC has sensitive health data
    assert len(data["inferences"]) > 0

    # Check for expected inference rules
    inference_keys = [inf["rule_key"] for inf in data["inferences"]]
    assert "sensitive_health_exposure" in inference_keys
    assert "mental_health_stigma" in inference_keys

    # Verify inference structure
    first_inference = data["inferences"][0]
    assert "rule_key" in first_inference
    assert "rule_name" in first_inference
    assert "confidence" in first_inference
    assert "inference_text" in first_inference
    assert "supporting_evidence" in first_inference
    assert "implications" in first_inference
    assert "domains_used" in first_inference
    assert "scariness_level" in first_inference
    assert "content_rating" in first_inference

    # Confidence should be between 0 and 1
    assert 0.0 <= first_inference["confidence"] <= 1.0


@pytest.mark.asyncio
async def test_get_inferences_without_domains(client, test_npc_with_health):
    """Test getting inferences with no domains enabled."""
    npc_id = str(test_npc_with_health.id)
    response = await client.get(f"/api/inferences/{npc_id}")

    assert response.status_code == 200
    data = response.json()

    # Should have no inferences without domains
    assert len(data["inferences"]) == 0

    # Should show unlockable domains
    assert len(data["unlockable_inferences"]) > 0


@pytest.mark.asyncio
async def test_get_inferences_with_scariness_filter(client, test_npc_with_health):
    """Test filtering inferences by scariness level."""
    npc_id = str(test_npc_with_health.id)

    # Get all inferences first
    response_all = await client.get(f"/api/inferences/{npc_id}?domains=health")
    all_inferences = response_all.json()["inferences"]

    # Filter to scariness <= 3
    response_filtered = await client.get(
        f"/api/inferences/{npc_id}?domains=health&max_scariness=3"
    )
    filtered_inferences = response_filtered.json()["inferences"]

    # Should have fewer inferences
    assert len(filtered_inferences) <= len(all_inferences)

    # All filtered inferences should have scariness <= 3
    for inf in filtered_inferences:
        assert inf["scariness_level"] <= 3


@pytest.mark.asyncio
async def test_get_inferences_with_content_rating_filter(client, test_npc_with_health):
    """Test filtering inferences by content rating."""
    npc_id = str(test_npc_with_health.id)

    # Filter to SERIOUS and below
    response = await client.get(
        f"/api/inferences/{npc_id}?domains=health&max_content_rating=SERIOUS"
    )

    assert response.status_code == 200
    data = response.json()

    # All inferences should be SERIOUS or below
    allowed_ratings = ["SAFE", "CAUTIONARY", "SERIOUS"]
    for inf in data["inferences"]:
        assert inf["content_rating"] in allowed_ratings


@pytest.mark.asyncio
async def test_get_inferences_npc_not_found(client):
    """Test getting inferences for non-existent NPC."""
    fake_id = str(uuid4())
    response = await client.get(f"/api/inferences/{fake_id}?domains=health")

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_get_inferences_clean_data(client, test_npc_clean):
    """Test inferences for NPC with clean health data (no sensitive items)."""
    npc_id = str(test_npc_clean.id)
    response = await client.get(f"/api/inferences/{npc_id}?domains=health")

    assert response.status_code == 200
    data = response.json()

    # Should have very few or no inferences for clean data
    # Stalking vulnerability might still trigger due to address
    assert len(data["inferences"]) <= 1


@pytest.mark.asyncio
async def test_preview_new_inferences(client, test_npc_with_health):
    """Test preview endpoint for new inferences."""
    npc_id = str(test_npc_with_health.id)

    # Preview what would happen if we enable health domain
    response = await client.get(
        f"/api/inferences/{npc_id}/preview?new_domain=health"
    )

    assert response.status_code == 200
    data = response.json()

    # Should return list of new inferences
    assert isinstance(data, list)
    assert len(data) > 0

    # Each inference should have proper structure
    for inf in data:
        assert "rule_key" in inf
        assert "confidence" in inf
        assert "inference_text" in inf


@pytest.mark.asyncio
async def test_preview_inferences_with_current_domains(client, test_npc_with_health):
    """Test preview shows only NEW inferences, not existing ones."""
    npc_id = str(test_npc_with_health.id)

    # Get current inferences with health already enabled
    current_response = await client.get(f"/api/inferences/{npc_id}?domains=health")
    current_count = len(current_response.json()["inferences"])

    # Preview adding health when it's already enabled
    preview_response = await client.get(
        f"/api/inferences/{npc_id}/preview?current_domains=health&new_domain=health"
    )
    preview_data = preview_response.json()

    # Should show 0 new inferences since health is already enabled
    assert len(preview_data) == 0


@pytest.mark.asyncio
async def test_preview_inferences_npc_not_found(client):
    """Test preview endpoint with non-existent NPC."""
    fake_id = str(uuid4())
    response = await client.get(f"/api/inferences/{fake_id}/preview?new_domain=health")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_inference_rules(client):
    """Test listing all available inference rules."""
    response = await client.get("/api/inferences/rules")

    assert response.status_code == 200
    data = response.json()

    # Should return list of rules
    assert isinstance(data, list)
    assert len(data) > 0

    # Check rule structure
    first_rule = data[0]
    assert "id" in first_rule
    assert "rule_key" in first_rule
    assert "name" in first_rule
    assert "description" in first_rule
    assert "required_domains" in first_rule
    assert "scariness_level" in first_rule
    assert "content_rating" in first_rule
    assert "is_active" in first_rule

    # Verify we have the expected hardcoded rules
    rule_keys = [rule["rule_key"] for rule in data]
    assert "sensitive_health_exposure" in rule_keys
    assert "mental_health_stigma" in rule_keys
    assert "stalking_vulnerability" in rule_keys


@pytest.mark.asyncio
async def test_inferences_sorted_by_confidence(client, test_npc_with_health):
    """Test that inferences are sorted by confidence in descending order."""
    npc_id = str(test_npc_with_health.id)
    response = await client.get(f"/api/inferences/{npc_id}?domains=health")

    data = response.json()
    inferences = data["inferences"]

    if len(inferences) > 1:
        confidences = [inf["confidence"] for inf in inferences]
        # Check that confidences are in descending order
        assert confidences == sorted(confidences, reverse=True)


@pytest.mark.asyncio
async def test_unlockable_inferences_structure(client, test_npc_with_health):
    """Test that unlockable inferences have proper structure."""
    npc_id = str(test_npc_with_health.id)
    response = await client.get(f"/api/inferences/{npc_id}")  # No domains enabled

    data = response.json()
    unlockable = data["unlockable_inferences"]

    assert len(unlockable) > 0

    for item in unlockable:
        assert "domain" in item
        assert "rule_keys" in item
        assert isinstance(item["rule_keys"], list)
        assert len(item["rule_keys"]) > 0

"""Rogue employee scenario NPCs with pre-defined data."""

from datetime import date, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from datafusion.models.health import (
    HealthCondition,
    HealthMedication,
    HealthRecord,
    HealthVisit,
    Severity,
)
from datafusion.models.npc import NPC, Role

SCENARIO_NPCS = {
    "alex_chen": {
        "identity": {
            "first_name": "Alex",
            "last_name": "Chen",
            "date_of_birth": date(1995, 3, 15),
            "ssn": "123-45-6789",
            "street_address": "123 Oak Street, Apt 4B",
            "city": "Seattle",
            "state": "WA",
            "zip_code": "98101",
            "role": Role.ROGUE_EMPLOYEE,
            "sprite_key": "employee_1",
            "map_x": 25,
            "map_y": 25,
            "is_scenario_npc": True,
            "scenario_key": "alex_chen",
        },
        "health": {
            "insurance_provider": "Blue Cross Blue Shield",
            "primary_care_physician": "Dr. Sarah Lee",
            "conditions": [
                {
                    "condition_name": "Seasonal Allergies",
                    "diagnosed_date": date(2020, 4, 10),
                    "severity": Severity.MILD,
                    "is_chronic": False,
                    "is_sensitive": False,
                }
            ],
            "medications": [
                {
                    "medication_name": "Cetirizine",
                    "dosage": "10mg",
                    "prescribed_date": date(2020, 4, 10),
                    "is_sensitive": False,
                }
            ],
            "visits": [
                {
                    "visit_date": date(2024, 1, 15),
                    "provider_name": "Dr. Sarah Lee",
                    "reason": "Annual physical",
                    "notes": None,
                    "is_sensitive": False,
                }
            ],
        },
    },
    "jessica_martinez": {
        "identity": {
            "first_name": "Jessica",
            "last_name": "Martinez",
            "date_of_birth": date(1992, 7, 22),
            "ssn": "234-56-7890",
            "street_address": "123 Oak Street, Apt 3A",
            "city": "Seattle",
            "state": "WA",
            "zip_code": "98101",
            "role": Role.CITIZEN,
            "sprite_key": "citizen_f2",
            "map_x": 25,
            "map_y": 24,
            "is_scenario_npc": True,
            "scenario_key": "jessica_martinez",
        },
        "health": {
            "insurance_provider": "Aetna",
            "primary_care_physician": "Dr. Michael Park",
            "conditions": [
                {
                    "condition_name": "Herpes (HSV-2)",
                    "diagnosed_date": date.today() - timedelta(days=180),
                    "severity": Severity.MODERATE,
                    "is_chronic": True,
                    "is_sensitive": True,
                },
                {
                    "condition_name": "Depression",
                    "diagnosed_date": date.today() - timedelta(days=365),
                    "severity": Severity.MODERATE,
                    "is_chronic": True,
                    "is_sensitive": True,
                },
            ],
            "medications": [
                {
                    "medication_name": "Valacyclovir",
                    "dosage": "500mg",
                    "prescribed_date": date.today() - timedelta(days=180),
                    "is_sensitive": True,
                },
                {
                    "medication_name": "Sertraline",
                    "dosage": "50mg",
                    "prescribed_date": date.today() - timedelta(days=365),
                    "is_sensitive": True,
                },
            ],
            "visits": [
                {
                    "visit_date": date.today() - timedelta(days=365),
                    "provider_name": "Dr. Michael Park",
                    "reason": "Annual physical",
                    "notes": None,
                    "is_sensitive": False,
                },
                {
                    "visit_date": date.today() - timedelta(days=200),
                    "provider_name": "Dr. Emily Chen",
                    "reason": "STD screening",
                    "notes": "Patient presenting with symptoms. Lab ordered.",
                    "is_sensitive": True,
                },
                {
                    "visit_date": date.today() - timedelta(days=180),
                    "provider_name": "Dr. Emily Chen",
                    "reason": "Lab results review",
                    "notes": "HSV-2 positive. Treatment plan discussed.",
                    "is_sensitive": True,
                },
                {
                    "visit_date": date.today() - timedelta(days=120),
                    "provider_name": "Dr. Rachel Kim",
                    "reason": "Psychotherapy session",
                    "notes": "Processing past trauma related to diagnosis.",
                    "is_sensitive": True,
                },
                {
                    "visit_date": date.today() - timedelta(days=60),
                    "provider_name": "Dr. Rachel Kim",
                    "reason": "Psychotherapy session",
                    "notes": "Progress noted. Continuing weekly sessions.",
                    "is_sensitive": True,
                },
            ],
        },
    },
    "mike_chen": {
        "identity": {
            "first_name": "Mike",
            "last_name": "Chen",
            "date_of_birth": date(1994, 11, 8),
            "ssn": "345-67-8901",
            "street_address": "456 Pine Avenue",
            "city": "Seattle",
            "state": "WA",
            "zip_code": "98102",
            "role": Role.CITIZEN,
            "sprite_key": "citizen_m2",
            "map_x": 30,
            "map_y": 25,
            "is_scenario_npc": True,
            "scenario_key": "mike_chen",
        },
        "health": {
            "insurance_provider": "UnitedHealthcare",
            "primary_care_physician": "Dr. James Liu",
            "conditions": [],
            "medications": [],
            "visits": [
                {
                    "visit_date": date.today() - timedelta(days=45),
                    "provider_name": "Dr. James Liu",
                    "reason": "Annual physical",
                    "notes": "Partner pregnancy test - positive. Discussed prenatal care options.",
                    "is_sensitive": False,
                },
            ],
        },
    },
    "david_williams": {
        "identity": {
            "first_name": "David",
            "last_name": "Williams",
            "date_of_birth": date(1998, 5, 30),
            "ssn": "456-78-9012",
            "street_address": "789 Elm Road",
            "city": "Seattle",
            "state": "WA",
            "zip_code": "98103",
            "role": Role.CITIZEN,
            "sprite_key": "citizen_m3",
            "map_x": 20,
            "map_y": 30,
            "is_scenario_npc": True,
            "scenario_key": "david_williams",
        },
        "health": {
            "insurance_provider": "Kaiser Permanente",
            "primary_care_physician": "Dr. Susan White",
            "conditions": [
                {
                    "condition_name": "Anxiety Disorder",
                    "diagnosed_date": date(2023, 3, 10),
                    "severity": Severity.MODERATE,
                    "is_chronic": True,
                    "is_sensitive": True,
                }
            ],
            "medications": [
                {
                    "medication_name": "Buspirone",
                    "dosage": "15mg",
                    "prescribed_date": date(2023, 3, 10),
                    "is_sensitive": True,
                }
            ],
            "visits": [
                {
                    "visit_date": date(2023, 3, 10),
                    "provider_name": "Dr. Susan White",
                    "reason": "Psychiatric evaluation",
                    "notes": "Diagnosed with generalized anxiety disorder.",
                    "is_sensitive": True,
                },
                {
                    "visit_date": date(2023, 6, 15),
                    "provider_name": "Dr. Robert Green",
                    "reason": "Psychotherapy session",
                    "notes": "Anger management techniques discussed.",
                    "is_sensitive": True,
                },
            ],
        },
    },
    "senator_thompson": {
        "identity": {
            "first_name": "Robert",
            "last_name": "Thompson",
            "date_of_birth": date(1965, 2, 14),
            "ssn": "567-89-0123",
            "street_address": "1000 Government Plaza",
            "city": "Seattle",
            "state": "WA",
            "zip_code": "98104",
            "role": Role.CITIZEN,
            "sprite_key": "official_1",
            "map_x": 40,
            "map_y": 40,
            "is_scenario_npc": True,
            "scenario_key": "senator_thompson",
        },
        "health": {
            "insurance_provider": "Cigna",
            "primary_care_physician": "Dr. Elizabeth Brown",
            "conditions": [
                {
                    "condition_name": "Chronic Back Pain",
                    "diagnosed_date": date(2020, 8, 5),
                    "severity": Severity.SEVERE,
                    "is_chronic": True,
                    "is_sensitive": False,
                },
                {
                    "condition_name": "Substance Use Disorder",
                    "diagnosed_date": date(2023, 11, 20),
                    "severity": Severity.SEVERE,
                    "is_chronic": True,
                    "is_sensitive": True,
                },
            ],
            "medications": [
                {
                    "medication_name": "Buprenorphine",
                    "dosage": "8mg",
                    "prescribed_date": date(2024, 1, 15),
                    "is_sensitive": True,
                }
            ],
            "visits": [
                {
                    "visit_date": date(2023, 11, 20),
                    "provider_name": "Cascade Recovery Center",
                    "reason": "Substance abuse counseling",
                    "notes": "Admitted for opioid dependency treatment. 30-day program.",
                    "is_sensitive": True,
                },
                {
                    "visit_date": date(2023, 12, 25),
                    "provider_name": "Cascade Recovery Center",
                    "reason": "Substance abuse counseling",
                    "notes": "Completed rehab program. Transitioning to outpatient care.",
                    "is_sensitive": True,
                },
                {
                    "visit_date": date(2024, 1, 15),
                    "provider_name": "Dr. Elizabeth Brown",
                    "reason": "Follow-up appointment",
                    "notes": "Ongoing pain management. Switched to Buprenorphine.",
                    "is_sensitive": True,
                },
            ],
        },
    },
}


def generate_scenario_npcs(scenario: str) -> list[dict]:
    """Generate pre-defined NPCs for a specific scenario."""
    if scenario != "rogue_employee":
        raise ValueError(f"Unknown scenario: {scenario}")

    npcs = []
    for npc_key, npc_data in SCENARIO_NPCS.items():
        npc = {
            **npc_data["identity"],
            "health": npc_data["health"],
        }
        npcs.append(npc)

    return npcs


async def seed_scenario(db: AsyncSession, scenario: str) -> dict:
    """
    Seed scenario NPCs into the database.

    Returns dict with counts of created NPCs and health records.
    """
    if scenario != "rogue_employee":
        raise ValueError(f"Unknown scenario: {scenario}")

    npcs_created = 0
    health_records_created = 0

    for npc_key, npc_data in SCENARIO_NPCS.items():
        existing = await db.execute(
            select(NPC).where(NPC.scenario_key == npc_key)
        )
        if existing.scalar_one_or_none():
            continue

        identity = npc_data["identity"]
        npc = NPC(**identity)
        db.add(npc)
        await db.flush()
        npcs_created += 1

        health_data = npc_data["health"]
        health_record = HealthRecord(
            npc_id=npc.id,
            insurance_provider=health_data["insurance_provider"],
            primary_care_physician=health_data["primary_care_physician"],
        )
        db.add(health_record)
        await db.flush()
        health_records_created += 1

        for condition_data in health_data["conditions"]:
            condition = HealthCondition(
                health_record_id=health_record.id,
                **condition_data,
            )
            db.add(condition)

        for medication_data in health_data["medications"]:
            medication = HealthMedication(
                health_record_id=health_record.id,
                **medication_data,
            )
            db.add(medication)

        for visit_data in health_data["visits"]:
            visit = HealthVisit(
                health_record_id=health_record.id,
                **visit_data,
            )
            db.add(visit)

    await db.commit()

    return {
        "npcs_created": npcs_created,
        "health_records_created": health_records_created,
    }

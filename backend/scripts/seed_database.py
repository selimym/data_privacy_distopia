"""Database seeding script for development and testing."""

import argparse
import asyncio
import sys

from sqlalchemy import select

from datafusion.database import AsyncSessionLocal, Base, engine
from datafusion.generators import generate_full_population
from datafusion.generators.scenarios import seed_scenario
from datafusion.models.health import (
    HealthCondition,
    HealthMedication,
    HealthRecord,
    HealthVisit,
)
from datafusion.models.npc import NPC


async def reset_database():
    """Drop and recreate all tables."""
    print("Resetting database...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("Database reset complete.")


async def seed_population(count: int, seed: int | None):
    """Seed random population NPCs."""
    print(f"Generating {count} NPCs with seed={seed}...")
    data = generate_full_population(count, seed)

    async with AsyncSessionLocal() as db:
        npcs_created = 0
        health_records_created = 0

        for npc_data in data["npcs"]:
            npc_id = npc_data.pop("id")
            health_data = data["health_records"][str(npc_id)]

            npc = NPC(id=npc_id, **npc_data)
            db.add(npc)
            await db.flush()
            npcs_created += 1

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

        print(f"Created {npcs_created} NPCs and {health_records_created} health records.")


async def seed_scenario_npcs(scenario: str):
    """Seed scenario-specific NPCs."""
    print(f"Seeding scenario: {scenario}...")
    async with AsyncSessionLocal() as db:
        result = await seed_scenario(db, scenario)
        if result["npcs_created"] == 0:
            print(f"Scenario '{scenario}' NPCs already exist, skipping.")
        else:
            print(
                f"Created {result['npcs_created']} scenario NPCs "
                f"and {result['health_records_created']} health records."
            )


async def get_stats():
    """Get database statistics."""
    async with AsyncSessionLocal() as db:
        npc_count = await db.execute(select(NPC))
        npcs = len(npc_count.scalars().all())

        health_count = await db.execute(select(HealthRecord))
        health_records = len(health_count.scalars().all())

        return npcs, health_records


async def main():
    """Main seeding logic."""
    parser = argparse.ArgumentParser(description="Seed the database with test data")
    parser.add_argument(
        "--population",
        type=int,
        default=50,
        help="Number of random NPCs to generate (default: 50)",
    )
    parser.add_argument(
        "--scenario",
        type=str,
        help="Scenario to seed (e.g., 'rogue_employee')",
    )
    parser.add_argument(
        "--seed",
        type=int,
        help="Random seed for reproducibility",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Drop and recreate all tables before seeding",
    )

    args = parser.parse_args()

    try:
        if args.reset:
            await reset_database()

        if args.population > 0:
            await seed_population(args.population, args.seed)

        if args.scenario:
            await seed_scenario_npcs(args.scenario)

        npcs, health_records = await get_stats()
        print(f"\nDatabase summary: {npcs} NPCs, {health_records} health records")

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

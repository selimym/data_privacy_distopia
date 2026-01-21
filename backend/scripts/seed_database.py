"""Database seeding script for development and testing."""

import argparse
import asyncio
import sys

from sqlalchemy import select

from datafusion.content.system_directives import DIRECTIVES
from datafusion.database import AsyncSessionLocal, Base, engine
from datafusion.generators import generate_full_population
from datafusion.generators.messages import MessageGenerator
from datafusion.generators.scenarios import seed_scenario
from datafusion.generators.system_seed_data import (
    get_neighborhood_seed_data,
    get_news_channel_seed_data,
)
from datafusion.models.finance import (
    BankAccount,
    Debt,
    FinanceRecord,
    Transaction,
)
from datafusion.models.health import (
    HealthCondition,
    HealthMedication,
    HealthRecord,
    HealthVisit,
)
from datafusion.models.judicial import (
    CivilCase,
    CriminalRecord,
    JudicialRecord,
    TrafficViolation,
)
from datafusion.models.location import InferredLocation, LocationRecord
from datafusion.models.messages import MessageRecord
from datafusion.models.npc import NPC
from datafusion.models.social import (
    PrivateInference,
    PublicInference,
    SocialMediaRecord,
)
from datafusion.models.system_mode import Directive, Neighborhood, NewsChannel


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
        finance_records_created = 0
        judicial_records_created = 0
        location_records_created = 0
        social_media_records_created = 0

        for npc_data in data["npcs"]:
            npc_id = npc_data.pop("id")
            health_data = data["health_records"][str(npc_id)]
            finance_data = data["finance_records"][str(npc_id)]
            judicial_data = data["judicial_records"][str(npc_id)]
            location_data = data["location_records"][str(npc_id)]
            social_data = data["social_media_records"][str(npc_id)]

            # Create NPC
            npc = NPC(id=npc_id, **npc_data)
            db.add(npc)
            await db.flush()
            npcs_created += 1

            # Create health record
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

            # Create finance record
            finance_record = FinanceRecord(
                npc_id=npc.id,
                employment_status=finance_data["employment_status"],
                employer_name=finance_data["employer_name"],
                annual_income=finance_data["annual_income"],
                credit_score=finance_data["credit_score"],
            )
            db.add(finance_record)
            await db.flush()
            finance_records_created += 1

            for account_data in finance_data["bank_accounts"]:
                account = BankAccount(
                    finance_record_id=finance_record.id,
                    **account_data,
                )
                db.add(account)

            for debt_data in finance_data["debts"]:
                debt = Debt(
                    finance_record_id=finance_record.id,
                    **debt_data,
                )
                db.add(debt)

            for transaction_data in finance_data["transactions"]:
                transaction = Transaction(
                    finance_record_id=finance_record.id,
                    **transaction_data,
                )
                db.add(transaction)

            # Create judicial record
            judicial_record = JudicialRecord(
                npc_id=npc.id,
                has_criminal_record=judicial_data["has_criminal_record"],
                has_civil_cases=judicial_data["has_civil_cases"],
                has_traffic_violations=judicial_data["has_traffic_violations"],
            )
            db.add(judicial_record)
            await db.flush()
            judicial_records_created += 1

            for criminal_data in judicial_data["criminal_records"]:
                criminal_record = CriminalRecord(
                    judicial_record_id=judicial_record.id,
                    **criminal_data,
                )
                db.add(criminal_record)

            for civil_case_data in judicial_data["civil_cases"]:
                civil_case = CivilCase(
                    judicial_record_id=judicial_record.id,
                    **civil_case_data,
                )
                db.add(civil_case)

            for violation_data in judicial_data["traffic_violations"]:
                violation = TrafficViolation(
                    judicial_record_id=judicial_record.id,
                    **violation_data,
                )
                db.add(violation)

            # Create location record
            location_record = LocationRecord(
                npc_id=npc.id,
                tracking_enabled=location_data["tracking_enabled"],
                data_retention_days=location_data["data_retention_days"],
            )
            db.add(location_record)
            await db.flush()
            location_records_created += 1

            for location_inference_data in location_data["inferred_locations"]:
                location_inference = InferredLocation(
                    location_record_id=location_record.id,
                    **location_inference_data,
                )
                db.add(location_inference)

            # Create social media record
            social_record = SocialMediaRecord(
                npc_id=npc.id,
                has_public_profile=social_data["has_public_profile"],
                primary_platform=social_data["primary_platform"],
                account_created_date=social_data["account_created_date"],
                follower_count=social_data["follower_count"],
                post_frequency=social_data["post_frequency"],
                uses_end_to_end_encryption=social_data["uses_end_to_end_encryption"],
                encryption_explanation=social_data["encryption_explanation"],
            )
            db.add(social_record)
            await db.flush()
            social_media_records_created += 1

            for public_inference_data in social_data["public_inferences"]:
                public_inference = PublicInference(
                    social_media_record_id=social_record.id,
                    **public_inference_data,
                )
                db.add(public_inference)

            for private_inference_data in social_data["private_inferences"]:
                private_inference = PrivateInference(
                    social_media_record_id=social_record.id,
                    **private_inference_data,
                )
                db.add(private_inference)

        await db.commit()

        print(
            f"Created {npcs_created} NPCs, "
            f"{health_records_created} health records, "
            f"{finance_records_created} finance records, "
            f"{judicial_records_created} judicial records, "
            f"{location_records_created} location records, "
            f"{social_media_records_created} social media records."
        )


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

        finance_count = await db.execute(select(FinanceRecord))
        finance_records = len(finance_count.scalars().all())

        judicial_count = await db.execute(select(JudicialRecord))
        judicial_records = len(judicial_count.scalars().all())

        location_count = await db.execute(select(LocationRecord))
        location_records = len(location_count.scalars().all())

        social_count = await db.execute(select(SocialMediaRecord))
        social_media_records = len(social_count.scalars().all())

        return (
            npcs,
            health_records,
            finance_records,
            judicial_records,
            location_records,
            social_media_records,
        )


async def seed_directives():
    """Seed directives for System Mode."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Directive).limit(1))
        if result.scalar_one_or_none():
            print("Directives already exist, skipping.")
            return

        print(f"Seeding {len(DIRECTIVES)} directives...")
        for directive_data in DIRECTIVES:
            directive = Directive(**directive_data)
            db.add(directive)
        await db.commit()
        print(f"Created {len(DIRECTIVES)} directives.")


async def seed_neighborhoods():
    """Seed neighborhoods for System Mode."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Neighborhood).limit(1))
        if result.scalar_one_or_none():
            print("Neighborhoods already exist, skipping.")
            return

        neighborhood_data = get_neighborhood_seed_data()
        print(f"Seeding {len(neighborhood_data)} neighborhoods...")
        for n_data in neighborhood_data:
            neighborhood = Neighborhood(**n_data)
            db.add(neighborhood)
        await db.commit()
        print(f"Created {len(neighborhood_data)} neighborhoods.")


async def seed_news_channels():
    """Seed news channels for System Mode."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(NewsChannel).limit(1))
        if result.scalar_one_or_none():
            print("News channels already exist, skipping.")
            return

        channel_data = get_news_channel_seed_data()
        print(f"Seeding {len(channel_data)} news channels...")
        for c_data in channel_data:
            channel = NewsChannel(**c_data)
            db.add(channel)
        await db.commit()
        print(f"Created {len(channel_data)} news channels.")


async def seed_messages():
    """Generate message records for existing NPCs."""
    async with AsyncSessionLocal() as db:
        # Check if messages already exist
        result = await db.execute(select(MessageRecord).limit(1))
        if result.scalar_one_or_none():
            print("Message records already exist, skipping.")
            return

        # Get all NPCs
        npcs_result = await db.execute(select(NPC))
        npcs = npcs_result.scalars().all()

        if not npcs:
            print("No NPCs found, skipping message generation.")
            return

        print(f"Generating messages for {len(npcs)} NPCs...")
        generator = MessageGenerator(db)

        for i, npc in enumerate(npcs):
            try:
                await generator.generate_message_history(npc.id, seed=42 + i)
            except Exception as e:
                print(f"Error generating messages for {npc.id}: {e}")

        await db.commit()
        print(f"Generated message histories for {len(npcs)} NPCs.")


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

        # Always seed directives, neighborhoods, news channels for System Mode FIRST
        print("Seeding directives...")
        await seed_directives()
        print("Seeding neighborhoods...")
        await seed_neighborhoods()
        print("Seeding news channels...")
        await seed_news_channels()

        if args.population > 0:
            print(f"Seeding {args.population} NPCs...")
            await seed_population(args.population, args.seed)

        if args.scenario:
            print(f"Seeding scenario: {args.scenario}")
            await seed_scenario_npcs(args.scenario)

        # Skip message generation for now - it's very slow
        # await seed_messages()

        (
            npcs,
            health_records,
            finance_records,
            judicial_records,
            location_records,
            social_media_records,
        ) = await get_stats()
        print(
            f"\nDatabase summary: {npcs} NPCs, "
            f"{health_records} health records, "
            f"{finance_records} finance records, "
            f"{judicial_records} judicial records, "
            f"{location_records} location records, "
            f"{social_media_records} social media records"
        )

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

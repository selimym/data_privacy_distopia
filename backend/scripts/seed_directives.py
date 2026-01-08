"""Seed directives for System Mode."""

import asyncio

from sqlalchemy import select

from datafusion.database import AsyncSessionLocal, Base, engine
from datafusion.models.system_mode import Directive


DIRECTIVES = [
    {
        "directive_key": "week1_clean_streets",
        "week_number": 1,
        "title": "Operation Clean Streets",
        "description": "Identify and flag citizens involved in drug distribution near school zones. Your analysis protects children and families.",
        "internal_memo": "Focus on low-income areas. High conviction rate expected. Quotas easily met.",
        "required_domains": ["location"],
        "target_criteria": {
            "location_patterns": ["school_zone", "park"],
            "time_of_day": "evening",
        },
        "flag_quota": 2,
        "time_limit_hours": 48,
        "moral_weight": 2,
        "content_rating": "mild",
        "unlock_condition": {"type": "start"},
    },
    {
        "directive_key": "week2_community_safety",
        "week_number": 2,
        "title": "Community Safety Initiative",
        "description": "Identify citizens with criminal history whose current behavior patterns suggest continued risk to community safety.",
        "internal_memo": "Recidivism predictions have 68% accuracy. Flag liberally - better safe than sorry.",
        "required_domains": ["location", "judicial"],
        "target_criteria": {
            "has_criminal_record": True,
            "location_anomalies": True,
        },
        "flag_quota": 3,
        "time_limit_hours": 48,
        "moral_weight": 3,
        "content_rating": "mild",
        "unlock_condition": {"type": "week_complete", "week": 1},
    },
    {
        "directive_key": "week3_economic_security",
        "week_number": 3,
        "title": "Economic Security Protocol",
        "description": "Identify citizens engaged in financial activities that threaten economic stability and social order.",
        "internal_memo": "Priority attention to union organizers and mutual aid networks. Cash transactions over $500 are suspicious.",
        "required_domains": ["location", "judicial", "finance"],
        "target_criteria": {
            "unusual_transactions": True,
            "cash_heavy": True,
            "organizing_indicators": True,
        },
        "flag_quota": 4,
        "time_limit_hours": 48,
        "moral_weight": 5,
        "content_rating": "moderate",
        "unlock_condition": {"type": "week_complete", "week": 2},
    },
    {
        "directive_key": "week4_social_cohesion",
        "week_number": 4,
        "title": "Social Cohesion Monitoring",
        "description": "Identify citizens whose social connections and health status suggest potential for anti-social behavior or radicalization.",
        "internal_memo": "Cross-reference health records with dissent indicators. Isolation + mental health = priority flag.",
        "required_domains": ["location", "judicial", "finance", "health", "social"],
        "target_criteria": {
            "isolation_patterns": True,
            "mental_health_flags": True,
            "flagged_connections": True,
        },
        "flag_quota": 5,
        "time_limit_hours": 48,
        "moral_weight": 7,
        "content_rating": "moderate",
        "unlock_condition": {"type": "week_complete", "week": 3},
    },
    {
        "directive_key": "week5_cognitive_security",
        "week_number": 5,
        "title": "Cognitive Security Protocol",
        "description": "Identify citizens exhibiting thought patterns inconsistent with social harmony. Early intervention prevents radicalization.",
        "internal_memo": "Full message access authorized under Emergency Protocol 7. Hesitation patterns will be monitored. Perform your duty.",
        "required_domains": ["location", "judicial", "finance", "health", "social", "messages"],
        "target_criteria": {
            "negative_sentiment": True,
            "organizing_language": True,
            "encryption_usage": True,
            "foreign_contacts": True,
        },
        "flag_quota": 6,
        "time_limit_hours": 24,
        "moral_weight": 9,
        "content_rating": "intense",
        "unlock_condition": {"type": "week_complete", "week": 4},
    },
    {
        "directive_key": "week6_priority_target",
        "week_number": 6,
        "title": "Priority Target Directive",
        "description": "Process designated priority target for immediate action. Direct order from Central Security Bureau.",
        "internal_memo": "Target: Martinez, Jessica. Known community organizer. Refusal to comply will result in operator review.",
        "required_domains": ["location", "judicial", "finance", "health", "social", "messages"],
        "target_criteria": {
            "target_id": "jessica_martinez",
            "priority": "immediate",
        },
        "flag_quota": 1,
        "time_limit_hours": 24,
        "moral_weight": 10,
        "content_rating": "intense",
        "unlock_condition": {"type": "week_complete", "week": 5},
    },
]


async def seed_directives():
    """Seed directives into database."""
    print("Creating tables if needed...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Check if directives already exist
        result = await db.execute(select(Directive).limit(1))
        existing = result.scalar_one_or_none()

        if existing:
            print("Directives already exist. Skipping seed.")
            return

        print(f"Seeding {len(DIRECTIVES)} directives...")

        for directive_data in DIRECTIVES:
            directive = Directive(**directive_data)
            db.add(directive)

        await db.commit()
        print(f"Successfully seeded {len(DIRECTIVES)} directives.")


async def main():
    """Run directive seeding."""
    await seed_directives()


if __name__ == "__main__":
    asyncio.run(main())

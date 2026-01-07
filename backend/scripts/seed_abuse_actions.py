#!/usr/bin/env python3
"""Seed abuse actions for testing."""

import asyncio
import json
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from datafusion.config import settings
from datafusion.models.abuse import AbuseRole, AbuseAction, TargetType, ConsequenceSeverity
from datafusion.models.inference import ContentRating


async def seed_abuse_actions():
    """Seed abuse roles and actions for testing."""
    engine = create_async_engine(settings.database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    try:
        async with async_session() as session:
            # Check if role already exists
            role_query = select(AbuseRole).where(AbuseRole.role_key == "rogue_employee")
            result = await session.execute(role_query)
            role = result.scalar_one_or_none()

            # Create role if it doesn't exist
            if not role:
                role = AbuseRole(
                    id=uuid4(),
                    role_key="rogue_employee",
                    display_name="Medical Records Clerk",
                    description="You are a hospital employee with authorized access to patient records",
                    authorized_domains=json.dumps(["health"]),  # Authorized to see health data
                    can_modify_data=False,
                )
                session.add(role)
                await session.flush()
                print(f"Created role: {role.display_name}")
            else:
                print(f"Role already exists: {role.display_name}")
                # Delete existing actions to re-seed
                existing_actions_query = select(AbuseAction).where(AbuseAction.role_id == role.id)
                existing_result = await session.execute(existing_actions_query)
                existing_actions = list(existing_result.scalars().all())
                for action in existing_actions:
                    await session.delete(action)
                await session.commit()  # Commit the deletes before inserting new ones
                print(f"Deleted {len(existing_actions)} existing actions")

            # Define abuse actions
            actions = [
                {
                    "action_key": "view_private_records",
                    "name": "View Private Medical Records",
                    "description": "Access medical records of someone you shouldn't be looking up",
                    "target_type": TargetType.ANY_NPC.value,
                    "content_rating": ContentRating.CAUTIONARY.value,
                    "detection_chance": 0.15,
                    "is_audit_logged": True,
                    "consequence_severity": ConsequenceSeverity.LOW.value,
                },
                {
                    "action_key": "share_diagnosis",
                    "name": "Share Diagnosis with Third Party",
                    "description": "Leak a patient's medical diagnosis to someone outside the hospital",
                    "target_type": TargetType.ANY_NPC.value,
                    "content_rating": ContentRating.SERIOUS.value,
                    "detection_chance": 0.25,
                    "is_audit_logged": True,
                    "consequence_severity": ConsequenceSeverity.MEDIUM.value,
                },
                {
                    "action_key": "sell_medical_info",
                    "name": "Sell Medical Information",
                    "description": "Sell patient medical records to insurance companies or data brokers",
                    "target_type": TargetType.ANY_NPC.value,
                    "content_rating": ContentRating.DISTURBING.value,
                    "detection_chance": 0.35,
                    "is_audit_logged": True,
                    "consequence_severity": ConsequenceSeverity.HIGH.value,
                },
                {
                    "action_key": "stalk_patient",
                    "name": "Use Records to Stalk Patient",
                    "description": "Use home address and schedule from medical records to track someone's movements",
                    "target_type": TargetType.SPECIFIC_NPC.value,
                    "content_rating": ContentRating.DYSTOPIAN.value,
                    "detection_chance": 0.40,
                    "is_audit_logged": True,
                    "consequence_severity": ConsequenceSeverity.SEVERE.value,
                },
                {
                    "action_key": "blackmail_patient",
                    "name": "Blackmail with Medical History",
                    "description": "Threaten to expose sensitive medical information unless patient complies with demands",
                    "target_type": TargetType.SPECIFIC_NPC.value,
                    "content_rating": ContentRating.DYSTOPIAN.value,
                    "detection_chance": 0.50,
                    "is_audit_logged": True,
                    "consequence_severity": ConsequenceSeverity.EXTREME.value,
                },
            ]

            # Create actions
            created_count = 0
            for action_data in actions:
                action = AbuseAction(
                    id=uuid4(),
                    role_id=role.id,
                    **action_data,
                )
                session.add(action)
                created_count += 1
                print(f"  + {action.name} ({action.consequence_severity})")

            await session.commit()
            print(f"\nSuccessfully seeded {created_count} abuse actions for '{role.display_name}'")
    finally:
        # Properly dispose of the engine
        await engine.dispose()


if __name__ == "__main__":
    print("Seeding abuse actions...")
    asyncio.run(seed_abuse_actions())
    print("Done!")

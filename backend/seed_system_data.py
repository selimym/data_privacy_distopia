"""Seed neighborhoods and news channels into the database."""
import asyncio

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from datafusion.database import Base
from datafusion.models.system_mode import Neighborhood, NewsChannel
from datafusion.generators.system_seed_data import (
    get_neighborhood_seed_data,
    get_news_channel_seed_data,
)


async def seed_system_data():
    """Seed neighborhoods and news channels."""
    engine = create_async_engine("sqlite+aiosqlite:///datafusion.db")

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Check if data already exists
        from sqlalchemy import select

        existing_neighborhoods = await session.execute(select(Neighborhood))
        if existing_neighborhoods.scalars().first():
            print("❌ Neighborhoods already exist, skipping...")
        else:
            # Seed neighborhoods
            neighborhood_data = get_neighborhood_seed_data()
            for n_data in neighborhood_data:
                neighborhood = Neighborhood(**n_data)
                session.add(neighborhood)
            await session.commit()
            print(f"✅ Seeded {len(neighborhood_data)} neighborhoods")

        existing_channels = await session.execute(select(NewsChannel))
        if existing_channels.scalars().first():
            print("❌ News channels already exist, skipping...")
        else:
            # Seed news channels
            channel_data = get_news_channel_seed_data()
            for c_data in channel_data:
                channel = NewsChannel(**c_data)
                session.add(channel)
            await session.commit()
            print(f"✅ Seeded {len(channel_data)} news channels")

    await engine.dispose()
    print("\n✅ System seed data complete!")


if __name__ == "__main__":
    asyncio.run(seed_system_data())

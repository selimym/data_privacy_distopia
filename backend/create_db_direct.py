"""Direct database creation script - bypasses migrations for testing."""

import asyncio

from sqlalchemy.ext.asyncio import create_async_engine

# Import all model modules to register them with Base.metadata
from datafusion.database import Base


async def create_database():
    """Create database using SQLAlchemy models directly."""
    engine = create_async_engine("sqlite+aiosqlite:///datafusion.db", echo=True)

    async with engine.begin() as conn:
        # Drop all tables first
        await conn.run_sync(Base.metadata.drop_all)
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)

    await engine.dispose()
    print("\n✅ Database created successfully from models!")


if __name__ == "__main__":
    asyncio.run(create_database())

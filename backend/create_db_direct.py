"""Direct database creation script - bypasses migrations for testing."""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from datafusion.database import Base

# Import all model modules to register them with Base.metadata
import datafusion.models.npc
import datafusion.models.health
import datafusion.models.finance
import datafusion.models.judicial
import datafusion.models.location
import datafusion.models.social
import datafusion.models.messages
import datafusion.models.system_mode

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

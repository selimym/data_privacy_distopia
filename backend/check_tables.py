"""Check what tables exist in the database."""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def check_tables():
    engine = create_async_engine("sqlite+aiosqlite:///datafusion.db")
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"))
        tables = [row[0] for row in result]

        print("Tables in database:")
        for table in tables:
            print(f"  - {table}")

        # Check for new system mode tables
        new_tables = ['system_actions', 'public_metrics', 'reluctance_metrics', 'news_channels',
                      'news_articles', 'protests', 'operator_data', 'neighborhoods', 'book_publication_events']

        print("\nNew system mode tables:")
        for table in new_tables:
            status = "✅" if table in tables else "❌"
            print(f"  {status} {table}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_tables())

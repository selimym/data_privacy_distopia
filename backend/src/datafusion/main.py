"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from datafusion.api.routes import health
from datafusion.config import settings
from datafusion.database import Base, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield

    await engine.dispose()


app = FastAPI(
    title=settings.app_name,
    description="Backend API for the DataFusion World educational game",
    version=settings.app_version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix=settings.api_prefix, tags=["health"])

"""FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from datafusion.api import router as api_router
from datafusion.config import settings
from datafusion.database import Base, engine
from datafusion.logging_config import setup_logging
from datafusion.services.content_validator import validate_all_content

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager."""
    # Setup structured logging
    setup_logging()
    logger.info("Application starting", extra={"app_name": settings.app_name})

    # Validate content JSON files
    try:
        validation_results = validate_all_content()
        logger.info("Content validation passed", extra={"results": validation_results})
    except ValueError as e:
        logger.error("Content validation failed", extra={"error": str(e)})
        raise

    # Create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created/verified")

    yield

    logger.info("Application shutting down")
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

app.include_router(api_router, prefix=settings.api_prefix)

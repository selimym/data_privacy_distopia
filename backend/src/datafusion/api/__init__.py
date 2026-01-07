"""API routes package."""

from fastapi import APIRouter

from datafusion.api import abuse, inferences, npcs, settings
from datafusion.api.routes import health

router = APIRouter()

router.include_router(health.router)
router.include_router(npcs.router)
router.include_router(inferences.router)
router.include_router(abuse.router, prefix="/abuse", tags=["abuse"])
router.include_router(settings.router, prefix="/settings", tags=["settings"])

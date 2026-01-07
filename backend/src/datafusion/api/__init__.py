"""API routes package."""

from fastapi import APIRouter

from datafusion.api import abuse, inferences, npcs, scenarios, settings, system
from datafusion.api.routes import health

router = APIRouter()

router.include_router(health.router)
router.include_router(npcs.router)
router.include_router(inferences.router)
router.include_router(abuse.router, prefix="/abuse", tags=["abuse"])
router.include_router(settings.router, prefix="/settings", tags=["settings"])
router.include_router(scenarios.router, prefix="/scenarios", tags=["scenarios"])
router.include_router(system.router)

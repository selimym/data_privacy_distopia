"""API routes package."""

from fastapi import APIRouter

from datafusion.api import inferences, npcs
from datafusion.api.routes import health

router = APIRouter()

router.include_router(health.router)
router.include_router(npcs.router)
router.include_router(inferences.router)

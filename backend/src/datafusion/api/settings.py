"""API endpoints for user settings and content warnings."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from datafusion.content.scenario_warnings import get_scenario_warnings
from datafusion.schemas.settings import (
    ScenarioWarnings,
    UserSettings,
    UserSettingsUpdate,
)

router = APIRouter()

# In-memory settings storage (in production, use session/database)
# Key: session_id (for now, using a default session)
_settings_store: dict[str, UserSettings] = {}
DEFAULT_SESSION = "default"


@router.get("", response_model=UserSettings)
async def get_settings(
    session_id: str = DEFAULT_SESSION,
) -> UserSettings:
    """
    Get current user settings.

    Args:
        session_id: Session identifier (defaults to 'default')

    Returns:
        Current user settings (or defaults if not set)
    """
    if session_id not in _settings_store:
        _settings_store[session_id] = UserSettings()
    return _settings_store[session_id]


@router.put("", response_model=UserSettings)
async def update_settings(
    updates: UserSettingsUpdate,
    session_id: str = DEFAULT_SESSION,
) -> UserSettings:
    """
    Update user settings.

    Args:
        updates: Settings to update
        session_id: Session identifier

    Returns:
        Updated settings
    """
    # Get current settings or create defaults
    if session_id not in _settings_store:
        _settings_store[session_id] = UserSettings()

    current = _settings_store[session_id]

    # Apply updates
    update_data = updates.model_dump(exclude_unset=True)
    updated = current.model_copy(update=update_data)

    _settings_store[session_id] = updated
    return updated


@router.get("/warnings/{scenario_key}", response_model=ScenarioWarnings)
async def get_scenario_content_warnings(
    scenario_key: str,
) -> ScenarioWarnings:
    """
    Get content warnings for a scenario.

    Args:
        scenario_key: Scenario identifier (e.g., 'rogue_employee')

    Returns:
        Scenario warnings including all content types and ratings

    Raises:
        HTTPException: If scenario not found
    """
    warnings = get_scenario_warnings(scenario_key)
    if warnings is None:
        raise HTTPException(
            status_code=404,
            detail=f"Scenario '{scenario_key}' not found",
        )
    return warnings


@router.post("/warnings/{scenario_key}/acknowledge", status_code=204)
async def acknowledge_warnings(
    scenario_key: str,
    session_id: str = DEFAULT_SESSION,
) -> None:
    """
    Acknowledge that user has seen warnings for a scenario.

    Args:
        scenario_key: Scenario identifier
        session_id: Session identifier

    Returns:
        No content (204 status)

    Note:
        In production, this would track acknowledgment in database/session
    """
    # Verify scenario exists
    warnings = get_scenario_warnings(scenario_key)
    if warnings is None:
        raise HTTPException(
            status_code=404,
            detail=f"Scenario '{scenario_key}' not found",
        )

    # TODO: Store acknowledgment in database/session
    # For now, this is a no-op that validates the scenario exists
    return JSONResponse(status_code=204, content=None)

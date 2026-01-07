"""API endpoints for scenario system."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from datafusion.database import get_db
from datafusion.schemas.scenario import ScenarioPrompt, ScenarioState
from datafusion.services.scenario_engine import ScenarioEngine

router = APIRouter()


@router.get("/{scenario_key}/state", response_model=ScenarioState)
async def get_scenario_state(
    scenario_key: str,
    session_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
) -> ScenarioState:
    """
    Get current state of a scenario session.

    Args:
        scenario_key: Scenario identifier (e.g., "rogue_employee")
        session_id: Game session ID
        db: Database session

    Returns:
        Current scenario state with phase, actions, and suggestions
    """
    engine = ScenarioEngine(db)
    return await engine.get_scenario_state(scenario_key, session_id)


@router.get("/{scenario_key}/prompt", response_model=ScenarioPrompt)
async def get_scenario_prompt(
    scenario_key: str,
    session_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
) -> ScenarioPrompt:
    """
    Get current narrative prompt for scenario.

    Args:
        scenario_key: Scenario identifier
        session_id: Game session ID
        db: Database session

    Returns:
        Narrative prompt with suggested next action/target

    Raises:
        HTTPException: If no prompt available for current state
    """
    engine = ScenarioEngine(db)
    prompt = await engine.get_current_prompt(scenario_key, session_id)

    if prompt is None:
        raise HTTPException(
            status_code=404,
            detail="No prompt available for current scenario state",
        )

    return prompt

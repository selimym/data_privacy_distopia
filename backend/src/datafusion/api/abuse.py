"""API endpoints for abuse simulation system."""

from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from datafusion.database import get_db
from datafusion.models.abuse import AbuseExecution, AbuseRole
from datafusion.models.consequence import TimeSkip
from datafusion.models.inference import ContentRating
from datafusion.schemas.abuse import (
    AbuseActionRead,
    AbuseExecuteRequest,
    AbuseExecuteResponse,
    AbuseRoleRead,
    ConsequenceChain,
)
from datafusion.services.abuse_simulator import AbuseSimulator

router = APIRouter()


@router.get("/roles", response_model=list[AbuseRoleRead])
async def list_abuse_roles(
    max_content_rating: ContentRating | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> list[AbuseRoleRead]:
    """
    List all available abuse roles.

    Args:
        max_content_rating: Optional filter to exclude roles with actions above this rating
        db: Database session

    Returns:
        List of available roles
    """
    query = select(AbuseRole)
    result = await db.execute(query)
    roles = list(result.scalars().all())

    # Convert to schemas
    role_schemas = [AbuseRoleRead.model_validate(role) for role in roles]

    # TODO: If max_content_rating provided, filter roles by their actions' ratings
    # This would require checking if role has any actions <= max_content_rating

    return role_schemas


@router.get("/roles/{role_key}/actions", response_model=list[AbuseActionRead])
async def list_role_actions(
    role_key: str,
    target_npc_id: UUID | None = Query(default=None),
    max_content_rating: ContentRating | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> list[AbuseActionRead]:
    """
    Get available actions for a specific role.

    Args:
        role_key: The role identifier (e.g., "rogue_employee")
        target_npc_id: Optional NPC to filter actions for
        max_content_rating: Optional maximum content rating filter
        db: Database session

    Returns:
        List of available actions for this role
    """
    simulator = AbuseSimulator(db)
    actions = await simulator.get_available_actions(
        role_key=role_key,
        target_npc_id=target_npc_id,
        content_filter=max_content_rating,
    )
    return actions


@router.post("/execute", response_model=AbuseExecuteResponse)
async def execute_abuse_action(
    request: AbuseExecuteRequest,
    session_id: UUID | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> AbuseExecuteResponse:
    """
    Execute an abuse action.

    Args:
        request: The execution request with role, action, and target
        session_id: Optional session ID (creates new session if not provided)
        db: Database session

    Returns:
        Execution response with immediate results

    Raises:
        HTTPException: If role, action, or target not found
    """
    # Generate session_id if not provided
    if session_id is None:
        session_id = uuid4()

    simulator = AbuseSimulator(db)

    try:
        response = await simulator.execute(request, session_id)
        return response
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get(
    "/executions/{execution_id}/consequences",
    response_model=ConsequenceChain,
)
async def get_execution_consequences(
    execution_id: UUID,
    time_skip: TimeSkip = Query(default=TimeSkip.IMMEDIATE),
    max_content_rating: ContentRating | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> ConsequenceChain:
    """
    Get consequences for an execution at a specific time.

    Args:
        execution_id: The execution identifier
        time_skip: Which time period to view (default: immediate)
        max_content_rating: Optional content filter
        db: Database session

    Returns:
        Consequence chain for the specified time period

    Raises:
        HTTPException: If execution not found
    """
    simulator = AbuseSimulator(db)

    try:
        consequences = await simulator.get_consequences(
            execution_id=execution_id,
            time_skip=time_skip,
            content_filter=max_content_rating,
        )
        return consequences
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get("/session/{session_id}/history", response_model=list[AbuseExecuteResponse])
async def get_session_history(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> list[AbuseExecuteResponse]:
    """
    Get history of all executions in a session.

    Args:
        session_id: The session identifier
        db: Database session

    Returns:
        List of all executions in this session (chronological order)
    """
    # Query all executions for this session
    query = (
        select(AbuseExecution)
        .where(AbuseExecution.session_id == session_id)
        .order_by(AbuseExecution.executed_at)
    )
    result = await db.execute(query)
    executions = list(result.scalars().all())

    # Convert to response format
    # Note: This is simplified - in a real implementation, we'd reconstruct
    # the full AbuseExecuteResponse for each execution
    responses = []
    for execution in executions:
        # Fetch related data
        from datafusion.models.abuse import AbuseAction
        from datafusion.models.npc import NPC

        action_query = select(AbuseAction).where(AbuseAction.id == execution.action_id)
        action_result = await db.execute(action_query)
        action = action_result.scalar_one()

        npc_query = select(NPC).where(NPC.id == execution.target_npc_id)
        npc_result = await db.execute(npc_query)
        npc = npc_result.scalar_one()

        # Build response
        response = AbuseExecuteResponse(
            execution_id=execution.id,
            action_name=action.name,
            target_name=f"{npc.first_name} {npc.last_name}",
            immediate_result=f"Executed {action.name} on {npc.first_name} {npc.last_name}",
            data_revealed=None,  # Historical data not stored
            was_detected=execution.was_detected,
            detection_message=execution.detection_method,
            warning=None,
        )
        responses.append(response)

    return responses


@router.post("/session/{session_id}/reset", status_code=204)
async def reset_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Clear all executions from a session.

    Args:
        session_id: The session identifier to reset
        db: Database session

    Returns:
        No content (204 status)
    """
    # Delete all executions for this session
    delete_query = delete(AbuseExecution).where(AbuseExecution.session_id == session_id)
    await db.execute(delete_query)
    await db.commit()

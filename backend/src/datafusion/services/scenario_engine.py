"""Scenario engine service for managing scenario flow and progression."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from datafusion.content.scenario_prompts import determine_phase, get_prompt_for_state
from datafusion.models.abuse import AbuseAction, AbuseExecution
from datafusion.models.npc import NPC
from datafusion.schemas.abuse import AbuseActionRead
from datafusion.schemas.npc import NPCBasicRead
from datafusion.schemas.scenario import ScenarioPrompt, ScenarioState


class ScenarioEngine:
    """Service for managing scenario progression and prompts."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_scenario_state(self, scenario_key: str, session_id: UUID) -> ScenarioState:
        """
        Get current state of a scenario session.

        Args:
            scenario_key: Scenario identifier (e.g., "rogue_employee")
            session_id: Game session ID

        Returns:
            Current scenario state
        """
        # Query all executions for this session
        query = (
            select(AbuseExecution)
            .where(AbuseExecution.session_id == session_id)
            .order_by(AbuseExecution.executed_at)
        )
        result = await self.db.execute(query)
        executions = list(result.scalars().all())

        # Get action keys
        actions_taken = []
        npcs_discovered = []

        for execution in executions:
            # Get action
            action_query = select(AbuseAction).where(AbuseAction.id == execution.action_id)
            action_result = await self.db.execute(action_query)
            action = action_result.scalar_one()
            actions_taken.append(action.action_key)

            # Track NPCs
            npc_id = str(execution.target_npc_id)
            if npc_id not in npcs_discovered:
                npcs_discovered.append(npc_id)

        # Determine phase
        phase = determine_phase(actions_taken)

        # Get suggested next action from prompt
        prompt_data = get_prompt_for_state(scenario_key, actions_taken, phase)
        suggested_next = prompt_data.get("suggested_action") if prompt_data else None

        return ScenarioState(
            scenario_key=scenario_key,
            phase=phase,
            actions_taken=actions_taken,
            suggested_next=suggested_next,
            npcs_discovered=npcs_discovered,
        )

    async def get_current_prompt(
        self, scenario_key: str, session_id: UUID
    ) -> ScenarioPrompt | None:
        """
        Get current narrative prompt for scenario.

        Args:
            scenario_key: Scenario identifier
            session_id: Game session ID

        Returns:
            Scenario prompt or None if no prompt available
        """
        # Get current state
        state = await self.get_scenario_state(scenario_key, session_id)

        # Get prompt data
        prompt_data = get_prompt_for_state(scenario_key, state.actions_taken, state.phase)

        if not prompt_data:
            return None

        # Build prompt response
        suggested_action = None
        suggested_target = None

        # Fetch suggested action if specified
        if prompt_data.get("suggested_action"):
            action_key = prompt_data["suggested_action"]
            action_query = select(AbuseAction).where(AbuseAction.action_key == action_key)
            action_result = await self.db.execute(action_query)
            action = action_result.scalar_one_or_none()
            if action:
                suggested_action = AbuseActionRead.model_validate(action)

        # Fetch suggested target if specified
        if prompt_data.get("suggested_target"):
            scenario_target_key = prompt_data["suggested_target"]
            npc_query = select(NPC).where(NPC.scenario_key == scenario_target_key)
            npc_result = await self.db.execute(npc_query)
            npc = npc_result.scalar_one_or_none()
            if npc:
                suggested_target = NPCBasicRead(
                    id=str(npc.id),
                    first_name=npc.first_name,
                    last_name=npc.last_name,
                    role=npc.role,
                    sprite_key=npc.sprite_key,
                    map_x=npc.map_x,
                    map_y=npc.map_y,
                )

        return ScenarioPrompt(
            prompt_text=prompt_data["text"],
            suggested_action=suggested_action,
            suggested_target=suggested_target,
            phase=state.phase,
        )

"""Abuse simulator service for executing and tracking abuse actions."""

import json
import random
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from datafusion.models.abuse import AbuseAction, AbuseExecution, AbuseRole, TargetType
from datafusion.models.consequence import ConsequenceTemplate, TimeSkip
from datafusion.models.inference import ContentRating
from datafusion.models.npc import NPC
from datafusion.schemas.abuse import (
    AbuseActionRead,
    AbuseExecuteRequest,
    AbuseExecuteResponse,
    ConsequenceChain,
    RealWorldParallel,
)


class AbuseSimulator:
    """Service for simulating data abuse scenarios."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_available_actions(
        self,
        role_key: str,
        target_npc_id: UUID | None = None,
        content_filter: ContentRating | None = None,
    ) -> list[AbuseActionRead]:
        """
        Get available abuse actions for a role.

        Args:
            role_key: The role key (e.g., "rogue_employee")
            target_npc_id: Optional specific target NPC
            content_filter: Maximum content rating to include

        Returns:
            List of available actions
        """
        # Find the role
        role_query = select(AbuseRole).where(AbuseRole.role_key == role_key)
        role_result = await self.db.execute(role_query)
        role = role_result.scalar_one_or_none()

        if not role:
            return []

        # Get actions for this role
        actions_query = select(AbuseAction).where(AbuseAction.role_id == role.id)
        actions_result = await self.db.execute(actions_query)
        actions = list(actions_result.scalars().all())

        # Filter by target type if target_npc_id provided
        if target_npc_id is not None:
            # Only include actions that can target ANY_NPC or SPECIFIC_NPC
            actions = [
                a
                for a in actions
                if a.target_type in [TargetType.ANY_NPC.value, TargetType.SPECIFIC_NPC.value]
            ]

        # Filter by content rating
        if content_filter:
            content_ratings = [
                ContentRating.SAFE,
                ContentRating.CAUTIONARY,
                ContentRating.SERIOUS,
                ContentRating.DISTURBING,
                ContentRating.DYSTOPIAN,
            ]
            max_index = content_ratings.index(content_filter)
            allowed_ratings = {r.value for r in content_ratings[: max_index + 1]}
            actions = [a for a in actions if a.content_rating in allowed_ratings]

        return [AbuseActionRead.model_validate(a) for a in actions]

    async def execute(
        self, request: AbuseExecuteRequest, session_id: UUID
    ) -> AbuseExecuteResponse:
        """
        Execute an abuse action.

        Args:
            request: The execution request
            session_id: Game session ID

        Returns:
            Execution response with immediate results
        """
        # Validate role
        role_query = select(AbuseRole).where(AbuseRole.role_key == request.role_key)
        role_result = await self.db.execute(role_query)
        role = role_result.scalar_one_or_none()

        if not role:
            raise ValueError(f"Role not found: {request.role_key}")

        # Validate action
        action_query = select(AbuseAction).where(
            AbuseAction.action_key == request.action_key, AbuseAction.role_id == role.id
        )
        action_result = await self.db.execute(action_query)
        action = action_result.scalar_one_or_none()

        if not action:
            raise ValueError(f"Action not found: {request.action_key}")

        # Validate target NPC
        npc_query = select(NPC).where(NPC.id == request.target_npc_id)
        npc_result = await self.db.execute(npc_query)
        npc = npc_result.scalar_one_or_none()

        if not npc:
            raise ValueError(f"NPC not found: {request.target_npc_id}")

        # Roll for detection
        was_detected = random.random() < action.detection_chance
        detection_message = None

        if was_detected:
            detection_methods = [
                "Audit log flagged unusual access pattern",
                "Automated monitoring system detected unauthorized query",
                "Your supervisor noticed suspicious activity",
                "Security system triggered alert for data access violation",
            ]
            detection_message = random.choice(detection_methods)

        # Create execution record
        execution = AbuseExecution(
            session_id=session_id,
            role_id=role.id,
            action_id=action.id,
            target_npc_id=npc.id,
            was_detected=was_detected,
            detection_method=detection_message if was_detected else None,
        )
        self.db.add(execution)
        await self.db.commit()
        await self.db.refresh(execution)

        # Build immediate result
        immediate_result = self._generate_immediate_result(action, npc)

        # Fetch revealed data (this would call NPC domain APIs)
        # For now, simplified placeholder
        data_revealed = {
            "npc_id": str(npc.id),
            "name": f"{npc.first_name} {npc.last_name}",
            "ssn": npc.ssn,
            "address": f"{npc.street_address}, {npc.city}, {npc.state} {npc.zip_code}",
        }

        # Content warning for high severity actions
        warning = None
        if action.content_rating in [
            ContentRating.DISTURBING.value,
            ContentRating.DYSTOPIAN.value,
        ]:
            warning = (
                "⚠️ Content Warning: This action depicts serious privacy violations "
                "with potentially disturbing consequences."
            )

        return AbuseExecuteResponse(
            execution_id=execution.id,
            action_name=action.name,
            target_name=f"{npc.first_name} {npc.last_name}",
            immediate_result=immediate_result,
            data_revealed=data_revealed,
            was_detected=was_detected,
            detection_message=detection_message,
            warning=warning,
        )

    async def get_consequences(
        self,
        execution_id: UUID,
        time_skip: TimeSkip,
        content_filter: ContentRating | None = None,
    ) -> ConsequenceChain:
        """
        Get consequences for an execution at a specific time skip.

        Args:
            execution_id: The execution ID
            time_skip: Time period to view
            content_filter: Maximum content rating to include

        Returns:
            Consequence chain for the time period
        """
        # Look up execution
        execution_query = select(AbuseExecution).where(AbuseExecution.id == execution_id)
        execution_result = await self.db.execute(execution_query)
        execution = execution_result.scalar_one_or_none()

        if not execution:
            raise ValueError(f"Execution not found: {execution_id}")

        # Find consequence templates for this action
        templates_query = (
            select(ConsequenceTemplate)
            .where(ConsequenceTemplate.action_id == execution.action_id)
            .order_by(ConsequenceTemplate.time_skip)
        )
        templates_result = await self.db.execute(templates_query)
        all_templates = list(templates_result.scalars().all())

        # Get template for requested time skip
        template = next(
            (t for t in all_templates if t.time_skip == time_skip.value), None
        )

        # Default events if no template
        events = ["No specific consequences defined yet for this action."]
        victim_impact = None
        real_world_parallel_data = None

        if template:
            # Parse events JSON
            events = json.loads(template.events)
            victim_impact = template.victim_impact

            if template.real_world_parallel:
                parallel_data = json.loads(template.real_world_parallel)
                real_world_parallel_data = RealWorldParallel(**parallel_data)

        # Filter events by content rating if needed
        if content_filter:
            content_ratings = [
                ContentRating.SAFE,
                ContentRating.CAUTIONARY,
                ContentRating.SERIOUS,
                ContentRating.DISTURBING,
                ContentRating.DYSTOPIAN,
            ]
            max_index = content_ratings.index(content_filter)
            if template and content_ratings.index(ContentRating(template.content_rating)) > max_index:
                events = ["[Content filtered - enable higher content rating to view]"]
                victim_impact = None
                real_world_parallel_data = None

        # Determine player status based on detection and time
        your_status = self._determine_player_status(execution, time_skip)

        # Get available time skips
        time_skips_available = [TimeSkip(t.time_skip) for t in all_templates]
        if not time_skips_available:
            time_skips_available = [TimeSkip.IMMEDIATE]

        return ConsequenceChain(
            execution_id=execution_id,
            time_skips_available=time_skips_available,
            current_time_skip=time_skip,
            events=events,
            victim_impact=victim_impact,
            victim_statement=None,  # Could be added to templates
            your_status=your_status,
            real_world_parallel=real_world_parallel_data,
        )

    def _generate_immediate_result(self, action: AbuseAction, npc: NPC) -> str:
        """Generate immediate result text for an action."""
        return (
            f"You successfully accessed {npc.first_name} {npc.last_name}'s data. "
            f"Using your {action.name.lower()}, you can now see their private information."
        )

    def _determine_player_status(
        self, execution: AbuseExecution, time_skip: TimeSkip
    ) -> str:
        """Determine player's status based on execution and time."""
        if not execution.was_detected:
            return "Still employed - no one suspects anything"

        # If detected, status degrades over time
        if time_skip == TimeSkip.IMMEDIATE:
            return "Flagged by security systems - under investigation"
        elif time_skip == TimeSkip.ONE_WEEK:
            return "Suspended pending investigation"
        elif time_skip == TimeSkip.ONE_MONTH:
            return "Terminated for cause - facing potential charges"
        elif time_skip == TimeSkip.SIX_MONTHS:
            return "Awaiting trial for unauthorized data access"
        else:  # ONE_YEAR
            return "Convicted of data privacy violations - serving sentence"

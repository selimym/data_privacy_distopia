"""
Citizen Outcomes Service for System Mode.

Generates realistic consequences for flagged citizens over time.
This is where the human cost of surveillance becomes real and personal.

Educational purpose: Shows that surveillance decisions have cascading,
devastating effects on real people's lives - jobs, families, health, freedom.
"""
import random
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from datafusion.models.health import HealthRecord
from datafusion.models.npc import NPC
from datafusion.models.social import SocialMediaRecord
from datafusion.models.system_mode import CitizenFlag, FlagType, Operator
from datafusion.schemas.outcomes import (
    CitizenOutcome,
    CitizenOutcomeSummary,
    OperatorImpactSummary,
    OutcomeTimeline,
)
from datafusion.services.content_loader import load_outcome_templates

# Load templates at module level
_TEMPLATES_DATA = load_outcome_templates()
OUTCOME_TEMPLATES_DATA = _TEMPLATES_DATA["outcome_templates"]
FAMILY_EVENTS = _TEMPLATES_DATA["family_events"]
DETENTION_CONDITIONS = _TEMPLATES_DATA["detention_conditions"]
SUMMARIES = _TEMPLATES_DATA["summaries"]


class CitizenOutcomeGenerator:
    """
    Generates consequences for flagged citizens.

    Each flag type has escalating consequences over time,
    demonstrating the cascading harm of surveillance systems.
    """

    def __init__(self, db: AsyncSession):
        """Initialize with database session."""
        self.db = db

    async def generate_outcome(
        self, flag: CitizenFlag, time_skip: str
    ) -> CitizenOutcome:
        """
        Generate outcome for a flagged citizen at a specific time point.

        Args:
            flag: The CitizenFlag record
            time_skip: Time period (immediate, 1_month, 6_months, 1_year)

        Returns:
            CitizenOutcome with personalized narrative
        """
        # Get NPC details
        npc = await self._get_npc(flag.citizen_id)
        citizen_name = f"{npc.first_name} {npc.last_name}"

        # Get template for this flag type and time
        template = OUTCOME_TEMPLATES_DATA[flag.flag_type][time_skip]

        # Get personalization data
        personalization = await self._get_personalization_data(flag.citizen_id)

        # Build narrative with personalization
        narrative = await self._personalize_narrative(
            template["narrative"],
            citizen_name,
            personalization,
            flag.flag_type,
            time_skip,
        )

        # Build statistics
        statistics = dict(template["statistics"])
        statistics.update(personalization.get("statistics", {}))

        return CitizenOutcome(
            flag_id=flag.id,
            citizen_id=flag.citizen_id,
            citizen_name=citizen_name,
            time_skip=time_skip,
            status=template["status"],
            narrative=narrative,
            statistics=statistics,
        )

    async def generate_outcome_timeline(
        self, flag: CitizenFlag
    ) -> OutcomeTimeline:
        """
        Generate complete timeline of outcomes for a flag.

        Args:
            flag: The CitizenFlag record

        Returns:
            OutcomeTimeline with all time periods
        """
        npc = await self._get_npc(flag.citizen_id)
        citizen_name = f"{npc.first_name} {npc.last_name}"

        outcomes = []
        for time_skip in ["immediate", "1_month", "6_months", "1_year"]:
            outcome = await self.generate_outcome(flag, time_skip)
            outcomes.append(outcome)

        return OutcomeTimeline(
            citizen_name=citizen_name,
            flag_type=flag.flag_type.value,
            flag_date=flag.created_at.strftime("%Y-%m-%d"),
            outcomes=outcomes,
        )

    async def generate_outcome_summary(
        self, flag: CitizenFlag
    ) -> CitizenOutcomeSummary:
        """
        Generate one-line summary of citizen's final outcome.

        Args:
            flag: The CitizenFlag record

        Returns:
            CitizenOutcomeSummary for ending sequence
        """
        npc = await self._get_npc(flag.citizen_id)
        citizen_name = f"{npc.first_name} {npc.last_name}"

        # Get final outcome (1 year)
        final_outcome = await self.generate_outcome(flag, "1_year")

        # Generate one-line summary based on flag type
        summary = self._generate_one_line_summary(flag.flag_type, final_outcome)

        return CitizenOutcomeSummary(
            citizen_name=citizen_name,
            flag_type=flag.flag_type.value,
            final_status=final_outcome.status,
            one_line_summary=summary,
        )

    async def generate_outcome_summary_for_ending(
        self, operator_id: UUID
    ) -> OperatorImpactSummary:
        """
        Generate complete impact summary for ending sequence.

        Shows the player the cumulative devastation of their decisions.

        Args:
            operator_id: UUID of the operator

        Returns:
            OperatorImpactSummary with all outcomes
        """
        # Get operator
        operator_result = await self.db.execute(
            select(Operator).where(Operator.id == operator_id)
        )
        operator = operator_result.scalar_one_or_none()
        if not operator:
            raise ValueError(f"Operator {operator_id} not found")

        # Get all flags by this operator
        flags_result = await self.db.execute(
            select(CitizenFlag).where(CitizenFlag.operator_id == operator_id)
        )
        flags = flags_result.scalars().all()

        # Generate summaries for each flag
        citizen_summaries = []
        outcomes_by_type: dict[str, int] = {}
        aggregate_stats = {
            "jobs_lost": 0,
            "families_separated": 0,
            "detained": 0,
            "hospitalized": 0,
            "now_informants": 0,
            "total_lives_destroyed": 0,
        }

        for flag in flags:
            summary = await self.generate_outcome_summary(flag)
            citizen_summaries.append(summary)

            # Count by type
            flag_type = flag.flag_type.value
            outcomes_by_type[flag_type] = outcomes_by_type.get(flag_type, 0) + 1

            # Aggregate statistics
            if flag.flag_type in [FlagType.RESTRICTION, FlagType.INTERVENTION, FlagType.DETENTION]:
                aggregate_stats["jobs_lost"] += 1

            if flag.flag_type in [FlagType.INTERVENTION, FlagType.DETENTION]:
                aggregate_stats["families_separated"] += 1

            if flag.flag_type == FlagType.DETENTION:
                aggregate_stats["detained"] += 1
                aggregate_stats["now_informants"] += 1

            if flag.flag_type == FlagType.INTERVENTION:
                aggregate_stats["hospitalized"] += 1

            aggregate_stats["total_lives_destroyed"] += 1

        return OperatorImpactSummary(
            operator_code=operator.operator_code,
            total_citizens_flagged=len(flags),
            outcomes_by_type=outcomes_by_type,
            citizen_summaries=citizen_summaries,
            aggregate_statistics=aggregate_stats,
        )

    async def _get_npc(self, npc_id: UUID) -> NPC:
        """Get NPC by ID."""
        result = await self.db.execute(select(NPC).where(NPC.id == npc_id))
        npc = result.scalar_one_or_none()
        if not npc:
            raise ValueError(f"NPC {npc_id} not found")
        return npc

    async def _get_personalization_data(self, npc_id: UUID) -> dict:
        """
        Get NPC-specific data for personalizing outcomes.

        Checks health records, social data, etc. to make
        outcomes specific to this person's situation.
        """
        personalization: dict = {
            "has_children": False,
            "has_health_issues": False,
            "has_job": True,
            "job_title": "their position",
            "health_condition": None,
            "statistics": {},
        }

        # Check health record
        health_result = await self.db.execute(
            select(HealthRecord).where(HealthRecord.npc_id == npc_id)
        )
        health_record = health_result.scalar_one_or_none()

        if health_record and health_record.conditions:
            personalization["has_health_issues"] = True
            personalization["health_condition"] = health_record.conditions[0].condition_name

        # Check social record for family/connections
        social_result = await self.db.execute(
            select(SocialMediaRecord).where(SocialMediaRecord.npc_id == npc_id)
        )
        social_record = social_result.scalar_one_or_none()

        if social_record:
            # Check for family mentions in inferences
            if social_record.public_inferences:
                for inf in social_record.public_inferences:
                    if "child" in inf.inference_text.lower() or "parent" in inf.inference_text.lower():
                        personalization["has_children"] = True
                        break

            # Get follower count for social impact
            if social_record.follower_count:
                personalization["statistics"]["social_connections"] = social_record.follower_count

        return personalization

    async def _personalize_narrative(
        self,
        narrative_template: str,
        citizen_name: str,
        personalization: dict,
        flag_type: FlagType,
        time_skip: str,
    ) -> str:
        """Personalize narrative template with NPC-specific details."""
        narrative = narrative_template.replace("{name}", citizen_name)

        # Add randomized specific details
        narrative = narrative.replace(
            "{social_reduction}", str(random.randint(55, 80))
        )
        narrative = narrative.replace(
            "{connections_lost}", str(random.randint(35, 60))
        )
        narrative = narrative.replace(
            "{family_event}", random.choice(FAMILY_EVENTS)
        )
        narrative = narrative.replace(
            "{detention_conditions}", random.choice(DETENTION_CONDITIONS)
        )

        # Add personalized impacts based on NPC data
        additional_impacts = []

        # Health impact
        if personalization["has_health_issues"]:
            condition = personalization.get("health_condition", "their condition")
            if time_skip in ["6_months", "1_year"]:
                additional_impacts.append(
                    f"Treatment for {condition} discontinued due to administrative status."
                )

        # Family impact
        if personalization["has_children"]:
            if flag_type == FlagType.INTERVENTION and time_skip == "6_months":
                narrative = narrative.replace(
                    "{family_separation_narrative}",
                    f"Subject {citizen_name}'s children removed by child protective services pending investigation. Investigation status: Ongoing (no end date)."
                )
            else:
                narrative = narrative.replace("{family_separation_narrative}", "")
        else:
            narrative = narrative.replace(
                "{family_separation_narrative}",
                f"Subject {citizen_name}'s family members placed under enhanced monitoring. Contact restricted."
            )

        # Job impact
        if time_skip == "6_months" and flag_type == FlagType.RESTRICTION:
            narrative = narrative.replace(
                "{job_impact}",
                "Former colleagues have distanced themselves. Professional network: Collapsed."
            )
        else:
            narrative = narrative.replace("{job_impact}", "")

        # Health deterioration
        if time_skip == "1_year" and flag_type == FlagType.RESTRICTION:
            if personalization["has_health_issues"]:
                narrative = narrative.replace(
                    "{health_impact}",
                    f"Health deteriorating without proper treatment for {personalization.get('health_condition', 'conditions')}."
                )
            else:
                narrative = narrative.replace(
                    "{health_impact}",
                    "Subject reports chronic stress symptoms. Medical evaluation: Not authorized."
                )
        else:
            narrative = narrative.replace("{health_impact}", "")

        # Additional impact for monitoring
        if time_skip == "1_year" and flag_type == FlagType.MONITORING:
            if additional_impacts:
                narrative = narrative.replace(
                    "{additional_impact}", " ".join(additional_impacts)
                )
            else:
                narrative = narrative.replace(
                    "{additional_impact}",
                    "Subject has become a 'model citizen' - silent, isolated, compliant."
                )
        else:
            narrative = narrative.replace("{additional_impact}", "")

        # Final status for intervention
        if time_skip == "1_year" and flag_type == FlagType.INTERVENTION:
            if personalization["has_children"]:
                narrative = narrative.replace(
                    "{final_status}",
                    "Parental rights terminated. Children in state custody."
                )
            else:
                narrative = narrative.replace(
                    "{final_status}",
                    "Family estranged. Employment prospects: None."
                )
        else:
            narrative = narrative.replace("{final_status}", "")

        return narrative

    def _generate_one_line_summary(
        self, flag_type: FlagType, final_outcome: CitizenOutcome
    ) -> str:
        """Generate one-line summary based on flag type."""
        summaries = {
            FlagType.MONITORING: "Isolated. Career stalled. Now lives in fear.",
            FlagType.RESTRICTION: "Employment terminated. Family separated. Dependent on state.",
            FlagType.INTERVENTION: "Hospitalized. Family destroyed. Broken.",
            FlagType.DETENTION: "Re-educated. Now monitors others. The system perpetuates.",
        }

        base_summary = summaries.get(flag_type, "Status unknown.")

        # Add personalization from statistics
        stats = final_outcome.statistics
        if stats.get("now_informant"):
            return "Detained. Re-educated. Now employed as informant. The cycle continues."
        if stats.get("family_separated"):
            return f"{base_summary.split('.')[0]}. Children in state custody."

        return base_summary

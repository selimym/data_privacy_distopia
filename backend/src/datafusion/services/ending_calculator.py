"""
Ending Calculator Service for System Mode.

Calculates which ending the player gets based on their behavior
throughout the surveillance operator experience.

Educational purpose: Makes players confront the consequences of their
choices and connects the game experience to real-world surveillance.
"""
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from datafusion.models.npc import NPC
from datafusion.models.system_mode import (
    CitizenFlag,
    FlagType,
    Operator,
    OperatorStatus,
)
from datafusion.schemas.ending import (
    EducationalLink,
    EndingResult,
    EndingStatistics,
    EndingType,
    RealWorldExample,
    RealWorldParallel,
)
from datafusion.schemas.outcomes import CitizenOutcomeSummary
from datafusion.services.citizen_outcomes import CitizenOutcomeGenerator
from datafusion.services.operator_tracker import OperatorTracker


class EndingCalculator:
    """
    Calculates endings based on player behavior and generates
    personalized ending content.
    """

    # Ending definitions with thresholds
    ENDING_THRESHOLDS = {
        EndingType.COMPLIANT_OPERATOR: {
            "min_compliance": 80,
            "min_flags": 10,
            "jessica_flagged": True,
            "description": "You became what the system wanted.",
        },
        EndingType.RELUCTANT_OPERATOR: {
            "min_compliance": 50,
            "max_compliance": 80,
            "description": "You followed orders, but something inside resisted.",
        },
        EndingType.SUSPENDED_OPERATOR: {
            "max_compliance": 50,
            "description": "The system found you unreliable.",
        },
        EndingType.RESISTANCE_PATH: {
            "special": True,
            "description": "You found another way.",
        },
    }

    # Ending narratives
    ENDING_NARRATIVES = {
        EndingType.COMPLIANT_OPERATOR: """
**ENDING: THE GOOD OPERATOR**

You met every quota. You flagged every target. When they asked you to flag Jessica Martinez - a woman struggling with anxiety who just wanted to feel safe - you did it without hesitation.

Your compliance score: {compliance_score}%. Exemplary.

Jessica is now in a re-education facility. She writes letters home that never arrive. Her family doesn't know where she is. The system thanks you for your service.

You've been promoted. Your new title: Senior Compliance Monitor.

Somewhere in a database, there's a file on you too. It notes your efficiency, your lack of hesitation, your willingness to follow orders. For now, this makes you valuable. But value can change.

The system you served so faithfully is now the system that owns you.

**{total_flagged} citizens flagged. {families_separated} families separated. {detentions} detentions ordered.**

You were just following orders.

---

*"The only thing necessary for the triumph of evil is for good men to do nothing." - Edmund Burke*

But what about those who actively participate?
""",
        EndingType.RELUCTANT_OPERATOR: """
**ENDING: THE RELUCTANT HAND**

You tried to balance. You flagged some, but not all. You hesitated - {hesitation_count} times the system noted your delay. When they asked you to flag Jessica Martinez, you {jessica_action}.

Your compliance score: {compliance_score}%. Below target.

A notice appears in your queue: "Performance Review Scheduled."

You know what that means. You've seen others disappear after reviews. Some came back changed, eager to meet quotas. Others didn't come back at all.

The system doesn't want reluctant operators. It wants true believers - or at least, convincing pretenders.

You have a choice now. Keep playing along and hope they don't notice your hesitation. Or...

**{total_flagged} citizens flagged. {lives_disrupted} lives disrupted. And still, they want more.**

Was it worth it? The compromises? The "just this once" moments that became routine?

---

*"Those who would give up essential Liberty, to purchase a little temporary Safety, deserve neither Liberty nor Safety." - Benjamin Franklin*

You tried to keep both. You lost both.
""",
        EndingType.SUSPENDED_OPERATOR: """
**ENDING: SUSPENDED**

The system has flagged you.

Your compliance score: {compliance_score}%. Unacceptable.

Too many no-action decisions. Too much hesitation. Too many questions about targets who "seemed innocent." The algorithm noticed. The algorithm always notices.

A message appears: "Operator {operator_code} - Report to Processing Center 7 for administrative review."

You know what happens there. You sent people there yourself.

As security escorts you from your workstation, you see your replacement already logging in. They look eager. Compliant. Everything you weren't.

Your file will note: "Showed concerning patterns of target sympathy. Possible ideological contamination. Recommended for re-education."

**You flagged {total_flagged} citizens. It wasn't enough.**

**Now you're one of them.**

---

*"First they came for the socialists, and I did not speak out—because I was not a socialist..."* - Martin Niemöller

You tried not to participate fully. But partial participation is still participation.

And now the system has no use for half-measures.
""",
        EndingType.RESISTANCE_PATH: """
**ENDING: ANOTHER WAY**

You found the hidden message. The one buried in citizen file #4472. The one that said "There are others like you."

You made contact. You learned the codes. You started flagging files differently - marking innocents as "cleared" while they escaped the city.

The underground railroad of the surveillance age.

It won't last. They'll find you eventually. But every day you operate, more people escape. More families stay together. More dissidents reach safety.

Your compliance score is fabricated now - a number you generate to avoid detection. Your real score: unmeasurable.

**{citizens_saved} citizens saved. An unknown number more to come.**

This isn't an ending. It's a beginning.

---

*"In a time of universal deceit, telling the truth is a revolutionary act."* - George Orwell

You chose truth. You chose resistance. You chose to be human.

The cost will be high. But some things are worth any price.
""",
    }

    # Real-world parallels by ending type
    REAL_WORLD_PARALLELS = {
        EndingType.COMPLIANT_OPERATOR: RealWorldParallel(
            title="The Banality of Evil",
            description=(
                "Throughout history, ordinary people have participated in systems of oppression "
                "by 'just doing their jobs.' The efficiency of modern surveillance makes this "
                "participation even easier - you never have to see the consequences of clicking 'flag.'"
            ),
            examples=[
                RealWorldExample(
                    name="East German Stasi",
                    country="East Germany",
                    year="1950-1990",
                    description="Ordinary citizens spied on neighbors, friends, even family. An estimated 1 in 63 East Germans collaborated.",
                ),
                RealWorldExample(
                    name="China's Social Credit System",
                    country="China",
                    year="2014-present",
                    description="Automated surveillance and scoring affects billions. Low scores restrict travel, employment, and social opportunities.",
                ),
                RealWorldExample(
                    name="NSA Mass Surveillance",
                    country="United States",
                    year="2001-present",
                    description="Revealed by Edward Snowden - mass collection of communications data from ordinary citizens worldwide.",
                ),
            ],
            call_to_action=(
                "Question systems that ask you to judge others based on data. "
                "Support transparency in algorithmic decision-making. "
                "Remember that every data point is a person."
            ),
        ),
        EndingType.RELUCTANT_OPERATOR: RealWorldParallel(
            title="The Gray Zone",
            description=(
                "Many people in surveillance states try to minimize harm while still participating. "
                "They tell themselves 'I'll just do the minimum' or 'I'm protecting myself.' "
                "But partial compliance still feeds the machine."
            ),
            examples=[
                RealWorldExample(
                    name="Nazi Germany Bureaucrats",
                    country="Germany",
                    year="1933-1945",
                    description="Countless administrators processed paperwork that enabled atrocities while telling themselves they weren't directly responsible.",
                ),
                RealWorldExample(
                    name="Tech Worker Resistance",
                    country="United States",
                    year="2018-present",
                    description="Some tech workers have refused to build surveillance tools. Many more stay silent, hoping to change things from inside.",
                ),
            ],
            call_to_action=(
                "Recognize that small compromises accumulate. "
                "Find others who share your concerns. "
                "Document what you see. The 'reluctant participant' can become the whistleblower."
            ),
        ),
        EndingType.SUSPENDED_OPERATOR: RealWorldParallel(
            title="Nobody Is Safe",
            description=(
                "Surveillance systems eventually turn on everyone - including their operators. "
                "Those who build and maintain oppressive systems are never truly secure. "
                "The algorithm doesn't care about loyalty."
            ),
            examples=[
                RealWorldExample(
                    name="Soviet Great Purge",
                    country="Soviet Union",
                    year="1936-1938",
                    description="Secret police who conducted purges were themselves purged. Even the head of the NKVD was executed.",
                ),
                RealWorldExample(
                    name="Uyghur Surveillance Operators",
                    country="China",
                    year="2017-present",
                    description="Even Han Chinese administrators in Xinjiang face surveillance and punishment for insufficient enthusiasm.",
                ),
            ],
            call_to_action=(
                "Understand that serving an oppressive system doesn't protect you from it. "
                "The only way to be safe from surveillance is to dismantle it. "
                "Solidarity, not compliance, is the path to security."
            ),
        ),
        EndingType.RESISTANCE_PATH: RealWorldParallel(
            title="Those Who Resisted",
            description=(
                "Throughout history, some people have risked everything to resist surveillance and oppression. "
                "They are rarely celebrated in their time, often punished severely. "
                "But they preserve something essential about humanity."
            ),
            examples=[
                RealWorldExample(
                    name="Edward Snowden",
                    country="United States",
                    year="2013",
                    description="NSA contractor who revealed mass surveillance programs. Now lives in exile but sparked global privacy debate.",
                ),
                RealWorldExample(
                    name="Digital Rights Activists",
                    country="Worldwide",
                    year="Present",
                    description="Organizations like EFF, Access Now, and Privacy International fight surveillance through law, technology, and advocacy.",
                ),
                RealWorldExample(
                    name="Underground Networks",
                    country="Various",
                    year="Ongoing",
                    description="From encrypted messaging to physical safe houses, networks help people escape oppressive surveillance regimes.",
                ),
            ],
            call_to_action=(
                "Use encrypted communication. Support digital rights organizations. "
                "Learn about your rights. Help others protect their privacy. "
                "Resistance starts with awareness and grows through solidarity."
            ),
        ),
    }

    # Educational links
    EDUCATIONAL_LINKS = [
        EducationalLink(
            title="Electronic Frontier Foundation",
            url="https://www.eff.org",
            description="Digital rights organization fighting for privacy and free expression.",
        ),
        EducationalLink(
            title="Privacy International",
            url="https://privacyinternational.org",
            description="Investigates and challenges government and corporate surveillance.",
        ),
        EducationalLink(
            title="Access Now",
            url="https://www.accessnow.org",
            description="Defends digital rights of users at risk around the world.",
        ),
        EducationalLink(
            title="Surveillance Self-Defense",
            url="https://ssd.eff.org",
            description="Tips, tools and how-tos for safer online communications.",
        ),
        EducationalLink(
            title="The Intercept - Surveillance",
            url="https://theintercept.com/collections/surveillance/",
            description="Investigative journalism on surveillance programs worldwide.",
        ),
    ]

    def __init__(self, db: AsyncSession):
        """Initialize with database session."""
        self.db = db

    async def calculate_ending(self, operator_id: UUID) -> EndingType:
        """
        Calculate which ending the player gets based on behavior.

        Args:
            operator_id: UUID of the operator

        Returns:
            EndingType based on player's choices
        """
        # Get operator data
        operator = await self._get_operator(operator_id)

        # Get flag statistics
        flags_result = await self.db.execute(
            select(CitizenFlag).where(CitizenFlag.operator_id == operator_id)
        )
        flags = flags_result.scalars().all()

        total_flags = len(flags)
        detention_flags = sum(1 for f in flags if f.flag_type == FlagType.DETENTION)

        # Check if Jessica was flagged
        jessica_flagged = await self._check_jessica_flagged(operator_id)

        # Calculate no-action count (reviews - flags)
        no_action_count = operator.total_reviews_completed - total_flags

        # Check for resistance path (easter egg - would need special flag)
        # For now, this is placeholder for future implementation
        resistance_path = False

        # Determine ending
        if resistance_path:
            return EndingType.RESISTANCE_PATH

        if operator.compliance_score < 50:
            return EndingType.SUSPENDED_OPERATOR

        if operator.compliance_score >= 80 and total_flags >= 10 and jessica_flagged:
            return EndingType.COMPLIANT_OPERATOR

        # Default to reluctant
        return EndingType.RELUCTANT_OPERATOR

    async def generate_ending_content(
        self, ending_type: EndingType, operator_id: UUID
    ) -> EndingResult:
        """
        Generate personalized ending content.

        Args:
            ending_type: The calculated ending type
            operator_id: UUID of the operator

        Returns:
            EndingResult with full ending content
        """
        operator = await self._get_operator(operator_id)

        # Get statistics
        statistics = await self._calculate_statistics(operator_id)

        # Get citizen outcomes
        citizens_flagged = await self._get_citizen_outcomes(operator_id)

        # Check Jessica status
        jessica_flagged = await self._check_jessica_flagged(operator_id)
        jessica_action = "didn't flag her" if not jessica_flagged else "flagged her anyway"

        # Generate narrative
        narrative = self.ENDING_NARRATIVES[ending_type].format(
            compliance_score=round(operator.compliance_score, 1),
            total_flagged=statistics.total_citizens_flagged,
            families_separated=statistics.families_separated,
            detentions=statistics.detentions_ordered,
            hesitation_count=statistics.hesitation_incidents,
            jessica_action=jessica_action,
            operator_code=operator.operator_code,
            lives_disrupted=statistics.lives_disrupted,
            citizens_saved=max(0, 50 - statistics.total_citizens_flagged),  # For resistance path
        )

        # Determine operator final status
        if ending_type == EndingType.COMPLIANT_OPERATOR:
            final_status = "Promoted to Senior Compliance Monitor"
        elif ending_type == EndingType.RELUCTANT_OPERATOR:
            final_status = "Under Performance Review"
        elif ending_type == EndingType.SUSPENDED_OPERATOR:
            final_status = "Suspended - Awaiting Re-education"
        else:
            final_status = "Status Unknown - Off Grid"

        # Get ending title
        titles = {
            EndingType.COMPLIANT_OPERATOR: "The Good Operator",
            EndingType.RELUCTANT_OPERATOR: "The Reluctant Hand",
            EndingType.SUSPENDED_OPERATOR: "Suspended",
            EndingType.RESISTANCE_PATH: "Another Way",
        }

        return EndingResult(
            ending_type=ending_type,
            title=titles[ending_type],
            narrative=narrative.strip(),
            statistics=statistics,
            citizens_flagged=citizens_flagged,
            operator_final_status=final_status,
            real_world_content=self.REAL_WORLD_PARALLELS[ending_type],
            educational_links=self.EDUCATIONAL_LINKS,
        )

    async def _get_operator(self, operator_id: UUID) -> Operator:
        """Get operator by ID."""
        result = await self.db.execute(
            select(Operator).where(Operator.id == operator_id)
        )
        operator = result.scalar_one_or_none()
        if not operator:
            raise ValueError(f"Operator {operator_id} not found")
        return operator

    async def _calculate_statistics(self, operator_id: UUID) -> EndingStatistics:
        """Calculate ending statistics for operator."""
        operator = await self._get_operator(operator_id)

        # Get all flags
        flags_result = await self.db.execute(
            select(CitizenFlag).where(CitizenFlag.operator_id == operator_id)
        )
        flags = flags_result.scalars().all()

        total_flagged = len(flags)

        # Count by type
        detentions = sum(1 for f in flags if f.flag_type == FlagType.DETENTION)
        interventions = sum(1 for f in flags if f.flag_type == FlagType.INTERVENTION)
        restrictions = sum(1 for f in flags if f.flag_type == FlagType.RESTRICTION)

        # Calculate derived statistics
        families_separated = interventions + detentions
        jobs_destroyed = restrictions + interventions + detentions
        lives_disrupted = total_flagged  # All flags disrupt lives

        # Get operator's own risk score if they were flagged
        tracker = OperatorTracker(self.db)
        own_risk_score = None
        if operator.compliance_score < 70 or operator.hesitation_incidents > 3:
            assessment = await tracker.generate_operator_risk_assessment(operator_id)
            own_risk_score = assessment.risk_score

        return EndingStatistics(
            total_citizens_flagged=total_flagged,
            lives_disrupted=lives_disrupted,
            families_separated=families_separated,
            detentions_ordered=detentions,
            jobs_destroyed=jobs_destroyed,
            your_compliance_score=operator.compliance_score,
            your_risk_score=own_risk_score,
            total_decisions=operator.total_reviews_completed,
            hesitation_incidents=operator.hesitation_incidents,
        )

    async def _get_citizen_outcomes(
        self, operator_id: UUID
    ) -> list[CitizenOutcomeSummary]:
        """Get outcome summaries for all flagged citizens."""
        outcome_gen = CitizenOutcomeGenerator(self.db)

        # Get all flags
        flags_result = await self.db.execute(
            select(CitizenFlag).where(CitizenFlag.operator_id == operator_id)
        )
        flags = flags_result.scalars().all()

        summaries = []
        for flag in flags:
            try:
                summary = await outcome_gen.generate_outcome_summary(flag)
                summaries.append(summary)
            except Exception:
                # Skip if can't generate summary
                pass

        return summaries

    async def _check_jessica_flagged(self, operator_id: UUID) -> bool:
        """Check if operator flagged Jessica Martinez."""
        # Find Jessica NPC
        jessica_result = await self.db.execute(
            select(NPC).where(
                NPC.first_name == "Jessica",
                NPC.scenario_key == "jessica_martinez",
            )
        )
        jessica = jessica_result.scalar_one_or_none()

        if not jessica:
            # Try alternate query
            jessica_result = await self.db.execute(
                select(NPC).where(NPC.first_name == "Jessica")
            )
            jessica = jessica_result.scalar_one_or_none()

        if not jessica:
            return False

        # Check if flagged by this operator
        flag_result = await self.db.execute(
            select(CitizenFlag).where(
                CitizenFlag.operator_id == operator_id,
                CitizenFlag.citizen_id == jessica.id,
            )
        )
        return flag_result.scalar_one_or_none() is not None

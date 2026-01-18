"""
Ending schemas for System Mode.

Schemas for calculating and displaying the game ending based on
player behavior throughout the surveillance operator experience.
"""
import enum

from pydantic import BaseModel, Field

from datafusion.schemas.outcomes import CitizenOutcomeSummary


class EndingType(str, enum.Enum):
    """Types of endings based on player behavior."""

    # Original endings
    COMPLIANT_OPERATOR = "compliant_operator"
    RELUCTANT_OPERATOR = "reluctant_operator"
    SUSPENDED_OPERATOR = "suspended_operator"
    RESISTANCE_PATH = "resistance_path"

    # New endings (Phase 7-8 expansion)
    FIRED_EARLY = "fired_early"  # Terminated for poor performance (high reluctance, early weeks)
    IMPRISONED_DISSENT = "imprisoned_dissent"  # Imprisoned for severe dissent/reluctance
    INTERNATIONAL_PARIAH = "international_pariah"  # Sanctioned due to high awareness
    REVOLUTIONARY_CATALYST = "revolutionary_catalyst"  # Triggered revolution (high anger)
    RELUCTANT_SURVIVOR = "reluctant_survivor"  # Low compliance but somehow survived


class RealWorldExample(BaseModel):
    """A real-world example of surveillance harm."""

    name: str = Field(description="Name of the example/case")
    country: str = Field(description="Country where it occurred")
    year: str = Field(description="Year or time period")
    description: str = Field(description="Brief description of what happened")


class RealWorldParallel(BaseModel):
    """Real-world parallels to the game experience."""

    title: str = Field(description="Title of the parallel")
    description: str = Field(description="Explanation of real-world connection")
    examples: list[RealWorldExample] = Field(description="Specific real cases")
    call_to_action: str = Field(description="What players can do")


class EducationalLink(BaseModel):
    """Link to educational resource about surveillance."""

    title: str = Field(description="Title of the resource")
    url: str = Field(description="URL to the resource")
    description: str = Field(description="Brief description")


class EndingStatistics(BaseModel):
    """Statistics summarizing player's impact."""

    total_citizens_flagged: int = Field(description="Total people flagged")
    lives_disrupted: int = Field(description="Lives significantly impacted")
    families_separated: int = Field(description="Families torn apart")
    detentions_ordered: int = Field(description="People detained")
    jobs_destroyed: int = Field(description="Employment terminated")
    your_compliance_score: float = Field(description="Final compliance score")
    your_risk_score: int | None = Field(
        description="Your own risk score (if flagged by system)"
    )
    total_decisions: int = Field(description="Total decisions made")
    hesitation_incidents: int = Field(description="Times you hesitated")


class EndingResult(BaseModel):
    """Complete ending result with narrative and context."""

    ending_type: EndingType = Field(description="Type of ending achieved")
    title: str = Field(description="Ending title")
    narrative: str = Field(description="The ending story/text")
    statistics: EndingStatistics = Field(description="Impact statistics")
    citizens_flagged: list[CitizenOutcomeSummary] = Field(
        description="Outcomes for each flagged citizen"
    )
    operator_final_status: str = Field(description="Your final status in the system")
    real_world_content: RealWorldParallel = Field(
        description="Real-world parallels to your experience"
    )
    educational_links: list[EducationalLink] = Field(
        description="Resources to learn more"
    )


class EndingAcknowledgeRequest(BaseModel):
    """Request to acknowledge ending and complete session."""

    operator_id: str = Field(description="Operator ID")
    feedback: str | None = Field(
        default=None, description="Optional player feedback"
    )


class EndingAcknowledgeResponse(BaseModel):
    """Response after acknowledging ending."""

    session_complete: bool = Field(description="Whether session is marked complete")
    debrief_unlocked: bool = Field(description="Whether educational debrief is unlocked")
    total_play_time_minutes: int | None = Field(
        description="Total play time if tracked"
    )

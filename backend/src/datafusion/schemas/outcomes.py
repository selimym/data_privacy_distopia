"""
Citizen outcome schemas for System Mode.

These schemas represent the human cost of surveillance decisions -
what happens to people after they're flagged by the system.

Educational purpose: Makes abstract surveillance harm concrete and personal.
"""

from uuid import UUID

from pydantic import BaseModel, Field


class CitizenOutcome(BaseModel):
    """
    Detailed outcome for a flagged citizen at a specific time point.

    Shows what happens to real people when they're caught in the
    surveillance system's machinery.
    """

    flag_id: UUID = Field(description="ID of the flag that caused this outcome")
    citizen_id: UUID = Field(
        description="ID of the affected citizen"
    )  # Added for cinematic transitions
    citizen_name: str = Field(description="Name of the affected citizen")
    time_skip: str = Field(description="Time period (immediate, 1_month, 6_months, 1_year)")
    status: str = Field(description="Current status of the citizen")
    narrative: str = Field(description="Detailed narrative of what happened")
    statistics: dict = Field(
        description="Quantified impacts (e.g., social_connections_lost, income_reduction_percent)"
    )


class CitizenOutcomeSummary(BaseModel):
    """
    One-line summary of a citizen's outcome for ending sequence.

    Used to show the player the cumulative impact of their decisions.
    """

    citizen_name: str = Field(description="Name of the affected citizen")
    flag_type: str = Field(description="Type of flag that was applied")
    final_status: str = Field(description="Final status after 1 year")
    one_line_summary: str = Field(
        description="Brief summary (e.g., 'Employment terminated. Family separated.')"
    )


class OutcomeTimeline(BaseModel):
    """Complete timeline of outcomes for a flagged citizen."""

    citizen_name: str = Field(description="Name of the affected citizen")
    flag_type: str = Field(description="Type of flag applied")
    flag_date: str = Field(description="When the flag was submitted")
    outcomes: list[CitizenOutcome] = Field(
        description="Timeline of outcomes from immediate to 1 year"
    )


class OperatorImpactSummary(BaseModel):
    """
    Summary of all impacts caused by an operator's decisions.

    Shown at the end to confront the player with consequences.
    """

    operator_code: str = Field(description="Operator's assigned code")
    total_citizens_flagged: int = Field(description="Total citizens flagged")
    outcomes_by_type: dict[str, int] = Field(description="Count of flags by type")
    citizen_summaries: list[CitizenOutcomeSummary] = Field(
        description="Individual outcomes for each flagged citizen"
    )
    aggregate_statistics: dict = Field(
        description="Aggregate impacts (jobs lost, families separated, etc.)"
    )

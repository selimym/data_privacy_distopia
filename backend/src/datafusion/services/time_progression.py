"""
Time Progression Service for System Mode.

Manages time advancement and outcome generation for all flagged citizens.
When directives are completed, time progresses and consequences escalate.
"""
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from datafusion.models.system_mode import CitizenFlag, Operator
from datafusion.schemas.outcomes import CitizenOutcome
from datafusion.services.citizen_outcomes import CitizenOutcomeGenerator


class TimeProgressionService:
    """
    Manages time progression for system mode.

    Maps directives to time periods and generates outcomes
    for all flagged citizens when time advances.
    """

    # Map directive week numbers to time periods
    DIRECTIVE_TIME_MAP = {
        1: "immediate",  # Week 1 → immediate outcomes (already shown)
        2: "1_month",    # Week 2 → 1 month later
        3: "6_months",   # Week 3 → 6 months later
        4: "6_months",   # Week 4 → still 6 months
        5: "1_year",     # Week 5 → 1 year later
        6: "1_year",     # Week 6 → still 1 year
    }

    def __init__(self, db: AsyncSession):
        """Initialize with database session."""
        self.db = db
        self.outcome_generator = CitizenOutcomeGenerator(db)

    async def advance_time(self, operator_id: UUID) -> list[CitizenOutcome]:
        """
        Advance operator's time period and generate outcomes for all flagged citizens.

        This is called when a directive is completed. It:
        1. Gets the operator's current directive to determine new time period
        2. Gets all flags submitted by this operator
        3. Generates outcomes for each citizen at the new time period
        4. Updates the operator's current_time_period

        Args:
            operator_id: UUID of the operator

        Returns:
            List of CitizenOutcome objects to display cinematically
        """
        # Get operator
        operator_result = await self.db.execute(
            select(Operator).where(Operator.id == operator_id)
        )
        operator = operator_result.scalar_one_or_none()
        if not operator:
            raise ValueError(f"Operator {operator_id} not found")

        # Determine new time period based on directive
        # If they just completed directive N, we show outcomes for directive N+1's time period
        current_directive = operator.current_directive
        if not current_directive:
            return []

        next_week = current_directive.week_number + 1
        new_time_period = self.DIRECTIVE_TIME_MAP.get(next_week)

        # If no time progression (beyond week 6 or invalid), return empty
        if not new_time_period or new_time_period == operator.current_time_period:
            return []

        # Get all flags submitted by this operator
        flags_result = await self.db.execute(
            select(CitizenFlag).where(CitizenFlag.operator_id == operator_id)
        )
        flags = flags_result.scalars().all()

        # Generate outcomes for each citizen at the new time period
        outcomes = []
        for flag in flags:
            try:
                outcome = await self.outcome_generator.generate_outcome(
                    flag, new_time_period
                )
                outcomes.append(outcome)
            except Exception as e:
                # Log error but continue with other citizens
                print(f"Error generating outcome for flag {flag.id}: {e}")
                continue

        # Update operator's current time period
        operator.current_time_period = new_time_period
        await self.db.commit()

        return outcomes

    def get_time_period_for_directive(self, week_number: int) -> str:
        """
        Get the time period associated with a directive week.

        Args:
            week_number: The directive week number (1-6)

        Returns:
            Time period string (immediate, 1_month, 6_months, 1_year)
        """
        return self.DIRECTIVE_TIME_MAP.get(week_number, "immediate")

    def should_show_time_progression(self, current_week: int, next_week: int) -> bool:
        """
        Check if time should progress between two directive weeks.

        Args:
            current_week: Current directive week number
            next_week: Next directive week number

        Returns:
            True if time period changes between these weeks
        """
        current_period = self.DIRECTIVE_TIME_MAP.get(current_week)
        next_period = self.DIRECTIVE_TIME_MAP.get(next_week)

        return current_period != next_period and next_period is not None

/**
 * Time Progression Service for System Mode.
 *
 * Manages time advancement and outcome generation for all flagged citizens.
 * When directives are completed, time progresses and consequences escalate.
 *
 * Port of backend/src/datafusion/services/time_progression.py
 */

import { gameStore } from '../state/GameStore';
import { citizenOutcomeGenerator, type CitizenOutcome } from './citizen-outcomes';

/**
 * Maps directive week numbers to time periods.
 */
const DIRECTIVE_TIME_MAP: Record<number, string> = {
  1: 'immediate',  // Week 1 → immediate outcomes (already shown)
  2: '1_month',    // Week 2 → 1 month later
  3: '6_months',   // Week 3 → 6 months later
  4: '6_months',   // Week 4 → still 6 months
  5: '1_year',     // Week 5 → 1 year later
  6: '1_year',     // Week 6 → still 1 year
};

/**
 * Time Progression Service.
 * Manages time progression for system mode.
 */
export class TimeProgressionService {
  /**
   * Advance operator's time period and generate outcomes for all flagged citizens.
   *
   * This is called when a directive is completed. It:
   * 1. Gets the operator's current directive to determine new time period
   * 2. Gets all flags submitted by this operator
   * 3. Generates outcomes for each citizen at the new time period
   * 4. Updates the operator's current_time_period
   *
   * @param operatorId - UUID of the operator
   * @returns List of CitizenOutcome objects to display cinematically
   */
  async advanceTime(operatorId: string): Promise<CitizenOutcome[]> {
    // Get operator
    const operator = gameStore.getOperator();
    if (!operator || operator.id !== operatorId) {
      throw new Error(`Operator ${operatorId} not found`);
    }

    // Determine new time period based on directive
    // If they just completed directive N, we show outcomes for directive N+1's time period
    // Get current directive from operator's current_directive_id
    const currentDirectiveId = operator.current_directive_id;
    if (!currentDirectiveId) {
      return [];
    }

    const currentDirective = gameStore.getDirective(currentDirectiveId);
    if (!currentDirective) {
      return [];
    }

    const nextWeek = currentDirective.week_number + 1;
    const newTimePeriod = DIRECTIVE_TIME_MAP[nextWeek];

    // If no time progression (beyond week 6 or invalid), return empty
    if (!newTimePeriod || newTimePeriod === operator.current_time_period) {
      return [];
    }

    // Get all flags submitted by this operator
    const flags = gameStore.getAllFlags().filter(f => f.operator_id === operatorId);

    // Generate outcomes for each citizen at the new time period
    const outcomes: CitizenOutcome[] = [];
    for (const flag of flags) {
      try {
        const outcome = await citizenOutcomeGenerator.generateOutcome(flag, newTimePeriod);
        outcomes.push(outcome);
      } catch (error) {
        // Log error but continue with other citizens
        console.error(`Error generating outcome for flag ${flag.id}:`, error);
        continue;
      }
    }

    // Update operator's current time period
    gameStore.updateOperator({
      ...operator,
      current_time_period: newTimePeriod,
    });

    return outcomes;
  }

  /**
   * Get the time period associated with a directive week.
   *
   * @param weekNumber - The directive week number (1-6)
   * @returns Time period string (immediate, 1_month, 6_months, 1_year)
   */
  getTimePeriodForDirective(weekNumber: number): string {
    return DIRECTIVE_TIME_MAP[weekNumber] || 'immediate';
  }

  /**
   * Check if time should progress between two directive weeks.
   *
   * @param currentWeek - Current directive week number
   * @param nextWeek - Next directive week number
   * @returns True if time period changes between these weeks
   */
  shouldShowTimeProgression(currentWeek: number, nextWeek: number): boolean {
    const currentPeriod = DIRECTIVE_TIME_MAP[currentWeek];
    const nextPeriod = DIRECTIVE_TIME_MAP[nextWeek];

    return currentPeriod !== nextPeriod && nextPeriod !== undefined;
  }
}

// Export singleton instance
export const timeProgressionService = new TimeProgressionService();

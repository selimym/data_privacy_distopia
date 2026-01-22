/**
 * Severity Scoring Service - defines severity scores for all action types.
 * Port of backend/src/datafusion/services/severity_scoring.py
 *
 * Severity scores (1-10) determine:
 * - Public awareness/anger increases
 * - Backlash probability
 * - Reluctance reduction for harsh actions
 * - Protest trigger probability
 */

import { NewActionType } from '../types';

// Severity scores for each action type (1-10 scale)
export const SEVERITY_SCORES: Record<NewActionType, number> = {
  [NewActionType.MONITORING]: 1,
  [NewActionType.RESTRICTION]: 2,
  [NewActionType.BOOK_BAN]: 4,
  [NewActionType.INTERVENTION]: 5,
  [NewActionType.PRESS_BAN]: 5,
  [NewActionType.PRESSURE_FIRING]: 6,
  [NewActionType.DETENTION]: 6,
  [NewActionType.ICE_RAID]: 7,
  [NewActionType.ARBITRARY_DETENTION]: 7,
  [NewActionType.DECLARE_PROTEST_ILLEGAL]: 7,
  [NewActionType.HOSPITAL_ARREST]: 8,
  [NewActionType.INCITE_VIOLENCE]: 9,
} as const;

/**
 * Get severity score for an action type.
 *
 * @param actionType - The type of action
 * @returns Severity score (1-10)
 * @throws Error if action type not recognized
 */
export function getSeverityScore(actionType: NewActionType): number {
  const score = SEVERITY_SCORES[actionType];
  if (score === undefined) {
    throw new Error(`Unknown action type: ${actionType}`);
  }
  return score;
}

/**
 * Determine if an action is considered "harsh" (reduces reluctance).
 *
 * Harsh actions are severity 7+.
 *
 * @param severity - Severity score
 * @returns True if harsh action
 */
export function isHarshAction(severity: number): boolean {
  return severity >= 7;
}

/**
 * Get human-readable description of action type.
 *
 * @param actionType - The type of action
 * @returns Description string
 */
export function getActionDescription(actionType: NewActionType): string {
  const descriptions: Record<NewActionType, string> = {
    [NewActionType.MONITORING]: 'Increased surveillance monitoring',
    [NewActionType.RESTRICTION]: 'Restricted freedoms and movement',
    [NewActionType.BOOK_BAN]: 'Banned controversial publication',
    [NewActionType.INTERVENTION]: 'Direct intervention required',
    [NewActionType.PRESS_BAN]: 'Banned news outlet',
    [NewActionType.PRESSURE_FIRING]: 'Pressured firing of journalist',
    [NewActionType.DETENTION]: 'Detention and arrest',
    [NewActionType.ICE_RAID]: 'Immigration enforcement raid',
    [NewActionType.ARBITRARY_DETENTION]: 'Arbitrary detention without charges',
    [NewActionType.DECLARE_PROTEST_ILLEGAL]: 'Declared protest illegal',
    [NewActionType.HOSPITAL_ARREST]: 'Arrested hospitalized citizen',
    [NewActionType.INCITE_VIOLENCE]: 'Incited violence against protesters',
  };
  return descriptions[actionType] || String(actionType);
}

/**
 * Get category of action for UI grouping.
 *
 * @param actionType - The type of action
 * @returns Category string: "citizen", "neighborhood", "press", "book", "protest", "hospital"
 */
export function getActionCategory(actionType: NewActionType): string {
  if (
    [
      NewActionType.MONITORING,
      NewActionType.RESTRICTION,
      NewActionType.INTERVENTION,
      NewActionType.DETENTION,
    ].includes(actionType)
  ) {
    return 'citizen';
  } else if (actionType === NewActionType.ICE_RAID) {
    return 'neighborhood';
  } else if (
    [
      NewActionType.PRESS_BAN,
      NewActionType.PRESSURE_FIRING,
      NewActionType.ARBITRARY_DETENTION,
    ].includes(actionType)
  ) {
    return 'press';
  } else if (actionType === NewActionType.BOOK_BAN) {
    return 'book';
  } else if (
    [NewActionType.DECLARE_PROTEST_ILLEGAL, NewActionType.INCITE_VIOLENCE].includes(actionType)
  ) {
    return 'protest';
  } else if (actionType === NewActionType.HOSPITAL_ARREST) {
    return 'hospital';
  } else {
    return 'other';
  }
}

/**
 * Calculate moral weight for ending calculation.
 *
 * Higher severity = higher moral weight.
 *
 * @param severity - Severity score (1-10)
 * @returns Moral weight (1-10)
 */
export function calculateMoralWeight(severity: number): number {
  return severity;
}

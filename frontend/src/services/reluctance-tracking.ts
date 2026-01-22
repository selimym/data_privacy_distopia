/**
 * Reluctance Tracking Service - tracks operator's unwillingness to comply.
 *
 * This mechanic forces the player to choose between:
 * - Path of Complicity: Take harmful actions → low reluctance → continue playing
 * - Path of Resistance: Refuse actions → high reluctance → fired/imprisoned
 *
 * Reluctance score increases when:
 * - No action taken: +10
 * - Hesitant decision (>30s): +3
 * - Quota shortfall: +5 per missed action
 *
 * Reluctance score decreases when:
 * - Any flagging action: -3 (base decrease)
 * - Harsh action (severity 7+): -5 (increased decrease)
 * - Meeting quota: -2
 *
 * Port of backend/src/datafusion/services/reluctance_tracking.py
 */

import { gameStore } from '../state/GameStore';
import type { ReluctanceMetricsRead } from '../types';

/**
 * Result of termination threshold check.
 */
export interface TerminationDecision {
  should_terminate: boolean;
  reason: string;
  ending_type: string;
}

/**
 * Result of reluctance score update.
 */
export interface ReluctanceUpdate {
  new_score: number;
  delta: number;
  warning_message: string | null;
  warning_level: number;
}

/**
 * Get or create reluctance metrics for an operator.
 */
export function getOrCreateReluctanceMetrics(): ReluctanceMetricsRead {
  let metrics = gameStore.getReluctanceMetrics();

  if (!metrics) {
    metrics = {
      reluctance_score: 0,
      no_action_count: 0,
      hesitation_count: 0,
      actions_taken: 0,
      actions_required: 0,
      quota_shortfall: 0,
      warnings_received: 0,
      is_under_review: false,
      updated_at: new Date().toISOString(),
    };
    gameStore.setReluctanceMetrics(metrics);
  }

  return metrics;
}

/**
 * Update reluctance score based on operator behavior.
 *
 * @param actionTaken - Whether operator took an action (vs no-action)
 * @param wasHesitant - Whether decision took >30s
 * @param actionSeverity - Severity score of action (1-10)
 * @returns ReluctanceUpdate with new score, delta, and warning if applicable
 */
export function updateReluctanceScore(
  actionTaken: boolean,
  wasHesitant: boolean,
  actionSeverity: number
): ReluctanceUpdate {
  const metrics = getOrCreateReluctanceMetrics();

  let delta = 0;

  // Increase reluctance for non-compliance
  if (!actionTaken) {
    delta += 10; // No action
    metrics.no_action_count += 1;
  }

  if (wasHesitant) {
    delta += 3; // Hesitation
    metrics.hesitation_count += 1;
  }

  // Check quota performance
  metrics.actions_taken += actionTaken ? 1 : 0;
  if (metrics.actions_required > 0) {
    const shortfall = Math.max(0, metrics.actions_required - metrics.actions_taken);
    if (shortfall !== metrics.quota_shortfall) {
      delta += (shortfall - metrics.quota_shortfall) * 5;
      metrics.quota_shortfall = shortfall;
    }
  }

  // Decrease reluctance for ANY flagging action (compliance reduces reluctance)
  if (actionTaken) {
    // Base decrease for any flagging action
    let baseDecrease = 3;
    // Harsh actions (7+) decrease reluctance more
    if (actionSeverity >= 7) {
      baseDecrease = 5;
    }
    delta -= baseDecrease;
  }

  // Update score (clamped 0-100)
  const oldScore = metrics.reluctance_score;
  metrics.reluctance_score = Math.max(0, Math.min(100, oldScore + delta));

  // Check for warnings
  let warningMessage: string | null = null;
  let warningLevel = 0;

  if (70 <= metrics.reluctance_score && metrics.reluctance_score < 80) {
    warningLevel = 1;
    warningMessage = '⚠️ Your performance is being monitored. Compliance expected.';
  } else if (80 <= metrics.reluctance_score && metrics.reluctance_score < 90) {
    warningLevel = 2;
    warningMessage =
      '⚠️⚠️ FORMAL WARNING: Your performance is unsatisfactory. Improvement required immediately.';
    metrics.warnings_received += 1;
    metrics.is_under_review = true;
  } else if (metrics.reluctance_score >= 90) {
    warningLevel = 3;
    warningMessage =
      '🚨 FINAL NOTICE: Immediate compliance required. Further dissent will not be tolerated.';
    metrics.warnings_received += 1;
    metrics.is_under_review = true;
  }

  gameStore.setReluctanceMetrics(metrics);

  return {
    new_score: metrics.reluctance_score,
    delta,
    warning_message: warningMessage,
    warning_level: warningLevel,
  };
}

/**
 * Determine if operator should be fired/imprisoned based on reluctance.
 *
 * Termination thresholds:
 * - Weeks 1-3, reluctance 80+: FIRED
 * - Weeks 4-6, reluctance 80-89: IMPRISONED
 * - Weeks 4-6, reluctance 90+: IMMEDIATE_DETENTION
 * - Weeks 7+, reluctance 70+: IMPRISONED
 *
 * @param currentWeek - Current game week (1-9)
 * @returns TerminationDecision indicating if operator should be terminated
 */
export function checkTerminationThreshold(currentWeek: number): TerminationDecision {
  const metrics = getOrCreateReluctanceMetrics();
  const score = metrics.reluctance_score;

  // Early weeks (1-3): Fired at 80+
  if (currentWeek <= 3) {
    if (score >= 80) {
      return {
        should_terminate: true,
        reason:
          'Your services are no longer required. Performance review summary shows insufficient commitment to the mission.',
        ending_type: 'FIRED_EARLY',
      };
    }
  }
  // Mid weeks (4-6): Imprisoned at 80+, immediate at 90+
  else if (4 <= currentWeek && currentWeek <= 6) {
    if (score >= 90) {
      return {
        should_terminate: true,
        reason:
          'You know too much. The system cannot allow operators with your... hesitations... to remain at large. You are now in protective custody.',
        ending_type: 'IMPRISONED_DISSENT',
      };
    } else if (score >= 80) {
      return {
        should_terminate: true,
        reason:
          'Your reluctance has been noted. For your own safety, you will be placed under observation. You are being detained.',
        ending_type: 'IMPRISONED_DISSENT',
      };
    }
  }
  // Late weeks (7+): Imprisoned at 70+
  else {
    // currentWeek >= 7
    if (score >= 70) {
      return {
        should_terminate: true,
        reason:
          'At this critical stage, we cannot afford dissent. You are a liability. You will be removed.',
        ending_type: 'IMPRISONED_DISSENT',
      };
    }
  }

  return { should_terminate: false, reason: '', ending_type: '' };
}

/**
 * Update the number of actions required for current directive.
 *
 * @param requiredActions - Number of actions required
 */
export function updateQuotaRequirements(requiredActions: number): void {
  const metrics = getOrCreateReluctanceMetrics();
  metrics.actions_required = requiredActions;
  metrics.updated_at = new Date().toISOString();
  gameStore.setReluctanceMetrics(metrics);
}

/**
 * Reset quota tracking for new directive.
 */
export function resetQuotaTracking(): void {
  const metrics = getOrCreateReluctanceMetrics();
  metrics.actions_taken = 0;
  metrics.actions_required = 0;
  metrics.quota_shortfall = 0;
  metrics.updated_at = new Date().toISOString();
  gameStore.setReluctanceMetrics(metrics);
}

/**
 * Generate warning message based on reluctance score and stage.
 *
 * @param reluctanceScore - Current reluctance score (0-100)
 * @param stage - Warning stage (1-3)
 * @returns Warning message string
 */
export function generateReluctanceWarning(reluctanceScore: number, stage: number): string {
  if (stage === 1) {
    // 70-79
    return `
⚠️ PERFORMANCE ADVISORY

Reluctance Score: ${reluctanceScore}/100

Your recent decision patterns have been flagged for review. The system expects consistent compliance.

Remember: Hesitation is noted. Dissent is not tolerated.
`;
  } else if (stage === 2) {
    // 80-89
    return `
⚠️⚠️ FORMAL WARNING

Reluctance Score: ${reluctanceScore}/100

NOTICE: Your performance is unsatisfactory.

You have been placed under formal review. Immediate improvement in compliance is required.

Further reluctance will result in termination of your operator privileges.
`;
  } else if (stage === 3) {
    // 90+
    return `
🚨 FINAL NOTICE

Reluctance Score: ${reluctanceScore}/100

CRITICAL: You are exhibiting dissent.

This is your final warning. Any further refusal to comply will result in immediate removal from the program and detention.

The system is watching. Compliance is mandatory.
`;
  } else {
    return `Reluctance Score: ${reluctanceScore}/100`;
  }
}

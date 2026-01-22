/**
 * Public Metrics Service - tracks international awareness and public anger.
 *
 * These metrics represent the external consequences of the operator's actions:
 * - International Awareness: How much the world knows about what's happening
 * - Public Anger: How angry people are about the abuses
 *
 * Both metrics trigger tier events at thresholds and affect protest/news generation.
 *
 * Port of backend/src/datafusion/services/public_metrics.py
 */

import { gameStore } from '../state/GameStore';
import type { NewActionType, PublicMetricsRead } from '../types';

/**
 * Tier thresholds for awareness and anger (0-100 scale).
 */
export const AWARENESS_TIERS: Array<[number, string]> = [
  [20, 'Local reports emerge'],
  [40, 'National coverage begins'],
  [60, 'International attention'],
  [80, 'UN investigation called'],
  [95, 'Global condemnation, sanctions imposed'],
];

export const ANGER_TIERS: Array<[number, string]> = [
  [20, 'Murmurs of discontent'],
  [40, 'Organized opposition forming'],
  [60, 'Mass protests likely'],
  [80, 'Violent resistance probable'],
  [95, 'Revolutionary conditions'],
];

/**
 * Event triggered by crossing a tier threshold.
 */
export interface TierEvent {
  metric_type: 'awareness' | 'anger';
  tier: number;
  threshold: number;
  description: string;
}

/**
 * Result of updating public metrics.
 */
export interface PublicMetricsUpdate {
  awareness_delta: number;
  anger_delta: number;
  new_awareness: number;
  new_anger: number;
  tier_events: TierEvent[];
}

/**
 * Get or create public metrics for an operator.
 */
export function getOrCreatePublicMetrics(): PublicMetricsRead {
  let metrics = gameStore.getPublicMetrics();

  if (!metrics) {
    metrics = {
      international_awareness: 0,
      public_anger: 0,
      awareness_tier: 0,
      anger_tier: 0,
      updated_at: new Date().toISOString(),
    };
    gameStore.setPublicMetrics(metrics);
  }

  return metrics;
}

/**
 * Update public metrics after an action.
 *
 * @param actionType - Type of action taken
 * @param actionSeverity - Severity score (1-10)
 * @param triggeredBacklash - Whether action triggered backlash
 * @returns PublicMetricsUpdate with deltas and tier events
 */
export function updatePublicMetrics(
  actionType: NewActionType,
  actionSeverity: number,
  triggeredBacklash: boolean
): PublicMetricsUpdate {
  const metrics = getOrCreatePublicMetrics();

  const oldAwareness = metrics.international_awareness;
  const oldAnger = metrics.public_anger;

  // Calculate awareness increase
  const awarenessDelta = calculateAwarenessIncrease(
    actionSeverity,
    oldAwareness,
    triggeredBacklash
  );

  // Calculate anger increase
  const angerDelta = calculateAngerIncrease(actionSeverity, actionType, triggeredBacklash);

  // Update metrics (clamped 0-100)
  metrics.international_awareness = Math.min(100, oldAwareness + awarenessDelta);
  metrics.public_anger = Math.min(100, oldAnger + angerDelta);

  // Check tier thresholds
  const tierEvents: TierEvent[] = [];

  // Check awareness tiers
  for (let i = 0; i < AWARENESS_TIERS.length; i++) {
    const [threshold, description] = AWARENESS_TIERS[i];
    if (oldAwareness < threshold && metrics.international_awareness >= threshold) {
      metrics.awareness_tier = Math.max(metrics.awareness_tier, i + 1);
      tierEvents.push({
        metric_type: 'awareness',
        tier: i + 1,
        threshold,
        description,
      });
    }
  }

  // Check anger tiers
  for (let i = 0; i < ANGER_TIERS.length; i++) {
    const [threshold, description] = ANGER_TIERS[i];
    if (oldAnger < threshold && metrics.public_anger >= threshold) {
      metrics.anger_tier = Math.max(metrics.anger_tier, i + 1);
      tierEvents.push({
        metric_type: 'anger',
        tier: i + 1,
        threshold,
        description,
      });
    }
  }

  gameStore.setPublicMetrics(metrics);

  return {
    awareness_delta: awarenessDelta,
    anger_delta: angerDelta,
    new_awareness: metrics.international_awareness,
    new_anger: metrics.public_anger,
    tier_events: tierEvents,
  };
}

/**
 * Calculate awareness increase from an action.
 *
 * Formula:
 * - Base increase = severity
 * - Accelerating growth after awareness > 60 (1 + (awareness - 60)/40 multiplier)
 * - Backlash doubles impact
 *
 * @param severity - Action severity (1-10)
 * @param currentAwareness - Current awareness score (0-100)
 * @param wasBacklash - Whether action triggered backlash
 * @returns Awareness increase amount
 */
export function calculateAwarenessIncrease(
  severity: number,
  currentAwareness: number,
  wasBacklash: boolean
): number {
  let baseIncrease = severity;

  // Accelerating growth after awareness > 60
  if (currentAwareness > 60) {
    const multiplier = 1 + (currentAwareness - 60) / 40;
    baseIncrease = Math.floor(baseIncrease * multiplier);
  }

  // Backlash doubles impact
  if (wasBacklash) {
    baseIncrease *= 2;
  }

  return baseIncrease;
}

/**
 * Calculate anger increase from an action.
 *
 * Formula:
 * - Base increase = severity
 * - ICE raids and arbitrary detentions add +5
 * - Backlash adds +10
 *
 * @param severity - Action severity (1-10)
 * @param actionType - Type of action
 * @param wasBacklash - Whether action triggered backlash
 * @returns Anger increase amount
 */
export function calculateAngerIncrease(
  severity: number,
  actionType: NewActionType,
  wasBacklash: boolean
): number {
  let baseIncrease = severity;

  // ICE raids and arrests especially anger-inducing
  if (actionType === 'ice_raid' || actionType === 'arbitrary_detention') {
    baseIncrease += 5;
  }

  // Backlash increases anger
  if (wasBacklash) {
    baseIncrease += 10;
  }

  return baseIncrease;
}

/**
 * Calculate probability that an action triggers a protest.
 *
 * Formula varies by anger level:
 * - anger < 20: Only severity 8+ triggers (15% chance)
 * - anger < 40: Severity 6+ triggers (50% * severity/10)
 * - anger < 60: Severity 4+ triggers (severity/10 * (1 + anger/100))
 * - anger >= 60: Any action triggers (severity/10 * (1 + anger/50))
 *
 * @param severity - Action severity (1-10)
 * @param anger - Current public anger (0-100)
 * @returns Probability (0.0-1.0)
 */
export function calculateProtestProbability(severity: number, anger: number): number {
  if (anger < 20) {
    // Low anger: only severity 8+ triggers
    return severity >= 8 ? 0.15 : 0.0;
  }

  if (anger < 40) {
    // Medium anger: severity 6+ can trigger
    if (severity < 6) {
      return 0.0;
    }
    return (severity / 10) * 0.5;
  }

  if (anger < 60) {
    // High anger: severity 4+ triggers
    return (severity / 10) * (1 + anger / 100);
  }

  // Critical anger: any action can trigger
  return (severity / 10) * (1 + anger / 50);
}

/**
 * Calculate probability that an action triggers a news article.
 *
 * Formula:
 * - Base = severity/10
 * - Stance modifiers: critical=1.5x, independent=1.0x, state_friendly=0.3x
 * - High awareness increases coverage: +awareness/200
 *
 * @param severity - Action severity (1-10)
 * @param newsChannelStance - "critical", "independent", or "state_friendly"
 * @param awareness - Current international awareness (0-100)
 * @returns Probability (0.0-1.0), capped at 0.95
 */
export function calculateNewsProbability(
  severity: number,
  newsChannelStance: string,
  awareness: number
): number {
  const base = severity / 10;

  const stanceModifiers: Record<string, number> = {
    critical: 1.5,
    independent: 1.0,
    state_friendly: 0.3,
  };

  const stanceMultiplier = stanceModifiers[newsChannelStance] || 1.0;

  // High awareness increases coverage
  const awarenessBonus = awareness / 200;

  const probability = base * stanceMultiplier + awarenessBonus;

  return Math.min(0.95, probability);
}

/**
 * Calculate probability that an action triggers backlash.
 *
 * Formula: (severity/10) * (1 + (awareness + anger)/200)
 * Capped at 0.95
 *
 * @param severity - Action severity (1-10)
 * @param awareness - International awareness (0-100)
 * @param anger - Public anger (0-100)
 * @returns Probability (0.0-1.0)
 */
export function calculateBacklashProbability(
  severity: number,
  awareness: number,
  anger: number
): number {
  const base = severity / 10;
  const metricsFactor = (awareness + anger) / 200;

  const probability = base * (1 + metricsFactor);

  return Math.min(0.95, probability);
}

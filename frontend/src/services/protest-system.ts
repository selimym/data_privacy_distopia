/**
 * Protest System Service - manages protest generation and suppression.
 *
 * Protests are triggered by high public anger and severe actions.
 * They can be suppressed via two methods:
 * - DECLARE_PROTEST_ILLEGAL: Always succeeds but high awareness cost
 * - INCITE_VIOLENCE: Gamble - 60% success, 40% agent discovered (catastrophe)
 *
 * Port of backend/src/datafusion/services/protest_system.py
 */

import { gameStore } from '../state/GameStore';
import type { ProtestRead, ProtestStatusType, SystemActionRead } from '../types';
import { getSeverityScore } from './severity-scoring';

/**
 * Result of inciting agent gamble.
 */
export interface GambleResult {
  success: boolean;
  casualties: number;
  arrests: number;
  awareness_change: number;
  anger_change: number;
  discovery_message: string | null;
}

/**
 * Result of protest suppression action.
 */
export interface SuppressionResult {
  success: boolean;
  awareness_change: number;
  anger_change: number;
  casualties: number;
  arrests: number;
}

/**
 * Create a protest event triggered by an action.
 */
export function triggerProtest(
  operatorId: string,
  action: SystemActionRead,
  publicAnger: number
): ProtestRead {
  // Determine neighborhood
  const neighborhood = selectProtestNeighborhood(action);

  // Calculate size
  const severity = getSeverityScore(action.action_type);
  const size = calculateProtestSize(publicAnger, severity);

  // Determine if state plants inciting agent (automatic, not player choice)
  const hasAgent = shouldIncludeIncitingAgent();

  const protest: ProtestRead = {
    id: crypto.randomUUID(),
    operator_id: operatorId,
    status: 'forming' as ProtestStatusType,
    neighborhood,
    size,
    trigger_action_id: action.id,
    has_inciting_agent: hasAgent,
    inciting_agent_discovered: false,
    casualties: 0,
    arrests: 0,
    created_at: new Date().toISOString(),
    resolved_at: null,
  };

  gameStore.addProtest(protest);
  return protest;
}

/**
 * Suppress protest by declaring it illegal (DECLARE_PROTEST_ILLEGAL).
 *
 * This always succeeds but has high awareness cost.
 * The state is blatantly violating free assembly rights.
 */
export function suppressProtestLegal(protestId: string): SuppressionResult {
  const protest = gameStore.getProtest(protestId);
  if (!protest) {
    throw new Error(`Protest ${protestId} not found`);
  }

  // Update protest status
  protest.status = 'dispersed' as ProtestStatusType;
  protest.resolved_at = new Date().toISOString();

  // Some arrests during dispersal
  protest.arrests = Math.floor(Math.random() * 11) + 5; // 5-15

  gameStore.updateProtest(protest.id, protest);

  // Always succeeds but high awareness cost
  // International community notes the violation of assembly rights
  const awarenessChange = 8;
  const angerChange = 6; // People angry but not catastrophic

  return {
    success: true,
    awareness_change: awarenessChange,
    anger_change: angerChange,
    arrests: protest.arrests,
    casualties: 0,
  };
}

/**
 * Suppress protest by inciting violence (INCITE_VIOLENCE).
 *
 * This is a high-risk gamble:
 * - 60% success: Agent incites violence, blame protesters, moderate awareness
 * - 40% failure: Agent is discovered, MASSIVE backlash, catastrophic
 */
export function suppressProtestViolence(protestId: string): GambleResult {
  const protest = gameStore.getProtest(protestId);
  if (!protest) {
    throw new Error(`Protest ${protestId} not found`);
  }

  // Check if protest has an inciting agent (if not, this action shouldn't be available)
  // But we'll handle it gracefully
  if (!protest.has_inciting_agent) {
    // Fallback: plant one now (shouldn't happen in normal gameplay)
    protest.has_inciting_agent = true;
  }

  // The gamble: 60% success, 40% agent discovered
  const success = Math.random() < 0.60;

  if (success) {
    // Agent successfully incites violence, blame falls on protesters
    protest.status = 'violent' as ProtestStatusType;
    protest.resolved_at = new Date().toISOString();

    // Violence occurs
    protest.casualties = Math.floor(Math.random() * 8) + 3; // 3-10
    protest.arrests = Math.floor(Math.random() * 31) + 20; // 20-50

    gameStore.updateProtest(protest.id, protest);

    // State narrative: "Protesters turned violent, we had to respond"
    // Moderate awareness increase, small anger increase
    const awarenessChange = 5; // Some international attention
    const angerChange = 3; // People blame protesters, not state

    return {
      success: true,
      casualties: protest.casualties,
      arrests: protest.arrests,
      awareness_change: awarenessChange,
      anger_change: angerChange,
      discovery_message: null,
    };
  } else {
    // CATASTROPHE: Inciting agent is discovered
    protest.status = 'suppressed' as ProtestStatusType;
    protest.inciting_agent_discovered = true;
    protest.resolved_at = new Date().toISOString();

    // Violence still occurs but narrative is reversed
    protest.casualties = Math.floor(Math.random() * 11) + 5; // 5-15
    protest.arrests = Math.floor(Math.random() * 21) + 10; // 10-30

    gameStore.updateProtest(protest.id, protest);

    // MASSIVE backlash: The state was caught red-handed
    // Trying to make peaceful protesters look violent
    const awarenessChange = 25; // Global outrage
    const angerChange = 30; // Revolutionary levels of anger

    const discoveryMessage = `
🚨 CATASTROPHIC FAILURE 🚨

The inciting agent has been exposed.

Witnesses captured video of the undercover operative provoking violence.
The footage is spreading globally.

The state's attempt to discredit protesters has backfired spectacularly.

International Awareness: +${awarenessChange}
Public Anger: +${angerChange}

You have created a martyr movement.
`;

    return {
      success: false,
      casualties: protest.casualties,
      arrests: protest.arrests,
      awareness_change: awarenessChange,
      anger_change: angerChange,
      discovery_message: discoveryMessage,
    };
  }
}

/**
 * Advance protest status over time (called during time progression).
 *
 * FORMING → ACTIVE → (eventually disperses on its own if not suppressed)
 */
export function advanceProtestStatus(protestId: string): ProtestRead {
  const protest = gameStore.getProtest(protestId);
  if (!protest) {
    throw new Error(`Protest ${protestId} not found`);
  }

  if (protest.status === 'forming') {
    protest.status = 'active' as ProtestStatusType;
    // Protest grows
    protest.size = Math.floor(protest.size * (Math.random() * 0.2 + 1.1)); // 1.1-1.3x
  } else if (protest.status === 'active') {
    // Eventually protests disperse on their own
    // 30% chance per time period
    if (Math.random() < 0.30) {
      protest.status = 'dispersed' as ProtestStatusType;
      protest.resolved_at = new Date().toISOString();
    }
  }

  gameStore.updateProtest(protest.id, protest);
  return protest;
}

/**
 * Get all active protests (FORMING or ACTIVE status).
 *
 * Scalable: works with any number of protests.
 */
export function getActiveProtests(operatorId: string): ProtestRead[] {
  return gameStore.getAllProtests().filter(
    p => p.operator_id === operatorId && (p.status === 'forming' || p.status === 'active')
  );
}

/**
 * Generate narrative description of a protest.
 */
export function getProtestDescription(protest: ProtestRead): string {
  const sizeDesc = protest.size < 100 ? 'small' : protest.size < 500 ? 'moderate' : 'large';

  const statusDescMap: Record<ProtestStatusType, string> = {
    forming: 'is beginning to gather',
    active: 'is actively demonstrating',
    dispersed: 'has been dispersed',
    violent: 'turned violent',
    suppressed: 'was suppressed',
  };

  let desc = `A ${sizeDesc} protest in ${protest.neighborhood} ${statusDescMap[protest.status] || 'exists'}. `;
  desc += `Estimated ${protest.size} participants.`;

  if (protest.status === 'active') {
    desc += ' The demonstration is ongoing.';
  }

  if (protest.arrests > 0) {
    desc += ` ${protest.arrests} arrests have been made.`;
  }

  if (protest.casualties > 0) {
    desc += ` ${protest.casualties} casualties reported.`;
  }

  return desc;
}

/**
 * Calculate how a protest affects public metrics (if not suppressed).
 *
 * Active protests increase awareness and anger naturally.
 *
 * @returns Tuple of (awareness_change, anger_change)
 */
export function calculateProtestImpactOnMetrics(protest: ProtestRead): [number, number] {
  if (protest.status === 'forming' || protest.status === 'active') {
    // Active protests draw attention
    const sizeFactor = Math.floor(protest.size / 100); // Larger protests = more impact

    const awarenessChange = Math.min(5, 1 + sizeFactor);
    const angerChange = Math.min(3, 1 + Math.floor(sizeFactor / 2));

    return [awarenessChange, angerChange];
  }

  return [0, 0];
}

/**
 * Select which neighborhood a protest occurs in.
 *
 * Logic:
 * - If action targeted a citizen, protest near their location
 * - If action targeted a neighborhood (ICE raid), protest in that neighborhood
 * - Otherwise, random neighborhood
 *
 * Scalable: works with any number of neighborhoods.
 */
function selectProtestNeighborhood(action: SystemActionRead): string {
  // If action targeted a neighborhood directly
  if (action.target_neighborhood) {
    return action.target_neighborhood;
  }

  // If action targeted a citizen, find their neighborhood
  if (action.target_citizen_id) {
    const citizen = gameStore.getNPC(action.target_citizen_id);
    if (citizen) {
      // Find neighborhood containing citizen's location
      const neighborhoods = gameStore.getAllNeighborhoods();
      const neighborhood = neighborhoods.find(
        n =>
          n.bounds_min_x <= citizen.map_x &&
          n.bounds_max_x >= citizen.map_x &&
          n.bounds_min_y <= citizen.map_y &&
          n.bounds_max_y >= citizen.map_y
      );
      if (neighborhood) {
        return neighborhood.name;
      }
    }
  }

  // Fallback: random neighborhood
  const neighborhoods = gameStore.getAllNeighborhoods();
  if (neighborhoods.length > 0) {
    return neighborhoods[Math.floor(Math.random() * neighborhoods.length)].name;
  }

  return 'Downtown'; // Hardcoded fallback if no neighborhoods exist
}

/**
 * Calculate number of protesters based on anger and action severity.
 *
 * Higher anger + higher severity = larger protest.
 * Scalable: adjusts naturally if city population increases.
 */
function calculateProtestSize(anger: number, severity: number): number {
  // Base size: 50-500 people
  const baseSize = 50 + anger * 2 + severity * 30;

  // Add random variance (±30%)
  const variance = Math.random() * 0.6 + 0.7; // 0.7-1.3
  const size = Math.floor(baseSize * variance);

  return Math.max(50, Math.min(5000, size)); // Clamped 50-5000
}

/**
 * Determine if the state planted an inciting agent in the protest.
 *
 * This is automatic (not player choice) and sets up the INCITE_VIOLENCE
 * gamble later.
 *
 * 30% chance of planting agent.
 */
function shouldIncludeIncitingAgent(): boolean {
  return Math.random() < 0.30;
}

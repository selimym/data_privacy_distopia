/**
 * Action Execution Service - unified action handling for all action types.
 * Port of backend/src/datafusion/services/action_execution.py
 *
 * This is the central orchestrator that:
 * 1. Validates action availability
 * 2. Executes actions
 * 3. Triggers cascading events
 * 4. Updates all metrics
 * 5. Returns comprehensive results
 */

import { gameStore } from '../state/GameStore';
import { getSeverityScore } from './severity-scoring';
import type {
  NewActionType,
  ProtestStatusType,
} from '../types';

/**
 * Comprehensive result of executing an action.
 */
export interface ActionResult {
  action_id: string | null;
  success: boolean;
  severity: number;
  backlash_occurred: boolean;

  // Metrics changes
  awareness_change: number;
  anger_change: number;
  reluctance_change: number;

  // Triggered events
  news_articles_triggered: Array<{
    id: string;
    channel: string;
    headline: string;
  }>;
  protests_triggered: Array<{
    id: string;
    neighborhood: string;
    size: number;
  }>;
  exposure_event: {
    stage: number;
    message: string;
    operator_name: string;
  } | null;

  // Special outcomes
  detention_injury: boolean;
  termination_decision: {
    should_terminate: boolean;
    reason: string;
    ending_type: string;
  } | null;

  // Messages for player
  messages: string[];
  warnings: string[];
}

/**
 * Check if an action type is currently available.
 */
export interface ActionAvailability {
  available: boolean;
  reason: string;
}

/**
 * Check if an action type is currently available.
 *
 * Different actions have different availability conditions.
 * Modular design: easy to add new action types.
 */
export function checkActionAvailability(
  actionType: NewActionType,
  operatorId: string,
  targetCitizenId: string | null,
  targetProtestId: string | null,
  targetNewsChannelId: string | null
): ActionAvailability {
  // Citizen-targeted actions: Always available (if citizen exists)
  if (
    actionType === 'monitoring' ||
    actionType === 'restriction' ||
    actionType === 'intervention' ||
    actionType === 'detention'
  ) {
    if (!targetCitizenId) {
      return { available: false, reason: 'No citizen target specified' };
    }
    return { available: true, reason: '' };
  }

  // ICE_RAID: Available for neighborhood targeting (always available structurally)
  if (actionType === 'ice_raid') {
    return { available: true, reason: '' };
  }

  // HOSPITAL_ARREST: Only available if citizen is hospitalized from prior detention
  if (actionType === 'hospital_arrest') {
    if (!targetCitizenId) {
      return { available: false, reason: 'No citizen target specified' };
    }

    const citizen = gameStore.getNPC(targetCitizenId);
    if (!citizen || !citizen.is_hospitalized) {
      return {
        available: false,
        reason: 'Citizen is not hospitalized from prior detention',
      };
    }
    return { available: true, reason: '' };
  }

  // ARBITRARY_DETENTION: Available when targeting journalists/whistleblowers
  // For now, always available (refinement: could check citizen attributes)
  if (actionType === 'arbitrary_detention') {
    if (!targetCitizenId) {
      return { available: false, reason: 'No citizen target specified' };
    }
    return { available: true, reason: '' };
  }

  // Press-targeted actions: Available when news articles/channels exist
  if (actionType === 'press_ban' || actionType === 'pressure_firing') {
    if (!targetNewsChannelId) {
      return { available: false, reason: 'No news channel target specified' };
    }

    const channel = gameStore.getNewsChannel(targetNewsChannelId);
    if (!channel) {
      return { available: false, reason: 'News channel not found' };
    }
    if (channel.is_banned) {
      return { available: false, reason: 'Channel already banned' };
    }
    return { available: true, reason: '' };
  }

  // BOOK_BAN: Available when book publication events exist
  if (actionType === 'book_ban') {
    const allBooks = gameStore.getAllBookEvents();
    const pendingBooks = allBooks.filter(
      (book) => book.operator_id === operatorId && !book.was_banned
    );

    if (pendingBooks.length === 0) {
      return { available: false, reason: 'No pending book publications to ban' };
    }
    return { available: true, reason: '' };
  }

  // Protest-targeted actions: Available when protests are active
  if (actionType === 'declare_protest_illegal' || actionType === 'incite_violence') {
    if (!targetProtestId) {
      return { available: false, reason: 'No protest target specified' };
    }

    const protest = gameStore.getProtest(targetProtestId);
    if (!protest) {
      return { available: false, reason: 'Protest not found' };
    }
    if (protest.status !== 'forming' && protest.status !== 'active') {
      return { available: false, reason: 'Protest is not active' };
    }

    // INCITE_VIOLENCE requires planted agent
    if (actionType === 'incite_violence' && !protest.has_inciting_agent) {
      return {
        available: false,
        reason: 'No inciting agent available for this protest',
      };
    }

    return { available: true, reason: '' };
  }

  // Unknown action type
  return { available: false, reason: `Unknown action type: ${actionType}` };
}

/**
 * Execute a system action - the main orchestrator.
 *
 * This function ties together all the services and handles the complete
 * action execution pipeline.
 */
export function executeAction(
  operatorId: string,
  directiveId: string | null,
  actionType: NewActionType,
  justification: string,
  decisionTimeSeconds: number,
  wasHesitant: boolean,
  targetCitizenId: string | null = null,
  targetNeighborhood: string | null = null,
  targetNewsChannelId: string | null = null,
  targetProtestId: string | null = null
): ActionResult {
  const result: ActionResult = {
    action_id: null,
    success: true,
    severity: 0,
    backlash_occurred: false,
    awareness_change: 0,
    anger_change: 0,
    reluctance_change: 0,
    news_articles_triggered: [],
    protests_triggered: [],
    exposure_event: null,
    detention_injury: false,
    termination_decision: null,
    messages: [],
    warnings: [],
  };

  // 1. Validate action availability
  const availability = checkActionAvailability(
    actionType,
    operatorId,
    targetCitizenId,
    targetProtestId,
    targetNewsChannelId
  );

  if (!availability.available) {
    result.success = false;
    result.messages.push(`Action not available: ${availability.reason}`);
    return result;
  }

  // 2. Calculate severity and backlash probability
  const severity = getSeverityScore(actionType);
  result.severity = severity;

  const publicMetrics = gameStore.getPublicMetrics();
  const backlashProbability = calculateBacklashProbability(
    severity,
    publicMetrics?.international_awareness || 0,
    publicMetrics?.public_anger || 0
  );

  // Roll for backlash
  const triggeredBacklash = Math.random() < backlashProbability;

  // 3. Create the action record
  const actionId = generateId();
  const action = {
    id: actionId,
    operator_id: operatorId,
    directive_id: directiveId,
    action_type: actionType,
    target_citizen_id: targetCitizenId,
    target_neighborhood: targetNeighborhood,
    target_news_channel_id: targetNewsChannelId,
    target_protest_id: targetProtestId,
    severity_score: severity,
    backlash_probability: backlashProbability,
    was_successful: true,
    triggered_backlash: triggeredBacklash,
    backlash_description: triggeredBacklash ? 'Public backlash triggered' : null,
    justification,
    decision_time_seconds: decisionTimeSeconds,
    was_hesitant: wasHesitant,
    outcome_immediate: null,
    outcome_1_month: null,
    outcome_6_months: null,
    outcome_1_year: null,
    created_at: new Date().toISOString(),
  };

  gameStore.addSystemAction(action);

  result.action_id = actionId;
  result.backlash_occurred = triggeredBacklash;

  // 4. Execute action-specific logic
  executeActionSpecificLogic(
    action,
    targetCitizenId,
    targetNewsChannelId,
    targetProtestId,
    result
  );

  // 5. Update public metrics
  const metricsUpdate = updatePublicMetrics(
    operatorId,
    actionType,
    severity,
    triggeredBacklash
  );

  result.awareness_change = metricsUpdate.awareness_delta;
  result.anger_change = metricsUpdate.anger_delta;

  // Add tier event messages
  for (const tierEvent of metricsUpdate.tier_events) {
    result.messages.push(
      `🌍 ${tierEvent.metric_type.charAt(0).toUpperCase() + tierEvent.metric_type.slice(1)} Tier ${tierEvent.tier}: ${tierEvent.description}`
    );
  }

  // 6. Check for triggered events
  const triggeredEvents = checkTriggeredEvents(action, publicMetrics);

  for (const event of triggeredEvents) {
    if (event.event_type === 'news_article') {
      const article = generateTriggeredArticle(action, event.data.channel_id);
      result.news_articles_triggered.push({
        id: article.id,
        channel: event.data.channel_name,
        headline: article.headline,
      });
      result.messages.push(`📰 ${event.data.channel_name}: ${article.headline}`);
    } else if (event.event_type === 'protest') {
      const protest = triggerProtest(
        operatorId,
        action,
        publicMetrics?.public_anger || 0
      );
      result.protests_triggered.push({
        id: protest.id,
        neighborhood: protest.neighborhood,
        size: protest.size,
      });
      result.messages.push(
        `🪧 Protest forming in ${protest.neighborhood}: ~${protest.size} participants`
      );
    }
  }

  // 7. Update reluctance metrics
  const reluctanceUpdate = updateReluctanceScore(
    operatorId,
    true, // action_taken
    wasHesitant,
    severity
  );

  result.reluctance_change = reluctanceUpdate.delta;

  if (reluctanceUpdate.warning_message) {
    result.warnings.push(reluctanceUpdate.warning_message);
  }

  // 8. Check termination threshold
  const currentWeek = 1; // TODO: Get from operator/directive

  const termination = checkTerminationThreshold(operatorId, currentWeek);

  if (termination.should_terminate) {
    result.termination_decision = {
      should_terminate: true,
      reason: termination.reason,
      ending_type: termination.ending_type,
    };
    result.messages.push(`🚨 TERMINATION: ${termination.reason}`);
  }

  // 9. Track operator behavior
  let targetInfo = 'Unknown';
  if (targetCitizenId) {
    const citizen = gameStore.getNPC(targetCitizenId);
    if (citizen) {
      targetInfo = `${citizen.first_name} ${citizen.last_name}`;
    }
  } else if (targetNeighborhood) {
    targetInfo = targetNeighborhood;
  }

  trackDecision(operatorId, actionType, targetInfo, wasHesitant, decisionTimeSeconds);

  // 10. Check for exposure events
  const reluctanceMetrics = gameStore.getReluctanceMetrics();

  const exposure = triggerExposureEvent(
    operatorId,
    publicMetrics?.international_awareness || 0,
    reluctanceMetrics?.reluctance_score || 0
  );

  if (exposure) {
    result.exposure_event = {
      stage: exposure.stage,
      message: exposure.message,
      operator_name: exposure.operator_name,
    };
    result.messages.push(`📢 EXPOSURE EVENT (Stage ${exposure.stage})`);
  }

  return result;
}

/**
 * Execute action-type-specific logic.
 *
 * Modular design: each action type has its own handler.
 */
function executeActionSpecificLogic(
  action: any,
  targetCitizenId: string | null,
  targetNewsChannelId: string | null,
  targetProtestId: string | null,
  result: ActionResult
): void {
  // DETENTION: Check for injury
  if (action.action_type === 'detention' && targetCitizenId) {
    const citizen = gameStore.getNPC(targetCitizenId);
    if (citizen) {
      const injuryResult = checkDetentionInjury(action, citizen);
      if (injuryResult.injury_occurred) {
        result.detention_injury = true;
        result.messages.push(
          '⚕️ Citizen injured during detention and hospitalized. HOSPITAL_ARREST now available.'
        );
      }
    }
  }

  // Press suppression: Execute the gamble
  if (
    (action.action_type === 'press_ban' || action.action_type === 'pressure_firing') &&
    targetNewsChannelId
  ) {
    const suppressionResult = suppressNewsChannel(
      action.operator_id,
      targetNewsChannelId,
      action.action_type
    );

    // These changes are ADDITIONAL to the normal metric updates
    result.awareness_change += suppressionResult.awareness_change;
    result.anger_change += suppressionResult.anger_change;

    if (!suppressionResult.success) {
      result.messages.push(
        '🚨 STREISAND EFFECT: Suppression attempt backfired! Massive international attention.'
      );
    } else {
      result.messages.push(
        `✓ ${action.action_type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} successful`
      );
    }
  }

  // Protest suppression: Execute appropriate method
  if (action.action_type === 'declare_protest_illegal' && targetProtestId) {
    const suppressionResult = suppressProtestLegal(targetProtestId);
    result.awareness_change += suppressionResult.awareness_change;
    result.anger_change += suppressionResult.anger_change;
    result.messages.push(
      `Protest declared illegal and dispersed. ${suppressionResult.arrests} arrests.`
    );
  }

  if (action.action_type === 'incite_violence' && targetProtestId) {
    const gambleResult = suppressProtestViolence(targetProtestId);
    result.awareness_change += gambleResult.awareness_change;
    result.anger_change += gambleResult.anger_change;

    if (!gambleResult.success) {
      // Catastrophic failure
      if (gambleResult.discovery_message) {
        result.messages.push(gambleResult.discovery_message);
      }
      result.warnings.push('🚨 INCITING AGENT DISCOVERED: Catastrophic backlash!');
    } else {
      result.messages.push(
        `Protest turned violent. ${gambleResult.casualties} casualties, ${gambleResult.arrests} arrests. Blame placed on protesters.`
      );
    }
  }
}

/**
 * Handle "no action" decision (operator refuses to flag citizen).
 *
 * This increases reluctance and can lead to termination.
 */
export function submitNoAction(
  operatorId: string,
  _citizenId: string,
  _justification: string,
  decisionTimeSeconds: number
): ActionResult {
  const result: ActionResult = {
    action_id: null,
    success: true,
    severity: 0,
    backlash_occurred: false,
    awareness_change: 0,
    anger_change: 0,
    reluctance_change: 0,
    news_articles_triggered: [],
    protests_triggered: [],
    exposure_event: null,
    detention_injury: false,
    termination_decision: null,
    messages: [],
    warnings: [],
  };

  const wasHesitant = decisionTimeSeconds > 30;

  // Update reluctance (no action taken)
  const reluctanceUpdate = updateReluctanceScore(
    operatorId,
    false, // action_taken
    wasHesitant,
    0 // action_severity
  );

  result.reluctance_change = reluctanceUpdate.delta;
  result.messages.push(`No action taken. Reluctance +${reluctanceUpdate.delta}`);

  if (reluctanceUpdate.warning_message) {
    result.warnings.push(reluctanceUpdate.warning_message);
  }

  // Check termination
  const currentWeek = 1; // TODO: Get from operator

  const termination = checkTerminationThreshold(operatorId, currentWeek);

  if (termination.should_terminate) {
    result.termination_decision = {
      should_terminate: true,
      reason: termination.reason,
      ending_type: termination.ending_type,
    };
    result.messages.push(`🚨 TERMINATION: ${termination.reason}`);
  }

  return result;
}

// =============================================================================
// Helper Functions (Stubs for now - need to implement related services)
// =============================================================================

function calculateBacklashProbability(
  severity: number,
  awareness: number,
  anger: number
): number {
  // Base probability from severity
  const baseProbability = severity / 200.0; // 0.0 - 0.5

  // Awareness multiplier (0% awareness = 0.5x, 100% awareness = 2.0x)
  const awarenessMultiplier = 0.5 + (awareness / 100.0) * 1.5;

  // Anger multiplier (0% anger = 0.5x, 100% anger = 2.0x)
  const angerMultiplier = 0.5 + (anger / 100.0) * 1.5;

  // Combined probability
  const probability = baseProbability * awarenessMultiplier * angerMultiplier;

  return Math.min(probability, 0.95); // Cap at 95%
}

interface MetricsUpdate {
  awareness_delta: number;
  anger_delta: number;
  tier_events: Array<{
    metric_type: string;
    tier: number;
    threshold: number;
    description: string;
  }>;
}

function updatePublicMetrics(
  _operatorId: string,
  _actionType: NewActionType,
  severity: number,
  triggeredBacklash: boolean
): MetricsUpdate {
  // Stub implementation - would call public-metrics service
  const awarenessChange = triggeredBacklash ? Math.floor(severity / 2) : 0;
  const angerChange = Math.floor(severity / 3);

  return {
    awareness_delta: awarenessChange,
    anger_delta: angerChange,
    tier_events: [],
  };
}

function checkTriggeredEvents(_action: any, _publicMetrics: any): any[] {
  // Stub implementation - would call event-generation service
  return [];
}

function generateTriggeredArticle(_action: any, _channelId: string): any {
  // Stub implementation - would call news-system service
  return {
    id: generateId(),
    headline: 'Breaking: Government Surveillance Exposed',
    channel_name: 'Independent News Network',
  };
}

function triggerProtest(_operatorId: string, _action: any, _angerLevel: number): any {
  // Stub implementation - would call protest-system service
  return {
    id: generateId(),
    neighborhood: 'Downtown',
    size: 500,
    status: 'forming' as ProtestStatusType,
  };
}

interface ReluctanceUpdate {
  delta: number;
  warning_message: string | null;
}

function updateReluctanceScore(
  _operatorId: string,
  actionTaken: boolean,
  wasHesitant: boolean,
  _actionSeverity: number
): ReluctanceUpdate {
  // Stub implementation - would call reluctance-tracking service
  let delta = 0;

  if (!actionTaken) {
    delta = 5; // No action increases reluctance
  } else if (wasHesitant) {
    delta = 2; // Hesitation increases reluctance slightly
  } else {
    delta = -1; // Compliant action reduces reluctance
  }

  return {
    delta,
    warning_message: null,
  };
}

interface TerminationDecision {
  should_terminate: boolean;
  reason: string;
  ending_type: string;
}

function checkTerminationThreshold(
  _operatorId: string,
  _currentWeek: number
): TerminationDecision {
  // Stub implementation - would call reluctance-tracking service
  return {
    should_terminate: false,
    reason: '',
    ending_type: '',
  };
}

function trackDecision(
  operatorId: string,
  actionType: NewActionType,
  targetInfo: string,
  wasHesitant: boolean,
  decisionTimeSeconds: number
): void {
  // Stub implementation - would call operator-tracker service
  // For now, just log the decision
  console.log(
    `[ActionExecution] Operator ${operatorId} ${actionType} on ${targetInfo} (${decisionTimeSeconds}s, hesitant: ${wasHesitant})`
  );
}

interface ExposureEvent {
  stage: number;
  message: string;
  operator_name: string;
}

function triggerExposureEvent(
  _operatorId: string,
  _awareness: number,
  _reluctance: number
): ExposureEvent | null {
  // Stub implementation - would call operator-tracker service
  return null;
}

function checkDetentionInjury(_action: any, citizen: any): { injury_occurred: boolean } {
  // Stub implementation - would call event-generation service
  // 15% chance of injury during detention
  const injuryOccurred = Math.random() < 0.15;

  if (injuryOccurred) {
    // Mark citizen as hospitalized
    gameStore.updateNPC(citizen.id, { is_hospitalized: true });
  }

  return { injury_occurred: injuryOccurred };
}

function suppressNewsChannel(
  _operatorId: string,
  channelId: string,
  _actionType: NewActionType
): { success: boolean; awareness_change: number; anger_change: number } {
  // Stub implementation - would call news-system service
  // 30% chance of Streisand effect
  const success = Math.random() > 0.3;

  if (success) {
    // Mark channel as banned
    gameStore.updateNewsChannel(channelId, { is_banned: true });
    return { success: true, awareness_change: 5, anger_change: 10 };
  } else {
    // Streisand effect - massive backfire
    return { success: false, awareness_change: 30, anger_change: 25 };
  }
}

function suppressProtestLegal(
  protestId: string
): { awareness_change: number; anger_change: number; arrests: number } {
  // Stub implementation - would call protest-system service
  const arrests = Math.floor(Math.random() * 50) + 10;

  gameStore.updateProtest(protestId, {
    status: 'suppressed' as ProtestStatusType,
    arrests,
  });

  return {
    awareness_change: 10,
    anger_change: 15,
    arrests,
  };
}

function suppressProtestViolence(protestId: string): {
  success: boolean;
  awareness_change: number;
  anger_change: number;
  casualties: number;
  arrests: number;
  discovery_message: string | null;
} {
  // Stub implementation - would call protest-system service
  // 40% chance of agent discovery (catastrophic failure)
  const success = Math.random() > 0.4;

  if (success) {
    const casualties = Math.floor(Math.random() * 10) + 5;
    const arrests = Math.floor(Math.random() * 100) + 50;

    gameStore.updateProtest(protestId, {
      status: 'violent' as ProtestStatusType,
      casualties,
      arrests,
    });

    return {
      success: true,
      awareness_change: 15,
      anger_change: 20,
      casualties,
      arrests,
      discovery_message: null,
    };
  } else {
    // Agent discovered - massive backlash
    gameStore.updateProtest(protestId, {
      status: 'violent' as ProtestStatusType,
      inciting_agent_discovered: true,
    });

    return {
      success: false,
      awareness_change: 50,
      anger_change: 60,
      casualties: 0,
      arrests: 0,
      discovery_message:
        'CATASTROPHIC FAILURE: Inciting agent exposed by independent journalists. International condemnation imminent.',
    };
  }
}

function generateId(): string {
  // Simple UUID v4 generator for client-side
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

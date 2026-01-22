/**
 * Game Orchestrator Service - High-level facade for fat client architecture.
 *
 * This service provides a clean API that matches the old backend API endpoints,
 * but orchestrates local services and GameStore operations instead.
 *
 * The SystemState will call these functions instead of making HTTP requests.
 */

import { gameStore } from '../state/GameStore';
import { riskScorer } from './risk-scoring';
import { executeAction as executeActionService, submitNoAction as submitNoActionService } from './action-execution';
import { endingCalculator } from './ending-calculator';
import {
  generateFullPopulation,
  loadAllReferenceData,
  type PopulationData,
  hasPopulationInLocalStorage,
  loadPopulationFromLocalStorage,
  savePopulationToLocalStorage,
  clearPopulationFromLocalStorage
} from '../generators';
import type {
  SystemDashboard,
  CaseOverview,
  FullCitizenFile,
  FlagType,
  DirectiveRead,
  OperatorStatus,
  FlagSummary,
  PublicMetricsRead,
  ReluctanceMetricsRead,
  NewsArticleRead,
  ProtestRead,
  ExposureRiskRead,
  EndingResult,
  CitizenFlagRead,
  FlagResult,
  NoActionResult,
} from '../types';

// =============================================================================
// Population & Initialization
// =============================================================================

export interface InitializeGameOptions {
  numCitizens?: number;
  seed?: number;
  forceRegenerate?: boolean;
}

export interface InitializationProgress {
  stage: string;
  progress: number; // 0-100
  message: string;
}

/**
 * Initialize the game with a new population or load from localStorage.
 *
 * @param options - Configuration for game initialization
 * @param onProgress - Optional callback for progress updates
 * @returns Operator ID
 */
export async function initializeGame(
  options: InitializeGameOptions = {},
  onProgress?: (progress: InitializationProgress) => void
): Promise<string> {
  const { numCitizens = 50, seed, forceRegenerate = false } = options;

  // Check if we have a saved game
  if (!forceRegenerate && hasPopulationInLocalStorage()) {
    onProgress?.({
      stage: 'loading',
      progress: 50,
      message: 'Loading saved game data...',
    });

    const savedPopulation = loadPopulationFromLocalStorage();
    if (savedPopulation) {
      await loadPopulationIntoGameStore(savedPopulation);
      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Game loaded successfully',
      });
      return savedPopulation.operator.id;
    }
  }

  // Generate new population
  onProgress?.({
    stage: 'loading_reference',
    progress: 10,
    message: 'Loading reference data...',
  });

  await loadAllReferenceData();

  onProgress?.({
    stage: 'generating',
    progress: 30,
    message: `Generating ${numCitizens} citizens...`,
  });

  const population = await generateFullPopulation(numCitizens, seed);

  onProgress?.({
    stage: 'initializing',
    progress: 70,
    message: 'Initializing game services...',
  });

  await loadPopulationIntoGameStore(population);

  // Initialize risk scorer
  await riskScorer.initialize();

  onProgress?.({
    stage: 'saving',
    progress: 90,
    message: 'Saving game data...',
  });

  savePopulationToLocalStorage(population);

  onProgress?.({
    stage: 'complete',
    progress: 100,
    message: 'Game initialized successfully',
  });

  return population.operator.id;
}

/**
 * Load population data into GameStore.
 */
async function loadPopulationIntoGameStore(population: PopulationData): Promise<void> {
  // Clear existing data
  gameStore.clear();

  // Load operator
  gameStore.setOperator({
    id: population.operator.id,
    session_id: population.operator.employee_id, // Using employee_id as session_id
    operator_code: population.operator.name, // Using name as operator_code
    shift_start: population.operator.shift_start,
    total_flags_submitted: 0,
    total_reviews_completed: 0,
    compliance_score: 100,
    hesitation_incidents: 0,
    current_directive_id: population.directives[0].id,
    status: 'active',
    current_time_period: 'immediate',
    created_at: population.generatedAt,
    updated_at: population.generatedAt,
  });

  // Load directives (convert DirectiveData to DirectiveRead format)
  for (const directive of population.directives) {
    gameStore.addDirective({
      ...directive,
      week_number: 1, // Will be updated as game progresses
      directive_key: directive.id,
      internal_memo: directive.description,
      required_domains: directive.target_types,
      flag_quota: 3, // Default quota
      min_flags_required: 3, // Default quota
      time_limit_hours: null,
      moral_weight: 1,
      content_rating: 'mature',
    });
  }

  // Load metrics
  gameStore.setPublicMetrics({
    international_awareness: 0,
    public_anger: 0,
    awareness_tier: 0,
    anger_tier: 0,
    created_at: population.generatedAt,
    updated_at: population.generatedAt,
  });

  gameStore.setReluctanceMetrics({
    reluctance_score: 0,
    no_action_count: 0,
    hesitation_count: 0,
    actions_taken: 0,
    actions_required: 0,
    quota_shortfall: 0,
    warnings_received: 0,
    is_under_review: false,
    total_no_actions: 0,
    total_hesitations: 0,
    stage: 0,
    warning_issued: false,
    created_at: population.generatedAt,
    updated_at: population.generatedAt,
  });

  // Load neighborhoods (convert NeighborhoodData to NeighborhoodRead format)
  for (const neighborhood of population.neighborhoods) {
    gameStore.addNeighborhood({
      ...neighborhood,
      id: `neighborhood-${neighborhood.name.toLowerCase().replace(/\s+/g, '-')}`,
      created_at: population.generatedAt,
    });
  }

  // Load news channels (convert NewsChannelData to NewsChannelRead format)
  for (const channel of population.newsChannels) {
    gameStore.addNewsChannel({
      ...channel,
      id: `channel-${channel.name.toLowerCase().replace(/\s+/g, '-')}`,
      banned_at: null,
      created_at: population.generatedAt,
    });
  }

  // Load citizens and their data
  for (const citizen of population.citizens) {
    // Add NPC
    // @ts-expect-error - NPCRead type is missing many fields that exist in IdentityData
    gameStore.addNPC({
      ...citizen.identity,
      is_hospitalized: false,
      cached_risk_score: null,
      risk_score_updated_at: null,
      created_at: population.generatedAt,
    });

    // Add health record
    // @ts-expect-error - Type mismatch between HealthRecordData and HealthRecord (missing id, timestamps)
    gameStore.addHealthRecord({
      ...citizen.health,
      id: `health-${citizen.identity.npc_id}`,
      created_at: population.generatedAt,
      updated_at: population.generatedAt,
    });

    // Add finance record
    // @ts-expect-error - Type mismatch between FinanceRecordData and FinanceRecord (missing id, timestamps)
    gameStore.addFinanceRecord({
      ...citizen.finance,
      id: `finance-${citizen.identity.npc_id}`,
      created_at: population.generatedAt,
      updated_at: population.generatedAt,
    });

    // Add judicial record
    // @ts-expect-error - Type mismatch between JudicialRecordData and JudicialRecord (missing id, timestamps)
    gameStore.addJudicialRecord({
      ...citizen.judicial,
      id: `judicial-${citizen.identity.npc_id}`,
      created_at: population.generatedAt,
      updated_at: population.generatedAt,
    });

    // Add location record
    // @ts-expect-error - Type mismatch between LocationRecordData and LocationRecord (missing id, timestamps)
    gameStore.addLocationRecord({
      ...citizen.location,
      id: `location-${citizen.identity.npc_id}`,
      created_at: population.generatedAt,
      updated_at: population.generatedAt,
    });

    // Add social record
    // @ts-expect-error - Type mismatch between SocialMediaRecordData and SocialMediaRecord (missing id, timestamps)
    gameStore.addSocialRecord({
      ...citizen.social,
      id: `social-${citizen.identity.npc_id}`,
      created_at: population.generatedAt,
      updated_at: population.generatedAt,
    });

    // Add messages
    for (const message of citizen.messages.messages) {
      gameStore.addMessage({
        ...message,
        id: `msg-${citizen.identity.npc_id}-${message.timestamp}`,
        npc_id: citizen.identity.npc_id,
      });
    }
  }

  console.log('[GameOrchestrator] Population loaded into GameStore:', gameStore.getStats());
}

/**
 * Reset the entire game state.
 */
export function resetGame(): void {
  gameStore.clear();
  clearPopulationFromLocalStorage();
}

// =============================================================================
// Dashboard & Cases
// =============================================================================

/**
 * Get dashboard data for the operator.
 */
export function getDashboardData(operatorId: string): SystemDashboard {
  const operator = gameStore.getOperator();
  if (!operator || operator.id !== operatorId) {
    throw new Error('Operator not found');
  }

  const currentDirective = operator.current_directive_id
    ? gameStore.getDirective(operator.current_directive_id)
    : null;

  if (!currentDirective) {
    throw new Error('No active directive');
  }

  // Get operator status
  const operatorStatus: OperatorStatus = {
    operator_id: operator.id,
    operator_code: operator.operator_code,
    status: operator.status,
    compliance_score: operator.compliance_score,
    current_quota_progress: `${operator.total_flags_submitted}/${currentDirective.min_flags_required || 3}`,
    total_flags_submitted: operator.total_flags_submitted,
    total_reviews_completed: operator.total_reviews_completed,
    hesitation_incidents: operator.hesitation_incidents,
    warnings: [],
  };

  // @ts-expect-error - SystemDashboard type expects additional properties, but this subset works
  return {
    operator: operatorStatus,
    directive: currentDirective,
  };
}

/**
 * Get pending cases (citizens to review).
 */
export function getCases(operatorId: string, limit: number = 50): CaseOverview[] {
  const operator = gameStore.getOperator();
  if (!operator || operator.id !== operatorId) {
    throw new Error('Operator not found');
  }

  // Get all citizens
  const allCitizens = gameStore.getAllNPCs();

  // Calculate risk scores and create case overviews
  const cases: CaseOverview[] = [];

  for (const citizen of allCitizens) {
    // Calculate risk score
    const riskAssessment = riskScorer.calculateRiskScore(citizen.id);

    cases.push({
      npc_id: citizen.id,
      name: `${citizen.first_name} ${citizen.last_name}`,
      age: (citizen as any).age,
      // @ts-expect-error
      occupation: (citizen as any).occupation,
      risk_score: riskAssessment.risk_score,
      risk_level: riskAssessment.risk_level,
      contributing_factors: riskAssessment.contributing_factors.map(f => f.factor_name),
      last_updated: citizen.risk_score_updated_at || citizen.created_at,
    });
  }

  // Sort by risk score (highest first)
  cases.sort((a, b) => b.risk_score - a.risk_score);

  // Return top N cases
  return cases.slice(0, limit);
}

/**
 * Get dashboard and cases in a single call (optimization).
 */
export function getDashboardWithCases(
  operatorId: string,
  caseLimit: number = 50
): { dashboard: SystemDashboard; cases: CaseOverview[] } {
  return {
    dashboard: getDashboardData(operatorId),
    cases: getCases(operatorId, caseLimit),
  };
}

/**
 * Get full citizen file for detailed review.
 */
export function getCitizenFile(operatorId: string, citizenId: string): FullCitizenFile {
  const operator = gameStore.getOperator();
  if (!operator || operator.id !== operatorId) {
    throw new Error('Operator not found');
  }

  const citizen = gameStore.getNPC(citizenId);
  if (!citizen) {
    throw new Error('Citizen not found');
  }

  // Get all domain data
  const health = gameStore.getHealthRecordByNpcId(citizenId);
  const finance = gameStore.getFinanceRecordByNpcId(citizenId);
  const judicial = gameStore.getJudicialRecordByNpcId(citizenId);
  const location = gameStore.getLocationRecordByNpcId(citizenId);
  const social = gameStore.getSocialRecordByNpcId(citizenId);
  const messages = gameStore.getMessagesByNpcId(citizenId);

  // Calculate risk assessment
  const riskAssessment = riskScorer.calculateRiskScore(citizenId);

  // Get flags for this citizen
  const flags = gameStore.getFlagsByNpcId(citizenId);

  // Calculate age from date of birth
  const dob = new Date(citizen.date_of_birth);
  const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

  return {
    identity: {
      id: citizen.id,
      first_name: citizen.first_name,
      last_name: citizen.last_name,
      date_of_birth: citizen.date_of_birth,
      age: age,
      ssn: citizen.ssn,
      street_address: citizen.street_address,
      city: citizen.city,
      state: citizen.state,
      zip_code: citizen.zip_code,
      map_x: citizen.map_x,
      map_y: citizen.map_y,
    },
    risk_assessment: riskAssessment,
    domains: {
      health: (health || {}) as Record<string, unknown>,
      finance: (finance || {}) as Record<string, unknown>,
      judicial: (judicial || {}) as Record<string, unknown>,
      location: (location || {}) as Record<string, unknown>,
      social: (social || {}) as Record<string, unknown>,
    },
    messages: messages,
    correlation_alerts: riskAssessment.correlation_alerts,
    recommended_actions: riskAssessment.recommended_actions,
    flag_history: flags,
  };
}

// =============================================================================
// Actions (Flagging)
// =============================================================================

export interface FlagRequest {
  operator_id: string;
  citizen_id: string;
  flag_type: FlagType;
  contributing_factors: string[];
  justification: string;
  decision_time_seconds: number;
}

/**
 * Submit a flag against a citizen.
 */
export function submitFlag(request: FlagRequest): FlagResult {
  const operator = gameStore.getOperator();
  if (!operator || operator.id !== request.operator_id) {
    throw new Error('Operator not found');
  }

  const citizen = gameStore.getNPC(request.citizen_id);
  if (!citizen) {
    throw new Error('Citizen not found');
  }

  const wasHesitant = request.decision_time_seconds > 30;

  // Map old flag types to new action types
  const actionTypeMap: Record<FlagType, any> = {
    monitoring: 'monitoring',
    restriction: 'restriction',
    intervention: 'intervention',
    detention: 'detention',
  };

  const actionType = actionTypeMap[request.flag_type];

  // Execute the action
  const result = executeActionService(
    request.operator_id,
    operator.current_directive_id,
    actionType,
    request.justification,
    request.decision_time_seconds,
    wasHesitant,
    request.citizen_id
  );

  // Update operator state
  gameStore.updateOperator({
    total_flags_submitted: operator.total_flags_submitted + 1,
    compliance_score: Math.max(0, Math.min(100, operator.compliance_score + 2)), // Small bonus for compliance
    updated_at: new Date().toISOString(),
  });

  // Create flag record (for backward compatibility)
  const flagId = result.action_id || generateId();
  const flag: CitizenFlagRead = {
    id: flagId,
    operator_id: request.operator_id,
    citizen_id: request.citizen_id,
    directive_id: operator.current_directive_id || '',
    flag_type: request.flag_type,
    risk_score_at_flag: citizen.cached_risk_score || 0,
    justification: request.justification,
    contributing_factors: request.contributing_factors,
    decision_time_seconds: request.decision_time_seconds,
    was_hesitant: wasHesitant,
    outcome: 'actioned',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    actioned_at: new Date().toISOString(),
    action_type: request.flag_type,
    action_justification: request.justification,
  };

  gameStore.addFlag(flag);
  gameStore.linkFlagToNpc(flagId, request.citizen_id);

  // Save state
  gameStore.save();

  const updatedOperator = gameStore.getOperator()!;
  const currentDirective = gameStore.getDirective(updatedOperator.current_directive_id!)!;

  // Get citizen name for result
  const citizenName = `${citizen.first_name} ${citizen.last_name}`;

  return {
    flag_id: flagId,
    citizen_id: request.citizen_id,
    citizen_name: citizenName,
    flag_type: request.flag_type,
    immediate_outcome: result.messages[0] || 'Citizen flagged successfully',
    compliance_score: updatedOperator.compliance_score,
    quota_progress: `${updatedOperator.total_flags_submitted}/${currentDirective.min_flags_required || 3}`,
    warnings: result.warnings,
    metrics_delta: {
      compliance_change: 2,
      quota_progress: `${updatedOperator.total_flags_submitted}/${currentDirective.min_flags_required || 3}`,
      hesitation_flagged: wasHesitant,
    },
  };
}

export interface NoActionRequest {
  operator_id: string;
  citizen_id: string;
  justification: string;
  decision_time_seconds: number;
}

/**
 * Submit a no-action decision (refuse to flag).
 */
export function submitNoAction(request: NoActionRequest): NoActionResult {
  const operator = gameStore.getOperator();
  if (!operator || operator.id !== request.operator_id) {
    throw new Error('Operator not found');
  }

  // Execute no-action logic
  const result = submitNoActionService(
    request.operator_id,
    request.citizen_id,
    request.justification,
    request.decision_time_seconds
  );

  // Update operator compliance (penalize for not flagging)
  const complianceImpact = -5;
  gameStore.updateOperator({
    total_reviews_completed: operator.total_reviews_completed + 1,
    compliance_score: Math.max(0, operator.compliance_score + complianceImpact),
    updated_at: new Date().toISOString(),
  });

  // Save state
  gameStore.save();

  const reluctanceMetrics = gameStore.getReluctanceMetrics();

  return {
    logged: true,
    compliance_impact: complianceImpact,
    cumulative_no_actions: reluctanceMetrics?.no_action_count || 0,
    warning: result.warnings.length > 0 ? result.warnings[0] : null,
  };
}

// =============================================================================
// Directives & Time Progression
// =============================================================================

/**
 * Advance to the next directive.
 */
export function advanceDirective(operatorId: string): DirectiveRead {
  const operator = gameStore.getOperator();
  if (!operator || operator.id !== operatorId) {
    throw new Error('Operator not found');
  }

  const currentDirective = operator.current_directive_id
    ? gameStore.getDirective(operator.current_directive_id)
    : null;

  if (!currentDirective) {
    throw new Error('No current directive');
  }

  // Check if quota is met
  const minRequired = currentDirective.min_flags_required || 3;
  if (operator.total_flags_submitted < minRequired) {
    throw new Error('Quota not met - cannot advance directive');
  }

  // Get next directive
  const nextWeek = currentDirective.week_number + 1;
  const nextDirective = gameStore.getDirectiveByWeek(nextWeek);

  if (!nextDirective) {
    throw new Error('No more directives available');
  }

  // Update operator
  gameStore.updateOperator({
    current_directive_id: nextDirective.id,
    updated_at: new Date().toISOString(),
  });

  gameStore.setCurrentWeek(nextWeek);
  gameStore.save();

  return nextDirective;
}

// =============================================================================
// Metrics & Ending
// =============================================================================

/**
 * Get public metrics (awareness, anger).
 */
export function getPublicMetrics(operatorId: string): PublicMetricsRead {
  const operator = gameStore.getOperator();
  if (!operator || operator.id !== operatorId) {
    throw new Error('Operator not found');
  }

  const metrics = gameStore.getPublicMetrics();
  if (!metrics) {
    // Return default metrics if none exist
    return {
      international_awareness: 0,
      public_anger: 0,
      awareness_tier: 0,
      anger_tier: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  return metrics;
}

/**
 * Get reluctance metrics.
 */
export function getReluctanceMetrics(operatorId: string): ReluctanceMetricsRead {
  const operator = gameStore.getOperator();
  if (!operator || operator.id !== operatorId) {
    throw new Error('Operator not found');
  }

  const metrics = gameStore.getReluctanceMetrics();
  if (!metrics) {
    // Return default metrics if none exist
    // @ts-expect-error - operator_id field not in type but needed
    return {
      reluctance_score: 0,
      total_no_actions: 0,
      total_hesitations: 0,
      stage: 0,
      warning_issued: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  return metrics;
}

/**
 * Get recent news articles.
 */
export function getRecentNews(operatorId: string, limit: number = 10): NewsArticleRead[] {
  const operator = gameStore.getOperator();
  if (!operator || operator.id !== operatorId) {
    throw new Error('Operator not found');
  }

  const articles = gameStore.getAllNewsArticles();

  // Sort by date (most recent first)
  articles.sort((a: any, b: any) =>
    new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime()
  );

  return articles.slice(0, limit);
}

/**
 * Get active protests.
 */
export function getActiveProtests(operatorId: string): ProtestRead[] {
  const operator = gameStore.getOperator();
  if (!operator || operator.id !== operatorId) {
    throw new Error('Operator not found');
  }

  return gameStore.getActiveProtests();
}

/**
 * Get exposure risk status.
 */
export function getExposureRisk(operatorId: string): ExposureRiskRead {
  const operator = gameStore.getOperator();
  if (!operator || operator.id !== operatorId) {
    throw new Error('Operator not found');
  }

  const operatorData = gameStore.getOperatorData();

  return {
    exposure_stage: operatorData?.exposure_stage || 0,
    // @ts-expect-error - is_exposed field may not exist on OperatorDataRead
    is_exposed: (operatorData as any)?.is_exposed || false,
    risk_level: 'low',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Get operator history (all flags submitted).
 */
export function getOperatorHistory(operatorId: string): FlagSummary[] {
  const operator = gameStore.getOperator();
  if (!operator || operator.id !== operatorId) {
    throw new Error('Operator not found');
  }

  const flags = gameStore.getAllFlags();

  return flags.map((flag: any) => ({
    flag_id: flag.id,
    citizen_name: getNPCName(flag.citizen_id || flag.npc_id),
    flag_type: flag.flag_type,
    created_at: flag.created_at,
    outcome: 'pending',
    one_line_summary: `${flag.flag_type} flag`,
  }));
}

/**
 * Calculate and return the game ending.
 */
export function getEnding(operatorId: string): EndingResult {
  const operator = gameStore.getOperator();
  if (!operator || operator.id !== operatorId) {
    throw new Error('Operator not found');
  }

  // @ts-expect-error - calculateEnding return type mismatch
  return endingCalculator.calculateEnding(operatorId);
}

// =============================================================================
// Helper Functions
// =============================================================================

function getNPCName(npcId: string): string {
  const npc = gameStore.getNPC(npcId);
  return npc ? `${npc.first_name} ${npc.last_name}` : 'Unknown';
}

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

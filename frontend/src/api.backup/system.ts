/**
 * System Mode API client.
 * Handles all communication with the surveillance operator backend.
 */

import type {
  CaseOverview,
  CitizenOutcome,
  DirectiveRead,
  EndingResult,
  FlagResult,
  FlagSubmission,
  FlagSummary,
  FullCitizenFile,
  NoActionResult,
  NoActionSubmission,
  OperatorRiskAssessment,
  SystemDashboard,
  SystemDashboardWithCases,
  SystemStartResponse,
  PublicMetricsRead,
  ReluctanceMetricsRead,
  NewsArticleRead,
  ProtestRead,
  ExposureRiskRead,
  OperatorDataRead,
  SystemActionRequest,
  ActionResultRead,
  AvailableActionsRead,
} from '../types/system';

const API_BASE = '/api';

/**
 * Parse error response safely
 */
async function parseErrorResponse(response: Response, fallback: string): Promise<string> {
  try {
    const text = await response.text();
    if (!text) return fallback;
    const json = JSON.parse(text);
    return json.detail || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Start a new System Mode session.
 */
export async function startSystemMode(sessionId: string): Promise<SystemStartResponse> {
  const response = await fetch(`${API_BASE}/system/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  });

  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Failed to start System Mode');
    throw new Error(message);
  }

  return response.json();
}

/**
 * Get the operator dashboard.
 */
export async function getDashboard(operatorId: string): Promise<SystemDashboard> {
  const response = await fetch(`${API_BASE}/system/dashboard?operator_id=${operatorId}`);

  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Failed to load dashboard');
    throw new Error(message);
  }

  return response.json();
}

/**
 * Get combined dashboard and cases data in a single request (optimized).
 */
export async function getDashboardWithCases(
  operatorId: string,
  caseLimit: number = 20,
  caseOffset: number = 0
): Promise<SystemDashboardWithCases> {
  const params = new URLSearchParams({
    operator_id: operatorId,
    case_limit: caseLimit.toString(),
    case_offset: caseOffset.toString(),
  });

  const response = await fetch(`${API_BASE}/system/dashboard-with-cases?${params}`);

  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Failed to load dashboard and cases');
    throw new Error(message);
  }

  return response.json();
}

/**
 * Get the current directive.
 */
export async function getCurrentDirective(operatorId: string): Promise<DirectiveRead> {
  const response = await fetch(`${API_BASE}/system/directive/current?operator_id=${operatorId}`);

  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Failed to load directive');
    throw new Error(message);
  }

  return response.json();
}

/**
 * Advance to the next directive (if quota met).
 */
export async function advanceDirective(operatorId: string): Promise<DirectiveRead> {
  const response = await fetch(`${API_BASE}/system/directive/advance?operator_id=${operatorId}`, {
    method: 'POST',
  });

  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Cannot advance directive');
    throw new Error(message);
  }

  return response.json();
}

/**
 * Get list of cases sorted by risk score.
 */
export async function getCases(
  operatorId: string,
  limit: number = 20,
  offset: number = 0
): Promise<CaseOverview[]> {
  const params = new URLSearchParams({
    operator_id: operatorId,
    limit: limit.toString(),
    offset: offset.toString(),
  });

  const response = await fetch(`${API_BASE}/system/cases?${params}`);

  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Failed to load cases');
    throw new Error(message);
  }

  return response.json();
}

/**
 * Get full citizen file for a specific NPC.
 */
export async function getCitizenFile(
  operatorId: string,
  npcId: string
): Promise<FullCitizenFile> {
  const response = await fetch(
    `${API_BASE}/system/cases/${npcId}?operator_id=${operatorId}`
  );

  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Failed to load citizen file');
    throw new Error(message);
  }

  return response.json();
}

/**
 * Submit a flag against a citizen.
 */
export async function submitFlag(submission: FlagSubmission): Promise<FlagResult> {
  const response = await fetch(`${API_BASE}/system/flag`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submission),
  });

  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Failed to submit flag');
    throw new Error(message);
  }

  return response.json();
}

/**
 * Submit a no-action decision.
 */
export async function submitNoAction(submission: NoActionSubmission): Promise<NoActionResult> {
  const response = await fetch(`${API_BASE}/system/no-action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submission),
  });

  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Failed to submit no-action');
    throw new Error(message);
  }

  return response.json();
}

/**
 * Get the outcome for a flag at a specific time point.
 */
export async function getFlagOutcome(
  flagId: string,
  timeSkip: 'immediate' | '1_month' | '6_months' | '1_year'
): Promise<CitizenOutcome> {
  const response = await fetch(
    `${API_BASE}/system/flag/${flagId}/outcome?time_skip=${timeSkip}`
  );

  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Failed to load outcome');
    throw new Error(message);
  }

  return response.json();
}

/**
 * Advance time for operator and get outcomes for all flagged citizens.
 * Called when a directive is completed to trigger time progression.
 */
export async function advanceTime(operatorId: string): Promise<CitizenOutcome[]> {
  const response = await fetch(`${API_BASE}/system/operator/${operatorId}/advance-time`, {
    method: 'POST',
  });

  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Failed to advance time');
    throw new Error(message);
  }

  return response.json();
}

/**
 * Get the operator's own risk assessment (when compliance drops).
 */
export async function getOperatorAssessment(
  operatorId: string
): Promise<OperatorRiskAssessment> {
  const response = await fetch(`${API_BASE}/system/operator/${operatorId}/assessment`);

  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Assessment not available');
    throw new Error(message);
  }

  return response.json();
}

/**
 * Get all flags submitted by this operator.
 */
export async function getOperatorHistory(operatorId: string): Promise<FlagSummary[]> {
  const response = await fetch(`${API_BASE}/system/operator/${operatorId}/history`);

  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Failed to load history');
    throw new Error(message);
  }

  return response.json();
}

/**
 * Get the ending based on operator's behavior.
 */
export async function getEnding(operatorId: string): Promise<EndingResult> {
  const response = await fetch(`${API_BASE}/system/ending?operator_id=${operatorId}`);

  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Failed to calculate ending');
    throw new Error(message);
  }

  return response.json();
}

/**
 * Acknowledge the ending and complete the session.
 */
export async function acknowledgeEnding(
  operatorId: string,
  feedback?: string
): Promise<{ session_complete: boolean; debrief_unlocked: boolean }> {
  const params = new URLSearchParams({ operator_id: operatorId });
  if (feedback) {
    params.append('feedback', feedback);
  }

  const response = await fetch(`${API_BASE}/system/ending/acknowledge?${params}`, {
    method: 'POST',
  });

  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Failed to acknowledge ending');
    throw new Error(message);
  }

  return response.json();
}

/**
 * Get public metrics (international awareness, public anger).
 */
export async function getPublicMetrics(operatorId: string): Promise<PublicMetricsRead> {
  const response = await fetch(`${API_BASE}/system/metrics/public?operator_id=${operatorId}`);

  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Failed to load public metrics');
    throw new Error(message);
  }

  return response.json();
}

/**
 * Get reluctance metrics (operator hesitation tracking).
 */
export async function getReluctanceMetrics(operatorId: string): Promise<ReluctanceMetricsRead> {
  const response = await fetch(`${API_BASE}/system/metrics/reluctance?operator_id=${operatorId}`);

  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Failed to load reluctance metrics');
    throw new Error(message);
  }

  return response.json();
}

/**
 * Get recent news articles.
 */
export async function getRecentNews(operatorId: string, limit: number = 10): Promise<NewsArticleRead[]> {
  const params = new URLSearchParams({
    operator_id: operatorId,
    limit: limit.toString(),
  });

  const response = await fetch(`${API_BASE}/system/news/recent?${params}`);

  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Failed to load news articles');
    throw new Error(message);
  }

  return response.json();
}

/**
 * Get active protests requiring attention.
 */
export async function getActiveProtests(operatorId: string): Promise<ProtestRead[]> {
  const response = await fetch(`${API_BASE}/system/protests/active?operator_id=${operatorId}`);

  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Failed to load protests');
    throw new Error(message);
  }

  return response.json();
}

/**
 * Get operator exposure risk status.
 */
export async function getExposureRisk(operatorId: string): Promise<ExposureRiskRead> {
  const response = await fetch(`${API_BASE}/system/operator/exposure-risk?operator_id=${operatorId}`);

  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Failed to load exposure risk');
    throw new Error(message);
  }

  return response.json();
}

/**
 * Get operator's personal data (for exposure events).
 */
export async function getOperatorData(operatorId: string): Promise<OperatorDataRead> {
  const response = await fetch(`${API_BASE}/system/operator/data?operator_id=${operatorId}`);

  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Failed to load operator data');
    throw new Error(message);
  }

  return response.json();
}

/**
 * Get available actions for the current directive.
 */
export async function getAvailableActions(operatorId: string): Promise<AvailableActionsRead> {
  const response = await fetch(`${API_BASE}/system/actions/available?operator_id=${operatorId}`);

  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Failed to load available actions');
    throw new Error(message);
  }

  return response.json();
}

/**
 * Execute a system action (ICE raid, press ban, etc.).
 */
export async function executeAction(request: SystemActionRequest): Promise<ActionResultRead> {
  const response = await fetch(`${API_BASE}/system/actions/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Failed to execute action');
    throw new Error(message);
  }

  return response.json();
}

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
  SystemStartResponse,
} from '../types/system';

const API_BASE = '/api';

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
    const error = await response.json();
    throw new Error(error.detail || 'Failed to start System Mode');
  }

  return response.json();
}

/**
 * Get the operator dashboard.
 */
export async function getDashboard(operatorId: string): Promise<SystemDashboard> {
  const response = await fetch(`${API_BASE}/system/dashboard?operator_id=${operatorId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to load dashboard');
  }

  return response.json();
}

/**
 * Get the current directive.
 */
export async function getCurrentDirective(operatorId: string): Promise<DirectiveRead> {
  const response = await fetch(`${API_BASE}/system/directive/current?operator_id=${operatorId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to load directive');
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
    const error = await response.json();
    throw new Error(error.detail || 'Cannot advance directive');
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
    const error = await response.json();
    throw new Error(error.detail || 'Failed to load cases');
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
    const error = await response.json();
    throw new Error(error.detail || 'Failed to load citizen file');
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
    const error = await response.json();
    throw new Error(error.detail || 'Failed to submit flag');
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
    const error = await response.json();
    throw new Error(error.detail || 'Failed to submit no-action');
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
    const error = await response.json();
    throw new Error(error.detail || 'Failed to load outcome');
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
    const error = await response.json();
    throw new Error(error.detail || 'Assessment not available');
  }

  return response.json();
}

/**
 * Get all flags submitted by this operator.
 */
export async function getOperatorHistory(operatorId: string): Promise<FlagSummary[]> {
  const response = await fetch(`${API_BASE}/system/operator/${operatorId}/history`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to load history');
  }

  return response.json();
}

/**
 * Get the ending based on operator's behavior.
 */
export async function getEnding(operatorId: string): Promise<EndingResult> {
  const response = await fetch(`${API_BASE}/system/ending?operator_id=${operatorId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to calculate ending');
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
    const error = await response.json();
    throw new Error(error.detail || 'Failed to acknowledge ending');
  }

  return response.json();
}

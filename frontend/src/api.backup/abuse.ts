/**
 * API client for abuse simulation endpoints
 */

import { fetchJson } from './client';
import type {
  AbuseAction,
  AbuseExecuteRequest,
  AbuseExecuteResponse,
  AbuseRole,
  ConsequenceChain,
} from '../types/abuse';
import { TimeSkip } from '../types/abuse';
import { ContentRating } from '../types/npc';

/**
 * Get all available abuse roles
 */
export async function getAbuseRoles(
  maxContentRating?: ContentRating
): Promise<AbuseRole[]> {
  const params = new URLSearchParams();
  if (maxContentRating) {
    params.append('max_content_rating', maxContentRating);
  }

  const queryString = params.toString();
  const endpoint = queryString
    ? `/api/abuse/roles?${queryString}`
    : '/api/abuse/roles';

  return fetchJson<AbuseRole[]>(endpoint);
}

/**
 * Get available actions for a role
 */
export async function getRoleActions(
  roleKey: string,
  targetNpcId?: string,
  maxContentRating?: ContentRating
): Promise<AbuseAction[]> {
  const params = new URLSearchParams();
  if (targetNpcId) {
    params.append('target_npc_id', targetNpcId);
  }
  if (maxContentRating) {
    params.append('max_content_rating', maxContentRating);
  }

  const queryString = params.toString();
  const endpoint = queryString
    ? `/api/abuse/roles/${roleKey}/actions?${queryString}`
    : `/api/abuse/roles/${roleKey}/actions`;

  return fetchJson<AbuseAction[]>(endpoint);
}

/**
 * Execute an abuse action
 */
export async function executeAbuseAction(
  request: AbuseExecuteRequest,
  sessionId?: string
): Promise<AbuseExecuteResponse> {
  const params = new URLSearchParams();
  if (sessionId) {
    params.append('session_id', sessionId);
  }

  const queryString = params.toString();
  const endpoint = queryString
    ? `/api/abuse/execute?${queryString}`
    : '/api/abuse/execute';

  return fetchJson<AbuseExecuteResponse>(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
}

/**
 * Get consequences for an execution
 */
export async function getConsequences(
  executionId: string,
  timeSkip: TimeSkip = TimeSkip.IMMEDIATE,
  maxContentRating?: ContentRating
): Promise<ConsequenceChain> {
  const params = new URLSearchParams();
  params.append('time_skip', timeSkip);
  if (maxContentRating) {
    params.append('max_content_rating', maxContentRating);
  }

  const endpoint = `/api/abuse/executions/${executionId}/consequences?${params.toString()}`;
  return fetchJson<ConsequenceChain>(endpoint);
}

/**
 * Get session history
 */
export async function getSessionHistory(
  sessionId: string
): Promise<AbuseExecuteResponse[]> {
  return fetchJson<AbuseExecuteResponse[]>(
    `/api/abuse/session/${sessionId}/history`
  );
}

/**
 * Reset a session
 */
export async function resetSession(sessionId: string): Promise<void> {
  await fetch(`/api/abuse/session/${sessionId}/reset`, {
    method: 'POST',
  });
}

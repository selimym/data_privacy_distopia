/**
 * API client for scenario endpoints
 */

import { fetchJson } from './client';
import type { ScenarioPrompt, ScenarioState } from '../types/scenario';

/**
 * Get current scenario state
 */
export async function getScenarioState(
  scenarioKey: string,
  sessionId: string
): Promise<ScenarioState> {
  const params = new URLSearchParams({ session_id: sessionId });
  return fetchJson<ScenarioState>(
    `/api/scenarios/${scenarioKey}/state?${params.toString()}`
  );
}

/**
 * Get current scenario prompt
 */
export async function getScenarioPrompt(
  scenarioKey: string,
  sessionId: string
): Promise<ScenarioPrompt> {
  const params = new URLSearchParams({ session_id: sessionId });
  return fetchJson<ScenarioPrompt>(
    `/api/scenarios/${scenarioKey}/prompt?${params.toString()}`
  );
}

/**
 * API client for settings and content warnings
 */

import { fetchJson } from './client';
import type { ScenarioWarnings } from '../types/abuse';
import { ContentRating, DomainType } from '../types/npc';

export interface UserSettings {
  max_content_rating: ContentRating;
  show_content_warnings: boolean;
  show_victim_statements: boolean;
  show_real_world_parallels: boolean;
  enabled_domains: DomainType[];
}

export interface UserSettingsUpdate {
  max_content_rating?: ContentRating;
  show_content_warnings?: boolean;
  show_victim_statements?: boolean;
  show_real_world_parallels?: boolean;
  enabled_domains?: DomainType[];
}

/**
 * Get current user settings
 */
export async function getSettings(
  sessionId: string = 'default'
): Promise<UserSettings> {
  const params = new URLSearchParams({ session_id: sessionId });
  return fetchJson<UserSettings>(`/api/settings?${params.toString()}`);
}

/**
 * Update user settings
 */
export async function updateSettings(
  updates: UserSettingsUpdate,
  sessionId: string = 'default'
): Promise<UserSettings> {
  const params = new URLSearchParams({ session_id: sessionId });
  return fetchJson<UserSettings>(`/api/settings?${params.toString()}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });
}

/**
 * Get content warnings for a scenario
 */
export async function getScenarioWarnings(
  scenarioKey: string
): Promise<ScenarioWarnings> {
  return fetchJson<ScenarioWarnings>(
    `/api/settings/warnings/${scenarioKey}`
  );
}

/**
 * Acknowledge scenario warnings
 */
export async function acknowledgeWarnings(
  scenarioKey: string,
  sessionId: string = 'default'
): Promise<void> {
  const params = new URLSearchParams({ session_id: sessionId });
  await fetch(
    `/api/settings/warnings/${scenarioKey}/acknowledge?${params.toString()}`,
    {
      method: 'POST',
    }
  );
}

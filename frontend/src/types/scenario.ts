/**
 * Type definitions for scenario system
 */

import type { AbuseAction } from './abuse';
import type { NPCBasic } from './npc';

export interface ScenarioState {
  scenario_key: string;
  phase: string;
  actions_taken: string[];
  suggested_next: string | null;
  npcs_discovered: string[];
}

export interface ScenarioPrompt {
  prompt_text: string;
  suggested_action: AbuseAction | null;
  suggested_target: NPCBasic | null;
  phase: string;
}

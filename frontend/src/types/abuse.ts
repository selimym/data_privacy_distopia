/**
 * Type definitions for abuse simulation system
 */

import { ContentRating } from './npc';

export enum TargetType {
  ANY_NPC = 'any_npc',
  SPECIFIC_NPC = 'specific_npc',
  SELF = 'self',
}

export enum ConsequenceSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  SEVERE = 'severe',
  EXTREME = 'extreme',
}

export enum TimeSkip {
  IMMEDIATE = 'immediate',
  ONE_WEEK = '1_week',
  ONE_MONTH = '1_month',
  SIX_MONTHS = '6_months',
  ONE_YEAR = '1_year',
}

export interface AbuseRole {
  id: string;
  role_key: string;
  display_name: string;
  description: string;
  authorized_domains: string; // JSON string
  can_modify_data: boolean;
  created_at: string;
  updated_at: string;
}

export interface AbuseAction {
  id: string;
  role_id: string;
  action_key: string;
  name: string;
  description: string;
  target_type: TargetType;
  content_rating: ContentRating;
  detection_chance: number;
  is_audit_logged: boolean;
  consequence_severity: ConsequenceSeverity;
  created_at: string;
  updated_at: string;
}

export interface AbuseExecuteRequest {
  role_key: string;
  action_key: string;
  target_npc_id: string;
}

export interface AbuseExecuteResponse {
  execution_id: string;
  action_name: string;
  target_name: string;
  immediate_result: string;
  data_revealed: Record<string, unknown> | null;
  was_detected: boolean;
  detection_message: string | null;
  warning: string | null;
}

export interface RealWorldParallel {
  case: string;
  summary: string;
  source: string;
}

export interface ConsequenceChain {
  execution_id: string;
  time_skips_available: TimeSkip[];
  current_time_skip: TimeSkip;
  events: string[];
  victim_impact: string | null;
  victim_statement: string | null;
  your_status: string;
  real_world_parallel: RealWorldParallel | null;
}

export interface ContentWarning {
  warning_type: string;
  content_rating: ContentRating;
  description: string;
  appears_in: string[];
}

export interface ScenarioWarnings {
  scenario_key: string;
  scenario_name: string;
  description: string;
  warnings: ContentWarning[];
  can_filter_dark_content: boolean;
  educational_purpose: string;
}

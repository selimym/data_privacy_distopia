import type { DomainKey, FlagType, ContractEvent, Neighborhood } from './game'
import type { VictimStatement } from './citizen'

// ─── Scenario ────────────────────────────────────────────────────────────────

export interface SpecialNPC {
  npc_key: string
  first_name: string
  last_name: string
  role: string
  backstory: string
  sprite_key: string
  map_x: number
  map_y: number
  appears_at_week?: number
}

export interface Scenario {
  scenario_key: string
  title: string
  description: string
  directives: import('./game').Directive[]
  contract_events: ContractEvent[]
  special_npcs: SpecialNPC[]
}

// ─── Country profile ─────────────────────────────────────────────────────────

export interface LegalFramework {
  surveillance_law: string
  data_retention: string
  oversight_body: string
}

export interface UIFlavor {
  agency_name: string
  operator_title: string
  platform_version: string
  flag_labels: Record<FlagType, string>
  no_action_label: string
}

export interface CountryProfile {
  country_key: string
  display_name: string
  flag_emoji: string
  surveillance_depth: 1 | 2 | 3
  available_domains: DomainKey[]
  legal_framework: LegalFramework
  ui_flavor: UIFlavor
  real_world_references: string[]
  neighborhoods?: Neighborhood[]
}

// ─── Inference rule ──────────────────────────────────────────────────────────

export interface InferenceRule {
  rule_key: string
  name: string
  category: string
  required_domains: DomainKey[]
  scariness_level: 1 | 2 | 3 | 4 | 5
  content_rating: string
  condition_function: string
  inference_template: string
  evidence_templates: string[]
  implications_templates: string[]
  educational_note: string
  real_world_example: string
  victim_statements: VictimStatement[]
  origin?: 'legacy' | 'player' | 'system'
  _player_rule_data?: PlayerRule
}

export interface PinnedDataPoint {
  id: string
  domain: DomainKey
  label: string
  category: string
}

export interface PlayerRule {
  rule_key: string
  name: string
  category: string
  scariness_level: 1 | 2 | 3 | 4 | 5
  evidence_domains: DomainKey[]
  evidence_keys: string[]
  evidence_labels: string[]
  origin: 'player'
  created_at_week: number
}

// ─── Outcome templates ───────────────────────────────────────────────────────

export interface OutcomeTemplate {
  status: string
  narrative: string
  statistics: Record<string, unknown>
}

export interface OutcomeTemplates {
  outcome_templates: Record<string, Record<string, OutcomeTemplate>>
  family_events: string[]
  detention_conditions: string[]
  summaries: Record<string, string>
}

// ─── Data banks ──────────────────────────────────────────────────────────────

export interface HealthDataBank {
  common_conditions: string[]
  sensitive_conditions: string[]
  chronic_conditions: string[]
  condition_medications: Record<string, string[]>
  sensitive_visit_reasons: string[]
  common_visit_reasons: string[]
  insurance_providers: string[]
  hospitals: string[]
  specialties: string[]
}

export interface FinanceDataBank {
  employers: string[]
  banks: string[]
  creditors: string[]
  merchants: Record<string, string[]>
  debt_types: string[]
  transaction_descriptions: {
    suspicious: string[]
    normal: string[]
  }
}

export interface JudicialDataBank {
  criminal_charges: Record<string, string[]>
  civil_case_descriptions: Record<string, string[]>
  traffic_violation_descriptions: Record<string, string[]>
  case_outcomes: string[]
  sentences: string[]
}

export interface SocialDataBank {
  post_templates: Record<string, string[]>
  platforms: string[]
  hashtags: Record<string, string[]>
  relationship_types: string[]
  group_memberships: {
    flagged: string[]
    neutral: string[]
  }
  public_inferences: Record<string, unknown>
}

export interface MessagesDataBank {
  message_templates: Record<string, string[]>
  contacts: {
    suspicious: string[]
    normal: string[]
  }
  encryption_indicators: string[]
}

export interface DataBanks {
  health: HealthDataBank
  finance: FinanceDataBank
  judicial: JudicialDataBank
  social: SocialDataBank
  messages: MessagesDataBank
}

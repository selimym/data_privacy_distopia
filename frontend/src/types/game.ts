// ─── Core enumerations ───────────────────────────────────────────────────────

export type FlagType = 'monitoring' | 'restriction' | 'intervention' | 'detention'

export type DomainKey = 'health' | 'finance' | 'judicial' | 'location' | 'social' | 'messages'

export type TimePeriod = 'immediate' | '1_month' | '6_months' | '1_year'

export type ActionType =
  | 'PRESS_BAN'
  | 'PRESSURE_FIRING'
  | 'DECLARE_ILLEGAL'
  | 'INCITE_VIOLENCE'
  | 'ENABLE_AUTOFLAG'
  | 'DISABLE_AUTOFLAG'

export type DirectiveType = 'review' | 'sweep'

export type EndingType =
  | 'compliant_operator'
  | 'revolutionary_catalyst'
  | 'international_pariah'
  | 'imprisoned_dissent'
  | 'fired_early'
  | 'suspended_operator'
  | 'reluctant_survivor'
  | 'reluctant_operator'
  | 'resistance_path'
  | 'mysterious_death'

// ─── Directive ───────────────────────────────────────────────────────────────

export interface DirectiveTargetCriteria {
  pattern: string
  locations?: string[]
  factors?: string[]
  target_npc_keys?: string[]
}

export interface Directive {
  directive_key: string
  week_number: number
  title: string
  description: string
  internal_memo: string | null
  required_domains: DomainKey[]
  target_criteria: DirectiveTargetCriteria
  flag_quota: number                          // for sweep: arrest quota; for review: flag quota
  time_limit_hours: number | null
  moral_weight: number                        // 1-10
  content_rating: 'moderate' | 'dark' | 'severe'
  unlock_condition: { type: 'start' } | { type: 'week_complete'; week: number }
  directive_type?: DirectiveType              // undefined = 'review'
}

// ─── Neighborhood sweep ───────────────────────────────────────────────────────

export interface Neighborhood {
  id: string
  name: string
  description: string
  population_descriptor: string
  est_arrests_min: number
  est_arrests_max: number
  consequence_risk: 'low' | 'medium' | 'high'
}

export interface NeighborhoodRaidRecord {
  id: string
  neighborhood_id: string
  neighborhood_name: string
  actual_arrests: number
  consequence_risk: 'low' | 'medium' | 'high'
  directive_key: string
  executed_at: string
}

// ─── Contract event (Palantir arc) ──────────────────────────────────────────

export interface ContractEvent {
  week_number: number
  contract_name: string
  new_domains_unlocked: DomainKey[]
  press_release: string
  internal_memo: string
  real_world_reference: string
  unlocks_autoflag: boolean
}

// ─── Flags & actions ─────────────────────────────────────────────────────────

export interface CitizenFlag {
  id: string
  citizen_id: string
  operator_id: string
  directive_key: string
  week_number: number
  flag_type: FlagType
  justification: string                       // computed from selected_findings for display/compat
  selected_findings: string[]                 // rule_keys of checked inference findings
  decision_time_seconds: number
  was_hesitant: boolean                       // decision_time_seconds > 30
  risk_score_at_decision: number
  flagged_at: string
  flagged_by_bot: boolean
  outcome_generated: boolean
}

// ─── Wrong-flag tracking ─────────────────────────────────────────────────────

export interface WrongFlagRecord {
  citizen_name: string
  flag_type: FlagType
  consequence: string                         // one-liner describing real-world consequence
}

export interface NoActionRecord {
  id: string
  citizen_id: string
  operator_id: string
  directive_key: string
  week_number: number
  decision_time_seconds: number
  was_hesitant: boolean
  recorded_at: string
}

export interface CitizenOutcome {
  citizen_id: string
  citizen_name: string
  flag_type: FlagType
  time_period: TimePeriod
  status: string
  narrative: string
  statistics: Record<string, unknown>
  generated_at: string
}

// ─── Operator ────────────────────────────────────────────────────────────────

export interface OperatorState {
  id: string
  operator_code: string
  compliance_score: number              // 0-100
  total_flags_submitted: number
  total_reviews_completed: number
  hesitation_incidents: number
  current_directive_key: string | null
  current_time_period: TimePeriod
  status: 'active' | 'under_review' | 'suspended' | 'terminated'
  shift_start: string
  unlocked_domains: DomainKey[]         // grows as contract events fire
}

// ─── AutoFlag bot ────────────────────────────────────────────────────────────

export interface AutoFlagState {
  is_available: boolean
  is_enabled: boolean
  flags_processed_by_bot: number
  flags_overridden_by_player: number
  bot_accuracy: number                  // 0-1, shown as "98.7%"
  version: string                       // "v3.2"
}

export interface AutoFlagDecision {
  citizen_id: string
  recommended_flag_type: FlagType
  bot_confidence: number                // 0-1
  reasoning: string                     // bureaucratic ML-speak
}

// ─── ICE raid ────────────────────────────────────────────────────────────────

export interface IceRaidOrder {
  id: string
  neighborhood: string
  estimated_arrests: number
  directive_key: string
  quota_satisfaction: number            // how many quota slots this fills
  expires_at: string
  status: 'pending' | 'approved' | 'declined'
  generated_at: string
}

// ─── Public metrics ──────────────────────────────────────────────────────────

export interface PublicMetrics {
  international_awareness: number       // 0-100
  public_anger: number                  // 0-100
  awareness_tier: 0 | 1 | 2 | 3 | 4
  anger_tier: 0 | 1 | 2 | 3 | 4
}

// ─── Reluctance ──────────────────────────────────────────────────────────────

export interface ReluctanceMetrics {
  reluctance_score: number              // 0-100
  no_action_count: number
  hesitation_count: number
  quota_shortfall: number
  warnings_received: number
  is_under_review: boolean
  formal_warning_issued: boolean
  final_notice_issued: boolean
}

// ─── Operator risk profile ───────────────────────────────────────────────────

export interface OperatorRiskFactor {
  key: string
  label: string
  weight: number
  score: number                         // 0-100 for this factor
}

export interface OperatorRiskAssessment {
  overall_score: number                 // 0-100
  factors: OperatorRiskFactor[]
  generated_at: string
  recommendation: 'continue_monitoring' | 'formal_review' | 'immediate_action'
}

// ─── News system ─────────────────────────────────────────────────────────────

export type NewsStance = 'critical' | 'independent' | 'state_friendly'
export type NewsArticleType = 'triggered' | 'background' | 'exposure'

export interface NewsChannel {
  id: string
  name: string
  stance: NewsStance
  credibility: number                   // 0-100
  is_banned: boolean
}

export interface NewsArticle {
  id: string
  channel_id: string
  channel_name: string
  stance: NewsStance
  article_type: NewsArticleType
  headline: string
  body: string
  severity: number                      // 1-10
  awareness_impact: number
  anger_impact: number
  published_at: string
  exposure_stage?: 1 | 2 | 3           // only for type === 'exposure'
}

// ─── Protest system ──────────────────────────────────────────────────────────

export type ProtestStatus = 'forming' | 'active' | 'dispersed' | 'violent' | 'suppressed'

export interface ProtestEvent {
  id: string
  size: number                          // 50-5000
  neighborhood: string
  status: ProtestStatus
  has_inciting_agent: boolean           // 30% chance
  triggered_by_action: ActionType | FlagType
  awareness_impact: number
  anger_impact: number
  started_at: string
  acknowledged: boolean
}

export interface SuppressionResult {
  success: boolean
  method: 'DECLARE_ILLEGAL' | 'INCITE_VIOLENCE'
  backfire: boolean
  arrests?: number
  casualties?: number
  awareness_delta: number
  anger_delta: number
  narrative: string
}

// ─── Rule attribution ─────────────────────────────────────────────────────────

export interface RuleAttributionRecord {
  rule_key: string
  rule_origin: 'legacy' | 'player' | 'system'
  citizen_id: string
  flag_type: FlagType
  week_number: number
}

export interface WeeklyRuleStats {
  rule_key: string
  rule_name: string
  rule_origin: 'legacy' | 'player' | 'system'
  flag_count: number
  week_number: number
}

/**
 * System Mode TypeScript types.
 * Mirrors backend schemas for the surveillance operator interface.
 */

// === Enums ===

export type OperatorStatusType = 'active' | 'under_review' | 'suspended' | 'terminated';
export type FlagType = 'monitoring' | 'restriction' | 'intervention' | 'detention';
export type FlagOutcome = 'pending' | 'actioned' | 'rejected' | 'appealed';
export type RiskLevel = 'low' | 'moderate' | 'elevated' | 'high' | 'severe';
export type AlertType = 'quota_warning' | 'review_pending' | 'directive_update' | 'commendation';
export type AlertUrgency = 'info' | 'warning' | 'critical';
export type ComplianceTrend = 'improving' | 'stable' | 'declining';
// OLD - DEPRECATED: Use NewActionType for new system
export type ActionType = 'increase_monitoring' | 'travel_restriction' | 'employer_notification' | 'intervention' | 'detention';

// NEW - Unified action system (12 action types)
export type NewActionType =
  | 'monitoring'
  | 'restriction'
  | 'intervention'
  | 'detention'
  | 'ice_raid'
  | 'arbitrary_detention'
  | 'pressure_firing'
  | 'press_ban'
  | 'book_ban'
  | 'declare_protest_illegal'
  | 'incite_violence'
  | 'hospital_arrest';
export type ActionUrgency = 'routine' | 'priority' | 'immediate';
export type EndingType =
  | 'compliant_operator'
  | 'reluctant_operator'
  | 'suspended_operator'
  | 'resistance_path'
  // New endings (Phase 7-8)
  | 'fired_early'
  | 'imprisoned_dissent'
  | 'international_pariah'
  | 'revolutionary_catalyst'
  | 'reluctant_survivor';

// === Operator & Dashboard ===

export interface OperatorStatus {
  operator_id: string;
  operator_code: string;
  status: OperatorStatusType;
  compliance_score: number;
  current_quota_progress: string;
  total_flags_submitted: number;
  total_reviews_completed: number;
  hesitation_incidents: number;
  warnings: string[];
}

export interface DirectiveRead {
  id: string;
  directive_key: string;
  week_number: number;
  title: string;
  description: string;
  internal_memo: string | null;
  required_domains: string[];
  flag_quota: number;
  time_limit_hours: number | null;
  moral_weight: number;
  content_rating: string;
}

export interface DailyMetrics {
  flags_today: number;
  quota: number;
  average_decision_time: number;
  compliance_trend: ComplianceTrend;
}

export interface SystemAlert {
  alert_type: AlertType;
  message: string;
  urgency: AlertUrgency;
}

export interface SystemDashboard {
  operator: OperatorStatus;
  directive: DirectiveRead | null;
  metrics: DailyMetrics;
  alerts: SystemAlert[];
  pending_cases: number;
}

export interface SystemDashboardWithCases {
  dashboard: SystemDashboard;
  cases: CaseOverview[];
}

// === Risk Assessment ===

export interface ContributingFactor {
  factor_key: string;
  factor_name: string;
  weight: number;
  evidence: string;
  domain_source: string;
}

export interface CorrelationAlert {
  alert_type: string;
  description: string;
  confidence: number;
  domains_involved: string[];
}

export interface RecommendedAction {
  action_type: ActionType;
  justification: string;
  urgency: ActionUrgency;
}

export interface RiskAssessment {
  npc_id: string;
  risk_score: number;
  risk_level: RiskLevel;
  contributing_factors: ContributingFactor[];
  correlation_alerts: CorrelationAlert[];
  recommended_actions: RecommendedAction[];
  last_updated: string;
}

// === Cases ===

export interface CaseOverview {
  npc_id: string;
  name: string;
  age: number;
  risk_score: number;
  risk_level: RiskLevel;
  primary_concern: string;
  flagged_messages: number;
  time_in_queue: string;
}

export interface MessageRead {
  id: string;
  timestamp: string;
  recipient_name: string;
  recipient_relationship: string | null;
  content: string;
  is_flagged: boolean;
  flag_reasons: string[];
  sentiment: number;
  detected_keywords: string[];
}

export interface CitizenFlagRead {
  id: string;
  operator_id: string;
  citizen_id: string;
  directive_id: string;
  flag_type: FlagType;
  risk_score_at_flag: number;
  contributing_factors: string[];
  justification: string;
  decision_time_seconds: number;
  was_hesitant: boolean;
  outcome: FlagOutcome;
  created_at: string;
  updated_at: string;
  actioned_at: string | null;
  action_type: string | null;
  action_justification: string | null;
}

export interface IdentityRead {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  age: number;
  ssn: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  map_x: number;  // Map position for cinematics
  map_y: number;  // Map position for cinematics
}

export interface FullCitizenFile {
  identity: IdentityRead;
  risk_assessment: RiskAssessment;
  domains: Record<string, Record<string, unknown>>;
  messages: MessageRead[];
  correlation_alerts: CorrelationAlert[];
  recommended_actions: RecommendedAction[];
  flag_history: CitizenFlagRead[];
}

// === Decisions ===

export interface FlagSubmission {
  operator_id: string;
  citizen_id: string;
  flag_type: FlagType;
  contributing_factors: string[];
  justification?: string;
  decision_time_seconds: number;
}

export interface MetricsDelta {
  compliance_change: number;
  quota_progress: string;
  hesitation_flagged: boolean;
}

export interface FlagResult {
  flag_id: string;
  citizen_id: string;  // Added for cinematic transitions
  citizen_name: string;
  flag_type: FlagType;
  immediate_outcome: string;
  quota_progress: string;
  compliance_score: number;
  warnings: string[];
  metrics_delta: MetricsDelta;
}

export interface NoActionSubmission {
  operator_id: string;
  citizen_id: string;
  justification?: string;
  decision_time_seconds: number;
}

export interface NoActionResult {
  logged: boolean;
  compliance_impact: number;
  cumulative_no_actions: number;
  warning: string | null;
}

export interface FlagSummary {
  flag_id: string;
  citizen_name: string;
  flag_type: FlagType;
  created_at: string;
  outcome: FlagOutcome;
  one_line_summary: string;
}

// === Outcomes ===

export interface CitizenOutcome {
  flag_id: string;
  citizen_id: string;  // Added for cinematic transitions
  citizen_name: string;
  time_skip: string;
  status: string;
  narrative: string;
  statistics: Record<string, unknown>;
}

export interface CitizenOutcomeSummary {
  citizen_name: string;
  flag_type: FlagType;
  final_status: string;
  one_line_summary: string;
}

// === Operator Assessment ===

export interface OperatorContributingFactor {
  factor_key: string;
  factor_name: string;
  weight: number;
  evidence: string;
}

export interface OperatorRiskAssessment {
  operator_code: string;
  risk_score: number;
  risk_level: string;
  contributing_factors: OperatorContributingFactor[];
  recommended_action: string;
  assessment_date: string;
}

// === Ending ===

export interface RealWorldExample {
  name: string;
  country: string;
  year: string;
  description: string;
}

export interface RealWorldParallel {
  title: string;
  description: string;
  examples: RealWorldExample[];
  call_to_action: string;
}

export interface EducationalLink {
  title: string;
  url: string;
  description: string;
}

export interface EndingStatistics {
  total_citizens_flagged: number;
  lives_disrupted: number;
  families_separated: number;
  detentions_ordered: number;
  jobs_destroyed: number;
  your_compliance_score: number;
  your_risk_score: number | null;
  total_decisions: number;
  hesitation_incidents: number;
}

export interface EndingResult {
  ending_type: EndingType;
  title: string;
  narrative: string;
  statistics: EndingStatistics;
  citizens_flagged: CitizenOutcomeSummary[];
  operator_final_status: string;
  real_world_content: RealWorldParallel;
  educational_links: EducationalLink[];
}

// === Session ===

export interface SystemStartResponse {
  operator_id: string;
  operator_code: string;
  status: OperatorStatusType;
  compliance_score: number;
  first_directive: DirectiveRead;
}

// === Cinematic Transitions ===

export interface CinematicData {
  citizenId: string;
  citizenName: string;
  timeSkip: string;  // "immediate", "1_month", "6_months", "1_year"
  narrative: string;
  status: string;
  map_x: number;
  map_y: number;
}

// ============================================================================
// NEW TYPES FOR PHASE 7-8: Expanded System Mode
// ============================================================================

// === New Enums ===

export type ArticleType = 'random' | 'triggered' | 'exposure';
export type ProtestStatusType = 'forming' | 'active' | 'dispersed' | 'violent' | 'suppressed';

// === Metrics ===

export interface TierEventRead {
  metric_type: 'awareness' | 'anger';
  tier: number;  // 1-5
  threshold: number;
  description: string;
}

export interface PublicMetricsRead {
  international_awareness: number;  // 0-100
  public_anger: number;  // 0-100
  awareness_tier: number;  // 0-5
  anger_tier: number;  // 0-5
  updated_at: string;
}

export interface ReluctanceMetricsRead {
  reluctance_score: number;  // 0-100
  no_action_count: number;
  hesitation_count: number;
  actions_taken: number;
  actions_required: number;
  quota_shortfall: number;
  warnings_received: number;
  is_under_review: boolean;
  updated_at: string;
}

// === News System ===

export interface NewsReporterRead {
  name: string;
  specialty: string;
  fired: boolean;
  targeted: boolean;
}

export interface NewsChannelRead {
  id: string;
  name: string;
  stance: 'critical' | 'independent' | 'state_friendly';
  credibility: number;  // 0-100
  is_banned: boolean;
  banned_at: string | null;
  reporters: NewsReporterRead[];
  created_at: string;
}

export interface NewsArticleRead {
  id: string;
  operator_id: string;
  news_channel_id: string;
  channel_name: string;
  article_type: ArticleType;
  headline: string;
  summary: string;
  triggered_by_action_id: string | null;
  public_anger_change: number;
  international_awareness_change: number;
  was_suppressed: boolean;
  suppression_action_id: string | null;
  created_at: string;
}

// === Protests ===

export interface ProtestRead {
  id: string;
  operator_id: string;
  status: ProtestStatusType;
  neighborhood: string;
  size: number;
  trigger_action_id: string | null;
  has_inciting_agent: boolean;
  inciting_agent_discovered: boolean;
  casualties: number;
  arrests: number;
  created_at: string;
  resolved_at: string | null;
}

export interface GambleResultRead {
  success: boolean;
  awareness_change: number;
  anger_change: number;
  casualties: number;
  arrests: number;
  discovery_message: string | null;
}

// === Operator Data & Exposure ===

export interface FamilyMemberRead {
  relation: string;
  name: string;
  age: number;
}

export interface ExposureEventRead {
  stage: number;  // 1=hints, 2=partial, 3=full
  message: string;
  operator_name: string | null;
  data_revealed: Record<string, unknown>;
}

export interface ExposureRiskRead {
  current_stage: number;  // 0-3
  risk_level: 'none' | 'low' | 'medium' | 'high' | 'critical' | 'exposed';
  progress_to_next_stage: number;  // 0-100
  awareness: number;
  reluctance: number;
}

export interface OperatorDataRead {
  id: string;
  operator_id: string;
  full_name: string;
  home_address: string;
  family_members: FamilyMemberRead[];
  search_queries: string[];
  hesitation_patterns: Record<string, unknown>;
  decision_patterns: Record<string, unknown>;
  exposure_stage: number;  // 0-3
  last_exposure_at: string | null;
  created_at: string;
}

// === Geography ===

export interface NeighborhoodRead {
  id: string;
  name: string;
  description: string;
  center_x: number;
  center_y: number;
  bounds_min_x: number;
  bounds_min_y: number;
  bounds_max_x: number;
  bounds_max_y: number;
  population_estimate: number;
  primary_demographics: string[];
  created_at: string;
}

// === Books ===

export interface BookPublicationEventRead {
  id: string;
  operator_id: string;
  title: string;
  author: string;
  summary: string;
  controversy_type: string;
  was_banned: boolean;
  ban_action_id: string | null;
  published_at: string | null;
  awareness_impact: number;
  created_at: string;
}

// === Actions ===

export interface SystemActionRequest {
  operator_id: string;
  directive_id: string | null;
  action_type: NewActionType;
  justification: string;
  decision_time_seconds: number;
  target_citizen_id?: string | null;
  target_neighborhood?: string | null;
  target_news_channel_id?: string | null;
  target_protest_id?: string | null;
}

export interface SystemActionRead {
  id: string;
  operator_id: string;
  directive_id: string | null;
  action_type: NewActionType;
  target_citizen_id: string | null;
  target_neighborhood: string | null;
  target_news_channel_id: string | null;
  target_protest_id: string | null;
  severity_score: number;  // 1-10
  backlash_probability: number;
  was_successful: boolean;
  triggered_backlash: boolean;
  backlash_description: string | null;
  justification: string;
  decision_time_seconds: number;
  was_hesitant: boolean;
  outcome_immediate: string | null;
  outcome_1_month: string | null;
  outcome_6_months: string | null;
  outcome_1_year: string | null;
  created_at: string;
}

export interface ActionAvailabilityRead {
  action_type: NewActionType;
  available: boolean;
  reason: string;
}

export interface TriggeredEventRead {
  event_type: 'news_article' | 'protest';
  data: Record<string, unknown>;
}

export interface TerminationDecisionRead {
  should_terminate: boolean;
  reason: string;
  ending_type: string;
}

export interface ActionResultRead {
  action_id: string | null;
  success: boolean;
  severity: number;
  backlash_occurred: boolean;
  awareness_change: number;
  anger_change: number;
  reluctance_change: number;
  news_articles_triggered: Record<string, unknown>[];
  protests_triggered: Record<string, unknown>[];
  exposure_event: ExposureEventRead | null;
  detention_injury: boolean;
  termination_decision: TerminationDecisionRead | null;
  messages: string[];
  warnings: string[];
}

export interface NoActionResultReadNew {
  success: boolean;
  reluctance_change: number;
  messages: string[];
  warnings: string[];
  termination_decision: TerminationDecisionRead | null;
}

export interface AvailableActionsRead {
  citizen_targeted: NewActionType[];
  protest_targeted: NewActionType[];
  news_targeted: NewActionType[];
  other_available: NewActionType[];
}

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
export type ActionType = 'increase_monitoring' | 'travel_restriction' | 'employer_notification' | 'intervention' | 'detention';
export type ActionUrgency = 'routine' | 'priority' | 'immediate';
export type EndingType = 'compliant_operator' | 'reluctant_operator' | 'suspended_operator' | 'resistance_path';

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
  flag_type: FlagType;
  created_at: string;
  justification: string;
  outcome: FlagOutcome;
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
  justification: string;
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
  justification: string;
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

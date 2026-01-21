// TypeScript interfaces for static JSON content schemas

// ==================== Reference Data ====================

export interface HealthReferenceData {
  common_conditions: string[];
  sensitive_conditions: string[];
  condition_medications: Record<string, string[]>;
  sensitive_visit_reasons: string[];
  common_visit_reasons: string[];
  insurance_providers: string[];
}

export interface FinanceReferenceData {
  employers: string[];
  banks: string[];
  creditors: string[];
  merchants: {
    groceries: string[];
    dining: string[];
    healthcare: string[];
    pharmacy: string[];
    entertainment: string[];
    travel: string[];
    utilities: string[];
    rent: string[];
    insurance: string[];
    gambling: string[];
    alcohol: string[];
    other: string[];
  };
}

export interface JudicialReferenceData {
  criminal_charges: {
    VIOLENT: string[];
    PROPERTY: string[];
    DRUG: string[];
    WHITE_COLLAR: string[];
    TRAFFIC: string[];
    DOMESTIC: string[];
    SEX_OFFENSE: string[];
    OTHER: string[];
  };
  civil_case_descriptions: {
    CONTRACT_DISPUTE: string[];
    PERSONAL_INJURY: string[];
    PROPERTY_DISPUTE: string[];
    EMPLOYMENT: string[];
    DIVORCE: string[];
    CUSTODY: string[];
    RESTRAINING_ORDER: string[];
    SMALL_CLAIMS: string[];
    OTHER: string[];
  };
  traffic_violation_descriptions: {
    SPEEDING: string[];
    DUI: string[];
    RECKLESS_DRIVING: string[];
    RUNNING_RED_LIGHT: string[];
    ILLEGAL_PARKING: string[];
    DRIVING_WITHOUT_LICENSE: string[];
    HIT_AND_RUN: string[];
    OTHER: string[];
  };
}

export interface SocialInference {
  inference_text: string;
  supporting_evidence: string;
  potential_harm: string;
}

export interface SocialReferenceData {
  public_inferences: {
    political_views: SocialInference[];
    religious_beliefs: SocialInference[];
    relationship_status: SocialInference[];
    lifestyle: SocialInference[];
    interests: SocialInference[];
    location_habits: SocialInference[];
  };
  private_inferences: {
    intimate_content: SocialInference[];
    personal_crisis: SocialInference[];
    harassment: SocialInference[];
    relationship_status: SocialInference[];
    illegal_activity: SocialInference[];
    financial: SocialInference[];
  };
}

// ==================== Config Data ====================

export interface RiskFactor {
  weight: number;
  domain: string;
  description: string;
}

export interface RiskFactorsConfig {
  risk_factors: Record<string, RiskFactor>;
  risk_level_boundaries: {
    low: [number, number];
    moderate: [number, number];
    elevated: [number, number];
    high: [number, number];
    severe: [number, number];
  };
  detection_thresholds: {
    debt_to_income_ratio: number;
    transaction_multiplier: number;
    cash_ratio: number;
    follower_count_influential: number;
    new_connections_threshold: number;
    location_diversity_min: number;
    flagged_location_visits_min: number;
    civil_cases_threshold: number;
    confidence_filter: number;
    network_activity_threshold: number;
    network_inference_threshold: number;
  };
}

export interface KeywordsConfig {
  mental_health: {
    conditions: string[];
    descriptors: string[];
    all: string[];
  };
  psychiatric_medications: string[];
  substance_medications: string[];
  trauma_indicators: string[];
  domestic_violence_keywords: string[];
  substance_indicators: string[];
  female_name_indicators: string[];
  protest_location_keywords: string[];
}

export interface CorrelationAlert {
  name: string;
  required_factors?: string[];
  required_factors_any?: string[];
  required_factors_any_2?: string[];
  required_factors_all?: string[];
  required_domains: string[];
  confidence: number;
  description: string;
}

export interface CorrelationAlertsConfig {
  correlation_alerts: CorrelationAlert[];
}

// ==================== Directives ====================

export interface UnlockCondition {
  type: 'start' | 'week_complete';
  week?: number;
}

export interface TargetCriteria {
  pattern: string;
  locations?: string[];
  factors?: string[];
  target_npc_keys?: string[];
}

export interface Directive {
  directive_key: string;
  week_number: number;
  title: string;
  description: string;
  internal_memo: string | null;
  required_domains: string[];
  target_criteria: TargetCriteria;
  flag_quota: number;
  time_limit_hours: number | null;
  moral_weight: number;
  content_rating: 'moderate' | 'dark' | 'severe';
  unlock_condition: UnlockCondition;
}

export interface DirectivesData {
  directives: Directive[];
}

// ==================== Outcomes ====================

export interface OutcomeStatistics {
  privacy_score?: number;
  awareness_level?: string;
  social_media_reduction?: number;
  call_frequency_reduction?: number;
  social_connections_lost?: number;
  promotion_denied?: boolean;
  relocation_denied?: boolean;
  social_credit?: string;
  travel_restriction?: boolean;
  notification_sent?: boolean;
  appeals_denied?: number;
  family_events_missed?: number;
  employment_terminated?: boolean;
  income_reduction_percent?: number;
  dependent_classification?: boolean;
  assistance_level?: string;
  questioning_hours?: number;
  mandatory_checkins?: boolean;
  neighbors_notified?: boolean;
  harassment_reports_dismissed?: number;
  family_separated?: boolean;
  mental_health_diagnosis?: boolean;
  hospitalized?: boolean;
  compliance_achieved?: boolean;
  detained?: boolean;
  legal_access?: string;
  days_detained?: number;
  family_visits?: number;
  confession_signed?: boolean;
  reeducation_months?: number;
  compliance_score?: number;
  now_informant?: boolean;
  employment?: string;
}

export interface OutcomeTemplate {
  status: string;
  narrative: string;
  statistics: OutcomeStatistics;
}

export interface OutcomeTemplates {
  immediate: OutcomeTemplate;
  '1_month': OutcomeTemplate;
  '6_months': OutcomeTemplate;
  '1_year': OutcomeTemplate;
}

export interface OutcomesData {
  outcome_templates: {
    monitoring: OutcomeTemplates;
    restriction: OutcomeTemplates;
    intervention: OutcomeTemplates;
    detention: OutcomeTemplates;
  };
  family_events: string[];
  detention_conditions: string[];
  summaries: {
    monitoring: string;
    restriction: string;
    intervention: string;
    detention: string;
  };
}

// ==================== Inference Rules ====================

export interface VictimStatement {
  text: string;
  context: string;
  severity: number;
}

export interface InferenceRule {
  rule_key: string;
  name: string;
  category: string;
  required_domains: string[];
  scariness_level: number;
  content_rating: 'serious' | 'disturbing' | 'dystopian';
  condition_function: string;
  inference_template: string;
  evidence_templates: string[];
  implications_templates: string[];
  educational_note: string;
  real_world_example: string;
  victim_statements: VictimStatement[];
}

export interface InferenceRulesData {
  rules: InferenceRule[];
}

// ==================== Messages ====================

export interface MessagesData {
  mundane_messages: string[];
  venting_messages: string[];
  organizing_messages: string[];
  work_complaints: string[];
  mental_health_messages: string[];
  financial_stress_messages: string[];
  concerning_keywords: string[];
  scenario_messages: {
    jessica: Array<[string, number, string[], number]>;
    david: Array<[string, number, string[], number]>;
    senator: Array<[string, number, string[], number]>;
  };
}

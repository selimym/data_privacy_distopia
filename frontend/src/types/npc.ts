export enum Role {
  CITIZEN = "citizen",
  ROGUE_EMPLOYEE = "rogue_employee",
  HACKER = "hacker",
  GOVERNMENT_OFFICIAL = "government_official",
  DATA_ANALYST = "data_analyst",
}

export enum Severity {
  MILD = "mild",
  MODERATE = "moderate",
  SEVERE = "severe",
}

// Note: Severity enum is also exported from health.ts for consistency with Python models

export enum DomainType {
  HEALTH = "health",
  FINANCE = "finance",
  JUDICIAL = "judicial",
  LOCATION = "location",
  SOCIAL = "social",
}

export interface NPCBase {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  ssn: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  role: Role;
  sprite_key: string;
  map_x: number;
  map_y: number;
  is_scenario_npc: boolean;
  scenario_key: string | null;
}

export interface NPCRead extends NPCBase {
  id: string;
  created_at: string;
  updated_at: string;
  cached_risk_score: number | null;
  risk_score_updated_at: string | null;
  is_hospitalized: boolean;
  injury_from_action_id: string | null;
}

export interface NPCBasic {
  id: string;
  first_name: string;
  last_name: string;
  role: Role;
  sprite_key: string;
  map_x: number;
  map_y: number;
}

export interface NPCListResponse {
  items: NPCBasic[];
  total: number;
  limit: number;
  offset: number;
}

export interface HealthCondition {
  id: string;
  health_record_id: string;
  condition_name: string;
  diagnosed_date: string;
  severity: Severity;
  is_chronic: boolean;
  is_sensitive: boolean;
  created_at: string;
  updated_at: string;
}

export interface HealthMedication {
  id: string;
  health_record_id: string;
  medication_name: string;
  dosage: string;
  prescribed_date: string;
  is_sensitive: boolean;
  created_at: string;
  updated_at: string;
}

export interface HealthVisit {
  id: string;
  health_record_id: string;
  visit_date: string;
  provider_name: string;
  reason: string;
  notes: string | null;
  is_sensitive: boolean;
  created_at: string;
  updated_at: string;
}

export interface HealthRecord {
  id: string;
  npc_id: string;
  insurance_provider: string;
  primary_care_physician: string;
  conditions: HealthCondition[];
  medications: HealthMedication[];
  visits: HealthVisit[];
  created_at: string;
  updated_at: string;
}

// Finance domain types
export interface BankAccount {
  id: string;
  finance_record_id: string;
  account_type: string;
  bank_name: string;
  account_number_last4: string;
  balance: string;
  opened_date: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface Debt {
  id: string;
  finance_record_id: string;
  debt_type: string;
  creditor_name: string;
  original_amount: string;
  current_balance: string;
  monthly_payment: string;
  interest_rate: string;
  is_delinquent: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  finance_record_id: string;
  transaction_date: string;
  merchant_name: string;
  category: string;
  amount: string;
  is_sensitive: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinanceRecord {
  id: string;
  npc_id: string;
  employment_status: string;
  employer_name: string | null;
  annual_income: string;
  credit_score: number;
  bank_accounts: BankAccount[];
  debts: Debt[];
  transactions: Transaction[];
  created_at: string;
  updated_at: string;
}

// Judicial domain types
export interface CriminalRecord {
  id: string;
  judicial_record_id: string;
  case_number: string;
  charge: string;
  conviction_date: string;
  sentence: string;
  is_felony: boolean;
  is_sealed: boolean;
  created_at: string;
  updated_at: string;
}

export interface CivilCase {
  id: string;
  judicial_record_id: string;
  case_number: string;
  case_type: string;
  filing_date: string;
  resolution: string;
  plaintiff_defendant: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrafficViolation {
  id: string;
  judicial_record_id: string;
  citation_number: string;
  violation_type: string;
  violation_description: string;
  violation_date: string;
  location: string;
  fine_amount: string;
  points: number;
  was_contested: boolean;
  is_paid: boolean;
  is_serious: boolean;
  created_at: string;
  updated_at: string;
}

export interface JudicialRecord {
  id: string;
  npc_id: string;
  has_criminal_record: boolean;
  has_civil_cases: boolean;
  has_traffic_violations: boolean;
  criminal_records: CriminalRecord[];
  civil_cases: CivilCase[];
  traffic_violations: TrafficViolation[];
  created_at: string;
  updated_at: string;
}

// Location domain types
export interface InferredLocation {
  id: string;
  location_record_id: string;
  location_type: string;
  location_name: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  typical_days: string;
  typical_arrival_time: string | null;
  typical_departure_time: string | null;
  visit_frequency: string;
  inferred_relationship: string | null;
  privacy_implications: string;
  is_sensitive: boolean;
  confidence_score: number;
  created_at: string;
  updated_at: string;
}

export interface LocationRecord {
  id: string;
  npc_id: string;
  tracking_enabled: boolean;
  data_retention_days: number;
  inferred_locations: InferredLocation[];
  created_at: string;
  updated_at: string;
}

// Social Media domain types
export interface PublicInference {
  id: string;
  social_media_record_id: string;
  category: string;
  inference_text: string;
  supporting_evidence: string;
  confidence_score: number;
  source_platform: string;
  data_points_analyzed: number;
  potential_harm: string;
  created_at: string;
  updated_at: string;
}

export interface PrivateInference {
  id: string;
  social_media_record_id: string;
  category: string;
  inference_text: string;
  supporting_evidence: string;
  confidence_score: number;
  data_points_analyzed: number;
  potential_harm: string;
  created_at: string;
  updated_at: string;
}

export interface SocialMediaRecord {
  id: string;
  npc_id: string;
  has_public_profile: boolean;
  primary_platform: string | null;
  account_created_date: string | null;
  follower_count: number | null;
  post_frequency: string | null;
  uses_end_to_end_encryption: boolean;
  encryption_explanation: string | null;
  public_inferences: PublicInference[];
  private_inferences: PrivateInference[];
  created_at: string;
  updated_at: string;
}

export type DomainData =
  | HealthRecord
  | FinanceRecord
  | JudicialRecord
  | LocationRecord
  | SocialMediaRecord;

export interface NPCWithDomains {
  npc: NPCRead;
  domains: Partial<Record<DomainType, DomainData>>;
}

// Inference types
export enum ContentRating {
  SAFE = "SAFE",
  CAUTIONARY = "CAUTIONARY",
  SERIOUS = "SERIOUS",
  DISTURBING = "DISTURBING",
  DYSTOPIAN = "DYSTOPIAN",
}

export interface InferenceResult {
  rule_key: string;
  rule_name: string;
  confidence: number;
  inference_text: string;
  supporting_evidence: string[];
  implications: string[];
  domains_used: DomainType[];
  scariness_level: number;
  content_rating: ContentRating;
}

export interface UnlockableInference {
  domain: DomainType;
  rule_keys: string[];
}

export interface InferencesResponse {
  npc_id: string;
  enabled_domains: DomainType[];
  inferences: InferenceResult[];
  unlockable_inferences: UnlockableInference[];
}

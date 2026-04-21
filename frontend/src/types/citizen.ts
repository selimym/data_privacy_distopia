import type { DomainKey } from './game'

// ─── Citizen skeleton (always in memory for all 50 NPCs) ────────────────────

export interface CitizenSkeleton {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string        // ISO date string
  ssn: string
  street_address: string
  city: string
  state: string
  zip_code: string
  role: 'citizen' | 'government_official' | 'data_analyst' | 'hacktivist' | 'protected'
  sprite_key: string
  map_x: number                // 0-49 grid coordinate
  map_y: number                // 0-49 grid coordinate
  is_scenario_npc: boolean
  scenario_key: string | null  // e.g. 'jessica_martinez'
  appears_at_week: number | null   // null = always in queue; set = only from this week onward
  risk_score_cache: number | null
  risk_score_updated_at: string | null
  generation_seed: number      // deterministic: used to regenerate full profile
}

// ─── Full profile (lazily generated, cached) ────────────────────────────────

export interface CitizenProfile extends CitizenSkeleton {
  health?: HealthRecord
  finance?: FinanceRecord
  judicial?: JudicialRecord
  location?: LocationRecord
  social?: SocialMediaRecord
  messages?: MessageRecord[]
  inferences?: InferenceResult[]
  risk_assessment?: RiskAssessment
}

// ─── Domain records ─────────────────────────────────────────────────────────

export interface HealthVisit {
  date: string
  reason: string
  facility: string
  specialty: string
}

export interface HealthRecord {
  conditions: string[]
  sensitive_conditions: string[]
  medications: string[]
  visits: HealthVisit[]
  insurance_provider: string
}

export interface BankAccount {
  id: string
  bank: string
  type: 'checking' | 'savings' | 'credit'
  balance: number
  opened_date: string
}

export interface Transaction {
  date: string
  merchant: string
  category: string
  amount: number                // positive = debit, negative = credit
  is_suspicious: boolean
}

export interface Debt {
  type: string
  creditor: string
  amount: number
  delinquent: boolean
}

export interface FinanceRecord {
  accounts: BankAccount[]
  transactions: Transaction[]
  debts: Debt[]
  credit_score: number
  employer: string
  annual_income: number
}

export interface JudicialCase {
  id: string
  type: 'criminal' | 'civil' | 'traffic'
  charge: string
  date: string
  outcome: string
  sentence: string | null
}

export interface JudicialRecord {
  cases: JudicialCase[]
  has_felony: boolean
  has_violent_offense: boolean
  has_drug_offense: boolean
}

export interface CheckIn {
  date: string
  location_name: string
  location_type: string
  address: string
  frequency: 'daily' | 'weekly' | 'occasional' | 'once'
}

export interface LocationRecord {
  home_address: string
  work_address: string
  work_name: string
  checkins: CheckIn[]
  flagged_locations: string[]
}

export interface SocialPost {
  date: string
  platform: string
  content: string
  is_concerning: boolean
  hashtags: string[]
}

export interface SocialConnection {
  name: string
  relationship: string
  is_flagged: boolean
}

export interface SocialMediaRecord {
  platforms: string[]
  posts: SocialPost[]
  connections: SocialConnection[]
  group_memberships: string[]
  flagged_group_memberships: string[]
  political_inferences: string[]
}

export interface MessageRecord {
  id: string
  date: string
  contact: string
  platform: string
  excerpt: string
  is_encrypted: boolean
  is_concerning: boolean
  category: 'organizing' | 'personal_crisis' | 'normal' | 'coded'
}

// ─── Inference result ────────────────────────────────────────────────────────

export interface InferenceResult {
  rule_key: string
  rule_name: string
  category: string
  confidence: number           // 0-1
  inference_text: string
  supporting_evidence: string[]
  implications: string[]
  domains_used: DomainKey[]
  scariness_level: 1 | 2 | 3 | 4 | 5
  educational_note: string
  real_world_example: string
  victim_statements: VictimStatement[]
  origin?: 'legacy' | 'player' | 'system'
}

export interface VictimStatement {
  text: string
  context: string
  severity: number
}

// ─── Risk assessment ─────────────────────────────────────────────────────────

export type RiskLevel = 'low' | 'moderate' | 'elevated' | 'high' | 'severe' | 'classified'

export interface RiskFactor {
  key: string
  label: string
  weight: number
  present: boolean
  source_domains: DomainKey[]
}

export interface RiskAssessment {
  score: number                // 0-100
  level: RiskLevel
  factors: RiskFactor[]
  generated_at: string
}

// ─── Case overview (for the queue) ──────────────────────────────────────────

export interface CaseOverview {
  citizen_id: string
  display_name: string
  risk_score: number | null
  risk_level: RiskLevel
  available_domains: DomainKey[]
  already_flagged: boolean
  no_action_taken: boolean
  scenario_key: string | null
}

/**
 * Judicial domain types.
 * Mirrors backend/src/datafusion/models/judicial.py
 */

// === Enums ===

export enum CaseDisposition {
  GUILTY = "guilty",
  NOT_GUILTY = "not_guilty",
  DISMISSED = "dismissed",
  PENDING = "pending",
  PLEA_DEAL = "plea_deal",
  SETTLED = "settled",
  JUDGMENT_PLAINTIFF = "judgment_plaintiff",
  JUDGMENT_DEFENDANT = "judgment_defendant",
}

export enum CrimeCategory {
  VIOLENT = "violent",
  PROPERTY = "property",
  DRUG = "drug",
  WHITE_COLLAR = "white_collar",
  TRAFFIC = "traffic",
  DOMESTIC = "domestic",
  SEX_OFFENSE = "sex_offense",
  OTHER = "other",
}

export enum CivilCaseType {
  CONTRACT_DISPUTE = "contract_dispute",
  PERSONAL_INJURY = "personal_injury",
  PROPERTY_DISPUTE = "property_dispute",
  EMPLOYMENT = "employment",
  DIVORCE = "divorce",
  CUSTODY = "custody",
  RESTRAINING_ORDER = "restraining_order",
  SMALL_CLAIMS = "small_claims",
  OTHER = "other",
}

export enum ViolationType {
  SPEEDING = "speeding",
  DUI = "dui",
  RECKLESS_DRIVING = "reckless_driving",
  RUNNING_RED_LIGHT = "running_red_light",
  ILLEGAL_PARKING = "illegal_parking",
  DRIVING_WITHOUT_LICENSE = "driving_without_license",
  HIT_AND_RUN = "hit_and_run",
  OTHER = "other",
}

// === Interfaces ===

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

export interface CriminalRecord {
  id: string;
  judicial_record_id: string;
  case_number: string;
  crime_category: CrimeCategory;
  charge_description: string;
  arrest_date: string;
  disposition_date: string | null;
  disposition: CaseDisposition;
  sentence_description: string | null;
  jail_time_days: number | null;
  probation_months: number | null;
  fine_amount: number | null;
  is_sealed: boolean;
  is_expunged: boolean;
  is_sensitive: boolean;
  created_at: string;
  updated_at: string;
}

export interface CivilCase {
  id: string;
  judicial_record_id: string;
  case_number: string;
  case_type: CivilCaseType;
  case_description: string;
  filed_date: string;
  closed_date: string | null;
  disposition: CaseDisposition;
  plaintiff_name: string;
  defendant_name: string;
  is_plaintiff: boolean;
  judgment_amount: number | null;
  is_sensitive: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrafficViolation {
  id: string;
  judicial_record_id: string;
  citation_number: string;
  violation_type: ViolationType;
  violation_description: string;
  violation_date: string;
  location: string;
  fine_amount: number;
  points: number;
  was_contested: boolean;
  is_paid: boolean;
  is_serious: boolean;
  created_at: string;
  updated_at: string;
}

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

export type DomainData = HealthRecord;

export interface NPCWithDomains {
  npc: NPCRead;
  domains: Partial<Record<DomainType, DomainData>>;
}

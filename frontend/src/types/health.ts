/**
 * Health domain types.
 * Mirrors backend/src/datafusion/models/health.py
 */

// === Enums ===

export enum Severity {
  MILD = "mild",
  MODERATE = "moderate",
  SEVERE = "severe",
}

// === Interfaces ===

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

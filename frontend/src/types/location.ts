/**
 * Location domain types.
 * Mirrors backend/src/datafusion/models/location.py
 */

// === Enums ===

export enum LocationType {
  WORKPLACE = "workplace",
  HOME = "home",
  FREQUENT_VISIT = "frequent_visit",
  ROMANTIC_INTEREST = "romantic_interest",
  FAMILY = "family",
  MEDICAL_FACILITY = "medical_facility",
  PLACE_OF_WORSHIP = "place_of_worship",
  ENTERTAINMENT = "entertainment",
  OTHER = "other",
}

export enum DayOfWeek {
  MONDAY = "monday",
  TUESDAY = "tuesday",
  WEDNESDAY = "wednesday",
  THURSDAY = "thursday",
  FRIDAY = "friday",
  SATURDAY = "saturday",
  SUNDAY = "sunday",
  WEEKDAYS = "weekdays",
  WEEKENDS = "weekends",
}

// === Interfaces ===

export interface LocationRecord {
  id: string;
  npc_id: string;
  tracking_enabled: boolean;
  data_retention_days: number;
  inferred_locations: InferredLocation[];
  created_at: string;
  updated_at: string;
}

export interface InferredLocation {
  id: string;
  location_record_id: string;
  location_type: LocationType;
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

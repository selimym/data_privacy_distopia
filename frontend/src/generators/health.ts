/**
 * Health record data generator for NPCs.
 * Generates health records, conditions, medications, and visits.
 */

import { faker } from '@faker-js/faker';

export enum Severity {
  MILD = "mild",
  MODERATE = "moderate",
  SEVERE = "severe",
}

export interface HealthCondition {
  condition_name: string;
  diagnosed_date: string; // ISO date string
  severity: Severity;
  is_chronic: boolean;
  is_sensitive: boolean;
}

export interface HealthMedication {
  medication_name: string;
  dosage: string;
  prescribed_date: string; // ISO date string
  is_sensitive: boolean;
}

export interface HealthVisit {
  visit_date: string; // ISO date string
  provider_name: string;
  reason: string;
  notes: string | null;
  is_sensitive: boolean;
}

export interface HealthRecordData {
  npc_id: string;
  insurance_provider: string;
  primary_care_physician: string;
  conditions: HealthCondition[];
  medications: HealthMedication[];
  visits: HealthVisit[];
}

// Reference data - loaded from JSON
let healthRef: any = null;

/**
 * Load health reference data from JSON file
 */
export async function loadHealthReference(): Promise<void> {
  const response = await fetch('/data/reference/health.json');
  healthRef = await response.json();
}

/**
 * Generate a date between two dates and return as ISO string
 */
function dateBetween(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = endDate === 'today' ? new Date() : new Date(endDate);
  const date = faker.date.between({ from: start, to: end });
  return date.toISOString().split('T')[0];
}

/**
 * Generate a date from relative time string (e.g., "-10y", "-1y", "-6m")
 */
function getRelativeDate(relative: string): Date {
  const now = new Date();
  const match = relative.match(/^-(\d+)([ymd])$/);
  if (!match) return now;

  const [, amount, unit] = match;
  const value = parseInt(amount, 10);

  if (unit === 'y') {
    now.setFullYear(now.getFullYear() - value);
  } else if (unit === 'm') {
    now.setMonth(now.getMonth() - value);
  } else if (unit === 'd') {
    now.setDate(now.getDate() - value);
  }

  return now;
}

/**
 * Generate a health record with conditions, medications, and visits.
 */
export function generateHealthRecord(npcId: string, seed?: number): HealthRecordData {
  if (!healthRef) {
    throw new Error('Health reference data not loaded. Call loadHealthReference() first.');
  }

  if (seed !== undefined) {
    faker.seed(seed);
  }

  const record: HealthRecordData = {
    npc_id: npcId,
    insurance_provider: faker.helpers.arrayElement(healthRef.insurance_providers) as string,
    primary_care_physician: `Dr. ${faker.person.lastName()}`,
    conditions: [],
    medications: [],
    visits: [],
  };

  const conditions: HealthCondition[] = [];

  // 40% chance of having common conditions
  if (Math.random() < 0.40) {
    const numCommon = faker.number.int({ min: 1, max: 3 });
    const commonConditions = faker.helpers.arrayElements(
      healthRef.common_conditions,
      Math.min(numCommon, healthRef.common_conditions.length)
    );

    for (const conditionName of commonConditions) {
      conditions.push({
        condition_name: conditionName as string,
        diagnosed_date: dateBetween(
          getRelativeDate('-10y').toISOString(),
          getRelativeDate('-1y').toISOString()
        ),
        severity: faker.helpers.arrayElement([Severity.MILD, Severity.MODERATE]),
        is_chronic: faker.helpers.arrayElement([true, false]),
        is_sensitive: false,
      });
    }
  }

  // 15% chance of having a sensitive condition
  if (Math.random() < 0.15) {
    const sensitiveCondition = faker.helpers.arrayElement(healthRef.sensitive_conditions);
    conditions.push({
      condition_name: sensitiveCondition as string,
      diagnosed_date: dateBetween(
        getRelativeDate('-8y').toISOString(),
        getRelativeDate('-6m').toISOString()
      ),
      severity: faker.helpers.arrayElement([Severity.MODERATE, Severity.SEVERE]),
      is_chronic: true,
      is_sensitive: true,
    });
  }

  record.conditions = conditions;

  // Generate medications for conditions
  for (const condition of conditions) {
    const conditionName = condition.condition_name;
    if (healthRef.condition_medications[conditionName]) {
      const medications = healthRef.condition_medications[conditionName];
      const medName = faker.helpers.arrayElement(medications);

      const dosages = ["10mg", "20mg", "50mg", "100mg", "5mg", "25mg"];

      record.medications.push({
        medication_name: medName as string,
        dosage: faker.helpers.arrayElement(dosages),
        prescribed_date: condition.diagnosed_date,
        is_sensitive: condition.is_sensitive,
      });
    }
  }

  // Generate visits (2-8 visits in past 3 years)
  const numVisits = faker.number.int({ min: 2, max: 8 });
  const visits: HealthVisit[] = [];

  for (let i = 0; i < numVisits; i++) {
    const isSensitive = Math.random() < 0.20;
    const visitReasons = isSensitive
      ? healthRef.sensitive_visit_reasons
      : healthRef.common_visit_reasons;

    const visitDate = dateBetween(getRelativeDate('-3y').toISOString(), 'today');

    visits.push({
      visit_date: visitDate,
      provider_name: `Dr. ${faker.person.lastName()}`,
      reason: faker.helpers.arrayElement(visitReasons) as string,
      notes: Math.random() < 0.30 ? faker.lorem.sentence() : null,
      is_sensitive: isSensitive,
    });
  }

  // Sort visits by date
  visits.sort((a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime());
  record.visits = visits;

  return record;
}

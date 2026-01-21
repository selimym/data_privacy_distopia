/**
 * Judicial record data generator for NPCs.
 * Generates criminal records, civil cases, and traffic violations.
 */

import { faker } from '@faker-js/faker';

export enum CrimeCategory {
  VIOLENT = "VIOLENT",
  PROPERTY = "PROPERTY",
  DRUG = "DRUG",
  WHITE_COLLAR = "WHITE_COLLAR",
  TRAFFIC = "TRAFFIC",
  DOMESTIC = "DOMESTIC",
  SEX_OFFENSE = "SEX_OFFENSE",
  OTHER = "OTHER",
}

export enum CivilCaseType {
  CONTRACT_DISPUTE = "CONTRACT_DISPUTE",
  PERSONAL_INJURY = "PERSONAL_INJURY",
  PROPERTY_DISPUTE = "PROPERTY_DISPUTE",
  EMPLOYMENT = "EMPLOYMENT",
  DIVORCE = "DIVORCE",
  CUSTODY = "CUSTODY",
  RESTRAINING_ORDER = "RESTRAINING_ORDER",
  SMALL_CLAIMS = "SMALL_CLAIMS",
  OTHER = "OTHER",
}

export enum ViolationType {
  SPEEDING = "SPEEDING",
  DUI = "DUI",
  RECKLESS_DRIVING = "RECKLESS_DRIVING",
  RUNNING_RED_LIGHT = "RUNNING_RED_LIGHT",
  ILLEGAL_PARKING = "ILLEGAL_PARKING",
  DRIVING_WITHOUT_LICENSE = "DRIVING_WITHOUT_LICENSE",
  HIT_AND_RUN = "HIT_AND_RUN",
  OTHER = "OTHER",
}

export enum CaseDisposition {
  GUILTY = "GUILTY",
  PLEA_DEAL = "PLEA_DEAL",
  DISMISSED = "DISMISSED",
  NOT_GUILTY = "NOT_GUILTY",
  SETTLED = "SETTLED",
  JUDGMENT_PLAINTIFF = "JUDGMENT_PLAINTIFF",
  JUDGMENT_DEFENDANT = "JUDGMENT_DEFENDANT",
  PENDING = "PENDING",
}

export interface CriminalRecordData {
  case_number: string;
  crime_category: CrimeCategory;
  charge_description: string;
  arrest_date: string; // ISO date string
  disposition_date: string; // ISO date string
  disposition: CaseDisposition;
  sentence_description: string | null;
  jail_time_days: number | null;
  probation_months: number | null;
  fine_amount: string | null; // Decimal as string
  is_sealed: boolean;
  is_expunged: boolean;
  is_sensitive: boolean;
}

export interface CivilCaseData {
  case_number: string;
  case_type: CivilCaseType;
  case_description: string;
  filed_date: string; // ISO date string
  closed_date: string | null; // ISO date string
  disposition: CaseDisposition;
  plaintiff_name: string;
  defendant_name: string;
  is_plaintiff: boolean;
  judgment_amount: string | null; // Decimal as string
  is_sensitive: boolean;
}

export interface TrafficViolationData {
  citation_number: string;
  violation_type: ViolationType;
  violation_description: string;
  violation_date: string; // ISO date string
  location: string;
  fine_amount: string; // Decimal as string
  points: number;
  was_contested: boolean;
  is_paid: boolean;
  is_serious: boolean;
}

export interface JudicialRecordData {
  npc_id: string;
  has_criminal_record: boolean;
  has_civil_cases: boolean;
  has_traffic_violations: boolean;
  criminal_records: CriminalRecordData[];
  civil_cases: CivilCaseData[];
  traffic_violations: TrafficViolationData[];
}

// Reference data - loaded from JSON
let judicialRef: any = null;

/**
 * Load judicial reference data from JSON file
 */
export async function loadJudicialReference(): Promise<void> {
  const response = await fetch('/data/reference/judicial.json');
  judicialRef = await response.json();
}

/**
 * Weighted random selection
 */
function weightedChoice<T>(items: T[], weights: number[]): T {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }

  return items[items.length - 1];
}

/**
 * Generate a date from relative time string (e.g., "-10y", "-1y", "-6m", "-90d")
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
 * Generate a date between two dates and return as ISO string
 */
function dateBetween(startDate: string | Date, endDate: string | Date): string {
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate === 'today' ? new Date() : (endDate instanceof Date ? endDate : new Date(endDate));
  const date = faker.date.between({ from: start, to: end });
  return date.toISOString().split('T')[0];
}

/**
 * Generate a judicial record with criminal records, civil cases, and traffic violations.
 */
export function generateJudicialRecord(npcId: string, seed?: number): JudicialRecordData {
  if (!judicialRef) {
    throw new Error('Judicial reference data not loaded. Call loadJudicialReference() first.');
  }

  if (seed !== undefined) {
    faker.seed(seed);
  }

  const record: JudicialRecordData = {
    npc_id: npcId,
    has_criminal_record: false,
    has_civil_cases: false,
    has_traffic_violations: false,
    criminal_records: [],
    civil_cases: [],
    traffic_violations: [],
  };

  // Criminal records (10% chance)
  if (Math.random() < 0.10) {
    record.has_criminal_record = true;
    const numRecords = faker.number.int({ min: 1, max: 2 });

    for (let i = 0; i < numRecords; i++) {
      const crimeCategory = faker.helpers.arrayElement(Object.values(CrimeCategory));
      const chargeDescription = faker.helpers.arrayElement(judicialRef.criminal_charges[crimeCategory]) as string;

      // Sensitive categories
      const isSensitive = [
        CrimeCategory.VIOLENT,
        CrimeCategory.DOMESTIC,
        CrimeCategory.SEX_OFFENSE,
      ].includes(crimeCategory);

      const arrestDate = dateBetween(getRelativeDate('-15y'), getRelativeDate('-1y'));
      const dispositionDate = dateBetween(new Date(arrestDate), 'today');

      // Most common dispositions
      const disposition = weightedChoice(
        [
          CaseDisposition.GUILTY,
          CaseDisposition.PLEA_DEAL,
          CaseDisposition.DISMISSED,
          CaseDisposition.NOT_GUILTY,
        ],
        [40, 30, 20, 10]
      );

      // Sentence details (if convicted)
      let sentenceDescription: string | null = null;
      let jailTimeDays: number | null = null;
      let probationMonths: number | null = null;
      let fineAmount: string | null = null;

      if ([CaseDisposition.GUILTY, CaseDisposition.PLEA_DEAL].includes(disposition)) {
        if ([CrimeCategory.VIOLENT, CrimeCategory.DRUG, CrimeCategory.SEX_OFFENSE].includes(crimeCategory)) {
          jailTimeDays = faker.number.int({ min: 30, max: 730 });
          probationMonths = faker.number.int({ min: 12, max: 60 });
          const fine = faker.number.int({ min: 500, max: 5000 });
          fineAmount = fine.toFixed(2);
          sentenceDescription = `${jailTimeDays} days jail, ${probationMonths} months probation`;
        } else {
          probationMonths = faker.number.int({ min: 6, max: 36 });
          const fine = faker.number.int({ min: 100, max: 2000 });
          fineAmount = fine.toFixed(2);
          sentenceDescription = `Probation ${probationMonths} months, fine $${fineAmount}`;
        }
      }

      // Sealing/expungement (20% chance for old, non-serious offenses)
      let isSealed = false;
      let isExpunged = false;
      if (disposition === CaseDisposition.DISMISSED || (!isSensitive && Math.random() < 0.20)) {
        isSealed = faker.helpers.arrayElement([true, false]);
        if (isSealed) {
          isExpunged = faker.helpers.arrayElement([true, false]);
        }
      }

      record.criminal_records.push({
        case_number: `CR-${faker.string.numeric({ length: 8, allowLeadingZeros: true })}`,
        crime_category: crimeCategory,
        charge_description: chargeDescription,
        arrest_date: arrestDate,
        disposition_date: dispositionDate,
        disposition,
        sentence_description: sentenceDescription,
        jail_time_days: jailTimeDays,
        probation_months: probationMonths,
        fine_amount: fineAmount,
        is_sealed: isSealed,
        is_expunged: isExpunged,
        is_sensitive: isSensitive,
      });
    }
  }

  // Civil cases (25% chance)
  if (Math.random() < 0.25) {
    record.has_civil_cases = true;
    const numCases = faker.number.int({ min: 1, max: 3 });

    for (let i = 0; i < numCases; i++) {
      const caseType = faker.helpers.arrayElement(Object.values(CivilCaseType));
      const caseDescription = faker.helpers.arrayElement(judicialRef.civil_case_descriptions[caseType]) as string;

      const filedDate = dateBetween(getRelativeDate('-10y'), getRelativeDate('-1m'));

      // 70% of cases are closed
      let closedDate: string | null = null;
      let disposition: CaseDisposition;

      if (Math.random() < 0.70) {
        closedDate = dateBetween(new Date(filedDate), 'today');
        disposition = faker.helpers.arrayElement([
          CaseDisposition.SETTLED,
          CaseDisposition.JUDGMENT_PLAINTIFF,
          CaseDisposition.JUDGMENT_DEFENDANT,
          CaseDisposition.DISMISSED,
        ]);
      } else {
        disposition = CaseDisposition.PENDING;
      }

      // Randomly determine if NPC is plaintiff or defendant
      const isPlaintiff = faker.helpers.arrayElement([true, false]);
      const plaintiffName = isPlaintiff ? "Self" : faker.person.fullName();
      const defendantName = isPlaintiff ? faker.person.fullName() : "Self";

      // Judgment amount (if applicable)
      let judgmentAmount: string | null = null;
      if ([
        CaseDisposition.JUDGMENT_PLAINTIFF,
        CaseDisposition.JUDGMENT_DEFENDANT,
        CaseDisposition.SETTLED,
      ].includes(disposition)) {
        const amount = faker.number.int({ min: 1000, max: 50000 });
        judgmentAmount = amount.toFixed(2);
      }

      // Sensitive case types
      const isSensitive = [
        CivilCaseType.DIVORCE,
        CivilCaseType.CUSTODY,
        CivilCaseType.RESTRAINING_ORDER,
      ].includes(caseType);

      record.civil_cases.push({
        case_number: `CV-${faker.string.numeric({ length: 8, allowLeadingZeros: true })}`,
        case_type: caseType,
        case_description: caseDescription,
        filed_date: filedDate,
        closed_date: closedDate,
        disposition,
        plaintiff_name: plaintiffName,
        defendant_name: defendantName,
        is_plaintiff: isPlaintiff,
        judgment_amount: judgmentAmount,
        is_sensitive: isSensitive,
      });
    }
  }

  // Traffic violations (40% chance)
  if (Math.random() < 0.40) {
    record.has_traffic_violations = true;
    const numViolations = faker.number.int({ min: 1, max: 4 });

    for (let i = 0; i < numViolations; i++) {
      const violationType = faker.helpers.arrayElement(Object.values(ViolationType));
      const violationDescription = faker.helpers.arrayElement(
        judicialRef.traffic_violation_descriptions[violationType]
      ) as string;

      const violationDate = dateBetween(getRelativeDate('-5y'), getRelativeDate('-1m'));
      const location = `${faker.location.streetAddress()}, ${faker.location.city()}`;

      // Fine amounts vary by violation type
      let fineAmount: number;
      let points: number;
      let isSerious: boolean;

      if (violationType === ViolationType.DUI) {
        fineAmount = faker.number.int({ min: 1000, max: 5000 });
        points = faker.number.int({ min: 6, max: 12 });
        isSerious = true;
      } else if ([ViolationType.RECKLESS_DRIVING, ViolationType.HIT_AND_RUN].includes(violationType)) {
        fineAmount = faker.number.int({ min: 500, max: 2000 });
        points = faker.number.int({ min: 4, max: 8 });
        isSerious = true;
      } else if (violationType === ViolationType.SPEEDING) {
        fineAmount = faker.number.int({ min: 100, max: 500 });
        points = faker.number.int({ min: 2, max: 4 });
        isSerious = false;
      } else {
        fineAmount = faker.number.int({ min: 50, max: 300 });
        points = faker.number.int({ min: 0, max: 2 });
        isSerious = false;
      }

      const wasContested = Math.random() < 0.15;
      const isPaid = Math.random() < 0.90;

      record.traffic_violations.push({
        citation_number: `TC-${faker.string.numeric({ length: 10, allowLeadingZeros: true })}`,
        violation_type: violationType,
        violation_description: violationDescription,
        violation_date: violationDate,
        location,
        fine_amount: fineAmount.toFixed(2),
        points,
        was_contested: wasContested,
        is_paid: isPaid,
        is_serious: isSerious,
      });
    }
  }

  return record;
}

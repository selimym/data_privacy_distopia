/**
 * Identity data generator for NPCs.
 * Generates basic identity data (name, SSN, DOB, address) using @faker-js/faker.
 */

import { faker } from '@faker-js/faker';
import { Role } from '../types/npc';

export const SPRITE_KEYS = [
  "citizen_male_01",
  "citizen_male_02",
  "citizen_male_03",
  "citizen_female_01",
  "citizen_female_02",
  "citizen_female_03",
  "doctor_male_01",
  "doctor_female_01",
  "nurse_female_01",
  "office_worker_male_01",
  "office_worker_female_01",
  "employee_01",
  "official_01",
  "analyst_01",
];

const ROLE_DISTRIBUTION: Record<Role, number> = {
  [Role.CITIZEN]: 0.90,
  [Role.ROGUE_EMPLOYEE]: 0.00, // Excluded for system mode
  [Role.HACKER]: 0.00, // Not used
  [Role.GOVERNMENT_OFFICIAL]: 0.03,
  [Role.DATA_ANALYST]: 0.07,
};

export const MAP_WIDTH = 50;
export const MAP_HEIGHT = 50;

export interface IdentityData {
  first_name: string;
  last_name: string;
  date_of_birth: string; // ISO date string
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
 * Generate a single NPC identity with realistic fake data.
 */
export function generateIdentity(seed?: number): IdentityData {
  if (seed !== undefined) {
    faker.seed(seed);
  }

  // Select role based on distribution (excluding ROGUE_EMPLOYEE for system mode)
  const roles = Object.keys(ROLE_DISTRIBUTION) as Role[];
  const weights = roles.map(role => ROLE_DISTRIBUTION[role]);
  const role = weightedChoice(roles, weights);

  // Generate date of birth (between 1940 and 2005)
  const birthYear = faker.number.int({ min: 1940, max: 2005 });
  const birthMonth = faker.number.int({ min: 1, max: 12 });
  const birthDay = faker.number.int({ min: 1, max: 28 });

  // Create ISO date string
  const dateOfBirth = new Date(birthYear, birthMonth - 1, birthDay);
  const dateString = dateOfBirth.toISOString().split('T')[0];

  return {
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    date_of_birth: dateString,
    ssn: faker.string.numeric({ length: 9, allowLeadingZeros: true }),
    street_address: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state({ abbreviated: true }),
    zip_code: faker.location.zipCode(),
    role,
    sprite_key: faker.helpers.arrayElement(SPRITE_KEYS),
    map_x: faker.number.int({ min: 0, max: MAP_WIDTH - 1 }),
    map_y: faker.number.int({ min: 0, max: MAP_HEIGHT - 1 }),
    is_scenario_npc: false,
    scenario_key: null,
  };
}

/**
 * Generate multiple NPC identities with deterministic output when seeded.
 */
export function generatePopulation(count: number, seed?: number): IdentityData[] {
  if (seed !== undefined) {
    faker.seed(seed);
  }

  const population: IdentityData[] = [];
  for (let i = 0; i < count; i++) {
    // Use incremental seeds if main seed provided
    const itemSeed = seed !== undefined ? seed + i : undefined;
    population.push(generateIdentity(itemSeed));
  }

  return population;
}

/**
 * Main entry point for all data generators.
 * Exports all generators and provides a generateFullPopulation function
 * that orchestrates the generation of complete citizen data.
 */

import { faker } from '@faker-js/faker';

// Export all generators
export * from './identity';
export * from './health';
export * from './finance';
export * from './judicial';
export * from './location';
export * from './social';
export * from './messages';
export * from './system-seed';

// Import for internal use
import {
  generateIdentity,
  type IdentityData,
} from './identity';
import {
  generateHealthRecord,
  loadHealthReference,
  type HealthRecordData,
} from './health';
import {
  generateFinanceRecord,
  loadFinanceReference,
  type FinanceRecordData,
} from './finance';
import {
  generateJudicialRecord,
  loadJudicialReference,
  type JudicialRecordData,
} from './judicial';
import {
  generateLocationRecord,
  type LocationRecordData,
} from './location';
import {
  generateSocialMediaRecord,
  loadSocialReference,
  type SocialMediaRecordData,
} from './social';
import {
  generateMessageHistory,
  type MessageRecordData,
} from './messages';
import {
  generateOperatorData,
  generateInitialDirectives,
  generateInitialMetrics,
  getNeighborhoodSeedData,
  getNewsChannelSeedData,
  type OperatorData,
  type DirectiveData,
  type OperatorMetricsData,
  type NeighborhoodData,
  type NewsChannelData,
} from './system-seed';

/**
 * Complete citizen data with all domains
 */
export interface CitizenData {
  identity: IdentityData;
  health: HealthRecordData;
  finance: FinanceRecordData;
  judicial: JudicialRecordData;
  location: LocationRecordData;
  social: SocialMediaRecordData;
  messages: MessageRecordData;
}

/**
 * Complete population data including citizens and system state
 */
export interface PopulationData {
  citizens: CitizenData[];
  operator: OperatorData;
  directives: DirectiveData[];
  metrics: OperatorMetricsData;
  neighborhoods: NeighborhoodData[];
  newsChannels: NewsChannelData[];
  seed: number;
  generatedAt: string;
}

/**
 * Load all reference data from JSON files.
 * Must be called before generating population data.
 */
export async function loadAllReferenceData(): Promise<void> {
  await Promise.all([
    loadHealthReference(),
    loadFinanceReference(),
    loadJudicialReference(),
    loadSocialReference(),
  ]);
}

/**
 * Generate a single citizen with all domain data.
 */
export function generateCitizen(citizenId: string, seed?: number): CitizenData {
  if (seed !== undefined) {
    faker.seed(seed);
  }

  // Generate identity first with the citizen ID
  const identity = generateIdentity(citizenId, seed);

  // Use the citizenId as npcId
  const npcId = citizenId;

  // Generate all domain records
  const health = generateHealthRecord(npcId, seed);
  const finance = generateFinanceRecord(npcId, seed);
  const judicial = generateJudicialRecord(npcId, seed);
  const location = generateLocationRecord(npcId, seed);
  const social = generateSocialMediaRecord(npcId, seed);

  // Determine message profile based on other data
  const hasMentalHealth = health.conditions.some(c => c.is_sensitive);
  const hasFinancialStress = finance.debts.some(d => d.is_delinquent) ||
                             parseInt(finance.credit_score.toString()) < 600;
  const isActivist = social.public_inferences.some(inf =>
    inf.inference_text.toLowerCase().includes('activist') ||
    inf.inference_text.toLowerCase().includes('protest')
  );

  const messages = generateMessageHistory(
    npcId,
    { hasMentalHealth, hasFinancialStress, isActivist },
    seed
  );

  return {
    identity,
    health,
    finance,
    judicial,
    location,
    social,
    messages,
  };
}

/**
 * Generate a full population with all citizen data and system state.
 *
 * @param numCitizens - Number of citizens to generate
 * @param seed - Random seed for deterministic generation (optional)
 * @returns Complete population data
 *
 * @example
 * ```typescript
 * // Load reference data first
 * await loadAllReferenceData();
 *
 * // Generate population
 * const population = await generateFullPopulation(50, 12345);
 * console.log(`Generated ${population.citizens.length} citizens`);
 * ```
 */
export async function generateFullPopulation(
  numCitizens: number,
  seed?: number
): Promise<PopulationData> {
  // Set master seed if provided
  if (seed !== undefined) {
    faker.seed(seed);
  }

  // Generate citizens
  const citizens: CitizenData[] = [];
  for (let i = 0; i < numCitizens; i++) {
    // Use incremental seed for each citizen if master seed provided
    const citizenSeed = seed !== undefined ? seed + i : undefined;
    const citizenId = `citizen-${i.toString().padStart(4, '0')}`;
    citizens.push(generateCitizen(citizenId, citizenSeed));
  }

  // Generate system state
  const operator = generateOperatorData(seed);
  const directives = generateInitialDirectives();
  const metrics = generateInitialMetrics(operator.id);
  const neighborhoods = getNeighborhoodSeedData();
  const newsChannels = getNewsChannelSeedData();

  return {
    citizens,
    operator,
    directives,
    metrics,
    neighborhoods,
    newsChannels,
    seed: seed ?? Date.now(),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Helper function to save population data to localStorage
 */
export function savePopulationToLocalStorage(
  population: PopulationData,
  key: string = 'game_population'
): void {
  try {
    const json = JSON.stringify(population);
    localStorage.setItem(key, json);
    console.log(`Saved population data to localStorage (${key})`);
  } catch (error) {
    console.error('Failed to save population to localStorage:', error);
    throw error;
  }
}

/**
 * Helper function to load population data from localStorage
 */
export function loadPopulationFromLocalStorage(
  key: string = 'game_population'
): PopulationData | null {
  try {
    const json = localStorage.getItem(key);
    if (!json) {
      return null;
    }
    const population = JSON.parse(json) as PopulationData;
    console.log(`Loaded population data from localStorage (${key})`);
    return population;
  } catch (error) {
    console.error('Failed to load population from localStorage:', error);
    return null;
  }
}

/**
 * Helper function to check if population data exists in localStorage
 */
export function hasPopulationInLocalStorage(
  key: string = 'game_population'
): boolean {
  return localStorage.getItem(key) !== null;
}

/**
 * Helper function to clear population data from localStorage
 */
export function clearPopulationFromLocalStorage(
  key: string = 'game_population'
): void {
  localStorage.removeItem(key);
  console.log(`Cleared population data from localStorage (${key})`);
}

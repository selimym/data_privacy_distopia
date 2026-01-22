/**
 * Population Initializer - Ensures GameStore is populated with citizen data
 *
 * This utility handles the initialization of game data by either:
 * 1. Loading existing data from GameStore (localStorage)
 * 2. Generating fresh population data using Faker.js generators
 *
 * Call `ensurePopulationLoaded()` before accessing NPCs or citizen data.
 */

import { gameStore } from '../state/GameStore';
import {
  loadAllReferenceData,
  generateFullPopulation,
  type CitizenData,
} from '../generators';
import type { NPCRead } from '../types';

/**
 * Configuration for population generation
 */
interface PopulationConfig {
  numCitizens: number;
  seed?: number;
  forceRegenerate?: boolean;
}

const DEFAULT_CONFIG: PopulationConfig = {
  numCitizens: 100,
  seed: undefined, // Random by default
  forceRegenerate: false,
};

/**
 * Ensure population data is loaded into GameStore.
 * If GameStore is empty, generates new population data.
 *
 * @param config - Configuration options
 * @returns Promise that resolves when population is ready
 *
 * @example
 * ```typescript
 * // In WorldScene or SystemDashboardScene
 * await ensurePopulationLoaded({ numCitizens: 50 });
 * const npcs = gameStore.getAllNPCs();
 * ```
 */
export async function ensurePopulationLoaded(
  config: Partial<PopulationConfig> = {}
): Promise<void> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Check if we should force regeneration
  if (finalConfig.forceRegenerate) {
    console.log('[PopulationInit] Force regenerating population...');
    await generateAndPopulate(finalConfig);
    return;
  }

  // Try to load existing data from localStorage
  const loaded = gameStore.load();
  if (loaded) {
    const stats = gameStore.getStats();
    console.log('[PopulationInit] Loaded existing population from localStorage:', stats);
    return;
  }

  // Check if GameStore has enough NPCs (consider it needs regeneration if less than expected)
  const existingNPCs = gameStore.getAllNPCs();
  if (existingNPCs.length >= finalConfig.numCitizens) {
    console.log(`[PopulationInit] Using ${existingNPCs.length} NPCs already in GameStore`);
    return;
  }

  // Generate new population (clear old data if any)
  console.log('[PopulationInit] Insufficient data found. Generating new population...');
  gameStore.clear(); // Clear any partial/old data
  await generateAndPopulate(finalConfig);
}

/**
 * Generate population data and populate GameStore
 */
async function generateAndPopulate(config: PopulationConfig): Promise<void> {
  const startTime = performance.now();

  // Load reference data (health conditions, finance categories, etc.)
  console.log('[PopulationInit] Loading reference data...');
  await loadAllReferenceData();

  // Generate full population
  console.log(`[PopulationInit] Generating ${config.numCitizens} citizens...`);
  const population = await generateFullPopulation(config.numCitizens, config.seed);

  // Populate GameStore
  console.log('[PopulationInit] Populating GameStore...');
  populateGameStore(population.citizens);

  // Set system state
  gameStore.setOperator(population.operator as any);
  population.directives.forEach(d => gameStore.addDirective(d as any));

  // Initialize metrics if provided
  if (population.metrics) {
    const metrics = population.metrics as any;
    if (metrics.publicMetrics) {
      gameStore.setPublicMetrics(metrics.publicMetrics);
    }
    if (metrics.reluctanceMetrics) {
      gameStore.setReluctanceMetrics(metrics.reluctanceMetrics);
    }
  }

  population.neighborhoods.forEach(n => gameStore.addNeighborhood(n as any));
  population.newsChannels.forEach(c => gameStore.addNewsChannel(c as any));

  // Save to localStorage
  gameStore.save();

  const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
  const stats = gameStore.getStats();
  console.log(`[PopulationInit] Population generated in ${elapsed}s:`, stats);
}

/**
 * Populate GameStore with citizen data
 */
function populateGameStore(citizens: CitizenData[]): void {
  for (const citizen of citizens) {
    // Add NPC (convert identity to NPCRead format)
    const timestamp = new Date().toISOString();
    const npc: NPCRead = {
      id: citizen.identity.npc_id,
      first_name: citizen.identity.first_name,
      last_name: citizen.identity.last_name,
      date_of_birth: citizen.identity.date_of_birth,
      ssn: citizen.identity.ssn,
      street_address: citizen.identity.street_address,
      city: citizen.identity.city,
      state: citizen.identity.state,
      zip_code: citizen.identity.zip_code,
      role: citizen.identity.role,
      sprite_key: citizen.identity.sprite_key,
      map_x: citizen.identity.map_x,
      map_y: citizen.identity.map_y,
      is_scenario_npc: citizen.identity.is_scenario_npc,
      scenario_key: citizen.identity.scenario_key,
      cached_risk_score: null,
      risk_score_updated_at: null,
      is_hospitalized: false,
      injury_from_action_id: null,
      created_at: timestamp,
      updated_at: timestamp,
    };
    gameStore.addNPC(npc);

    // Add domain records with proper IDs and timestamps
    // Reuse timestamp from above
    gameStore.addHealthRecord({
      ...citizen.health,
      id: `health-${citizen.identity.npc_id}`,
      created_at: timestamp,
      updated_at: timestamp,
    } as any);

    gameStore.addFinanceRecord({
      ...citizen.finance,
      id: `finance-${citizen.identity.npc_id}`,
      created_at: timestamp,
      updated_at: timestamp,
    } as any);

    gameStore.addJudicialRecord({
      ...citizen.judicial,
      id: `judicial-${citizen.identity.npc_id}`,
      created_at: timestamp,
      updated_at: timestamp,
    } as any);

    gameStore.addLocationRecord({
      ...citizen.location,
      id: `location-${citizen.identity.npc_id}`,
      created_at: timestamp,
      updated_at: timestamp,
    } as any);

    gameStore.addSocialRecord({
      ...citizen.social,
      id: `social-${citizen.identity.npc_id}`,
      created_at: timestamp,
      updated_at: timestamp,
    } as any);

    // Add messages - need to handle the nested structure properly
    if (citizen.messages && Array.isArray(citizen.messages.messages)) {
      citizen.messages.messages.forEach((msg, idx) => gameStore.addMessage({
        ...msg,
        id: `msg-${citizen.identity.npc_id}-${idx}`,
        npc_id: citizen.identity.npc_id,
      } as any));
    }
  }
}

/**
 * Clear all population data and regenerate
 */
export async function resetPopulation(config: Partial<PopulationConfig> = {}): Promise<void> {
  console.log('[PopulationInit] Resetting population...');
  gameStore.clear();
  await ensurePopulationLoaded({ ...config, forceRegenerate: true });
}

/**
 * Get population statistics
 */
export function getPopulationStats(): Record<string, number> {
  return gameStore.getStats();
}

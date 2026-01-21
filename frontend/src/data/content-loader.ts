// Content loader for static JSON data files
import type {
  HealthReferenceData,
  FinanceReferenceData,
  JudicialReferenceData,
  SocialReferenceData,
  RiskFactorsConfig,
  KeywordsConfig,
  CorrelationAlertsConfig,
  DirectivesData,
  OutcomesData,
  InferenceRulesData,
  MessagesData,
} from './content-types';

// Base path for all data files
const DATA_BASE_PATH = '/data';

/**
 * Generic fetch function for JSON files with error handling
 */
async function fetchJSON<T>(path: string): Promise<T> {
  try {
    const response = await fetch(path);

    if (!response.ok) {
      throw new Error(`Failed to fetch ${path}: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    console.error(`Error loading content from ${path}:`, error);
    throw error;
  }
}

// ==================== Reference Data Loaders ====================

/**
 * Load health reference data (conditions, medications, visit reasons, insurance providers)
 */
export async function loadHealthReference(): Promise<HealthReferenceData> {
  return fetchJSON<HealthReferenceData>(`${DATA_BASE_PATH}/reference/health.json`);
}

/**
 * Load finance reference data (employers, banks, creditors, merchants)
 */
export async function loadFinanceReference(): Promise<FinanceReferenceData> {
  return fetchJSON<FinanceReferenceData>(`${DATA_BASE_PATH}/reference/finance.json`);
}

/**
 * Load judicial reference data (criminal charges, civil cases, traffic violations)
 */
export async function loadJudicialReference(): Promise<JudicialReferenceData> {
  return fetchJSON<JudicialReferenceData>(`${DATA_BASE_PATH}/reference/judicial.json`);
}

/**
 * Load social reference data (public and private inferences)
 */
export async function loadSocialReference(): Promise<SocialReferenceData> {
  return fetchJSON<SocialReferenceData>(`${DATA_BASE_PATH}/reference/social.json`);
}

/**
 * Load all reference data at once
 */
export async function loadAllReferenceData(): Promise<{
  health: HealthReferenceData;
  finance: FinanceReferenceData;
  judicial: JudicialReferenceData;
  social: SocialReferenceData;
}> {
  const [health, finance, judicial, social] = await Promise.all([
    loadHealthReference(),
    loadFinanceReference(),
    loadJudicialReference(),
    loadSocialReference(),
  ]);

  return { health, finance, judicial, social };
}

// ==================== Config Data Loaders ====================

/**
 * Load risk factors configuration (weights, boundaries, thresholds)
 */
export async function loadRiskFactorsConfig(): Promise<RiskFactorsConfig> {
  return fetchJSON<RiskFactorsConfig>(`${DATA_BASE_PATH}/config/risk_factors.json`);
}

/**
 * Load keywords configuration (mental health, substances, protests, etc.)
 */
export async function loadKeywordsConfig(): Promise<KeywordsConfig> {
  return fetchJSON<KeywordsConfig>(`${DATA_BASE_PATH}/config/keywords.json`);
}

/**
 * Load correlation alerts configuration
 */
export async function loadCorrelationAlertsConfig(): Promise<CorrelationAlertsConfig> {
  return fetchJSON<CorrelationAlertsConfig>(`${DATA_BASE_PATH}/config/correlation_alerts.json`);
}

/**
 * Load all config data at once
 */
export async function loadAllConfigData(): Promise<{
  riskFactors: RiskFactorsConfig;
  keywords: KeywordsConfig;
  correlationAlerts: CorrelationAlertsConfig;
}> {
  const [riskFactors, keywords, correlationAlerts] = await Promise.all([
    loadRiskFactorsConfig(),
    loadKeywordsConfig(),
    loadCorrelationAlertsConfig(),
  ]);

  return { riskFactors, keywords, correlationAlerts };
}

// ==================== Game Content Loaders ====================

/**
 * Load directives (weekly assignments for system mode)
 */
export async function loadDirectives(): Promise<DirectivesData> {
  return fetchJSON<DirectivesData>(`${DATA_BASE_PATH}/directives.json`);
}

/**
 * Load outcome templates (consequences of flagging citizens)
 */
export async function loadOutcomes(): Promise<OutcomesData> {
  return fetchJSON<OutcomesData>(`${DATA_BASE_PATH}/outcomes.json`);
}

/**
 * Load inference rules (privacy-violating data correlations)
 */
export async function loadInferenceRules(): Promise<InferenceRulesData> {
  return fetchJSON<InferenceRulesData>(`${DATA_BASE_PATH}/inference_rules.json`);
}

/**
 * Load message templates (citizen communications)
 */
export async function loadMessages(): Promise<MessagesData> {
  return fetchJSON<MessagesData>(`${DATA_BASE_PATH}/messages.json`);
}

/**
 * Load all game content at once
 */
export async function loadAllGameContent(): Promise<{
  directives: DirectivesData;
  outcomes: OutcomesData;
  inferenceRules: InferenceRulesData;
  messages: MessagesData;
}> {
  const [directives, outcomes, inferenceRules, messages] = await Promise.all([
    loadDirectives(),
    loadOutcomes(),
    loadInferenceRules(),
    loadMessages(),
  ]);

  return { directives, outcomes, inferenceRules, messages };
}

// ==================== Complete Data Loader ====================

/**
 * Load all static content data at once
 */
export async function loadAllContent(): Promise<{
  reference: {
    health: HealthReferenceData;
    finance: FinanceReferenceData;
    judicial: JudicialReferenceData;
    social: SocialReferenceData;
  };
  config: {
    riskFactors: RiskFactorsConfig;
    keywords: KeywordsConfig;
    correlationAlerts: CorrelationAlertsConfig;
  };
  game: {
    directives: DirectivesData;
    outcomes: OutcomesData;
    inferenceRules: InferenceRulesData;
    messages: MessagesData;
  };
}> {
  const [reference, config, game] = await Promise.all([
    loadAllReferenceData(),
    loadAllConfigData(),
    loadAllGameContent(),
  ]);

  return { reference, config, game };
}

// ==================== Utility Functions ====================

/**
 * Preload all content data (useful for game initialization)
 */
export async function preloadAllContent(): Promise<void> {
  try {
    await loadAllContent();
    console.log('All content data preloaded successfully');
  } catch (error) {
    console.error('Failed to preload content data:', error);
    throw error;
  }
}

/**
 * Check if a specific data file is available
 */
export async function checkDataAvailability(path: string): Promise<boolean> {
  try {
    const response = await fetch(`${DATA_BASE_PATH}/${path}`);
    return response.ok;
  } catch {
    return false;
  }
}

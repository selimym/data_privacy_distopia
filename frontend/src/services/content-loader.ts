/**
 * Content Loader - Load JSON reference data for game services.
 * This replaces the Python content_loader.py for the frontend.
 */

// Cache for loaded content to avoid re-parsing
const contentCache: Map<string, any> = new Map();

/**
 * Load inference rules from JSON configuration.
 * In production, this would fetch from the backend or bundle the JSON.
 * For now, we'll define the structure and load from a static import.
 */
export async function loadInferenceRules(): Promise<any> {
  const cacheKey = 'inference_rules';
  if (contentCache.has(cacheKey)) {
    return contentCache.get(cacheKey);
  }

  // In a real implementation, this would be:
  // const response = await fetch('/data/inference_rules.json');
  // const data = await response.json();

  // For now, we'll return a promise that resolves to the rules
  // The actual rules will be bundled or fetched from the backend
  throw new Error('loadInferenceRules not yet implemented - rules should be fetched from backend');
}

/**
 * Load directives from JSON configuration.
 */
export async function loadDirectives(): Promise<any> {
  const cacheKey = 'directives';
  if (contentCache.has(cacheKey)) {
    return contentCache.get(cacheKey);
  }

  throw new Error('loadDirectives not yet implemented - directives should be fetched from backend');
}

/**
 * Load correlation alerts configuration.
 */
export async function loadCorrelationAlerts(): Promise<any> {
  const cacheKey = 'correlation_alerts';
  if (contentCache.has(cacheKey)) {
    return contentCache.get(cacheKey);
  }

  const response = await fetch('/data/config/correlation_alerts.json');
  if (!response.ok) {
    throw new Error(`Failed to load correlation alerts: ${response.statusText}`);
  }
  const data = await response.json();
  contentCache.set(cacheKey, data);
  return data;
}

/**
 * Load keywords configuration.
 */
export async function loadKeywords(): Promise<any> {
  const cacheKey = 'keywords';
  if (contentCache.has(cacheKey)) {
    return contentCache.get(cacheKey);
  }

  const response = await fetch('/data/config/keywords.json');
  if (!response.ok) {
    throw new Error(`Failed to load keywords: ${response.statusText}`);
  }
  const data = await response.json();
  contentCache.set(cacheKey, data);
  return data;
}

/**
 * Load risk factor weights configuration.
 */
export async function loadRiskFactorWeights(): Promise<any> {
  const cacheKey = 'risk_factor_weights';
  if (contentCache.has(cacheKey)) {
    return contentCache.get(cacheKey);
  }

  const response = await fetch('/data/config/risk_factors.json');
  if (!response.ok) {
    throw new Error(`Failed to load risk factors: ${response.statusText}`);
  }
  const data = await response.json();
  contentCache.set(cacheKey, data);
  return data;
}

/**
 * Clear the content cache.
 */
export function clearContentCache(): void {
  contentCache.clear();
}

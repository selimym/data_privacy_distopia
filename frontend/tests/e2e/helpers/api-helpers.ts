import { request, APIRequestContext } from '@playwright/test';

/**
 * Helper utilities for direct API interactions during tests.
 */

const API_BASE_URL = process.env.API_URL || 'http://localhost:8000';

/**
 * Create an API request context
 */
export async function createAPIContext(): Promise<APIRequestContext> {
  return await request.newContext({
    baseURL: API_BASE_URL,
  });
}

/**
 * Start a new System Mode session via API
 */
export async function startSystemModeSession(api: APIRequestContext): Promise<string> {
  const response = await api.post('/api/system/start', {
    data: {
      scenario_name: 'default',
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to start System Mode session: ${response.status()}`);
  }

  const data = await response.json();
  return data.operator_id;
}

/**
 * Get dashboard and cases data
 */
export async function getDashboardWithCases(
  api: APIRequestContext,
  operatorId: string
): Promise<any> {
  const response = await api.get('/api/system/dashboard-with-cases', {
    params: {
      operator_id: operatorId,
      case_limit: 20,
      case_offset: 0,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to get dashboard: ${response.status()}`);
  }

  return await response.json();
}

/**
 * Seed the database with test data via API (if endpoint exists)
 */
export async function seedDatabase(api: APIRequestContext, population = 50): Promise<void> {
  // This would require a seed endpoint in the backend
  // For now, this is a placeholder
  console.log(`Note: Database seeding should be done via 'make seed-db' before running tests`);
}

/**
 * Health check the backend API
 */
export async function healthCheck(api: APIRequestContext): Promise<boolean> {
  try {
    const response = await api.get('/health');
    return response.ok();
  } catch (error) {
    return false;
  }
}

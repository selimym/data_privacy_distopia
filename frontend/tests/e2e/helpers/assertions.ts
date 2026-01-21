import { Page, expect } from '@playwright/test';

/**
 * Custom game-specific assertions for E2E tests.
 */

/**
 * Assert that the System Mode dashboard is visible
 */
export async function assertDashboardVisible(page: Page) {
  // Check for dashboard UI elements (adjust selectors based on actual UI)
  const dashboard = page.locator('[data-testid="system-dashboard"], .system-dashboard');
  await expect(dashboard).toBeVisible({ timeout: 10000 });
}

/**
 * Assert that citizens are displayed in the queue
 */
export async function assertCitizensVisible(page: Page, minCount = 1) {
  // Look for citizen cards or list items (adjust selector as needed)
  const citizens = page.locator('[data-testid="citizen-case"], .citizen-card, .case-overview');

  // Wait for at least one citizen to appear
  await expect(citizens.first()).toBeVisible({ timeout: 10000 });

  // Check count
  const count = await citizens.count();
  expect(count).toBeGreaterThanOrEqual(minCount);
}

/**
 * Assert that no 500 errors occurred
 */
export async function assertNo500Errors(page: Page) {
  // Listen to console errors
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Check network responses
  page.on('response', (response) => {
    if (response.status() === 500) {
      errors.push(`500 error on ${response.url()}`);
    }
  });

  // Give some time for errors to appear
  await page.waitForTimeout(1000);

  // Assert no 500 errors
  const serverErrors = errors.filter((e) => e.includes('500') || e.includes('Internal Server Error'));
  expect(serverErrors.length).toBe(0);
}

/**
 * Assert that risk scores are displayed correctly
 */
export async function assertRiskScoresDisplayed(page: Page) {
  // Look for risk score elements (adjust selector as needed)
  const riskScores = page.locator('[data-testid="risk-score"], .risk-score');

  // Check that at least one risk score is visible
  await expect(riskScores.first()).toBeVisible({ timeout: 5000 });

  // Verify risk scores have numeric values
  const firstScore = await riskScores.first().textContent();
  expect(firstScore).toMatch(/\d+/); // Should contain numbers
}

/**
 * Assert that the game canvas is rendered
 */
export async function assertGameCanvasRendered(page: Page) {
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible({ timeout: 10000 });

  // Check that canvas has dimensions
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(0);
  expect(box!.height).toBeGreaterThan(0);
}

/**
 * Assert that an ending screen is displayed
 */
export async function assertEndingScreenVisible(page: Page) {
  const endingScreen = page.locator('[data-testid="ending-screen"], .ending-screen, .game-over');
  await expect(endingScreen).toBeVisible({ timeout: 15000 });
}

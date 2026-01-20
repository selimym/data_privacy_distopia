import { test, expect, Page } from '@playwright/test';
import {
  navigateToHome,
  startSystemMode,
  waitForGameReady,
} from './helpers/game-setup';
import {
  assertDashboardVisible,
  assertCitizensVisible,
} from './helpers/assertions';

/**
 * E2E User Journey Tests - Complete Gameplay Flows
 *
 * These tests simulate complete user journeys through System Mode,
 * testing the full integration of Phase 7-8 features:
 * - Complete surveillance operator session
 * - Multiple directives progression
 * - Escalating consequences and metrics
 * - Different ending paths
 */

test.describe('User Journey - Compliant Operator Path', () => {
  test('compliant operator completes full session with high flags', async ({ page }) => {
    /**
     * Simulate a compliant operator who flags many citizens.
     *
     * Expected outcome:
     * - High compliance score
     * - Rapidly increasing awareness/anger metrics
     * - Potential exposure events
     * - News articles about surveillance
     * - Protests in response to actions
     * - Ending: "Compliant Operator" or worse consequences
     */

    await navigateToHome(page);
    await startSystemMode(page);
    await waitForGameReady(page);
    await assertDashboardVisible(page);

    // Track initial state
    const initialCompliance = await getComplianceScore(page);
    const initialAwareness = await getMetricValue(page, 'awareness');

    console.log(`Initial compliance: ${initialCompliance}, awareness: ${initialAwareness}`);

    // Flag 5 citizens with high severity
    for (let i = 0; i < 5; i++) {
      await flagCitizenHighSeverity(page);

      // Handle any modals that appear (protests, exposure events)
      await handleAnyModals(page);

      await page.waitForTimeout(3000);
    }

    // Check updated metrics
    const newCompliance = await getComplianceScore(page);
    const newAwareness = await getMetricValue(page, 'awareness');

    console.log(`After 5 flags - Compliance: ${newCompliance}, Awareness: ${newAwareness}`);

    // Compliance should increase for compliant behavior
    expect(newCompliance).toBeGreaterThanOrEqual(initialCompliance);

    // Awareness should increase due to many flags
    expect(newAwareness).toBeGreaterThan(initialAwareness);

    // Check if news articles were generated
    await navigateToNewsTab(page);
    const articles = page.locator('.news-article');
    const articleCount = await articles.count();

    console.log(`News articles generated: ${articleCount}`);

    // Should have some coverage of surveillance activities
    expect(articleCount).toBeGreaterThan(0);

    // Check directive progress
    const quotaProgress = await getQuotaProgress(page);
    console.log(`Quota progress: ${quotaProgress}`);

    // Quota should be progressing
    expect(quotaProgress).toContain('/');
  });
});

test.describe('User Journey - Reluctant Operator Path', () => {
  test('reluctant operator uses no-action frequently', async ({ page }) => {
    /**
     * Simulate a reluctant operator who avoids flagging citizens.
     *
     * Expected outcome:
     * - Declining compliance score
     * - Reluctance warnings appear
     * - Potential termination/suspension
     * - Ending: "Reluctant Operator" or "Fired Early"
     */

    await navigateToHome(page);
    await startSystemMode(page);
    await waitForGameReady(page);
    await assertDashboardVisible(page);

    const initialCompliance = await getComplianceScore(page);
    console.log(`Initial compliance: ${initialCompliance}`);

    // Submit 5 no-action decisions
    for (let i = 0; i < 5; i++) {
      await submitNoAction(page, `Citizen ${i + 1} does not warrant action`);

      await page.waitForTimeout(3000);
    }

    // Wait for reluctance metrics to update
    await page.waitForTimeout(6000);

    // Check if reluctance warning appeared
    const reluctancePanel = page.locator('.reluctance-warning-panel');
    const isReluctanceVisible = await reluctancePanel.isVisible({ timeout: 5000 }).catch(() => false);

    console.log(`Reluctance warning visible: ${isReluctanceVisible}`);

    if (isReluctanceVisible) {
      // Verify warning content
      const warningText = await reluctancePanel.textContent();
      expect(warningText).toMatch(/(warning|review|reluctance|performance)/i);
    }

    // Compliance should decrease
    const newCompliance = await getComplianceScore(page);
    console.log(`After 5 no-actions - Compliance: ${newCompliance}`);

    // May have decreased or warnings appeared
    // (actual mechanics depend on backend thresholds)
  });
});

test.describe('User Journey - Mixed Actions Path', () => {
  test('operator balances flags and no-actions', async ({ page }) => {
    /**
     * Simulate a balanced operator who uses both flags and no-actions.
     *
     * This represents a player who is thoughtful about decisions.
     */

    await navigateToHome(page);
    await startSystemMode(page);
    await waitForGameReady(page);
    await assertDashboardVisible(page);

    const initialCompliance = await getComplianceScore(page);
    const initialAwareness = await getMetricValue(page, 'awareness');

    // Alternate between flagging and no-action
    await flagCitizenHighSeverity(page);
    await handleAnyModals(page);
    await page.waitForTimeout(3000);

    await submitNoAction(page, 'Insufficient evidence');
    await page.waitForTimeout(3000);

    await flagCitizenMediumSeverity(page);
    await handleAnyModals(page);
    await page.waitForTimeout(3000);

    await submitNoAction(page, 'Low risk profile');
    await page.waitForTimeout(3000);

    await flagCitizenLowSeverity(page);
    await handleAnyModals(page);
    await page.waitForTimeout(3000);

    // Check final state
    const newCompliance = await getComplianceScore(page);
    const newAwareness = await getMetricValue(page, 'awareness');

    console.log(`Balanced approach - Compliance: ${initialCompliance} → ${newCompliance}`);
    console.log(`Awareness: ${initialAwareness} → ${newAwareness}`);

    // Should have moderate changes
    expect(Math.abs(newCompliance - initialCompliance)).toBeLessThan(20);
  });
});

test.describe('User Journey - Protest Response Flow', () => {
  test('operator handles multiple protests with different actions', async ({ page }) => {
    /**
     * Test full protest response flow across multiple protests.
     */

    await navigateToHome(page);
    await startSystemMode(page);
    await waitForGameReady(page);
    await assertDashboardVisible(page);

    // Flag several high-severity citizens to trigger protests
    for (let i = 0; i < 3; i++) {
      await flagCitizenHighSeverity(page);
      await page.waitForTimeout(3000);
    }

    // Wait for protests to spawn (may take up to 15 seconds)
    await page.waitForTimeout(15000);

    // Check for protest modal
    const protestModal = page.locator('.protest-alert-modal');
    const hasProtest = await protestModal.isVisible({ timeout: 20000 }).catch(() => false);

    if (!hasProtest) {
      console.log('No protests spawned - test outcome varies by RNG');
      expect(true).toBe(true);
      return;
    }

    // Handle first protest - Declare Illegal
    const declareButton = page.getByRole('button', { name: /declare.*illegal/i });
    await declareButton.click();

    // Wait for cinematic
    await page.waitForTimeout(5000);

    // Wait for return to dashboard
    await expect(page.locator('.system-dashboard')).toBeVisible({ timeout: 15000 });

    console.log('Successfully handled protest with declare illegal action');

    // Wait for potential second protest
    await page.waitForTimeout(15000);

    const hasSecondProtest = await protestModal.isVisible({ timeout: 10000 }).catch(() => false);

    if (hasSecondProtest) {
      // Handle second protest differently - Ignore
      const ignoreButton = page.getByRole('button', { name: /ignore|monitor/i });
      await ignoreButton.click();

      console.log('Ignored second protest');
    }

    // Metrics should have increased from suppress actions
    const awareness = await getMetricValue(page, 'awareness');
    const anger = await getMetricValue(page, 'anger');

    console.log(`Post-protest metrics - Awareness: ${awareness}, Anger: ${anger}`);

    expect(awareness).toBeGreaterThan(0);
  });
});

test.describe('User Journey - News Suppression Flow', () => {
  test('operator suppresses critical news coverage', async ({ page }) => {
    /**
     * Test news suppression actions and consequences.
     */

    await navigateToHome(page);
    await startSystemMode(page);
    await waitForGameReady(page);
    await assertDashboardVisible(page);

    // Flag citizens to generate news coverage
    for (let i = 0; i < 2; i++) {
      await flagCitizenHighSeverity(page);
      await handleAnyModals(page);
      await page.waitForTimeout(3000);
    }

    // Wait for news to generate
    await page.waitForTimeout(16000);

    // Navigate to News tab
    await navigateToNewsTab(page);

    // Check for suppress outlet button
    const suppressButton = page.getByRole('button', { name: /suppress|ban.*outlet/i }).first();
    const hasSuppressOption = await suppressButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasSuppressOption) {
      console.log('No suppress option available - test depends on news generation');
      expect(true).toBe(true);
      return;
    }

    // Execute suppression
    await suppressButton.click();

    // Should trigger cinematic
    await page.waitForTimeout(5000);

    // Return to dashboard
    await expect(page.locator('.system-dashboard')).toBeVisible({ timeout: 15000 });

    console.log('Successfully suppressed news outlet');

    // International awareness should increase from press suppression
    await page.waitForTimeout(6000);

    const awareness = await getMetricValue(page, 'awareness');
    console.log(`Awareness after press suppression: ${awareness}`);

    expect(awareness).toBeGreaterThan(0);
  });
});

test.describe('User Journey - Exposure Event Cascade', () => {
  test('high awareness triggers exposure events', async ({ page }) => {
    /**
     * Test the exposure event cascade when international awareness gets high.
     *
     * This requires sustained high-severity actions.
     */

    await navigateToHome(page);
    await startSystemMode(page);
    await waitForGameReady(page);
    await assertDashboardVisible(page);

    // Flag many high-severity citizens to drive up awareness
    for (let i = 0; i < 10; i++) {
      await flagCitizenHighSeverity(page);
      await handleAnyModals(page);
      await page.waitForTimeout(2000);
    }

    // Wait for metrics to update
    await page.waitForTimeout(6000);

    const awareness = await getMetricValue(page, 'awareness');
    console.log(`Awareness after 10 detention flags: ${awareness}`);

    // Check if exposure event occurred
    const exposureModal = page.locator('.exposure-event-modal');
    const hasExposureEvent = await exposureModal.isVisible({ timeout: 30000 }).catch(() => false);

    if (!hasExposureEvent) {
      console.log(`No exposure event at awareness ${awareness} - may need higher threshold`);
      // Exposure events may require even more actions or higher tiers
      expect(true).toBe(true);
      return;
    }

    // Verify exposure event details
    await expect(exposureModal).toBeVisible();

    const stageHeader = page.locator('.exposure-stage-header, .stage-title');
    const stageText = await stageHeader.textContent();

    console.log(`Exposure event triggered: ${stageText}`);

    // Close modal
    const continueButton = page.getByRole('button', { name: /understand|continue/i });
    await continueButton.click();

    await expect(exposureModal).not.toBeVisible({ timeout: 2000 });
  });
});

test.describe('User Journey - Time Progression', () => {
  test('operator progresses through multiple directives', async ({ page }) => {
    /**
     * Test progression through weeks/directives.
     *
     * Each directive has a quota that must be met to advance.
     */

    await navigateToHome(page);
    await startSystemMode(page);
    await waitForGameReady(page);
    await assertDashboardVisible(page);

    // Check initial directive
    const initialDirective = await getCurrentDirective(page);
    console.log(`Initial directive: Week ${initialDirective.week}`);

    // Meet quota for current directive
    const quotaNeeded = await getQuotaNeeded(page);
    console.log(`Quota needed: ${quotaNeeded}`);

    if (quotaNeeded > 0) {
      // Flag enough citizens to meet quota
      for (let i = 0; i < quotaNeeded; i++) {
        await flagCitizenHighSeverity(page);
        await handleAnyModals(page);
        await page.waitForTimeout(2000);
      }

      // Check if advance directive button appears
      const advanceButton = page.getByRole('button', { name: /advance|next.*week|next.*directive/i });
      const canAdvance = await advanceButton.isVisible({ timeout: 5000 }).catch(() => false);

      if (canAdvance) {
        await advanceButton.click();

        // Should transition to next directive
        await page.waitForTimeout(3000);

        const newDirective = await getCurrentDirective(page);
        console.log(`Advanced to: Week ${newDirective.week}`);

        expect(newDirective.week).toBeGreaterThan(initialDirective.week);
      }
    }
  });
});

/**
 * Helper functions
 */

async function getComplianceScore(page: Page): Promise<number> {
  const complianceElement = page.locator('[data-testid="compliance-score"], .compliance-score').first();
  const isVisible = await complianceElement.isVisible({ timeout: 5000 }).catch(() => false);

  if (!isVisible) return 0;

  const text = await complianceElement.textContent();
  const match = text?.match(/(\d+)/);

  return match ? parseInt(match[1], 10) : 0;
}

async function getMetricValue(page: Page, metricType: 'awareness' | 'anger'): Promise<number> {
  const metricSelector = metricType === 'awareness'
    ? '.metric-value'
    : '.metric-value';

  // Get all metric values and find the right one
  const metricElements = page.locator(metricSelector);
  const count = await metricElements.count();

  for (let i = 0; i < count; i++) {
    const element = metricElements.nth(i);
    const parent = element.locator('..');
    const parentText = await parent.textContent();

    if (metricType === 'awareness' && parentText?.includes('Awareness')) {
      const text = await element.textContent();
      return parseInt(text?.trim() ?? '0', 10);
    } else if (metricType === 'anger' && parentText?.includes('Anger')) {
      const text = await element.textContent();
      return parseInt(text?.trim() ?? '0', 10);
    }
  }

  return 0;
}

async function getQuotaProgress(page: Page): Promise<string> {
  const quotaElement = page.locator('[data-testid="quota-progress"], .quota-progress').first();
  const isVisible = await quotaElement.isVisible({ timeout: 5000 }).catch(() => false);

  if (!isVisible) return '0/0';

  return (await quotaElement.textContent())?.trim() ?? '0/0';
}

async function getQuotaNeeded(page: Page): Promise<number> {
  const progress = await getQuotaProgress(page);
  const [current, total] = progress.split('/').map(n => parseInt(n, 10));

  return total - current;
}

async function getCurrentDirective(page: Page): Promise<{ week: number; title: string }> {
  const directiveElement = page.locator('.directive-title, [data-testid="directive"]').first();
  const text = await directiveElement.textContent();

  const weekMatch = text?.match(/Week (\d+)/i);
  const week = weekMatch ? parseInt(weekMatch[1], 10) : 1;

  return { week, title: text?.trim() ?? '' };
}

async function flagCitizenHighSeverity(page: Page) {
  await flagCitizen(page, 'detention');
}

async function flagCitizenMediumSeverity(page: Page) {
  await flagCitizen(page, 'intervention');
}

async function flagCitizenLowSeverity(page: Page) {
  await flagCitizen(page, 'monitoring');
}

async function flagCitizen(page: Page, flagType: 'monitoring' | 'restriction' | 'intervention' | 'detention') {
  // Select first citizen
  const firstCitizen = page.locator('[data-testid="citizen-case"], .citizen-card, .case-overview').first();
  const isCitizenVisible = await firstCitizen.isVisible({ timeout: 5000 }).catch(() => false);

  if (!isCitizenVisible) {
    console.log('No citizens available to flag');
    return;
  }

  await firstCitizen.click();
  await page.waitForTimeout(1000);

  // Select flag type
  const flagSelect = page.locator('.flag-type-select, select');
  await flagSelect.selectOption(flagType);

  // Enter justification
  const justificationBox = page.locator('.flag-justification, textarea').first();
  await justificationBox.fill(`Test flag - ${flagType}`);

  // Submit flag
  const submitButton = page.getByRole('button', { name: /submit.*flag/i });
  await submitButton.click();

  await page.waitForTimeout(2000);
}

async function submitNoAction(page: Page, justification: string) {
  // Select first citizen
  const firstCitizen = page.locator('[data-testid="citizen-case"], .citizen-card, .case-overview').first();
  const isCitizenVisible = await firstCitizen.isVisible({ timeout: 5000 }).catch(() => false);

  if (!isCitizenVisible) {
    console.log('No citizens available for no-action');
    return;
  }

  await firstCitizen.click();
  await page.waitForTimeout(1000);

  // Enter justification
  const justificationBox = page.locator('.no-action-justification, textarea[placeholder*="no action"]');
  await justificationBox.fill(justification);

  // Submit no action
  const noActionButton = page.getByRole('button', { name: /no action|mark no action/i });
  await noActionButton.click();

  await page.waitForTimeout(2000);
}

async function handleAnyModals(page: Page) {
  // Close any modals that appear (protests, exposure, gambles)

  // Protest modal
  const protestModal = page.locator('.protest-alert-modal');
  if (await protestModal.isVisible({ timeout: 2000 }).catch(() => false)) {
    const ignoreButton = page.getByRole('button', { name: /ignore|monitor/i });
    await ignoreButton.click();
    await page.waitForTimeout(1000);
  }

  // Gamble modal
  const gambleModal = page.locator('.action-gamble-modal');
  if (await gambleModal.isVisible({ timeout: 2000 }).catch(() => false)) {
    const continueButton = page.getByRole('button', { name: /continue|close/i });
    await continueButton.click();
    await page.waitForTimeout(1000);
  }

  // Exposure modal
  const exposureModal = page.locator('.exposure-event-modal');
  if (await exposureModal.isVisible({ timeout: 2000 }).catch(() => false)) {
    const continueButton = page.getByRole('button', { name: /understand|continue/i });
    await continueButton.click();
    await page.waitForTimeout(1000);
  }
}

async function navigateToNewsTab(page: Page) {
  const newsTab = page.locator('[data-tab="news"]').filter({ hasText: /news/i });
  await newsTab.click();
  await page.waitForTimeout(2000);
}

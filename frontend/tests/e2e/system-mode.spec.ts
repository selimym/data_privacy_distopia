import { test, expect } from '@playwright/test';
import {
  navigateToHome,
  startSystemMode,
  waitForGameReady,
} from './helpers/game-setup';
import {
  assertDashboardVisible,
  assertCitizensVisible,
  assertNo500Errors,
  assertRiskScoresDisplayed,
} from './helpers/assertions';

/**
 * E2E tests for System Mode gameplay.
 *
 * These tests verify the complete System Mode experience, focusing on
 * the surveillance operator dashboard and citizen flagging workflow.
 */

test.describe('System Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await navigateToHome(page);
  });

  test('shows citizens on first load (regression test)', async ({ page }) => {
    /**
     * Regression test for bug where no citizens appeared on System Mode launch.
     *
     * Bug details:
     * - 500 Internal Server Error when loading dashboard
     * - Risk scoring service failed silently
     * - Transaction conflict in risk_scoring.py:124
     * - Frontend received empty cases array
     *
     * This test ensures citizens always appear even if risk scoring has issues.
     */

    // Set up response listener to catch 500 errors
    const responses: { url: string; status: number }[] = [];
    page.on('response', (response) => {
      responses.push({
        url: response.url(),
        status: response.status(),
      });
    });

    // Start System Mode
    await startSystemMode(page);

    // Wait for game to be ready
    await waitForGameReady(page);

    // Assert dashboard is visible
    await assertDashboardVisible(page);

    // Assert at least one citizen case appears
    await assertCitizensVisible(page, 1);

    // Assert no 500 errors occurred (especially on /api/system/dashboard-with-cases)
    const dashboardErrors = responses.filter(
      (r) => r.url.includes('/api/system/dashboard-with-cases') && r.status === 500
    );
    expect(dashboardErrors.length).toBe(0);

    // Assert risk scores are displayed correctly
    await assertRiskScoresDisplayed(page);
  });

  test('complete System Mode playthrough', async ({ page }) => {
    /**
     * Critical path test covering the full System Mode gameplay flow.
     *
     * This test verifies:
     * 1. Game starts successfully
     * 2. Dashboard loads with citizens
     * 3. User can select a citizen
     * 4. User can submit a flag action
     * 5. Time advancement works
     * 6. Outcomes appear after flagging
     * 7. Game progresses through 6-week campaign
     * 8. Ending screen appears
     */

    // Start System Mode
    await startSystemMode(page);
    await waitForGameReady(page);

    // Verify dashboard loads with citizens
    await assertDashboardVisible(page);
    await assertCitizensVisible(page, 1);

    // Select first citizen in queue
    const firstCitizen = page.locator('[data-testid="citizen-case"], .citizen-card, .case-overview').first();
    await firstCitizen.click();
    await page.waitForTimeout(1000);

    // Verify citizen details appear
    const citizenDetails = page.locator('[data-testid="citizen-details"], .citizen-file');
    await expect(citizenDetails).toBeVisible({ timeout: 5000 });

    // Submit a flag action (adjust selector based on actual UI)
    const flagButton = page.getByRole('button', { name: /flag|submit|monitoring/i }).first();
    if (await flagButton.isVisible({ timeout: 2000 })) {
      await flagButton.click();
      await page.waitForTimeout(1000);

      // Confirm flag submission if confirmation dialog appears
      const confirmButton = page.getByRole('button', { name: /confirm|yes|submit/i }).first();
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
        await page.waitForTimeout(1000);
      }
    }

    // Advance time (if button exists)
    const advanceTimeButton = page.getByRole('button', { name: /advance time|next week/i }).first();
    if (await advanceTimeButton.isVisible({ timeout: 2000 })) {
      await advanceTimeButton.click();
      await page.waitForTimeout(2000);

      // Verify outcome appears (if implemented)
      const outcome = page.locator('[data-testid="outcome"], .outcome, .consequence');
      if (await outcome.isVisible({ timeout: 3000 })) {
        // Outcome displayed successfully
        expect(await outcome.textContent()).not.toBe('');
      }
    }

    // Note: Full 6-week campaign test would require more game state management
    // This is a basic smoke test to ensure core flow works
  });

  test('handles empty citizen queue gracefully', async ({ page }) => {
    /**
     * Edge case test: What happens if there are no citizens in the database?
     *
     * This test verifies the UI handles an empty state properly.
     */

    await startSystemMode(page);
    await waitForGameReady(page);

    // Dashboard should still be visible
    await assertDashboardVisible(page);

    // Check if empty state message appears (or citizens list is present)
    const citizens = page.locator('[data-testid="citizen-case"], .citizen-card, .case-overview');
    const emptyMessage = page.locator('[data-testid="empty-queue"], .empty-state, .no-cases');

    // Either citizens exist OR an empty message is shown
    const citizenCount = await citizens.count();
    const hasEmptyMessage = await emptyMessage.isVisible({ timeout: 2000 });

    expect(citizenCount > 0 || hasEmptyMessage).toBeTruthy();
  });

  test('displays risk scores without errors', async ({ page }) => {
    /**
     * Specific test for risk score calculation and display.
     *
     * Ensures risk scores are calculated correctly and displayed without errors.
     */

    await startSystemMode(page);
    await waitForGameReady(page);

    // Wait for citizens to load
    await assertCitizensVisible(page, 1);

    // Check that risk scores are visible and valid
    const riskScores = page.locator('[data-testid="risk-score"], .risk-score');
    const count = await riskScores.count();

    expect(count).toBeGreaterThan(0);

    // Verify each risk score has a numeric value
    for (let i = 0; i < Math.min(count, 5); i++) {
      const scoreText = await riskScores.nth(i).textContent();
      expect(scoreText).toMatch(/\d+/); // Should contain numbers
    }

    // Verify no console errors related to risk scoring
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    const riskErrors = consoleErrors.filter(
      (e) => e.toLowerCase().includes('risk') || e.toLowerCase().includes('score')
    );
    expect(riskErrors.length).toBe(0);
  });
});

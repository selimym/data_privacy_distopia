import { test, expect } from '@playwright/test'

/**
 * Test 20 — Inference Rules Editor stale-state regression
 *
 * Verifies that a player rule added via the pin-and-connect flow appears
 * immediately in the Inference Rules Editor without requiring the user to
 * close and reopen the modal.
 *
 * Root cause: InferenceRulesEditor initialised localRules with a lazy useState
 * initializer that ran only once at component mount. When inferenceRules updated
 * in contentStore, the editor showed the stale snapshot until handleClose reset
 * it — which is why close + reopen worked but first-open did not.
 */

test.describe('20 — Inference Rules Editor', () => {
  test('newly added player rule appears in editor on first open, no close-reopen needed', async ({ page }) => {
    // ── Navigate to the dashboard via the normal UI flow ─────────────────────
    await page.goto('/')
    await page.waitForSelector('[data-testid="start-screen"]', { timeout: 15000 })
    await page.locator('[data-testid="country-select-usa"]').click()
    await page.locator('[data-testid="begin-shift-btn"]').click()
    await page.waitForSelector('[data-testid="dashboard-header"]', { timeout: 30000 })
    await page.waitForFunction(
      () => {
        const w = window as unknown as Record<string, unknown>
        return typeof w.__stores === 'object' && w.__stores !== null
      },
      { timeout: 10000 },
    )

    // ── Add a player rule directly via the content store ────────────────────
    // (Bypasses the pin UI so the test stays focused on the editor bug)
    await page.evaluate(() => {
      const w = window as unknown as Record<string, Record<string, (r: unknown) => void>>
      w.__stores['content']()['addPlayerRule']({
        rule_key: 'player_rule_editor_test',
        name: 'Regression Test Rule',
        category: 'behavioral',
        scariness_level: 3,
        evidence_domains: ['health', 'finance'],
        evidence_keys: ['health_key', 'finance_key'],
        evidence_labels: ['Health indicator', 'Finance indicator'],
        origin: 'player',
        created_at_week: 1,
      })
    })

    // ── Select a citizen so the inference panel (and its editor button) render
    await page.waitForSelector('[data-testid^="view-citizen-btn-"]', { timeout: 10000 })
    await page.locator('[data-testid^="view-citizen-btn-"]').first().click()
    await page.waitForSelector('[data-testid="inference-panel"]', { timeout: 5000 })

    // ── Open the inference rules editor ─────────────────────────────────────
    await page.click('[data-testid="open-inference-rules-editor"]')

    // ── The new rule must be visible on first open (regression guard) ────────
    await expect(
      page.locator('[data-testid="inference-rule-row-player_rule_editor_test"]'),
    ).toBeVisible({ timeout: 5000 })
  })
})

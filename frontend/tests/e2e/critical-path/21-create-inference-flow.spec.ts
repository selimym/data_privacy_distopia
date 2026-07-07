import { test, expect } from '@playwright/test'

/**
 * Test 21 — Create-inference flow (pin → connect → register) via the real UI
 *
 * The core mechanic of the progressive-inference-automation feature. Unlike
 * test 20 (which injects a rule through the store to isolate the editor),
 * this walks the actual player journey in week 1:
 *
 *   select citizen → pin a flagged location → switch to Judicial tab →
 *   pin a case → Connect → name the pattern → set threat level → register
 *   → the new rule immediately evaluates against the current citizen and
 *     appears in the inference panel with the YOUR RULE origin badge.
 *
 * The citizen is chosen by scanning the queue for one with BOTH a flagged
 * location and a judicial case — the combination that guarantees the new
 * rule matches immediately (PlayerRuleEvaluator requires every evidence
 * domain to have concerning data). If no such citizen exists in the week-1
 * queue, the core mechanic is unreachable in week 1 — a real content bug —
 * so the test fails loudly.
 */

test.describe('21 — Create inference flow', () => {
  test('pin two domains, connect, register — rule appears with YOUR RULE badge', async ({ page }) => {
    // ── Boot to dashboard ────────────────────────────────────────────────────
    await page.goto('/')
    await page.waitForSelector('[data-testid="start-screen"]', { timeout: 15000 })
    await page.locator('[data-testid="country-select-usa"]').click()
    await page.locator('[data-testid="begin-shift-btn"]').click()
    await page.waitForSelector('[data-testid="dashboard-header"]', { timeout: 30000 })

    // ── Find a citizen with a flagged location AND a judicial case ──────────
    await page.waitForSelector('[data-testid^="view-citizen-btn-"]', { timeout: 10000 })
    const citizenButtons = page.locator('[data-testid^="view-citizen-btn-"]')
    const count = await citizenButtons.count()

    let found = false
    for (let i = 0; i < count; i++) {
      await citizenButtons.nth(i).click()
      await page.waitForSelector('[data-testid="citizen-panel"]', { timeout: 5000 })

      await page.locator('[data-testid="tab-location"]').click()
      const hasFlaggedLocation = await page
        .locator('[data-testid="pin-location-flagged-0"]')
        .isVisible()
        .catch(() => false)
      if (!hasFlaggedLocation) continue

      await page.locator('[data-testid="tab-judicial"]').click()
      const hasJudicialCase = await page
        .locator('[data-testid="pin-judicial-case-0"]')
        .isVisible()
        .catch(() => false)
      if (!hasJudicialCase) continue

      found = true
      break
    }
    expect(
      found,
      'no week-1 citizen has both a flagged location and a judicial case — pin→connect mechanic unreachable',
    ).toBe(true)

    // ── Pin one data point in each domain ────────────────────────────────────
    await page.locator('[data-testid="tab-location"]').click()
    await page.locator('[data-testid="pin-location-flagged-0"]').click()

    await page.locator('[data-testid="tab-judicial"]').click()
    await page.locator('[data-testid="pin-judicial-case-0"]').click()

    // ── Connect bar appears only with pins from 2+ domains ──────────────────
    const connectBtn = page.locator('[data-testid="connect-evidence-btn"]')
    await expect(connectBtn).toBeVisible({ timeout: 5000 })
    await connectBtn.click()

    // ── Pattern Registry modal: name, threat level, register ────────────────
    await page.waitForSelector('[data-testid="create-inference-modal"]', { timeout: 5000 })
    await page.locator('[data-testid="inference-name-input"]').fill('E2E Location-Judicial Pattern')
    await page.locator('[data-testid="threat-level-3"]').click()
    await page.locator('[data-testid="save-inference-btn"]').click()

    // ── Modal closes; rule evaluates against current citizen immediately ────
    await expect(page.locator('[data-testid="create-inference-modal"]')).toBeHidden({
      timeout: 5000,
    })

    const panel = page.locator('[data-testid="inference-panel"]')
    await expect(panel.getByText('E2E Location-Judicial Pattern')).toBeVisible({ timeout: 5000 })
    await expect(
      panel.locator('[data-testid^="inference-origin-badge-"]', { hasText: 'YOUR RULE' }).first(),
    ).toBeVisible({ timeout: 5000 })

    // ── Rule persisted to the active ruleset (applies to future citizens) ───
    const inStore = await page.evaluate(() => {
      const w = window as unknown as Record<string, Record<string, () => { inferenceRules: Array<{ name: string; origin?: string }> }>>
      const rules = w.__stores['content']().inferenceRules
      return rules.some(r => r.name === 'E2E Location-Judicial Pattern' && r.origin === 'player')
    })
    expect(inStore).toBe(true)
  })
})

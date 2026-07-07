import { test, expect } from '@playwright/test'

/**
 * Test 22 — ML pipeline absorbs player rules (system rule visible to the player)
 *
 * Proves the full progressive-automation chain to the pixels: a player rule
 * exists → autoflag is live → advancing the directive derives a system rule →
 * a citizen matching it shows the derived "Cohort Model" inference with the
 * ML PIPELINE origin badge.
 *
 * Store-injection is used to ARRANGE the week-5 state (per testing-game-flows
 * skill) — playing 5 real weeks here would add minutes for no extra signal.
 * The assertion still goes through the real UI.
 */

test.describe('22 — System rule absorption', () => {
  test('derived Cohort Model rule appears with ML PIPELINE badge after advance', async ({ page }) => {
    // ── Boot to dashboard ────────────────────────────────────────────────────
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

    // ── Arrange: player rule on week-1 domains, then advance through the real
    // weeks. Entering week 5 fires the autoflag contract (_fireContractEvent
    // sets is_available), and the same advance derives the system rules.
    // Land on week 6 (review type) so the citizen queue is back (week 5 is sweep).
    await page.evaluate(() => {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const w = window as any
      w.__stores['content']().addPlayerRule({
        rule_key: 'player_rule_absorption_test',
        name: 'Absorption Test Pattern',
        category: 'behavioral',
        scariness_level: 3,
        evidence_domains: ['location', 'judicial'],
        evidence_keys: ['loc_0', 'jud_0'],
        evidence_labels: ['Flagged location', 'Judicial case'],
        origin: 'player',
        created_at_week: 1,
      })
      const directives = w.__stores['content']().scenario.directives
      for (const week of [2, 3, 4, 5, 6]) {
        const next = directives.find((d: { week_number: number }) => d.week_number === week)
        w.__stores['game']().advanceDirective(next)
        w.__stores['ui']().closeModal()
      }
    })

    // ── Derived system rule must exist in the active ruleset ────────────────
    const derivedKey = 'system_player_rule_absorption_test'
    const hasDerived = await page.evaluate(
      (key) => {
        const w = window as unknown as Record<string, Record<string, () => { inferenceRules: Array<{ rule_key: string; origin?: string }> }>>
        return w.__stores['content']().inferenceRules.some(r => r.rule_key === key && r.origin === 'system')
      },
      derivedKey,
    )
    expect(hasDerived, 'advanceDirective did not derive a system rule from the player rule').toBe(true)

    // ── Find a citizen the derived rule fires on (flagged location + judicial)
    await page.waitForSelector('[data-testid^="view-citizen-btn-"]', { timeout: 10000 })
    const citizenButtons = page.locator('[data-testid^="view-citizen-btn-"]')
    const count = await citizenButtons.count()

    let found = false
    for (let i = 0; i < count; i++) {
      await citizenButtons.nth(i).click()
      await page.waitForSelector('[data-testid="inference-panel"]', { timeout: 5000 })
      const badge = page.locator(`[data-testid="inference-origin-badge-${derivedKey}"]`)
      if (await badge.isVisible().catch(() => false)) {
        found = true
        break
      }
    }
    expect(
      found,
      'no citizen in the queue triggers the derived system rule — ML PIPELINE badge unreachable',
    ).toBe(true)

    // ── The player sees the machine's version of their own pattern ──────────
    const panel = page.locator('[data-testid="inference-panel"]')
    await expect(panel.getByText('Cohort Model', { exact: false }).first()).toBeVisible()
    await expect(
      panel.locator(`[data-testid="inference-origin-badge-${derivedKey}"]`),
    ).toHaveText('ML PIPELINE')
  })
})

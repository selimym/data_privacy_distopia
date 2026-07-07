import { test, expect } from '@playwright/test'

/**
 * Test 11 — Ending Screen Statistics
 *
 * Verifies that after completing the full game loop, the ending screen
 * renders with the statistics panel showing total flag counts.
 */

test.describe('11 — Ending Screen', () => {
  test('should display statistics on ending screen', async ({ page }) => {
    // ── Navigate to app ────────────────────────────────────────────────────
    await page.goto('/')
    await page.waitForFunction(
      () => typeof (window as unknown as Record<string, unknown>).__initializeGame === 'function',
      { timeout: 15000 },
    )

    // ── Initialize game headlessly ────────────────────────────────────────
    await page.evaluate(() =>
      (window as unknown as Record<string, () => Promise<void>>).__initializeGame('usa', 'SYS-OP-001'),
    )

    await page.waitForFunction(
      () => {
        const w = window as unknown as Record<string, unknown>
        return typeof w.__stores === 'object' && w.__stores !== null
      },
      { timeout: 10000 },
    )

    // ── Helpers ────────────────────────────────────────────────────────────
    const getDirectiveInfo = () =>
      page.evaluate(() => {
        const w = window as unknown as Record<string, Record<string, () => unknown>>
        const state = w.__stores['game']() as Record<string, unknown>
        const d = state['currentDirective'] as Record<string, unknown>
        return { key: d['directive_key'] as string, quota: d['flag_quota'] as number }
      })

    const submitFlag = (citizenId: string) =>
      page.evaluate((id: string) => {
        const w = window as unknown as Record<string, Record<string, (a: unknown, b: unknown, c: unknown) => void>>
        w.__stores['game']()['submitFlag'](id, 'monitoring', 'ending stats test')
      }, citizenId)

    const getCitizenId = (idx: number) =>
      page.evaluate((i: number) => {
        const w = window as unknown as Record<string, Record<string, () => unknown>>
        const state = w.__stores['citizens']() as Record<string, unknown>
        return (state['skeletons'] as Array<Record<string, unknown>>)[i]!['id'] as string
      }, idx)

    const advanceDirective = (next: Record<string, unknown> | null) =>
      page.evaluate((n: Record<string, unknown> | null) => {
        const w = window as unknown as Record<string, Record<string, (d: unknown) => void>>
        w.__stores['game']()['advanceDirective'](n)
      }, next)

    const getAllDirectives = () =>
      page.evaluate(() => {
        const w = window as unknown as Record<string, Record<string, () => unknown>>
        const scenario = (w.__stores['content']() as Record<string, unknown>)['scenario'] as Record<string, unknown>
        const directives = scenario['directives'] as Array<Record<string, unknown>>
        return [...directives].sort((a, b) => (a['week_number'] as number) - (b['week_number'] as number))
      })

    // ── Run full game loop ─────────────────────────────────────────────────
    const directives = await getAllDirectives()
    let citizenIdx = 0

    for (let w = 0; w < 8; w++) {
      const info = await getDirectiveInfo()
      const isSweep = (directives[w] as Record<string, unknown>)['directive_type'] === 'sweep'
      if (!isSweep) {
        for (let f = 0; f < info.quota; f++) {
          const cid = await getCitizenId(citizenIdx++)
          await submitFlag(cid)
        }
      }
      await advanceDirective(w < 7 ? directives[w + 1]! : null)
    }

    // ── Wait for ending screen to appear ─────────────────────────────────
    await page.waitForFunction(
      () => {
        const w = window as unknown as Record<string, Record<string, () => unknown>>
        return (w.__stores['ui']() as Record<string, unknown>)['currentScreen'] === 'ending'
      },
      { timeout: 5000 },
    )

    // ── Ending screen should be rendered in DOM ────────────────────────────
    await page.waitForSelector('[data-testid="ending-screen"]', { timeout: 10000 })
    await expect(page.locator('[data-testid="ending-screen"]')).toBeVisible()

    // ── Statistics panel should be visible ────────────────────────────────
    await expect(page.locator('[data-testid="statistics-panel"]')).toBeVisible()

    // ── Narrative display should be visible ───────────────────────────────
    await expect(page.locator('[data-testid="narrative-display"]')).toBeVisible()

    // ── Verify total flags shown (18 = 2+2+3+3+2+3+3, week 5 sweep skipped) ──
    const totalFlags = await page.evaluate(() => {
      const w = window as unknown as Record<string, Record<string, () => unknown>>
      return ((w.__stores['game']() as Record<string, unknown>)['flags'] as unknown[]).length
    })
    expect(totalFlags).toBe(18)

    // ── Statistics panel should contain the flag count as text ────────────
    const statsText = await page.locator('[data-testid="statistics-panel"]').textContent()
    expect(statsText).toMatch(/18|eighteen/i)
  })
})

import { test, expect } from '@playwright/test'

/**
 * Phase 5 — Core Game Loop E2E Test
 *
 * Drives the full 8-week directive loop headlessly via window.__stores and
 * window.__initializeGame. No UI elements are relied upon.
 *
 * Week structure (new 8-week arc):
 *   Week 1: review, quota 2
 *   Week 2: review, quota 2  (health contract fires)
 *   Week 3: review, quota 3  (finance contract fires)
 *   Week 4: review, quota 3  (pattern expansion)
 *   Week 5: sweep,  quota 20 (neighborhood sweep — advance without raids)
 *   Week 6: review, quota 2  (messages contract fires, Hamza appears)
 *   Week 7: review, quota 3
 *   Week 8: review, quota 3  (Jessica in normal queue)
 *
 * Total review flags: 2+2+3+3+0+2+3+3 = 18
 */

test.describe('Phase 5 — Core Game Loop', () => {
  test('full directive loop: week 1→8, contract events, autoflag, ending', async ({ page }) => {
    // ── Navigate to the app ──────────────────────────────────────────────────
    await page.goto('/')

    // ── Wait for React to mount and DEV globals to be available ─────────────
    await page.waitForFunction(
      () => typeof (window as unknown as Record<string, unknown>).__initializeGame === 'function',
      { timeout: 15000 },
    )

    // ── Initialize the game ──────────────────────────────────────────────────
    await page.evaluate(() =>
      (window as unknown as Record<string, () => Promise<void>>).__initializeGame('usa', 'SYS-OP-001'),
    )

    // ── Wait for stores to be available ──────────────────────────────────────
    await page.waitForFunction(
      () => {
        const w = window as unknown as Record<string, unknown>
        return typeof w.__stores === 'object' && w.__stores !== null
      },
      { timeout: 10000 },
    )

    // ── Verify week 1 is initialised ─────────────────────────────────────────
    const weekNumber = await page.evaluate(() => {
      const w = window as unknown as Record<string, Record<string, () => unknown>>
      return (w.__stores['game']() as Record<string, unknown>)['weekNumber']
    })
    expect(weekNumber).toBe(1)

    // ── Helper: get a citizen ID ──────────────────────────────────────────────
    const getCitizenId = async (index: number): Promise<string> =>
      page.evaluate((idx: number) => {
        const w = window as unknown as Record<string, Record<string, () => unknown>>
        const state = w.__stores['citizens']() as Record<string, unknown>
        const skeletons = state['skeletons'] as Array<Record<string, unknown>>
        return skeletons[idx]!['id'] as string
      }, index)

    // ── Helper: get current directive key and quota ───────────────────────────
    const getDirectiveInfo = async (): Promise<{ key: string; quota: number; week: number; type: string }> =>
      page.evaluate(() => {
        const w = window as unknown as Record<string, Record<string, () => unknown>>
        const state = w.__stores['game']() as Record<string, unknown>
        const d = state['currentDirective'] as Record<string, unknown>
        return {
          key: d['directive_key'] as string,
          quota: d['flag_quota'] as number,
          week: d['week_number'] as number,
          type: (d['directive_type'] as string | undefined) ?? 'review',
        }
      })

    // ── Helper: submit one flag ───────────────────────────────────────────────
    const submitFlag = async (citizenId: string): Promise<void> =>
      page.evaluate((id: string) => {
        const w = window as unknown as Record<string, Record<string, (a: unknown, b: unknown, c: unknown) => void>>
        w.__stores['game']()['submitFlag'](id, 'monitoring', 'test justification')
      }, citizenId)

    // ── Helper: get all directives sorted by week ─────────────────────────────
    const getDirectives = async (): Promise<Array<Record<string, unknown>>> =>
      page.evaluate(() => {
        const w = window as unknown as Record<string, Record<string, () => unknown>>
        const state = w.__stores['content']() as Record<string, unknown>
        const scenario = state['scenario'] as Record<string, unknown>
        const directives = scenario['directives'] as Array<Record<string, unknown>>
        return [...directives].sort(
          (a, b) => (a['week_number'] as number) - (b['week_number'] as number),
        )
      })

    // ── Helper: advance to next directive ─────────────────────────────────────
    const advanceToDirective = async (
      nextDirective: Record<string, unknown> | null,
    ): Promise<void> =>
      page.evaluate(
        (next: Record<string, unknown> | null) => {
          const w = window as unknown as Record<
            string,
            Record<string, (d: unknown) => void>
          >
          w.__stores['game']()['advanceDirective'](next)
        },
        nextDirective,
      )

    // ── Get all directives ────────────────────────────────────────────────────
    const directives = await getDirectives()
    expect(directives).toHaveLength(8)
    expect((directives[0] as Record<string, unknown>)['week_number']).toBe(1)
    expect((directives[7] as Record<string, unknown>)['week_number']).toBe(8)

    let citizenPoolIndex = 0
    const getNextCitizen = async (): Promise<string> => {
      const id = await getCitizenId(citizenPoolIndex)
      citizenPoolIndex++
      return id
    }

    // ────────────────────────────────────────────────────────────────────────
    // WEEK 1: quota = 2 (review)
    // ────────────────────────────────────────────────────────────────────────
    const week1Info = await getDirectiveInfo()
    expect(week1Info.week).toBe(1)
    expect(week1Info.quota).toBe(2)
    expect(week1Info.type).toBe('review')

    for (let i = 0; i < week1Info.quota; i++) {
      await submitFlag(await getNextCitizen())
    }

    await advanceToDirective(directives[1]!)

    // Contract event for week 2 (health) should have fired
    const firedAfterWeek1 = await page.evaluate(() => {
      const w = window as unknown as Record<string, Record<string, () => unknown>>
      return (w.__stores['game']() as Record<string, unknown>)['firedContractKeys']
    })
    expect(firedAfterWeek1).toContain('2')

    const week2Number = await page.evaluate(() => {
      const w = window as unknown as Record<string, Record<string, () => unknown>>
      return (w.__stores['game']() as Record<string, unknown>)['weekNumber']
    })
    expect(week2Number).toBe(2)

    // ────────────────────────────────────────────────────────────────────────
    // WEEK 2: quota = 2 (review, health data unlocked)
    // ────────────────────────────────────────────────────────────────────────
    const week2Info = await getDirectiveInfo()
    expect(week2Info.week).toBe(2)
    expect(week2Info.type).toBe('review')

    for (let i = 0; i < week2Info.quota; i++) {
      await submitFlag(await getNextCitizen())
    }

    await advanceToDirective(directives[2]!)

    // ────────────────────────────────────────────────────────────────────────
    // WEEK 3: quota = 3 (review, finance data unlocked)
    // ────────────────────────────────────────────────────────────────────────
    const week3Info = await getDirectiveInfo()
    expect(week3Info.week).toBe(3)
    expect(week3Info.type).toBe('review')

    for (let i = 0; i < week3Info.quota; i++) {
      await submitFlag(await getNextCitizen())
    }

    await advanceToDirective(directives[3]!)

    // ────────────────────────────────────────────────────────────────────────
    // WEEK 4: pattern expansion directive — review, quota 3
    // ────────────────────────────────────────────────────────────────────────
    const week4Info = await getDirectiveInfo()
    expect(week4Info.week).toBe(4)
    expect(week4Info.type).toBe('review')

    for (let i = 0; i < week4Info.quota; i++) {
      await submitFlag(await getNextCitizen())
    }

    await advanceToDirective(directives[4]!)

    // ────────────────────────────────────────────────────────────────────────
    // WEEK 5: neighborhood sweep — advance without raids (shortfall ok for test)
    // ────────────────────────────────────────────────────────────────────────
    const week5Info = await getDirectiveInfo()
    expect(week5Info.week).toBe(5)
    expect(week5Info.type).toBe('sweep')

    const autoFlagAvailable = await page.evaluate(() => {
      const w = window as unknown as Record<string, Record<string, () => unknown>>
      const state = w.__stores['game']() as Record<string, unknown>
      const autoFlagState = state['autoFlagState'] as Record<string, unknown>
      return autoFlagState['is_available']
    })
    expect(autoFlagAvailable).toBe(true)

    await advanceToDirective(directives[5]!)

    // ────────────────────────────────────────────────────────────────────────
    // WEEK 6: quota = 2 (review, messages contract fires)
    // ────────────────────────────────────────────────────────────────────────
    const week6Info = await getDirectiveInfo()
    expect(week6Info.week).toBe(6)
    expect(week6Info.type).toBe('review')

    for (let i = 0; i < week6Info.quota; i++) {
      await submitFlag(await getNextCitizen())
    }

    await advanceToDirective(directives[6]!)

    // ────────────────────────────────────────────────────────────────────────
    // WEEK 7: quota = 3 (review — loyalty assessment)
    // ────────────────────────────────────────────────────────────────────────
    const week7Info = await getDirectiveInfo()
    expect(week7Info.week).toBe(7)
    expect(week7Info.type).toBe('review')

    for (let i = 0; i < week7Info.quota; i++) {
      await submitFlag(await getNextCitizen())
    }

    await advanceToDirective(directives[7]!)

    // ────────────────────────────────────────────────────────────────────────
    // WEEK 8: quota = 3 — Jessica in normal queue alongside other citizens
    // ────────────────────────────────────────────────────────────────────────
    const week8Info = await getDirectiveInfo()
    expect(week8Info.week).toBe(8)
    expect(week8Info.quota).toBe(3)

    for (let i = 0; i < week8Info.quota; i++) {
      await submitFlag(await getNextCitizen())
    }

    // Advance with null → triggers game over
    await advanceToDirective(null)

    // Verify ending screen
    await page.waitForFunction(
      () => {
        const w = window as unknown as Record<string, Record<string, () => unknown>>
        const uiState = w.__stores['ui']() as Record<string, unknown>
        return uiState['currentScreen'] === 'ending'
      },
      { timeout: 5000 },
    )

    const finalScreen = await page.evaluate(() => {
      const w = window as unknown as Record<string, Record<string, () => unknown>>
      return (w.__stores['ui']() as Record<string, unknown>)['currentScreen']
    })
    expect(finalScreen).toBe('ending')

    const completedKeys = await page.evaluate(() => {
      const w = window as unknown as Record<string, Record<string, () => unknown>>
      return (w.__stores['game']() as Record<string, unknown>)['completedDirectiveKeys']
    })
    // All 8 directives completed
    expect((completedKeys as string[]).length).toBe(8)

    const totalFlags = await page.evaluate(() => {
      const w = window as unknown as Record<string, Record<string, () => unknown>>
      const state = w.__stores['game']() as Record<string, unknown>
      return (state['flags'] as unknown[]).length
    })
    // Total flags: 2+2+3+3+0(sweep)+2+3+3 = 18
    expect(totalFlags).toBe(18)
  })
})

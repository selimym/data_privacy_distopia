---
name: testing-game-flows
description: Use when writing tests for this game, adding a new mechanic or content, changing week/directive structure, or when a bug report says something is unreachable, never appears, never unlocks, or a button stays disabled — even though nothing crashes.
---

# Testing Game Flows

## Overview

Bugs in this game are rarely crashes. They are **unreachable states**: a mechanic gated behind content that never generates, a button that never enables, an ending no input sequence can trigger, a rule that never matches any citizen. Manual testing misses these because you'd have to play 45+ minutes per check.

**Core principle: for every feature, test reachability, not just correctness.** "The function works when called" is not the bug class here; "no player can ever cause it to be called" is.

## Choosing the Test Level

| Level | Use for | Pattern file |
|---|---|---|
| Unit (Vitest) | Pure services (`services/` has no store imports — trivially testable) | existing `tests/unit/*.test.ts` |
| Store (Vitest) | Zustand wiring between stores/services. Mock persistence (IndexedDB doesn't exist in Node) — copy the `vi.mock('@/stores/persistence', …)` header from `gameStore.submitFlag.test.ts` | same |
| E2E (Playwright) | Anything a player must be able to *reach* | `tests/e2e/critical-path/NN-name.spec.ts` |

Every new mechanic gets all three: unit test of the service, store test of the wiring, one E2E journey. If the mechanic depends on *generated content* (Faker citizens, queue composition), add a reachability guard too.

## The Three E2E Patterns

**1. Journey test** — drive the real UI end to end (see `21-create-inference-flow.spec.ts`). Citizen data is randomized per run, so *scan* for a suitable subject instead of assuming index 0:

```ts
for (let i = 0; i < count; i++) {
  await citizenButtons.nth(i).click()
  if (await page.locator('[data-testid="pin-judicial-case-0"]').isVisible().catch(() => false)) { found = true; break }
}
expect(found, 'mechanic unreachable in week-1 queue — content bug').toBe(true)
```
The scan doubles as a reachability guard: if no generated citizen can exercise the mechanic, the test fails with a message naming the real problem.

**2. Reachability guard** — assert the content/state supports the mechanic at all (see `17-week-progression.spec.ts` "no soft-lock: each week has enough queue entries to meet quota"). Ask of every feature: *"what must exist for a player to ever see this?"* — then assert that it exists every week it's supposed to.

**3. Store-injection setup** — reach deep-game states without playing 5 weeks. All stores are exposed on `window.__stores` (used by `20-inference-rules-editor.spec.ts`):

```ts
await page.evaluate(() => {
  const w = window as unknown as Record<string, Record<string, (r: unknown) => void>>
  w.__stores['content']()['addPlayerRule']({ /* … */ })
})
```
Use injection to *arrange*, never to *assert the journey*: at least one test per mechanic must reach it through real clicks, or you've only proven the store works, not that a player can get there.

## Boot Sequence (copy verbatim)

```ts
await page.goto('/')
await page.waitForSelector('[data-testid="start-screen"]', { timeout: 15000 })
await page.locator('[data-testid="country-select-usa"]').click()
await page.locator('[data-testid="begin-shift-btn"]').click()
await page.waitForSelector('[data-testid="dashboard-header"]', { timeout: 30000 })
```

## Commands

```bash
make test-unit                                   # Vitest
make test-critical                               # critical-path E2E (must pass before PR)
cd frontend && npx vitest run tests/unit/X.test.ts        # single unit file — MUST run from frontend/ (aliases break at repo root)
cd frontend && npx playwright test tests/e2e/critical-path/NN-x.spec.ts --repeat-each=3   # flake check for randomness-dependent tests
```

## Common Mistakes

| Mistake | Fix |
|---|---|
| Running vitest from repo root | `@/` aliases silently fail — always `cd frontend` first |
| `waitForTimeout(n)` | Wait on state: a selector, `toBeHidden`, or `waitForFunction` on `__stores` |
| Assuming citizen N has the needed data | Randomized per run — scan the queue, guard with a named failure |
| Only store-injection tests | Proves logic, not reachability — add one real-clicks journey |
| Weak assertions (`count() > 0` on a generic selector) | Assert specific text/testids you created (`'YOUR RULE'`, exact rule name) |
| New interactive element without `data-testid` | Required by CLAUDE.md; E2E depends on it |
| Testing a new mechanic only at the week it unlocks by playing there | Store-inject the unlock state (`autoFlagState.is_available` etc.), then journey-test the mechanic |

## When a Playtest Finds an "Unreachable" Bug

Reproduce it as a failing reachability guard **first** (superpowers:test-driven-development applies to bug fixes), then fix. The guard stays and protects every future content change — this is how the suite gradually covers what you currently test by hand.

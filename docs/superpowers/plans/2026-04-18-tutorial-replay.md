# Tutorial Replay & Always-Show Memo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the tutorial/memo flow so the intro memo always shows on every new game, the tutorial plays only on the first game, and returning players can replay the tutorial from the country selection screen. Also auto-select the top-risk citizen when the tutorial reaches the center panel.

**Architecture:** Separate `tutorialComplete` (localStorage-persisted) from `memoAcknowledged` (always resets to `false`). Add in-memory `tutorialRequested` flag set from StartScreen after `initializeGame` resolves. TutorialOverlay auto-selects the first citizen using the same queue + sort logic as CitizenQueue.

**Tech Stack:** React 18, TypeScript (strict), Zustand 5, Vitest (unit tests), Playwright (E2E)

---

## File Map

| File | Change |
|------|--------|
| `frontend/src/stores/uiStore.ts` | New `TUTORIAL_KEY`, new state fields, updated actions |
| `frontend/tests/unit/uiStore.tutorial.test.ts` | New unit test file |
| `frontend/src/components/StartScreen/StartScreen.tsx` | "REPLAY ONBOARDING" toggle button |
| `frontend/src/components/SystemDashboard/TutorialOverlay/TutorialOverlay.tsx` | Auto-select citizen at step 1 |

---

## Task 0: Create feature branch

- [ ] **Create and switch to branch**

```bash
git checkout -b feature/tutorial-replay
```

---

## Task 1: uiStore — add type declarations (enables test file to compile)

**Files:**
- Modify: `frontend/src/stores/uiStore.ts`

These changes are the minimal scaffold needed so the test file can be written without TypeScript errors. Action implementations come in Task 2.

- [ ] **Step 1: Add `TUTORIAL_KEY` constant**

In `uiStore.ts`, after line `const MEMO_KEY = 'civic-harmony-memo-acknowledged'`, add:

```typescript
const TUTORIAL_KEY = 'civic-harmony-tutorial-complete'
```

- [ ] **Step 2: Add new fields to `UIState` interface**

In the `UIState` interface, after `skipTutorial: () => void`, add:

```typescript
  // Tutorial completion tracking — persisted in localStorage
  tutorialComplete: boolean
  requestTutorial: () => void

  // In-memory flag: set from StartScreen to force tutorial replay
  tutorialRequested: boolean
```

- [ ] **Step 3: Add new fields to `initialState`**

In `initialState`, change `memoAcknowledged` and add two new fields:

```typescript
  memoAcknowledged: false,                                            // was: localStorage.getItem(MEMO_KEY) === 'true'
  tutorialStep: null as number | null,
  tutorialComplete: localStorage.getItem(TUTORIAL_KEY) === 'true',   // new
  tutorialRequested: false,                                            // new
```

- [ ] **Step 4: Add stub implementations** (real logic in Task 2; stubs satisfy TypeScript)

In the store `create()` call, add after `skipTutorial`:

```typescript
  requestTutorial: () => {},
```

---

## Task 2: uiStore — write failing unit tests

**Files:**
- Create: `frontend/tests/unit/uiStore.tutorial.test.ts`

- [ ] **Step 1: Create the test file**

```typescript
import { beforeEach, describe, it, expect } from 'vitest'
import { useUIStore } from '@/stores/uiStore'

// localStorage is polyfilled by tests/unit/setup.ts

function resetStore() {
  localStorage.clear()
  useUIStore.setState({
    memoAcknowledged: false,
    tutorialStep: null,
    tutorialComplete: false,
    tutorialRequested: false,
  })
}

describe('uiStore — tutorial & memo', () => {
  beforeEach(() => {
    resetStore()
  })

  describe('memoAcknowledged', () => {
    it('resets to false even when localStorage memo key is set', () => {
      localStorage.setItem('civic-harmony-memo-acknowledged', 'true')
      useUIStore.setState({ memoAcknowledged: true })
      useUIStore.getState().reset()
      expect(useUIStore.getState().memoAcknowledged).toBe(false)
    })
  })

  describe('acknowledgeMemo', () => {
    it('sets tutorialStep to 0 when tutorialComplete is false', () => {
      useUIStore.getState().acknowledgeMemo()
      expect(useUIStore.getState().tutorialStep).toBe(0)
      expect(useUIStore.getState().memoAcknowledged).toBe(true)
    })

    it('leaves tutorialStep null when tutorialComplete is true and tutorialRequested is false', () => {
      useUIStore.setState({ tutorialComplete: true, tutorialRequested: false })
      useUIStore.getState().acknowledgeMemo()
      expect(useUIStore.getState().tutorialStep).toBe(null)
    })

    it('sets tutorialStep to 0 when tutorialComplete is true but tutorialRequested is true', () => {
      useUIStore.setState({ tutorialComplete: true, tutorialRequested: true })
      useUIStore.getState().acknowledgeMemo()
      expect(useUIStore.getState().tutorialStep).toBe(0)
      expect(useUIStore.getState().tutorialRequested).toBe(false)
    })
  })

  describe('skipTutorial', () => {
    it('clears tutorialStep, marks tutorialComplete true, writes to localStorage', () => {
      useUIStore.setState({ tutorialStep: 2 })
      useUIStore.getState().skipTutorial()
      expect(useUIStore.getState().tutorialStep).toBe(null)
      expect(useUIStore.getState().tutorialComplete).toBe(true)
      expect(localStorage.getItem('civic-harmony-tutorial-complete')).toBe('true')
    })
  })

  describe('requestTutorial', () => {
    it('sets tutorialRequested to true', () => {
      useUIStore.getState().requestTutorial()
      expect(useUIStore.getState().tutorialRequested).toBe(true)
    })
  })

  describe('reset', () => {
    it('always resets memoAcknowledged to false', () => {
      useUIStore.setState({ memoAcknowledged: true })
      useUIStore.getState().reset()
      expect(useUIStore.getState().memoAcknowledged).toBe(false)
    })

    it('re-reads tutorialComplete from localStorage at reset time', () => {
      localStorage.setItem('civic-harmony-tutorial-complete', 'true')
      useUIStore.getState().reset()
      expect(useUIStore.getState().tutorialComplete).toBe(true)
    })

    it('preserves tutorialRequested across reset', () => {
      useUIStore.setState({ tutorialRequested: true })
      useUIStore.getState().reset()
      expect(useUIStore.getState().tutorialRequested).toBe(true)
    })
  })
})
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd /home/selim/data_privacy_distopia && make test-unit 2>&1 | tail -30
```

Expected: tests in `uiStore.tutorial.test.ts` fail (stub actions don't implement the real behavior yet).

---

## Task 3: uiStore — implement actions and commit

**Files:**
- Modify: `frontend/src/stores/uiStore.ts`

- [ ] **Step 1: Replace `acknowledgeMemo` with real implementation**

```typescript
  acknowledgeMemo: () => {
    localStorage.setItem(MEMO_KEY, 'true')
    const { tutorialComplete, tutorialRequested } = get()
    const startTutorial = !tutorialComplete || tutorialRequested
    set({ memoAcknowledged: true, tutorialStep: startTutorial ? 0 : null, tutorialRequested: false })
  },
```

- [ ] **Step 2: Replace `skipTutorial` with real implementation**

```typescript
  skipTutorial: () => {
    localStorage.setItem(TUTORIAL_KEY, 'true')
    set({ tutorialStep: null, tutorialComplete: true })
  },
```

- [ ] **Step 3: Replace `requestTutorial` stub with real implementation**

```typescript
  requestTutorial: () => set({ tutorialRequested: true }),
```

- [ ] **Step 4: Replace `reset` with real implementation**

```typescript
  reset: () => set({
    ...initialState,
    memoAcknowledged: false,
    tutorialComplete: localStorage.getItem(TUTORIAL_KEY) === 'true',
    tutorialRequested: get().tutorialRequested,
  }),
```

- [ ] **Step 5: Run unit tests — confirm all pass**

```bash
cd /home/selim/data_privacy_distopia && make test-unit 2>&1 | tail -30
```

Expected: all tests pass including the new `uiStore.tutorial.test.ts` suite.

- [ ] **Step 6: Commit**

```bash
cd /home/selim/data_privacy_distopia
git add frontend/src/stores/uiStore.ts frontend/tests/unit/uiStore.tutorial.test.ts
git commit -m "$(cat <<'EOF'
feat: separate tutorial-complete flag from memo-acknowledged

- memoAcknowledged always resets to false so memo shows every new game
- New civic-harmony-tutorial-complete localStorage key tracks tutorial completion
- requestTutorial() in-memory flag lets StartScreen trigger replay
- skipTutorial() now persists tutorial-complete to localStorage

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: StartScreen — add replay tutorial button

**Files:**
- Modify: `frontend/src/components/StartScreen/StartScreen.tsx`

- [ ] **Step 1: Add store hooks and local state**

Alongside the existing hooks at the top of the `StartScreen` component body, add:

```typescript
  const tutorialComplete = useUIStore(s => s.tutorialComplete)
  const requestTutorial = useUIStore(s => s.requestTutorial)
  const [replayTutorial, setReplayTutorial] = useState(false)
```

- [ ] **Step 2: Call `requestTutorial()` in `handleBeginShift`**

Inside `handleBeginShift`, after `await initializeGame(selectedKey, 'SYS-OP-001')` and before `setScreen('dashboard')`:

```typescript
      await initializeGame(selectedKey, 'SYS-OP-001')
      if (replayTutorial) requestTutorial()
      setScreen('dashboard')
```

- [ ] **Step 3: Add the replay button to JSX**

In the `bottomStyle` div, after the endings archive button block, add:

```tsx
          {tutorialComplete && (
            <button
              data-testid="replay-tutorial-btn"
              type="button"
              onClick={() => setReplayTutorial(r => !r)}
              style={{
                marginTop: 8,
                background: 'transparent',
                border: `1px solid ${replayTutorial ? 'rgba(5, 150, 105, 0.5)' : 'rgba(255,255,255,0.15)'}`,
                color: replayTutorial ? 'var(--color-green)' : '#6b7280',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                letterSpacing: '0.15em',
                textTransform: 'uppercase' as const,
                padding: '10px 28px',
                cursor: 'pointer',
                borderRadius: 2,
                transition: 'border-color 0.15s, color 0.15s',
                display: 'block',
                width: '100%',
              }}
            >
              {replayTutorial ? '✓ REPLAY ONBOARDING' : 'REPLAY ONBOARDING'}
            </button>
          )}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd /home/selim/data_privacy_distopia/frontend && npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /home/selim/data_privacy_distopia
git add frontend/src/components/StartScreen/StartScreen.tsx
git commit -m "$(cat <<'EOF'
feat: add replay onboarding toggle to country selection screen

Shows only when tutorial has been completed. Toggles on/off visually
before starting the game, then calls requestTutorial() after initializeGame.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: TutorialOverlay — auto-select top-risk citizen at center panel

**Files:**
- Modify: `frontend/src/components/SystemDashboard/TutorialOverlay/TutorialOverlay.tsx`

- [ ] **Step 1: Add imports**

At the top of the file, alongside the existing store imports, add:

```typescript
import { useContentStore } from '@/stores/contentStore'
import { useGameStore } from '@/stores/gameStore'
```

- [ ] **Step 2: Add store hooks inside the component**

Inside `TutorialOverlay()`, alongside the existing hooks:

```typescript
  const setSelectedCitizen = useUIStore(s => s.setSelectedCitizen)
  const getFilteredCaseQueue = useGameStore(s => s.getFilteredCaseQueue)
  const unlockedDomains = useContentStore(s => s.unlockedDomains)
```

- [ ] **Step 3: Add `useEffect` for auto-select**

After the existing `useEffect` that resets `tipReady`/`isDone` on step change, add:

```typescript
  useEffect(() => {
    if (tutorialStep !== 1) return
    const queue = getFilteredCaseQueue(unlockedDomains)
    const sorted = [...queue].sort((a, b) => {
      const aClassified = a.risk_level === 'classified' ? 1 : 0
      const bClassified = b.risk_level === 'classified' ? 1 : 0
      if (bClassified !== aClassified) return bClassified - aClassified
      return (b.risk_score ?? -1) - (a.risk_score ?? -1)
    })
    if (sorted.length > 0 && sorted[0] !== undefined) {
      setSelectedCitizen(sorted[0].citizen_id)
    }
  }, [tutorialStep, getFilteredCaseQueue, unlockedDomains, setSelectedCitizen])
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd /home/selim/data_privacy_distopia/frontend && npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /home/selim/data_privacy_distopia
git add frontend/src/components/SystemDashboard/TutorialOverlay/TutorialOverlay.tsx
git commit -m "$(cat <<'EOF'
feat: auto-select highest-risk citizen when tutorial reaches center panel

Uses same queue + sort logic as CitizenQueue (classified first, then by
risk score descending). Citizen stays selected after tutorial ends.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Final verification

- [ ] **Run unit tests**

```bash
cd /home/selim/data_privacy_distopia && make test-unit 2>&1 | tail -20
```

Expected: all pass.

- [ ] **Run critical path E2E tests**

```bash
cd /home/selim/data_privacy_distopia && make test-critical 2>&1 | tail -30
```

Expected: all pass.

# Tutorial Replay & Always-Show Memo — Design Spec

## Problem

Two bugs exist with the tutorial/memo flow:

1. Once `civic-harmony-memo-acknowledged` is set in localStorage, neither the intro memo nor the tutorial ever appear again. No replay path exists.
2. The intro memo (MemoScreen) is the entry gate to the tutorial — it's the only thing that triggers `tutorialStep: 0`. Skipping it (by already having it acknowledged) permanently blocks the tutorial.

Additionally: when the tutorial reaches the center panel steps, no citizen is selected, leaving the panel empty and confusing.

## Requirements

- **Memo**: Must always show at the start of every new game (week 1, no flags yet).
- **Tutorial**: Shows automatically on the first game only. Persists across browser sessions via a new localStorage key.
- **Replay**: A "REPLAY ONBOARDING" button on the country selection screen lets returning players re-run the tutorial. Only shown after the tutorial has been completed at least once.
- **Auto-select**: When the tutorial reaches step 1 (first center-panel step), the highest-risk citizen in the queue is auto-selected so the panel shows real data.

## Architecture

### New localStorage key

`civic-harmony-tutorial-complete` — written `"true"` when the tutorial is skipped or completed. The existing `civic-harmony-memo-acknowledged` key is kept but no longer gates the memo display.

### uiStore changes

**New state fields:**
- `tutorialComplete: boolean` — read from `localStorage.getItem(TUTORIAL_KEY) === 'true'` at store init
- `tutorialRequested: boolean` — in-memory only, default `false`, never persisted

**New action:**
- `requestTutorial(): void` — sets `tutorialRequested: true`

**Changed: `initialState.memoAcknowledged`**
Hard-coded to `false` instead of reading from localStorage. The memo always shows when `!memoAcknowledged && isFirstStart && !isAutomated` evaluates — which is guaranteed on every new game start since `reset()` restores it to `false`.

**Changed: `acknowledgeMemo()`**
```
localStorage.setItem(MEMO_KEY, 'true')  // kept for backwards compat, no longer read
const startTutorial = !tutorialComplete || tutorialRequested
set({ memoAcknowledged: true, tutorialStep: startTutorial ? 0 : null, tutorialRequested: false })
```

**Changed: `skipTutorial()`**
```
localStorage.setItem(TUTORIAL_KEY, 'true')
set({ tutorialStep: null, tutorialComplete: true })
```
This fires on both skip and natural completion (the "BEGIN SHIFT →" button in TutorialOverlay already calls `skipTutorial()`).

**Changed: `reset()`**
Re-reads `tutorialComplete` from localStorage at call time (not from frozen `initialState`). Preserves `tutorialRequested` from current state so a replay request set after `initializeGame` survives. Always resets `memoAcknowledged: false`.

```
reset: () => set({
  ...initialState,
  memoAcknowledged: false,
  tutorialComplete: localStorage.getItem(TUTORIAL_KEY) === 'true',
  tutorialRequested: get().tutorialRequested,
})
```

### StartScreen changes

- Read `tutorialComplete` from `useUIStore`.
- Add local state `replayTutorial: boolean`, default `false`.
- Render a secondary "REPLAY ONBOARDING" button when `tutorialComplete` is true.
- In `handleBeginShift()`, after `await initializeGame(...)` resolves and before `setScreen('dashboard')`, call `requestTutorial()` if `replayTutorial` is true.

The button is placed below the "BEGIN SHIFT" button, styled as a secondary/ghost action (consistent with the existing "Endings Archive" button style).

### TutorialOverlay changes

Add a `useEffect` on `tutorialStep`:
- When `tutorialStep` transitions to `1` (first center-panel step): get `unlockedDomains` from `useGameStore`, call `useCitizenStore.getState().getCaseQueue(unlockedDomains)`, sort descending by `risk_score` using `(b.risk_score ?? -1) - (a.risk_score ?? -1)` (nulls sort last, consistent with CitizenQueue), take `[0].citizen_id`, call `setSelectedCitizen(citizenId)`.
- No deselect on tutorial end — citizen stays selected so the player lands with an open file.

`setSelectedCitizen` already guards all timer logic behind `tutorialStep === null`, so calling it during the tutorial is safe.

## Data flow summary

```
First game:
  StartScreen → initializeGame → setScreen('dashboard')
  → MemoScreen shown (memoAcknowledged=false, week1, no flags)
  → acknowledgeMemo() → tutorialComplete=false → tutorialStep=0
  → TutorialOverlay step 0 (left panel)
  → TutorialOverlay step 1 (center panel) → auto-select highest-risk citizen
  → ... steps 2, 3 ...
  → skipTutorial() → tutorialComplete=true saved to localStorage

Subsequent game (no replay):
  → MemoScreen shown (memoAcknowledged always resets to false)
  → acknowledgeMemo() → tutorialComplete=true, tutorialRequested=false → tutorialStep=null
  → Dashboard directly

Replay requested:
  StartScreen → click "REPLAY ONBOARDING" → replayTutorial=true
  → handleBeginShift → initializeGame → requestTutorial() → setScreen('dashboard')
  → MemoScreen shown
  → acknowledgeMemo() → tutorialRequested=true → tutorialStep=0
  → Tutorial plays
```

## Files changed

- `frontend/src/stores/uiStore.ts`
- `frontend/src/components/StartScreen/StartScreen.tsx`
- `frontend/src/components/SystemDashboard/TutorialOverlay/TutorialOverlay.tsx`

## Out of scope

- No changes to MemoScreen itself.
- No changes to the TutorialOverlay step content or styling.
- No changes to how the tutorial skip button appears/disappears.

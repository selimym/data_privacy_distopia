---
name: game-feel-and-transitions
description: Use when adding or changing any animation, screen transition, cinematic, camera movement, hover/click feedback, sound cue, or "juice" — including flag submission feedback, week transitions, memo overlays, map cinematics, and start-screen sequences.
---

# Game Feel & Transitions

## Overview

This game's juice is **bureaucratic weight, not arcade delight**. Every motion should feel like machinery processing a human being: stamps, terminals, file systems, camera surveillance. If a transition would feel at home in a match-3 game, it's wrong here.

**Core principle: consequential actions get a beat; routine actions get none.** The contrast IS the message — manual flagging feels heavy, bot approval feels frictionless, and the player should notice the difference.

## Motion Vocabulary (hard rules)

| Do | Don't |
|---|---|
| Linear or sharp ease-out (`cubic-bezier(0.2,0,0,1)`), `steps()` for terminal text | Bounce, elastic, back, spring easing |
| Short and mechanical: 80–150ms for state feedback, 600–900ms for a "beat" | Anything over 1s that isn't skippable |
| Opacity/transform only (compositor-friendly) | Animating width/height/top (layout thrash in a data-dense dashboard) |
| Monospace timestamps, case IDs, system-log phrasing in transition copy | Playful copy, exclamation marks, emoji |
| Silence as default; sound only at beats (Papers, Please ships gameplay in silence) | Ambient music during case review |

Centralize timings as CSS custom properties (e.g. `--t-feedback: 120ms; --t-beat: 800ms`) so escalation tuning is one edit.

## The Beat Pattern (weight for moral actions)

For flag submission (UX critique F-17), pattern-registry registration (F-26), detention selection (F-15):

1. Freeze the acting control (disable, keep visible).
2. Interstitial state 0.6–0.9s: bureaucratic confirmation — `FILE SUBMITTED — ADMINISTRATIVE DETENTION · CASE #8842 · 14:02:31` — rendered as a stamp/overlay on the panel, not a toast.
3. Then clear/reset UI. The citizen's row moves to the processed list (F-09) in the same beat so the causal chain is visible.
4. Severity gradient: Monitoring gets step 2 at 0.4s and muted styling; Detention gets 0.9s, red treatment, and a one-click micro-confirm *before* the beat.

Deliberately **do not** give the AutoFlag bulk-approve flow a beat — rows flash past rapidly (F-18). The asymmetry teaches the thesis.

## Escalation Arc

The UI itself should normalize: week 1 transitions are slower and softer; by week 7 the same transitions are faster, sharper, more routine. Implement as a week-indexed multiplier on the duration tokens (e.g. `duration * (1 - week * 0.05)`), not per-component forks. Subtle — players should feel it, not see it.

## Where Things Live

| Surface | Mechanism |
|---|---|
| Panel/state transitions | CSS transitions/keyframes driven by state classNames — never JS animation libs for dashboard UI |
| Terminal/boot text (start screen F-20, memos) | `shared/StreamingText.tsx` exists — reuse it; `steps()` timing |
| Full-screen narrative beats | `uiStore.cinematicQueue` → `shared/CinematicOverlay.tsx` |
| Map camera | Phaser: `cameras.main.pan/zoomTo/fade/flash`; triggered via `pan-to` event on `window.__worldEvents` |
| Week transition | ShiftMemoOverlay (moral register) should be a separate stage from the next-directive briefing (operational register) — F-11 |

## Map Cinematic Patterns

- **Outcome pan**: fade dashboard slightly → camera pans to citizen's home tile → zoom 2.0 → outcome text + time label → skip on click. (Exists — keep skippable.)
- **Detention walk-off**: when a flagged citizen leaves the world, spawn `Police_01_walk` at map edge → path to the citizen → both walk off screen → remove sprites. ~4s, camera optional, plays even unwatched — the town visibly empties either way.
- **Absence markers**: detained citizens leave a subtle mark at their home (dimmed tile or small marker). The accumulating emptiness across weeks is the map's strongest storytelling device.
- Pause NPC wander during cinematics (bus flag), resume after.

## Checklist Before Shipping Any Transition

- [ ] Skippable if >1s (click anywhere = skip; also honored by E2E tests)
- [ ] Doesn't block input to unrelated panels (only modal beats may block)
- [ ] Works at 1366×768 and 1920×1080
- [ ] `data-testid` on any new interactive element; E2E waits use state, not `waitForTimeout`
- [ ] Tone check: would a government terminal do this? If it sparkles, cut it.

## Common Mistakes

| Mistake | Fix |
|---|---|
| Adding delight-juice (confetti, bounces, glow pulses) | Re-read Motion Vocabulary; the game is a horror mirror |
| Transition breaks Playwright tests via fixed sleeps | Gate test progress on the post-transition state |
| Driving Phaser tweens from React re-renders | React dispatches one event; Phaser owns the whole sequence |
| Beat on everything | Beats only for morally consequential actions; routine = instant |
| New strings hardcoded in transition copy | All strings through `useTranslation()` |

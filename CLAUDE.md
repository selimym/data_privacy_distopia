# CLAUDE.md

## Project

Educational browser game about surveillance normalization. Fat client — all logic in the browser, no backend.

**Design thesis (governs every change):** the game teaches through *complicity* — each action feels mundane and procedurally justified; horror accumulates. UX friction and dashboard density can be intentional. Before "improving" UX, check whether the friction serves the thesis (see `UX_Critique.html` framing note).

## Document Map

| Document | Use it for |
|----------|-----------|
| `docs/GAMEPLAY.md` | Narrative arc, mechanics summary, week table |
| `docs/GAME_DESIGN_REFERENCE.md` | Exhaustive mechanics/UI reference + §20 known design tensions |
| `docs/papers_please_devlog_insights.md` | Design lessons from Papers, Please (feedback timing, friction, consequence design) |
| `UX_Critique.html` | 29 prioritized UX findings (F-01…F-29) with P0–P3 matrix |
| `docs/ALPHA_ROADMAP.md` | Checklist to first shareable alpha |
| `README.md` | Architecture, directory layout, testing |

## Project Skills

- **building-world-maps** — invoke before touching `frontend/src/phaser/`, tilemaps, NPC sprites/pathing, or `frontend/public/assets/`
- **game-feel-and-transitions** — invoke before adding/changing animations, screen transitions, cinematics, or flag-submission feedback

## Tech Stack

React 18 + TypeScript, Zustand 5 (5 stores), Phaser 3 (world map only), Faker.js 10 (deterministic seeds), idb (IndexedDB), Vite 6, Playwright + Vitest.

## Commands

```bash
make dev              # Dev server on http://localhost:5173
make install          # npm install
make build            # Production build
make test             # All E2E tests (Playwright)
make test-critical    # Critical path E2E only
make test-unit        # Unit tests (Vitest)
make test-ui          # Playwright interactive UI
make clean            # Remove node_modules + dist
```

## Key Directories

```
frontend/src/
  components/   ← React UI
  services/     ← Pure TS game logic (no store imports)
  stores/       ← Zustand (game, citizen, metrics, ui, content)
  phaser/       ← WorldMapGame.ts, PreloadScene.ts, WorldMapScene.ts
  types/        ← zero `any`

frontend/public/content/
  scenarios/default.json   ← 8 directives + contract events
  inference_rules.json
  data_banks/              ← health, finance, judicial, social, messages
  outcomes.json
  locales/en.json

frontend/public/assets/
  tilesets/interiors/      ← LimeZu Modern Interiors, 48px MV format (768×768 sheets)
  tilesets/exteriors/      ← LimeZu Modern Exteriors, 48px MV format (768×768 sheets)
  characters/              ← *_walk.png = 24-frame strips (32×64/frame); legacy 128×128 4×4 sheets
  maps/town.json           ← Tiled JSON (currently placeholder — see building-world-maps skill)
```

## Architecture Rules

- **Stores call services. Components call stores. Phaser never touches stores.**
- Phaser ↔ React via one-way `EventTarget` bridge only (`window.__worldEvents`; React dispatches, Phaser listens; Phaser signals back only via `map-ready`)
- `import * as Phaser from 'phaser'` — never default import
- All UUIDs via `crypto.randomUUID()`
- All citizen data via Faker.js with deterministic seeds
- All interactive elements need `data-testid` attributes
- All strings through `useTranslation()` in components

## Store Data Flow (flag submission)

```
submitFlag(citizenId, flagType, justification)
  → ReluctanceTracker     → metricsStore
  → PublicMetrics         → metricsStore
  → NewsGenerator         → gameStore.newsArticles
  → ProtestManager        → gameStore.activeProtests
  → OperatorTracker       → gameStore.operator
  → OutcomeGenerator      → uiStore.cinematicQueue
  → EndingCalculator      → uiStore.screen (if terminal)
  → persistence.save()
```

`GameOrchestrator.ts` is the only entry point for game initialization.

## Game Facts

- 8 weeks / 8 directives; Jessica Martinez (week 8) is the narrative focal point, one face among many in the queue
- Week 5 is the pivot week: neighborhood **sweep** directive (20-arrest quota) + **AutoFlag™ Bot** unlocks via the social-media contract event
- Domain unlock order: location+judicial (wk1) → health (wk2) → finance (wk3) → social+messages (wk6)
- All bot decisions log under the player's operator ID
- 9 endings (10 priority levels, first match wins) determined by: compliance, reluctance, bot usage, protest suppression, ICE approvals, Jessica/hacktivist/protected-citizen choices
- Special NPC arcs: Hamza (hacktivist, wk6), protected citizen (Epstein analog, wk5–6), Jessica (wk8) — details in GAME_DESIGN_REFERENCE §9
- Verify week/quota facts against `frontend/public/content/scenarios/default.json` before relying on docs — docs drift

## Important Rules

- No backend — fat client only
- TypeScript strict mode — zero `any`
- Services must remain pure and testable
- Run `make test-critical` before any PR
- All strings through `useTranslation()` in components
- All interactive elements need `data-testid` attributes

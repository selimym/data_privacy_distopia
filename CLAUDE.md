# CLAUDE.md

Guide for Claude Code when working with this repository.

## Project Overview

Educational game demonstrating data privacy risks through two modes:
1. **Rogue Employee Mode** - Hospital employee abusing data access (planned)
2. **System Mode** - Surveillance operator flagging "risky" citizens (implemented)

**Architecture**: Fat client - all game logic runs in the browser, no backend required.

## Tech Stack

- **Frontend**: Phaser 3, TypeScript, 2D pixel art (32x32 tiles)
- **Data Generation**: Faker.js for synthetic citizen data
- **Storage**: IndexedDB for game state persistence
- **Deployment**: Static hosting (Vercel, Netlify, GitHub Pages, etc.)

**Archived**: Python/FastAPI backend (see BACKEND_ARCHIVE.md)

## Commands

```bash
make dev                  # Run frontend dev server (port 5173)
make install              # Install frontend dependencies
make build                # Build for production
make preview              # Preview production build
make deploy-vercel        # Deploy to Vercel
make clean                # Clean build artifacts
```

**Archived backend commands** (still available):
```bash
make dev-backend          # Run archived backend server
make test-backend         # Run archived backend tests
make seed-db              # Generate test database
```

## Key Directories

**Frontend** (`frontend/src/`):
- `scenes/` - Phaser scenes (MainMenuScene.ts, SystemDashboardScene.ts, SystemEndingScene.ts)
- `services/` - All game logic (inference, risk scoring, outcomes, endings, etc.)
- `generators/` - Synthetic data generation using Faker.js
- `state/` - State management (GameStore.ts for IndexedDB, SystemState.ts for game state)
- `ui/` - UI components (DOM-based, not Phaser UI)
- `types/` - TypeScript type definitions
- `audio/` - Audio managers

**Data** (`frontend/public/data/`):
- `config/` - Game configuration (risk_factors.json, keywords.json, etc.)
- `reference/` - Reference data (health.json, finance.json, judicial.json, social.json)
- `directives.json` - System mode directives
- `outcomes.json` - Outcome templates
- `inference_rules.json` - Inference rules

**Archived Backend** (`backend/src/datafusion/`):
- See BACKEND_ARCHIVE.md for structure

## Core Patterns

**Fat Client Architecture**:
- All game logic runs in `frontend/src/services/`
- Data generation uses Faker.js in `frontend/src/generators/`
- State persists to IndexedDB via `GameStore.ts`
- No backend API calls required

**Frontend**:
- Phaser scenes for game rendering
- Services handle all business logic (inference, risk scoring, outcomes, etc.)
- UI components create DOM elements
- TypeScript strict mode
- IndexedDB for persistence and save/load

## Visual System

- **2D top-down RPG** style (interior building views)
- **Tilesets**: 32x32 tiles, 6-layer depth sorting
- **Sprites**: 128x128, 4x4 grid (RPG Maker format), 14 NPC types
- **Map**: Tiled JSON with layers: `1_Floor`, `2_Walls_Base`, `3_Furniture_Low`, `4_Furniture_Mid`, `5_Furniture_High`, `6_Objects`
- NPCs have `sprite_key` and `map_x`/`map_y` coordinates

**Key files**:
- Services: `services/time-progression.ts`, `services/citizen-outcomes.ts`
- UI: `ui/system/CinematicTextBox.ts`, `ui/system/OutcomeViewer.ts`
- Styles: `styles/cinematic.css`, `styles/system-effects.css`

### Outcome Generation
- Templates in `services/citizen-outcomes.ts` (migrated from Python)
- Escalating consequences: immediate → 1 month → 6 months → 1 year
- Each flag type (monitoring/restriction/intervention/detention) has different outcomes
- Outcomes include narrative + statistics showing degradation

## Data Model

All data is generated client-side and stored in IndexedDB:

- **NPC** (citizen) - central entity with map position
- **Domains**: health, finance, judicial, location, social, messages
- **System Mode**: Operator, Directive, CitizenFlag, FlagOutcome, OperatorMetrics
- All records use UUIDs and are stored in GameStore (IndexedDB wrapper)

## Service Architecture

**Core Services** (`frontend/src/services/`):
- `inference-engine.ts` - Generates data fusion inferences from citizen records
- `risk-scoring.ts` - Calculates risk scores for system mode
- `citizen-outcomes.ts` - Generates outcome narratives
- `ending-calculator.ts` - Determines game endings
- `operator-tracker.ts` - Tracks operator decisions
- `reluctance-tracking.ts` - Tracks operator reluctance
- `public-metrics.ts` - Tracks awareness and public anger
- `news-system.ts` - Generates dynamic news
- `protest-system.ts` - Manages protest mechanics
- `action-execution.ts` - Handles action execution
- `time-progression.ts` - Manages directive progression
- `game-orchestrator.ts` - Coordinates all systems

**Data Generators** (`frontend/src/generators/`):
- `identity.ts` - Names, demographics, SSNs
- `health.ts` - Medical visits, conditions, medications
- `finance.ts` - Bank accounts, transactions, debts
- `judicial.ts` - Arrests, charges, sentences
- `location.ts` - Work, home, check-ins
- `social.ts` - Social media posts, relationships
- `messages.ts` - Encrypted messages
- `system-seed.ts` - System mode setup
- `index.ts` - Full population generation

## State Management

**GameStore.ts**:
- IndexedDB wrapper for persistence
- Stores all NPCs, records, operator data
- Provides save/load functionality
- Handles migrations between versions

**SystemState.ts**:
- In-memory game state
- Tracks current directive, week, decisions
- Coordinates with GameStore for persistence

## Testing

Frontend testing uses standard JavaScript practices. Archived backend tests:

```bash
make test-backend                              # All archived tests
cd backend && uv run pytest                    # Same as above
cd backend && uv run pytest -k test_name       # Specific test
```

## Important Rules

- **Fat client**: All game logic in `frontend/src/services/`, never call a backend
- **IndexedDB**: Use GameStore for all persistence
- **Generators**: Use Faker.js with deterministic seeds for reproducible data
- **UUIDs**: All entities use UUIDs (crypto.randomUUID())
- **TypeScript strict mode**: Enforce strict typing throughout
- **NPC positions**: Stored as `map_x`/`map_y` grid coordinates (0-49)
- **Services**: Keep services pure and testable, no direct Phaser dependencies

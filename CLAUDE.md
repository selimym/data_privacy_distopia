# CLAUDE.md

Guide for Claude Code when working with this repository.

## Project Overview

Educational game demonstrating data privacy risks through two modes:
1. **Rogue Employee Mode** - Hospital employee abusing data access
2. **System Mode** - Surveillance operator flagging "risky" citizens

**Architecture**: Thin client - all game logic on backend, frontend is display-only.

## Tech Stack

- **Backend**: Python/FastAPI, SQLAlchemy (async), Pydantic schemas
- **Frontend**: Phaser 3, TypeScript, 2D pixel art (32x32 tiles)
- **Database**: SQLite (dev), PostgreSQL (prod)

## Commands

```bash
make dev                  # Run both backend (port 8000) and frontend (port 5173)
make test                 # Run backend tests (pytest)
make seed-db              # Generate test data (50 citizens)
make install              # Install dependencies
```

## Key Directories

**Backend** (`backend/src/datafusion/`):
- `api/` - FastAPI endpoints (system.py is large, handles system mode)
- `models/` - SQLAlchemy models (npc.py, system_mode.py, health.py, etc.)
- `schemas/` - Pydantic request/response schemas
- `services/` - Business logic (citizen_outcomes.py, risk_scoring.py, time_progression.py)
- `generators/` - Synthetic data generation

**Frontend** (`frontend/src/`):
- `scenes/` - Phaser scenes (WorldScene.ts, SystemDashboardScene.ts)
- `ui/` - UI components (DOM-based, not Phaser UI)
- `api/` - Backend API client
- `state/` - State management (SystemState.ts)
- `types/` - TypeScript type definitions

## Core Patterns

**Backend**:
- All models use UUIDs, async SQLAlchemy
- Business logic in `services/`, not API endpoints
- Pydantic schemas for validation

**Frontend**:
- Thin client - fetch everything from API
- Phaser scenes for game rendering
- UI components create DOM elements
- TypeScript strict mode

## Visual System

- **2D top-down RPG** style (interior building views)
- **Tilesets**: 32x32 tiles, 6-layer depth sorting
- **Sprites**: 128x128, 4x4 grid (RPG Maker format), 14 NPC types
- **Map**: Tiled JSON with layers: `1_Floor`, `2_Walls_Base`, `3_Furniture_Low`, `4_Furniture_Mid`, `5_Furniture_High`, `6_Objects`
- NPCs have `sprite_key` and `map_x`/`map_y` coordinates

**Key files**:
- Backend: `services/time_progression.py`, `/api/system/operator/{id}/advance-time` endpoint
- Frontend: `ui/system/CinematicTextBox.ts`, WorldScene cinematic mode, `styles/cinematic.css`

### Outcome Generation
- Templates in `services/citizen_outcomes.py`
- Escalating consequences: immediate → 1 month → 6 months → 1 year
- Each flag type (monitoring/restriction/intervention/detention) has different outcomes
- Outcomes include narrative + statistics showing degradation

## Data Model

- **NPC** (citizen) - central entity with map position
- **Domains**: health, finance, judicial, location, social, messages
- **System Mode**: Operator, Directive, CitizenFlag, FlagOutcome, OperatorMetrics
- All records linked via UUID foreign keys

## Testing

```bash
cd backend && uv run pytest                    # All tests
cd backend && uv run pytest -k test_name       # Specific test
```

Tests use async httpx client and pytest-asyncio. Database recreated per session.

## Important Rules

- **Thin client**: Never add game logic to frontend - always backend
- **Async**: Use `async`/`await` throughout backend
- **UUIDs**: All primary keys are UUIDs
- **Schemas**: Backend changes require updating frontend TypeScript types
- **NPC positions**: Stored as `map_x`/`map_y` grid coordinates (0-49)

## Project Overview

DataFusion World is an educational game demonstrating data privacy risks through role-playing. Players experience two modes:
1. **Rogue Employee Mode** - Playing as a hospital employee who abuses data access for stalking/discrimination
2. **System Mode** - Playing as a surveillance system operator flagging "risky" citizens

The goal is educational: demonstrate why strong privacy protections and oversight are essential.

### System Mode Mechanics

System Mode features an expanded mechanics system that tracks the moral and practical consequences of surveillance:

1. **Reluctance Tracking** - Tracks the operator's unwillingness to comply with directives
   - Increases when refusing actions or hesitating (+3 to +10 per incident)
   - Decreases when taking harsh actions (-5 for severity 7+)
   - Quota shortfalls add penalties (+5 per missed action)
   - Triggers warnings at thresholds (70, 80, 90)
   - Can lead to firing (weeks 1-3) or imprisonment (weeks 4+) if too high

2. **Public Metrics** - International awareness and public anger
   - Awareness increases based on action severity and backlash
   - Anger increases especially for ICE raids and arbitrary detentions
   - Both metrics have tier thresholds that trigger events
   - Awareness accelerates when > 60 (media attention snowballs)
   - Triggers protests, news articles, and international condemnation

3. **Action System** - Unified severity-based action tracking
   - 12 action types from Monitoring (severity 1) to Inciting Violence (severity 9)
   - Citizen-targeted, neighborhood-targeted, press-targeted, and protest-targeted actions
   - Each action has calculated backlash probability
   - Actions trigger cinematic outcomes showing consequences

4. **Dynamic World Events**
   - News channels can publish critical articles
   - Protests can form and escalate
   - Neighborhoods can be targeted for ICE raids
   - Books can be published or banned
   - All events interconnect with public metrics

## Architecture

This is a **thin client architecture** where the frontend is purely a display layer:

- **Backend (Python/FastAPI)** - All game logic, state management, data generation, and decision-making happens here
- **Frontend (Phaser 3/TypeScript)** - Display only. Calls backend API for everything including NPCs, inferences, game state
- **Database** - SQLite (dev), PostgreSQL (production). Async SQLAlchemy ORM

The backend generates synthetic citizen data (health, finance, judicial, location, social media records) and the game mechanics are entirely server-side.

## Development Commands

### Installation
```bash
make install              # Install both backend and frontend dependencies
make install-backend      # Backend only (uses uv)
make install-frontend     # Frontend only (uses pnpm)
```

### Development servers
```bash
make dev                  # Run both backend and frontend in parallel
make dev-backend          # Backend only (port 8000, auto-reload)
make dev-frontend         # Frontend only (Vite dev server, port 5173)
```

Or run individually:
```bash
# Backend
cd backend && uv run uvicorn datafusion.main:app --reload --host 0.0.0.0 --port 8000

# Frontend
cd frontend && pnpm dev
```

### Testing
```bash
make test                 # Run all backend tests
cd backend && uv run pytest                    # Same as above
cd backend && uv run pytest tests/test_*.py    # Run specific test file
cd backend && uv run pytest -k test_name       # Run specific test by name
```

### Database & Data Generation
```bash
make seed-db              # Generate test data (50 citizens, rogue_employee scenario, seed 42)

# Custom data generation
cd backend && uv run python -m scripts.seed_database --population 100 --scenario rogue_employee --seed 123
```

### Linting
```bash
# Backend (uses ruff)
cd backend && uv run ruff check .
cd backend && uv run ruff format .

# Frontend
cd frontend && pnpm lint
```

### Build
```bash
cd frontend && pnpm build         # TypeScript compilation + Vite build
```

## Backend Structure

```
backend/src/datafusion/
├── main.py                  # FastAPI app entry point, CORS, lifespan
├── config.py                # Settings using pydantic-settings
├── database.py              # SQLAlchemy async setup, Base, UUIDMixin, TimestampMixin
├── logging_config.py        # Structured logging setup
│
├── api/                     # API endpoints
│   ├── __init__.py          # Router aggregation
│   ├── system.py            # System mode: dashboard, flags, directives (large file)
│   ├── npcs.py              # NPC listing and retrieval
│   ├── inferences.py        # Data fusion inference generation
│   ├── abuse.py             # Rogue employee mode abuse actions
│   ├── scenarios.py         # Scenario configuration
│   ├── settings.py          # Game settings
│   └── routes/health.py     # Health check endpoint
│
├── models/                  # SQLAlchemy ORM models
│   ├── npc.py               # Core NPC model
│   ├── health.py            # HealthRecord, HealthVisit, HealthCondition, HealthMedication
│   ├── finance.py           # FinanceRecord, BankAccount, Transaction, Debt
│   ├── judicial.py          # JudicialRecord (arrests, charges, trials, sentences)
│   ├── location.py          # LocationRecord (work, home, check-ins)
│   ├── social.py            # SocialMediaRecord (posts, relationships)
│   ├── messages.py          # Message, MessageRecord (encrypted/decrypted messages)
│   ├── system_mode.py       # System mode: Operator, Directive, SystemAction, PublicMetrics,
│   │                        # ReluctanceMetrics, NewsChannel, Protest, Neighborhood,
│   │                        # BookPublicationEvent, OperatorData (expanded mechanics)
│   ├── abuse.py             # AbuseAction, AbuseExecution (rogue employee mode)
│   ├── consequence.py       # ConsequenceTemplate, TimeSkip
│   └── inference.py         # ContentRating, RuleCategory
│
├── schemas/                 # Pydantic schemas for API requests/responses
│   ├── npc.py
│   ├── health.py
│   ├── finance.py
│   ├── judicial.py
│   ├── location.py
│   ├── social.py
│   ├── system.py            # System mode schemas (flags, directives, case files)
│   ├── operator.py          # Operator metrics and status
│   ├── outcomes.py          # Citizen outcomes
│   ├── risk.py              # Risk scoring schemas
│   ├── inference.py         # Inference generation schemas
│   ├── abuse.py
│   ├── scenario.py
│   ├── settings.py
│   ├── ending.py
│   └── domains.py
│
├── services/                # Business logic
│   ├── inference_engine.py          # Basic inference generation
│   ├── advanced_inference_engine.py # Advanced inference rules and logic
│   ├── inference_rules.py           # Comprehensive inference rule definitions
│   ├── risk_scoring.py              # Risk scoring for System mode
│   ├── operator_tracker.py          # Tracks operator decisions and metrics
│   ├── citizen_outcomes.py          # Calculates citizen harm outcomes
│   ├── ending_calculator.py         # Game ending logic
│   ├── abuse_simulator.py           # Simulates abuse actions in Rogue Employee mode
│   ├── scenario_engine.py           # Scenario configuration and loading
│   ├── content_filter.py            # Content moderation
│   ├── reluctance_tracking.py       # Tracks operator reluctance and termination
│   ├── public_metrics.py            # International awareness and public anger
│   ├── severity_scoring.py          # Action severity and categorization
│   └── time_progression.py          # Directive progression and outcome generation
│
├── generators/              # Synthetic data generation
│   ├── identity.py          # Name, demographics
│   ├── health.py            # Medical records
│   ├── finance.py           # Financial data
│   ├── judicial.py          # Criminal records
│   ├── location.py          # Location history
│   ├── social.py            # Social media
│   ├── messages.py          # Message generation
│   └── scenarios/           # Scenario-specific generators
│
├── content/                 # Game content (messages, etc.)
│
└── scripts/                 # Utility scripts
    ├── seed_database.py     # Main data seeding script
    ├── seed_directives.py   # Seed system mode directives
    └── seed_abuse_actions.py
```

## Frontend Structure

```
frontend/
├── public/
│   └── assets/              # Game assets (pixel art)
│       ├── tilesets/        # 8 tileset images (32x32 tiles)
│       │   ├── hospital_interior.png    # Medical rooms, equipment
│       │   ├── office_interior.png      # Cubicles, desks, computers
│       │   ├── residential_interior.png # Apartments, kitchens
│       │   ├── commercial_interior.png  # Cafe, bank, retail
│       │   ├── outdoor_ground.png       # Grass, paths, roads
│       │   ├── outdoor_nature.png       # Trees, bushes, flowers
│       │   ├── walls_doors.png          # Building walls, doorways
│       │   └── furniture_objects.png    # Chairs, tables, decorations
│       ├── characters/      # Character sprite sheets (128x128, 4x4 grid)
│       │   ├── player.png
│       │   ├── citizen_male_01.png      # Generic male citizens
│       │   ├── citizen_male_02.png
│       │   ├── citizen_male_03.png
│       │   ├── citizen_female_01.png    # Generic female citizens
│       │   ├── citizen_female_02.png
│       │   ├── citizen_female_03.png
│       │   ├── doctor_male_01.png       # Medical professionals
│       │   ├── doctor_female_01.png
│       │   ├── nurse_female_01.png
│       │   ├── office_worker_male_01.png   # Office workers
│       │   ├── office_worker_female_01.png
│       │   ├── employee_01.png          # Generic employee (rogue employee)
│       │   ├── official_01.png          # Government officials
│       │   └── analyst_01.png           # Data analysts
│       └── maps/
│           └── town.json    # Tiled map with multi-layer city layout
│
├── src/
│   ├── main.ts              # Phaser game initialization, scene registration
│   ├── config.ts            # Game dimensions and constants (TILE_SIZE=32)
│   │
│   ├── scenes/              # Phaser scenes
│   │   ├── BootScene.ts     # Initial boot
│   │   ├── PreloadScene.ts  # Asset loading, animation creation
│   │   ├── MainMenuScene.ts # Main menu
│   │   ├── WorldScene.ts    # Rogue Employee mode (multi-layer tilemap, animated NPCs)
│   │   ├── SystemDashboardScene.ts  # System mode dashboard
│   │   └── SystemEndingScene.ts     # System mode ending
│   │
│   ├── ui/                  # UI components
│   │   ├── DataPanel.ts     # Citizen data display
│   │   ├── AbuseModePanel.ts # Abuse action panel
│   │   ├── ConsequenceViewer.ts
│   │   ├── ScenarioIntro.ts
│   │   ├── ScenarioPromptUI.ts
│   │   ├── TimeProgressionUI.ts
│   │   ├── WarningModal.ts
│   │   └── system/          # System mode UI
│   │       ├── DecisionResultModal.ts
│   │       ├── DirectiveIntroModal.ts
│   │       ├── MessagesPanel.ts
│   │       ├── OperatorReviewScreen.ts
│   │       ├── OperatorWarningModal.ts
│   │       ├── OutcomeViewer.ts
│   │       └── SystemVisualEffects.ts
│   │
│   ├── api/                 # API client
│   │   ├── client.ts        # Base API client
│   │   ├── npcs.ts
│   │   ├── inferences.ts
│   │   ├── abuse.ts
│   │   ├── scenarios.ts
│   │   ├── settings.ts
│   │   └── system.ts
│   │
│   ├── state/
│   │   └── SystemState.ts   # System mode state management
│   │
│   ├── audio/
│   │   ├── AudioManager.ts
│   │   └── SystemAudioManager.ts
│   │
│   ├── types/               # TypeScript type definitions
│   │   ├── npc.ts
│   │   ├── abuse.ts
│   │   ├── scenario.ts
│   │   └── system.ts
│   │
│   └── styles/              # CSS (imported in main.ts)
│       ├── panel.css
│       ├── abuse.css
│       ├── system.css
│       └── system-effects.css
```

## Visual System (2D Pixel Art RPG)

The game uses a **2D pixel art top-down RPG style** with interior building views (similar to The Sims or Pokemon):

### Asset Structure
- **Tilesets**: 8 separate PNG files (32x32 tile size) covering interiors and exteriors
- **Character Sprites**: 14 sprite sheets (128x128, 4x4 grid = 16 frames per character)
- **Map**: Tiled JSON format with 6 layers for depth sorting
- **Tile Size**: 32x32 pixels (configurable in `config.ts`)

### Sprite Sheet Format (Standard RPG Maker / LPC)
Each character sprite sheet is 128x128 pixels arranged in a 4x4 grid:
- **Row 0**: Walk Down (frames 0-3)
- **Row 1**: Walk Left (frames 0-3)
- **Row 2**: Walk Right (frames 0-3)
- **Row 3**: Walk Up (frames 0-3)
- **Idle Frame**: Frame 1 (middle frame) of each row

### Animation System
**PreloadScene.ts** creates all animations during asset loading:
- Walk animations: `{sprite_key}_walk_{direction}` (8 FPS, looping)
- Idle animations: `{sprite_key}_idle_{direction}` (single frame)
- Animations created for all 14 NPC sprite types + player

**WorldScene.ts** uses animations:
- NPCs play idle animations based on their `sprite_key` from database
- Player plays walk animation during movement, switches to idle when stopped
- Direction determined by movement input (dx/dy)

### Map Rendering (Multi-Layer)
**WorldScene.ts** creates 6 tile layers from Tiled map:
1. **1_Floor** (depth 0) - Ground tiles, floor patterns
2. **2_Walls_Base** (depth 10) - Building walls, room dividers
3. **3_Furniture_Low** (depth 50) - Tables, rugs, floor decorations
4. **4_Furniture_Mid** (depth 150) - Above player, chairs, desks
5. **5_Furniture_High** (depth 200) - Tall objects like bookshelves
6. **6_Objects** (depth 250) - Top layer decorations

**Depth Sorting**:
- Layers 1-3 render **below** player/NPCs (depth 100)
- Layers 4-6 render **above** player/NPCs
- Creates visual depth where characters can walk "behind" tall furniture

### NPC Sprite Assignment
**Backend (identity.py)** assigns `sprite_key` during NPC generation:
- 14 sprite options covering different roles and demographics
- Distribution: 6 generic citizens, 3 medical staff, 2 office workers, 3 special roles
- `sprite_key` field stored in database, used by frontend for sprite selection

### Interior Building Views
All buildings render as **interior-only views** (no roofs):
- Hospital: Reception, exam rooms, pharmacy
- Office: Cubicles, conference rooms, server room
- Residential: Living rooms, kitchens, bedrooms
- Commercial: Cafe, bank interiors
- Outdoor: Park, paths, trees

Map designed using **Tiled Map Editor** (mapeditor.org), exported as JSON.

## Key Architectural Patterns

### Database Models
- All models extend `Base` from `database.py`
- Use `UUIDMixin` for UUID primary keys
- Use `TimestampMixin` for created_at/updated_at
- Async SQLAlchemy throughout

### API Patterns
- All endpoints use async functions
- Database dependency injection via `get_db()` from `database.py`
- Pydantic schemas for validation in `schemas/`
- Business logic lives in `services/`, not in API endpoints

### Frontend Patterns
- **Phaser scenes** manage game state and rendering
- **All game logic** is fetched from backend API (thin client architecture)
- **UI components** are TypeScript classes that create DOM elements
- **API calls** use the centralized client in `api/client.ts`
- **Asset loading**: PreloadScene.ts loads all tilesets, sprite sheets, and creates animations
- **Sprite rendering**: WorldScene.ts uses `sprite_key` from NPC database records
- **Animation playback**: Sprites play direction-based walk/idle animations automatically
- **Multi-layer tilemap**: 6 depth-sorted layers for visual richness and depth

### Service Layer
The `services/` directory contains the core game logic:
- **Inference engines**: Generate data fusion insights from citizen records
- **Risk scoring**: Calculate citizen risk scores for System mode
- **Outcome tracking**: Measure harm caused to citizens
- **Operator tracking**: Monitor operator decisions and compliance

## Testing

Tests use pytest with async support (pytest-asyncio). Key patterns:
- `conftest.py` provides fixtures including test database and client
- Tests use the async test client from httpx
- Database is created fresh for each test session
- Use `@pytest.mark.asyncio` for async tests (or rely on `asyncio_mode = "auto"`)

Example test structure:
```python
async def test_something(client: AsyncClient, db: AsyncSession):
    # Test using client for API calls or db for direct database access
    response = await client.get("/api/endpoint")
    assert response.status_code == 200
```

### Test Coverage

The project includes comprehensive test coverage for:
- **Core Services**: Inference engines, risk scoring, outcome calculation, ending logic
- **System Mode Services**: Reluctance tracking, public metrics, severity scoring
- **API Endpoints**: All major endpoints have integration tests
- **Database Models**: Model creation and relationship tests
- **Integration Scenarios**: Realistic gameplay scenarios (e.g., operator taking harsh actions, refusing directives)

Run specific test suites:
```bash
cd backend && uv run pytest tests/test_system_mode_services.py  # System mode mechanics
cd backend && uv run pytest tests/test_risk_scoring.py          # Risk scoring
cd backend && uv run pytest tests/test_ending_calculator.py     # Ending logic
```

## Data Model Relationships

The data model represents a comprehensive surveillance state:

- **NPC** (citizen) is the central entity
- Each NPC can have multiple records across domains:
  - Health: visits, conditions, medications
  - Finance: accounts, transactions, debts
  - Judicial: arrests, charges, sentences
  - Location: work, home, check-ins
  - Social: posts, relationships
  - Messages: encrypted communications
- **Inferences** are generated by combining data across domains
- **System Mode** adds Operators, Directives, CitizenFlags, and FlagOutcomes

## Environment Configuration

Backend uses pydantic-settings for configuration (`.env` file support):
- `DATABASE_URL` - Database connection string (default: sqlite)
- `DEBUG` - Debug mode (default: true)
- `CORS_ORIGINS` - Allowed origins for CORS (default: localhost:5173)

Frontend uses Vite with environment variables in `src/config/api.ts`:
- API base URL defaults to `http://localhost:8000/api`

## Important Notes

- **Thin client**: Never implement game logic in the frontend. All decisions, calculations, and state changes happen on the backend.
- **Async everywhere**: Backend uses async/await throughout. Use `async with` for database sessions.
- **UUID primary keys**: All entities use UUIDs, not auto-incrementing integers.
- **TypeScript strict mode**: Frontend uses strict TypeScript with no unused locals/parameters.
- **Test coverage**: Backend has comprehensive test coverage. Run tests before committing.
- **Visual assets**: The game expects pixel art assets in `frontend/public/assets/`. Code is implemented but assets need to be added separately (see Visual System section).
- **Sprite keys**: NPC `sprite_key` values in database must match available sprite sheet filenames in `assets/characters/`.
- **Tilemap layers**: Tiled map JSON must have layers named exactly: `1_Floor`, `2_Walls_Base`, `3_Furniture_Low`, `4_Furniture_Mid`, `5_Furniture_High`, `6_Objects`.

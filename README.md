## Project Overview

DataFusion World is an educational game demonstrating data privacy risks through role-playing. Players experience two modes:
1. **Rogue Employee Mode** - Playing as a hospital employee who abuses data access for stalking/discrimination
2. **System Mode** - Playing as a surveillance system operator flagging "risky" citizens

The goal is educational: demonstrate why strong privacy protections and oversight are essential.

**NEW: Fat Client Architecture** - The game now runs entirely in your browser as a static web application. No backend server required! All game logic, data generation, and state management happens client-side using TypeScript and IndexedDB for persistence.

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

This is a **fat client architecture** where everything runs in the browser:

- **Frontend (Phaser 3/TypeScript)** - All game logic, state management, data generation, and decision-making
- **In-Browser Storage** - IndexedDB for game state persistence and save/load functionality
- **Static Hosting** - Deploy to Vercel, Netlify, GitHub Pages, or any static host for free

The frontend generates synthetic citizen data using Faker.js (health, finance, judicial, location, social media records) and all game mechanics run client-side.

**Backend Archived**: The original Python/FastAPI backend has been archived for reference. It's no longer required for gameplay but remains available in the `backend/` directory for anyone interested in the original architecture. See [BACKEND_ARCHIVE.md](BACKEND_ARCHIVE.md) for details.

## Quick Start

### Installation
```bash
make install              # Install frontend dependencies (pnpm)
```

Or manually:
```bash
cd frontend && pnpm install
```

### Development
```bash
make dev                  # Start development server (Vite on port 5173)
```

Or manually:
```bash
cd frontend && pnpm dev
```

Then open http://localhost:5173 in your browser.

### Build for Production
```bash
make build                # Build static files to frontend/dist/
make preview              # Preview production build locally
```

### Deployment

Deploy to your favorite static hosting platform:

```bash
make deploy-vercel        # Deploy to Vercel
make deploy-netlify       # Deploy to Netlify
make deploy-ghpages       # Deploy to GitHub Pages
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

### Linting
```bash
cd frontend && pnpm lint
```

---

## Archived Backend Commands

The backend is no longer required for gameplay, but you can still run it for reference:

```bash
make install-backend      # Install backend dependencies (uv)
make dev-backend          # Run backend server (port 8000)
make test-backend         # Run backend tests
make seed-db              # Generate test database
```

See [BACKEND_ARCHIVE.md](BACKEND_ARCHIVE.md) for more information.

## Project Structure

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
│   ├── services/            # Game logic (all client-side)
│   │   ├── inference-engine.ts      # Data fusion inference generation
│   │   ├── risk-scoring.ts          # Risk scoring for System mode
│   │   ├── citizen-outcomes.ts      # Calculates citizen harm outcomes
│   │   ├── ending-calculator.ts     # Game ending logic
│   │   ├── operator-tracker.ts      # Tracks operator decisions
│   │   ├── public-metrics.ts        # International awareness tracking
│   │   ├── reluctance-tracking.ts   # Operator reluctance mechanics
│   │   ├── time-progression.ts      # Directive progression
│   │   ├── news-system.ts           # Dynamic news generation
│   │   ├── protest-system.ts        # Protest mechanics
│   │   ├── action-execution.ts      # Action handling
│   │   ├── event-generation.ts      # Event triggers
│   │   └── content-loader.ts        # JSON content loading
│   │
│   ├── generators/          # Synthetic data generation (Faker.js)
│   │   ├── identity.ts      # Name, demographics
│   │   ├── health.ts        # Medical records
│   │   ├── finance.ts       # Financial data
│   │   ├── judicial.ts      # Criminal records
│   │   ├── location.ts      # Location history
│   │   ├── social.ts        # Social media
│   │   ├── messages.ts      # Message generation
│   │   ├── system-seed.ts   # System mode setup
│   │   └── index.ts         # Population generation
│   │
│   ├── state/
│   │   ├── GameStore.ts     # Central game state store (IndexedDB)
│   │   └── SystemState.ts   # System mode state management
│   │
│   ├── api/                 # Archived (optional remote mode)
│   │   └── inferences.ts    # Legacy API client code
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
- **Fat client architecture**: All game logic runs in the browser
- **Phaser scenes** manage game state and rendering
- **Services** handle all business logic (inference, risk scoring, outcomes, etc.)
- **Generators** create synthetic citizen data using Faker.js
- **GameStore** manages state and IndexedDB persistence
- **UI components** are TypeScript classes that create DOM elements
- **Asset loading**: PreloadScene.ts loads all tilesets, sprite sheets, and creates animations
- **Sprite rendering**: WorldScene.ts uses `sprite_key` from generated NPCs
- **Animation playback**: Sprites play direction-based walk/idle animations automatically
- **Multi-layer tilemap**: 6 depth-sorted layers for visual richness and depth

### Service Layer (Client-Side)
The `frontend/src/services/` directory contains all core game logic:
- **Inference engines**: Generate data fusion insights from citizen records
- **Risk scoring**: Calculate citizen risk scores for System mode
- **Outcome tracking**: Measure harm caused to citizens
- **Operator tracking**: Monitor operator decisions and compliance
- **News & Protest systems**: Dynamic world events
- **Ending calculator**: Determine game outcomes based on player choices

### Data Generation (Client-Side)
The `frontend/src/generators/` directory creates synthetic citizen data:
- **Identity generator**: Names, demographics, SSNs using Faker.js
- **Health generator**: Medical visits, conditions, medications
- **Finance generator**: Bank accounts, transactions, debts, employment
- **Judicial generator**: Arrests, charges, sentences, probation
- **Location generator**: Work, home, check-ins
- **Social generator**: Social media posts, relationships
- **Message generator**: Encrypted messages with patterns
- **System seed**: System mode directives and setup

All generators use deterministic seeding for reproducible populations.

## Testing

The frontend uses standard JavaScript testing practices. The backend tests are archived but still available for reference.

### Frontend Testing
- Unit tests for services and generators
- Browser-based integration testing
- Deterministic data generation for reproducible tests

### Backend Testing (Archived)
The original Python backend includes comprehensive test coverage:
- **Core Services**: Inference engines, risk scoring, outcome calculation, ending logic
- **System Mode Services**: Reluctance tracking, public metrics, severity scoring
- **API Endpoints**: All major endpoints have integration tests

Run archived backend tests:
```bash
make test-backend
# or
cd backend && uv run pytest
```

See [BACKEND_ARCHIVE.md](BACKEND_ARCHIVE.md) for more information.

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

The game runs entirely client-side with no configuration required. Just run `make dev` and play!

Optional configuration:
- **Vite environment variables**: Create a `.env` file in `frontend/` for custom build settings
- **Data generation**: Modify seed values in generators for different populations

The archived backend used pydantic-settings for configuration (see [BACKEND_ARCHIVE.md](BACKEND_ARCHIVE.md)).

## Important Notes

- **Fat client**: All game logic runs in the browser. No backend required!
- **Static hosting**: Deploy to any static host (Vercel, Netlify, GitHub Pages, etc.)
- **IndexedDB persistence**: Game state automatically saves to browser storage
- **Deterministic generation**: Use seeded random generation for reproducible populations
- **TypeScript strict mode**: Frontend uses strict TypeScript with no unused locals/parameters
- **Visual assets**: The game expects pixel art assets in `frontend/public/assets/`
- **Sprite keys**: NPC `sprite_key` values must match available sprite sheet filenames in `assets/characters/`
- **Tilemap layers**: Tiled map JSON must have layers named exactly: `1_Floor`, `2_Walls_Base`, `3_Furniture_Low`, `4_Furniture_Mid`, `5_Furniture_High`, `6_Objects`

## Migration History

This project was migrated from a thin client (Python backend + TypeScript frontend) to a fat client (TypeScript only) architecture. See [REFACTORING_SUMMARY.md](REFACTORING_SUMMARY.md) for the complete migration story and [BACKEND_ARCHIVE.md](BACKEND_ARCHIVE.md) for information about the archived backend code.

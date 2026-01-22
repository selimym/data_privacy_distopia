# Backend Archive

This document explains the status of the Python/FastAPI backend and how to reference it if needed.

## Why Was the Backend Archived?

DataFusion World was originally built with a **thin client architecture**:
- **Backend** (Python/FastAPI): All game logic, data generation, state management
- **Frontend** (TypeScript/Phaser): Display layer only, fetched everything from API
- **Database** (SQLite/PostgreSQL): Stored all game state

This architecture had significant drawbacks:
- **Hosting costs**: Required a server and database for each deployment
- **Scalability**: Each player needed server resources
- **Latency**: Every action required API round-trips
- **Complexity**: Maintaining two codebases in different languages
- **Deployment**: Required server configuration, database setup, CORS, etc.

The game has been **migrated to a fat client architecture**:
- **Frontend only** (TypeScript/Phaser): All game logic runs in the browser
- **IndexedDB**: Client-side persistence, no server needed
- **Static hosting**: Deploy to Vercel/Netlify/GitHub Pages for free
- **Zero latency**: All logic runs locally
- **Unlimited players**: No server resources required

The backend code remains in the repository for **reference purposes only**. It is no longer required for gameplay.

---

## Backend Structure (Archived)

The backend is located in `backend/` and consists of:

```
backend/
├── src/datafusion/
│   ├── main.py                  # FastAPI app entry point
│   ├── config.py                # Settings
│   ├── database.py              # SQLAlchemy async setup
│   ├── logging_config.py        # Logging
│   │
│   ├── api/                     # API endpoints (archived)
│   │   ├── system.py            # System mode API
│   │   ├── npcs.py              # NPC listing
│   │   ├── inferences.py        # Inference generation
│   │   ├── abuse.py             # Rogue employee mode
│   │   └── ...
│   │
│   ├── models/                  # SQLAlchemy ORM models
│   │   ├── npc.py               # Core NPC model
│   │   ├── health.py            # Health records
│   │   ├── finance.py           # Financial records
│   │   ├── judicial.py          # Criminal records
│   │   ├── location.py          # Location records
│   │   ├── social.py            # Social media records
│   │   ├── messages.py          # Message records
│   │   ├── system_mode.py       # System mode models
│   │   └── ...
│   │
│   ├── schemas/                 # Pydantic schemas (request/response)
│   │   ├── npc.py
│   │   ├── health.py
│   │   ├── system.py
│   │   └── ...
│   │
│   ├── services/                # Business logic (migrated to frontend)
│   │   ├── inference_engine.py          → frontend/src/services/inference-engine.ts
│   │   ├── risk_scoring.py              → frontend/src/services/risk-scoring.ts
│   │   ├── citizen_outcomes.py          → frontend/src/services/citizen-outcomes.ts
│   │   ├── ending_calculator.py         → frontend/src/services/ending-calculator.ts
│   │   ├── operator_tracker.py          → frontend/src/services/operator-tracker.ts
│   │   ├── public_metrics.py            → frontend/src/services/public-metrics.ts
│   │   ├── reluctance_tracking.py       → frontend/src/services/reluctance-tracking.ts
│   │   ├── time_progression.py          → frontend/src/services/time-progression.ts
│   │   ├── news_system.py               → frontend/src/services/news-system.ts
│   │   ├── protest_system.py            → frontend/src/services/protest-system.ts
│   │   ├── action_execution.py          → frontend/src/services/action-execution.ts
│   │   ├── event_generation.py          → frontend/src/services/event-generation.ts
│   │   ├── content_filter.py            → frontend/src/services/content-filter.ts
│   │   └── ...
│   │
│   ├── generators/              # Data generators (migrated to frontend)
│   │   ├── identity.py          → frontend/src/generators/identity.ts
│   │   ├── health.py            → frontend/src/generators/health.ts
│   │   ├── finance.py           → frontend/src/generators/finance.ts
│   │   ├── judicial.py          → frontend/src/generators/judicial.ts
│   │   ├── location.py          → frontend/src/generators/location.ts
│   │   ├── social.py            → frontend/src/generators/social.ts
│   │   ├── messages.py          → frontend/src/generators/messages.ts
│   │   └── system_seed_data.py  → frontend/src/generators/system-seed.ts
│   │
│   └── scripts/                 # Utility scripts
│       ├── seed_database.py     # Database seeding (no longer needed)
│       └── ...
│
├── tests/                       # Comprehensive test suite
│   ├── conftest.py              # Test fixtures
│   ├── test_system_mode_services.py
│   ├── test_risk_scoring.py
│   ├── test_ending_calculator.py
│   └── ...
│
├── data/                        # Static data (moved to frontend/public/data/)
│   ├── reference/               # Reference data
│   ├── config/                  # Configuration
│   ├── directives.json
│   ├── outcomes.json
│   └── ...
│
├── pyproject.toml               # Python dependencies
└── README.md                    # Backend-specific readme
```

---

## What Was Migrated?

### Services (18 files)

All business logic services were ported from Python to TypeScript:

| Python Service | TypeScript Service | Status |
|----------------|-------------------|--------|
| `inference_engine.py` | `inference-engine.ts` | ✅ Migrated |
| `risk_scoring.py` | `risk-scoring.ts` | ✅ Migrated |
| `citizen_outcomes.py` | `citizen-outcomes.ts` | ✅ Migrated |
| `ending_calculator.py` | `ending-calculator.ts` | ✅ Migrated |
| `operator_tracker.py` | `operator-tracker.ts` | ✅ Migrated |
| `public_metrics.py` | `public-metrics.ts` | ✅ Migrated |
| `reluctance_tracking.py` | `reluctance-tracking.ts` | ✅ Migrated |
| `time_progression.py` | `time-progression.ts` | ✅ Migrated |
| `news_system.py` | `news-system.ts` | ✅ Migrated |
| `protest_system.py` | `protest-system.ts` | ✅ Migrated |
| `action_execution.py` | `action-execution.ts` | ✅ Migrated |
| `event_generation.py` | `event-generation.ts` | ✅ Migrated |
| `content_filter.py` | `content-filter.ts` | ✅ Migrated |
| `severity_scoring.py` | `severity-scoring.ts` | ✅ Migrated |
| `inference_rules.py` | `inference-rules.ts` | ✅ Migrated |
| `content_loader.py` | `content-loader.ts` | ✅ Migrated |

Plus `game-orchestrator.ts` (new) to coordinate all systems.

### Generators (8 files)

All data generators were ported from Python Faker to Faker.js:

| Python Generator | TypeScript Generator | Status |
|------------------|---------------------|--------|
| `identity.py` | `identity.ts` | ✅ Migrated |
| `health.py` | `health.ts` | ✅ Migrated |
| `finance.py` | `finance.ts` | ✅ Migrated |
| `judicial.py` | `judicial.ts` | ✅ Migrated |
| `location.py` | `location.ts` | ✅ Migrated |
| `social.py` | `social.ts` | ✅ Migrated |
| `messages.py` | `messages.ts` | ✅ Migrated |
| `system_seed_data.py` | `system-seed.ts` | ✅ Migrated |

### Data Files

All static JSON data files were moved to `frontend/public/data/`:

- `backend/data/reference/*.json` → `frontend/public/data/reference/*.json`
- `backend/data/config/*.json` → `frontend/public/data/config/*.json`
- `backend/data/directives.json` → `frontend/public/data/directives.json`
- `backend/data/outcomes.json` → `frontend/public/data/outcomes.json`
- `backend/data/inference_rules.json` → `frontend/public/data/inference_rules.json`

### Database → IndexedDB

SQLAlchemy models and PostgreSQL were replaced with:
- `GameStore.ts` - IndexedDB wrapper for client-side persistence
- In-memory JavaScript objects for active game state
- Save/load functionality for game sessions

---

## Running the Archived Backend

If you want to run the backend for reference or testing:

### Installation

```bash
make install-backend
# or
cd backend && uv sync
```

### Start Server

```bash
make dev-backend
# or
cd backend && uv run uvicorn datafusion.main:app --reload --host 0.0.0.0 --port 8000
```

The backend API will be available at http://localhost:8000

### Run Tests

The backend has comprehensive test coverage:

```bash
make test-backend
# or
cd backend && uv run pytest

# Specific tests
cd backend && uv run pytest tests/test_system_mode_services.py
cd backend && uv run pytest tests/test_risk_scoring.py
cd backend && uv run pytest tests/test_ending_calculator.py
cd backend && uv run pytest -k test_name
```

### Seed Database

Generate test data:

```bash
make seed-db
# or
cd backend && uv run python -m scripts.seed_database --reset --population 50 --scenario rogue_employee --seed 42

# Custom population
cd backend && uv run python -m scripts.seed_database --population 100 --scenario system_mode --seed 123
```

---

## Referencing the Backend Code

The backend code remains valuable as reference:

### When to Reference It

1. **Understanding game logic**: The Python code has extensive comments and type hints
2. **Debugging TypeScript ports**: Compare TypeScript implementation with Python original
3. **Adding new features**: See how similar features were implemented in Python
4. **Test cases**: Backend tests provide comprehensive coverage and can inspire frontend tests

### Key Reference Files

**Services** (`backend/src/datafusion/services/`):
- Well-documented business logic
- Type hints throughout
- Comprehensive edge case handling

**Tests** (`backend/tests/`):
- Integration tests for complete workflows
- Unit tests for individual services
- Realistic gameplay scenarios

**Generators** (`backend/src/datafusion/generators/`):
- Synthetic data generation patterns
- Realistic data distributions
- Faker library usage examples

### Comparing Python vs TypeScript

Example: Risk Scoring

**Python** (`backend/src/datafusion/services/risk_scoring.py`):
```python
async def calculate_risk_score(
    db: AsyncSession,
    citizen_id: UUID,
    factors: RiskFactors
) -> RiskScore:
    """Calculate comprehensive risk score for a citizen."""
    citizen = await db.get(NPC, citizen_id)
    # ... implementation
```

**TypeScript** (`frontend/src/services/risk-scoring.ts`):
```typescript
export function calculateRiskScore(
  citizenId: string,
  factors: RiskFactors,
  gameStore: GameStore
): RiskScore {
  const citizen = gameStore.getCitizen(citizenId);
  // ... implementation
}
```

**Key Differences**:
- No async database calls (synchronous IndexedDB access via GameStore)
- No SQLAlchemy session management
- Direct object access instead of ORM queries
- Same business logic, different data access patterns

---

## Migration Challenges & Solutions

### Challenge 1: Async Database Access

**Backend**: Async SQLAlchemy queries
```python
citizens = await db.execute(
    select(NPC).where(NPC.risk_score > 50)
)
```

**Frontend**: Synchronous GameStore access
```typescript
const citizens = gameStore.getAllCitizens().filter(c => c.riskScore > 50);
```

### Challenge 2: Python Faker → Faker.js

**Backend**: Python Faker
```python
from faker import Faker
fake = Faker()
fake.seed_instance(42)
name = fake.first_name()
```

**Frontend**: Faker.js
```typescript
import { faker } from '@faker-js/faker';
faker.seed(42);
const name = faker.person.firstName();
```

### Challenge 3: UUIDs

**Backend**: UUID library
```python
import uuid
id = uuid.uuid4()
```

**Frontend**: Crypto API
```typescript
const id = crypto.randomUUID();
```

### Challenge 4: Date Handling

**Backend**: Python datetime
```python
from datetime import datetime, timedelta
date = datetime.now() + timedelta(days=30)
```

**Frontend**: JavaScript Date
```typescript
const date = new Date();
date.setDate(date.getDate() + 30);
```

---

## Test Coverage Comparison

### Backend Tests

The backend has extensive test coverage:
- **Total tests**: ~50+ tests
- **Coverage**: ~85% of services
- **Test types**: Unit, integration, end-to-end

**Example test categories**:
```bash
# System mode mechanics
tests/test_system_mode_services.py

# Risk scoring
tests/test_risk_scoring.py

# Ending logic
tests/test_ending_calculator.py

# Data generation
tests/test_generators.py

# API endpoints
tests/test_api/
```

### Frontend Tests

Frontend testing is evolving:
- Standard JavaScript testing practices
- Browser-based integration tests
- Deterministic data generation for reproducibility

---

## When NOT to Use the Backend

The backend should **NOT** be used for:

1. **Gameplay**: The frontend is fully self-sufficient
2. **Production deployments**: Use static hosting instead
3. **New features**: Implement in frontend/src/services/
4. **Data generation**: Use frontend/src/generators/

---

## Backend Dependencies

The backend uses Python 3.11+ with these key dependencies:

**Core**:
- `fastapi` - Web framework
- `sqlalchemy[asyncio]` - Async ORM
- `pydantic` - Data validation
- `pydantic-settings` - Configuration management

**Database**:
- `aiosqlite` - Async SQLite
- `asyncpg` - Async PostgreSQL

**Data Generation**:
- `faker` - Synthetic data generation
- `python-dotenv` - Environment variables

**Development**:
- `pytest` - Testing framework
- `pytest-asyncio` - Async test support
- `httpx` - Async HTTP client (for tests)
- `ruff` - Linting and formatting

**Frontend Dependencies** (for comparison):
- `@faker-js/faker` - Replaces Python Faker
- `phaser` - Game engine
- `typescript` - Language
- `vite` - Build tool

---

## Future of the Backend

The backend is **archived** but not deleted because:

1. **Reference value**: Well-documented implementation of game logic
2. **Test suite**: Comprehensive tests provide validation
3. **Historical context**: Shows the evolution of the architecture
4. **Learning resource**: Demonstrates thin vs fat client architectures

**The backend will not receive**:
- New features
- Bug fixes
- Dependency updates
- Documentation improvements

**The backend may be**:
- Referenced for implementation details
- Used to validate TypeScript ports
- Run for testing or demonstration purposes

---

## Questions?

If you need to reference the backend code:

1. **Services**: See `backend/src/datafusion/services/` for business logic
2. **Generators**: See `backend/src/datafusion/generators/` for data generation
3. **Tests**: See `backend/tests/` for comprehensive test coverage
4. **API**: See `backend/src/datafusion/api/` for endpoint definitions

For current development, focus on the frontend:
- Services: `frontend/src/services/`
- Generators: `frontend/src/generators/`
- State: `frontend/src/state/`

See [REFACTORING_SUMMARY.md](REFACTORING_SUMMARY.md) for the complete migration story.

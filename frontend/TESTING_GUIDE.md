# Frontend Testing Guide

## Overview

Unlike Python's pytest, JavaScript/TypeScript testing has several popular options. For this project, we'll use **Vitest** (the Vite-native test runner) which is similar to Jest but faster and better integrated with Vite.

## Testing Stack

- **Vitest** - Test runner (like pytest)
- **@testing-library** - DOM testing utilities
- **@vitest/ui** - Visual test runner UI

## Setup

### 1. Install Testing Dependencies

```bash
cd frontend
pnpm add -D vitest @vitest/ui @testing-library/dom happy-dom
```

### 2. Configure Vitest

Create `frontend/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 3. Create Test Setup File

Create `frontend/src/test/setup.ts`:

```typescript
// Test utilities and mocks
import { beforeEach } from 'vitest';

// Reset GameStore before each test
beforeEach(() => {
  // Clear localStorage
  localStorage.clear();
  // Could also reset GameStore here if needed
});
```

### 4. Add Test Scripts to package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Writing Tests

### Example: Testing Data Generators

Create `frontend/src/generators/identity.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { generateIdentity } from './identity';

describe('Identity Generator', () => {
  it('should generate valid identity data', () => {
    const npcId = 'test-npc-id';
    const identity = generateIdentity(npcId, 12345);
    
    expect(identity.npc_id).toBe(npcId);
    expect(identity.first_name).toBeTruthy();
    expect(identity.last_name).toBeTruthy();
    expect(identity.ssn).toMatch(/^\d{9}$/);
    expect(identity.zip_code).toMatch(/^\d{5}$/);
  });

  it('should generate deterministic data with same seed', () => {
    const npcId = 'test-npc-id';
    const seed = 42;
    
    const identity1 = generateIdentity(npcId, seed);
    const identity2 = generateIdentity(npcId, seed);
    
    expect(identity1.first_name).toBe(identity2.first_name);
    expect(identity1.last_name).toBe(identity2.last_name);
    expect(identity1.ssn).toBe(identity2.ssn);
  });

  it('should generate different data with different seeds', () => {
    const npcId = 'test-npc-id';
    
    const identity1 = generateIdentity(npcId, 42);
    const identity2 = generateIdentity(npcId, 43);
    
    expect(identity1.first_name).not.toBe(identity2.first_name);
  });
});
```

### Example: Testing Risk Scoring Service

Create `frontend/src/services/risk-scoring.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { riskScorer } from './risk-scoring';
import { gameStore } from '../state/GameStore';

describe('Risk Scoring Service', () => {
  beforeEach(async () => {
    // Clear game store
    gameStore.clear();
    
    // Initialize risk scorer
    await riskScorer.initialize();
  });

  it('should initialize successfully', async () => {
    // Risk scorer should be initialized from beforeEach
    expect(riskScorer).toBeDefined();
  });

  it('should return low risk for citizen with no records', () => {
    // Add a basic citizen
    const citizenId = 'test-citizen-1';
    gameStore.addNPC({
      id: citizenId,
      first_name: 'John',
      last_name: 'Doe',
      date_of_birth: '1990-01-01',
      ssn: '123456789',
      street_address: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      zip_code: '62701',
      role: 'citizen',
      sprite_key: 'citizen_male_01',
      map_x: 10,
      map_y: 10,
      is_scenario_npc: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const assessment = riskScorer.calculateRiskScore(citizenId);
    
    expect(assessment.risk_score).toBeLessThan(20);
    expect(assessment.risk_level).toBe('low');
  });

  it('should calculate higher risk for citizen with criminal records', () => {
    // Add citizen with criminal history
    const citizenId = 'test-citizen-2';
    
    // Add NPC
    gameStore.addNPC({
      id: citizenId,
      first_name: 'Jane',
      last_name: 'Smith',
      // ... other required fields
    });

    // Add criminal record
    gameStore.addJudicialRecord({
      id: 'judicial-1',
      npc_id: citizenId,
      arrest_date: '2023-01-15',
      charge: 'Theft',
      disposition: 'convicted',
      sentence: '6 months probation',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const assessment = riskScorer.calculateRiskScore(citizenId);
    
    expect(assessment.risk_score).toBeGreaterThan(20);
    expect(assessment.contributing_factors).toHaveLength(1);
    expect(assessment.contributing_factors[0].factor_name).toContain('criminal');
  });
});
```

### Example: Testing Game Orchestrator

Create `frontend/src/services/game-orchestrator.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { initializeGame, getDashboardData, resetGame } from './game-orchestrator';
import { gameStore } from '../state/GameStore';

describe('Game Orchestrator', () => {
  beforeEach(() => {
    resetGame();
  });

  it('should initialize a new game with citizens', async () => {
    await initializeGame(10); // Generate 10 citizens
    
    const stats = gameStore.getStats();
    expect(stats.npcs).toBe(10);
    expect(stats.operator).toBe(1);
    expect(stats.directives).toBeGreaterThan(0);
  });

  it('should return dashboard data after initialization', async () => {
    await initializeGame(10);
    
    const operator = gameStore.getOperator();
    expect(operator).toBeDefined();
    
    const dashboard = getDashboardData(operator!.id);
    
    expect(dashboard.operator).toBeDefined();
    expect(dashboard.directive).toBeDefined();
    expect(dashboard.metrics).toBeDefined();
    expect(dashboard.alerts).toBeInstanceOf(Array);
    expect(dashboard.pending_cases).toBe(10);
  });
});
```

## Running Tests

```bash
# Run all tests in watch mode
pnpm test

# Run tests once
pnpm test:run

# Run with UI
pnpm test:ui

# Run with coverage
pnpm test:coverage
```

## Test Organization

```
frontend/src/
├── generators/
│   ├── identity.ts
│   └── identity.test.ts        # Tests for identity generator
├── services/
│   ├── risk-scoring.ts
│   └── risk-scoring.test.ts    # Tests for risk scoring
└── test/
    ├── setup.ts                # Test setup and utilities
    └── mocks/                  # Mock data and services
```

## Testing Best Practices

### 1. Unit Tests (Fast, Isolated)
- Test individual functions/services
- Mock dependencies
- Focus on business logic

### 2. Integration Tests (Medium Speed)
- Test multiple services working together
- Use real GameStore (in-memory)
- Test data flow

### 3. E2E Tests (Slow, Comprehensive)
- Would require Playwright or Cypress
- Test full user workflows
- Not included in this basic setup

## Comparison: pytest vs Vitest

| Feature | pytest (Python) | Vitest (TypeScript) |
|---------|----------------|---------------------|
| Test runner | `pytest` | `vitest` |
| Test files | `test_*.py` or `*_test.py` | `*.test.ts` or `*.spec.ts` |
| Assertions | `assert x == y` | `expect(x).toBe(y)` |
| Fixtures | `@pytest.fixture` | `beforeEach()`, `afterEach()` |
| Mocking | `unittest.mock` | `vi.mock()` |
| Parametrize | `@pytest.mark.parametrize` | `it.each()` |
| Coverage | `pytest --cov` | `vitest --coverage` |
| Watch mode | `pytest-watch` | Built-in `vitest` |

## Example Test Session

```bash
$ pnpm test

 ✓ src/generators/identity.test.ts (3 tests) 12ms
 ✓ src/services/risk-scoring.test.ts (3 tests) 145ms
 ✓ src/services/game-orchestrator.test.ts (2 tests) 203ms

 Test Files  3 passed (3)
      Tests  8 passed (8)
   Start at  10:30:15
   Duration  1.24s
```

## Next Steps

1. **Install dependencies** - Run the installation command
2. **Create test files** - Start with critical services (risk-scoring, game-orchestrator)
3. **Run tests** - Use watch mode during development
4. **Add coverage** - Aim for >70% coverage on services
5. **CI Integration** - Add tests to GitHub Actions workflow

## Tips

- **Test behavior, not implementation** - Focus on what the function does, not how
- **Use descriptive test names** - "should calculate high risk for criminal records"
- **Keep tests focused** - One concept per test
- **Mock external dependencies** - JSON files, localStorage, etc.
- **Use beforeEach for setup** - Reset state between tests
- **Test edge cases** - Empty arrays, null values, extreme numbers

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Vitest UI](https://vitest.dev/guide/ui.html)

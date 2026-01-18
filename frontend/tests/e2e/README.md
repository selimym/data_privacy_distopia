# E2E Tests for Data Privacy Dystopia Game

End-to-end tests using Playwright to verify complete game flows and prevent regressions.

## Prerequisites

Before running E2E tests, ensure:

1. **Backend is running** on `http://localhost:8000`
   ```bash
   cd backend && uv run uvicorn datafusion.main:app --reload
   ```

2. **Database is seeded** with test data
   ```bash
   make seed-db
   ```

3. **Frontend dependencies are installed**
   ```bash
   cd frontend && pnpm install
   ```

## Running Tests

### All Tests (Headless)
```bash
cd frontend
pnpm test:e2e
```

### Interactive UI Mode
```bash
pnpm test:e2e:ui
```

### Headed Mode (See Browser)
```bash
pnpm test:e2e:headed
```

### Debug Mode
```bash
pnpm test:e2e:debug
```

### Specific Test File
```bash
pnpm test:e2e tests/e2e/system-mode.spec.ts
```

## Test Structure

```
frontend/tests/e2e/
├── README.md                    # This file
├── system-mode.spec.ts          # System Mode gameplay tests
├── helpers/
│   ├── game-setup.ts            # Game navigation utilities
│   ├── api-helpers.ts           # Direct API interactions
│   └── assertions.ts            # Custom game assertions
```

## Key Tests

### System Mode Tests (`system-mode.spec.ts`)

1. **Regression Test: Citizens Load on First Launch**
   - Verifies fix for bug where 500 errors prevented citizens from appearing
   - Ensures risk scoring failures don't cause empty citizen queues
   - Checks for no 500 errors on `/api/system/dashboard-with-cases`

2. **Critical Path: Complete System Mode Playthrough**
   - Start System Mode
   - Load dashboard with citizens
   - Select and flag a citizen
   - Advance time
   - Verify outcomes appear
   - (Future: Complete 6-week campaign)

3. **Edge Case: Empty Citizen Queue**
   - Handles scenario where no citizens exist gracefully

4. **Risk Score Display**
   - Verifies risk scores calculate and display correctly
   - No console errors related to risk scoring

## Writing New Tests

### Using Helper Functions

```typescript
import { test, expect } from '@playwright/test';
import { startSystemMode, waitForGameReady } from './helpers/game-setup';
import { assertDashboardVisible, assertCitizensVisible } from './helpers/assertions';

test('my new test', async ({ page }) => {
  await startSystemMode(page);
  await waitForGameReady(page);
  await assertDashboardVisible(page);
  await assertCitizensVisible(page, 3); // At least 3 citizens
});
```

### Adding Test IDs to UI

For reliable E2E tests, add `data-testid` attributes to UI elements:

```typescript
// Good
<div data-testid="citizen-case">...</div>

// Also acceptable
<div className="citizen-card">...</div>
```

Preferred selectors (in order):
1. `data-testid` attributes
2. Role-based selectors (`getByRole`)
3. Text-based selectors (`getByText`)
4. Class names (less reliable)

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install backend dependencies
        run: cd backend && uv sync

      - name: Install frontend dependencies
        run: cd frontend && pnpm install

      - name: Seed database
        run: make seed-db

      - name: Run E2E tests
        run: cd frontend && pnpm test:e2e

      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: frontend/playwright-report/
```

## Debugging Failed Tests

### View Test Report
```bash
pnpm exec playwright show-report
```

### View Screenshots
Failed tests automatically capture screenshots in `test-results/`

### View Videos
Failed tests record videos (if enabled in config) in `test-results/`

### Run in Debug Mode
```bash
pnpm test:e2e:debug
```

This opens Playwright Inspector where you can:
- Step through test actions
- Inspect elements
- View console logs
- See network requests

## Troubleshooting

### Test Timeout
If tests timeout, increase timeout in `playwright.config.ts`:
```typescript
timeout: 60 * 1000, // 60 seconds
```

### Flaky Tests
Playwright has built-in auto-waiting, but if tests are flaky:
1. Use `await expect(element).toBeVisible()` instead of `waitForTimeout`
2. Increase `expect.timeout` in config
3. Use `test.retry()` for genuinely flaky tests

### Backend Not Running
Tests will fail if backend isn't running. The config has `webServer` to auto-start frontend, but backend must be started manually.

### Database Not Seeded
Tests expect citizens to exist. Run `make seed-db` before testing.

## Future Improvements

- [ ] Add tests for Rogue Employee Mode
- [ ] Add tests for complete 6-week System Mode campaign
- [ ] Add visual regression testing (screenshot comparison)
- [ ] Add tests for time progression and outcomes
- [ ] Integrate with CI/CD pipeline
- [ ] Add MCP integration for Claude Code interactive testing
- [ ] Add performance benchmarks

## Related Documentation

- [Playwright Docs](https://playwright.dev)
- [Main Project README](../../../README.md)
- [Backend API Docs](../../../backend/README.md)

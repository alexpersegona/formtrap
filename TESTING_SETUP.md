# Testing Setup

## Test Configuration Summary

This project has two separate test suites properly configured:

### 1. Unit Tests (Vitest)
- **Location**: `src/**/*.{test,spec}.ts`
- **Framework**: Vitest
- **Environment**: Node.js with mocked SvelteKit modules
- **Run command**: `bun run test:unit` or `bun run test:unit -- --run`

**Current tests**: 10 tests passing
- `src/demo.spec.ts` - Example test
- `src/lib/server/rate-limit.test.ts` - Rate limiting unit tests

### 2. E2E Tests (Playwright)
- **Location**: `tests/e2e/**/*.e2e.ts`
- **Framework**: Playwright
- **Environment**: Real browser (Chromium)
- **Run command**: `bun run test:e2e`

**Current tests**: 8 tests
- `tests/e2e/rate-limiting.e2e.ts` - Rate limiting E2E tests
  - Login rate limiting
  - Forgot password rate limiting
  - API endpoint rate limiting
  - Error message display

## Important Notes

### DO NOT use `bun test`
When you run `bun test`, it uses Bun's built-in test runner instead of Vitest. This will cause errors like:
```
error: Cannot find module '$env/static/private'
```

### Correct Test Commands

```bash
# Run unit tests (Vitest)
bun run test:unit                 # Watch mode
bun run test:unit -- --run        # Single run
bun run test                      # Alias for single run

# Run E2E tests (Playwright)
bun run test:e2e                  # Run all E2E tests
bun run test:e2e --list           # List all E2E tests
bun run test:e2e --headed         # Run with visible browser
bun run test:e2e --debug          # Run in debug mode

# Run both (sequentially)
bun run test:unit -- --run && bun run test:e2e
```

## Configuration Files

### Unit Tests Configuration
- **vitest.config.ts** - Main Vitest configuration
  - Excludes E2E tests (`tests/**`, `**/*.e2e.ts`)
  - Sets up module aliases for SvelteKit `$env` modules
  - Configures test environment as Node.js
- **vitest.setup.ts** - Test setup (environment variables)
- **mocks/env.ts** - Mock for SvelteKit environment modules

### E2E Tests Configuration
- **playwright.config.ts** - Playwright configuration
  - Test directory: `./tests/e2e`
  - Test match pattern: `**/*.e2e.ts`
  - Starts dev server automatically before tests
  - Base URL: `http://localhost:5173`

## Environment Variables for Tests

The following environment variables are automatically set in tests:

```bash
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgres://postgres:@localhost:5432/sveltekit_test
BETTER_AUTH_SECRET=test-secret-key-for-testing-only
BETTER_AUTH_URL=http://localhost:5173
```

You can override these by setting them in your shell before running tests.

## Prerequisites

### For Unit Tests
- Redis server running on `localhost:6379` (or set `REDIS_URL`)
- No other dependencies

### For E2E Tests
- Redis server running
- PostgreSQL database (if testing features that use DB)
- Playwright browsers installed: `bunx playwright install chromium`

## Troubleshooting

### "Cannot find module '@playwright/test'"
The package is installed as `playwright`, not `@playwright/test`. Import from `playwright/test`:
```typescript
import { test, expect } from 'playwright/test';
```

### "Cannot find module '$env/static/private'"
You're running `bun test` instead of `bun run test:unit`. Use the package.json script.

### E2E tests not found
- Ensure test files have `.e2e.ts` extension
- Check playwright.config.ts has `testMatch: '**/*.e2e.ts'`

### Redis connection errors in tests
- Ensure Redis is running: `redis-cli ping` should return `PONG`
- Or set `REDIS_URL` environment variable to point to your Redis instance

## Test Results

### Latest Unit Test Run
```
✓ src/demo.spec.ts (1 test) 1ms
✓ src/lib/server/rate-limit.test.ts (9 tests) 25ms

Test Files  2 passed (2)
     Tests  10 passed (10)
```

### Latest E2E Test Discovery
```
8 tests found in tests/e2e/rate-limiting.e2e.ts:
- Login Rate Limiting (1 test)
- Forgot Password Rate Limiting (2 tests)
- API Endpoints (4 tests)
- Error Messages (1 test)
```

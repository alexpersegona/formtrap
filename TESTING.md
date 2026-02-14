# Testing Rate Limiting

This document explains how to test the rate limiting functionality using **standard Svelte/SvelteKit testing practices**.

---

## 🧪 Test Files Overview

### ✅ **Standard Approach (Use These)**

| File | Type | Framework | What It Tests |
|------|------|-----------|---------------|
| `src/lib/server/rate-limit.test.ts` | Unit Tests | **Vitest** | Rate limiting logic, helpers, Redis integration |
| `tests/rate-limiting.spec.ts` | E2E Tests | **Playwright** | UI forms, API endpoints, user experience |

### ⚠️ **Legacy Approach (Optional)**

| File | Type | When to Use |
|------|------|-------------|
| `test-rate-limiting.sh` | Shell Script | Quick manual API testing, CI/CD health checks |

> **Note:** The shell script is useful for quick checks but **not** the standard way Svelte developers test. Use Vitest and Playwright instead.

---

## 🚀 Running Tests

### **1. Unit Tests (Vitest)**

Test the rate limiting logic in isolation:

```bash
# Run all unit tests
npm run test

# Run only rate limiting tests
npm run test rate-limit

# Watch mode (re-runs on changes)
npm run test:watch

# With coverage
npm run test -- --coverage
```

**What it tests:**
- ✅ Rate limit logic (allows/blocks correctly)
- ✅ Counter increments
- ✅ Different identifier strategies (IP, IP+Email)
- ✅ Convenience helpers (`throttleLogin`, etc.)
- ✅ Error handling (fail-open if Redis down)

---

### **2. E2E Tests (Playwright)**

Test the full user experience:

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
npx playwright test

# Run only rate limiting tests
npx playwright test rate-limiting

# Run in UI mode (watch tests run)
npx playwright test --ui

# Debug mode
npx playwright test --debug
```

**What it tests:**
- ✅ Login form rate limiting (6 attempts)
- ✅ Forgot password form rate limiting (4 attempts)
- ✅ API endpoint responses (429 status codes)
- ✅ Error message display (user-friendly text)
- ✅ Toast notifications

---

### **3. Quick API Testing (Shell Script)**

For quick manual checks:

```bash
# Make sure dev server is running first
npm run dev

# In another terminal:
./test-rate-limiting.sh
```

This tests all 4 API endpoints and shows results in the terminal.

---

## 📁 Test File Structure

```
sk-test/
├── src/
│   └── lib/
│       └── server/
│           ├── rate-limit.ts           # Implementation
│           └── rate-limit.test.ts      # ✅ Vitest unit tests
├── tests/
│   └── rate-limiting.spec.ts           # ✅ Playwright E2E tests
├── test-rate-limiting.sh               # ⚠️  Optional shell script
└── TESTING.md                          # This file
```

---

## 🎯 Testing Best Practices

### **When to Use Each Test Type**

| Test Type | Use For | Don't Use For |
|-----------|---------|---------------|
| **Vitest (Unit)** | Logic, helpers, functions | UI, user flows |
| **Playwright (E2E)** | UI, forms, full user flows | Business logic |
| **Shell Script** | Quick API checks, CI health | Comprehensive testing |

### **Standard Svelte Testing Stack**

```
┌─────────────────────────────────────┐
│  Unit Tests (Vitest)                │  ← Test functions/logic
├─────────────────────────────────────┤
│  Component Tests (Vitest + Browser) │  ← Test Svelte components
├─────────────────────────────────────┤
│  E2E Tests (Playwright)              │  ← Test full user flows
└─────────────────────────────────────┘
```

---

## 🔧 Configuration

### **Vitest Config**
Already configured in `vite.config.ts`:
```typescript
test: {
  environment: 'node',  // Server tests run in Node
  include: ['src/**/*.{test,spec}.{js,ts}']
}
```

### **Playwright Config**
Create `playwright.config.ts` if needed:
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:5173',
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
  },
});
```

---

## 📊 Running in CI/CD

### **GitHub Actions Example**

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      redis:
        image: redis:alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npx playwright test
```

---

## 🐛 Debugging Tests

### **Vitest Debugging**
```bash
# Run specific test file
npm test src/lib/server/rate-limit.test.ts

# Run single test
npm test -- -t "should block requests exceeding the limit"

# Enable verbose output
npm test -- --reporter=verbose
```

### **Playwright Debugging**
```bash
# Debug mode (step through)
npx playwright test --debug

# Headed mode (see browser)
npx playwright test --headed

# Trace mode (record for playback)
npx playwright test --trace on
```

---

## 🔍 Test Coverage

### **Generate Coverage Report**
```bash
# Unit test coverage
npm test -- --coverage

# View in browser
open coverage/index.html
```

### **Coverage Goals**
- ✅ Rate limiting logic: 100%
- ✅ Error handling: 100%
- ✅ Helper functions: 100%
- ✅ Critical user flows: 100%

---

## ✅ Checklist Before Deployment

```bash
# 1. Run unit tests
npm test

# 2. Run E2E tests
npx playwright test

# 3. Quick API check (optional)
./test-rate-limiting.sh

# 4. Check coverage
npm test -- --coverage

# 5. Clear Redis
redis-cli FLUSHDB
```

---

## 📚 Learn More

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [SvelteKit Testing Guide](https://kit.svelte.dev/docs/testing)
- [Testing Library](https://testing-library.com/docs/svelte-testing-library/intro/)

---

## 🆚 Shell Script vs. Proper Tests

### **Why Shell Scripts Aren't Standard for Svelte:**

| Aspect | Shell Script | Vitest/Playwright |
|--------|--------------|-------------------|
| **Type Safety** | ❌ None | ✅ Full TypeScript |
| **IDE Support** | ❌ Limited | ✅ Full IntelliSense |
| **Test Reports** | ❌ Plain text | ✅ HTML, JSON, CI-friendly |
| **Debugging** | ❌ Manual | ✅ Built-in debugger |
| **Mocking** | ❌ Difficult | ✅ Easy with Vitest |
| **CI/CD** | ⚠️  Works but basic | ✅ Industry standard |
| **Cross-platform** | ⚠️  Unix only | ✅ Windows/Mac/Linux |
| **Maintainability** | ❌ Hard to maintain | ✅ Easy to maintain |

### **When Shell Scripts ARE Useful:**

- ✅ Quick manual debugging
- ✅ DevOps/infrastructure testing
- ✅ CI/CD health checks
- ✅ One-off data migrations
- ✅ Backend API testing (non-frontend)

---

## 🎓 Summary

**For Svelte/SvelteKit projects, always prefer:**
1. **Vitest** for unit/integration tests
2. **Playwright** for E2E tests
3. **Testing Library** for component tests (if needed)

The shell script is a helpful utility, but **proper test files** are the industry standard and what other Svelte developers will expect to see in your codebase.

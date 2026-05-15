---
name: webapp-testing
description: >
  Browser-based UI verification using Playwright. Covers Page Object Model, selector best practices
  (data-testid, role-based), visual regression, network interception, MCP integration, and
  CI pipeline configuration.
  Trigger: When writing E2E tests, verifying UI behavior, setting up Playwright, or debugging
  flaky browser tests.
license: MIT
metadata:
  author: JNZader
  version: "1.0"
  tags: [playwright, e2e, testing, browser, ui, page-objects, visual-regression]
  category: testing
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
---

## Purpose

Unit tests verify logic. Integration tests verify contracts. But NEITHER tells you if the user can actually click the button, see the form, or complete the checkout. Webapp testing with Playwright fills that gap — real browser, real interactions, real confidence.

---

## When to Activate

- Writing new E2E or integration tests for web applications
- Setting up Playwright in a project for the first time
- Debugging flaky browser tests
- Adding visual regression testing
- Using Playwright MCP for AI-driven browser interaction
- Reviewing test code that touches browser automation

---

## Project Structure

```
tests-e2e/
  fixtures/              # Custom fixtures and test setup
    base.fixture.ts      # Extended test with common setup
  pages/                 # Page Object Models
    login.page.ts
    dashboard.page.ts
    components/          # Reusable component objects
      nav.component.ts
      modal.component.ts
  specs/                 # Test specifications
    auth/
      login.spec.ts
      signup.spec.ts
    dashboard/
      overview.spec.ts
  helpers/               # Test utilities
    api.helper.ts        # API shortcuts for test setup
    data.helper.ts       # Test data factories
  visual/                # Visual regression snapshots
    baseline/
playwright.config.ts     # Playwright configuration
```

---

## Page Object Model

### Structure

```typescript
// pages/login.page.ts
import { type Locator, type Page } from '@playwright/test';

export class LoginPage {
  // Declare locators as readonly properties
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(private readonly page: Page) {
    this.emailInput = page.getByRole('textbox', { name: 'Email' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password' });
    this.submitButton = page.getByRole('button', { name: 'Sign in' });
    this.errorMessage = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }
}
```

### Rules for Page Objects

1. **Locators in constructor** — declare all locators as class properties, initialize in constructor
2. **Methods return void or Page Objects** — navigation methods return the destination page
3. **No assertions in Page Objects** — except `expect*` convenience methods that wrap a single assertion
4. **One file per page** — components shared across pages go in `components/`
5. **Use `readonly`** — locators and page reference should be immutable

---

## Selector Strategy (Priority Order)

Use selectors in this order. Higher priority = more resilient to UI changes.

### 1. Role-based (PREFERRED)

```typescript
// Best: accessible and resilient
page.getByRole('button', { name: 'Submit' });
page.getByRole('heading', { name: 'Dashboard' });
page.getByRole('link', { name: 'Settings' });
page.getByRole('textbox', { name: 'Email' });
page.getByRole('checkbox', { name: 'Remember me' });
```

### 2. Label and placeholder

```typescript
page.getByLabel('Email address');
page.getByPlaceholder('Enter your email');
```

### 3. Test ID (when role/label is insufficient)

```typescript
// Use data-testid for complex components without clear accessible names
page.getByTestId('user-avatar-dropdown');
page.getByTestId('chart-container');
```

### 4. Text content (for static content)

```typescript
page.getByText('Welcome back');
page.getByText(/total: \$[\d.]+/i);
```

### 5. CSS selectors (LAST RESORT)

```typescript
// Only when nothing else works — fragile, breaks on refactors
page.locator('.legacy-widget > .inner-content');
```

### NEVER use

```typescript
// BAD — brittle, implementation-dependent
page.locator('#submit-btn-v2');           // IDs change
page.locator('.btn.btn-primary.mt-4');    // Class names change
page.locator('div > div > form > button'); // Structure changes
page.locator('[data-cy="submit"]');        // Wrong convention (Cypress)
```

---

## Writing Tests

### Test Structure

```typescript
// specs/auth/login.spec.ts
import { test, expect } from '../../fixtures/base.fixture';
import { LoginPage } from '../../pages/login.page';

test.describe('Login', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await loginPage.login('user@test.com', 'password123');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('invalid credentials show error', async () => {
    await loginPage.login('wrong@test.com', 'bad-password');

    await loginPage.expectError('Invalid email or password');
  });

  test('empty form shows validation errors', async () => {
    await loginPage.submitButton.click();

    await expect(loginPage.emailInput).toHaveAttribute('aria-invalid', 'true');
  });
});
```

### Key Patterns

```typescript
// Wait for network idle after navigation
await page.goto('/dashboard', { waitUntil: 'networkidle' });

// Wait for specific API response
const responsePromise = page.waitForResponse('**/api/users');
await page.getByRole('button', { name: 'Load users' }).click();
const response = await responsePromise;
expect(response.status()).toBe(200);

// Soft assertions (continue test on failure, report all at end)
await expect.soft(page.getByTestId('status')).toHaveText('Active');
await expect.soft(page.getByTestId('role')).toHaveText('Admin');

// Retry flaky locators with timeout
await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });
```

---

## Network Interception

```typescript
// Mock API responses for deterministic tests
test('shows error state on API failure', async ({ page }) => {
  await page.route('**/api/dashboard', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Internal server error' }),
    })
  );

  await page.goto('/dashboard');
  await expect(page.getByRole('alert')).toContainText('Something went wrong');
});

// Intercept and modify responses
await page.route('**/api/users', async (route) => {
  const response = await route.fetch();
  const json = await response.json();
  json.users = json.users.slice(0, 2); // Limit for testing
  await route.fulfill({ response, json });
});

// Block heavy resources in tests
await page.route('**/*.{png,jpg,svg}', (route) => route.abort());
```

---

## Visual Regression

### Setup

```typescript
// playwright.config.ts
export default defineConfig({
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01, // Allow 1% pixel difference
      threshold: 0.2,          // Color difference threshold
    },
  },
  updateSnapshots: 'missing',   // Auto-create baseline on first run
});
```

### Writing Visual Tests

```typescript
test('dashboard matches visual baseline', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  // Full page screenshot
  await expect(page).toHaveScreenshot('dashboard-full.png', {
    fullPage: true,
  });

  // Component screenshot
  const chart = page.getByTestId('revenue-chart');
  await expect(chart).toHaveScreenshot('revenue-chart.png');
});

// Mask dynamic content
await expect(page).toHaveScreenshot('profile.png', {
  mask: [
    page.getByTestId('timestamp'),
    page.getByTestId('random-avatar'),
  ],
});
```

### Visual Regression Rules

1. **Mask all dynamic content** — timestamps, avatars, random data
2. **Use `networkidle`** — wait for all assets to load before capturing
3. **Separate visual tests from functional** — visual tests are slower, run them in a dedicated suite
4. **Review diffs in CI** — never auto-approve visual changes
5. **Platform-specific baselines** — font rendering differs across OS; use Docker for CI

---

## Playwright MCP Integration

When using Playwright MCP server for AI-driven browser interaction:

### Setup

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@anthropic/mcp-playwright"]
    }
  }
}
```

### Usage Pattern

```
1. Use MCP to NAVIGATE and INTERACT with the running app
2. Use MCP to VERIFY visual state (screenshots, element visibility)
3. Convert verified interactions into proper Playwright test code
4. Do NOT use MCP as a substitute for actual test files
```

### MCP Workflow

```
Step 1: Start the dev server
Step 2: Use playwright MCP to browse the app
Step 3: Identify the user flow to test
Step 4: Write the Page Object and spec file
Step 5: Run the spec with `npx playwright test`
Step 6: Use MCP to debug failures (take screenshots, inspect DOM)
```

---

## Configuration

### Recommended playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests-e2e/specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Anti-Flakiness Checklist

1. **Never use `page.waitForTimeout()`** — use `expect().toBeVisible()` or `waitForResponse()`
2. **Never use `nth()` without context** — fragile index-based selection
3. **Always `await` Playwright actions** — missing await = race condition
4. **Use `test.slow()`** for known slow tests instead of arbitrary timeouts
5. **Isolate test data** — each test creates its own state via API helpers
6. **Reset state in `beforeEach`** — never depend on test execution order
7. **Use `toPass()` for polling assertions** — retries until timeout

```typescript
// Polling assertion — retries the block until it passes
await expect(async () => {
  const count = await page.getByTestId('item').count();
  expect(count).toBe(5);
}).toPass({ timeout: 10_000 });
```

---

## CI Pipeline

```yaml
# GitHub Actions example
playwright-tests:
  runs-on: ubuntu-latest
  container:
    image: mcr.microsoft.com/playwright:v1.50.0-noble
  steps:
    - uses: actions/checkout@v4
    - run: npm ci
    - run: npx playwright test
    - uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: playwright-report
        path: playwright-report/
```

---

## Critical Rules

1. ALWAYS use role-based selectors as first choice. Fall back to `data-testid` only when necessary.
2. Page Objects MUST NOT contain assertions (except thin `expect*` wrappers).
3. NEVER use `page.waitForTimeout()` — always wait for a specific condition.
4. Every test MUST be independent — no shared state, no execution order dependency.
5. Visual regression baselines MUST be reviewed by humans, never auto-approved.
6. Network mocks MUST match the actual API contract — do not invent response shapes.
7. MCP browser interaction is for EXPLORATION only — always convert findings into proper test files.
8. All `data-testid` values MUST follow kebab-case convention: `data-testid="user-profile-card"`.

/**
 * SAFE Notes E2E Tests — OpenCap Stack
 * Issue #547
 *
 * Covers:
 *   1. SAFE notes list page loads and displays correctly
 *   2. Create SAFE note flow — success message appears OR new row visible
 *   3. Dilution calculator page loads without crashing
 *
 * Auth strategy:
 *   - Inject a structurally valid JWT as both a cookie (for Next.js Edge
 *     Middleware) and localStorage (for client-side AuthContext).
 *   - Mock /api/v1/auth/me and /api/v1/safes so the test is not dependent
 *     on a live backend or rate-limited login.
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

const FRONT_BASE = process.env.FRONTEND_URL || 'https://opencapstack.com';

// A structurally valid JWT (signature not verified client-side).
// Payload: { userId: "mock-001", role: "founder", exp: 9999999999 }
const MOCK_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJ1c2VySWQiOiJtb2NrLTAwMSIsInJvbGUiOiJmb3VuZGVyIiwiZXhwIjo5OTk5OTk5OTk5fQ' +
  '.mock_sig_not_verified_client_side';

const MOCK_USER = {
  id: 'mock-user-001',
  userId: 'mock-user-001',
  email: 'mock@opencapstack.com',
  role: 'founder',
  status: 'active',
  firstName: 'QA',
  lastName: 'SAFE',
};

// Seed data returned by the mocked GET /safes endpoint
const MOCK_SAFES = [
  {
    id: 'safe-seed-001',
    investorName: 'Seed Capital Partners',
    investmentAmount: 250000,
    valuationCap: 4000000,
    discountRate: 15,
    safeType: 'post-money',
    status: 'open',
    date: '2025-01-15',
  },
];

// The new SAFE returned by POST /safes
const CREATED_SAFE = {
  id: 'safe-new-001',
  investorName: 'Test Ventures',
  investmentAmount: 500000,
  valuationCap: 5000000,
  discountRate: 20,
  safeType: 'post-money',
  status: 'open',
  date: new Date().toISOString().slice(0, 10),
};

// ─── shared auth injection ────────────────────────────────────────────────────

/**
 * Inject mock authentication so both Next.js Edge Middleware (cookie) and
 * client-side AuthContext (localStorage + /auth/me mock) accept the session.
 */
async function injectMockAuth(page, overrides = {}) {
  const user = { ...MOCK_USER, ...overrides.user };
  const token = overrides.token || MOCK_TOKEN;

  // Cookie — checked by Next.js middleware before React renders
  await page.context().addCookies([
    {
      name: 'token',
      value: token,
      domain: new URL(FRONT_BASE).hostname,
      path: '/',
      httpOnly: false,
      sameSite: 'Lax',
    },
  ]);

  // /auth/me — called by AuthContext.restoreSession()
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user }),
    })
  );

  // /auth/profile — alternate endpoint used by some code paths
  await page.route('**/api/v1/auth/profile', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user }),
    })
  );

  // localStorage — client-side token for axios Bearer header
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', 'mock-refresh-token');
      localStorage.setItem('user', JSON.stringify(user));
    },
    { token, user }
  );
}

/**
 * Screenshot helper — saves to e2e/screenshots/ with a descriptive name.
 * Never throws; a screenshot failure should not fail the test.
 */
async function snap(page, name) {
  try {
    const screenshotsDir = path.join(__dirname, 'screenshots');
    await page.screenshot({
      path: path.join(screenshotsDir, `safe-notes-${name}-${Date.now()}.png`),
      fullPage: false,
    });
  } catch (_) {
    // ignore screenshot errors
  }
}

/**
 * Fill the "New SAFE Note" modal form using the placeholder text visible
 * in screenshots. The modal uses labels directly above each input with no
 * wrapping element between them, so we target by placeholder.
 */
async function fillSafeForm(page, { investor, amount, cap, discount }) {
  // Investor Name — placeholder "e.g. Acme Ventures"
  await page.locator('input[placeholder="e.g. Acme Ventures"]').fill(investor);

  // Investment Amount — placeholder "e.g. 500000"
  await page.locator('input[placeholder="e.g. 500000"]').fill(amount);

  // Valuation Cap — placeholder "e.g. 10000000"
  await page.locator('input[placeholder="e.g. 10000000"]').fill(cap);

  // Discount Rate — placeholder "e.g. 20"
  await page.locator('input[placeholder="e.g. 20"]').fill(discount);
}

// ─── SAFE notes list ──────────────────────────────────────────────────────────

test.describe('SAFE Notes — list page', () => {
  test.beforeEach(async ({ page }) => {
    await injectMockAuth(page);

    // Mock the GET /safes endpoint so the list renders without a live backend
    await page.route('**/api/v1/safes**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ safes: MOCK_SAFES }),
        });
      } else {
        await route.continue();
      }
    });
  });

  test('SAFE notes page loads and shows heading', async ({ page }) => {
    await page.goto(`${FRONT_BASE}/safe-notes`, { waitUntil: 'domcontentloaded' });
    await snap(page, 'list-loaded');

    // Page should not redirect to /login
    expect(page.url()).not.toContain('/login');

    // Heading must be visible
    await expect(page.locator('h1').filter({ hasText: /SAFE/i })).toBeVisible({
      timeout: 15000,
    });
  });

  test('SAFE notes page renders the "New SAFE" button', async ({ page }) => {
    await page.goto(`${FRONT_BASE}/safe-notes`, { waitUntil: 'domcontentloaded' });
    await snap(page, 'new-safe-button');

    const addButton = page
      .getByRole('button', { name: /new safe|add safe/i })
      .first();
    await expect(addButton).toBeVisible({ timeout: 15000 });
  });
});

// ─── SAFE notes creation ──────────────────────────────────────────────────────

test.describe('SAFE Notes — create SAFE flow', () => {
  test.beforeEach(async ({ page }) => {
    await injectMockAuth(page);
  });

  test('Create SAFE note — success message shown or new entry visible', async ({ page }) => {
    // Track how many GET requests have been made so the second GET (after
    // invalidation) returns the freshly-created SAFE in the list.
    let getCount = 0;

    await page.route('**/api/v1/safes**', async (route) => {
      if (route.request().method() === 'GET') {
        getCount += 1;
        const safes = getCount === 1 ? MOCK_SAFES : [...MOCK_SAFES, CREATED_SAFE];
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ safes }),
        });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: CREATED_SAFE }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(`${FRONT_BASE}/safe-notes`, { waitUntil: 'domcontentloaded' });
    await snap(page, 'create-before-open');

    // Open the create modal
    const addButton = page
      .getByRole('button', { name: /new safe/i })
      .first();
    await expect(addButton).toBeVisible({ timeout: 15000 });
    await addButton.click();
    await snap(page, 'create-modal-open');

    // Fill in the form fields using known placeholder text
    await fillSafeForm(page, {
      investor: 'Test Ventures',
      amount: '500000',
      cap: '5000000',
      discount: '20',
    });

    await snap(page, 'create-form-filled');

    // Scroll the Save button into view and click it
    const saveButton = page.getByRole('button', { name: /^save$/i }).first();
    await saveButton.scrollIntoViewIfNeeded();
    await expect(saveButton).toBeVisible({ timeout: 5000 });
    await saveButton.click();

    await snap(page, 'create-submitted');

    // After submission, either a success message is shown or the new SAFE
    // appears in the table. Accept either outcome.
    const successBanner = page.locator('text=SAFE note added successfully');
    const newRow = page.locator('text=Test Ventures');

    await expect(successBanner.or(newRow)).toBeVisible({ timeout: 10000 });

    await snap(page, 'create-success');
  });

  test('Submit button is disabled while saving', async ({ page }) => {
    // Slow down the POST so we can observe the disabled state
    await page.route('**/api/v1/safes**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ safes: [] }),
        });
      } else if (route.request().method() === 'POST') {
        await new Promise((r) => setTimeout(r, 800));
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: CREATED_SAFE }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(`${FRONT_BASE}/safe-notes`, { waitUntil: 'domcontentloaded' });

    const addButton = page
      .getByRole('button', { name: /new safe|add safe/i })
      .first();
    await expect(addButton).toBeVisible({ timeout: 15000 });
    await addButton.click();

    // Fill mandatory fields only
    await page.locator('input[placeholder="e.g. Acme Ventures"]').fill('Test Ventures');
    await page.locator('input[placeholder="e.g. 500000"]').fill('500000');

    const saveButton = page.getByRole('button', { name: /^save$/i }).first();
    await saveButton.scrollIntoViewIfNeeded();
    await saveButton.click();

    // Button should switch to "Saving..." and be disabled while in-flight
    await expect(
      page.getByRole('button', { name: /saving/i }).first()
    ).toBeDisabled({ timeout: 2000 });
  });

  test('API error is shown inline, not via alert()', async ({ page }) => {
    await page.route('**/api/v1/safes**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ safes: [] }),
        });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'investmentAmount is required' }),
        });
      } else {
        await route.continue();
      }
    });

    // Capture any dialog (alert/confirm/prompt) — if one fires, fail the test
    let alertFired = false;
    page.on('dialog', async (dialog) => {
      alertFired = true;
      await dialog.dismiss();
    });

    await page.goto(`${FRONT_BASE}/safe-notes`, { waitUntil: 'domcontentloaded' });

    const addButton = page
      .getByRole('button', { name: /new safe|add safe/i })
      .first();
    await expect(addButton).toBeVisible({ timeout: 15000 });
    await addButton.click();

    await page.locator('input[placeholder="e.g. Acme Ventures"]').fill('Test Ventures');
    await page.locator('input[placeholder="e.g. 500000"]').fill('1');

    const saveButton = page.getByRole('button', { name: /^save$/i }).first();
    await saveButton.scrollIntoViewIfNeeded();
    await saveButton.click();

    // Wait for error to render
    await page.waitForTimeout(1500);

    expect(alertFired).toBe(false);

    // Error message should appear inline within the form
    const inlineError = page.locator('.bg-red-50').or(
      page.locator('[class*="red-50"]')
    ).filter({ hasText: /failed|required|error/i });
    await expect(inlineError.first()).toBeVisible({ timeout: 5000 });
  });
});

// ─── Dilution calculator ──────────────────────────────────────────────────────

test.describe('SAFE Notes — dilution calculator', () => {
  test.beforeEach(async ({ page }) => {
    await injectMockAuth(page);
  });

  test('Dilution calculator page loads without crashing', async ({ page }) => {
    await page.goto(`${FRONT_BASE}/safe-notes/dilution-calculator`, {
      waitUntil: 'domcontentloaded',
    });
    await snap(page, 'dilution-calculator-loaded');

    expect(page.url()).not.toContain('/login');
    expect(page.url()).not.toContain('/error');

    // Heading must be present
    await expect(
      page.locator('h1').filter({ hasText: /dilution|calculator/i })
    ).toBeVisible({ timeout: 15000 });
  });

  test('Dilution calculator shows inputs and calculate button', async ({ page }) => {
    await page.goto(`${FRONT_BASE}/safe-notes/dilution-calculator`, {
      waitUntil: 'domcontentloaded',
    });

    await expect(
      page.locator('label').filter({ hasText: /pre-money/i })
    ).toBeVisible({ timeout: 15000 });

    await expect(
      page.getByRole('button', { name: /calculate/i })
    ).toBeVisible();

    await snap(page, 'dilution-calculator-inputs');
  });

  test('Dilution calculator computes results when valid inputs are provided', async ({ page }) => {
    await page.goto(`${FRONT_BASE}/safe-notes/dilution-calculator`, {
      waitUntil: 'domcontentloaded',
    });

    await expect(
      page.locator('label').filter({ hasText: /pre-money/i })
    ).toBeVisible({ timeout: 15000 });

    // Fill inputs using placeholder text visible in screenshots.
    // Note: Valuation Cap and Existing Shares both use placeholder "e.g. 10000000",
    // so we index them by position in the DOM (first = Valuation Cap, last = Existing Shares).
    const tenMillionInputs = page.locator('input[placeholder="e.g. 10000000"]');

    // Pre-money Valuation — unique placeholder "e.g. 8000000"
    await page.locator('input[placeholder="e.g. 8000000"]').fill('8000000');

    // SAFE Investment Amount — unique placeholder "e.g. 500000"
    await page.locator('input[placeholder="e.g. 500000"]').fill('500000');

    // Valuation Cap — first input with placeholder "e.g. 10000000"
    await tenMillionInputs.first().fill('5000000');

    // Discount Rate — unique placeholder "e.g. 20"
    await page.locator('input[placeholder="e.g. 20"]').fill('20');

    // Existing Shares Outstanding — last input with placeholder "e.g. 10000000"
    await tenMillionInputs.last().fill('10000000');

    await snap(page, 'dilution-calculator-filled');

    // Scroll Calculate button into view and click
    const calcButton = page.getByRole('button', { name: /calculate/i });
    await calcButton.scrollIntoViewIfNeeded();
    await calcButton.click();

    await snap(page, 'dilution-calculator-results');

    // Results are rendered — scroll into view and verify content is present.
    // The "Dilution Impact Table" section is below the two-column layout.
    const dilutionTableHeading = page.locator('h2', { hasText: 'Dilution Impact Table' });
    await dilutionTableHeading.scrollIntoViewIfNeeded();
    await expect(dilutionTableHeading).toBeVisible({ timeout: 5000 });
  });
});

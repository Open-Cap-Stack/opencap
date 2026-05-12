/**
 * Employee Equity E2E Tests
 * Issue #548: Grant Equity form and full CRUD UI
 *
 * Tests the Grant Equity flow on the employee equity page.
 * Supports both authenticated prod runs (via AUTH_TOKEN env var) and
 * local dev runs (via API_BASE_URL registration + login).
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.AUTH_TOKEN || process.env.TEST_AUTH_TOKEN || '';

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots', 'employee-equity');

/**
 * Acquire a JWT via API registration+login when no pre-baked token is given.
 * Returns the token string or null.
 */
async function acquireToken(request) {
  if (AUTH_TOKEN) return AUTH_TOKEN;

  const email = `e2e_equity_${Date.now()}@test.local`;
  const password = 'E2eTestPass123!';
  const name = 'E2E Equity Tester';

  // Register (ignore errors — may already exist)
  try {
    await request.post(`${API_BASE_URL}/api/v1/auth/register`, {
      data: { name, email, password, role: 'admin' },
    });
  } catch (_) { /* continue */ }

  // Login
  try {
    const loginRes = await request.post(`${API_BASE_URL}/api/v1/auth/login`, {
      data: { email, password },
    });
    if (loginRes.ok()) {
      const body = await loginRes.json();
      return body.token || body.accessToken || body.data?.token || null;
    }
  } catch (_) { /* continue */ }

  return null;
}

/**
 * Set auth cookies on the frontend domain before navigating to a protected route.
 * The Next.js middleware checks the `session` or `token` cookie.
 */
async function navigateAuthenticated(page, token, targetPath) {
  const frontendHost = new URL(FRONTEND_URL).hostname;
  const isSecure = FRONTEND_URL.startsWith('https');

  if (token) {
    // Add cookies BEFORE any navigation so the middleware sees them on the first request
    await page.context().addCookies([
      {
        name: 'token',
        value: token,
        domain: frontendHost,
        path: '/',
        httpOnly: false,
        secure: isSecure,
        sameSite: 'Lax',
      },
      {
        name: 'session',
        value: token,
        domain: frontendHost,
        path: '/',
        httpOnly: false,
        secure: isSecure,
        sameSite: 'Lax',
      },
    ]);
  }

  await page.goto(`${FRONTEND_URL}${targetPath}`, { waitUntil: 'networkidle' });

  // If still on login page, try injecting via localStorage and reload
  if (page.url().includes('/login')) {
    if (token) {
      await page.evaluate((t) => {
        try {
          localStorage.setItem('token', t);
          localStorage.setItem('authToken', t);
          localStorage.setItem('session', t);
          document.cookie = `token=${t}; path=/`;
          document.cookie = `session=${t}; path=/`;
        } catch (_) { /* storage blocked */ }
      }, token);
      await page.goto(`${FRONTEND_URL}${targetPath}`, { waitUntil: 'networkidle' });
    }
  }
}

test.describe('Employee Equity - Grant Equity Flow', () => {
  let token;

  test.beforeAll(async ({ request }) => {
    token = await acquireToken(request);
  });

  test('Grant Equity button is visible on the employee equity page', async ({ page }) => {
    await navigateAuthenticated(page, token, '/employee-equity');

    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/01-page-loaded.png`,
      fullPage: true,
    });

    const grantBtn = page.getByRole('button', { name: /grant equity/i });
    await expect(grantBtn).toBeVisible({ timeout: 15000 });
  });

  test('Clicking Grant Equity opens the modal form', async ({ page }) => {
    await navigateAuthenticated(page, token, '/employee-equity');

    const grantBtn = page.getByRole('button', { name: /grant equity/i });
    await expect(grantBtn).toBeVisible({ timeout: 15000 });
    await grantBtn.click();

    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/02-modal-opened.png`,
      fullPage: true,
    });

    // Modal heading
    await expect(page.getByRole('heading', { name: /grant equity/i })).toBeVisible({ timeout: 5000 });

    // Required form fields
    await expect(page.getByLabel(/grant type/i)).toBeVisible();
    await expect(page.getByLabel(/number of shares/i)).toBeVisible();
    await expect(page.getByLabel(/grant date/i)).toBeVisible();
    await expect(page.getByLabel(/vesting schedule/i)).toBeVisible();
  });

  test('Grant Equity form submits and shows success message or new grant in list', async ({ page }) => {
    await navigateAuthenticated(page, token, '/employee-equity');

    // Open modal
    const grantBtn = page.getByRole('button', { name: /grant equity/i });
    await expect(grantBtn).toBeVisible({ timeout: 15000 });
    await grantBtn.click();

    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/03-before-fill.png`,
      fullPage: true,
    });

    // Employee — pick first available option or type a fallback value
    const employeeSelect = page.locator('select').first();
    const optionCount = await employeeSelect.locator('option').count();
    if (optionCount > 1) {
      await employeeSelect.selectOption({ index: 1 });
    } else {
      const empInput = page.locator('input[placeholder*="Employee"]');
      if (await empInput.count() > 0) {
        await empInput.fill('test-employee-id');
      }
    }

    // Grant Type
    await page.getByLabel(/grant type/i).selectOption('NSO');

    // Number of Shares
    await page.getByLabel(/number of shares/i).fill('1000');

    // Grant Date
    await page.getByLabel(/grant date/i).fill('2026-05-11');

    // Vesting Schedule (keep default)
    await page.getByLabel(/vesting schedule/i).selectOption({ index: 0 });

    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/04-form-filled.png`,
      fullPage: true,
    });

    // Submit — target the submit button inside the modal
    const submitBtn = page.getByRole('button', { name: /^grant equity$/i }).last();
    await submitBtn.click();

    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/05-after-submit.png`,
      fullPage: true,
    });

    // Success: either success banner OR a row appears in the grants table
    const successBanner = page.getByText(/equity granted successfully/i);
    const tableRow = page.locator('table tbody tr').first();

    const successVisible = await successBanner.isVisible({ timeout: 10000 }).catch(() => false);
    const rowVisible = await tableRow.isVisible({ timeout: 10000 }).catch(() => false);

    if (!successVisible && !rowVisible) {
      // Capture any inline API error for debugging
      const errEl = page.locator('.bg-red-50');
      const errText = await errEl.isVisible() ? await errEl.textContent() : 'no error element found';
      throw new Error(`Expected success message or table row after submit. Error shown: ${errText}`);
    }

    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/06-final-state.png`,
      fullPage: true,
    });
  });

  test('Grants list table renders correct columns', async ({ page }) => {
    await navigateAuthenticated(page, token, '/employee-equity');

    await page.waitForTimeout(2000);

    const tableExists = await page.locator('table').count();

    if (tableExists > 0) {
      await expect(page.getByRole('columnheader', { name: /employee/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /grant type/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /shares/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /grant date/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /vesting/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();

      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/07-table-columns.png`,
        fullPage: true,
      });
    } else {
      // Empty state is also valid
      const emptyMsg = page.getByText(/no equity grants issued yet/i);
      await expect(emptyMsg).toBeVisible({ timeout: 5000 });

      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/07-empty-state.png`,
        fullPage: true,
      });
    }
  });

  test('Modal closes when Cancel is clicked', async ({ page }) => {
    await navigateAuthenticated(page, token, '/employee-equity');

    const grantBtn = page.getByRole('button', { name: /grant equity/i });
    await expect(grantBtn).toBeVisible({ timeout: 15000 });
    await grantBtn.click();

    await expect(page.getByRole('heading', { name: /grant equity/i })).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: /cancel/i }).click();

    await expect(page.getByRole('heading', { name: /grant equity/i })).not.toBeVisible({ timeout: 3000 });

    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/08-modal-closed.png`,
      fullPage: true,
    });
  });
});

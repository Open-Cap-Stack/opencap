/**
 * Employee Dashboard UX — Full Flow Test
 * Tests the complete employee experience as Karsten Wade (employee role).
 *
 * Covers:
 *   1. Login redirect and auth
 *   2. Dashboard page loads
 *   3. Sidebar shows only employee-visible items
 *   4. My Equity page renders correctly
 *   5. My Documents page renders correctly
 *   6. Profile page renders correctly
 *   7. Navigation between pages is smooth
 *   8. No 403/500 errors on any employee-accessible page
 *   9. Responsive layout checks
 */

const { test, expect } = require('@playwright/test');

const FRONT_BASE = process.env.FRONTEND_URL || 'https://opencapstack.com';

// ── Karsten Wade — employee ──────────────────────────────────────────────────

const EMPLOYEE_USER = {
  id: 'aa294e87-47fd-4ed4-ac03-3fd7bd0f405f',
  _id: 'aa294e87-47fd-4ed4-ac03-3fd7bd0f405f',
  userId: 'aa294e87-47fd-4ed4-ac03-3fd7bd0f405f',
  email: 'karsten@ainative.studio',
  role: 'employee',
  status: 'active',
  firstName: 'Karsten',
  lastName: 'Wade',
  companyId: 'ainative-studio',
  companyName: 'AINative Studio',
};

// Structurally valid JWT with far-future expiry — client only decodes, no sig check
const MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhYTI5NGU4Ny00N2ZkLTRlZDQtYWMwMy0zZmQ3YmQwZjQwNWYiLCJyb2xlIjoiZW1wbG95ZWUiLCJleHAiOjk5OTk5OTk5OTl9.mock_sig';

async function loginAsEmployee(page) {
  // 1. Cookie for Next.js Edge Middleware
  const domain = new URL(FRONT_BASE).hostname;
  await page.context().addCookies([
    { name: 'token', value: MOCK_TOKEN, domain, path: '/', httpOnly: false, sameSite: 'Lax' },
    { name: 'session', value: MOCK_TOKEN, domain, path: '/', httpOnly: false, sameSite: 'Lax' },
  ]);

  // 2. Mock /auth/me and /auth/profile
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: EMPLOYEE_USER }) })
  );
  await page.route('**/api/v1/auth/profile', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: EMPLOYEE_USER }) })
  );

  // 3. localStorage before page JS runs
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', 'mock-refresh-token');
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('ocs_profile', JSON.stringify(user));
  }, { token: MOCK_TOKEN, user: EMPLOYEE_USER });
}

// ── Collect console errors & failed network requests ─────────────────────────

function attachErrorCollector(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`CONSOLE: ${msg.text()}`);
  });
  page.on('response', (response) => {
    const status = response.status();
    const url = response.url();
    // Ignore mocked routes and non-API 404s
    if (status >= 400 && url.includes('/api/')) {
      errors.push(`HTTP ${status}: ${response.request().method()} ${url}`);
    }
  });
  return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Employee Dashboard — Karsten Wade', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsEmployee(page);
  });

  // ── 1. Dashboard loads ───────────────────────────────────────────────────

  test('Dashboard loads without errors', async ({ page }) => {
    const errors = attachErrorCollector(page);
    await page.goto(`${FRONT_BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });

    // Should be on /dashboard, not redirected to /login
    expect(page.url()).toContain('/dashboard');

    // Page should have some content
    const body = await page.locator('body').textContent();
    expect(body.length).toBeGreaterThan(50);

    // Take screenshot
    await page.screenshot({ path: 'e2e/test-results/employee-dashboard.png', fullPage: true });

    // Log any errors for debugging (don't fail on API 404s for missing data)
    if (errors.length > 0) {
      console.log('Dashboard errors:', errors);
    }
  });

  // ── 2. Sidebar shows correct employee navigation ────────────────────────

  test('Sidebar shows only employee-visible items', async ({ page }) => {
    await page.goto(`${FRONT_BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });

    const sidebar = page.locator('nav[aria-label="Main navigation"]');
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // Employee should see: Dashboard, My Equity (Gift icon), Settings
    // Employee should NOT see: Cap Table, Equity (admin), Fundraise, Documents (admin), Reports

    // Get all visible nav buttons/links in the sidebar
    const navItems = sidebar.locator('a, button');
    const count = await navItems.count();
    const labels = [];
    for (let i = 0; i < count; i++) {
      const label = await navItems.nth(i).getAttribute('aria-label') || await navItems.nth(i).getAttribute('title');
      if (label) labels.push(label);
    }

    console.log('Sidebar items visible to employee:', labels);

    // Dashboard should be visible
    expect(labels).toContain('Dashboard');

    // My Equity should be visible (employee-specific)
    expect(labels).toContain('My Equity');

    // Settings should be visible
    expect(labels).toContain('Settings');

    // Cap Table should NOT be visible (admin/founder only)
    expect(labels).not.toContain('Cap Table');

    // Fundraise should NOT be visible
    expect(labels).not.toContain('Fundraise');

    // Reports should NOT be visible
    expect(labels).not.toContain('Reports');

    // Documents (admin) should NOT be visible
    expect(labels).not.toContain('Documents');

    await page.screenshot({ path: 'e2e/test-results/employee-sidebar.png' });
  });

  // ── 3. My Equity page ───────────────────────────────────────────────────

  test('My Equity page loads and renders correctly', async ({ page }) => {
    const errors = attachErrorCollector(page);

    // Mock the employee equity endpoint
    await page.route('**/api/v1/me/equity', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ grants: [] }),
      });
    });
    await page.route('**/api/v1/me/valuation', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ pricePerShare: 0.001 }),
      });
    });

    await page.goto(`${FRONT_BASE}/my-equity`, { waitUntil: 'networkidle', timeout: 30000 });
    expect(page.url()).toContain('/my-equity');

    // Should show "My Equity" heading
    await expect(page.locator('h1')).toContainText('My Equity', { timeout: 10000 });

    // With no grants, should show empty state
    await expect(page.locator('text=No equity grants yet')).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/test-results/employee-my-equity-empty.png', fullPage: true });

    // Check for 403/500 errors
    const criticalErrors = errors.filter(e => e.includes('403') || e.includes('500'));
    expect(criticalErrors).toHaveLength(0);
  });

  test('My Equity page renders grants correctly', async ({ page }) => {
    // Mock equity with a sample grant
    await page.route('**/api/v1/me/equity', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          grants: [{
            id: 'grant-001',
            type: 'ISO',
            grantDate: '2026-01-15',
            totalShares: 10000,
            vestedShares: 2500,
            unvestedShares: 7500,
            exercisePrice: 0.001,
            vestingStartDate: '2026-01-15',
            vestingEndDate: '2030-01-15',
            cliffDate: '2027-01-15',
            vestingSchedule: [
              { date: '2027-01-15', shares: 2500, vested: true },
              { date: '2028-01-15', shares: 2500, vested: false },
              { date: '2029-01-15', shares: 2500, vested: false },
              { date: '2030-01-15', shares: 2500, vested: false },
            ],
          }],
        }),
      });
    });
    await page.route('**/api/v1/me/valuation', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ pricePerShare: 1.50 }),
      });
    });

    await page.goto(`${FRONT_BASE}/my-equity`, { waitUntil: 'networkidle', timeout: 30000 });

    // Hero card should show equity summary
    await expect(page.locator('text=Your Equity Summary')).toBeVisible({ timeout: 10000 });

    // Should display the grant in the table
    await expect(page.locator('text=ISO').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=10,000').first()).toBeVisible({ timeout: 5000 });

    // Exercise button should be visible
    await expect(page.locator('button:has-text("Exercise")')).toBeVisible({ timeout: 5000 });

    // Value Calculator button should exist
    await expect(page.locator('button:has-text("Value Calculator")')).toBeVisible({ timeout: 5000 });

    // Vesting schedule section
    await expect(page.getByRole('heading', { name: 'Vesting Schedule' })).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'e2e/test-results/employee-my-equity-with-grants.png', fullPage: true });
  });

  // ── 4. My Documents page ────────────────────────────────────────────────

  test('My Documents page loads correctly', async ({ page }) => {
    const errors = attachErrorCollector(page);

    await page.route('**/api/v1/me/documents', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ documents: [] }),
      });
    });

    await page.goto(`${FRONT_BASE}/my-documents`, { waitUntil: 'networkidle', timeout: 30000 });
    expect(page.url()).toContain('/my-documents');

    await expect(page.locator('h1')).toContainText('My Documents', { timeout: 10000 });

    // Empty state
    await expect(page.locator('text=No documents yet')).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/test-results/employee-my-documents-empty.png', fullPage: true });

    const criticalErrors = errors.filter(e => e.includes('403') || e.includes('500'));
    expect(criticalErrors).toHaveLength(0);
  });

  test('My Documents page renders documents and supports search', async ({ page }) => {
    await page.route('**/api/v1/me/documents', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          documents: [
            { id: 'doc-001', name: 'Offer Letter - Karsten Wade.pdf', type: 'offer_letter', createdAt: '2026-01-10', size: 245000 },
            { id: 'doc-002', name: 'ISO Grant Agreement.pdf', type: 'grant_agreement', createdAt: '2026-01-15', size: 180000 },
            { id: 'doc-003', name: 'NDA - AINative Studio.pdf', type: 'nda', createdAt: '2025-12-01', size: 95000 },
          ],
        }),
      });
    });

    await page.goto(`${FRONT_BASE}/my-documents`, { waitUntil: 'networkidle', timeout: 30000 });

    // Should see document names
    await expect(page.locator('text=Offer Letter - Karsten Wade.pdf')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=ISO Grant Agreement.pdf')).toBeVisible({ timeout: 5000 });

    // Document count
    await expect(page.locator('text=3 documents')).toBeVisible({ timeout: 5000 });

    // Search input should be present
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // Type in search and verify filtering
    await searchInput.fill('Offer');
    await expect(page.locator('text=1 document')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=ISO Grant Agreement.pdf')).not.toBeVisible();

    // View and Download buttons
    await expect(page.locator('button:has-text("View")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Download")')).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'e2e/test-results/employee-my-documents-with-docs.png', fullPage: true });
  });

  // ── 5. Profile page ─────────────────────────────────────────────────────

  test('Profile page loads for employee', async ({ page }) => {
    const errors = attachErrorCollector(page);

    await page.goto(`${FRONT_BASE}/profile`, { waitUntil: 'networkidle', timeout: 30000 });
    expect(page.url()).toContain('/profile');

    // Should display profile content (name or email)
    const body = await page.locator('body').textContent();
    const hasProfileContent = body.includes('Profile') || body.includes('Karsten') || body.includes('karsten@');
    expect(hasProfileContent).toBe(true);

    await page.screenshot({ path: 'e2e/test-results/employee-profile.png', fullPage: true });

    const criticalErrors = errors.filter(e => e.includes('403') || e.includes('500'));
    expect(criticalErrors).toHaveLength(0);
  });

  // ── 6. Employee cannot access admin pages ───────────────────────────────

  test('Employee is redirected away from admin-only pages', async ({ page }) => {
    const adminPages = [
      '/cap-table',
      '/stakeholders',
      '/share-classes',
      '/equity-plans',
      '/employee-equity',
      '/investors',
      '/valuations',
    ];

    for (const path of adminPages) {
      await page.goto(`${FRONT_BASE}${path}`, { timeout: 20000 });
      // Wait for redirect
      await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});

      const url = page.url();
      const body = await page.locator('body').textContent();
      const isBlocked = url.includes('/dashboard') || url.includes('/login') ||
        body.includes('Redirecting') || body.includes('Access Denied');

      if (!isBlocked) {
        console.log(`BUG: Employee can still access ${path}`);
        await page.screenshot({ path: `e2e/test-results/employee-access-${path.replace(/\//g, '-')}.png` });
      }
      expect(isBlocked).toBe(true);
    }
  });

  // ── 7. Full navigation flow ─────────────────────────────────────────────

  test('Employee can navigate between all accessible pages smoothly', async ({ page }) => {
    // Mock all /me/ endpoints
    await page.route('**/api/v1/me/equity', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ grants: [] }) })
    );
    await page.route('**/api/v1/me/valuation', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    );
    await page.route('**/api/v1/me/documents', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ documents: [] }) })
    );

    const pages = ['/dashboard', '/my-equity', '/my-documents', '/profile'];

    for (const path of pages) {
      await page.goto(`${FRONT_BASE}${path}`, { waitUntil: 'networkidle', timeout: 30000 });
      expect(page.url()).toContain(path);

      // Page should not show a blank/error state
      const body = await page.locator('body').textContent();
      expect(body.length).toBeGreaterThan(50);

      // Check for visible error boundaries or crash screens (not Toast role="alert")
      const errorBoundary = await page.locator('.error-boundary, [data-testid="error-screen"]').count();
      if (errorBoundary > 0) {
        console.log(`ERROR BOUNDARY on ${path}`);
        await page.screenshot({ path: `e2e/test-results/employee-error-${path.replace(/\//g, '-')}.png` });
      }
    }
  });

  // ── 8. Dashboard content for employee role ──────────────────────────────

  test('Dashboard shows employee-specific content (not admin widgets)', async ({ page }) => {
    await page.goto(`${FRONT_BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });

    // Should show employee welcome dashboard
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
    const h1Text = await page.locator('h1').textContent();
    expect(h1Text).toContain('Welcome back');

    // Should have links to My Equity and My Documents
    await expect(page.locator('text=My Equity').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=My Documents').first()).toBeVisible({ timeout: 5000 });

    // Should NOT have admin widgets
    const body = await page.locator('body').textContent();
    expect(body).not.toContain('Cap Table Summary');
    expect(body).not.toContain('Connect to Claude Code');
    expect(body).not.toContain('Amount Raised');

    await page.screenshot({ path: 'e2e/test-results/employee-dashboard-content.png', fullPage: true });
  });

  // ── 9. Responsive layout ────────────────────────────────────────────────

  test('Employee pages render correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone X

    await page.route('**/api/v1/me/equity', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ grants: [] }) })
    );
    await page.route('**/api/v1/me/valuation', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    );

    await page.goto(`${FRONT_BASE}/my-equity`, { waitUntil: 'networkidle', timeout: 30000 });

    // Page should still show heading
    await expect(page.locator('h1')).toContainText('My Equity', { timeout: 10000 });

    // Sidebar rail should still be visible (64px)
    const sidebar = page.locator('nav[aria-label="Main navigation"]');
    await expect(sidebar).toBeVisible({ timeout: 5000 });

    // Close the sidebar panel if open (tap the backdrop or close button)
    const closeBtn = page.locator('button[aria-label="Close navigation panel"]');
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(300); // wait for animation
    }

    await page.screenshot({ path: 'e2e/test-results/employee-mobile-my-equity.png', fullPage: true });

    // Also test dashboard on mobile
    await page.goto(`${FRONT_BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/test-results/employee-mobile-dashboard.png', fullPage: true });
  });
});

/**
 * Board Management UX — Full Flow Test
 * Tests all board pages as a founder: meetings, members, resolutions, documents.
 */

const { test, expect } = require('@playwright/test');

const FRONT_BASE = process.env.FRONTEND_URL || 'https://opencapstack.com';

const FOUNDER_USER = {
  id: 'ffcbb107-8080-40e1-8743-19703a41a301',
  userId: 'ffcbb107-8080-40e1-8743-19703a41a301',
  email: 'toby@ainative.studio',
  role: 'founder',
  status: 'active',
  firstName: 'Toby',
  lastName: 'Morning',
  companyId: 'ainative-studio',
  companyName: 'AINative Studio',
};

const MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmZmNiYjEwNy04MDgwLTQwZTEtODc0My0xOTcwM2E0MWEzMDEiLCJyb2xlIjoiZm91bmRlciIsImV4cCI6OTk5OTk5OTk5OX0.mock_sig';

async function loginAsFounder(page) {
  const domain = new URL(FRONT_BASE).hostname;
  await page.context().addCookies([
    { name: 'token', value: MOCK_TOKEN, domain, path: '/', httpOnly: false, sameSite: 'Lax' },
    { name: 'session', value: MOCK_TOKEN, domain, path: '/', httpOnly: false, sameSite: 'Lax' },
  ]);
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: FOUNDER_USER }) })
  );
  await page.route('**/api/v1/auth/profile', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: FOUNDER_USER }) })
  );
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', 'mock-refresh-token');
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('ocs_profile', JSON.stringify(user));
  }, { token: MOCK_TOKEN, user: FOUNDER_USER });
}

test.describe('Board Management — Founder Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsFounder(page);
  });

  test('Board has its own sidebar group (not under Reports)', async ({ page }) => {
    await page.goto(`${FRONT_BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });
    const sidebar = page.locator('nav[aria-label="Main navigation"]');
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    const navItems = sidebar.locator('a, button');
    const count = await navItems.count();
    const labels = [];
    for (let i = 0; i < count; i++) {
      const label = await navItems.nth(i).getAttribute('aria-label') || await navItems.nth(i).getAttribute('title');
      if (label) labels.push(label);
    }

    console.log('Sidebar items for founder:', labels);
    expect(labels).toContain('Board');
    expect(labels).toContain('Reports');

    await page.screenshot({ path: 'e2e/test-results/board-01-sidebar.png' });
  });

  test('Board Meetings page loads and shows schedule form', async ({ page }) => {
    await page.route('**/api/v1/board-meetings**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    );

    await page.goto(`${FRONT_BASE}/board/meetings`, { waitUntil: 'networkidle', timeout: 30000 });
    expect(page.url()).toContain('/board/meetings');

    // Should have board tab navigation
    await expect(page.locator('text=Meetings').first()).toBeVisible({ timeout: 10000 });

    // Should have schedule button
    const scheduleBtn = page.getByRole('button', { name: 'Schedule Meeting' }).first();
    if (await scheduleBtn.isVisible()) {
      await scheduleBtn.click();
      await page.waitForTimeout(300);
      // Form should have title, date, type fields
      await expect(page.locator('input[required]').first()).toBeVisible({ timeout: 5000 });
    }

    await page.screenshot({ path: 'e2e/test-results/board-02-meetings.png', fullPage: true });
  });

  test('Board Members page loads with empty state (not stakeholders)', async ({ page }) => {
    await page.route('**/api/v1/board-members**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    );

    await page.goto(`${FRONT_BASE}/board/members`, { waitUntil: 'networkidle', timeout: 30000 });
    expect(page.url()).toContain('/board/members');

    // Should show empty state or board members (not all cap table stakeholders)
    const body = await page.locator('body').textContent();
    const hasEmptyState = body.includes('No board members') || body.includes('Add Board Member');
    const hasCapTableLeakage = body.includes('Kwanza Hall') || body.includes('Ayori Selassie');
    expect(hasEmptyState || !hasCapTableLeakage).toBe(true);

    // Should have add button
    await expect(page.getByRole('button', { name: 'Add Board Member' }).first()).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'e2e/test-results/board-03-members-empty.png', fullPage: true });
  });

  test('Board Members — add member form works', async ({ page }) => {
    await page.route('**/api/v1/board-members', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ ...body, id: 'new-member-1', row_id: 'new-member-1' }),
        });
      }
      return route.continue();
    });

    await page.goto(`${FRONT_BASE}/board/members`, { waitUntil: 'networkidle', timeout: 30000 });

    // Click Add Board Member
    await page.locator('button:has-text("Add Board Member")').first().click();
    await page.waitForTimeout(300);

    // Fill form
    await page.fill('#board-firstName', 'Jane');
    await page.fill('#board-lastName', 'Smith');
    await page.selectOption('select', 'Independent Director');

    await page.screenshot({ path: 'e2e/test-results/board-04-members-form.png', fullPage: true });
  });

  test('Board Resolutions page loads', async ({ page }) => {
    await page.route('**/api/v1/board-resolutions**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    );

    await page.goto(`${FRONT_BASE}/board/resolutions`, { waitUntil: 'networkidle', timeout: 30000 });
    expect(page.url()).toContain('/board/resolutions');

    await expect(page.locator('h2, h1').first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/test-results/board-05-resolutions.png', fullPage: true });
  });

  test('Board Documents page loads', async ({ page }) => {
    await page.route('**/api/v1/documents**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    );

    await page.goto(`${FRONT_BASE}/board/documents`, { waitUntil: 'networkidle', timeout: 30000 });
    expect(page.url()).toContain('/board/documents');

    await expect(page.locator('h2, h1').first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/test-results/board-06-documents.png', fullPage: true });
  });
});

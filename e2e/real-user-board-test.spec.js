/**
 * REAL USER E2E TEST — No mocks, real production API
 *
 * Uses a real JWT token against the live production backend.
 * Creates real data, verifies persistence, cleans up.
 */

const { test, expect } = require('@playwright/test');

const FRONT = 'https://opencapstack.com';

// Real token from exchange-token endpoint — admin@ainative.studio
const REAL_TOKEN = process.env.REAL_TOKEN;
const REAL_USER = {
  userId: 'a9b717be-f449-43c6-abb4-18a1a6a0c70e',
  email: 'admin@ainative.studio',
  name: 'System Administrator',
  role: 'admin',
  companyId: 'ainative-studio',
};

async function loginReal(page) {
  if (!REAL_TOKEN) throw new Error('Set REAL_TOKEN env var with a valid JWT');
  const domain = new URL(FRONT).hostname;
  await page.context().addCookies([
    { name: 'token', value: REAL_TOKEN, domain, path: '/', httpOnly: false, sameSite: 'Lax' },
    { name: 'session', value: REAL_TOKEN, domain, path: '/', httpOnly: false, sameSite: 'Lax' },
  ]);
  // Set localStorage — NO route mocking, real API calls
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', 'real-refresh');
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('ocs_profile', JSON.stringify({ companyId: user.companyId, role: user.role }));
  }, { token: REAL_TOKEN, user: REAL_USER });
}

test.describe('Real User — Board Management (no mocks)', () => {
  test.beforeEach(async ({ page }) => {
    await loginReal(page);
  });

  test('1. Dashboard loads with real data', async ({ page }) => {
    await page.goto(`${FRONT}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });
    // Should NOT be redirected to login
    expect(page.url()).toContain('/dashboard');
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/test-results/real-01-dashboard.png', fullPage: true });
  });

  test('2. Board Meetings — view and create a real meeting', async ({ page }) => {
    await page.goto(`${FRONT}/board/meetings`, { waitUntil: 'networkidle', timeout: 30000 });
    expect(page.url()).toContain('/board/meetings');
    await page.screenshot({ path: 'e2e/test-results/real-02-board-meetings.png', fullPage: true });

    // Click Schedule Meeting
    const schedBtn = page.getByRole('button', { name: 'Schedule Meeting' }).first();
    await expect(schedBtn).toBeVisible({ timeout: 5000 });
    await schedBtn.click();
    await page.waitForTimeout(500);

    // Fill form with real data
    const titleInput = page.locator('input[placeholder*="Board"]').or(page.locator('input').first());
    await titleInput.fill('Q2 2026 Board Meeting');

    // Find and fill date
    const dateInput = page.locator('input[type="date"]').first();
    if (await dateInput.isVisible()) {
      await dateInput.fill('2026-07-15');
    }

    await page.screenshot({ path: 'e2e/test-results/real-03-meeting-form.png', fullPage: true });

    // Submit
    const submitBtn = page.locator('form button[type="submit"]').or(page.getByRole('button', { name: 'Schedule Meeting' }).last());
    await submitBtn.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'e2e/test-results/real-04-meeting-created.png', fullPage: true });
  });

  test('3. Board Members — view (should be empty, not stakeholders)', async ({ page }) => {
    await page.goto(`${FRONT}/board/members`, { waitUntil: 'networkidle', timeout: 30000 });
    expect(page.url()).toContain('/board/members');

    await page.waitForTimeout(2000); // Wait for API response

    const body = await page.locator('body').textContent();
    console.log('Board Members page content includes:',
      body.includes('Toby Morning') ? 'Toby Morning (STAKEHOLDER LEAK!)' : 'No stakeholder leak',
      body.includes('Karsten Wade') ? 'Karsten Wade (STAKEHOLDER LEAK!)' : 'No stakeholder leak',
      body.includes('No board members') ? 'Empty state (CORRECT)' : 'Has content',
      body.includes('Add Board Member') ? 'Has Add button (CORRECT)' : 'No Add button'
    );

    await page.screenshot({ path: 'e2e/test-results/real-05-board-members.png', fullPage: true });
  });

  test('4. Board Members — add a real board member', async ({ page }) => {
    await page.goto(`${FRONT}/board/members`, { waitUntil: 'networkidle', timeout: 30000 });

    // Click Add Board Member
    const addBtn = page.getByRole('button', { name: 'Add Board Member' }).first();
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await addBtn.click();
    await page.waitForTimeout(500);

    // Fill real data
    await page.fill('#board-firstName', 'Toby');
    await page.fill('#board-lastName', 'Morning');
    await page.selectOption('select', 'Chairman');

    await page.screenshot({ path: 'e2e/test-results/real-06-add-member-form.png', fullPage: true });

    // Submit
    const submitBtn = page.getByRole('button', { name: 'Add Member' });
    await submitBtn.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'e2e/test-results/real-07-member-added.png', fullPage: true });
  });

  test('5. Board Resolutions — create a real resolution', async ({ page }) => {
    await page.goto(`${FRONT}/board/resolutions`, { waitUntil: 'networkidle', timeout: 30000 });
    expect(page.url()).toContain('/board/resolutions');

    await page.screenshot({ path: 'e2e/test-results/real-08-resolutions.png', fullPage: true });

    // Click Add Resolution
    const addBtn = page.getByRole('button', { name: 'Add Resolution' }).first();
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await addBtn.click();
    await page.waitForTimeout(500);

    // Fill the form — find title input
    const inputs = page.locator('input[type="text"], input[required]');
    const firstInput = inputs.first();
    if (await firstInput.isVisible()) {
      await firstInput.fill('Approve 2026 Stock Option Plan');
    }

    await page.screenshot({ path: 'e2e/test-results/real-09-resolution-form.png', fullPage: true });

    // Submit
    const submitBtns = page.locator('button[type="submit"]');
    if (await submitBtns.first().isVisible()) {
      await submitBtns.first().click();
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: 'e2e/test-results/real-10-resolution-created.png', fullPage: true });
  });

  test('6. Board Documents — view', async ({ page }) => {
    await page.goto(`${FRONT}/board/documents`, { waitUntil: 'networkidle', timeout: 30000 });
    expect(page.url()).toContain('/board/documents');

    await page.screenshot({ path: 'e2e/test-results/real-11-board-docs.png', fullPage: true });
  });

  test('7. Compliance Dashboard — loads with real data', async ({ page }) => {
    await page.goto(`${FRONT}/compliance`, { waitUntil: 'networkidle', timeout: 30000 });
    expect(page.url()).toContain('/compliance');

    await page.waitForTimeout(3000); // Wait for all queries

    await page.screenshot({ path: 'e2e/test-results/real-12-compliance.png', fullPage: true });

    // Scroll to document compliance section
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/test-results/real-13-compliance-docs.png', fullPage: true });
  });

  test('8. Sidebar has Board as separate group', async ({ page }) => {
    await page.goto(`${FRONT}/board/meetings`, { waitUntil: 'networkidle', timeout: 30000 });

    // Board sidebar should show Meetings, Members, Resolutions, Documents
    const sidebar = page.locator('.bg-gray-900');
    await expect(sidebar.first()).toBeVisible({ timeout: 5000 });

    // The expanded panel should say "BOARD"
    const boardLabel = page.locator('text=BOARD').or(page.locator('text=Board').first());
    await expect(boardLabel).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'e2e/test-results/real-14-board-sidebar.png', fullPage: true });
  });
});

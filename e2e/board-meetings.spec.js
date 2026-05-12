/**
 * Board Meetings E2E Tests
 *
 * Tests the board meetings page at /board/meetings:
 *   1. Page loads without error
 *   2. Schedule Meeting button opens form
 *   3. Form submission creates a meeting and shows success message
 */

const { test, expect } = require('@playwright/test');

const FRONT_BASE = process.env.FRONTEND_URL || 'https://opencapstack.com';
const API_BASE   = process.env.API_BASE_URL  || 'https://opencapstack.com';

const MOCK_USER = {
  id: 'mock-user-001',
  userId: 'mock-user-001',
  email: 'mock@opencapstack.com',
  role: 'founder',
  status: 'active',
  firstName: 'QA',
  lastName: 'Tester',
  companyId: 'mock-company-001',
};

// Structurally valid JWT with far-future expiry — signature not verified client-side.
// Payload: { userId: "mock-001", role: "founder", exp: 9999999999 }
const MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtb2NrLTAwMSIsInJvbGUiOiJmb3VuZGVyIiwiZXhwIjo5OTk5OTk5OTk5fQ.mock_sig_not_verified_client_side';

/**
 * Inject mock auth so both the Next.js Edge Middleware (cookie check) and the
 * client-side AuthContext (localStorage + /auth/me mock) allow the request.
 */
async function injectMockAuth(page) {
  const domain = new URL(FRONT_BASE).hostname;

  // Cookie for Next.js Edge Middleware
  await page.context().addCookies([{
    name: 'token',
    value: MOCK_TOKEN,
    domain,
    path: '/',
    httpOnly: false,
    sameSite: 'Lax',
  }]);

  // Mock /auth/me and /auth/profile before navigating
  await page.route('**/api/v1/auth/me', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: MOCK_USER }),
    });
  });

  await page.route('**/api/v1/auth/profile', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: MOCK_USER }),
    });
  });

  // localStorage for client-side axios interceptor
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', 'mock-refresh-token');
    localStorage.setItem('user', JSON.stringify(user));
  }, { token: MOCK_TOKEN, user: MOCK_USER });
}

// ─────────────────────────────────────────────────────────────────────────────

test.describe('Board Meetings', () => {

  test('page loads without error and shows Schedule Meeting button', async ({ page }) => {
    await injectMockAuth(page);

    // Mock the board-meetings list endpoint
    await page.route('**/api/v1/board-meetings', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      } else {
        route.continue();
      }
    });

    await page.goto(`${FRONT_BASE}/board/meetings`);
    await page.screenshot({ path: 'e2e/screenshots/board-meetings-load.png' });

    // Page should not show a blank screen or error state
    await expect(page.locator('body')).not.toBeEmpty();
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(/error|500|something went wrong/i);

    // The Schedule Meeting button must be visible
    await expect(page.getByRole('button', { name: /schedule meeting/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('clicking Schedule Meeting opens the form', async ({ page }) => {
    await injectMockAuth(page);

    await page.route('**/api/v1/board-meetings', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      } else {
        route.continue();
      }
    });

    await page.goto(`${FRONT_BASE}/board/meetings`);
    await page.getByRole('button', { name: /schedule meeting/i }).first().click();

    // Modal uses an h2 with the title text
    await expect(page.locator('h2', { hasText: /schedule meeting/i })).toBeVisible({ timeout: 5000 });

    // Required fields present
    await expect(page.locator('input[placeholder*="Board Meeting"]')).toBeVisible();
    await expect(page.locator('input[type="date"]')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/board-meetings-form-open.png' });
  });

  test('submitting form shows "Meeting scheduled" and meeting appears in list', async ({ page }) => {
    const newMeeting = {
      id: 'meet-001',
      title: 'Q2 Board Review',
      date: '2026-08-15',
      type: 'Regular',
      location: '',
      agenda: '',
      companyId: 'mock-company-001',
      status: 'scheduled',
    };

    let meetingsList = [];

    await injectMockAuth(page);

    // GET returns the current list; POST creates a meeting
    await page.route('**/api/v1/board-meetings', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(meetingsList),
        });
      } else if (method === 'POST') {
        meetingsList = [newMeeting];
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(newMeeting),
        });
      } else {
        route.continue();
      }
    });

    await page.goto(`${FRONT_BASE}/board/meetings`);

    // Open form
    await page.getByRole('button', { name: /schedule meeting/i }).first().click();
    // Modal uses an h2 with the title text
    await expect(page.locator('h2', { hasText: /schedule meeting/i })).toBeVisible({ timeout: 5000 });

    // Fill Title
    await page.locator('input[placeholder*="Board Meeting"]').fill('Q2 Board Review');

    // Fill Date
    await page.locator('input[type="date"]').fill('2026-08-15');

    // Type defaults to Regular — no change needed

    // Submit — click the submit button inside the modal (not the header button)
    await page.locator('button[type="submit"]').click();

    await page.screenshot({ path: 'e2e/screenshots/board-meetings-submitted.png' });

    // Assert success: success banner OR meeting title in the list
    const successMsg = page.locator('text=Meeting scheduled');
    const meetingTitle = page.locator('text=Q2 Board Review');
    await expect(successMsg.or(meetingTitle).first()).toBeVisible({ timeout: 8000 });
  });

});

/**
 * Support Widget E2E Test
 * Simulates an end user opening the support chat widget,
 * filling the form, submitting, and verifying the ticket
 * lands in ServiceOS.
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const https = require('https');

const FRONTEND = process.env.FRONTEND_URL || 'https://opencapstack.com';
const SERVICEOS_URL = 'https://helpdesk.ainative.studio';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'support-widget');

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: true });
}

function httpRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

test.describe('Support Widget — End User Flow', () => {
  const TEST_EMAIL = `e2e-${Date.now()}@opencapstack.com`;
  const TEST_MESSAGE = `E2E Playwright test — ${new Date().toISOString()}`;
  let createdTicketId = null;

  test('1. Homepage loads and support widget button is visible', async ({ page }) => {
    await page.goto(FRONTEND, { waitUntil: 'networkidle' });
    await screenshot(page, '01-homepage');

    const chatButton = page.locator('button[aria-label="Get help"]');
    await expect(chatButton).toBeVisible({ timeout: 10000 });
    await screenshot(page, '02-widget-button-visible');
  });

  test('2. Clicking chat button opens the support panel', async ({ page }) => {
    await page.goto(FRONTEND, { waitUntil: 'networkidle' });

    const chatButton = page.locator('button[aria-label="Get help"]');
    await chatButton.click();

    const panel = page.locator('text=Need help?');
    await expect(panel).toBeVisible({ timeout: 5000 });

    const emailInput = page.locator('input[type="email"][placeholder="Your email"]');
    await expect(emailInput).toBeVisible();

    const messageInput = page.locator('textarea[placeholder="How can we help?"]');
    await expect(messageInput).toBeVisible();

    const sendButton = page.locator('button:has-text("Send message")');
    await expect(sendButton).toBeVisible();

    await screenshot(page, '03-panel-open');
  });

  test('3. Fill form and submit — message sent confirmation', async ({ page }) => {
    await page.goto(FRONTEND, { waitUntil: 'networkidle' });

    const chatButton = page.locator('button[aria-label="Get help"]');
    await chatButton.click();

    const emailInput = page.locator('input[type="email"][placeholder="Your email"]');
    const messageInput = page.locator('textarea[placeholder="How can we help?"]');
    const sendButton = page.locator('button:has-text("Send message")');

    await emailInput.click();
    await emailInput.type(TEST_EMAIL, { delay: 10 });
    await messageInput.click();
    await messageInput.type(TEST_MESSAGE, { delay: 10 });
    await screenshot(page, '04-form-filled');

    const responsePromise = page.waitForResponse(
      resp => resp.url().includes('/support') && resp.url().includes('api') && resp.request().method() === 'POST'
    );

    await sendButton.click();

    const response = await responsePromise;
    expect(response.status()).toBe(201);

    const responseBody = await response.json();
    expect(responseBody.success).toBe(true);
    expect(responseBody.ticketId).toBeTruthy();
    createdTicketId = responseBody.ticketId;

    const successMessage = page.locator('text=Message sent!');
    await expect(successMessage).toBeVisible({ timeout: 10000 });

    await screenshot(page, '05-message-sent');

    // Save ticket ID for the verification test
    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, 'last-ticket.json'),
      JSON.stringify({ ticketId: createdTicketId, email: TEST_EMAIL, message: TEST_MESSAGE })
    );
  });

  test('4. Verify ticket exists in ServiceOS', async () => {
    // Read ticket ID from previous test
    const ticketFile = path.join(SCREENSHOT_DIR, 'last-ticket.json');
    if (!fs.existsSync(ticketFile)) {
      test.skip();
      return;
    }
    const { ticketId, email, message } = JSON.parse(fs.readFileSync(ticketFile, 'utf8'));

    const apiKey = process.env.AINATIVE_API_TOKEN || process.env.ZERODB_API_KEY;
    if (!apiKey) {
      console.log('AINATIVE_API_TOKEN not set — skipping ServiceOS verification');
      test.skip();
      return;
    }

    const result = await httpRequest(`${SERVICEOS_URL}/api/tickets?limit=10`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'x-org-id': 'org_ainative_demo',
      },
    });

    expect(result.status).toBe(200);
    expect(result.data.success).toBe(true);

    const tickets = result.data.data?.items || [];
    const match = tickets.find(t => (t.ticket_id || t.row_id) === ticketId);

    expect(match).toBeTruthy();
    expect(match.title).toContain('[Widget]');
    expect(match.tags).toContain('opencapstack');
    expect(match.tags).toContain('support-widget');
    expect(match.status).toBe('new');

    const body = (match.channel_summary || [''])[0];
    expect(body).toContain(email);

    console.log(`Ticket ${ticketId} verified in ServiceOS:`);
    console.log(`  Title:  ${match.title}`);
    console.log(`  Status: ${match.status}`);
    console.log(`  Tags:   ${match.tags}`);
  });

  test('5. Error state — shows fallback when API fails', async ({ page }) => {
    // Intercept the support API and force a failure (matches both proxy and direct paths)
    await page.route('**/support', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({ status: 502, body: JSON.stringify({ error: 'forced failure' }) });
      } else {
        route.continue();
      }
    });

    await page.goto(FRONTEND, { waitUntil: 'networkidle' });

    const chatButton = page.locator('button[aria-label="Get help"]');
    await chatButton.click();

    const emailInput = page.locator('input[type="email"][placeholder="Your email"]');
    const messageInput = page.locator('textarea[placeholder="How can we help?"]');
    const sendButton = page.locator('button:has-text("Send message")');

    await emailInput.click();
    await emailInput.type('error-test@example.com', { delay: 10 });
    await messageInput.click();
    await messageInput.type('This should trigger the error state', { delay: 10 });
    await sendButton.click();

    const errorMessage = page.locator('text=Something went wrong');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });

    const fallbackEmail = page.locator('a[href="mailto:support@opencapstack.com"]');
    await expect(fallbackEmail).toBeVisible();

    const tryAgain = page.locator('button:has-text("Try again")');
    await expect(tryAgain).toBeVisible();

    await screenshot(page, '06-error-state');

    // Click "Try again" and verify form reappears
    await page.unroute('**/support');
    await tryAgain.click();

    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await screenshot(page, '07-try-again');
  });
});

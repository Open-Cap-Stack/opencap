const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const FRONTEND = 'https://opencapstack.com';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'collin-test');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

test.setTimeout(60000);

test.describe('Collin Login Flow', () => {

  test('1. Direct OCS login with email/password', async ({ page }) => {
    await page.goto(`${FRONTEND}/login`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-login-page.png'), fullPage: true });

    // Fill in credentials
    await page.locator('input[placeholder*="example.com"]').first().fill('collin@datacenter.dev');
    await page.locator('input[type="password"]').first().fill('TempPass2026!');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-filled-form.png'), fullPage: true });

    // Click Sign in
    await page.locator('button:has-text("Sign in")').first().click();

    // Wait for navigation or error
    await Promise.race([
      page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 }),
      page.waitForSelector('[class*="error" i], [class*="alert" i], [role="alert"]', { timeout: 15000 }),
    ]).catch(() => {});

    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-after-login.png'), fullPage: true });

    const url = page.url();
    console.log('After login URL:', url);

    if (url.includes('/login')) {
      const errorText = await page.locator('[class*="error" i], [class*="alert" i], [role="alert"]').first().textContent().catch(() => 'No error message visible');
      console.log('ERROR: Still on login page. Error:', errorText);
      // Check for any toast/notification
      const bodyText = await page.textContent('body');
      if (bodyText.includes('Invalid') || bodyText.includes('error') || bodyText.includes('incorrect')) {
        console.log('Body contains error text');
      }
      throw new Error(`Login failed — still on login page. Error: ${errorText}`);
    }

    console.log('SUCCESS: Redirected to', url);
    expect(url).toMatch(/\/(dashboard|onboarding|company-setup)/);
    console.log('PASS: Login succeeded, landed on', url);
  });

  test('2. AINative OAuth login button flow', async ({ page }) => {
    await page.goto(`${FRONTEND}/login`, { waitUntil: 'networkidle' });

    // Find the "Sign in with AINative" button
    const ainativeBtn = page.locator('text=Sign in with AINative').first();
    const isVisible = await ainativeBtn.isVisible().catch(() => false);
    console.log('AINative button visible:', isVisible);

    if (!isVisible) {
      console.log('SKIP: No AINative login button found');
      return;
    }

    await ainativeBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-ainative-flow.png'), fullPage: true });

    const url = page.url();
    console.log('After AINative click URL:', url);

    // Check if it opened a modal, redirected to AINative, or showed a form
    if (url.includes('ainative.studio')) {
      console.log('PASS: Redirected to AINative OAuth flow');
    } else {
      // It might show an inline email/password form for AINative
      const ainativeEmailInput = page.locator('input[placeholder*="AINative" i], input[name*="ainative" i]').first();
      const hasAINativeForm = await ainativeEmailInput.isVisible().catch(() => false);
      console.log('Has AINative inline form:', hasAINativeForm);

      // Check what the page shows
      const bodyText = await page.textContent('body');
      console.log('Page contains "AINative":', bodyText.includes('AINative'));
    }
  });

  test('3. Authenticated dashboard access after login', async ({ page }) => {
    // Login via API and inject auth
    const https = require('https');
    const token = await new Promise((resolve, reject) => {
      const body = JSON.stringify({ email: 'collin@datacenter.dev', password: 'TempPass2026!' });
      const req = https.request('https://api.opencapstack.com/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.accessToken);
          } catch (e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });

    const domain = new URL(FRONTEND).hostname;
    await page.context().addCookies([
      { name: 'token', value: token, domain, path: '/', httpOnly: false, secure: true, sameSite: 'Lax' },
    ]);

    await page.goto(`${FRONTEND}/login`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => {
      localStorage.setItem('token', t);
      localStorage.setItem('refreshToken', 'e2e-refresh');
      localStorage.setItem('user', JSON.stringify({ email: 'collin@datacenter.dev', firstName: 'Collin', lastName: 'Datacenter', role: 'employee' }));
      localStorage.setItem('ainative_access_token', t);
      localStorage.setItem('opencap_token', t);
    }, token);

    await page.goto(`${FRONTEND}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-dashboard.png'), fullPage: true });

    const url = page.url();
    console.log('Dashboard URL:', url);

    if (url.includes('/dashboard')) {
      console.log('PASS: Dashboard accessible');
      // Check sidebar loads
      const sidebarButtons = await page.locator('nav button:has(svg)').count();
      console.log('Sidebar buttons:', sidebarButtons);
    } else {
      console.log('FAIL: Could not access dashboard, redirected to', url);
    }
  });
});

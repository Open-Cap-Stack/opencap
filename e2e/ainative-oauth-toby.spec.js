const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const FRONTEND = 'https://opencapstack.com';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'oauth-toby');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

test.setTimeout(90000);

test('AINative OAuth — admin@ainative.studio full flow', async ({ page }) => {
  // Step 1: Go to login, click "Sign in with AINative"
  await page.goto(`${FRONTEND}/login`, { waitUntil: 'networkidle' });
  const ainativeBtn = page.locator('text=Sign in with AINative').first();
  await expect(ainativeBtn).toBeVisible({ timeout: 10000 });
  console.log('Step 1: Found AINative button');

  await ainativeBtn.click();
  await page.waitForURL(url => url.toString().includes('ainative.studio'), { timeout: 15000 });
  console.log('Step 2: Redirected to AINative:', page.url());

  // Step 3: Fill AINative login
  const emailField = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
  await emailField.waitFor({ state: 'visible', timeout: 10000 });
  await emailField.fill('admin@ainative.studio');

  const passwordField = page.locator('input[type="password"]').first();
  await passwordField.fill('H%dJcjSwLZIe1%9u');

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-ainative-login.png'), fullPage: true });

  const submitBtn = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Login")').first();
  await submitBtn.click();
  console.log('Step 3: Submitted AINative credentials');

  // Wait for consent page or redirect
  await page.waitForTimeout(3000);

  // Check for authorize/consent button
  const authorizeBtn = page.locator('button:has-text("Authorize"), button:has-text("Allow"), button:has-text("Grant")').first();
  const hasAuthorize = await authorizeBtn.isVisible({ timeout: 3000 }).catch(() => false);
  if (hasAuthorize) {
    console.log('Step 4: Clicking authorize button');
    await authorizeBtn.click();
  }

  // Wait for redirect back to OCS
  await page.waitForURL(url => url.toString().includes('opencapstack.com'), { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(3000);

  const finalUrl = page.url();
  console.log('Step 5: Final URL:', finalUrl);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-final-page.png'), fullPage: true });

  // Validate result
  if (finalUrl.includes('/company-setup')) {
    console.log('SUCCESS: New user redirected to company setup (expected for first-time OAuth user)');
    // Check for welcome banner
    const welcomeBanner = await page.locator('text=Welcome to OpenCap Stack').isVisible().catch(() => false);
    console.log('Welcome banner visible:', welcomeBanner);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-company-setup.png'), fullPage: true });
  } else if (finalUrl.includes('/dashboard')) {
    console.log('SUCCESS: User redirected to dashboard (existing user)');
  } else if (finalUrl.includes('/onboarding')) {
    console.log('SUCCESS: User redirected to onboarding');
  } else if (finalUrl.includes('error')) {
    const errorParam = new URL(finalUrl).searchParams.get('error');
    console.log('FAIL: OAuth error:', errorParam);
    // Capture page content for debugging
    const bodyText = await page.textContent('body').catch(() => '');
    console.log('Page text:', bodyText.substring(0, 300));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-error.png'), fullPage: true });
  } else if (finalUrl.includes('token=')) {
    console.log('SUCCESS: Callback page with token (checking redirect...)');
    await page.waitForTimeout(5000);
    const afterRedirect = page.url();
    console.log('After redirect:', afterRedirect);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-after-redirect.png'), fullPage: true });
  } else {
    console.log('UNEXPECTED: Landed on', finalUrl);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-unexpected.png'), fullPage: true });
  }

  // Final assertion — should NOT be on login with error
  expect(finalUrl).not.toContain('error=oauth_failed');
});

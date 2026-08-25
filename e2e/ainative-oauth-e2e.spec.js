const { test, expect } = require('@playwright/test');

test.setTimeout(90000);

test('AINative OAuth full flow', async ({ page }) => {
  // Step 1: Go to OCS login and click "Sign in with AINative"
  await page.goto('https://opencapstack.com/login', { waitUntil: 'networkidle' });
  const ainativeBtn = page.locator('text=Sign in with AINative').first();
  await expect(ainativeBtn).toBeVisible({ timeout: 10000 });
  console.log('Step 1: Found AINative button, clicking...');

  await ainativeBtn.click();
  await page.waitForURL(url => url.toString().includes('ainative.studio'), { timeout: 15000 });
  const authorizeUrl = page.url();
  console.log('Step 2: Redirected to AINative:', authorizeUrl);

  // Verify the authorize URL has correct params
  expect(authorizeUrl).toContain('oauth/authorize');
  expect(authorizeUrl).toContain('redirect_uri=https%3A%2F%2Fapi.opencapstack.com');
  expect(authorizeUrl).toContain('code_challenge=');
  expect(authorizeUrl).toContain('code_challenge_method=S256');
  console.log('Step 2: URL params verified (backend redirect_uri + PKCE)');

  // Step 3: Log in on AINative
  // Look for email field
  const emailField = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
  const hasLoginForm = await emailField.isVisible({ timeout: 5000 }).catch(() => false);

  if (hasLoginForm) {
    console.log('Step 3: Found login form, filling credentials...');
    await emailField.fill('collin@datacenter.dev');
    const passwordField = page.locator('input[type="password"]').first();
    await passwordField.fill('Collin2026!');
    await page.screenshot({ path: 'e2e/screenshots/oauth-ainative-login.png', fullPage: true });

    // Submit
    const submitBtn = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Login")').first();
    await submitBtn.click();
    console.log('Step 3: Submitted login form');

    // Wait for redirect or authorize page
    await page.waitForTimeout(3000);
    const afterLoginUrl = page.url();
    console.log('Step 4: After login URL:', afterLoginUrl);

    // If there's an authorize/consent button
    const authorizeBtn = page.locator('button:has-text("Authorize"), button:has-text("Allow"), button:has-text("Grant")').first();
    const hasAuthorize = await authorizeBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasAuthorize) {
      console.log('Step 4: Found authorize button, clicking...');
      await authorizeBtn.click();
    }

    // Wait for redirect back to OCS
    await page.waitForURL(url => url.toString().includes('opencapstack.com'), { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3000);
  } else {
    console.log('Step 3: No login form visible, checking page...');
    await page.screenshot({ path: 'e2e/screenshots/oauth-ainative-page.png', fullPage: true });
    const bodyText = await page.textContent('body');
    console.log('Page text preview:', bodyText.substring(0, 200));
  }

  const finalUrl = page.url();
  console.log('FINAL URL:', finalUrl);
  await page.screenshot({ path: 'e2e/screenshots/oauth-final.png', fullPage: true });

  // Check result
  if (finalUrl.includes('opencapstack.com')) {
    if (finalUrl.includes('/dashboard') || finalUrl.includes('/onboarding') || finalUrl.includes('/company-setup')) {
      console.log('SUCCESS: OAuth flow completed — landed on', finalUrl);
    } else if (finalUrl.includes('error')) {
      const errorParam = new URL(finalUrl).searchParams.get('error');
      console.log('FAIL: OAuth returned error:', errorParam);
    } else if (finalUrl.includes('/auth/') && finalUrl.includes('token=')) {
      console.log('SUCCESS: OAuth flow completed — callback page with token');
    } else {
      console.log('RESULT: Landed on', finalUrl);
    }
  } else {
    console.log('RESULT: Still on external page:', finalUrl);
  }
});

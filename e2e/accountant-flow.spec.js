const { test, expect } = require('@playwright/test');
const F = 'https://opencapstack.com';

test.describe('Accountant Flow — Real User Testing', () => {

  test('1. Accountant marketing page loads', async ({ page }) => {
    await page.goto(`${F}/accountants`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: 'e2e/test-results/acct-01-marketing.png', fullPage: true });
    const body = await page.locator('body').textContent();
    console.log('Marketing page has:',
      body.includes('409A') ? '409A mention' : 'NO 409A',
      body.includes('Register') || body.includes('Sign up') || body.includes('Get started') ? 'CTA found' : 'NO CTA'
    );
  });

  test('2. Accountant registration page loads', async ({ page }) => {
    await page.goto(`${F}/register/accountant`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: 'e2e/test-results/acct-02-register.png', fullPage: true });

    // Check what fields exist
    const inputs = await page.locator('input').all();
    for (const input of inputs) {
      const name = await input.getAttribute('name') || '';
      const placeholder = await input.getAttribute('placeholder') || '';
      const type = await input.getAttribute('type') || '';
      console.log(`  Field: name=${name} type=${type} placeholder=${placeholder}`);
    }
  });

  test('3. Accountant registration — fill and submit', async ({ page }) => {
    await page.goto(`${F}/register/accountant`, { waitUntil: 'networkidle', timeout: 30000 });

    // Try to fill the form
    const firstNameInput = page.locator('input[name="firstName"], input[placeholder*="First"]').first();
    const lastNameInput = page.locator('input[name="lastName"], input[placeholder*="Last"]').first();
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    const ts = Date.now();
    if (await firstNameInput.isVisible().catch(() => false)) await firstNameInput.fill('Test');
    if (await lastNameInput.isVisible().catch(() => false)) await lastNameInput.fill('Accountant');
    if (await emailInput.isVisible().catch(() => false)) await emailInput.fill(`test-acct-${ts}@example.com`);
    if (await passwordInput.isVisible().catch(() => false)) await passwordInput.fill('Secure@Test1');

    // Fill confirm password if it exists
    const confirmPw = page.locator('input[type="password"]').nth(1);
    if (await confirmPw.isVisible().catch(() => false)) await confirmPw.fill('Secure@Test1');

    await page.screenshot({ path: 'e2e/test-results/acct-03-register-filled.png', fullPage: true });

    // Submit
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'e2e/test-results/acct-04-register-result.png', fullPage: true });
      console.log('After submit URL:', page.url());
    }
  });

  test('4. Accountant dashboard — logged in as admin', async ({ page }) => {
    const TOKEN = process.env.REAL_TOKEN;
    if (!TOKEN) { console.log('SKIP — no REAL_TOKEN'); return; }
    const domain = new URL(F).hostname;
    await page.context().addCookies([
      { name: 'token', value: TOKEN, domain, path: '/', httpOnly: false, sameSite: 'Lax' },
      { name: 'session', value: TOKEN, domain, path: '/', httpOnly: false, sameSite: 'Lax' },
    ]);
    await page.addInitScript(({ token }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ companyId: 'ainative-studio', role: 'admin' }));
      localStorage.setItem('ocs_profile', JSON.stringify({ companyId: 'ainative-studio', role: 'admin' }));
    }, { token: TOKEN });

    await page.goto(`${F}/accountant`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/test-results/acct-05-dashboard.png', fullPage: true });

    // Click Complete Setup if visible
    const setupBtn = page.locator('button:has-text("Complete setup"), a:has-text("Complete setup")').first();
    if (await setupBtn.isVisible().catch(() => false)) {
      console.log('Stripe Connect "Complete setup" button found');
      // Don't click — would redirect to Stripe
    }

    // Check review queue
    const queueSection = page.locator('text=Review Queue');
    if (await queueSection.isVisible().catch(() => false)) {
      console.log('Review Queue section visible');
    }
  });

  test('5. 409A Valuation page — can request valuation', async ({ page }) => {
    const TOKEN = process.env.REAL_TOKEN;
    if (!TOKEN) { console.log('SKIP — no REAL_TOKEN'); return; }
    const domain = new URL(F).hostname;
    await page.context().addCookies([
      { name: 'token', value: TOKEN, domain, path: '/', httpOnly: false, sameSite: 'Lax' },
      { name: 'session', value: TOKEN, domain, path: '/', httpOnly: false, sameSite: 'Lax' },
    ]);
    await page.addInitScript(({ token }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ companyId: 'ainative-studio', role: 'admin' }));
      localStorage.setItem('ocs_profile', JSON.stringify({ companyId: 'ainative-studio', role: 'admin' }));
    }, { token: TOKEN });

    await page.goto(`${F}/valuations`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/test-results/acct-06-valuations.png', fullPage: true });
  });
});

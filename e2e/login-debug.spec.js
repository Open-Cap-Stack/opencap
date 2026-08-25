const { test, expect } = require('@playwright/test');
test.setTimeout(30000);

test('debug login with collin@datacenter.dev', async ({ page }) => {
  await page.goto('https://opencapstack.com/login', { waitUntil: 'networkidle' });

  await page.fill('input[type="email"]', 'collin@datacenter.dev');
  await page.fill('input[type="password"]', 'TempPass2026!');

  page.on('response', response => {
    if (response.url().includes('auth/login')) {
      response.text().then(body => {
        console.log(`Auth response: ${response.status()} body: ${body.substring(0, 200)}`);
      });
    }
  });

  await page.click('button[type="submit"]');

  try {
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });
    console.log('SUCCESS: Redirected to:', page.url());
  } catch {
    console.log('FAIL: Still on login page:', page.url());
  }
});

const { test } = require('@playwright/test');
test('investor portal', async ({ page }) => {
  const TOKEN = process.env.REAL_TOKEN;
  const domain = 'opencapstack.com';
  await page.context().addCookies([
    { name: 'token', value: TOKEN, domain, path: '/', httpOnly: false, sameSite: 'Lax' },
    { name: 'session', value: TOKEN, domain, path: '/', httpOnly: false, sameSite: 'Lax' },
  ]);
  await page.addInitScript(({ token }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify({ companyId: 'ainative-studio', role: 'admin' }));
    localStorage.setItem('ocs_profile', JSON.stringify({ companyId: 'ainative-studio', role: 'admin' }));
  }, { token: TOKEN });
  await page.goto('https://opencapstack.com/investor-portal', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'e2e/test-results/check-investor-portal.png', fullPage: true });
});

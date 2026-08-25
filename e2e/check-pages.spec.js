const { test } = require('@playwright/test');
const F = 'https://opencapstack.com';
const TOKEN = process.env.REAL_TOKEN;
const USER = { companyId: 'ainative-studio', role: 'admin', email: 'admin@ainative.studio' };

test('Screenshot dilution, scenarios, securities', async ({ page }) => {
  if (!TOKEN) throw new Error('Set REAL_TOKEN');
  const domain = new URL(F).hostname;
  await page.context().addCookies([
    { name: 'token', value: TOKEN, domain, path: '/', httpOnly: false, sameSite: 'Lax' },
    { name: 'session', value: TOKEN, domain, path: '/', httpOnly: false, sameSite: 'Lax' },
  ]);
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('ocs_profile', JSON.stringify(user));
  }, { token: TOKEN, user: USER });

  for (const p of ['dilution', 'scenarios', 'securities']) {
    await page.goto(`${F}/${p}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `e2e/test-results/check-${p}.png`, fullPage: true });
  }
});

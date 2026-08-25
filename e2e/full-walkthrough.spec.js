const { test } = require('@playwright/test');
const F = 'https://opencapstack.com';
const TOKEN = process.env.REAL_TOKEN;
const USER = { companyId: 'ainative-studio', role: 'admin', email: 'admin@ainative.studio' };

test('Full founder walkthrough — every page', async ({ page }) => {
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

  const pages = [
    'dashboard', 'cap-table', 'stakeholders', 'share-classes',
    'securities', 'dilution', 'scenarios',
    'equity-plans', 'employee-equity', 'vesting', 'safe-notes', 'tax',
    'fundraise', 'investor-portal', 'valuations', 'investors',
    'documents', 'data-rooms', 'templates',
    'board/meetings', 'board/members', 'board/resolutions', 'board/documents',
    'reports', 'compliance', 'analytics',
    'profile', 'settings', 'integrations',
  ];

  for (const p of pages) {
    try {
      await page.goto(`${F}/${p}`, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(1500);
      const safeName = p.replace(/\//g, '-');
      await page.screenshot({ path: `e2e/test-results/walk-${safeName}.png`, fullPage: true });
    } catch (err) {
      console.log(`FAILED: ${p} — ${err.message.slice(0, 80)}`);
    }
  }
});

const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const FRONTEND = process.env.FRONTEND_URL || 'https://opencapstack.com';

test.setTimeout(60000);
test('dump localStorage keys after login', async ({ page }) => {
  await page.goto(`${FRONTEND}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[placeholder*="example.com"]').first().fill('toby@opencapstack.com');
  await page.locator('input[type="password"]').first().fill('OpenCap2026!');

  // Listen for all network responses to catch token storage
  const responses = [];
  page.on('response', r => {
    if (r.url().includes('auth') || r.url().includes('login')) {
      responses.push({ url: r.url(), status: r.status() });
    }
  });

  await page.locator('button:has-text("Sign in")').first().click();

  // Wait for navigation or dashboard content
  await Promise.race([
    page.waitForURL(url => !url.toString().includes('/login'), { timeout: 30000 }),
    page.waitForSelector('text=Overview', { timeout: 30000 }),
  ]).catch(() => {});

  await page.waitForTimeout(5000);

  // Dump ALL localStorage keys
  const ls = await page.evaluate(() => {
    const all = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      const v = localStorage.getItem(k);
      all[k] = v.length > 100 ? v.substring(0, 100) + '...' : v;
    }
    return all;
  });

  console.log('=== localStorage keys ===');
  console.log(JSON.stringify(ls, null, 2));
  console.log('=== Total keys:', Object.keys(ls).length, '===');
  console.log('=== Current URL:', page.url(), '===');
  console.log('=== Login API responses:', JSON.stringify(responses), '===');

  // Also dump cookies
  const cookies = await page.context().cookies();
  console.log('=== Cookies ===');
  for (const c of cookies) {
    console.log(`  ${c.name} = ${c.value.substring(0, 50)}...`);
  }

  // Save full auth state
  const fullState = await page.evaluate(() => {
    const all = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      all[k] = localStorage.getItem(k);
    }
    return all;
  });
  fs.writeFileSync(path.join(__dirname, '.auth-state.json'), JSON.stringify(fullState, null, 2));
});

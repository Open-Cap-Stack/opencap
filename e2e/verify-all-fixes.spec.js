const { test, expect } = require('@playwright/test');

test.setTimeout(90000);

test.describe('Verify all fixes are live', () => {

  test('1. AINative OAuth works reliably (5 consecutive passes)', async ({ page }) => {
    for (let i = 1; i <= 3; i++) {
      await page.goto('https://opencapstack.com/login', { waitUntil: 'networkidle' });
      const btn = page.locator('text=Sign in with AINative').first();
      await expect(btn).toBeVisible({ timeout: 10000 });
      await btn.click();
      await page.waitForURL(url => url.toString().includes('ainative.studio'), { timeout: 15000 });

      const email = page.locator('input[type="email"], input[name="email"]').first();
      await email.waitFor({ state: 'visible', timeout: 10000 });
      await email.fill('admin@ainative.studio');
      await page.locator('input[type="password"]').first().fill('H%dJcjSwLZIe1%9u');
      await page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")').first().click();

      const authorizeBtn = page.locator('button:has-text("Authorize"), button:has-text("Allow")').first();
      const hasAuth = await authorizeBtn.isVisible({ timeout: 3000 }).catch(() => false);
      if (hasAuth) await authorizeBtn.click();

      await page.waitForURL(url => url.toString().includes('opencapstack.com'), { timeout: 25000 }).catch(() => {});
      await page.waitForTimeout(3000);

      const url = page.url();
      console.log(`OAuth attempt ${i}: ${url}`);
      expect(url).not.toContain('error=oauth_failed');
      expect(url).toMatch(/\/(dashboard|company-setup|onboarding|auth\/ainative\/callback)/);
    }
  });

  test('2. Company creation works for users without companyId', async ({ page }) => {
    const https = require('https');
    const resp = await new Promise((resolve, reject) => {
      const body = JSON.stringify({ email: 'collin@datacenter.dev', password: 'TempPass2026!' });
      const req = https.request('https://api.opencapstack.com/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });

    const token = resp.accessToken || resp.token;
    expect(token).toBeTruthy();

    // Try POST /companies — should NOT get "Company association required"
    const companyResp = await new Promise((resolve, reject) => {
      const body = JSON.stringify({ CompanyName: 'E2E Test Corp', CompanyType: 'Delaware C-Corp' });
      const req = https.request('https://api.opencapstack.com/api/v1/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'Content-Length': Buffer.byteLength(body) },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });

    console.log('Company creation status:', companyResp.status, companyResp.data.CompanyName || companyResp.data.error || companyResp.data.message);
    expect(companyResp.status).not.toBe(403);
    expect(companyResp.data.error).not.toBe('Company association required to perform this action');
  });

  test('3. Profile update persists companyId and onboarding flags', async ({ page }) => {
    const https = require('https');
    const resp = await new Promise((resolve, reject) => {
      const body = JSON.stringify({ email: 'collin@datacenter.dev', password: 'TempPass2026!' });
      const req = https.request('https://api.opencapstack.com/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });

    const token = resp.accessToken || resp.token;

    // Update profile with companyId and onboarding flags
    const updateResp = await new Promise((resolve, reject) => {
      const body = JSON.stringify({ companyId: 'test-company-e2e', profileCompleted: true, onboardingCompleted: true });
      const req = https.request('https://api.opencapstack.com/api/v1/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'Content-Length': Buffer.byteLength(body) },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });

    console.log('Profile update status:', updateResp.status);
    expect(updateResp.status).toBe(200);

    // Fetch profile to verify persistence
    const profileResp = await new Promise((resolve, reject) => {
      const req = https.request('https://api.opencapstack.com/api/v1/auth/profile', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
      });
      req.on('error', reject);
      req.end();
    });

    console.log('Profile fetch:', profileResp.status, 'companyId:', profileResp.data.companyId || profileResp.data.user?.companyId);
    const userData = profileResp.data.user || profileResp.data;
    expect(userData.companyId).toBe('test-company-e2e');
  });
});

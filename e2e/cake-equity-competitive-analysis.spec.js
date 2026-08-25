/**
 * Cake Equity Competitive Analysis — Real User Walkthrough
 *
 * Walk through Cake Equity's free tier as an actual user:
 * 1. Landing page & signup flow
 * 2. Onboarding / company setup
 * 3. Cap table creation
 * 4. Every feature available in free tier
 * 5. Screenshot everything for comparison
 */

const { test, expect } = require('@playwright/test');

const CAKE_BASE = 'https://www.cakeequity.com';
const CAKE_APP = 'https://app.cakeequity.com';

test.describe('Cake Equity — Competitive UX Analysis', () => {

  // ── 1. Landing Page ─────────────────────────────────────────────────

  test('Landing page — hero, navigation, CTAs', async ({ page }) => {
    await page.goto(CAKE_BASE, { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: 'e2e/test-results/cake-01-landing-hero.png', fullPage: false });

    // Scroll to features
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/test-results/cake-02-landing-features.png', fullPage: false });

    // Scroll to more content
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/test-results/cake-03-landing-social-proof.png', fullPage: false });

    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/test-results/cake-04-landing-footer.png', fullPage: false });
  });

  // ── 2. Pricing Page ─────────────────────────────────────────────────

  test('Pricing page — tiers, features, comparison', async ({ page }) => {
    await page.goto(`${CAKE_BASE}/pricing`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: 'e2e/test-results/cake-05-pricing-top.png', fullPage: false });

    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/test-results/cake-06-pricing-tiers.png', fullPage: false });

    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/test-results/cake-07-pricing-features.png', fullPage: false });

    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/test-results/cake-08-pricing-comparison.png', fullPage: false });
  });

  // ── 3. Signup Flow ──────────────────────────────────────────────────

  test('Signup flow — registration and onboarding', async ({ page }) => {
    await page.goto(`${CAKE_APP}/setup_company/`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: 'e2e/test-results/cake-09-signup-page.png', fullPage: true });

    // Check what fields are required
    const formFields = await page.locator('input, select, textarea').all();
    const fieldInfo = [];
    for (const field of formFields) {
      const name = await field.getAttribute('name') || '';
      const placeholder = await field.getAttribute('placeholder') || '';
      const type = await field.getAttribute('type') || '';
      const label = await field.getAttribute('aria-label') || '';
      fieldInfo.push({ name, placeholder, type, label });
    }
    console.log('Cake Signup Fields:', JSON.stringify(fieldInfo, null, 2));
  });

  // ── 4. Login Page ───────────────────────────────────────────────────

  test('Login page — design and features', async ({ page }) => {
    await page.goto(`${CAKE_APP}/login/`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: 'e2e/test-results/cake-10-login-page.png', fullPage: true });
  });

  // ── 5. Cap Table Feature Page ───────────────────────────────────────

  test('Cap Table product page — features and screenshots', async ({ page }) => {
    await page.goto(`${CAKE_BASE}/cap-table`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: 'e2e/test-results/cake-11-captable-feature.png', fullPage: false });

    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/test-results/cake-12-captable-details.png', fullPage: false });
  });

  // ── 6. Scenario Modeling Feature ────────────────────────────────────

  test('Scenario modeling page', async ({ page }) => {
    await page.goto(`${CAKE_BASE}/scenario-modeling`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: 'e2e/test-results/cake-13-scenarios.png', fullPage: false });

    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/test-results/cake-14-scenarios-details.png', fullPage: false });
  });

  // ── 7. Stock Options Feature ────────────────────────────────────────

  test('Stock options page', async ({ page }) => {
    await page.goto(`${CAKE_BASE}/stock-options`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: 'e2e/test-results/cake-15-options.png', fullPage: false });
  });

  // ── 8. Employee App Feature ─────────────────────────────────────────

  test('Employee equity app page', async ({ page }) => {
    await page.goto(`${CAKE_BASE}/employee-equity-app`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: 'e2e/test-results/cake-16-employee-app.png', fullPage: false });

    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/test-results/cake-17-employee-app-details.png', fullPage: false });
  });

  // ── 9. 409A Valuation Feature ───────────────────────────────────────

  test('409A valuation page', async ({ page }) => {
    await page.goto(`${CAKE_BASE}/409a-valuation`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: 'e2e/test-results/cake-18-409a.png', fullPage: false });
  });

  // ── 10. SAFE Notes Feature ──────────────────────────────────────────

  test('SAFE notes page', async ({ page }) => {
    await page.goto(`${CAKE_BASE}/safes`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: 'e2e/test-results/cake-19-safes.png', fullPage: false });
  });

  // ── 11. Compliance Feature ──────────────────────────────────────────

  test('Compliance page', async ({ page }) => {
    await page.goto(`${CAKE_BASE}/compliance`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: 'e2e/test-results/cake-20-compliance.png', fullPage: false });
  });

  // ── 12. Comparison Pages ────────────────────────────────────────────

  test('Cake vs Carta comparison page', async ({ page }) => {
    await page.goto(`${CAKE_BASE}/cake-vs-carta`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: 'e2e/test-results/cake-21-vs-carta.png', fullPage: false });

    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/test-results/cake-22-vs-carta-features.png', fullPage: false });
  });
});

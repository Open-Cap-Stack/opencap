const { test } = require('@playwright/test');
const FRONT = 'https://opencapstack.com';

test('Capture OpenCap Stack pages for comparison', async ({ page }) => {
  await page.goto(FRONT, { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: 'e2e/test-results/ocs-01-landing-hero.png' });
  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'e2e/test-results/ocs-02-landing-features.png' });
  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'e2e/test-results/ocs-03-landing-more.png' });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'e2e/test-results/ocs-04-landing-footer.png' });

  await page.goto(`${FRONT}/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: 'e2e/test-results/ocs-05-login.png' });

  await page.goto(`${FRONT}/register`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: 'e2e/test-results/ocs-06-register.png' });

  await page.goto(`${FRONT}/pricing`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: 'e2e/test-results/ocs-07-pricing.png' });
  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'e2e/test-results/ocs-08-pricing-features.png' });
});

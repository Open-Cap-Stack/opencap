const { test, expect } = require('@playwright/test');
const F = 'https://opencapstack.com';

test('Final screenshots — all new pages', async ({ page }) => {
  // Landing page with new sections
  await page.goto(F, { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: 'e2e/test-results/final-01-hero.png' });
  await page.evaluate(() => window.scrollBy(0, 900));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'e2e/test-results/final-02-product-mockup.png' });
  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'e2e/test-results/final-03-pricing-comparison.png' });
  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'e2e/test-results/final-04-testimonials.png' });

  // Solutions dropdown
  await page.goto(F, { waitUntil: 'networkidle', timeout: 30000 });
  const solBtn = page.locator('button:has-text("Solutions")');
  if (await solBtn.isVisible()) {
    await solBtn.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'e2e/test-results/final-05-solutions-dropdown.png' });
  }

  // Cake comparison page
  await page.goto(`${F}/compare/cake-equity`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: 'e2e/test-results/final-06-vs-cake-hero.png' });
  await page.evaluate(() => window.scrollBy(0, 600));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'e2e/test-results/final-07-vs-cake-table.png' });

  // Solutions pages
  await page.goto(`${F}/solutions/founders`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: 'e2e/test-results/final-08-founders.png' });

  await page.goto(`${F}/solutions/cfo`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: 'e2e/test-results/final-09-cfo.png' });

  await page.goto(`${F}/solutions/lawyers`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: 'e2e/test-results/final-10-lawyers.png' });
});

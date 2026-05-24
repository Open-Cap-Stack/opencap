/**
 * Browser Automation Service — Playwright-based Carta data extraction.
 * Issue #640
 *
 * Uses raw Playwright CJS API (require('playwright')).
 * Returns AgentInputDocument[] or null on any failure.
 * Browser is always closed in a finally block.
 */

const { v4: uuidv4 } = require('uuid');
const { consume, clear } = require('./credentialVault');

// Try to load playwright — graceful degradation if not installed
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  chromium = null;
}

const TIMEOUT_MS = 3 * 60 * 1000;

/**
 * Orchestrate Carta browser automation for the given job.
 * Consumes credentials from the vault immediately and races against a timeout.
 *
 * @param {string} jobId
 * @param {string} companyName
 * @returns {Promise<AgentInputDocument[]|null>}
 */
async function automateCartaFetch(jobId, companyName) {
  const creds = consume(jobId);
  if (!creds || !chromium) return null;

  return Promise.race([
    doAutomation(creds, companyName, jobId),
    new Promise(resolve => setTimeout(() => resolve(null), TIMEOUT_MS))
  ]);
}

/**
 * Launch a headless browser, log in to Carta (or inject a session cookie),
 * and scrape cap table, option grants, and 409A valuation pages.
 *
 * @param {Object} creds
 * @param {string} companyName
 * @param {string} jobId
 * @returns {Promise<AgentInputDocument[]|null>}
 */
async function doAutomation(creds, companyName, jobId) {
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const context = await browser.newContext();

    if (creds.sessionCookie) {
      await context.addCookies([{
        name: 'session',
        value: creds.sessionCookie,
        domain: '.carta.com',
        path: '/'
      }]);
    }

    const page = await context.newPage();

    if (!creds.sessionCookie) {
      await loginWithCredentials(page, creds.email, creds.password);
    }

    const docs = await Promise.all([
      fetchCapTable(page),
      fetchOptionGrants(page),
      fetchValuations(page),
    ]);

    return docs.filter(Boolean);
  } catch (err) {
    // Never log err directly — it may contain credential traces in stack frames
    console.warn('[browserAutomation] Carta automation failed for job ' + jobId + ': ' + err.message);
    return null;
  } finally {
    if (browser) await browser.close().catch(() => {});
    clear(jobId);
  }
}

/**
 * Fill email + password on the Carta login page and wait for dashboard redirect.
 *
 * @param {import('playwright').Page} page
 * @param {string} email
 * @param {string} password
 */
async function loginWithCredentials(page, email, password) {
  await page.goto('https://app.carta.com/login', { waitUntil: 'networkidle', timeout: 30_000 });
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 30_000 });
}

/**
 * Scrape the Carta cap table page and return an AgentInputDocument.
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<AgentInputDocument|null>}
 */
async function fetchCapTable(page) {
  try {
    await page.goto('https://app.carta.com/captable/', { waitUntil: 'networkidle', timeout: 30_000 });
    const content = await page.textContent('body');
    if (!content || content.length < 100) return null;
    return {
      id: uuidv4(),
      source: 'carta',
      originalName: 'carta_cap_table.txt',
      mimeType: 'text/plain',
      textContent: content.replace(/\s+/g, ' ').trim().slice(0, 4000),
      metadata: {
        fileSize: content.length,
        pageCount: 1,
        sheetNames: [],
        subject: 'Cap Table',
        sender: 'carta',
        date: new Date().toISOString(),
        driveUrl: 'https://app.carta.com/captable/'
      }
    };
  } catch { return null; }
}

/**
 * Scrape the Carta option grants page and return an AgentInputDocument.
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<AgentInputDocument|null>}
 */
async function fetchOptionGrants(page) {
  try {
    await page.goto('https://app.carta.com/equity/grants/', { waitUntil: 'networkidle', timeout: 30_000 });
    const content = await page.textContent('body');
    if (!content || content.length < 100) return null;
    return {
      id: uuidv4(),
      source: 'carta',
      originalName: 'carta_option_grants.txt',
      mimeType: 'text/plain',
      textContent: content.replace(/\s+/g, ' ').trim().slice(0, 4000),
      metadata: {
        fileSize: content.length,
        pageCount: 1,
        sheetNames: [],
        subject: 'Option Grants',
        sender: 'carta',
        date: new Date().toISOString(),
        driveUrl: 'https://app.carta.com/equity/grants/'
      }
    };
  } catch { return null; }
}

/**
 * Scrape the Carta 409A valuations page and return an AgentInputDocument.
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<AgentInputDocument|null>}
 */
async function fetchValuations(page) {
  try {
    await page.goto('https://app.carta.com/409a/', { waitUntil: 'networkidle', timeout: 30_000 });
    const content = await page.textContent('body');
    if (!content || content.length < 100) return null;
    return {
      id: uuidv4(),
      source: 'carta',
      originalName: 'carta_valuations.txt',
      mimeType: 'text/plain',
      textContent: content.replace(/\s+/g, ' ').trim().slice(0, 4000),
      metadata: {
        fileSize: content.length,
        pageCount: 1,
        sheetNames: [],
        subject: '409A Valuations',
        sender: 'carta',
        date: new Date().toISOString(),
        driveUrl: 'https://app.carta.com/409a/'
      }
    };
  } catch { return null; }
}

module.exports = { automateCartaFetch };

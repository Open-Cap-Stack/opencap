/**
 * Playwright config for backend hardening E2E tests
 * Runs against an already-running backend — no webServer needed
 */
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '../e2e',
  testMatch: 'frontend-backend-hardening.test.js',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.API_BASE_URL || 'http://localhost:3001',
    actionTimeout: 15000,
  },
  // No webServer — expects backend to already be running
});

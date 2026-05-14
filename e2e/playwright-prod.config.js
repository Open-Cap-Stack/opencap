const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '/Users/aideveloper/opencapstack/e2e',
  testMatch: 'full-user-journey.spec.js',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: '/Users/aideveloper/opencapstack/e2e/test-results/journey-results.json' }]
  ],
  use: {
    baseURL: process.env.FRONTEND_URL || 'https://opencapstack.com',
    trace: 'on',
    screenshot: 'on',
    video: 'off',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '/Users/aideveloper/opencapstack/e2e',
  testMatch: 'support-widget-e2e.spec.js',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.FRONTEND_URL || 'https://opencapstack.com',
    trace: 'on',
    screenshot: 'on',
    video: 'off',
    actionTimeout: 20000,
    navigationTimeout: 45000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

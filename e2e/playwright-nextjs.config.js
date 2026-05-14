const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir:       '/Users/aideveloper/opencapstack/e2e',
  testMatch:     'nextjs-full-journey.spec.js',
  fullyParallel: false,
  retries:       0,
  workers:       1,
  timeout:       60000,
  reporter: [
    ['list'],
    ['json', { outputFile: '/Users/aideveloper/opencapstack/e2e/test-results/nextjs-journey-results.json' }]
  ],
  use: {
    baseURL:           process.env.FRONTEND_URL || 'https://opencapstack.com',
    trace:             'on',
    screenshot:        'on',
    video:             'off',
    actionTimeout:     20000,
    navigationTimeout: 45000,
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
});

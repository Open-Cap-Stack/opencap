/**
 * Playwright Configuration for OpenCap E2E Tests
 * 
 * Comprehensive E2E testing setup for user journey testing
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '../e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: [
    {
      // Express backend — health endpoint responds once DB init completes.
      // DISABLE_RATE_LIMIT=true bypasses rate limiting so E2E tests that
      // make many rapid requests to the same endpoint don't get 429s.
      // JWT_REFRESH_SECRET must be set or login crashes when issuing refresh tokens.
      command: 'npm run dev',
      url: 'http://localhost:3000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        NODE_ENV: 'test',
        DISABLE_RATE_LIMIT: 'true',
        JWT_SECRET: process.env.JWT_SECRET || 'e2e-test-jwt-secret-at-least-32-chars-long',
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'e2e-test-jwt-refresh-secret-at-least-32-chars',
        JWT_RESET_SECRET: process.env.JWT_RESET_SECRET || 'e2e-test-jwt-reset-secret-key',
        JWT_VERIFICATION_SECRET: process.env.JWT_VERIFICATION_SECRET || 'e2e-test-jwt-verification-secret-key',
      },
    },
    {
      // Next.js frontend (port 5173)
      command: 'npm run frontend:dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
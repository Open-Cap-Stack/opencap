/**
 * Global Test Setup for Migration Tests
 *
 * Migration tests are largely skipped since mongoose has been removed.
 * This setup only configures environment variables.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.ENABLE_ZERODB = 'false'; // Use mocks for ZeroDB
process.env.ENABLE_SYNC = 'false'; // Sync will be mocked
process.env.ENABLE_DB_MONITORING = 'false'; // Disable monitoring

/**
 * Global setup - configure environment only
 */
beforeAll(async () => {
  // No mongoose connection to manage
}, 10000);

/**
 * After each test - clear all mocks
 */
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.restoreAllMocks();
});

/**
 * Global teardown - ensure cleanup
 */
afterAll(async () => {
  try {
    // Clear all timers
    jest.clearAllTimers();
  } catch (error) {
    console.error('Error in migration test teardown:', error);
  }
}, 10000);

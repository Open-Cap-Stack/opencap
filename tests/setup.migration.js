/**
 * Global Test Setup for Migration Tests
 *
 * Migration tests manage their own MongoDB instances in each test file
 * to avoid connection conflicts. This setup only configures environment.
 */

const mongoose = require('mongoose');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.ENABLE_ZERODB = 'false'; // Use mocks for ZeroDB
process.env.ENABLE_SYNC = 'false'; // Sync will be mocked
process.env.ENABLE_DB_MONITORING = 'false'; // Disable monitoring

// Set mongoose options
mongoose.set('strictQuery', false);

/**
 * Global setup - configure environment only
 */
beforeAll(async () => {
  // Close any existing mongoose connections
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
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
    // Close mongoose connections if any are open
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    // Clear all timers
    jest.clearAllTimers();
  } catch (error) {
    console.error('Error in migration test teardown:', error);
  }
}, 10000);

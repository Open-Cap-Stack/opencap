/**
 * OpenCap Test Environment Setup for Middleware Testing
 * 
 * [Feature] OCAE-201: Set up Express server with middleware
 * 
 * This module configures the test environment for middleware-specific tests
 * by setting appropriate environment variables.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DISABLE_RATE_LIMIT = 'true'; // Skip most rate limiting in tests
process.env.ENABLE_TEST_LOGS = 'true';  // Enable logging for test debugging

console.log('✅ Middleware test environment variables set');

module.exports = {
  setup: () => {
    // Any additional setup for middleware tests
  },
  teardown: () => {
    // Any necessary cleanup
  }
};

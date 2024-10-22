module.exports = {
  globalSetup: './__tests__/globalSetup.js', // Path to the global setup file
  globalTeardown: './__tests__/globalTeardown.js', // Path to the global teardown file (optional, only if used)
  testMatch: ['**/__tests__/**/*.[jt]s?(x)'], // Look for tests inside the __tests__ directory
  testPathIgnorePatterns: ['/node_modules/', '/dist/'], // Ignore node_modules and dist folders
  testTimeout: 30000, // Set a custom test timeout
  verbose: true, // Enable detailed output
};

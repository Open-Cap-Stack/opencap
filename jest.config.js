module.exports = {
  globalSetup: './__tests__/globalSetup.js',
  globalTeardown: './__tests__/globalTeardown.js',
  testMatch: ['**/__tests__/**/*.[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  testTimeout: 30000,
  verbose: true,
  detectOpenHandles: true, // Optional, helps find open handles
};

// jest.config.integration.js
module.exports = {
    testEnvironment: 'node',
    testTimeout: 30000,
    setupFilesAfterEnv: ['./__tests__/setup/jest.setup.js'],
    testMatch: ['**/__tests__/**/*.integration.test.js'],
    moduleFileExtensions: ['js', 'json'],
    collectCoverage: false,
    verbose: true,
    detectOpenHandles: true,
    forceExit: true
  };
// jest.config.js
const path = require('path');

module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000,
  setupFilesAfterEnv: [
    path.resolve(__dirname, '__tests__/setup/jest.setup.js')
  ],
  moduleFileExtensions: ['js', 'json'],
  testMatch: [
    "**/__tests__/**/*.(test|integration.test|unit.test).js"
  ],
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  clearMocks: true,
  restoreMocks: true,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@middleware/(.*)$': '<rootDir>/middleware/$1',
    '^@routes/(.*)$': '<rootDir>/routes/$1',
    '^@controllers/(.*)$': '<rootDir>/controllers/$1',
    '^@models/(.*)$': '<rootDir>/models/$1'
  },
  roots: ['<rootDir>'],
  modulePaths: [path.resolve(__dirname)]
};
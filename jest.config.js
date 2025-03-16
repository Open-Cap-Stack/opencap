// jest.config.js
const path = require('path');

module.exports = {
  // Core Configuration
  testEnvironment: 'node',
  testTimeout: 30000,
  verbose: true,
  
  // File Patterns and Locations
  roots: ['<rootDir>/__tests__/'],
  moduleFileExtensions: ['js', 'json'],
  testMatch: ['**/*.test.js'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/build/'
  ],
  
  // Setup Files
  setupFilesAfterEnv: [
    path.resolve(__dirname, '__tests__/setup/jest.setup.js')
  ],
  
  // Path Aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@middleware/(.*)$': '<rootDir>/middleware/$1',
    '^@routes/(.*)$': '<rootDir>/routes/$1',
    '^@controllers/(.*)$': '<rootDir>/controllers/$1',
    '^@models/(.*)$': '<rootDir>/models/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',
    '^@services/(.*)$': '<rootDir>/services/$1'
  },
  
  // Mock Behavior
  clearMocks: true,
  restoreMocks: true,
  
  // Coverage Settings
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'routes/**/*.js',
    'models/**/*.js',
    'controllers/**/*.js',
    'services/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/coverage/**',
    '!**/dist/**'
  ],
  coverageReporters: ['text', 'lcov', 'html', 'json-summary', 'cobertura'],
  
  // Coverage Thresholds - Enforcing minimum test coverage
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './controllers/': {
      branches: 75,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './models/': {
      branches: 80,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Transform and Timing
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Error Handling
  errorOnDeprecated: true
};
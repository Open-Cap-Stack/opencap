module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.test.js',
    '**/*.test.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/startup-love/',
    '/frontend/',
    '/e2e/',
    '/tests/deployment/',
    '/tests/migration/',
    '/tests/performance/',
    '/__tests__/'
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    'controllers/**/*.js',
    'services/**/*.js',
    'middleware/**/*.js',
    'models/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/e2e/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};

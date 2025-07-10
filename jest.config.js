module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.test.js',
    '**/*.test.js'
  ],
  testPathIgnorePatterns: ['/node_modules/', '/startup-love/', '/frontend/'],
  collectCoverage: true,
  collectCoverageFrom: [
    'controllers/**/*.js',
    'routes/**/*.js',
    'models/**/*.js',
    'services/**/*.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov']
};

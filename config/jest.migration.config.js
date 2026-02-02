/**
 * Jest Configuration for Migration Tests
 *
 * Separate config for running migration-specific tests
 * These tests are critical for MongoDB to ZeroDB migration
 */

module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  testMatch: [
    '**/tests/migration/**/*.test.js',
    '**/tests/integration/continuousSync.test.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/startup-love/',
    '/frontend/'
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    // Migration-specific services
    'services/syncOrchestrator.js',
    'services/mongoChangeStreamListener.js',
    'services/zerodbSyncService.js',
    'services/databaseAdapter.js',
    'services/zerodbService.js',
    'utils/metricsCollector.js',
    'middleware/databaseMonitor.js',

    // Exclude everything else
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/*.test.js',
    '!**/startup-love/**',
    '!**/frontend/**',
    '!**/coverage/**',
    '!**/dist/**',
    '!**/build/**'
  ],
  coverageDirectory: 'coverage-migration',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.migration.js'],
  testTimeout: 30000,
  maxWorkers: 1, // Run migration tests serially to avoid connection conflicts
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  detectOpenHandles: true,
  forceExit: true,
  verbose: true
};

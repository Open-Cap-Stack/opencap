/**
 * Stryker Mutation Testing Configuration
 * Targets continuous sync implementation for comprehensive mutation testing
 */

module.exports = {
  packageManager: 'npm',
  reporters: ['html', 'clear-text', 'progress', 'dashboard'],
  testRunner: 'jest',
  coverageAnalysis: 'perTest',

  // Target files for mutation testing
  mutate: [
    'services/mongoChangeStreamListener.js',
    'services/zerodbSyncService.js',
    'services/syncOrchestrator.js',
    '!**/*.test.js',
    '!**/node_modules/**'
  ],

  // Mutation types to apply
  mutator: {
    plugins: [
      '@stryker-mutator/javascript-mutator'
    ],
    excludedMutations: [
      // Exclude logging mutations (non-critical)
      'StringLiteral',
      'ObjectLiteral'
    ]
  },

  // Test configuration
  jest: {
    projectType: 'custom',
    configFile: 'config/jest.config.js',
    enableFindRelatedTests: true
  },

  // Mutation thresholds
  thresholds: {
    high: 80,
    low: 60,
    break: 50
  },

  // Timeout configuration
  timeoutMS: 60000,
  timeoutFactor: 2,

  // Concurrency
  concurrency: 4,

  // Temp directory for mutant execution
  tempDirName: 'stryker-tmp',

  // Clean temp directory after mutation testing
  cleanTempDir: true,

  // Dashboard reporter configuration (if using Stryker dashboard)
  dashboard: {
    project: 'github.com/opencapstack/opencap',
    version: 'feature/zerodb-phase1-initialization',
    module: 'continuous-sync'
  },

  // HTML reporter configuration
  htmlReporter: {
    baseDir: 'reports/mutation'
  },

  // Files to ignore
  ignorers: [
    'node_modules',
    'tests',
    'coverage',
    'reports'
  ],

  // Plugins
  plugins: [
    '@stryker-mutator/core',
    '@stryker-mutator/jest-runner',
    '@stryker-mutator/javascript-mutator'
  ]
};

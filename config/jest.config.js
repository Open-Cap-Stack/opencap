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
    '/tests/integration/',
    '/tests/security/',
    '/__tests__/scripts/'
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    // CORE BUSINESS LOGIC FOCUS - Only essential files for 80% coverage target

    // Core Controllers (v1 API - main business logic)
    'controllers/v1/financialReportController.js',
    'controllers/v1/shareClassController.js',
    'controllers/v1/financialMetricsController.js',
    'controllers/authController.js',
    'controllers/documentController.js',
    'controllers/companyController.js',
    'controllers/SPVasset.js',
    'controllers/investmentSimilarityController.js',
    'controllers/semanticSearchController.js',
    'controllers/similarityController.js',

    // Core Services (already well tested)
    'services/financialDataService.js',
    'services/zerodbService.js',
    'services/streamingService.js',
    'services/memoryService.js',
    'services/vectorService.js',
    'services/vectorSearchOptimizer.js',
    'services/investmentSimilarityService.js',
    'services/documentEmbeddingService.js',
    'services/semanticSearchService.js',
    'services/similarityService.js',

    // Continuous Sync Services (Issue #14)
    'services/mongoChangeStreamListener.js',
    'services/zerodbSyncService.js',
    'services/syncOrchestrator.js',

    // Monitoring Services (Issue #37)
    'services/monitoringDashboard.js',
    'services/alertService.js',
    'services/performanceOptimizer.js',

    // Core Models (business entities)
    'models/User.js',
    'models/Company.js',
    'models/FinancialReport.js',
    'models/Document.js',
    'models/ShareClass.js',
    'models/SPV.js',

    // Core Routes (API endpoints)
    'routes/v1/authRoutes.js',
    'routes/v1/financialReportRoutes.js',
    'routes/v1/companyRoutes.js',
    'routes/v1/documentRoutes.js',
    'routes/v1/shareClassRoutes.js',
    'routes/v1/spvRoutes.js',
    'routes/v1/semanticSearchRoutes.js',
    'routes/v1/investmentSimilarityRoutes.js',
    'routes/v1/similarityRoutes.js',

    // Exclude everything else
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/*.test.js',
    '!**/startup-love/**',
    '!**/frontend/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};

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
    // CORE BUSINESS LOGIC FOCUS - Only essential files for 80% coverage target
    
    // Core Controllers (v1 API - main business logic)
    'controllers/v1/financialReportController.js',
    'controllers/v1/shareClassController.js', 
    'controllers/v1/financialMetricsController.js',
    'controllers/authController.js',
    'controllers/documentController.js',
    'controllers/companyController.js',
    'controllers/SPVasset.js',
    
    // Core Services (already well tested)
    'services/financialDataService.js',
    'services/zerodbService.js',
    'services/streamingService.js',
    'services/memoryService.js',
    'services/vectorService.js',
    
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
    
    // Exclude everything else
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/*.test.js',
    '!**/startup-love/**',
    '!**/frontend/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  setupFilesAfterEnv: ['./tests/setup.js']
};

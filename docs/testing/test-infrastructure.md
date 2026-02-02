# Test Infrastructure Documentation

## Overview

This document describes the comprehensive test infrastructure for the OpenCap Financial Management System. The infrastructure is designed to support Test-Driven Development (TDD) with proper isolation, cleanup, and coverage tracking.

## Test Configuration

### Jest Configuration (`config/jest.config.js`)

- **Test Environment**: Node.js
- **Test Match Patterns**:
  - `**/tests/**/*.test.js`
  - `**/__tests__/**/*.test.js`
- **Test Timeout**: 30 seconds
- **Coverage Threshold**: 80% (branches, functions, lines, statements)
- **Test Execution**: Run in band (`runInBand`) to prevent race conditions

### Excluded Paths

The following directories are excluded from test runs:
- `/node_modules/`
- `/frontend/`
- `/tests/deployment/`
- `/tests/e2e/`
- `/tests/migration/`
- `/tests/performance/`

## Test Setup (`tests/setup.js`)

### Global Setup

The test setup file handles:

1. **Environment Variables**:
   - Sets `NODE_ENV=test`
   - Configures test JWT secret
   - Disables ZeroDB for unit tests
   - Disables sync services for unit tests
   - Disables database monitoring for tests

2. **MongoDB Memory Server**:
   - Creates in-memory MongoDB instance on port 27018
   - Connects Mongoose to the test database
   - Ensures database isolation between test runs

3. **Database Cleanup**:
   - Clears all collections before each test
   - Drops database and closes connections after all tests
   - Stops MongoDB memory server on completion

4. **Mock Cleanup**:
   - Clears all Jest mocks after each test
   - Clears all timers after each test
   - Restores all mocked functions

## Test Mocks

### Available Mocks (`tests/mocks/`)

1. **ZeroDB Mock** (`zerodbMock.js`):
   - Query operations
   - Insert/Update/Delete operations
   - Vector operations (upsert, search)
   - Event streaming
   - File storage
   - Memory operations
   - Analytics

2. **Anthropic API Mock** (`anthropicMock.js`):
   - Message creation
   - Streaming responses
   - Mock Claude API calls

3. **OpenAI API Mock** (`openaiMock.js`):
   - Embeddings generation
   - Chat completions
   - Mock GPT API calls

### Usage Example

```javascript
const { zerodbMock, anthropicMock, openaiMock } = require('../mocks');

describe('My Service', () => {
  beforeEach(() => {
    // Reset mocks before each test
    zerodbMock.reset();
    anthropicMock.reset();
    openaiMock.reset();
  });

  it('should query data from ZeroDB', async () => {
    zerodbMock.query.mockResolvedValue({
      success: true,
      data: [{ id: '1', name: 'Test' }],
    });

    // Your test code here
  });
});
```

## Test Commands

### Basic Commands

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run only security tests
npm run test:security

# Run tests with verbose output
npm run test:verbose

# Debug tests
npm run test:debug
```

### E2E Testing

```bash
# Run E2E tests
npm run test:e2e

# Run E2E tests in headed mode
npm run test:e2e:headed

# Debug E2E tests
npm run test:e2e:debug

# Open E2E test UI
npm run test:e2e:ui

# Show E2E test report
npm run test:e2e:report
```

### All Tests

```bash
# Run all tests (unit + E2E)
npm run test:all
```

## Test Organization

### Directory Structure

```
tests/
├── setup.js                    # Global test setup and teardown
├── mocks/                      # Mock implementations
│   ├── index.js
│   ├── zerodbMock.js
│   ├── anthropicMock.js
│   └── openaiMock.js
├── setup/                      # Test utilities
│   ├── app.js                 # Express app setup
│   └── db.js                  # Database setup utilities
├── utils/                      # Test helpers
│   └── testHelpers.js         # Common test utilities
├── unit/                       # Unit tests
│   ├── controllers/
│   ├── services/
│   ├── models/
│   └── routes/
├── integration/                # Integration tests
├── security/                   # Security tests
└── e2e/                        # End-to-end tests
```

## Best Practices

### 1. Test Isolation

- Each test should be independent
- Use `beforeEach` to set up fresh state
- Use `afterEach` to clean up
- Never rely on test execution order

### 2. Mock External Dependencies

- Always mock external API calls
- Mock database operations when testing logic
- Use provided mocks for consistency

### 3. Async Handling

```javascript
// GOOD: Proper async/await
it('should handle async operations', async () => {
  const result = await someAsyncFunction();
  expect(result).toBeDefined();
});

// BAD: Missing await
it('should handle async operations', () => {
  someAsyncFunction(); // This won't work properly
});
```

### 4. Descriptive Test Names

```javascript
// GOOD: Clear, descriptive names
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user with valid data', async () => {
      // test code
    });

    it('should throw ValidationError when email is invalid', async () => {
      // test code
    });
  });
});

// BAD: Vague names
describe('UserService', () => {
  it('test 1', () => {
    // What does this test?
  });
});
```

### 5. AAA Pattern (Arrange-Act-Assert)

```javascript
it('should calculate total correctly', () => {
  // Arrange: Set up test data
  const items = [
    { price: 10, quantity: 2 },
    { price: 20, quantity: 1 }
  ];

  // Act: Execute the function
  const total = calculateTotal(items);

  // Assert: Verify the result
  expect(total).toBe(40);
});
```

## Coverage Goals

### Target Coverage: 80%+

The following files are tracked for coverage:

#### Controllers
- financialReportController.js
- shareClassController.js
- financialMetricsController.js
- authController.js
- documentController.js
- companyController.js
- SPVasset.js
- investmentSimilarityController.js
- semanticSearchController.js
- similarityController.js

#### Services
- financialDataService.js
- zerodbService.js
- streamingService.js
- memoryService.js
- vectorService.js
- vectorSearchOptimizer.js
- investmentSimilarityService.js
- documentEmbeddingService.js
- semanticSearchService.js
- similarityService.js
- databaseAdapter.js
- mongoChangeStreamListener.js
- zerodbSyncService.js
- syncOrchestrator.js
- monitoringDashboard.js
- alertService.js
- performanceOptimizer.js

#### Models
- User.js
- Company.js
- FinancialReport.js
- Document.js
- ShareClass.js
- SPV.js

#### Routes
- All v1 API routes

#### Utilities
- metricsCollector.js
- databaseMonitor.js (middleware)

## Troubleshooting

### Open Handles Warning

If you see "Jest did not exit one second after the test run has completed":

1. Ensure all database connections are closed in `afterAll`
2. Clear all timers and intervals
3. Close all event listeners
4. Use `--detectOpenHandles` flag to identify the source

### Timeout Errors

If tests timeout:

1. Check for missing `await` on async operations
2. Increase timeout in test or globally
3. Verify mock responses are resolving
4. Check for infinite loops or long-running operations

### Mock Issues

If mocks aren't working:

1. Verify mock is imported before the tested module
2. Clear mocks between tests with `jest.clearAllMocks()`
3. Reset mocks with `jest.resetAllMocks()` if needed
4. Check mock implementation matches expected interface

### Memory Leaks

If tests slow down over time:

1. Verify database cleanup in `afterEach`
2. Clear all timers and intervals
3. Remove event listeners
4. Check for circular references

## Continuous Integration

The test infrastructure is designed to work seamlessly in CI/CD pipelines:

- All tests run in isolation
- No external dependencies required
- Coverage reports generated automatically
- Exit codes properly set for CI integration
- Deterministic test results

## Future Improvements

1. **Mutation Testing**: Implement mutation testing to verify test quality
2. **Performance Testing**: Add performance benchmarks
3. **Contract Testing**: Add contract tests for API endpoints
4. **Visual Regression**: Add visual regression testing for UI components
5. **Load Testing**: Add load testing for critical endpoints

## Support

For issues or questions about the test infrastructure:

1. Check this documentation first
2. Review test examples in `tests/unit/`
3. Check test helper utilities in `tests/utils/`
4. Consult the team's testing standards

## Updates

Last Updated: 2026-02-02
Version: 1.0.0
Maintainer: Development Team

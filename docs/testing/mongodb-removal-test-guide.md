# MongoDB Removal Test Guide

## Overview

This guide provides comprehensive instructions for running the test suite related to MongoDB removal (Issue #32). The test suite ensures that:

1. MongoDB functionality is properly documented before removal
2. Data migration from MongoDB to ZeroDB is complete and accurate
3. The application works correctly with ZeroDB only
4. All features maintain parity after MongoDB removal
5. Performance is acceptable with ZeroDB

## Test Structure

```
tests/migration/
├── pre-migration/
│   └── mongodb-baseline.test.js          # Document current MongoDB functionality
├── migration/
│   └── mongodb-to-zerodb.test.js         # Test migration process
├── post-migration/
│   └── zerodb-only.test.js              # Verify ZeroDB-only operation
├── regression/
│   └── feature-parity.test.js           # Ensure feature parity
├── integration/
│   └── api-endpoints-without-mongodb.test.js  # Test all API endpoints
└── performance/
    └── mongodb-vs-zerodb.test.js        # Compare performance
```

## Prerequisites

```bash
# Install dependencies
npm install

# Ensure test environment is configured
cp .env.example .env.test
```

## Test Execution Order

**CRITICAL**: Tests must be run in the following order:

### Phase 1: Pre-Migration (BEFORE removing MongoDB code)

```bash
# 1. Run baseline tests to document MongoDB functionality
npm test tests/migration/pre-migration/mongodb-baseline.test.js

# These tests MUST pass before proceeding with MongoDB removal
```

**Expected outcome**: All tests pass, establishing baseline metrics.

### Phase 2: Migration Testing (DURING migration)

```bash
# 2. Run migration validation tests
npm test tests/migration/mongodb-to-zerodb.test.js

# These tests validate data integrity during migration
```

**Expected outcome**: All tests pass, confirming successful data migration.

### Phase 3: Post-Migration (AFTER removing MongoDB code)

```bash
# 3. Run ZeroDB-only tests
npm test tests/migration/post-migration/zerodb-only.test.js

# 4. Run regression tests
npm test tests/migration/regression/feature-parity.test.js

# 5. Run integration tests
npm test tests/migration/integration/api-endpoints-without-mongodb.test.js

# 6. Run performance comparison
npm test tests/migration/performance/mongodb-vs-zerodb.test.js
```

**Expected outcome**: All tests pass without MongoDB dependency.

## Running All Migration Tests

```bash
# Run all migration tests in sequence
npm test tests/migration/

# Run with coverage
npm run test:coverage -- tests/migration/
```

## Coverage Requirements

### Required Coverage Levels

- **Database Adapter**: 90%+
- **ZeroDB Service**: 90%+
- **Change Stream Listener**: 90%+
- **Data Migration Scripts**: 100%
- **API Controllers**: 85%+
- **Critical Services**: 90%+

### Generating Coverage Report

```bash
# Generate detailed coverage report
npm run test:coverage

# View HTML coverage report
open coverage/lcov-report/index.html
```

## Test Categories

### 1. Pre-Migration Baseline Tests

**File**: `tests/migration/pre-migration/mongodb-baseline.test.js`

**Purpose**: Document current MongoDB functionality and establish performance baselines.

**Coverage**:
- MongoDB connection and initialization
- CRUD operations (Create, Read, Update, Delete)
- Query patterns (filters, sorting, pagination)
- Data integrity checks
- Performance benchmarks
- MongoDB-specific features (ObjectIds, arrays, nested documents)

**Key Metrics Captured**:
- Connection time
- Query response times
- Bulk operation throughput
- Data structure validation

**Run Command**:
```bash
npm test tests/migration/pre-migration/mongodb-baseline.test.js
```

**Expected Results**:
- All tests pass
- Performance metrics logged
- Baseline established for comparison

### 2. Migration Validation Tests

**File**: `tests/migration/mongodb-to-zerodb.test.js`

**Purpose**: Validate data migration completeness and integrity.

**Coverage**:
- Schema mapping (MongoDB models → ZeroDB tables)
- Data transformation (ObjectIds → strings, Dates → ISO strings)
- Migration completeness (all records migrated)
- Data integrity validation
- Rollback procedures
- Error handling during migration

**Critical Checks**:
- ✓ All ObjectIds converted to strings
- ✓ Date objects converted to ISO strings
- ✓ Nested objects preserved
- ✓ Arrays handled correctly
- ✓ Mongoose-specific fields removed
- ✓ Record count matches
- ✓ No data corruption

**Run Command**:
```bash
npm test tests/migration/mongodb-to-zerodb.test.js
```

**Expected Results**:
- 100% data transformation accuracy
- Zero data loss
- All integrity checks pass

### 3. Post-Migration Tests

**File**: `tests/migration/post-migration/zerodb-only.test.js`

**Purpose**: Verify the application works correctly with ZeroDB only.

**Coverage**:
- MongoDB disconnection verification
- ZeroDB connection verification
- All CRUD operations with ZeroDB
- Query pattern support
- Data type handling
- Error handling without MongoDB
- Performance metrics

**Critical Checks**:
- ✓ No MongoDB connection attempts
- ✓ ZeroDB operations functional
- ✓ Query syntax supported
- ✓ Data types handled correctly
- ✓ Errors are appropriate
- ✓ No MongoDB fallback logic

**Run Command**:
```bash
npm test tests/migration/post-migration/zerodb-only.test.js
```

**Expected Results**:
- All tests pass without MongoDB
- No MongoDB-related errors
- ZeroDB handles all operations

### 4. Regression Tests

**File**: `tests/migration/regression/feature-parity.test.js`

**Purpose**: Ensure all features work identically before and after MongoDB removal.

**Coverage**:
- User management features
- Company management
- Transactions
- Documents
- Share classes
- Financial metrics
- API response formats
- Query options
- Data validation rules
- Business logic
- Backward compatibility

**Critical Checks**:
- ✓ All features function identically
- ✓ API responses unchanged
- ✓ Validation rules preserved
- ✓ Business logic intact
- ✓ Backward compatible

**Run Command**:
```bash
npm test tests/migration/regression/feature-parity.test.js
```

**Expected Results**:
- 100% feature parity
- No breaking changes
- All validations work

### 5. Integration Tests

**File**: `tests/migration/integration/api-endpoints-without-mongodb.test.js`

**Purpose**: Test all API endpoints end-to-end without MongoDB.

**Coverage**:
- Health check endpoints
- Authentication endpoints
- User management endpoints
- Company management endpoints
- Document management endpoints
- Share class endpoints
- Transaction endpoints
- Financial metrics endpoints
- Search and analytics endpoints
- Error handling
- Request validation
- Response headers
- Concurrent requests

**Critical Checks**:
- ✓ All endpoints respond correctly
- ✓ Authentication works
- ✓ CRUD operations successful
- ✓ Error handling appropriate
- ✓ No MongoDB dependencies
- ✓ Performance acceptable

**Run Command**:
```bash
npm test tests/migration/integration/api-endpoints-without-mongodb.test.js
```

**Expected Results**:
- All API tests pass
- No 500 errors
- Proper error responses

### 6. Performance Comparison Tests

**File**: `tests/migration/performance/mongodb-vs-zerodb.test.js`

**Purpose**: Compare MongoDB and ZeroDB performance.

**Coverage**:
- Connection/initialization time
- Single document operations
- Batch operations
- Query complexity
- Pagination performance
- Concurrent operations
- Memory usage

**Metrics Tracked**:
- Connection time
- Create/Read/Update/Delete latency
- Bulk operation throughput
- Query response times
- Concurrent operation performance

**Run Command**:
```bash
npm test tests/migration/performance/mongodb-vs-zerodb.test.js
```

**Expected Results**:
- Performance metrics logged
- ZeroDB performance acceptable
- No significant degradation

## Test Execution Results

### Success Criteria

All tests must pass with the following criteria:

1. **Pre-Migration Tests**: 100% pass rate
2. **Migration Tests**: 100% pass rate
3. **Post-Migration Tests**: 100% pass rate
4. **Regression Tests**: 100% pass rate
5. **Integration Tests**: 95%+ pass rate
6. **Performance Tests**: ZeroDB within 2x MongoDB performance

### Coverage Goals

| Component | Target | Required |
|-----------|--------|----------|
| Database Adapter | 95% | 90% |
| ZeroDB Service | 95% | 90% |
| Change Stream Listener | 95% | 90% |
| Migration Scripts | 100% | 100% |
| API Controllers | 90% | 85% |
| Services | 90% | 85% |

## Troubleshooting

### Common Issues

#### 1. MongoDB Connection Errors

```bash
Error: MongoDB connection failed
```

**Solution**: Ensure MongoDB is running for pre-migration tests:
```bash
# Check MongoDB status
mongod --version

# Or use Docker
docker run -d -p 27017:27017 mongo:6
```

#### 2. ZeroDB Authentication Errors

```bash
Error: Unauthorized: Invalid token
```

**Solution**: Set valid ZeroDB token:
```bash
export ZERODB_TOKEN="your-actual-token"
```

#### 3. Test Timeout Errors

```bash
Error: Test exceeded timeout of 5000ms
```

**Solution**: Increase Jest timeout in jest.config.js:
```javascript
testTimeout: 30000  // 30 seconds
```

#### 4. Coverage Below Threshold

```bash
Error: Coverage for services/databaseAdapter.js is 85%, below threshold of 90%
```

**Solution**: Add more test cases for uncovered lines:
```bash
# Find uncovered lines
npm run test:coverage
open coverage/lcov-report/services/databaseAdapter.js.html
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: MongoDB Removal Tests

on:
  pull_request:
    branches: [feature/issue-32-mongodb-removal-tests]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run migration tests
        run: npm test tests/migration/
      - name: Generate coverage report
        run: npm run test:coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Test Maintenance

### Adding New Tests

1. Identify uncovered scenarios
2. Add test cases following existing patterns
3. Ensure tests are isolated and repeatable
4. Update this documentation

### Updating Tests

1. Review test failures
2. Update test expectations if behavior changed intentionally
3. Fix bugs if behavior regressed
4. Update coverage thresholds as needed

## Best Practices

### Test Isolation

- Each test should be independent
- Use `beforeEach` to reset state
- Clean up after tests in `afterEach`
- Mock external dependencies

### Test Naming

```javascript
describe('Feature Name', () => {
  it('should do something specific when condition', () => {
    // Test implementation
  });
});
```

### Assertions

- Use descriptive assertion messages
- Test both positive and negative cases
- Verify error messages
- Check data structure

### Performance Testing

- Establish baselines before optimization
- Test under realistic load
- Compare relative performance, not absolute
- Account for system variability

## Reporting

### Test Report Format

```
====== MongoDB Removal Test Report ======
Date: 2024-02-02
Branch: feature/issue-32-mongodb-removal-tests

Phase 1: Pre-Migration Tests
✓ MongoDB Baseline: PASS (100%)
  - Connection: PASS
  - CRUD Operations: PASS
  - Query Patterns: PASS
  - Performance Benchmarks: PASS

Phase 2: Migration Tests
✓ Migration Validation: PASS (100%)
  - Schema Mapping: PASS
  - Data Transformation: PASS
  - Integrity Checks: PASS

Phase 3: Post-Migration Tests
✓ ZeroDB Only: PASS (100%)
✓ Feature Parity: PASS (100%)
✓ API Integration: PASS (98%)
✓ Performance: PASS (acceptable)

Coverage Summary:
  - Database Adapter: 93%
  - ZeroDB Service: 91%
  - Change Stream Listener: 94%
  - Overall: 92%

Performance Comparison:
  - MongoDB avg: 45ms
  - ZeroDB avg: 52ms
  - Difference: +15% (acceptable)

Recommendation: Proceed with MongoDB removal
=========================================
```

## Next Steps

After all tests pass:

1. **Review test coverage** - Ensure 90%+ for critical components
2. **Document findings** - Update migration guide with insights
3. **Get approval** - Share test results with team
4. **Create PR** - Submit tests for review
5. **Plan removal** - Schedule MongoDB code removal
6. **Monitor** - Set up alerts for ZeroDB operations

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)
- [ZeroDB API Documentation](https://api.ainative.studio/docs)

## Support

For issues or questions:
- File GitHub issue: `github.com/yourorg/opencap/issues`
- Slack channel: `#opencap-testing`
- Email: `dev@yourorg.com`

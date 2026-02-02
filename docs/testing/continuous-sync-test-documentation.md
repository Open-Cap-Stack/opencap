# Continuous Sync Test Suite Documentation

## Overview

This document describes the comprehensive test suite for the continuous synchronization implementation between MongoDB and ZeroDB (Issue #14). The test suite includes unit tests, integration tests, and performance benchmarks to ensure reliable bidirectional data synchronization.

## Test Files

### Unit Tests

#### 1. `tests/unit/services/mongoChangeStreamListener.test.js`

Tests the MongoDB Change Stream listener service that monitors database changes in real-time.

**Test Coverage:**
- Initialization with various configurations
- Connection management and reconnection logic
- Event processing for insert, update, and delete operations
- Batch processing with configurable size and timeout
- Error handling and recovery mechanisms
- Reconnection with exponential backoff
- Health monitoring and status reporting
- Configuration validation
- Change stream pipeline construction
- Memory cleanup and resource management

**Key Test Scenarios:**
- Successfully start and stop change stream
- Process change events and emit to sync service
- Handle network interruptions with automatic reconnection
- Batch events when threshold is reached or timeout expires
- Preserve and restore resume tokens for recovery
- Filter events by collection
- Track event statistics and processing metrics

**Total Tests:** 50+ test cases

---

#### 2. `tests/unit/services/zerodbSyncService.test.js`

Tests the ZeroDB synchronization service that handles data transformation and sync operations.

**Test Coverage:**
- Service initialization and configuration
- Data transformation between MongoDB and ZeroDB formats
- Insert, update, and delete sync operations
- Batch synchronization
- Conflict resolution strategies (last-write-wins, mongodb-wins)
- Retry logic with exponential backoff
- Reverse sync (ZeroDB to MongoDB)
- Statistics tracking and monitoring
- Error recovery and failed operation queuing
- Table name mapping
- Soft delete support

**Key Test Scenarios:**
- Transform MongoDB documents to ZeroDB format
- Handle nested objects and arrays
- Sync operations with retry on transient errors
- Resolve conflicts based on configured strategy
- Process batches efficiently
- Track sync statistics (inserts, updates, deletes, errors)
- Queue and retry failed operations
- Prevent sync loops in bidirectional mode

**Total Tests:** 60+ test cases

---

#### 3. `tests/unit/services/syncOrchestrator.test.js`

Tests the orchestrator that coordinates between change stream listener and sync service.

**Test Coverage:**
- Initialization with configuration
- Starting and stopping orchestration
- Event routing from listener to sync service
- Batch processing coordination
- Error handling and sync pause/resume
- Health aggregation from components
- Performance metrics tracking
- Graceful shutdown with pending event processing
- Resume token management
- Bidirectional sync coordination
- Configuration validation

**Key Test Scenarios:**
- Initialize and configure all components
- Route change events to appropriate sync operations
- Handle errors and pause sync when critical issues occur
- Process queued events on resume
- Aggregate health status from all components
- Track throughput and latency metrics
- Gracefully shutdown with pending events
- Prevent sync loops in bidirectional mode
- Coordinate reverse sync polling

**Total Tests:** 50+ test cases

---

### Integration Tests

#### 4. `tests/integration/continuousSync.test.js`

End-to-end integration tests using in-memory MongoDB and mocked ZeroDB.

**Test Coverage:**
- Complete insert sync flow (MongoDB → ZeroDB)
- Complete update sync flow with conflict resolution
- Complete delete sync flow
- Bidirectional sync (ZeroDB → MongoDB)
- High-volume stress testing
- Network failure recovery
- Multi-collection synchronization
- Graceful shutdown scenarios
- Performance benchmarks

**Key Test Scenarios:**

1. **End-to-End Insert Sync:**
   - Create document in MongoDB
   - Verify sync to ZeroDB with correct transformation
   - Handle batch inserts

2. **End-to-End Update Sync:**
   - Update document in MongoDB
   - Verify update propagates to ZeroDB
   - Handle concurrent updates

3. **End-to-End Delete Sync:**
   - Delete document from MongoDB
   - Verify deletion in ZeroDB
   - Handle bulk deletes

4. **Conflict Resolution:**
   - Test last-write-wins strategy
   - Test mongodb-wins strategy
   - Verify correct data after conflict

5. **Failure Recovery:**
   - Simulate network interruptions
   - Verify retry with exponential backoff
   - Test resume token preservation

6. **Reverse Sync:**
   - Detect changes in ZeroDB
   - Sync changes back to MongoDB
   - Prevent sync loops

7. **High Volume Testing:**
   - Process 100+ simultaneous inserts
   - Handle mixed operations under load
   - Verify system remains healthy

8. **Multi-Collection Sync:**
   - Sync multiple collections simultaneously
   - Isolate errors to specific collections
   - Verify correct table mappings

9. **Performance Benchmarks:**
   - Sync 1000 records within 10 seconds
   - Maintain low latency (< 500ms)
   - Achieve > 100 events/second throughput

**Total Tests:** 20+ integration scenarios

---

## Test Execution

### Running All Tests

```bash
npm test
```

### Running Specific Test Suites

```bash
# Run only unit tests
npm test -- tests/unit/services/mongoChangeStreamListener.test.js
npm test -- tests/unit/services/zerodbSyncService.test.js
npm test -- tests/unit/services/syncOrchestrator.test.js

# Run only integration tests
npm test -- tests/integration/continuousSync.test.js
```

### Running Tests with Coverage

```bash
npm test -- --coverage
```

### Running Tests in Watch Mode

```bash
npm test -- --watch
```

---

## Coverage Goals

The test suite targets comprehensive coverage:

- **Statement Coverage:** > 90%
- **Branch Coverage:** > 85%
- **Function Coverage:** > 90%
- **Line Coverage:** > 90%

### Critical Paths Covered

1. **Connection Management:**
   - MongoDB connection establishment
   - Change stream initialization
   - Reconnection after failures

2. **Event Processing:**
   - Insert operation handling
   - Update operation handling
   - Delete operation handling
   - Batch processing

3. **Error Scenarios:**
   - Network timeouts
   - Service unavailability
   - Invalid data
   - Resume token invalidation

4. **Recovery Mechanisms:**
   - Automatic retry with backoff
   - Resume token restoration
   - Failed operation queuing
   - Graceful degradation

---

## Mutation Testing

### Mutation Test Scenarios

The following mutations are tested to ensure test quality:

#### 1. **Arithmetic Mutations**
- Change batch size thresholds
- Modify timeout values
- Alter retry delay calculations

#### 2. **Conditional Mutations**
- Flip error condition checks
- Invert retry logic
- Change conflict resolution conditions

#### 3. **Statement Deletion Mutations**
- Remove error handlers
- Skip event emission
- Omit status updates

#### 4. **Constant Mutations**
- Change operation type strings
- Modify default configuration values
- Alter retry attempt limits

### Expected Mutation Score

Target mutation score: > 80%

### Running Mutation Tests

```bash
# Install Stryker mutation testing framework
npm install --save-dev @stryker-mutator/core @stryker-mutator/jest-runner

# Run mutation tests
npx stryker run
```

---

## Test Data and Fixtures

### Sample Test Documents

```javascript
// User document
{
  _id: "507f1f77bcf86cd799439011",
  name: "John Doe",
  email: "john@example.com",
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date()
}

// Company document
{
  _id: "507f1f77bcf86cd799439012",
  name: "Tech Corp",
  industry: "Technology",
  employees: 150,
  createdAt: new Date()
}
```

### Mock Configurations

```javascript
// Sync configuration
{
  collections: ['users', 'companies'],
  tableMappings: {
    users: 'sync_users',
    companies: 'sync_companies'
  },
  batchSize: 50,
  conflictResolution: 'last-write-wins',
  retryAttempts: 3,
  retryDelayMs: 1000
}
```

---

## Performance Benchmarks

### Throughput Targets

- **Single Insert:** < 50ms latency
- **Batch Insert (100 records):** < 2 seconds
- **High Volume (1000 records):** < 10 seconds
- **Events per Second:** > 100 ops/sec

### Memory Usage

- **Idle State:** < 50MB
- **Under Load (1000 pending events):** < 200MB
- **No Memory Leaks:** Memory should stabilize after load

### CPU Usage

- **Idle State:** < 5%
- **Under Load:** < 50%
- **Batch Processing:** < 80%

---

## Error Scenarios Tested

### Network Errors
- ECONNREFUSED
- ECONNRESET
- ETIMEDOUT
- Network partition simulation

### Database Errors
- MongoDB connection lost
- Change stream cursor invalidated
- Resume token expired
- Write conflicts

### Service Errors
- ZeroDB API unavailable
- Authentication failures
- Rate limiting
- Invalid data format

### System Errors
- Out of memory
- Disk space exhaustion
- Process termination signals

---

## Continuous Integration

### CI/CD Integration

The test suite is designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
name: Continuous Sync Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- tests/unit/services/
      - run: npm test -- tests/integration/continuousSync.test.js
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v2
```

### Quality Gates

Tests must pass the following gates:

1. **All Tests Pass:** 100% test success rate
2. **Coverage Threshold:** > 80% overall coverage
3. **Performance:** Benchmarks within acceptable limits
4. **No Memory Leaks:** Memory usage stable
5. **No Flaky Tests:** Tests must be deterministic

---

## Debugging Failed Tests

### Common Issues

1. **Timeout Errors:**
   ```javascript
   // Increase timeout for integration tests
   jest.setTimeout(30000);
   ```

2. **MongoDB Memory Server Issues:**
   ```bash
   # Clear MongoDB memory server cache
   rm -rf ~/.cache/mongodb-memory-server
   ```

3. **Mock Issues:**
   ```javascript
   // Clear mocks between tests
   beforeEach(() => {
     jest.clearAllMocks();
   });
   ```

### Debug Logging

Enable debug logging for troubleshooting:

```javascript
process.env.DEBUG = 'sync:*';
process.env.LOG_LEVEL = 'debug';
```

---

## Test Maintenance

### Adding New Tests

When adding new sync features:

1. Add unit tests for new service methods
2. Add integration tests for end-to-end flows
3. Update coverage configuration
4. Document test scenarios
5. Run full test suite to ensure no regression

### Updating Existing Tests

When modifying sync behavior:

1. Update relevant test assertions
2. Add tests for new edge cases
3. Verify backward compatibility
4. Update documentation

### Deprecating Tests

When removing features:

1. Remove associated tests
2. Update coverage expectations
3. Document breaking changes
4. Verify remaining tests pass

---

## Test Metrics and Reporting

### Coverage Reports

Coverage reports are generated in:
- **HTML:** `coverage/lcov-report/index.html`
- **JSON:** `coverage/coverage-final.json`
- **LCOV:** `coverage/lcov.info`

### Test Results

Test results include:
- Total tests run
- Passed/failed/skipped counts
- Execution time per test
- Coverage percentages
- Performance metrics

### Example Report

```
Test Suites: 4 passed, 4 total
Tests:       180 passed, 180 total
Snapshots:   0 total
Time:        45.123 s
Coverage:    92.5% Statements
             88.3% Branches
             95.2% Functions
             91.8% Lines
```

---

## Best Practices

### Test Organization

1. **Arrange-Act-Assert:** Use AAA pattern consistently
2. **Descriptive Names:** Use clear, descriptive test names
3. **Single Responsibility:** Each test should verify one behavior
4. **Independence:** Tests should not depend on each other
5. **Cleanup:** Always clean up resources in afterEach/afterAll

### Mocking Strategy

1. **Mock External Dependencies:** ZeroDB API, network calls
2. **Use Real MongoDB:** In-memory MongoDB for integration tests
3. **Mock Time:** Use fake timers for time-dependent tests
4. **Verify Mock Calls:** Assert mocks were called correctly

### Performance Considerations

1. **Parallel Execution:** Run independent tests in parallel
2. **Resource Cleanup:** Properly dispose of resources
3. **Minimal Setup:** Only set up what's needed for each test
4. **Fast Feedback:** Keep unit tests fast (< 100ms per test)

---

## Troubleshooting Guide

### Test Failures

| Error | Cause | Solution |
|-------|-------|----------|
| Timeout | Test takes too long | Increase jest timeout or optimize test |
| Connection refused | MongoDB not started | Ensure MongoMemoryServer is running |
| Mock not called | Event not emitted | Verify event emission and mock setup |
| Memory leak | Resources not cleaned | Add cleanup in afterEach |
| Flaky test | Race condition | Add proper wait conditions |

### Performance Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Slow tests | Too much setup | Use beforeAll for shared setup |
| High memory | Not cleaning up | Clear collections and close connections |
| Test pollution | Shared state | Ensure proper test isolation |

---

## Future Enhancements

### Planned Test Additions

1. **Chaos Engineering Tests:**
   - Random failure injection
   - Network partition simulation
   - Resource exhaustion scenarios

2. **Load Testing:**
   - Sustained high-volume sync
   - Stress testing with 10,000+ records
   - Concurrent multi-collection sync

3. **Security Testing:**
   - Authentication failure handling
   - Authorization checks
   - Data sanitization

4. **Compatibility Testing:**
   - Different MongoDB versions
   - Different Node.js versions
   - Various ZeroDB API versions

---

## References

- [Jest Documentation](https://jestjs.io/)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)
- [MongoDB Change Streams](https://docs.mongodb.com/manual/changeStreams/)
- [Testing Best Practices](https://testingjavascript.com/)
- [Mutation Testing](https://stryker-mutator.io/)

---

## Appendix: Test Commands Quick Reference

```bash
# Run all tests
npm test

# Run unit tests only
npm test -- tests/unit/

# Run integration tests only
npm test -- tests/integration/

# Run with coverage
npm test -- --coverage

# Run specific file
npm test -- tests/unit/services/syncOrchestrator.test.js

# Run in watch mode
npm test -- --watch

# Run with debug output
DEBUG=sync:* npm test

# Update snapshots
npm test -- -u

# Run tests matching pattern
npm test -- --testNamePattern="should sync"

# Generate coverage report
npm test -- --coverage --coverageReporters=html

# Run mutation tests
npx stryker run
```

---

**Document Version:** 1.0
**Last Updated:** 2024-02-02
**Author:** OpenCap Development Team
**Related Issue:** #14 - Continuous Sync Implementation

# Continuous Sync Testing - Quick Reference Card

## Most Common Commands

```bash
# Run all tests
npm test

# Run unit tests only
npm test -- tests/unit/services/

# Run integration tests only
npm test -- tests/integration/continuousSync.test.js

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- tests/unit/services/syncOrchestrator.test.js

# Watch mode
npm test -- --watch

# Debug mode
DEBUG=sync:* npm test
```

---

## Test File Locations

```
tests/
├── unit/
│   └── services/
│       ├── mongoChangeStreamListener.test.js  (50+ tests)
│       ├── zerodbSyncService.test.js          (60+ tests)
│       └── syncOrchestrator.test.js           (50+ tests)
└── integration/
    └── continuousSync.test.js                 (20+ tests)
```

---

## Quick Test Patterns

### Run Specific Test Suite

```bash
npm test -- --testNamePattern="Initialization"
npm test -- --testNamePattern="Error Handling"
npm test -- --testNamePattern="Batch Processing"
```

### Coverage for Specific File

```bash
npm test -- tests/unit/services/syncOrchestrator.test.js --coverage
```

### Performance Tests

```bash
npm test -- --testNamePattern="Performance Benchmarks"
npm test -- --testNamePattern="High Volume"
```

---

## Coverage Thresholds

| Metric | Requirement |
|--------|------------|
| Statements | > 80% |
| Branches | > 75% |
| Functions | > 85% |
| Lines | > 80% |

---

## Test Structure

All tests follow AAA pattern:

```javascript
it('should do something', async () => {
  // Arrange - Set up test data
  const input = { /* ... */ };

  // Act - Execute the function
  const result = await service.method(input);

  // Assert - Verify the result
  expect(result).toBe(expected);
});
```

---

## Common Mock Patterns

### Mock ZeroDB Service

```javascript
zerodbService.insertRow.mockResolvedValue({ success: true });
zerodbService.updateRows.mockResolvedValue({ success: true });
zerodbService.deleteRows.mockResolvedValue({ success: true });
```

### Mock Change Stream Event

```javascript
const changeEvent = {
  operationType: 'insert',
  ns: { db: 'opencap', coll: 'users' },
  documentKey: { _id: 'user-123' },
  fullDocument: { _id: 'user-123', name: 'Test User' }
};
```

---

## Debugging

### Enable Debug Logs

```bash
DEBUG=sync:* npm test
DEBUG=mongodb:* npm test
DEBUG=* npm test
```

### Run with Node Inspector

```bash
node --inspect-brk ./node_modules/.bin/jest --runInBand tests/unit/services/syncOrchestrator.test.js
```

### Increase Timeout

```bash
npm test -- --testTimeout=30000
```

---

## CI/CD Integration

Tests run automatically on:
- Push to any branch
- Pull requests to main/develop
- Manual workflow dispatch

Quality gates:
- All tests must pass
- Coverage > 80%
- No memory leaks
- Performance within limits

---

## Test Metrics

| Metric | Value |
|--------|-------|
| Total Test Files | 4 |
| Total Test Cases | 180+ |
| Test Execution Time | ~45s |
| Expected Coverage | 92%+ |
| Mutation Score | 82%+ |

---

## Performance Targets

| Metric | Target | Achieved |
|--------|--------|----------|
| Throughput | > 100 ops/sec | ~150 ops/sec |
| Latency | < 500ms | ~120ms |
| Volume | 1000 records < 10s | ~6.5s |
| Memory | < 200MB | ~150MB |

---

## Troubleshooting

### Timeout Issues
```bash
npm test -- --testTimeout=30000
```

### MongoDB Memory Server Issues
```bash
rm -rf ~/.cache/mongodb-memory-server
npm test
```

### Clear Jest Cache
```bash
npm test -- --clearCache
```

### Run Tests in Serial
```bash
npm test -- --runInBand
```

---

## Mutation Testing

```bash
# Install mutation testing
npm install --save-dev @stryker-mutator/core @stryker-mutator/jest-runner

# Run mutation tests
npx stryker run

# View results
open reports/mutation/index.html
```

---

## Documentation

- **Full Documentation:** `docs/testing/continuous-sync-test-documentation.md`
- **Execution Guide:** `docs/testing/test-execution-guide.md`
- **Summary:** `docs/testing/continuous-sync-test-summary.md`

---

## Support

For issues or questions:
1. Check documentation in `docs/testing/`
2. Review test files for examples
3. Check GitHub Issues for known problems
4. Contact OpenCap development team

---

**Quick Links:**
- [Jest Docs](https://jestjs.io/)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)
- [Stryker Mutator](https://stryker-mutator.io/)

**Last Updated:** 2024-02-02

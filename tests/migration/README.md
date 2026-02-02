# MongoDB Removal Test Suite

## Quick Start

This test suite validates the MongoDB to ZeroDB migration for Issue #32.

### Prerequisites

```bash
npm install
```

### Run Tests in Order

```bash
# 1. Pre-Migration (BEFORE removing MongoDB)
npm test tests/migration/pre-migration/

# 2. Migration Validation (DURING migration)
npm test tests/migration/mongodb-to-zerodb.test.js

# 3. Post-Migration (AFTER removing MongoDB)
npm test tests/migration/post-migration/
npm test tests/migration/regression/
npm test tests/migration/integration/
npm test tests/migration/performance/
```

### Generate Coverage

```bash
npm run test:coverage -- tests/migration/
```

## Test Suite Structure

```
migration/
├── pre-migration/          # Baseline tests (run BEFORE removal)
├── mongodb-to-zerodb.test.js   # Migration validation
├── post-migration/         # ZeroDB-only tests (run AFTER removal)
├── regression/             # Feature parity tests
├── integration/            # API endpoint tests
└── performance/            # Performance comparison
```

## Coverage Requirements

- Database Adapter: 90%+
- ZeroDB Service: 90%+
- Migration Scripts: 100%
- Overall: 90%+

## Documentation

- **Test Guide**: `/docs/testing/mongodb-removal-test-guide.md`
- **Test Summary**: `/docs/testing/mongodb-removal-test-summary.md`

## Test Statistics

- **Total Tests**: 240+
- **Test Files**: 6
- **Lines of Code**: 3,750+
- **Components Covered**: 15+

## Critical Tests

### Must Pass Before MongoDB Removal
- ✓ Pre-migration baseline tests
- ✓ Migration validation tests
- ✓ 90%+ coverage achieved

### Must Pass After MongoDB Removal
- ✓ Post-migration ZeroDB-only tests
- ✓ Feature parity regression tests
- ✓ API integration tests
- ✓ Performance benchmarks acceptable

## Support

- **Documentation**: See `/docs/testing/`
- **Issues**: GitHub Issue #32
- **Branch**: `feature/issue-32-mongodb-removal-tests`

# MongoDB Connection Tests Documentation

## Overview

This document describes the testing approach for the MongoDB connection utility in the OpenCap project. These tests are designed to meet the Semantic Seed Venture Studio Coding Standards requirements for test coverage:

- Statement coverage: 80% minimum
- Branch coverage: 70% minimum
- Line coverage: 80% minimum
- Function coverage: 80% minimum

## Current Coverage Status

As of the latest test run, the MongoDB connection utility test coverage is:

- **Statement coverage**: 85.29% ✅
- **Branch coverage**: 75.8% ✅
- **Line coverage**: 85% ✅
- **Function coverage**: 100% ✅

## Test Architecture

The MongoDB connection tests are organized into several focused test files:

### 1. `mongoDbConnection.organized.test.js`

The primary test file that leverages isolation and mocking to test all aspects of the MongoDB connection utility. This file is structured around function groups:

- **Public API** - Tests that verify the exported functions and objects
- **MongoDB URI Generation** - Tests the connection string builder functionality
- **Operation Retry Mechanism** - Tests the retry logic for transient errors
- **Connection Management** - Tests connection establishment and state handling
- **Disconnection** - Tests closing connections properly
- **Utility Functions** - Tests for helper functions like `cleanupCollection`, `runCommand`, etc.

### 2. `mongoDbConnection.test.js`

Basic tests that verify the existence and functionality of core methods without extensive mocking.

### 3. `mongoDbConnection.retry.test.js`

Focused tests for the retry mechanisms, ensuring they handle various error conditions correctly.

## Testing Approach

### Isolation Testing

We use Jest's `isolateModules` to create isolated testing environments for each test. This allows us to:

1. Mock Mongoose independently for each test
2. Reset module state between tests
3. Test specific edge cases without interference

### Coverage Focus

The tests specifically target:

1. **Connection string generation** - All variations of URI formatting
2. **Connection retry logic** - Exponential backoff, error classification, retry limits
3. **Transaction retry logic** - Handling different MongoDB error types
4. **Error handling** - Proper error propagation and recovery
5. **Edge cases** - Boundary conditions like zero/negative retry counts

### Mock Strategy

We use several mocking strategies:

1. **Direct module mocking** - For Mongoose to avoid actual database connections
2. **Function spying** - To verify call counts and parameters
3. **Mock implementations** - To simulate different error conditions
4. **Console spying** - To verify proper error logging

## Running the Tests

To run the MongoDB connection tests:

```bash
npm test -- __tests__/mongoDbConnection.organized.test.js
```

For a complete coverage report:

```bash
npm test -- __tests__/mongoDbConnection*
```

## Troubleshooting

### Common Issues

1. **Missing Docker containers**

   If tests fail due to missing containers, run:
   ```bash
   docker-compose -f docker-compose.test.yml up -d
   ```

2. **Connection timeouts**

   Tests might fail if MongoDB takes too long to respond. Ensure MongoDB is running and accessible:
   ```bash
   docker ps | grep mongodb
   ```

3. **Test interference**

   If tests interfere with each other, run them with `--runInBand` to execute sequentially:
   ```bash
   npm test -- --runInBand __tests__/mongoDbConnection.organized.test.js
   ```

## Maintenance

When the MongoDB connection utility is updated:

1. Check if new code paths require additional tests
2. Update tests if the function signatures or behavior changes
3. Re-run the coverage report to ensure it still meets the minimum thresholds

## References

- [Jest Testing Framework](https://jestjs.io/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [MongoDB Node.js Driver](https://mongodb.github.io/node-mongodb-native/)
- [Semantic Seed Venture Studio Coding Standards](../docs/coding-standards.md)

# Continuous Sync Test Execution Guide

## Quick Start

### Prerequisites

```bash
# Install dependencies
npm install

# Install mutation testing framework (optional)
npm install --save-dev @stryker-mutator/core @stryker-mutator/jest-runner @stryker-mutator/javascript-mutator
```

### Run All Tests

```bash
npm test
```

---

## Unit Tests

### Run All Unit Tests

```bash
npm test -- tests/unit/services/
```

### Run Individual Unit Test Files

```bash
# MongoDB Change Stream Listener tests
npm test -- tests/unit/services/mongoChangeStreamListener.test.js

# ZeroDB Sync Service tests
npm test -- tests/unit/services/zerodbSyncService.test.js

# Sync Orchestrator tests
npm test -- tests/unit/services/syncOrchestrator.test.js
```

### Run Specific Test Suites

```bash
# Run only initialization tests
npm test -- --testNamePattern="Initialization"

# Run only error handling tests
npm test -- --testNamePattern="Error Handling"

# Run only batch processing tests
npm test -- --testNamePattern="Batch Processing"
```

---

## Integration Tests

### Run All Integration Tests

```bash
npm test -- tests/integration/continuousSync.test.js
```

### Run Specific Integration Scenarios

```bash
# End-to-end insert sync
npm test -- --testNamePattern="End-to-End Insert Sync"

# Conflict resolution
npm test -- --testNamePattern="Conflict Resolution"

# High volume stress test
npm test -- --testNamePattern="High Volume Stress Test"

# Performance benchmarks
npm test -- --testNamePattern="Performance Benchmarks"
```

---

## Coverage Analysis

### Generate Coverage Report

```bash
# Run tests with coverage
npm test -- --coverage

# Generate HTML coverage report
npm test -- --coverage --coverageReporters=html

# Open coverage report in browser
open coverage/lcov-report/index.html
```

### Coverage for Specific Files

```bash
# Coverage for mongoChangeStreamListener
npm test -- tests/unit/services/mongoChangeStreamListener.test.js --coverage --collectCoverageFrom='services/mongoChangeStreamListener.js'

# Coverage for zerodbSyncService
npm test -- tests/unit/services/zerodbSyncService.test.js --coverage --collectCoverageFrom='services/zerodbSyncService.js'

# Coverage for syncOrchestrator
npm test -- tests/unit/services/syncOrchestrator.test.js --coverage --collectCoverageFrom='services/syncOrchestrator.js'
```

### Enforce Coverage Thresholds

```bash
# Fail if coverage is below thresholds
npm test -- --coverage --coverageThreshold='{"global":{"statements":80,"branches":75,"functions":85,"lines":80}}'
```

---

## Mutation Testing

### Run Mutation Tests

```bash
# Run mutation testing on all sync services
npx stryker run

# Run mutation testing with specific configuration
npx stryker run --mutate 'services/mongoChangeStreamListener.js'

# Generate mutation report
npx stryker run --reporters html,clear-text
```

### View Mutation Report

```bash
# Open HTML mutation report
open reports/mutation/index.html
```

### Mutation Testing for Specific Services

```bash
# Mutate only mongoChangeStreamListener
npx stryker run --mutate 'services/mongoChangeStreamListener.js'

# Mutate only zerodbSyncService
npx stryker run --mutate 'services/zerodbSyncService.js'

# Mutate only syncOrchestrator
npx stryker run --mutate 'services/syncOrchestrator.js'
```

---

## Performance Testing

### Run Performance Benchmarks

```bash
# Run integration tests with performance benchmarks
npm test -- tests/integration/continuousSync.test.js --testNamePattern="Performance Benchmarks"

# Run high-volume stress tests
npm test -- tests/integration/continuousSync.test.js --testNamePattern="High Volume"
```

### Profile Test Execution

```bash
# Run tests with Node.js profiler
node --prof ./node_modules/.bin/jest tests/integration/continuousSync.test.js

# Process profiler output
node --prof-process isolate-*.log > profile.txt

# View profile results
cat profile.txt
```

---

## Watch Mode

### Run Tests in Watch Mode

```bash
# Watch all tests
npm test -- --watch

# Watch specific test file
npm test -- tests/unit/services/syncOrchestrator.test.js --watch

# Watch with coverage
npm test -- --watch --coverage
```

### Watch Mode Options

```bash
# Press 'a' to run all tests
# Press 'f' to run only failed tests
# Press 'p' to filter by filename pattern
# Press 't' to filter by test name pattern
# Press 'q' to quit watch mode
```

---

## Debug Mode

### Debug Tests in VS Code

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Jest Debug All",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Jest Debug Current File",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["${fileBasename}", "--runInBand"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "cwd": "${workspaceFolder}"
    }
  ]
}
```

### Debug with Node Inspector

```bash
# Run tests with Node inspector
node --inspect-brk ./node_modules/.bin/jest --runInBand tests/unit/services/syncOrchestrator.test.js

# Open Chrome DevTools
# Navigate to chrome://inspect
# Click "Inspect" on the target
```

### Enable Debug Logging

```bash
# Enable debug logs for sync services
DEBUG=sync:* npm test

# Enable MongoDB debug logs
DEBUG=mongodb:* npm test

# Enable all debug logs
DEBUG=* npm test

# Set log level
LOG_LEVEL=debug npm test
```

---

## Continuous Integration

### GitHub Actions Workflow

Create `.github/workflows/sync-tests.yml`:

```yaml
name: Continuous Sync Tests

on:
  push:
    branches: [main, develop, feature/*]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [16.x, 18.x, 20.x]

    steps:
      - uses: actions/checkout@v3

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test -- tests/unit/services/

      - name: Run integration tests
        run: npm test -- tests/integration/continuousSync.test.js

      - name: Generate coverage
        run: npm test -- --coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: continuous-sync
          name: sync-coverage

      - name: Run mutation tests
        run: npx stryker run
        if: matrix.node-version == '18.x'

      - name: Archive test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: |
            coverage/
            reports/
```

### GitLab CI Configuration

Create `.gitlab-ci.yml`:

```yaml
stages:
  - test
  - coverage
  - mutation

test:unit:
  stage: test
  image: node:18
  script:
    - npm ci
    - npm test -- tests/unit/services/
  coverage: '/Statements\s*:\s*(\d+\.\d+)%/'

test:integration:
  stage: test
  image: node:18
  script:
    - npm ci
    - npm test -- tests/integration/continuousSync.test.js
  timeout: 15 minutes

coverage:
  stage: coverage
  image: node:18
  script:
    - npm ci
    - npm test -- --coverage
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

mutation:
  stage: mutation
  image: node:18
  script:
    - npm ci
    - npm install --save-dev @stryker-mutator/core @stryker-mutator/jest-runner
    - npx stryker run
  artifacts:
    paths:
      - reports/mutation/
  only:
    - main
    - develop
```

---

## Test Data Management

### Reset Test Database

```bash
# Clear MongoDB memory server cache
rm -rf ~/.cache/mongodb-memory-server

# Restart tests
npm test
```

### Generate Test Fixtures

```bash
# Create test data generator script
node scripts/generateTestData.js

# Run tests with generated fixtures
npm test -- --setupFilesAfterEnv=tests/fixtures/setup.js
```

---

## Troubleshooting

### Common Issues

#### 1. Timeout Errors

```bash
# Increase Jest timeout globally
npm test -- --testTimeout=30000

# Or set in individual test files:
# jest.setTimeout(30000);
```

#### 2. MongoDB Memory Server Issues

```bash
# Clear cache
rm -rf ~/.cache/mongodb-memory-server

# Reinstall
npm install --save-dev mongodb-memory-server

# Run with debug logs
DEBUG=mongodb-memory-server:* npm test
```

#### 3. Mock Issues

```javascript
// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

// Reset module registry
beforeEach(() => {
  jest.resetModules();
});
```

#### 4. Memory Leaks

```bash
# Run tests with memory leak detection
node --expose-gc ./node_modules/.bin/jest --logHeapUsage --runInBand

# Profile memory usage
node --inspect ./node_modules/.bin/jest --runInBand
```

#### 5. Flaky Tests

```bash
# Run tests multiple times to identify flakes
npm test -- --testNamePattern="suspected flaky test" --runInBand --verbose

# Run with random seed
npm test -- --randomize
```

---

## Test Maintenance

### Update Test Snapshots

```bash
# Update all snapshots
npm test -- -u

# Update snapshots for specific file
npm test -- tests/unit/services/syncOrchestrator.test.js -u

# Review snapshot changes
git diff tests/**/__snapshots__
```

### Verify Test Isolation

```bash
# Run tests in random order
npm test -- --randomize

# Run tests in serial (no parallelization)
npm test -- --runInBand

# Run each test file separately
npm test -- --maxWorkers=1
```

### Check Test Quality

```bash
# List all test names
npm test -- --listTests

# Show test structure
npm test -- --verbose

# Detect only/skip in tests
grep -r "describe.only\|it.only\|test.only" tests/
grep -r "describe.skip\|it.skip\|test.skip" tests/
```

---

## Performance Optimization

### Parallel Test Execution

```bash
# Run tests in parallel (default)
npm test

# Specify number of workers
npm test -- --maxWorkers=4

# Use 50% of available CPUs
npm test -- --maxWorkers=50%
```

### Cache Management

```bash
# Clear Jest cache
npm test -- --clearCache

# Run without cache
npm test -- --no-cache
```

### Faster Test Execution

```bash
# Only run tests related to changed files
npm test -- --onlyChanged

# Run tests since last commit
npm test -- --changedSince=HEAD

# Bail after first failure
npm test -- --bail
```

---

## Reporting

### Generate Test Report

```bash
# Generate JSON report
npm test -- --json --outputFile=test-results.json

# Generate JUnit XML report
npm test -- --reporters=jest-junit

# Generate custom report
npm test -- --reporters=./customReporter.js
```

### View Coverage Report

```bash
# Generate and open HTML report
npm test -- --coverage && open coverage/lcov-report/index.html

# Generate coverage badge
npm install --save-dev coverage-badge-creator
npx coverage-badge-creator
```

---

## Advanced Testing

### Test with Different Node Versions

```bash
# Using nvm
nvm use 16 && npm test
nvm use 18 && npm test
nvm use 20 && npm test

# Using Docker
docker run -v $(pwd):/app -w /app node:16 npm test
docker run -v $(pwd):/app -w /app node:18 npm test
docker run -v $(pwd):/app -w /app node:20 npm test
```

### Test with Different MongoDB Versions

```javascript
// In test setup
const { MongoMemoryServer } = require('mongodb-memory-server');

const mongoServer = await MongoMemoryServer.create({
  binary: {
    version: '5.0.0' // Specify MongoDB version
  }
});
```

### Load Testing

```bash
# Run integration tests with high concurrency
npm test -- tests/integration/continuousSync.test.js --testNamePattern="High Volume"

# Continuous load test
for i in {1..10}; do npm test -- tests/integration/continuousSync.test.js; done
```

---

## Documentation

### Generate Test Documentation

```bash
# Generate JSDoc from test comments
npx jsdoc tests/ -d docs/test-jsdoc

# Generate test coverage badge
npx coverage-badge-creator --output-path docs/badges/coverage.svg

# Extract test scenarios
grep -r "describe\|it" tests/ > docs/test-scenarios.txt
```

---

## Resources

- [Jest CLI Options](https://jestjs.io/docs/cli)
- [Stryker Mutator](https://stryker-mutator.io/)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)
- [Testing Best Practices](https://testingjavascript.com/)

---

**Last Updated:** 2024-02-02
**Maintainer:** OpenCap Development Team
**Related:** continuous-sync-test-documentation.md

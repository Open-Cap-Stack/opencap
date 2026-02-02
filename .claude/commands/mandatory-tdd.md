---
description: Test-Driven Development with BDD-style tests and mandatory test execution
---

# Mandatory TDD

## ZERO TOLERANCE: Tests Must Be Executed

Before ANY commit, PR, or issue closure:

1. **ACTUALLY RUN THE TESTS** - Execute with coverage
2. **VERIFY THEY PASS** - Confirm green status
3. **CHECK COVERAGE** - Minimum 80% required
4. **INCLUDE OUTPUT** - Paste actual test output

## FORBIDDEN

- Writing tests but NOT running them
- Claiming "tests passing" without proof
- Stating "80%+ coverage" without report
- Closing issues without test execution

## TDD Workflow

### 1. Red (Write failing tests first)
```bash
# Commit: "WIP: red tests for {story}"
python3 -m pytest tests/test_feature.py -v
# Expect: FAILED
```

### 2. Green (Minimal code to pass)
```bash
# Commit: "green: {behavior}"
python3 -m pytest tests/test_feature.py -v
# Expect: PASSED
```

### 3. Refactor (Improve with tests green)
```bash
# Commit: "refactor: {area}"
python3 -m pytest tests/test_feature.py -v --cov=app.module --cov-report=term-missing
# Expect: PASSED, Coverage >= 80%
```

## Test Style

Use BDD style (`describe/it`) for all tests:

```python
class DescribeUserService:
    class DescribeCreateUser:
        def it_creates_user_with_valid_data(self):
            # test implementation

        def it_raises_error_for_invalid_email(self):
            # test implementation
```

## Running Tests

```bash
cd src/backend
python3 -m pytest tests/test_your_feature.py -v --cov=app.your.module --cov-report=term-missing
```

Invoke this skill when writing code, fixing bugs, or preparing PRs.

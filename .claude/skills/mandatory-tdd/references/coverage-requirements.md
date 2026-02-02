# Coverage Requirements

## Backend (pytest)

**Configuration (pytest.ini or pyproject.toml):**
```ini
[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts =
    --cov=app
    --cov-report=term-missing
    --cov-report=html
    --cov-fail-under=80
```

**Running with Coverage:**
```bash
# Single module with coverage
pytest tests/test_module.py -v --cov=app.module --cov-report=term-missing

# All tests with coverage
pytest -v --cov=app --cov-report=term-missing --cov-report=html

# Coverage thresholds
pytest --cov=app --cov-fail-under=80
```

**Exclusions (for generated/boilerplate code):**
```python
# In .coveragerc
[run]
omit =
    */tests/*
    */migrations/*
    */__init__.py
    */config.py
    */settings.py

[report]
exclude_lines =
    pragma: no cover
    def __repr__
    raise AssertionError
    raise NotImplementedError
    if __name__ == .__main__.:
    if TYPE_CHECKING:
```

**Thresholds:**
* **Minimum:** 80% overall coverage
* **Target:** 90%+ for new code
* **Critical paths:** 100% coverage (auth, payments, security)

## Frontend (Jest/npm)

**Configuration (package.json or jest.config.js):**
```json
{
  "jest": {
    "collectCoverageFrom": [
      "src/**/*.{js,jsx,ts,tsx}",
      "!src/**/*.d.ts",
      "!src/index.tsx",
      "!src/reportWebVitals.ts"
    ],
    "coverageThresholds": {
      "global": {
        "statements": 80,
        "branches": 80,
        "functions": 80,
        "lines": 80
      }
    }
  }
}
```

**Running with Coverage:**
```bash
# All tests with coverage
npm test -- --coverage

# Watch mode with coverage
npm test -- --coverage --watch

# Coverage report in browser
npm test -- --coverage && open coverage/lcov-report/index.html
```

**Exclusions:**
```js
// In jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/*.test.{js,jsx,ts,tsx}',
  ],
};
```

**Thresholds:**
* **Statements:** 80%+
* **Branches:** 80%+
* **Functions:** 80%+
* **Lines:** 80%+

## Coverage Report Interpretation

**Understanding Coverage Output:**

```
Name                        Stmts   Miss  Cover   Missing
---------------------------------------------------------
app/api/endpoints.py          250     25    90%   45-47, 89-92
app/services/user.py          180     36    80%   125-135, 201-205
app/models/user.py            120      0   100%
---------------------------------------------------------
TOTAL                         550     61    89%
```

* **Stmts:** Total statements in file
* **Miss:** Number of statements not executed
* **Cover:** Percentage covered
* **Missing:** Line numbers not covered

**What to Focus On:**
* Lines marked as "Missing" should have tests added
* 100% coverage for critical security/payment code
* Focus on branches (if/else) not just line coverage
* Aim for meaningful tests, not just coverage numbers

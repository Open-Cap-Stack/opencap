# Database Cleanup & Validation Tools

**Phase 6**: Issues #32, #33, #34 - MongoDB, Neo4j, PostgreSQL Removal

This directory contains automated tools for validating and cleaning up the ZeroDB migration.

---

## Tools Overview

### 1. cleanup-old-db-references.js

**Purpose**: Automatically detect and report old database references across the codebase.

**Location**: `/scripts/cleanup-old-db-references.js`

**Features**:
- Scans all JavaScript files for MongoDB, Neo4j, and PostgreSQL references
- Detects unused imports and dead code
- Identifies environment variable issues
- Checks Docker and deployment configurations
- Generates detailed cleanup report

**Usage**:

```bash
# Scan only (no changes)
node scripts/cleanup-old-db-references.js --report-only

# Scan and show what would be fixed
node scripts/cleanup-old-db-references.js

# Scan and automatically fix safe issues
node scripts/cleanup-old-db-references.js --fix
```

**Output**:
- Console report with statistics
- Detailed Markdown report: `/docs/DATABASE_CLEANUP_REPORT.md`

**What It Detects**:
- MongoDB/Mongoose references (411 found)
- Neo4j references (14 found)
- PostgreSQL references (13 found)
- Dead code files (4 found)
- Unused imports (43 found)
- TODO/FIXME comments (25 found)

---

### 2. validate-zerodb-migration.js

**Purpose**: Comprehensive validation that ZeroDB migration is complete and correct.

**Location**: `/scripts/validate-zerodb-migration.js`

**Features**:
- Validates code migration completeness
- Checks schema definitions
- Validates deployment configurations
- Tests data integrity (optional)
- Generates validation report

**Usage**:

```bash
# Standard validation
node scripts/validate-zerodb-migration.js

# Full validation with all checks
node scripts/validate-zerodb-migration.js --full

# Include data integrity checks (requires ZeroDB connection)
node scripts/validate-zerodb-migration.js --check-data
```

**Output**:
- Console validation report
- Detailed Markdown report: `/docs/ZERODB_MIGRATION_VALIDATION_REPORT.md`

**Validation Categories**:

1. **Code Migration** (2/68 passed)
   - ❌ Mongoose models still present (33 files)
   - ❌ Controllers not migrated (31 files)
   - ❌ MongoDB connection code exists (3 files)
   - ✅ ZeroDB services exist
   - ✅ Database adapter configured

2. **Schema Validation** (4/4 passed)
   - ✅ Expected tables defined
   - ✅ Table schemas proper
   - ✅ Indexes created
   - ✅ Vector search configured

3. **Deployment Validation** (0/4 passed)
   - ❌ Old dependencies in package.json
   - ❌ MongoDB in Docker configs
   - ❌ Old environment variables
   - ❌ Tests still use MongoDB

---

## Generated Reports

### 1. DATABASE_CLEANUP_REPORT.md

**Location**: `/docs/DATABASE_CLEANUP_REPORT.md`

**Contents**:
- Summary statistics
- MongoDB references by file
- Neo4j references by file
- PostgreSQL references by file
- Dead code items
- Recommendations
- Next steps checklist

**Sample Output**:
```markdown
# Database Cleanup Report

Generated: 2026-02-02T08:49:01.690Z

## Summary
- **Files Scanned**: 255
- **Issues Found**: 432
- **Issues Fixed**: 0

## Issues by Category

### MongoDB References (411)
- `models/User.js` - Uses Mongoose
- `controllers/authController.js` - Imports Mongoose
- `package.json` - Contains mongodb dependencies
...
```

---

### 2. ZERODB_MIGRATION_VALIDATION_REPORT.md

**Location**: `/docs/ZERODB_MIGRATION_VALIDATION_REPORT.md`

**Contents**:
- Validation results by category
- Passed checks
- Failed checks with severity
- Warnings
- Migration checklist
- Next steps

**Sample Output**:
```markdown
# ZeroDB Migration Validation Report

**Generated**: 2026-02-02T08:49:20.045Z

## Code Migration

### ✅ Passed (2)
- ZeroDB Services Exist
- Database Adapter Configured

### ❌ Failed (68)
- No Mongoose Models Remaining (Severity: HIGH)
  - File: `models/User.js`
  - Issue: Still uses Mongoose
...
```

---

### 3. CODE_REVIEW_ISSUES_32-34.md

**Location**: `/docs/CODE_REVIEW_ISSUES_32-34.md`

**Contents**:
- Executive summary
- TDD assessment
- Code quality issues
- Security vulnerabilities
- Performance review
- Consistency checks
- Action plan with priorities
- Estimated effort

**Key Sections**:
1. Test failures analysis (180 failed)
2. Dead code identification
3. Security issues (hardcoded credentials, SQL injection)
4. Performance problems (N+1 queries)
5. Phased action plan (6-8 weeks)

---

### 4. SECURITY_REVIEW_PHASE6.md

**Location**: `/docs/SECURITY_REVIEW_PHASE6.md`

**Contents**:
- Critical vulnerabilities
- Authentication/authorization review
- Data protection assessment
- API security analysis
- Secrets management review
- Compliance requirements (SOC2, GDPR)

**Key Findings**:
- 🔴 2 hardcoded credentials (CRITICAL)
- 🟡 5 SQL injection risks (HIGH)
- 🟡 12 missing input validations (HIGH)
- ⚠️ Incomplete RBAC implementation

---

## Common Workflows

### Workflow 1: Initial Assessment

```bash
# Step 1: Run cleanup detection
node scripts/cleanup-old-db-references.js --report-only

# Step 2: Run migration validation
node scripts/validate-zerodb-migration.js

# Step 3: Review generated reports
cat docs/DATABASE_CLEANUP_REPORT.md
cat docs/ZERODB_MIGRATION_VALIDATION_REPORT.md
cat docs/CODE_REVIEW_ISSUES_32-34.md
cat docs/SECURITY_REVIEW_PHASE6.md
```

### Workflow 2: Incremental Cleanup

```bash
# Step 1: Fix one category (e.g., remove dead code)
rm db.js
rm db/mongoConnection.js
rm -rf init-scripts/mongo

# Step 2: Run cleanup tool to verify
node scripts/cleanup-old-db-references.js

# Step 3: Run tests
npm test

# Step 4: Commit if tests pass
git add .
git commit -m "chore: Remove MongoDB connection files (Issue #32)"
```

### Workflow 3: Pre-Merge Validation

```bash
# Full validation before merging
node scripts/validate-zerodb-migration.js --full

# Check exit code
if [ $? -eq 0 ]; then
  echo "✅ Validation passed - ready to merge"
else
  echo "❌ Validation failed - fix issues first"
fi
```

---

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Database Migration Validation

on:
  pull_request:
    branches: [main]

jobs:
  validate-migration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run cleanup detection
        run: node scripts/cleanup-old-db-references.js --report-only

      - name: Run migration validation
        run: node scripts/validate-zerodb-migration.js

      - name: Upload reports
        uses: actions/upload-artifact@v3
        with:
          name: migration-reports
          path: docs/*_REPORT.md
```

---

## Configuration

### Environment Variables

Both scripts respect these environment variables:

```bash
# Enable verbose logging
DEBUG=true

# Skip certain checks
SKIP_DOCKER_CHECK=true
SKIP_ENV_CHECK=true

# Custom paths
DOCS_PATH=./custom-docs
SCRIPTS_PATH=./custom-scripts
```

### Customization

Edit scripts to customize:

```javascript
// cleanup-old-db-references.js
this.patterns = {
  mongodb: [
    /mongoose\./g,
    /require\(['"]mongoose['"]\)/g,
    // Add custom patterns
  ]
};

// validate-zerodb-migration.js
this.expectedTables = [
  'users',
  'companies',
  // Add expected tables
];
```

---

## Troubleshooting

### Issue: "Permission denied"

```bash
# Make scripts executable
chmod +x scripts/cleanup-old-db-references.js
chmod +x scripts/validate-zerodb-migration.js
```

### Issue: "Cannot find module"

```bash
# Install dependencies
npm install
```

### Issue: Reports not generated

```bash
# Ensure docs directory exists
mkdir -p docs

# Check write permissions
ls -la docs/
```

### Issue: Too many files scanned

```bash
# Add exclusions to script
const excludeDirs = [
  'node_modules',
  'frontend',
  '.git',
  'coverage',
  'dist',
  'build',
  'custom-exclude-dir' // Add here
];
```

---

## Best Practices

### 1. Run Before Committing

Always run validation before committing:

```bash
npm test && \
node scripts/cleanup-old-db-references.js && \
node scripts/validate-zerodb-migration.js
```

### 2. Review Reports Regularly

Check reports weekly during migration:

```bash
# Create weekly report
node scripts/cleanup-old-db-references.js > weekly-report.txt
```

### 3. Track Progress

Use validation reports to track migration progress:

```bash
# Initial state
node scripts/validate-zerodb-migration.js | tee baseline-report.txt

# After changes
node scripts/validate-zerodb-migration.js | tee progress-report.txt

# Compare
diff baseline-report.txt progress-report.txt
```

### 4. Automate in CI

Add to CI pipeline to prevent regressions:

```yaml
# .github/workflows/validation.yml
- name: Validate no MongoDB references
  run: |
    OUTPUT=$(node scripts/cleanup-old-db-references.js)
    if echo "$OUTPUT" | grep -q "MongoDB References: 0"; then
      echo "✅ No MongoDB references found"
    else
      echo "❌ MongoDB references still exist"
      exit 1
    fi
```

---

## Migration Progress Tracking

### Phase 6 Checklist

Use this checklist with validation tools:

**Issue #32: Remove MongoDB Dependencies**
- [ ] Remove from package.json (`cleanup-old-db-references.js`)
- [ ] Delete Mongoose models (`validate-zerodb-migration.js`)
- [ ] Remove MongoDB connection files (manual)
- [ ] Update all imports (`cleanup-old-db-references.js --fix`)
- [ ] Remove MongoDB from tests (`validate-zerodb-migration.js`)

**Issue #33: Remove MongoDB from Docker**
- [ ] Remove MongoDB service from docker-compose.yml
- [ ] Remove MongoDB environment variables
- [ ] Delete MongoDB init scripts
- [ ] Update deployment documentation

**Issue #34: Remove Neo4j & PostgreSQL**
- [ ] Remove from package.json
- [ ] Delete GraphModels.js
- [ ] Delete Neo4j connection file
- [ ] Remove from Docker configs
- [ ] Update Kubernetes manifests

**Validation**
- [ ] All validation checks pass
- [ ] No old database references
- [ ] All tests pass
- [ ] Code review approved
- [ ] Security review passed

---

## Expected Timeline

Based on validation results:

| Phase | Tasks | Duration |
|-------|-------|----------|
| Assessment | Run all validation tools | 1 day |
| Critical Fixes | Hardcoded credentials, SQL injection | 2-3 days |
| Model Migration | Convert 33 Mongoose models | 2 weeks |
| Controller Updates | Update 31 controllers | 1 week |
| Test Migration | Fix 180 failing tests | 1 week |
| Dependency Cleanup | Remove old packages | 1 day |
| Docker Cleanup | Update configs | 1 day |
| Final Validation | Full test suite + review | 2-3 days |
| **Total** | | **5-6 weeks** |

---

## Support

### Questions?

1. Review the generated reports in `/docs`
2. Check the main code review: `docs/CODE_REVIEW_ISSUES_32-34.md`
3. Review security findings: `docs/SECURITY_REVIEW_PHASE6.md`

### Contributing

To improve these tools:

1. Fork the repository
2. Make changes to scripts
3. Test thoroughly
4. Submit pull request

### Reporting Issues

If you find bugs in the validation tools:

```bash
# Include this info in bug report
node --version
npm --version
node scripts/cleanup-old-db-references.js --version
```

---

**Last Updated**: February 2, 2026
**Maintained By**: Backend Architecture Team
**Related Issues**: #32, #33, #34

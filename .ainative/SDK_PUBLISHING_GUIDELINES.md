# SDK Publishing Guidelines

**Last Updated:** 2025-12-18
**Purpose:** Guidelines for publishing Python and TypeScript SDKs to package registries

---

## 🚨 CRITICAL RULES BEFORE PUBLISHING

### Pre-Publishing Checklist

**NEVER publish without completing ALL of these steps:**

- [ ] All tests passing (51/51 for Python SDK)
- [ ] Code coverage meets minimum requirements
- [ ] Version number bumped correctly in ALL files
- [ ] CHANGELOG.md updated with release notes
- [ ] README.md examples tested and working
- [ ] No secrets, API keys, or tokens in code
- [ ] Git repository clean (no uncommitted changes)
- [ ] Code pushed to GitHub with version tag
- [ ] Tested in fresh virtual environment
- [ ] Developer experience validated

**Publishing is PERMANENT on PyPI - you cannot delete packages!**

---

## Python SDK Publishing (PyPI)

### Package Information
- **Package Name:** `zerodb-mcp`
- **Registry:** https://pypi.org
- **Test Registry:** https://test.pypi.org
- **Location:** `/Users/aideveloper/core/sdks/python`

### Credentials
**Location:** `~/.pypirc` (local machine)

**Format:**
```ini
[distutils]
index-servers =
    pypi
    testpypi

[pypi]
username = __token__
password = pypi-[production-token]

[testpypi]
repository = https://test.pypi.org/legacy/
username = __token__
password = pypi-[test-token]
```

**Important:** Credentials are automatically loaded by `twine` from `~/.pypirc`

### Publishing Workflow

#### Step 1: Pre-Flight Testing
```bash
cd /Users/aideveloper/core/sdks/python

# Create fresh virtual environment
python3 -m venv venv
source venv/bin/activate

# Install with dev dependencies
pip install -e ".[dev]"

# Run full test suite
pytest tests/ -v --cov=zerodb_mcp --cov-report=term-missing

# Verify table operations specifically
pytest tests/test_tables.py -v --cov=zerodb_mcp/operations/tables.py

# Expected Results:
# - 51/51 tests passing
# - Table operations: 100% coverage
# - Overall coverage: 65%+
```

#### Step 2: Version Verification
Ensure version is bumped in ALL these files:
- `setup.py` (line 14): `version="1.0.1"`
- `zerodb_mcp/__init__.py`: `__version__ = "1.0.1"`
- `CHANGELOG.md`: New entry for v1.0.1

#### Step 3: Build Distribution Packages
```bash
# Clean previous builds
rm -rf dist/ build/ *.egg-info

# Install build tools
pip install --upgrade build twine

# Build wheel and source distribution
python -m build

# Expected output:
# dist/zerodb_mcp-1.0.1-py3-none-any.whl
# dist/zerodb-mcp-1.0.1.tar.gz

# Validate packages
twine check dist/*
# Expected: "Checking dist/... PASSED"
```

#### Step 4: Test on Test PyPI (RECOMMENDED)
```bash
# Upload to Test PyPI (safe sandbox)
twine upload --repository testpypi dist/*

# Wait 1-2 minutes for indexing

# Test installation from Test PyPI
python3 -m venv /tmp/test_pypi_env
source /tmp/test_pypi_env/bin/activate

pip install --index-url https://test.pypi.org/simple/ \
    --extra-index-url https://pypi.org/simple/ \
    zerodb-mcp==1.0.1

# Test import and table operations
python -c "
from zerodb_mcp import ZeroDBClient
client = ZeroDBClient(api_key='test')
assert hasattr(client, 'tables'), 'Missing tables'
assert hasattr(client.tables, 'create'), 'Missing create'
print('✅ Test PyPI installation successful')
"
```

#### Step 5: Production PyPI Upload
```bash
# FINAL CHECK: Are you sure?
# - All tests passing?
# - Tested on Test PyPI?
# - Version correct in all files?
# - CHANGELOG updated?

# Upload to Production PyPI (PERMANENT - NO UNDO)
twine upload dist/*

# Wait 1-2 minutes for indexing

# Verify live package
pip install --upgrade zerodb-mcp==1.0.1

python -c "
from zerodb_mcp import ZeroDBClient
print(f'✅ Version {ZeroDBClient.__version__ if hasattr(ZeroDBClient, \"__version__\") else \"unknown\"} installed')
"
```

#### Step 6: Post-Publishing
```bash
# Tag release in Git
git tag -a v1.0.1 -m "Release v1.0.1 - Table operations support"
git push origin v1.0.1

# Create GitHub Release
gh release create v1.0.1 --title "v1.0.1" --notes "See CHANGELOG.md"

# Update documentation
# - Update docs.ainative.studio with new examples
# - Announce on social media/changelog
```

### Common Issues

**Issue:** `twine: command not found`
**Solution:** `pip install twine`

**Issue:** `HTTPError: 403 Forbidden`
**Solution:** Check credentials in `~/.pypirc` are correct

**Issue:** `File already exists`
**Solution:** Version already published - bump version number

**Issue:** Tests failing
**Solution:** DO NOT PUBLISH - fix tests first!

---

## TypeScript SDK Publishing (NPM)

### Package Information
- **Package Name:** `@zerodb/mcp-client`
- **Registry:** https://npmjs.com
- **Location:** `/Users/aideveloper/core/sdks/typescript/zerodb-mcp-client`

### Credentials
**NPM Authentication:** Not yet configured

**Setup Required:**
```bash
# Method 1: Interactive login
npm login

# Method 2: Use auth token
npm config set //registry.npmjs.org/:_authToken=$NPM_TOKEN

# Verify authentication
npm whoami
```

### Publishing Workflow

#### Step 1: Pre-Flight Testing
```bash
cd /Users/aideveloper/core/sdks/typescript/zerodb-mcp-client

# Install dependencies
npm install

# Run tests
npm test

# Run linting
npm run lint

# Expected: All tests passing, no lint errors
```

#### Step 2: Build Distribution
```bash
# Clean previous builds
npm run clean

# Build TypeScript
npm run build

# Verify dist/ folder created with:
# - index.js
# - index.d.ts
# - All operation files
```

#### Step 3: Version Bump
```bash
# Bump version (updates package.json automatically)
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0

# Or manually edit package.json
```

#### Step 4: Publish to NPM
```bash
# Dry run first (shows what will be published)
npm publish --dry-run

# Publish to NPM (scoped package requires --access public)
npm publish --access public

# Verify published package
npm view @zerodb/mcp-client version
```

#### Step 5: Post-Publishing
```bash
# Tag and push to Git
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin v1.0.1

# Test installation
npm install @zerodb/mcp-client@1.0.1
```

---

## Version Numbering Guidelines

Follow **Semantic Versioning (SemVer)**: `MAJOR.MINOR.PATCH`

- **MAJOR** (1.0.0 → 2.0.0): Breaking API changes
- **MINOR** (1.0.0 → 1.1.0): New features, backward compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, backward compatible

**Examples:**
- Bug fix: 1.0.0 → 1.0.1
- New table operations feature: 1.0.0 → 1.1.0
- Breaking API change: 1.0.0 → 2.0.0

---

## Rollback Strategy

### PyPI (Python)
**Cannot delete packages from PyPI!**

Options:
1. **Yank release:** Hides from default searches but keeps downloadable
   - Via PyPI web interface: Manage → Releases → Yank
2. **Publish hotfix:** Release 1.0.2 with fixes immediately
3. **Add warning to README:** Document the issue

### NPM (TypeScript)
**Can unpublish within 72 hours** (discouraged)

```bash
# Unpublish specific version (within 72 hours)
npm unpublish @zerodb/mcp-client@1.0.1

# Deprecate version (preferred)
npm deprecate @zerodb/mcp-client@1.0.1 "Please upgrade to 1.0.2"
```

---

## Security Considerations

### Before Publishing
- [ ] No hardcoded API keys or secrets
- [ ] No `.env` files in package
- [ ] Check `.gitignore` and `.npmignore`
- [ ] Scan for sensitive data: `git grep -i "api.key\|secret\|password\|token"`

### After Publishing
- Monitor for security vulnerabilities
- Set up GitHub Dependabot alerts
- Regularly update dependencies

---

## Contact & Support

**For Publishing Issues:**
- PyPI Support: https://pypi.org/help/
- NPM Support: https://npmjs.com/support

**Internal Support:**
- Engineering Team: engineering@ainative.studio
- Documentation: `/docs` directory

---

**Remember:** Publishing is PERMANENT. Test thoroughly before publishing!

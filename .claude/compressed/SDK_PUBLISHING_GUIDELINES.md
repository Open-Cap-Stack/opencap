# SDK Publishing Guidelines

**Last Updated:** 2025-12-18
**Purpose:** Guidelines for Python/TypeScript SDK Publishing

## Pre-Publishing Checklist

**CRITICAL BEFORE PUBLISHING:**
- [ ] All tests passing
- [ ] Code coverage requirements met
- [ ] Version bumped in ALL files
- [ ] CHANGELOG.md updated
- [ ] README examples tested
- [ ] No secrets/tokens in code
- [ ] Git repo clean
- [ ] Code pushed with version tag
- [ ] Tested in fresh virtual env
- [ ] Dev experience validated

## Python SDK Publishing (PyPI)

### Package Info
- **Name:** `zerodb-mcp`
- **Registry:** https://pypi.org
- **Test Registry:** https://test.pypi.org
- **Location:** `/Users/aideveloper/core/sdks/python`

### Credentials
- **Location:** `~/.pypirc`
- **Loaded automatically by `twine`**

### Publishing Workflow

#### Step 1: Pre-Flight Testing
```bash
cd /Users/aideveloper/core/sdks/python
python3 -m venv venv
source venv/bin/activate
pip install -e ".[dev]"
pytest tests/ -v --cov=zerodb_mcp

# Expected:
# - 51/51 tests passing
# - 65%+ coverage
```

#### Step 2: Version Verification
Update version in:
- `setup.py`
- `zerodb_mcp/__init__.py`
- `CHANGELOG.md`

#### Step 3: Build Distribution
```bash
rm -rf dist/ build/
pip install --upgrade build twine
python -m build
twine check dist/*
```

#### Step 4: Test PyPI Upload
```bash
twine upload --repository testpypi dist/*
# Validate installation in test environment
```

#### Step 5: Production Upload
```bash
# FINAL CHECKS COMPLETED?
twine upload dist/*
```

#### Step 6: Post-Publishing
```bash
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin v1.0.1
gh release create v1.0.1
```

## TypeScript SDK Publishing (NPM)

### Package Info
- **Name:** `@zerodb/mcp-client`
- **Registry:** https://npmjs.com

### Publishing Workflow

#### Step 1: Pre-Flight Testing
```bash
npm install
npm test
npm run lint
```

#### Step 2: Build Distribution
```bash
npm run clean
npm run build
```

#### Step 3: Version Bump
```bash
npm version patch  # or minor/major
```

#### Step 4: NPM Publish
```bash
npm publish --access public
```

#### Step 5: Post-Publishing
```bash
git tag -a v1.0.1
git push origin v1.0.1
```

## Version Numbering (SemVer)

**Format:** `MAJOR.MINOR.PATCH`
- **MAJOR:** Breaking changes
- **MINOR:** New features
- **PATCH:** Bug fixes

## Rollback Strategy

### PyPI
- Yank release
- Publish hotfix
- Add README warning

### NPM
```bash
npm deprecate @zerodb/mcp-client@1.0.1 "Upgrade recommended"
```

## Security Considerations
- No hardcoded secrets
- Check `.gitignore`
- Monitor vulnerabilities
- Use Dependabot

## Support
- PyPI: https://pypi.org/help/
- NPM: https://npmjs.com/support
- Internal: engineering@ainative.studio

**PERMANENT PUBLISHING - TEST THOROUGHLY!**
# SDK Publishing Guidelines

## Pre-Publishing Checklist

**CRITICAL: Complete ALL steps before publishing:**
- [ ] All tests passing (51/51)
- [ ] Code coverage ≥ requirements
- [ ] Version bumped in ALL files
- [ ] CHANGELOG.md updated
- [ ] README.md examples working
- [ ] No secrets/tokens
- [ ] Git repo clean
- [ ] Code pushed w/ version tag
- [ ] Tested in fresh venv
- [ ] Dev experience validated

## Python SDK Publishing (PyPI)

### Package Info
- **Name:** `zerodb-mcp`
- **Registry:** https://pypi.org
- **Test Registry:** https://test.pypi.org
- **Location:** `/Users/aideveloper/core/sdks/python`

### Credentials
**Location:** `~/.pypirc`

### Publishing Workflow

#### Step 1: Pre-Flight Testing
```bash
cd /Users/aideveloper/core/sdks/python
python3 -m venv venv
source venv/bin/activate
pip install -e ".[dev]"
pytest tests/ -v --cov=zerodb_mcp
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
python3 -m venv /tmp/test_pypi_env
source /tmp/test_pypi_env/bin/activate
pip install --index-url https://test.pypi.org/simple/ zerodb-mcp==1.0.1
```

#### Step 5: Production Upload
```bash
twine upload dist/*
pip install --upgrade zerodb-mcp==1.0.1
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
npm view @zerodb/mcp-client version
```

#### Step 5: Post-Publishing
```bash
git tag -a v1.0.1
git push origin v1.0.1
```

## Version Numbering (SemVer)
- **MAJOR:** Breaking API changes
- **MINOR:** New features
- **PATCH:** Bug fixes

## Rollback Strategy

### PyPI
- Yank release
- Publish hotfix
- Add README warning

### NPM
```bash
npm unpublish @zerodb/mcp-client@1.0.1  # within 72h
npm deprecate @zerodb/mcp-client@1.0.1 "Upgrade to 1.0.2"
```

## Security Considerations
- No hardcoded secrets
- Check `.gitignore`
- Monitor vulnerabilities

**Remember:** Publishing is PERMANENT. Test thoroughly!
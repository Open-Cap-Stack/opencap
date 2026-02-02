# AINative Rules Enforcement Quick Guide

## 🚀 Quick Start

Run enforcement checks anytime:
```bash
./.ainative/enforce-rules.sh
```

Or run comprehensive check:
```bash
./scripts/check-rules.sh
```

## ✅ What Gets Checked

### Zero-Tolerance (Hard Failures)
- ❌ No third-party AI attributions (Claude, ChatGPT, Copilot, Anthropic, OpenAI)
- ❌ No `.md` files in root directory (except README.md)
- ❌ No `.sh` scripts in backend root (use `scripts/` folder)
- ❌ No exposed secrets or PII

### Warnings
- ⚠️ Code changes without test updates
- ⚠️ Non-standard commit message format
- ⚠️ Possible secrets in diff

## 📝 Commit Message Rules

### ❌ FORBIDDEN
```
Add feature X

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

### ✅ CORRECT (Option 1 - No attribution)
```
Add feature X

- Implement functionality
- Add tests
- Update documentation
```

### ✅ CORRECT (Option 2 - AINative branding)
```
Add feature X

- Implement functionality
- Add tests
- Update documentation

Built by AINative Dev Team
All Data Services Built on ZeroDB
```

## 📁 File Placement Rules

### ❌ WRONG
```
opencapstack/
├── FEATURE_GUIDE.md         ❌ Root directory
├── TEST_REPORT.md           ❌ Root directory
├── backend/
│   └── deploy.sh            ❌ Backend root
```

### ✅ CORRECT
```
opencapstack/
├── docs/
│   ├── guides/FEATURE_GUIDE.md    ✅ In docs/
│   └── testing/TEST_REPORT.md     ✅ In docs/
├── scripts/
│   └── deploy.sh                   ✅ In scripts/
```

## 🧪 Test Requirements

Every code change should include tests:

```bash
# Good commit includes both
git add src/feature.js
git add tests/test_feature.js
git commit -m "Add feature X with tests"
```

## 🔧 Bypassing (Emergency Only)

```bash
# Not recommended - only for emergencies
git commit --no-verify -m "Emergency fix"
```

## 📚 Full Documentation

See `/Users/aideveloper/opencapstack/docs/RULES_ENFORCEMENT.md` for complete guide.

## 🆘 Common Fixes

### Fix AI Attribution
```bash
git commit --amend
# Remove forbidden attributions from message
```

### Fix File Placement
```bash
mv WRONG_FILE.md docs/category/WRONG_FILE.md
git add docs/category/WRONG_FILE.md
git rm WRONG_FILE.md
```

### Add Tests
```bash
# Create test file
touch tests/test_your_feature.js
# Write tests, then commit together
git add src/feature.js tests/test_your_feature.js
```

---

**Enforcement Script:** `.ainative/enforce-rules.sh`
**Full Rules:** `.ainative/RULES.MD`
**Updated:** 2026-02-01

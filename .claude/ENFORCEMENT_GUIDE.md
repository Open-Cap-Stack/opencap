# Claude Rules Enforcement Quick Guide

## 🚀 Quick Start

Run enforcement checks anytime:
```bash
./.claude/enforce-rules.sh
```

Or run comprehensive check:
```bash
./scripts/check-rules.sh
```

## 🎯 What Gets Checked

### Zero-Tolerance (Hard Failures)
- ❌ Code without tests (TDD violation)
- ❌ Third-party AI attributions in commits/PRs
- ❌ Documentation in root directories
- ❌ Non-standard branch naming for features

### Warnings
- ⚠️ Debug statements (console.log, print)
- ⚠️ Direct Alembic migrations (prefer schema sync)
- ⚠️ Model changes without schema sync update

## 📚 Available Skills

Located in `.claude/skills/`:

1. **mandatory-tdd** - TDD/BDD enforcement
2. **git-workflow** - Git/PR standards
3. **file-placement** - File organization
4. **database-schema-sync** - Schema management
5. **story-workflow** - Backlog management
6. **code-quality** - Coding standards
7. **ci-cd-compliance** - CI/CD requirements
8. **delivery-checklist** - Pre-delivery checks

## 🧪 TDD Requirement (Mandatory)

**ALWAYS write tests FIRST**, then implementation:

### ❌ WRONG (Code without tests)
```bash
git add src/feature.js
git commit -m "Add feature"
# ❌ VIOLATION: Code without tests
```

### ✅ CORRECT (TDD workflow)
```bash
# 1. RED: Write failing test
git add tests/test_feature.js
git commit -m "WIP: Add failing test for feature X"

# 2. GREEN: Minimal implementation
git add src/feature.js
git commit -m "green: Make feature X test pass"

# 3. REFACTOR: Improve design
git add src/feature.js tests/test_feature.js
git commit -m "refactor: Clean up feature X implementation"
```

## 📝 Git Workflow

### Branch Naming
```bash
# ✅ CORRECT
feature/123-user-authentication
bugfix/456-login-error
chore/789-update-dependencies

# ❌ WRONG
my-feature
fix-bug
update
```

### Commit Messages

**❌ FORBIDDEN:**
```
Add authentication

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

**✅ CORRECT:**
```
Add authentication

- Implement JWT token validation
- Add user session management
- Include comprehensive tests

Built by AINative Dev Team
```

## 🗄️ Database Schema Management

### ❌ AVOID: Direct Alembic migrations
```bash
alembic upgrade head  # Not recommended for production
```

### ✅ PREFER: Schema sync script
```bash
# Always dry-run first
python scripts/sync-production-schema.py --dry-run

# Then apply
python scripts/sync-production-schema.py --apply
```

## 📁 File Placement

### Documentation
```bash
# ❌ WRONG
API_GUIDE.md
DEPLOYMENT_STEPS.md
BUG_REPORT.md

# ✅ CORRECT
docs/api/API_GUIDE.md
docs/deployment/DEPLOYMENT_STEPS.md
docs/issues/BUG_REPORT.md
```

### Scripts
```bash
# ❌ WRONG
backend/deploy.sh
test_runner.sh

# ✅ CORRECT
scripts/deploy.sh
scripts/test_runner.sh
```

## 🎨 Code Quality

### ❌ Remove Debug Statements
```javascript
// ❌ BAD
console.log('Debug:', data);
print(f"Value: {value}")

// ✅ GOOD
logger.info('Processing data', { userId: user.id });
logger.debug('Value processed', { value: sanitized_value })
```

## 🔧 Bypassing (Emergency Only)

```bash
# Not recommended - only for genuine emergencies
git commit --no-verify -m "Emergency hotfix"
```

⚠️ **WARNING**: Bypassing checks can introduce:
- Untested code in production
- Security vulnerabilities
- Documentation inconsistencies

## 📊 Check Status

View all active skills:
```bash
ls -l .claude/skills/
# Should show 13+ skills
```

## 🆘 Common Fixes

### Fix TDD Violation
```bash
# Always add tests with code changes
git add src/feature.js tests/test_feature.js
git commit -m "Add feature X with comprehensive tests"
```

### Fix AI Attribution
```bash
# Amend last commit
git commit --amend
# Remove forbidden attributions, save
```

### Fix File Placement
```bash
# Move to correct location
mv GUIDE.md docs/guides/GUIDE.md
git add docs/guides/GUIDE.md
git rm GUIDE.md
```

### Fix Branch Naming
```bash
# Create correctly named branch
git checkout -b feature/123-correct-name
git push -u origin feature/123-correct-name

# Delete old branch
git branch -D old-branch-name
git push origin --delete old-branch-name
```

## 📚 Full Documentation

- **Complete Rules:** `docs/RULES_ENFORCEMENT.md`
- **Skills Documentation:** `.claude/skills/*/SKILL.md`
- **Legacy Rules:** `.claude/RULES.MD.deprecated`

## 🔗 Quick Links

- TDD Requirements: `.claude/skills/mandatory-tdd/SKILL.md`
- Git Workflow: `.claude/skills/git-workflow/SKILL.md`
- File Placement: `.claude/skills/file-placement/SKILL.md`
- Schema Sync: `.claude/skills/database-schema-sync/SKILL.md`

---

**Enforcement Script:** `.claude/enforce-rules.sh`
**Skills Location:** `.claude/skills/`
**Updated:** 2026-02-01

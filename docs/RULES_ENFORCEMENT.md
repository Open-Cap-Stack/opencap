# Rules Enforcement System

## Overview

OpenCapStack has a comprehensive rules enforcement system that validates code against project standards defined in:
- `.ainative/RULES.MD` - AINative coding standards
- `.claude/skills/` - Modular Claude skills and standards

## Enforcement Components

### 1. Enforcement Scripts

#### `.ainative/enforce-rules.sh`
Validates against AINative coding standards:
- ❌ **Zero-tolerance**: No third-party AI attributions (Claude, ChatGPT, Copilot)
- 📁 **File placement**: No `.md` files in root (except README.md)
- 🧪 **Test requirements**: Code changes should include tests
- 💬 **Commit format**: WIP:/READY:/MERGE: or conventional commits
- 🔐 **Security**: No exposed secrets or PII

#### `.claude/enforce-rules.sh`
Validates against Claude skills standards:
- 🧪 **TDD requirements**: Tests must be written FIRST (mandatory-tdd skill)
- 📝 **Git workflow**: Zero-tolerance AI attribution, branch naming
- 📁 **File placement**: Documentation in docs/, scripts in scripts/
- 🗄️ **Database schema**: Prefer schema sync script over Alembic
- 🎨 **Code quality**: No debug statements, proper logging

### 2. Git Hooks

#### `.git/hooks/pre-commit`
Automatically runs both enforcement scripts before every commit:
- Prevents commits that violate rules
- Provides clear error messages
- Can be bypassed with `--no-verify` (not recommended)

### 3. Unified Checker

#### `scripts/check-rules.sh`
Comprehensive manual checker with beautiful output:
- Runs all enforcement scripts
- Shows project statistics
- Provides detailed summary
- Color-coded results

## Usage

### Automatic Enforcement (Recommended)

The pre-commit hook runs automatically when you commit:

```bash
git add .
git commit -m "Your commit message"

# Hook automatically runs:
# 🔒 Running Pre-Commit Rule Enforcement
# =======================================
# 🏗️  AINative Rules
# 🤖 Claude Rules
# ✅ All pre-commit checks passed
```

### Manual Checking

Run the unified checker anytime:

```bash
./scripts/check-rules.sh
```

Example output:
```
╔════════════════════════════════════════════════════════╗
║        OpenCapStack Rules Compliance Checker           ║
╚════════════════════════════════════════════════════════╝

Repository: opencapstack
Branch: main
Last Commit: 6a484e9 - FEAT: Phase 4 Integration Updates

🏗️  AINative Rules
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ No forbidden AI attributions in commit
✓ No .md files in root
✓ No .sh scripts in backend root
✓ No obvious secrets detected
✅ ALL CHECKS PASSED

🤖 Claude Rules
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ No forbidden AI attributions
✓ Documentation properly placed
✓ No debug statements found
✓ 13 skills available in .claude/skills
✅ ALL CHECKS PASSED

📊 Project Statistics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JavaScript files: 183
Test files: 7
Documentation files: 276

╔════════════════════════════════════════════════════════╗
║  ✅ COMPLIANCE CHECK PASSED                            ║
╚════════════════════════════════════════════════════════╝
```

### Individual Script Testing

Run scripts individually for focused checks:

```bash
# AINative rules only
./.ainative/enforce-rules.sh

# Claude rules only
./.claude/enforce-rules.sh
```

## Bypass (Not Recommended)

In emergencies, you can bypass the pre-commit hook:

```bash
git commit --no-verify -m "Emergency fix"
```

⚠️ **WARNING**: Only use `--no-verify` in genuine emergencies. Bypassing checks can introduce:
- Code quality issues
- Security vulnerabilities
- Documentation inconsistencies
- Test coverage gaps

## Common Violations & Fixes

### ❌ Violation: AI Attribution in Commit

**Error:**
```
❌ ZERO-TOLERANCE VIOLATION: AI attribution in commit
Remove ALL references to third-party AI tools
```

**Fix:**
```bash
# Amend your commit message to remove attributions
git commit --amend

# Remove lines like:
# 🤖 Generated with Claude Code
# Co-Authored-By: Claude <noreply@anthropic.com>
```

**Correct Format:**
```
Add multi-dimension vector support

- Support for 384, 768, 1024, and 1536 dimensions
- Update validation logic for new dimensions
- Add comprehensive test coverage

Built by AINative Dev Team
```

### ❌ Violation: Documentation in Root

**Error:**
```
❌ VIOLATION: Documentation files in root
Files: FEATURE_GUIDE.md
Move to docs/ subdirectory
```

**Fix:**
```bash
# Move documentation to correct location
mv FEATURE_GUIDE.md docs/guides/FEATURE_GUIDE.md
git add docs/guides/FEATURE_GUIDE.md
git rm FEATURE_GUIDE.md
```

### ❌ Violation: Code Without Tests

**Error:**
```
❌ VIOLATION: Code without tests
TDD requires tests to be written FIRST
```

**Fix:**
```bash
# Add tests for your changes
# Create test file following naming convention
touch tests/test_your_feature.js

# Write tests first (Red phase)
# Then implement feature (Green phase)
# Then refactor (Refactor phase)
```

### ⚠️ Warning: Debug Statements

**Warning:**
```
⚠️  WARNING: Debug statements detected
Remove or replace with proper logging
```

**Fix:**
```javascript
// ❌ Bad - Remove debug statements
console.log('User data:', userData);

// ✅ Good - Use proper logging
logger.info('User authenticated', { userId: user.id });
```

## Rule Categories

### Zero-Tolerance Rules (Hard Failures)
- ❌ Third-party AI attributions in commits/PRs
- ❌ Documentation files in root directories
- ❌ Code committed without tests (TDD violation)
- ❌ Exposed secrets or credentials

### Warning Rules (Soft Failures)
- ⚠️ Debug statements (console.log, print)
- ⚠️ Missing test updates when modifying code
- ⚠️ Non-standard branch naming
- ⚠️ Direct Alembic migrations (prefer schema sync)

## Integration with CI/CD

The enforcement scripts can be integrated into CI/CD pipelines:

### GitHub Actions
```yaml
name: Rules Enforcement

on: [pull_request]

jobs:
  enforce-rules:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Rules Checker
        run: ./scripts/check-rules.sh
```

### Pre-push Hook
```bash
# .git/hooks/pre-push
#!/bin/bash
./scripts/check-rules.sh
```

## Maintenance

### Adding New Rules

1. **For AINative rules:**
   - Edit `.ainative/enforce-rules.sh`
   - Add new check function
   - Test with `./ainative/enforce-rules.sh`

2. **For Claude rules:**
   - Edit `.claude/enforce-rules.sh`
   - Add new check function
   - Or create new skill in `.claude/skills/`
   - Test with `./.claude/enforce-rules.sh`

3. **Update documentation:**
   - Add to this file
   - Update relevant RULES.MD files

### Disabling Checks Temporarily

To temporarily disable specific checks, comment them out in the enforcement scripts:

```bash
# In .ainative/enforce-rules.sh
# check_forbidden_patterns  # Temporarily disabled
check_file_placement
check_test_requirements
```

## Troubleshooting

### Hook Not Running

If the pre-commit hook doesn't run:

```bash
# Make sure hook is executable
chmod +x .git/hooks/pre-commit

# Verify hook exists
ls -la .git/hooks/pre-commit

# Test hook manually
./.git/hooks/pre-commit
```

### False Positives

If you get false positive errors:

1. Check if the violation is actually valid
2. If it's a genuine false positive, update the enforcement script
3. Document the exception in this file

### Performance Issues

If checks are too slow:

- Run individual scripts instead of unified checker
- Skip heavy checks for small commits
- Consider making some checks optional warnings

## Resources

- **AINative Rules:** `.ainative/RULES.MD`
- **Claude Skills:** `.claude/skills/`
- **Git Workflow:** `.claude/skills/git-workflow/SKILL.md`
- **TDD Requirements:** `.claude/skills/mandatory-tdd/SKILL.md`
- **File Placement:** `.claude/skills/file-placement/SKILL.md`

## Support

For issues or questions about rule enforcement:

1. Check this documentation
2. Review the specific rule file (`.ainative/RULES.MD` or `.claude/skills/`)
3. Run `./scripts/check-rules.sh` for detailed output
4. Open an issue with the output if you need help

---

**Last Updated:** 2026-02-01
**Version:** 1.0.0
**Status:** Active ✅

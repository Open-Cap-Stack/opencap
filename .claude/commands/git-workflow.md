---
description: Git commit, PR, and branching standards with ZERO TOLERANCE for AI attribution
---

# Git Workflow

## ABSOLUTE ZERO-TOLERANCE: NO AI ATTRIBUTION

**NEVER include ANY of the following in commits, PRs, issues, or code:**

- "Claude", "Anthropic", "claude.com", "Claude Code"
- "Generated with Claude", "Co-Authored-By: Claude"
- "🤖 Generated with [Claude Code]"
- Any emoji + "Generated with" or "Powered by"
- Any AI assistant attribution

## Correct Commit Format

```
Add user authentication feature

- Implement JWT token generation
- Add password hashing with bcrypt
- Create login/logout routes

Refs #123
```

## FORBIDDEN Commit Format

```
Add user authentication feature

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Branch Naming

```bash
git checkout -b feature/123-add-user-auth
git checkout -b bug/456-fix-login-redirect
git checkout -b chore/789-update-deps
```

## Commit References

- Every commit references issue: `Refs #123`
- Final commit closes issue: `Closes #123`

## PR Requirements

- Title: `[TYPE] Brief description - Fixes #123`
- Include: Problem, Solution, Test Plan, Risk/Rollback
- Small PRs: ≤300 LOC changed ideally

## Before Every Commit

1. Check for AI attribution text
2. Remove any forbidden text
3. Use clean, professional message

Invoke this skill when creating commits, PRs, or managing branches.

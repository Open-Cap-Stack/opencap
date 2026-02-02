# Branch Naming Conventions

## Patterns

All branches should follow these patterns:

```
feature/{issue-id}-{slug}
bug/{issue-id}-{slug}
chore/{issue-id}-{slug}
```

Where:
* `{issue-id}` = GitHub/Shortcut issue number
* `{slug}` = Short hyphen-separated description (2-4 words max)

## Examples by Type

### Feature Branches

```
feature/123-add-user-auth
feature/456-vector-search-api
feature/789-stripe-integration
feature/234-email-verification
feature/567-dashboard-ui
feature/890-multi-tenant-support
feature/345-api-rate-limiting
feature/678-websocket-notifications
```

### Bug Fix Branches

```
bug/111-fix-login-redirect
bug/222-memory-leak-fix
bug/333-race-condition-search
bug/444-cors-configuration
bug/555-timezone-handling
bug/666-file-upload-validation
bug/777-duplicate-entries
bug/888-broken-pagination
```

### Chore Branches

```
chore/199-upgrade-dependencies
chore/200-refactor-auth-module
chore/201-add-logging
chore/202-update-docs
chore/203-ci-pipeline-fix
chore/204-cleanup-unused-code
chore/205-improve-error-handling
chore/206-database-indexes
```

## Slug Creation Guidelines

### Good Slugs (Clear and Concise)

* `add-user-auth` ✅
* `fix-login-redirect` ✅
* `vector-search-api` ✅
* `upgrade-dependencies` ✅
* `email-verification` ✅

### Bad Slugs (Too Long or Unclear)

* `implement-the-new-user-authentication-system-with-jwt` ❌ (too long)
* `fix-bug` ❌ (too vague)
* `update` ❌ (too vague)
* `my-changes` ❌ (unclear)
* `final-fix-v2-really-final` ❌ (messy)

### Slug Rules

1. **2-4 words maximum**
2. **Hyphen-separated** (no underscores or camelCase)
3. **Lowercase only**
4. **Descriptive but brief**
5. **No version numbers** (use issue ID instead)
6. **Action-oriented** for features (add, implement, create)
7. **Problem-oriented** for bugs (fix, resolve, correct)

## Creating Branches

```bash
# From main branch
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/123-add-user-auth

# Create bug fix branch
git checkout -b bug/456-fix-login-redirect

# Create chore branch
git checkout -b chore/789-upgrade-dependencies
```

## Naming for Different Scenarios

### Multiple Issues in One Branch

If addressing multiple related issues, use primary issue ID and generic slug:

```
feature/123-auth-improvements  # Addresses #123, #124, #125
```

### No Issue Exists Yet

Create the issue first, then the branch. Never create a branch without an issue.

### Emergency Hotfixes

Still use bug/ prefix with issue number:

```
bug/999-critical-security-fix
```

### Experimental/Spike Work

Use chore/ prefix:

```
chore/888-spike-graphql-migration
chore/777-poc-redis-caching
```

## Branch Lifecycle

```
1. Create branch from main
   git checkout -b feature/123-add-user-auth

2. Make commits following TDD (red → green → refactor)
   git commit -m "WIP: red tests for user authentication"
   git commit -m "green: implement JWT token generation"
   git commit -m "refactor: extract token validation logic"

3. Push branch to remote
   git push -u origin feature/123-add-user-auth

4. Create PR
   [PR title: Add user authentication - Fixes #123]

5. After PR merged, delete branch
   git branch -d feature/123-add-user-auth
   git push origin --delete feature/123-add-user-auth
```

## Common Mistakes to Avoid

* ❌ `main` or `master` for development work
* ❌ `dev` or `development` as long-lived feature branches
* ❌ `my-branch` or `test-branch` (unclear purpose)
* ❌ Branches without issue numbers
* ❌ Reusing branch names after merge
* ❌ Creating branches from other feature branches (rebase to main first)

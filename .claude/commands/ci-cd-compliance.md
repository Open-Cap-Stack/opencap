---
description: CI/CD pipeline requirements and deployment standards
---

# CI/CD Compliance

## CI Gates (Required Order)

1. Install dependencies
2. Lint/format check
3. Type checking
4. Unit tests
5. Integration tests
6. Package/build

## Rules

- **Merge only if green** - All CI checks must pass
- **Auto-deploy to staging** - On merge to main
- **Production requires approval** - Tag or manual approval needed

## Branch Naming

```
feature/{issue-number}-{slug}
bug/{issue-number}-{slug}
chore/{issue-number}-{slug}
```

## PR Requirements

- Small PRs (≤300 LOC ideally)
- Clear description with test plan
- Link to issue (`Closes #123`)
- All CI checks passing

## When CI Fails

1. Check the failure logs
2. Identify root cause
3. Fix in the same PR (don't create separate fix PR)
4. Re-run CI after fix

## Deployment Flow

```
Push to branch → CI runs → PR review → Merge to main → Auto-deploy staging → Manual approval → Production
```

Invoke this skill when setting up CI/CD or debugging pipeline failures.

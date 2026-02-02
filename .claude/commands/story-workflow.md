---
description: Story management, estimation, and issue tracking workflow
---

# Story Workflow

## Story Estimation (Fibonacci)

| Points | Complexity |
|--------|------------|
| 0 | Trivial (typo, tiny fix) |
| 1 | Clear, contained |
| 2 | Slightly complex, well-defined |
| 3 | Moderate complexity |
| 5 | Complex, multiple components |
| 8 | Large - **SPLIT into smaller stories** |

## Story Types

- **Feature** - New functionality
- **Bug** - Fix for existing functionality
- **Chore** - Maintenance, refactoring, dependencies

## Issue Title Format

```
[TYPE] Brief descriptive title (max 60 chars)
```

Examples:
- `[FEATURE] Add user authentication with JWT`
- `[BUG] Fix login redirect loop on Safari`
- `[CHORE] Update Python dependencies`

## Required Labels

- **Type:** `bug`, `feature`, `testing`, `refactor`, `documentation`, `devops`
- **Priority:** `critical`, `high`, `medium`, `low`
- **Status:** `ready`, `in-progress`, `blocked`, `review`, `done`
- **Component:** `backend`, `frontend`, `database`, `api`, `ui`, `infrastructure`

## Branch from Issue

```bash
git checkout -b feature/123-add-user-auth
git checkout -b bug/456-fix-login-redirect
```

## Issue Description Template

```markdown
## Problem/Context
[What needs to be done and why]

## Proposed Solution
[How you plan to solve this]

## Technical Details
- **Files affected:** [List key files]
- **Dependencies:** [Any new dependencies]
- **Breaking changes:** [Yes/No]

## Testing Plan
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated

## Acceptance Criteria
- [ ] [Specific measurable outcome 1]
- [ ] [Specific measurable outcome 2]

## Estimate
**Story Points:** [0/1/2/3/5/8]
```

Invoke this skill when starting work from backlog or estimating stories.

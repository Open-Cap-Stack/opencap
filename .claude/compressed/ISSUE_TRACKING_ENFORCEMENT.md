# GitHub Issue Tracking Enforcement Rules

## 1) Scope: What Requires an Issue

### ✅ MANDATORY - Must Create Issue:

#### Bug Fixes
- Code fixes
- Error handling
- Performance bugs
- Security vulnerabilities
- UI/UX bugs
- API issues
- Test failures

#### New Features
- API endpoints
- UI components
- Database schemas
- Integrations
- Authentication features
- CLI tools
- Config options

#### Testing & QA
- Test suites
- Test coverage
- E2E tests
- Integration tests
- Performance testing
- Security testing

#### Refactoring
- Code restructuring
- Design patterns
- Performance optimization
- Dependency updates
- Architecture changes

#### Documentation
- API docs
- README updates
- Architecture docs
- Deployment guides
- Onboarding docs

#### DevOps & Infrastructure
- CI/CD changes
- Deployment config
- Environment setup
- Container config
- Database migrations
- Monitoring setup

### ❌ EXCEPTIONS:
- Typo fixes in comments
- Whitespace formatting
- Local dev setup

## 2) Issue Creation Requirements

### Before Starting ANY Work:

1. **Search for existing issue**
   - Check if issue exists
   - Assign or create new

2. **Issue Title Format:**
   ```
   [TYPE] Brief title (max 60 chars)
   ```
   **Types:**
   - `[BUG]`
   - `[FEATURE]`
   - `[TEST]`
   - `[REFACTOR]`
   - `[DOCS]`
   - `[DEVOPS]`
   - `[SECURITY]`
   - `[PERFORMANCE]`

3. **Issue Description Template:**
```markdown
## Problem/Context
[Description of work]

## Current Behavior
[What happens now]

## Expected Behavior
[What should happen]

## Proposed Solution
[Solution approach]

## Technical Details
- **Files affected:** 
- **Dependencies:** 
- **Breaking changes:** 

## Testing Plan
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing

## Acceptance Criteria
- [ ] Outcome 1
- [ ] Outcome 2
- [ ] Outcome 3

## Estimate
**Story Points:** [0/1/2/3/5/8]
**Rationale:** 

## References
- Related Issues: 
- Documentation: 
```

4. **Labels (REQUIRED):**
   - **Type:** `bug`, `feature`, etc.
   - **Priority:** `critical`, `high`, etc.
   - **Status:** `ready`, `in-progress`, etc.
   - **Component:** `backend`, `frontend`, etc.
   - **Effort:** `xs`, `s`, `m`, `l`, `xl`

5. **Assignee:**
   - Assign yourself immediately
   - Never work on unassigned issues

## 3) Issue Workflow

### Step 1: Create Issue
```bash
1. Create GitHub issue
2. Add labels
3. Assign to self
4. Add to project board
```

### Step 2: Create Branch
```bash
git checkout -b [type]/[issue-number]-[description]
```

### Step 3: Work & Commit
```bash
git commit -m "Description

- Specific changes
- More details

Refs #123"
```

### Step 4: Create Pull Request
```markdown
## PR Title:
[TYPE] Description - Fixes #[issue-number]

## PR Description:
- Closes #[issue-number]
- Summary of changes
- Testing performed
```

### Step 5-6: Update & Close Issue
- Comment on progress
- Update labels
- Link PRs
- Close when merged

## 4) Enforcement for AI Agents

### Pre-Work Checklist:
```
[ ] Search for existing issue
[ ] Create issue if none exists
[ ] Add labels
[ ] Assign issue
[ ] Create branch
[ ] Reference issue in branch
```

### During/Post-Work Requirements:
```
[ ] Reference issue in commits
[ ] Update issue progress
[ ] Create PR with issue link
[ ] Close issue
```

## 5-10) [Condensed Sections with Core Requirements]

## SUMMARY: Golden Rule

> "No Code Without An Issue. No PR Without A Link. No Merge Without Tracking."

**Effective:** Immediately
**Review:** Quarterly
**Zero Tolerance Policy**
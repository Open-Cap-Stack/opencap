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
- Configuration options

#### Testing & QA
- Test suites
- Test coverage
- E2E/Integration tests
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

#### DevOps & Infrastructure
- CI/CD changes
- Deployment config
- Environment setup
- Container config
- Database migrations

### ❌ EXCEPTIONS:
- Typo fixes in comments
- Whitespace formatting
- Local dev setup

## 2) Issue Creation Requirements

### Before Starting Work:

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
[Clear description]

## Current Behavior
[What happens]

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

4. **Required Labels:**
   - Type: `bug`, `feature`
   - Priority: `critical`, `high`
   - Status: `ready`, `in-progress`
   - Component: `backend`, `frontend`
   - Effort: `xs`, `s`, `m`

5. **Assignee:**
   - Assign immediately
   - Never unassigned work

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
# Example: git checkout -b feature/123-add-auth
```

### Step 3: Work & Commit
```bash
git commit -m "Feature description

Refs #123"
```

### Step 4: Pull Request
```markdown
## PR Title:
[TYPE] Description - Fixes #[issue-number]

## PR Description:
- Closes #[issue-number]
- Summary of changes
- Testing performed
```

## 4) Enforcement for AI Agents

### Pre-Work Checklist:
```
[ ] Search for existing issue
[ ] Create issue if none exists
[ ] Add required labels
[ ] Assign issue
[ ] Create branch
[ ] Reference issue in branch
```

### During-Work Requirements:
```
[ ] Reference issue in commits
[ ] Update issue progress
[ ] Update labels
[ ] Document challenges
```

### Post-Work Requirements:
```
[ ] Create PR with issue reference
[ ] Link PR to issue
[ ] Update with test results
[ ] Ensure issue closes
```

## 5-10) [Condensed Core Sections]

## SUMMARY: Golden Rule

> "No Code Without An Issue. No PR Without A Link. No Merge Without Tracking."

**Effective:** Immediately
**Review:** Quarterly
**Zero Tolerance Policy**
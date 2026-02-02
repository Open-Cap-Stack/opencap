# PR Templates

## Feature PR Template

```markdown
## Summary
[Brief description of the feature and why it was needed]

## Changes
- [List major changes]
- [Include file areas affected]
- [Note any breaking changes]

## Test Plan
**Commands Run:**
```
[Exact commands used to test]
```

**Results:**
```
[Paste test output showing all tests passing]
```

**Manual Testing:**
- [ ] Tested feature in browser/app
- [ ] Verified responsive design
- [ ] Checked accessibility (keyboard nav)
- [ ] Tested edge cases

## Risk Assessment
**Potential Risks:**
- [List any concerns]

**Rollback Plan:**
- [How to revert if issues arise]

## Screenshots/Evidence
[If UI changes, include before/after screenshots]

## Story Link
Closes #[issue-number]
Type: Feature
Estimate: [0/1/2/3/5/8] points
```

## Bug Fix PR Template

```markdown
## Problem
[Description of the bug and how it was discovered]

## Root Cause
[Technical explanation of what caused the bug]

## Solution
[How the fix addresses the root cause]

## Changes
- [List files changed]
- [Describe logic updates]

## Test Plan
**Regression Test:**
```
[Test that reproduces the bug before fix]
```

**Verification:**
```
[Test output showing bug is fixed]
```

**Additional Testing:**
- [ ] Verified fix doesn't break related features
- [ ] Checked edge cases
- [ ] Tested in staging environment

## Risk Assessment
**Low/Medium/High Risk:** [Choose one and explain]

**Rollback Plan:**
- [Steps to revert if issues arise]

## Story Link
Fixes #[issue-number]
Type: Bug
Estimate: [0/1/2/3/5/8] points
```

## Chore PR Template

```markdown
## Summary
[What maintenance/refactoring/cleanup was done]

## Motivation
[Why this chore was necessary]

## Changes
- [List changes made]
- [Note any dependencies updated]
- [Mention any configuration changes]

## Test Plan
**Verification:**
```
[Commands run to verify nothing broke]
```

**Results:**
```
[Test output showing all tests still pass]
```

- [ ] All existing tests passing
- [ ] No regressions introduced
- [ ] Documentation updated if needed

## Risk Assessment
**Low Risk** (or explain if higher)

**Rollback Plan:**
- [How to revert]

## Story Link
Refs #[issue-number]
Type: Chore
Estimate: [0/1/2/3/5/8] points
```

## PR Description Best Practices

### What Makes a Good PR Description?

1. **Clear Context:** Explain WHY the change was needed
2. **Complete Summary:** Describe WHAT changed at a high level
3. **Evidence:** Include actual test output, not "tests passing"
4. **Risk Assessment:** Be honest about potential issues
5. **Rollback Plan:** Always know how to undo the change

### What to Avoid

* ❌ "Fixed stuff" - too vague
* ❌ "Tests passing" without proof
* ❌ No explanation of why change was needed
* ❌ Missing risk assessment
* ❌ AI attribution or tool references
* ❌ Huge PRs with 1000+ LOC changed

### Size Guidelines

* **0-100 LOC:** Quick review, easy merge
* **100-300 LOC:** Ideal size, still manageable
* **300-500 LOC:** Large, consider splitting
* **500+ LOC:** Too large, must split into smaller PRs

### Review Checklist

Before creating PR:
- [ ] No AI attribution anywhere
- [ ] Tests actually run and passing (with evidence)
- [ ] PR description complete
- [ ] Changes focused and scoped
- [ ] Documentation updated if needed
- [ ] No secrets or PII in code/screenshots

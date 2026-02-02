---
description: Pre-delivery acceptance checklist and verification workflow
---

# Delivery Checklist

## Default Development Loop

```
Plan → Implement → Artifacts → PR → Verify → Deliver
```

## Pre-Delivery Checklist

Before marking any story as Delivered:

### Code Quality
- [ ] Code follows style guidelines
- [ ] No hardcoded secrets or PII
- [ ] Error handling implemented
- [ ] Logging added where appropriate

### Testing
- [ ] Tests written (TDD style)
- [ ] Tests actually executed
- [ ] Coverage >= 80%
- [ ] All tests passing

### Documentation
- [ ] Code comments where needed
- [ ] API documentation updated (if applicable)
- [ ] README updated (if applicable)

### Git & PR
- [ ] Branch follows naming convention
- [ ] Commits reference issue number
- [ ] PR description complete
- [ ] No AI attribution anywhere

### Review
- [ ] Self-reviewed the code
- [ ] CI/CD passing
- [ ] No merge conflicts

### Verification
- [ ] Feature works as expected
- [ ] Edge cases handled
- [ ] No regressions introduced

## Quick Prompts

### Classification
"Classify this task: Is it a feature, bug, chore, or refactor?"

### TDD
"Write failing tests first, then implement minimal code to pass."

### Refactoring
"Improve code quality while keeping all tests green."

### PR Composition
"Summarize changes, test plan, and any risks for the PR description."

## Final Verification

```bash
# Run full test suite
python3 -m pytest tests/ -v --cov=app --cov-report=term-missing

# Verify no forbidden text
git log -1 --pretty=format:"%B" | grep -i "claude\|anthropic\|generated"
```

Invoke this skill when preparing to mark a story as Delivered.

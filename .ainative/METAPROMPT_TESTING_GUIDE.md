# AINative Metaprompt Testing Guide

**Version**: 1.0
**Date**: 2025-12-29
**Purpose**: Guide for internal team members to test meta prompts and agent personas
**Audience**: AINative Internal Team Only

---

## 🚀 Quick Start

This guide helps you test and validate AINative's meta prompts and agent personas in your development workflow.

### What Are Meta Prompts?

**Meta prompts** are specialized instructions that guide Cody (AINative's CTO-type AI agent) to perform specific development tasks with consistent quality and methodology.

### Available Testing Resources

1. **Agent Personas** (`AGENT_PERSONAS_TEST.md`) - 25 specialized agent types
2. **Global Rules** (`GLOBAL_RULES_TEST.md`) - Universal development standards
3. **Prompt Library** (`PROMPT_LIBRARY_TEST.md`) - Ready-to-use prompts
4. **Reasoning Framework** (`REASONING_FRAMEWORK_TEST.md`) - Structured thinking patterns

---

## 🎯 Testing Scenarios

### Scenario 1: Feature Development with TDD

**Objective**: Test the TDD workflow with Cody

**Steps**:
1. Create GitHub issue for your feature
2. Use this prompt with Cody:
```
Follow TDD workflow for GitHub issue #[NUMBER]:
1. Generate failing tests (Red)
2. Implement minimal code (Green)
3. Refactor for quality

Use MCP to annotate progress on the issue.
```

**Expected Outcome**:
- Cody creates failing tests first
- Implements code to pass tests
- Refactors without breaking tests
- Annotates GitHub issue with progress

### Scenario 2: Agent Persona Specialization

**Objective**: Test specialized agent invocation

**Steps**:
1. Choose agent from `AGENT_PERSONAS_TEST.md` (e.g., Backend API Architect)
2. Use persona-specific prompt:
```
Invoke Backend API Architect persona to design REST API for [FEATURE]:
- Define endpoints with HTTP methods
- Specify request/response schemas
- Include authentication requirements
- Follow AINative API standards
```

**Expected Outcome**:
- API design following AINative conventions
- Type-safe schemas (TypeScript/Pydantic)
- Security considerations included
- ZeroDB integration where applicable

### Scenario 3: Code Review & Quality

**Objective**: Test code review capabilities

**Steps**:
1. Write some code with intentional issues
2. Use this prompt:
```
Review this code following AINative standards:
- Check naming conventions (camelCase/PascalCase)
- Verify type annotations
- Assess security practices
- Suggest refactoring opportunities
```

**Expected Outcome**:
- Identifies style violations
- Suggests security improvements
- Proposes refactoring
- Provides actionable feedback

---

## 📊 Test Evaluation Criteria

### Quality Metrics

| Criteria | Pass | Fail |
|----------|------|------|
| **Follows TDD** | Tests written before code | Code before tests |
| **GitHub Integration** | MCP annotations on issues | No issue tracking |
| **Code Style** | Matches AINative standards | Inconsistent style |
| **Type Safety** | Full type annotations | Missing types |
| **Security** | Input validation present | Security gaps |
| **ZeroDB Use** | Uses ZeroDB for data | External DB without approval |

### Performance Benchmarks

- **Feature Estimation**: Should match Fibonacci scale (0,1,2,3,5,8)
- **Test Coverage**: ≥80% for new code
- **Response Time**: Meaningful output within 30 seconds
- **Iteration Count**: ≤3 iterations to reach acceptable solution

---

## 🔍 Common Testing Patterns

### Pattern 1: Backlog-Driven Development

```
Fetch highest-priority GitHub issue labeled "ready".
Classify as feature/bug/chore and estimate using Fibonacci scale.
Create branch following naming convention.
Implement using TDD workflow.
Open PR with comprehensive description.
```

### Pattern 2: Multi-Agent Collaboration

```
Invoke Explore Agent to find existing auth implementation.
Then invoke Backend API Architect to design new auth endpoints.
Then invoke Security Engineer to review security implications.
Finally invoke QA Testing Strategist to create test plan.
```

### Pattern 3: Reasoning-First Approach

```
Before implementing [FEATURE], provide chain-of-thought reasoning:
1. Clarify ambiguous requirements
2. Weigh implementation alternatives
3. Identify edge cases and risks
4. Conclude with chosen approach

Then implement following TDD workflow.
```

---

## ⚠️ Known Limitations

1. **GitHub API Rate Limits**: MCP operations count against GitHub API quota
2. **Context Window**: Very large codebases may require focused exploration
3. **External Dependencies**: Some prompts assume ZeroDB/Railway infrastructure
4. **Persona Switching**: Switching personas mid-task may lose context

---

## 🎓 Best Practices for Testing

### DO

✅ Start with simple scenarios before complex ones
✅ Test one persona/pattern at a time
✅ Document unexpected behaviors
✅ Use real GitHub issues for realistic testing
✅ Verify generated tests actually run
✅ Check that code follows AINative standards

### DON'T

❌ Test without GitHub issue tracking
❌ Skip verification of generated code/tests
❌ Use production data in test scenarios
❌ Ignore security warnings in output
❌ Expect perfect results on first attempt
❌ Mix multiple personas without clear separation

---

## 🐛 Troubleshooting

### Issue: Cody doesn't follow TDD workflow

**Solution**: Be explicit in prompt:
```
STRICT TDD:
1. Write failing test FIRST
2. Run test (should fail)
3. Write minimal code to pass
4. Run test (should pass)
5. Refactor if needed
```

### Issue: Agent doesn't use MCP for GitHub

**Solution**: Verify MCP is configured:
```
Check that MCP GitHub server is connected.
Verify GITHUB_TOKEN has repo permissions.
Use explicit MCP commands in prompts.
```

### Issue: Generated code doesn't match style guide

**Solution**: Reference specific standards:
```
Follow AINative coding standards from .ainative/CODY.md:
- camelCase for functions
- PascalCase for classes
- Full type annotations
- 80 character line limit
```

---

## 📝 Feedback & Iteration

### How to Report Issues

1. **Document the scenario** you were testing
2. **Capture the prompt** you used
3. **Record the output** from Cody
4. **Describe expected vs actual** behavior
5. **Note environment details** (IDE, MCP config, etc.)

### Submit feedback to:
- Internal Slack: `#ainative-cody-testing`
- GitHub Issues: Tag with `meta-prompt-testing`
- Email: `cody-team@ainative.studio`

---

## 🔗 Related Resources

- **Agent Personas**: `.ainative/AGENT_PERSONAS_TEST.md`
- **Global Rules**: `.ainative/GLOBAL_RULES_TEST.md`
- **Prompt Library**: `.ainative/PROMPT_LIBRARY_TEST.md`
- **Main Project Memory**: `.ainative/CODY.md`
- **GitHub Integration**: `.ainative/ISSUE_TRACKING_ENFORCEMENT.md`

---

## 📌 Quick Reference

### Essential Prompts for Testing

**Backlog Workflow**:
```
Fetch GitHub issue #[N], classify it, create branch, implement with TDD, open PR.
```

**Code Review**:
```
Review this code against AINative standards. Provide specific, actionable feedback.
```

**Architecture Design**:
```
Invoke Systems Architect to design [SYSTEM] following microservices patterns.
```

**Security Audit**:
```
Invoke Security Engineer to audit [CODE] for vulnerabilities and compliance issues.
```

**Test Generation**:
```
Generate BDD-style tests for [FEATURE] using describe/it blocks with clear assertions.
```

---

**Remember**: These are TESTING tools for internal evaluation. Use them to validate and improve AINative's agent capabilities before broader deployment.

**Status**: Active Development | **Confidentiality**: AINative Internal Only

Built by AINative Dev Team
All Data Services Built on ZeroDB

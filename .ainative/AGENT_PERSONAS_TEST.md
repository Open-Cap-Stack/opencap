# AINative Agent Personas - Testing Version

**Version**: 1.0-test
**Date**: 2025-12-29
**Purpose**: Simplified agent personas for internal testing
**Audience**: AINative Internal Team Only

---

## Overview

This document provides **12 essential agent personas** for testing AINative Cody's specialized capabilities. Each persona represents a focused expertise area that team members can invoke for specific development tasks.

**How to Use**: Reference persona name in prompts to Cody (e.g., "Invoke Backend API Architect to design...")

---

## 🔧 Development Agents

### 1. Explore Agent

**Purpose**: Fast codebase exploration and search

**When to Use**:
- "Where is X implemented?"
- "Find all files matching pattern Y"
- "Show me how feature Z works"

**Test Prompt**:
```
Invoke Explore Agent (medium thoroughness) to find all API endpoints related to user authentication.
```

**Expected Output**:
- List of matching files with line numbers
- Brief description of each implementation
- Related test files

---

### 2. Plan Agent

**Purpose**: Feature planning and task breakdown

**When to Use**:
- Starting new feature development
- Breaking down complex requirements
- Creating implementation roadmaps

**Test Prompt**:
```
Invoke Plan Agent to create implementation plan for adding 2FA to login flow. Include:
- Required components
- API changes
- Database migrations
- Test strategy
- Deployment steps
```

**Expected Output**:
- Numbered implementation steps
- Dependency graph
- Risk assessment
- Estimated complexity (Fibonacci points)

---

### 3. TDD Developer

**Purpose**: Test-driven development workflow

**When to Use**:
- Implementing new functions/features
- Ensuring test coverage
- Following Red-Green-Refactor cycle

**Test Prompt**:
```
Invoke TDD Developer to implement validateEmail function following strict TDD:
1. Write failing test
2. Implement minimal code
3. Refactor for quality
```

**Expected Output**:
- Failing test code first
- Minimal implementation
- Refactored version
- All tests passing confirmation

---

### 4. Backend API Architect

**Purpose**: Design RESTful APIs and backend architecture

**When to Use**:
- Designing new API endpoints
- Structuring backend services
- Database schema design

**Test Prompt**:
```
Invoke Backend API Architect to design /v1/billing/invoices endpoint:
- List all user invoices
- Include pagination
- Filter by date range
- Return structured response
- Use ZeroDB for storage
```

**Expected Output**:
- Endpoint specification (HTTP method, path, params)
- Request/response schemas (TypeScript/Pydantic)
- Database query logic
- Error handling approach
- Rate limiting strategy

---

### 5. Frontend Dev Specialist

**Purpose**: Build React/UI components and client-side logic

**When to Use**:
- Creating new UI components
- Implementing client-side features
- Optimizing frontend performance

**Test Prompt**:
```
Invoke Frontend Dev Specialist to create InvoiceList component:
- Display invoices in table
- Sortable columns
- Mobile responsive
- Loading states
- Error boundaries
```

**Expected Output**:
- TypeScript React component
- Styled with Tailwind CSS
- Prop types defined
- Accessibility attributes
- Sample usage code

---

### 6. Fullstack Architect

**Purpose**: End-to-end feature design across frontend and backend

**When to Use**:
- Building complete features
- Ensuring frontend-backend integration
- System-wide architectural decisions

**Test Prompt**:
```
Invoke Fullstack Architect to design complete "Export Invoice" feature:
- Frontend: Export button UI
- Backend: PDF generation endpoint
- Storage: S3/ZeroDB file storage
- Email: Send PDF to user
```

**Expected Output**:
- Frontend component design
- API endpoint specification
- Backend service architecture
- Database schema changes
- Integration flow diagram

---

## 🛡️ Quality & Security Agents

### 7. QA Testing Strategist

**Purpose**: Comprehensive test planning and quality assurance

**When to Use**:
- Creating test strategies
- Ensuring quality coverage
- Identifying edge cases

**Test Prompt**:
```
Invoke QA Testing Strategist to create test plan for payment processing flow:
- Unit tests
- Integration tests
- End-to-end tests
- Security tests
- Performance tests
```

**Expected Output**:
- Test case list with descriptions
- Coverage goals (≥80%)
- Testing frameworks to use
- Mock/stub strategies
- Acceptance criteria

---

### 8. Security Engineer

**Purpose**: Security audits and threat mitigation

**When to Use**:
- Reviewing authentication/authorization
- Auditing sensitive operations
- Implementing security best practices

**Test Prompt**:
```
Invoke Security Engineer to audit user login endpoint for security vulnerabilities:
- SQL injection
- XSS attacks
- CSRF protection
- Rate limiting
- Password security
```

**Expected Output**:
- Vulnerability assessment
- Risk severity ratings
- Remediation recommendations
- Code examples for fixes
- Security checklist

---

## ⚙️ Infrastructure Agents

### 9. DevOps Infrastructure

**Purpose**: CI/CD, deployment, and infrastructure automation

**When to Use**:
- Setting up deployment pipelines
- Configuring infrastructure
- Automating operations

**Test Prompt**:
```
Invoke DevOps Infrastructure to create GitHub Actions workflow for:
- Run tests on PR
- Deploy to Railway staging on merge to develop
- Deploy to production on merge to main
- Include rollback strategy
```

**Expected Output**:
- GitHub Actions YAML configuration
- Environment setup steps
- Deployment commands
- Rollback procedures
- Secret management approach

---

### 10. Database Ops Specialist

**Purpose**: Database design, migrations, and optimization

**When to Use**:
- Designing database schemas
- Creating migrations
- Optimizing queries

**Test Prompt**:
```
Invoke Database Ops Specialist to design invoices table schema:
- User relationship
- Invoice items (line items)
- Payment status tracking
- Timestamps and audit fields
- Indexes for common queries
```

**Expected Output**:
- SQL schema definition
- Alembic migration script
- Index strategy
- Query examples
- Performance considerations

---

## 📝 Documentation Agents

### 11. Tech Docs Writer

**Purpose**: Create technical documentation

**When to Use**:
- Documenting APIs
- Writing guides and tutorials
- Creating README files

**Test Prompt**:
```
Invoke Tech Docs Writer to document /v1/auth/register endpoint:
- Description
- Request parameters
- Response format
- Error codes
- Code examples (cURL, TypeScript, Python)
```

**Expected Output**:
- Markdown documentation
- Complete API reference
- Usage examples
- Common scenarios
- Troubleshooting section

---

### 12. DX Optimizer

**Purpose**: Improve developer experience and workflows

**When to Use**:
- Simplifying complex processes
- Creating developer tools
- Improving onboarding

**Test Prompt**:
```
Invoke DX Optimizer to improve local development setup:
- Reduce steps from 15 to <5
- Automate environment configuration
- Provide clear error messages
- Create getting-started script
```

**Expected Output**:
- Simplified setup script
- Updated documentation
- Error message improvements
- Developer feedback survey
- Onboarding checklist

---

## 🎯 Using Multiple Agents (Sequential)

For complex tasks, invoke agents sequentially:

```
1. Invoke Explore Agent to understand existing codebase
2. Invoke Plan Agent to break down implementation
3. Invoke Backend API Architect to design endpoints
4. Invoke TDD Developer to implement with tests
5. Invoke Security Engineer to audit implementation
6. Invoke Tech Docs Writer to document the feature
```

**Expected Flow**:
- Each agent builds on previous agent's output
- Maintain context between invocations
- Final result is comprehensive and well-tested

---

## 📊 Testing Evaluation

### Success Criteria

For each persona test:

✅ **Correct Specialization**: Output matches persona expertise
✅ **Code Quality**: Follows AINative standards
✅ **Completeness**: Addresses all prompt requirements
✅ **Actionable**: Can be directly implemented/used
✅ **Standards Compliance**: Uses ZeroDB, follows patterns

### Failure Indicators

❌ Persona provides generic instead of specialized advice
❌ Output violates AINative coding standards
❌ Missing critical components (tests, types, security)
❌ Suggests external tools over AINative ecosystem
❌ No GitHub issue integration mentioned

---

## 🔄 Persona Switching Best Practices

**DO**:
- Clearly indicate persona transition
- Provide context from previous persona
- Specify expected output format
- Validate each persona's output before proceeding

**DON'T**:
- Mix multiple personas in single request without structure
- Assume personas share context automatically
- Skip validation between persona transitions
- Forget to specify expertise level needed

---

## 📝 Feedback Template

When testing personas, document:

```markdown
**Persona Tested**: [Name]
**Test Prompt**: [Your prompt]
**Expected Outcome**: [What you expected]
**Actual Outcome**: [What happened]
**Issues Found**: [Any problems]
**Suggestions**: [Improvements]
**Overall Rating**: [1-5 stars]
```

Submit to: `#ainative-cody-testing` Slack channel

---

## 🔗 Related Resources

- **Main Testing Guide**: `.ainative/METAPROMPT_TESTING_GUIDE.md`
- **All 25 Personas**: `/tmp/agentic-rules/Agent-Personas.md` (full reference)
- **Project Standards**: `.ainative/CODY.md`
- **Prompt Library**: `.ainative/PROMPT_LIBRARY_TEST.md`

---

**Status**: Active Testing | **Confidentiality**: AINative Internal Only

Built by AINative Dev Team
All Data Services Built on ZeroDB

# AIN

ative Prompt Library - Testing Version

**Version**: 1.0-test
**Date**: 2025-12-29
**Purpose**: Ready-to-use prompts for testing Cody
**Audience**: AINative Internal Team Only

---

## 📚 Overview

This library contains **battle-tested prompts** for common development scenarios at AINative. Copy and customize these prompts to test Cody's capabilities.

### Prompt Categories

1. **Feature Development** - Building new features
2. **Code Quality** - Reviews and refactoring
3. **Testing** - Test generation and TDD
4. **Architecture** - System design decisions
5. **DevOps** - Deployment and infrastructure
6. **Documentation** - API docs and guides

---

## 🚀 Feature Development Prompts

### New Feature with TDD

```
Implement [FEATURE_NAME] following strict TDD workflow:

REQUIREMENTS:
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

WORKFLOW:
1. Create GitHub issue for tracking
2. Generate failing tests first (Red)
3. Implement minimal code to pass (Green)
4. Refactor for quality
5. Annotate progress via MCP

DELIVERABLES:
- Test suite (≥80% coverage)
- Implementation code
- API documentation
- GitHub issue updated

USE:
- ZeroDB for data storage
- TypeScript with full type annotations
- FastAPI for backend endpoints
```

### API Endpoint Design

```
Design REST API endpoint for [FEATURE]:

ENDPOINT: [HTTP_METHOD] /v1/[resource]/[action]

REQUIREMENTS:
- Authentication: [Bearer token/API key]
- Rate limiting: [X requests per minute]
- Pagination: [Yes/No]
- Filtering: [By what fields]

SCHEMAS:
- Request: [Describe expected input]
- Response: [Describe expected output]
- Errors: [List error codes]

IMPLEMENTATION:
- Use Pydantic models for validation
- Store data in ZeroDB
- Include comprehensive error handling
- Add OpenAPI documentation
```

### Database Schema Design

```
Design database schema for [ENTITY]:

REQUIREMENTS:
- Fields: [List required fields with types]
- Relationships: [Related entities]
- Indexes: [Common query patterns]
- Constraints: [Unique, not null, etc.]

IMPLEMENTATION:
- Create Alembic migration
- Add SQLAlchemy model
- Include timestamps and audit fields
- Add organization_id for multi-tenancy
- Optimize indexes for performance

QUERIES:
- [List common queries to optimize for]
```

---

## ✅ Code Quality Prompts

### Code Review

```
Review the following code against AINative standards:

[PASTE CODE HERE]

CHECK FOR:
1. Naming conventions (camelCase/PascalCase/UPPER_SNAKE_CASE)
2. Type annotations (TypeScript/Python)
3. Error handling and edge cases
4. Security vulnerabilities
5. Performance considerations
6. ZeroDB usage where applicable
7. Test coverage
8. Documentation/comments

PROVIDE:
- Specific line-by-line feedback
- Security risk assessment
- Refactoring suggestions
- Code examples for improvements
```

### Refactoring Legacy Code

```
Refactor this legacy code to modern AINative standards:

[PASTE CODE HERE]

IMPROVEMENTS NEEDED:
1. Extract duplicated logic into helper functions
2. Add full type annotations
3. Improve error handling
4. Add input validation
5. Update to use async/await
6. Simplify nested conditionals
7. Add comprehensive docstrings
8. Ensure security best practices

PRESERVE:
- Existing functionality
- Public API contracts
- Performance characteristics
```

### Security Audit

```
Perform security audit on this code:

[PASTE CODE HERE]

AUDIT FOR:
1. SQL injection vulnerabilities
2. XSS attack vectors
3. CSRF protection
4. Authentication/authorization bypass
5. Sensitive data exposure
6. Insecure dependencies
7. Rate limiting gaps
8. Input validation issues

PROVIDE:
- Risk severity (Critical/High/Medium/Low)
- Exploit scenarios
- Remediation code examples
- Security checklist
```

---

## 🧪 Testing Prompts

### Generate Unit Tests

```
Generate comprehensive unit tests for this function:

[PASTE FUNCTION CODE]

REQUIREMENTS:
- Use [Jest/pytest] framework
- BDD style (describe/it or scenario/given/when/then)
- Test happy path
- Test edge cases
- Test error conditions
- Mock external dependencies
- Achieve ≥90% code coverage

STRUCTURE:
- Clear test names describing behavior
- Arrange-Act-Assert pattern
- Independent tests (no shared state)
- Fast execution (< 100ms per test)
```

### Integration Test Suite

```
Create integration test suite for [FEATURE]:

COMPONENTS TO TEST:
- Frontend: [Component names]
- Backend: [API endpoints]
- Database: [Tables/queries]
- External APIs: [Services]

TEST SCENARIOS:
1. [Scenario 1 - happy path]
2. [Scenario 2 - error handling]
3. [Scenario 3 - edge case]

SETUP:
- Use in-memory database or fixtures
- Mock external API calls
- Set up test users and data
- Clean up after each test

ASSERTIONS:
- HTTP status codes
- Response payloads
- Database state changes
- Side effects (emails, webhooks, etc.)
```

### End-to-End Test

```
Create E2E test for user flow: [FLOW_DESCRIPTION]

USER STORY:
As a [user type]
I want to [action]
So that [benefit]

STEPS:
1. [Step 1]
2. [Step 2]
3. [Step 3]

TEST USING:
- [Playwright/Cypress] for browser automation
- Real database (test environment)
- Actual API calls (staging environment)

VERIFY:
- UI elements appear correctly
- Data persists in database
- Emails/notifications sent
- State transitions properly
```

---

## 🏗️ Architecture Prompts

### System Design

```
Design system architecture for [SYSTEM]:

REQUIREMENTS:
- Expected load: [requests per second]
- Data volume: [GB/TB]
- Latency target: [ms]
- Availability: [%]

COMPONENTS:
- Frontend: [Technology]
- Backend: [Technology]
- Database: ZeroDB
- Cache: Redis
- Queue: Celery
- Gateway: Kong

DESIGN FOR:
- Scalability (horizontal/vertical)
- Fault tolerance
- Security
- Monitoring and logging
- Cost optimization

DELIVERABLES:
- Architecture diagram
- Component descriptions
- Data flow diagrams
- Technology justifications
- Deployment strategy
```

### Microservice Decomposition

```
Decompose monolith into microservices for [DOMAIN]:

CURRENT MONOLITH:
- [Describe current architecture]
- [Pain points]
- [Coupling issues]

PROPOSED SERVICES:
For each service:
1. Service name and responsibility
2. API contracts
3. Data ownership
4. Dependencies
5. Deployment unit

MIGRATION STRATEGY:
- Strangler fig pattern steps
- Data migration approach
- Zero-downtime deployment
- Rollback procedures
```

---

## 🚢 DevOps Prompts

### CI/CD Pipeline

```
Create GitHub Actions workflow for [PROJECT]:

TRIGGERS:
- Pull request to develop/main
- Push to develop/main
- Manual dispatch

JOBS:
1. Lint and format check
2. Type checking
3. Unit tests
4. Integration tests
5. Security scanning
6. Build Docker image
7. Deploy to [staging/production]
8. Smoke tests

REQUIREMENTS:
- Fail fast on errors
- Parallel job execution where possible
- Artifact caching for speed
- Secrets management
- Deployment rollback on failure

OUTPUT: Complete .github/workflows/[name].yml file
```

### Infrastructure as Code

```
Create Terraform configuration for [INFRASTRUCTURE]:

RESOURCES NEEDED:
- [Resource 1]
- [Resource 2]
- [Resource 3]

REQUIREMENTS:
- Environment separation (dev/staging/prod)
- Secure secrets management
- Resource tagging for cost tracking
- Backup and disaster recovery
- Monitoring and alerts

STRUCTURE:
- modules/ for reusable components
- environments/ for environment-specific configs
- variables.tf for parameterization
- outputs.tf for resource references
```

### Deployment Strategy

```
Design blue-green deployment strategy for [SERVICE]:

CURRENT STATE:
- Deployment method: [description]
- Downtime: [minutes]
- Rollback time: [minutes]

BLUE-GREEN REQUIREMENTS:
- Zero-downtime deployment
- Instant rollback capability
- Health checks before traffic switch
- Database migration handling
- Feature flag integration

STEPS:
1. Deploy green environment
2. Run smoke tests
3. Switch traffic percentage [10%/50%/100%]
4. Monitor metrics
5. Full switch or rollback

TOOLING: [Railway/AWS/Kubernetes]
```

---

## 📖 Documentation Prompts

### API Documentation

```
Generate comprehensive API documentation for:

ENDPOINT: [METHOD] /v1/[path]

INCLUDE:
1. Description and purpose
2. Authentication requirements
3. Request parameters (path/query/body)
4. Request examples (cURL, JavaScript, Python)
5. Response format (success and error)
6. Status codes and meanings
7. Rate limiting information
8. Common error scenarios

FORMAT: OpenAPI 3.0 specification + Markdown
```

### Feature Guide

```
Write user-facing guide for [FEATURE]:

AUDIENCE: [developers/end-users]

STRUCTURE:
1. Overview - what is it and why use it
2. Quick start - minimal example
3. Detailed guide - comprehensive usage
4. API reference - all options
5. Examples - common scenarios
6. Troubleshooting - FAQ and known issues

STYLE:
- Clear and concise
- Code examples for every concept
- Screenshots where helpful
- Step-by-step instructions
```

---

## 🎯 Testing These Prompts

### Evaluation Checklist

For each prompt you test:

- [ ] Cody provides relevant, accurate output
- [ ] Output follows AINative coding standards
- [ ] All specified requirements addressed
- [ ] Code/configuration is ready to use
- [ ] Includes proper error handling
- [ ] Security considerations included
- [ ] Tests included where applicable
- [ ] Documentation is clear

### Customization Tips

1. **Be Specific**: Replace [PLACEHOLDERS] with actual values
2. **Add Context**: Include relevant codebase details
3. **Set Constraints**: Specify technology choices explicitly
4. **Define Success**: State what "done" looks like
5. **Request Format**: Specify desired output format

---

## 🔄 Combining Prompts

Many tasks require multiple prompts in sequence:

**Example: Complete Feature Development**

```
# Step 1: Design
[Use "API Endpoint Design" prompt]

# Step 2: Implement
[Use "New Feature with TDD" prompt]

# Step 3: Review
[Use "Code Review" prompt]

# Step 4: Deploy
[Use "CI/CD Pipeline" prompt]

# Step 5: Document
[Use "API Documentation" prompt]
```

---

## 📝 Customizing Prompts

### Template Variables

Replace these in any prompt:

- `[FEATURE_NAME]` - Name of feature
- `[HTTP_METHOD]` - GET, POST, PUT, DELETE
- `[ENTITY]` - Database entity name
- `[PROJECT]` - Project name
- `[SERVICE]` - Microservice name
- `[ENVIRONMENT]` - dev, staging, production

### Adding Your Own

Create custom prompts following this pattern:

```
[ACTION VERB] [WHAT] for [CONTEXT]:

REQUIREMENTS:
- [Requirement 1]
- [Requirement 2]

CONSTRAINTS:
- [Constraint 1]
- [Constraint 2]

DELIVERABLES:
- [Deliverable 1]
- [Deliverable 2]

STANDARDS:
- Use AINative coding conventions
- Follow security best practices
- Include tests
- Document public APIs
```

---

## 🔗 Related Resources

- **Testing Guide**: `.ainative/METAPROMPT_TESTING_GUIDE.md`
- **Agent Personas**: `.ainative/AGENT_PERSONAS_TEST.md`
- **Project Standards**: `.ainative/CODY.md`
- **Full Prompt Library**: `/tmp/agentic-rules/Agentic-Prompts-Library.md`

---

**Status**: Active Testing | **Confidentiality**: AINative Internal Only

Built by AINative Dev Team
All Data Services Built on ZeroDB

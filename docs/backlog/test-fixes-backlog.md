# OpenCap Test Failures Backlog

**Date:** March 28, 2025  
**Project:** OpenCap Stack  
**Priority:** Critical

This document contains backlog items for addressing test failures, prioritized in order of criticality to prevent system breakages. All items follow the Semantic Seed Venture Studio Coding Standards V2.0 and OpenCap's naming conventions.

## Highest Priority (P0) - Infrastructure & Database

### [Bug] OCDI-301: Fix MongoDB Connection Timeout Issues
**Story Points:** 3  
**Acceptance Criteria:**
- Increase connection timeout in test environment from 10000ms to 30000ms
- Implement connection retry logic with exponential backoff
- Add proper database teardown between test suites
- Ensure all SPVAsset tests pass without timeout errors
- Update Docker compose configuration for MongoDB test container

### [Chore] OCDI-302: Optimize Docker Test Environment Configuration
**Story Points:** 2  
**Acceptance Criteria:**
- Increase memory allocation for MongoDB container to minimum 1GB
- Implement proper health checks before test execution starts
- Update `docker-compose.test.yml` with appropriate wait conditions
- Add container readiness probe before test initialization
- Document Docker setup requirements in project README

### ✅ [Bug] OCDI-303: Fix Database Cleanup Between Test Suites
**Status:** Completed March 29, 2025  
**Story Points:** 2  
**Acceptance Criteria:**
- Create global test teardown that properly cleans collections ✅
- Implement isolated test database for each test suite ✅
- Add transaction rollback for integration tests where applicable ✅
- Ensure database state is reset between test runs ✅
- Add logging for database connection status ✅

## High Priority (P1) - Authentication & Security

### [Bug] OCAE-205: Fix User Authentication Test Failures
**Story Points:** 3  
**Acceptance Criteria:**
- Resolve JWT configuration issues in test environment
- Fix token validation in authentication middleware
- Correctly mock JWT verification in unit tests
- Ensure user sessions are properly terminated between tests
- Update authentication test setup/teardown procedures

### [Bug] OCAE-206: Fix Permission & Role-Based Access Control Tests
**Story Points:** 2  
**Acceptance Criteria:**
- Correct RBAC middleware implementation in tests
- Fix role assignment for test users
- Ensure permission checks work correctly in test environment
- Mock authentication properly for controller tests
- Update RBAC test documentation

### [Bug] OCAE-207: Fix Password Reset Flow Tests
**Story Points:** 2  
**Acceptance Criteria:**
- Fix email sending mocks in password reset tests
- Resolve token generation issues in test environment
- Ensure proper cleanup of reset tokens between tests
- Add validation for reset flow edge cases
- Update password policy enforcement tests

## Medium Priority (P2) - Core Business Logic

### [Bug] OCDI-304: Fix SPV Asset Model Validation
**Story Points:** 2  
**Acceptance Criteria:**
- Fix SPV asset validation logic
- Ensure proper error handling for invalid assets
- Correct MongoDB schema validation in test environment
- Update test fixtures for SPV assets
- Add tests for additional validation edge cases

### [Bug] OCAE-208: Fix Financial Report Generation Tests
**Story Points:** 3  
**Acceptance Criteria:**
- Resolve PDF generation mocking issues
- Fix data aggregation for financial reports
- Ensure clean separation between test environments
- Update test fixtures for financial reporting
- Improve test coverage for edge cases

### [Chore] OCDI-305: Implement Proper Database Seeding for Tests
**Story Points:** 2  
**Acceptance Criteria:**
- Create reusable test data seeding functions
- Implement fixtures for common test scenarios
- Add dataset versioning for test data
- Document test data structure
- Ensure idempotent seeding operations

## Lower Priority (P3) - Integration & Edge Cases

### [Bug] OCAE-209: Fix Cross-Component Integration Tests
**Story Points:** 3  
**Acceptance Criteria:**
- Resolve component dependency issues in integration tests
- Fix service initialization order
- Implement proper mocking for external services
- Ensure stateless tests where possible
- Add integration test documentation

### [Chore] OCDI-306: Implement Test Isolation Framework
**Story Points:** 3  
**Acceptance Criteria:**
- Create framework for isolated test execution
- Implement database namespacing for parallel test runs
- Add test dependency resolution
- Enable selective test execution
- Document test isolation patterns

### [Bug] OCAE-210: Fix Edge Case Test Failures
**Story Points:** 2  
**Acceptance Criteria:**
- Address timeout issues in long-running tests
- Fix race conditions in async tests
- Resolve null/undefined handling edge cases
- Add robustness to date/time dependent tests
- Implement error boundary tests

## Implementation Notes

### Test Fix Workflow

Following the Semantic Seed TDD workflow for each story:

1. **Red Phase**:
   - Create a WIP commit showing the failing tests
   - Document the exact error and steps to reproduce

2. **Green Phase**:
   - Implement fixes to make tests pass
   - Create WIP commits as progress is made
   - Ensure test coverage is maintained or improved

3. **Refactor Phase**:
   - Clean up test code for maintainability
   - Ensure consistency with coding standards
   - Document any changes to testing patterns

### Branching Strategy

- Create branches following the convention: `bug/OCDI-30X` or `chore/OCAE-20X`
- All commits should include the ticket ID prefix
- Daily WIP commits required, even for incomplete work

### Definition of Done

- All tests must pass
- Coverage thresholds met:
  - Controllers: 85% (statements, lines, functions)
  - Models: 90% (statements, lines, functions)
- PR reviewed with story ID in title
- Story details included in PR description

### Team Assignment Recommendations

**Database Team:**
- OCDI-301, OCDI-302, OCDI-303 ✅

**Auth Team:**
- OCAE-205, OCAE-206, OCAE-207

**Business Logic Team:**
- OCDI-304, OCAE-208, OCDI-305

**Integration Team:**
- OCAE-209, OCDI-306, OCAE-210

---

*This backlog follows Semantic Seed Venture Studio Coding Standards V2.0*

/**
 * Script to add test fix backlog items to Shortcut
 * Following Semantic Seed Venture Studio Coding Standards
 */
const shortcutApi = require('./shortcut-api');
require('dotenv').config();

// ID for "Backlog" workflow state
const BACKLOG_STATE_ID = 500000006;

// Test Fix Epic ID (create an epic first or use an existing one)
const TEST_FIX_EPIC_ID = null; // Set to null to create stories without an epic

async function addTestFixesBacklog() {
  try {
    console.log('Adding test fixes backlog items to Shortcut...');
    
    // Highest Priority (P0) - Infrastructure & Database
    const p0Stories = [
      {
        name: '[Bug] OCDI-301: Fix MongoDB Connection Timeout Issues',
        description: `## Story Points: 3

## Acceptance Criteria:
- Increase connection timeout in test environment from 10000ms to 30000ms
- Implement connection retry logic with exponential backoff
- Add proper database teardown between test suites
- Ensure all SPVAsset tests pass without timeout errors
- Update Docker compose configuration for MongoDB test container

## Priority: P0 (Highest) - Infrastructure & Database

## TDD Workflow:
1. **Red Phase**: Create a WIP commit showing the failing tests with timeout errors
2. **Green Phase**: Implement fixes to make tests pass, focusing on MongoDB connection handling
3. **Refactor Phase**: Ensure all SPV Asset tests are passing consistently

## Related Components:
- MongoDB connection configuration
- Test environment setup
- Docker container configuration`,
        type: 'bug'
      },
      {
        name: '[Chore] OCDI-302: Optimize Docker Test Environment Configuration',
        description: `## Story Points: 2

## Acceptance Criteria:
- Increase memory allocation for MongoDB container to minimum 1GB
- Implement proper health checks before test execution starts
- Update \`docker-compose.test.yml\` with appropriate wait conditions
- Add container readiness probe before test initialization
- Document Docker setup requirements in project README

## Priority: P0 (Highest) - Infrastructure & Database

## TDD Workflow:
1. **Red Phase**: Document the current configuration and issues
2. **Green Phase**: Implement the container configuration improvements
3. **Refactor Phase**: Ensure test environment starts consistently

## Related Components:
- Docker configuration
- Test environment scripts
- CI/CD pipeline`,
        type: 'chore'
      },
      {
        name: '[Bug] OCDI-303: Fix Database Cleanup Between Test Suites',
        description: `## Story Points: 2

## Acceptance Criteria:
- Create global test teardown that properly cleans collections
- Implement isolated test database for each test suite
- Add transaction rollback for integration tests where applicable
- Ensure database state is reset between test runs
- Add logging for database connection status

## Priority: P0 (Highest) - Infrastructure & Database

## TDD Workflow:
1. **Red Phase**: Document test failures caused by database state leakage
2. **Green Phase**: Implement proper cleanup between test runs
3. **Refactor Phase**: Ensure all tests can run in sequence without interference

## Related Components:
- Test setup/teardown scripts
- Database utility functions
- Integration test framework`,
        type: 'bug'
      }
    ];
    
    // High Priority (P1) - Authentication & Security
    const p1Stories = [
      {
        name: '[Bug] OCAE-205: Fix User Authentication Test Failures',
        description: `## Story Points: 3

## Acceptance Criteria:
- Resolve JWT configuration issues in test environment
- Fix token validation in authentication middleware
- Correctly mock JWT verification in unit tests
- Ensure user sessions are properly terminated between tests
- Update authentication test setup/teardown procedures

## Priority: P1 (High) - Authentication & Security

## TDD Workflow:
1. **Red Phase**: Identify specific authentication test failures
2. **Green Phase**: Fix JWT validation and user session handling
3. **Refactor Phase**: Create reusable authentication test helpers

## Related Components:
- Authentication middleware
- JWT configuration
- User session management`,
        type: 'bug'
      },
      {
        name: '[Bug] OCAE-206: Fix Permission & Role-Based Access Control Tests',
        description: `## Story Points: 2

## Acceptance Criteria:
- Correct RBAC middleware implementation in tests
- Fix role assignment for test users
- Ensure permission checks work correctly in test environment
- Mock authentication properly for controller tests
- Update RBAC test documentation

## Priority: P1 (High) - Authentication & Security

## TDD Workflow:
1. **Red Phase**: Document failing RBAC test cases
2. **Green Phase**: Fix permission checks and role assignments
3. **Refactor Phase**: Improve RBAC testing framework

## Related Components:
- RBAC middleware
- Permission validation
- User roles configuration`,
        type: 'bug'
      },
      {
        name: '[Bug] OCAE-207: Fix Password Reset Flow Tests',
        description: `## Story Points: 2

## Acceptance Criteria:
- Fix email sending mocks in password reset tests
- Resolve token generation issues in test environment
- Ensure proper cleanup of reset tokens between tests
- Add validation for reset flow edge cases
- Update password policy enforcement tests

## Priority: P1 (High) - Authentication & Security

## TDD Workflow:
1. **Red Phase**: Identify specific password reset test failures
2. **Green Phase**: Fix token generation and validation
3. **Refactor Phase**: Create reliable email mocking patterns

## Related Components:
- Password reset controllers
- Email service
- Security token management`,
        type: 'bug'
      }
    ];
    
    // Medium Priority (P2) - Core Business Logic
    const p2Stories = [
      {
        name: '[Bug] OCDI-304: Fix SPV Asset Model Validation',
        description: `## Story Points: 2

## Acceptance Criteria:
- Fix SPV asset validation logic
- Ensure proper error handling for invalid assets
- Correct MongoDB schema validation in test environment
- Update test fixtures for SPV assets
- Add tests for additional validation edge cases

## Priority: P2 (Medium) - Core Business Logic

## TDD Workflow:
1. **Red Phase**: Document validation test failures
2. **Green Phase**: Fix validation logic and error handling
3. **Refactor Phase**: Improve test coverage for validation edge cases

## Related Components:
- SPV Asset model
- Validation middleware
- Error handling utilities`,
        type: 'bug'
      },
      {
        name: '[Bug] OCAE-208: Fix Financial Report Generation Tests',
        description: `## Story Points: 3

## Acceptance Criteria:
- Resolve PDF generation mocking issues
- Fix data aggregation for financial reports
- Ensure clean separation between test environments
- Update test fixtures for financial reporting
- Improve test coverage for edge cases

## Priority: P2 (Medium) - Core Business Logic

## TDD Workflow:
1. **Red Phase**: Document PDF generation test failures
2. **Green Phase**: Implement reliable PDF mocking
3. **Refactor Phase**: Create reusable report testing utilities

## Related Components:
- Report generation service
- PDF generation utilities
- Data aggregation logic`,
        type: 'bug'
      },
      {
        name: '[Chore] OCDI-305: Implement Proper Database Seeding for Tests',
        description: `## Story Points: 2

## Acceptance Criteria:
- Create reusable test data seeding functions
- Implement fixtures for common test scenarios
- Add dataset versioning for test data
- Document test data structure
- Ensure idempotent seeding operations

## Priority: P2 (Medium) - Core Business Logic

## TDD Workflow:
1. **Red Phase**: Document current seeding inconsistencies
2. **Green Phase**: Implement improved seeding framework
3. **Refactor Phase**: Convert existing tests to use new seeding utilities

## Related Components:
- Test fixtures
- Database utilities
- Test helper functions`,
        type: 'chore'
      }
    ];
    
    // Lower Priority (P3) - Integration & Edge Cases
    const p3Stories = [
      {
        name: '[Bug] OCAE-209: Fix Cross-Component Integration Tests',
        description: `## Story Points: 3

## Acceptance Criteria:
- Resolve component dependency issues in integration tests
- Fix service initialization order
- Implement proper mocking for external services
- Ensure stateless tests where possible
- Add integration test documentation

## Priority: P3 (Lower) - Integration & Edge Cases

## TDD Workflow:
1. **Red Phase**: Document integration test failures
2. **Green Phase**: Fix component dependencies and mocking
3. **Refactor Phase**: Improve test isolation and documentation

## Related Components:
- Integration test framework
- Service initialization
- External service mocking`,
        type: 'bug'
      },
      {
        name: '[Chore] OCDI-306: Implement Test Isolation Framework',
        description: `## Story Points: 3

## Acceptance Criteria:
- Create framework for isolated test execution
- Implement database namespacing for parallel test runs
- Add test dependency resolution
- Enable selective test execution
- Document test isolation patterns

## Priority: P3 (Lower) - Integration & Edge Cases

## TDD Workflow:
1. **Red Phase**: Document test interference patterns
2. **Green Phase**: Implement isolation framework
3. **Refactor Phase**: Migrate existing tests to use isolation framework

## Related Components:
- Test runner configuration
- Database namespacing
- Test dependency management`,
        type: 'chore'
      },
      {
        name: '[Bug] OCAE-210: Fix Edge Case Test Failures',
        description: `## Story Points: 2

## Acceptance Criteria:
- Address timeout issues in long-running tests
- Fix race conditions in async tests
- Resolve null/undefined handling edge cases
- Add robustness to date/time dependent tests
- Implement error boundary tests

## Priority: P3 (Lower) - Integration & Edge Cases

## TDD Workflow:
1. **Red Phase**: Document edge case failures
2. **Green Phase**: Fix timeout and race condition issues
3. **Refactor Phase**: Implement robust test patterns for edge cases

## Related Components:
- Async test utilities
- Test timeout configuration
- Error boundary testing`,
        type: 'bug'
      }
    ];
    
    // Combine all stories
    const allStories = [...p0Stories, ...p1Stories, ...p2Stories, ...p3Stories];
    
    // Create each story
    for (const story of allStories) {
      await shortcutApi.createStory({
        name: story.name,
        description: story.description,
        type: story.type,
        workflowStateId: BACKLOG_STATE_ID,
        epicId: TEST_FIX_EPIC_ID
      });
    }
    
    console.log(`✅ Successfully added ${allStories.length} test fix backlog items to Shortcut`);
  } catch (error) {
    console.error('❌ Error adding test fixes backlog:', error);
    process.exit(1);
  }
}

// Execute the main function
addTestFixesBacklog().catch(error => {
  console.error('Script execution failed:', error);
  process.exit(1);
});

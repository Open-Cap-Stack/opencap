# OCDI-303: Fix User Authentication Test Failures

## Test Coverage Analysis

After multiple testing iterations, we've identified specific issues:

1. **Controllers Coverage**: Currently at ~14% (target: 85%)
   - `authController.js`: Most methods have insufficient coverage

2. **Models Coverage**: Currently at ~60% (target: 90%)
   - `User.js`: Key methods and branches need additional testing

3. **Test Configuration Issues**:
   - Database connection issues between test files
   - Inconsistent mocking approaches
   - API route errors in some tests

## API Endpoint Validation Results

Tested all API endpoints and found several routing issues:

1. **Route Loading Issues**:
   - SPV Routes: Fixed by changing from `safeRequire` to direct `require`
   - Compliance Check Routes: Fixed by changing from `safeRequire` to direct `require`
   - Communication Routes: Fixed by changing from `safeRequire` to direct `require`
   - Notification Routes: Fixed by using correct filename and direct `require`
   - Share Classes Routes: Fixed by providing fallback to v1 routes

2. **Route Path Structure Issues**:
   - Document Routes: Fixed by removing duplicate path prefix (`/documents`)
   - Fundraising Routes: Fixed by removing duplicate path prefix (`/fundraising-rounds`)
   - Equity Plan Routes: Fixed by removing duplicate path prefix (`/equity-plans`)
   - Document Embedding Routes: Fixed by removing duplicate path prefix (`/document-embeddings`)
   - Integration Routes: Fixed by removing duplicate path prefix
   - Invite Management Routes: Fixed by removing path prefix and using correct filename

3. **Implementation Errors**:
   - SPV Asset Routes: Fixed by adding the missing `getSPVAssetModel` function
   - Tax Calculator Routes: Fixed by updating the path from `taxCalculatorRoutes.js` to `TaxCalculator.js`

## TDD Workflow Progress

Following OpenCap's TDD workflow:

### WIP: Red Tests
- Created baseline test files:
  - `registration.test.js` - Basic registration flow
  - `login.test.js` - Login functionality
  - `verification.test.js` - Email verification

### WIP: Green Tests
- Created more comprehensive tests:
  - `final-coverage.test.js` - Consolidated approach
  - `complete-controller.test.js` - Direct controller methods
- Fixed API endpoint routing issues to enable proper testing

### Remaining Work for READY: Refactor Complete
1. Fix database connection issues between test files
2. Update mock implementations to be consistent
3. Create specific tests for high-priority coverage gaps:
   - `authController.verifyEmail`
   - `authController.resetPassword`
   - `User` model validation methods

## Recommended Actions

1. Update the test environment configuration
2. Create a dedicated test for model methods only
3. Use a phased test approach:
   - Run individual tests first
   - Then run combined tests with detailed coverage reports

## Semantic Seed Guidelines Application

- Branch naming: `bug/OCDI-303`
- Commit format: `OCDI-303: Fix User Authentication Test Failures`
- Pull request title: `[Bug] OCDI-303: Fix User Authentication Test Failures`

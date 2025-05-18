# Auth Controller Test Failures Analysis
*Following OpenCap TDD principles and Semantic Seed standards v2.0*

## Test Status Summary

We've identified several specific mismatches between tests and implementations:

1. **Response Message Differences**:
   - Test expects "Password is required" but implementation returns a different message
   - Test expects "Invalid email or password" but implementation returns "Invalid credentials"
   - Tests expect status 400 for some cases where implementation returns 500

2. **Mock Function Call Issues**:
   - Some mocks like `User.findOne` aren't being called as expected
   - OAuth login tests have several mock verification failures

3. **Coverage Issues**:
   - authController.js: 51.57% statements (target: 85%)
   - Low branch coverage: 44.87% (target: 75%)
   - Several uncovered code paths, particularly in OAuth functionality

## Recommended Fix Approach

Following OpenCap's TDD workflow stages:

### 1. WIP: Red Tests
- ✅ We have failing tests that identify issues

### 2. WIP: Green Tests
- 🔄 Fix response messages in authController.js to match test expectations
- 🔄 Update OAuth implementation to correctly call User.findOne
- 🔄 Fix error handling to use consistent status codes

### 3. READY: Refactor Complete
- 🔄 Add missing test cases for uncovered code paths
- 🔄 Ensure consistent error handling across all methods
- 🔄 Document API responses for authentication endpoints

## Next Steps

1. Analyze specific implementation in authController.js
2. Make targeted fixes to get tests passing
3. Add missing test cases for better coverage
4. Document all authentication API responses in Swagger/OpenAPI docs

*This approach follows Semantic Seed's test-driven development standards while addressing the specific issues in the OpenCap API authentication system.*

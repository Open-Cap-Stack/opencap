/**
 * Authentication Test Utilities
 * Created for: [Bug] OCDI-301: Fix MongoDB Connection Timeout Issues 
 * 
 * Provides consistent JWT test token generation and authentication mocking
 * Following Semantic Seed Venture Studio Coding Standards
 */
const jwt = require('jsonwebtoken');

// Default JWT secret for tests
const TEST_JWT_SECRET = 'test-jwt-secret-for-opencap-tests';

/**
 * Generate a valid test JWT token with specified roles
 * @param {Object} userData - User data to include in the token
 * @param {Array} roles - Roles to assign to the user
 * @returns {string} - Signed JWT token
 */
function generateTestToken(userData = {}, roles = ['Admin']) {
  // Default test user
  const defaultUser = {
    id: 'test-user-id',
    email: 'admin@test.com',
  };
  
  const payload = {
    ...defaultUser,
    ...userData,
    roles,
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET || TEST_JWT_SECRET, { expiresIn: '1h' });
}

/**
 * Mock the JWT authentication middleware for testing
 * @returns {Object} - Mock implementation of the authentication middleware
 */
function mockJwtAuth() {
  return {
    authenticate: jest.fn((req, res, next) => {
      // Set mock user with admin role by default
      req.user = {
        id: 'test-user-id',
        email: 'admin@test.com',
        roles: ['Admin']
      };
      next();
    }),
    authenticateRole: jest.fn(() => (req, res, next) => {
      next();
    })
  };
}

/**
 * Set up authentication headers for supertest requests
 * @param {Object} request - Supertest request object
 * @param {Object} userData - User data to include in the token
 * @param {Array} roles - Roles to assign to the user
 * @returns {Object} - Supertest request with auth headers
 */
function withAuthentication(request, userData = {}, roles = ['Admin']) {
  const token = generateTestToken(userData, roles);
  return request.set('Authorization', `Bearer ${token}`);
}

module.exports = {
  generateTestToken,
  mockJwtAuth,
  withAuthentication,
  TEST_JWT_SECRET
};

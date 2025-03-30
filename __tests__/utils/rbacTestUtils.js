/**
 * RBAC Test Utilities
 * [Bug] OCAE-206: Fix Permission & Role-Based Access Control Tests
 * 
 * Utilities for testing RBAC functionality with different user roles and permissions
 * following Semantic Seed BDD testing standards.
 */

const jwt = require('jsonwebtoken');
const { rolePermissions } = require('../../middleware/rbacMiddleware');

/**
 * Generate a test JWT token with proper role and permissions
 * @param {Object} user - User object with userId, email, role 
 * @param {String} secret - JWT secret (optional)
 * @returns {String} - Signed JWT token
 */
const generateAuthToken = (user, secret = 'testsecret') => {
  // Get permissions for the role
  const rolePerms = user.role && rolePermissions[user.role] 
    ? rolePermissions[user.role] 
    : [];
  
  // Combine explicit permissions with role permissions
  const permissions = [
    ...(user.permissions || []),
    ...rolePerms
  ].filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates
  
  // Create token payload
  const payload = {
    userId: user.userId,
    email: user.email,
    role: user.role,
    permissions: permissions
  };
  
  // Sign and return token
  return jwt.sign(
    payload,
    secret,
    { expiresIn: '1h' }
  );
};

/**
 * Mock the request object for RBAC tests
 * @param {Object} user - User data (role, permissions)
 * @returns {Object} - Mocked request object
 */
const mockRequest = (user = null) => {
  const req = {};
  
  if (user) {
    req.user = {
      userId: user.userId || `test-${Math.random().toString(36).substring(7)}`,
      email: user.email || `test-${Math.random().toString(36).substring(7)}@example.com`,
      role: user.role || 'user',
      permissions: user.permissions || []
    };
    
    if (user.token) {
      req.headers = {
        authorization: `Bearer ${user.token}`
      };
    }
  }
  
  return req;
};

/**
 * Mock the response object for RBAC tests
 * @returns {Object} - Mocked response object with status and json functions
 */
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

module.exports = {
  generateAuthToken,
  mockRequest,
  mockResponse
};

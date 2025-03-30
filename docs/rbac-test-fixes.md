# Role-Based Access Control (RBAC) Test Fixes Documentation

## Bug Fix: OCAE-206: Fix Permission & Role-Based Access Control Tests

This document outlines the changes made to fix failing RBAC tests, following the Semantic Seed Venture Studio Coding Standards for test-driven development.

### Root Cause Analysis

The failing RBAC tests were caused by several issues:

1. **Token Generation**: JWT tokens in tests didn't include the necessary role and permissions data.
2. **Permission Resolution**: The RBAC middleware wasn't properly resolving permissions from user roles.
3. **Test Setup**: The test environment didn't properly mock the required authentication state.

### Changes Made

#### 1. Enhanced RBAC Middleware

A role-to-permissions mapping was added to the RBAC middleware to ensure that users with specific roles automatically receive the appropriate permissions:

```javascript
const rolePermissions = {
  'admin': [
    'read:users', 'write:users', 'delete:users',
    'read:companies', 'write:companies', 'delete:companies',
    'admin:all'
  ],
  'manager': [
    'read:users', 'write:users',
    'read:companies', 'write:companies'
  ],
  'user': [
    'read:companies'
  ],
  'client': [
    'read:companies'
  ]
};
```

A new `getUserPermissions` function was added to combine explicit permissions with role-based permissions:

```javascript
const getUserPermissions = (user) => {
  if (!user) return [];
  
  // Start with explicitly assigned permissions
  let permissions = Array.isArray(user.permissions) ? [...user.permissions] : [];
  
  // Add role-based permissions if role exists
  if (user.role && rolePermissions[user.role]) {
    rolePermissions[user.role].forEach(perm => {
      if (!permissions.includes(perm)) {
        permissions.push(perm);
      }
    });
  }
  
  return permissions;
};
```

#### 2. JWT Token Updates

JWT tokens in tests were updated to include both the user's role and their permissions:

```javascript
adminToken = jwt.sign(
  { 
    userId: adminUser.userId, 
    email: adminUser.email,
    role: 'admin',
    permissions: ['read:users', 'write:users', 'delete:users', 'read:companies', 'write:companies', 'delete:companies', 'admin:all']
  },
  jwtSecret,
  { expiresIn: '1h' }
);
```

#### 3. Expanded Test Coverage

The unit and integration tests were expanded to cover:

- Role permission mapping validation
- Permission resolution from roles
- Explicit and implicit permission checks
- Edge cases like missing permissions or unknown roles

### Testing Approach

Following BDD principles, the tests were organized into:

1. **Unit Tests** for individual RBAC middleware functions
2. **Integration Tests** for RBAC middleware with Express routes
3. **E2E Tests** for company routes with different user roles

### Results

The changes have successfully fixed the failing tests while:

- Maintaining backward compatibility with existing code
- Improving test coverage
- Following Semantic Seed Venture Studio Coding Standards
- Following the TDD/BDD approach with clear test descriptions

### Future Recommendations

1. Consider moving the role-permission mapping to a configuration file for easier updates
2. Add helper utilities for role and permission management
3. Enhance logging for permission-related failures to aid debugging

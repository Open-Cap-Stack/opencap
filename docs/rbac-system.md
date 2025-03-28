# Role-Based Access Control (RBAC) System

**Feature: OCAE-302: Implement role-based access control**

## Overview

The OpenCap RBAC system provides comprehensive access control based on user roles and granular permissions. It follows security best practices and enables fine-grained control over API endpoint access.

## Key Components

### 1. User Roles

The system defines four primary roles with increasing levels of access:

| Role | Description | Use Case |
|------|-------------|----------|
| `client` | Limited access to read-only data | External clients who need limited visibility |
| `user` | Standard user with basic operations | Regular users performing day-to-day operations |
| `manager` | Extended capabilities for management | Team leaders who need broader access |
| `admin` | Full system access | System administrators |

### 2. Permission Structure

Permissions follow the format `action:resource` (e.g., `read:users`, `write:companies`).

#### Standard Actions
- `read`: View resource data
- `write`: Create or update resource data
- `delete`: Remove resource data

#### Standard Resources
- `users`: User accounts
- `companies`: Company profiles
- `reports`: Financial reports
- `spv`: Special Purpose Vehicles
- `assets`: Financial assets
- `compliance`: Compliance checks

#### Special Permissions
- `admin:all`: Super-admin permission that grants access to all operations

### 3. Middleware

Two middleware functions are provided to enforce access control:

#### `hasRole(roles)`
Checks if the user has one of the specified roles.

```javascript
const { hasRole } = require('../middleware/rbacMiddleware');

// Allow only admins
router.get('/admin-only', authenticateToken, hasRole(['admin']), controller.method);

// Allow managers and admins
router.get('/managers', authenticateToken, hasRole(['admin', 'manager']), controller.method);
```

#### `hasPermission(permissions)`
Checks if the user has one of the specified permissions.

```javascript
const { hasPermission } = require('../middleware/rbacMiddleware');

// Require read:users permission
router.get('/users', authenticateToken, hasPermission('read:users'), controller.method);

// Require either delete:companies or admin:all permission
router.delete('/companies/:id', authenticateToken, hasPermission(['delete:companies', 'admin:all']), controller.method);
```

## Implementation Details

### Default Permissions by Role

#### Admin
```javascript
[
  'read:users', 'write:users', 'delete:users',
  'read:companies', 'write:companies', 'delete:companies',
  'read:reports', 'write:reports', 'delete:reports',
  'read:spv', 'write:spv', 'delete:spv',
  'read:assets', 'write:assets', 'delete:assets',
  'read:compliance', 'write:compliance', 'delete:compliance',
  'admin:all'
]
```

#### Manager
```javascript
[
  'read:users', 'write:users',
  'read:companies', 'write:companies',
  'read:reports', 'write:reports',
  'read:spv', 'write:spv',
  'read:assets', 'write:assets',
  'read:compliance', 'write:compliance'
]
```

#### User
```javascript
[
  'read:users',
  'read:companies',
  'read:reports',
  'read:spv',
  'read:assets',
  'read:compliance',
  'write:compliance'
]
```

#### Client
```javascript
[
  'read:users',
  'read:reports',
  'read:spv',
  'read:assets'
]
```

## Authentication Flow

1. User authenticates to receive a JWT token
2. User includes token in the Authorization header of API requests
3. `authenticateToken` middleware verifies the token and loads user data
4. `hasRole` or `hasPermission` middleware checks if the user has required access
5. If access is granted, the request continues; otherwise, a 403 error is returned

## Database Changes

The User model has been enhanced with a permissions array:

```javascript
permissions: {
  type: [String],
  default: function() {
    // Default permissions based on role
    const rolePermissions = {
      admin: [...],
      manager: [...],
      user: [...],
      client: [...]
    };
    
    return rolePermissions[this.role] || [];
  }
}
```

## API Documentation

Comprehensive Swagger documentation is available in `/docs/swagger/rbac.yaml`.

## Migration

A migration script (`20250328000000-add-permissions-to-users.js`) has been created to add appropriate permissions to existing users based on their roles.

## Testing

Comprehensive tests are available in:
- `__tests__/middleware/rbacMiddleware.test.js`: Unit tests for RBAC middleware
- `__tests__/routes/companyRoutes.rbac.test.js`: Integration tests for API endpoints with RBAC

## Security Considerations

1. Always use both authentication (`authenticateToken`) and authorization (`hasRole` or `hasPermission`) middleware
2. Never hardcode role or permission checks in controllers; always use middleware
3. Consider using the principle of least privilege when assigning permissions
4. Regularly audit user roles and permissions

## Future Enhancements

1. Custom permission sets beyond the default role-based ones
2. Time-based access control (permissions that expire)
3. Resource-based access control (e.g., only access companies the user belongs to)
4. Audit logging for permission changes

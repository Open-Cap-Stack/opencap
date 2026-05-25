/**
 * RBAC Middleware Test Suite
 * [Test] Issue #41: Implement Middleware Test Suite
 *
 * Comprehensive tests for Role-Based Access Control middleware
 * Target coverage: 80%+
 */

const {
  checkPermission,
  hasRole,
  hasPermission,
  getUserPermissions,
  rolePermissions
} = require('../../../middleware/rbacMiddleware');

describe('RBAC Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      user: null
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    next = jest.fn();
  });

  describe('rolePermissions', () => {
    it('should define permissions for admin role', () => {
      expect(rolePermissions.admin).toContain('admin:all');
      expect(rolePermissions.admin).toContain('read:users');
      expect(rolePermissions.admin).toContain('write:users');
      expect(rolePermissions.admin).toContain('delete:users');
    });

    it('should define permissions for manager role', () => {
      expect(rolePermissions.manager).toContain('read:users');
      expect(rolePermissions.manager).toContain('write:users');
      expect(rolePermissions.manager).toContain('read:companies');
    });

    it('should define permissions for employee role', () => {
      expect(rolePermissions.employee).toContain('read:companies');
    });

    it('should define permissions for client role', () => {
      expect(rolePermissions.client).toContain('read:companies');
    });
  });

  describe('getUserPermissions', () => {
    it('should return empty array for null user', () => {
      const permissions = getUserPermissions(null);
      expect(permissions).toEqual([]);
    });

    it('should return empty array for undefined user', () => {
      const permissions = getUserPermissions(undefined);
      expect(permissions).toEqual([]);
    });

    it('should return explicit permissions from user', () => {
      const user = {
        permissions: ['custom:permission1', 'custom:permission2']
      };
      const permissions = getUserPermissions(user);
      expect(permissions).toContain('custom:permission1');
      expect(permissions).toContain('custom:permission2');
    });

    it('should return role-based permissions for admin', () => {
      const user = {
        role: 'admin',
        permissions: []
      };
      const permissions = getUserPermissions(user);
      expect(permissions).toContain('admin:all');
      expect(permissions).toContain('read:users');
      expect(permissions).toContain('write:users');
    });

    it('should combine explicit and role-based permissions', () => {
      const user = {
        role: 'employee',
        permissions: ['custom:permission']
      };
      const permissions = getUserPermissions(user);
      expect(permissions).toContain('custom:permission');
      expect(permissions).toContain('read:companies');
    });

    it('should not duplicate permissions', () => {
      const user = {
        role: 'employee',
        permissions: ['read:companies'] // Same as role permission
      };
      const permissions = getUserPermissions(user);
      const readCompaniesCount = permissions.filter(p => p === 'read:companies').length;
      expect(readCompaniesCount).toBe(1);
    });

    it('should handle user with invalid role', () => {
      const user = {
        role: 'nonexistent',
        permissions: ['some:permission']
      };
      const permissions = getUserPermissions(user);
      expect(permissions).toContain('some:permission');
      expect(permissions.length).toBe(1);
    });

    it('should handle user with non-array permissions', () => {
      const user = {
        role: 'employee',
        permissions: 'not-an-array'
      };
      const permissions = getUserPermissions(user);
      expect(permissions).toContain('read:companies');
    });

    it('should handle user without permissions property', () => {
      const user = {
        role: 'admin'
      };
      const permissions = getUserPermissions(user);
      expect(permissions).toContain('admin:all');
    });
  });

  describe('checkPermission', () => {
    it('should return false for null user', () => {
      const result = checkPermission(null, 'some:permission');
      expect(result).toBe(false);
    });

    it('should return false for undefined user', () => {
      const result = checkPermission(undefined, 'some:permission');
      expect(result).toBe(false);
    });

    it('should return true if user has explicit permission', () => {
      const user = {
        permissions: ['read:users']
      };
      const result = checkPermission(user, 'read:users');
      expect(result).toBe(true);
    });

    it('should return true if user has role-based permission', () => {
      const user = {
        role: 'admin',
        permissions: []
      };
      const result = checkPermission(user, 'admin:all');
      expect(result).toBe(true);
    });

    it('should return false if user lacks permission', () => {
      const user = {
        role: 'employee',
        permissions: []
      };
      const result = checkPermission(user, 'admin:all');
      expect(result).toBe(false);
    });

    it('should handle array of required permissions (OR logic)', () => {
      const user = {
        role: 'manager',
        permissions: []
      };
      const result = checkPermission(user, ['admin:all', 'read:users']);
      expect(result).toBe(true);
    });

    it('should return false if user has none of the required permissions', () => {
      const user = {
        role: 'client',
        permissions: []
      };
      const result = checkPermission(user, ['admin:all', 'write:users']);
      expect(result).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('should return 401 if no user on request', () => {
      const middleware = hasRole('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Authentication required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next if user has required role', () => {
      req.user = { role: 'admin' };
      const middleware = hasRole('admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 403 if user lacks required role', () => {
      req.user = { role: 'employee' };
      const middleware = hasRole('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access denied: Insufficient role permissions'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept array of roles', () => {
      req.user = { role: 'manager' };
      const middleware = hasRole(['admin', 'manager']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should convert single role to array', () => {
      req.user = { role: 'admin' };
      const middleware = hasRole('admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 403 if user role not in allowed roles array', () => {
      req.user = { role: 'client' };
      const middleware = hasRole(['admin', 'manager']);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('hasPermission', () => {
    it('should return 401 if no user on request', () => {
      const middleware = hasPermission('read:users');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Authentication required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next if user has required permission', () => {
      req.user = { role: 'admin', permissions: [] };
      const middleware = hasPermission('read:users');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 403 if user lacks required permission', () => {
      req.user = { role: 'client', permissions: [] };
      const middleware = hasPermission('write:users');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access denied: Insufficient permissions'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept array of permissions', () => {
      req.user = { role: 'employee', permissions: [] };
      const middleware = hasPermission(['read:companies', 'write:companies']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should check explicit user permissions', () => {
      req.user = { permissions: ['custom:action'] };
      const middleware = hasPermission('custom:action');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with empty role string', () => {
      req.user = { role: '', permissions: [] };
      const middleware = hasRole('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should handle user with null role', () => {
      req.user = { role: null, permissions: ['read:companies'] };
      const middleware = hasPermission('read:companies');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle undefined permissions gracefully', () => {
      req.user = { role: 'admin' };
      const middleware = hasPermission('read:users');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});

/**
 * RBAC Middleware - Comprehensive Coverage Tests
 * Issue #41: Middleware Test Suite
 *
 * Tests for: hasAgentCapability, requireUserNotAgent, all roles,
 * super_admin permissions, edge cases.
 */

const {
  checkPermission,
  hasRole,
  hasPermission,
  getUserPermissions,
  rolePermissions,
  agentCapabilities,
  hasAgentCapability,
  requireUserNotAgent
} = require('../../../middleware/rbacMiddleware');

describe('RBAC Middleware - Comprehensive Coverage', () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: null };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  // ---------------------------------------------------------------
  // Role permissions for all roles
  // ---------------------------------------------------------------
  describe('rolePermissions - all roles', () => {
    it('super_admin should have admin:all and platform management permissions', () => {
      expect(rolePermissions.super_admin).toContain('admin:all');
      expect(rolePermissions.super_admin).toContain('platform:manage_roles');
      expect(rolePermissions.super_admin).toContain('platform:manage_tenants');
      expect(rolePermissions.super_admin).toContain('platform:view_audit_logs');
    });

    it('founder should have company and equity permissions but not admin:all', () => {
      expect(rolePermissions.founder).toContain('read:companies');
      expect(rolePermissions.founder).toContain('write:companies');
      expect(rolePermissions.founder).toContain('read:equity');
      expect(rolePermissions.founder).toContain('write:equity');
      expect(rolePermissions.founder).not.toContain('admin:all');
    });

    it('accountant should have read access and valuation signing', () => {
      expect(rolePermissions.accountant).toContain('read:companies');
      expect(rolePermissions.accountant).toContain('read:valuations');
      expect(rolePermissions.accountant).toContain('write:valuations');
      expect(rolePermissions.accountant).toContain('sign:valuations');
      expect(rolePermissions.accountant).not.toContain('write:companies');
    });

    it('investor should have read-only permissions', () => {
      expect(rolePermissions.investor).toContain('read:companies');
      expect(rolePermissions.investor).toContain('read:equity');
      expect(rolePermissions.investor).toContain('read:spv');
      expect(rolePermissions.investor).not.toContain('write:companies');
      expect(rolePermissions.investor).not.toContain('admin:all');
    });

    it('service_provider should have read and compliance write access', () => {
      expect(rolePermissions.service_provider).toContain('read:companies');
      expect(rolePermissions.service_provider).toContain('write:compliance');
      expect(rolePermissions.service_provider).toContain('read:documents');
    });

    it('client should have limited read-only access', () => {
      expect(rolePermissions.client).toContain('read:companies');
      expect(rolePermissions.client).toContain('read:reports');
      expect(rolePermissions.client).not.toContain('write:companies');
      expect(rolePermissions.client).not.toContain('read:users');
    });
  });

  // ---------------------------------------------------------------
  // getUserPermissions - edge cases
  // ---------------------------------------------------------------
  describe('getUserPermissions - additional edge cases', () => {
    it('should return role permissions for user with no explicit permissions', () => {
      const user = { role: 'investor' };
      const permissions = getUserPermissions(user);
      expect(permissions).toContain('read:companies');
      expect(permissions).toContain('read:equity');
    });

    it('should return empty array for user with no role and no permissions', () => {
      const user = {};
      const permissions = getUserPermissions(user);
      expect(permissions).toEqual([]);
    });

    it('should handle user with undefined role', () => {
      const user = { role: undefined, permissions: ['custom:perm'] };
      const permissions = getUserPermissions(user);
      expect(permissions).toEqual(['custom:perm']);
    });
  });

  // ---------------------------------------------------------------
  // hasAgentCapability
  // ---------------------------------------------------------------
  describe('hasAgentCapability', () => {
    it('should return 401 when no user on request', () => {
      const middleware = hasAgentCapability('read:cap_table');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Authentication required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should pass through for non-agent users', () => {
      req.user = { userId: 'u1', role: 'admin', type: 'user' };
      const middleware = hasAgentCapability('read:cap_table');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should pass through when user has no type field', () => {
      req.user = { userId: 'u1', role: 'admin' };
      const middleware = hasAgentCapability('read:cap_table');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow agent with matching capability', () => {
      req.user = {
        userId: 'agent-1',
        type: 'agent',
        capabilities: ['read:cap_table', 'read:documents']
      };
      const middleware = hasAgentCapability('read:cap_table');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny agent without matching capability', () => {
      req.user = {
        userId: 'agent-2',
        type: 'agent',
        capabilities: ['read:documents']
      };
      const middleware = hasAgentCapability('read:cap_table');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Agent token lacks required capability: read:cap_table'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny agent with empty capabilities array', () => {
      req.user = {
        userId: 'agent-3',
        type: 'agent',
        capabilities: []
      };
      const middleware = hasAgentCapability('admin:all');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should handle agent with undefined capabilities', () => {
      req.user = {
        userId: 'agent-4',
        type: 'agent'
        // no capabilities field
      };
      const middleware = hasAgentCapability('read:documents');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should handle agent with non-array capabilities', () => {
      req.user = {
        userId: 'agent-5',
        type: 'agent',
        capabilities: 'not-an-array'
      };
      const middleware = hasAgentCapability('read:documents');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ---------------------------------------------------------------
  // requireUserNotAgent
  // ---------------------------------------------------------------
  describe('requireUserNotAgent', () => {
    it('should allow non-agent users', () => {
      req.user = { userId: 'u1', role: 'admin', type: 'user' };
      requireUserNotAgent(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow users with no type field', () => {
      req.user = { userId: 'u2', role: 'founder' };
      requireUserNotAgent(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should block agent tokens', () => {
      req.user = { userId: 'agent-1', type: 'agent', capabilities: ['read:cap_table'] };
      requireUserNotAgent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Agent tokens cannot access this endpoint'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow when user is null/undefined (no type check applies)', () => {
      req.user = null;
      requireUserNotAgent(req, res, next);

      // With optional chaining, user?.type is undefined, which is not 'agent'
      expect(next).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------
  // agentCapabilities map
  // ---------------------------------------------------------------
  describe('agentCapabilities map', () => {
    it('should define read:cap_table with correct underlying access', () => {
      expect(agentCapabilities['read:cap_table']).toContain('read:equity');
      expect(agentCapabilities['read:cap_table']).toContain('read:companies');
      expect(agentCapabilities['read:cap_table']).toContain('read:users');
    });

    it('should define write:documents with read and write access', () => {
      expect(agentCapabilities['write:documents']).toContain('read:documents');
      expect(agentCapabilities['write:documents']).toContain('write:documents');
    });

    it('should define admin:all scope', () => {
      expect(agentCapabilities['admin:all']).toContain('admin:all');
    });
  });

  // ---------------------------------------------------------------
  // hasRole - additional coverage
  // ---------------------------------------------------------------
  describe('hasRole - additional scenarios', () => {
    it('should handle super_admin role', () => {
      req.user = { role: 'super_admin' };
      const middleware = hasRole(['admin', 'super_admin']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle founder role', () => {
      req.user = { role: 'founder' };
      const middleware = hasRole('founder');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject investor for admin-only endpoints', () => {
      req.user = { role: 'investor' };
      const middleware = hasRole('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ---------------------------------------------------------------
  // hasPermission - additional coverage
  // ---------------------------------------------------------------
  describe('hasPermission - additional scenarios', () => {
    it('should allow super_admin for any permission', () => {
      req.user = { role: 'super_admin', permissions: [] };
      const middleware = hasPermission('platform:manage_roles');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny employee for admin:all permission', () => {
      req.user = { role: 'employee', permissions: [] };
      const middleware = hasPermission('admin:all');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should allow accountant for sign:valuations permission', () => {
      req.user = { role: 'accountant', permissions: [] };
      const middleware = hasPermission('sign:valuations');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------
  // checkPermission - additional coverage
  // ---------------------------------------------------------------
  describe('checkPermission - additional scenarios', () => {
    it('should check permission for service_provider', () => {
      const user = { role: 'service_provider', permissions: [] };
      expect(checkPermission(user, 'read:documents')).toBe(true);
      expect(checkPermission(user, 'write:companies')).toBe(false);
    });

    it('should check super_admin has platform-level permissions', () => {
      const user = { role: 'super_admin', permissions: [] };
      expect(checkPermission(user, 'platform:manage_roles')).toBe(true);
      expect(checkPermission(user, 'platform:manage_tenants')).toBe(true);
      expect(checkPermission(user, 'platform:view_audit_logs')).toBe(true);
    });

    it('should return true when user has array with at least one matching permission', () => {
      const user = { role: 'employee', permissions: [] };
      const result = checkPermission(user, ['admin:all', 'read:companies']);
      expect(result).toBe(true);
    });

    it('should return false when user has array with no matching permissions', () => {
      const user = { role: 'employee', permissions: [] };
      const result = checkPermission(user, ['admin:all', 'write:companies']);
      expect(result).toBe(false);
    });
  });
});

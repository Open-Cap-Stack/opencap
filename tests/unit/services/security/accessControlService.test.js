/**
 * Unit tests for AccessControlService
 */

const AccessControlService = require('../../../../services/security/accessControlService');

describe('AccessControlService', () => {
  let acs;

  beforeEach(() => {
    acs = new AccessControlService({
      sessionTimeout: 3600000,
      maxConcurrentSessions: 3
    });
  });

  afterEach(() => {
    acs.reset();
    acs.removeAllListeners();
  });

  // ============ Constructor ============

  describe('constructor', () => {
    it('should initialise with default config when none provided', () => {
      const service = new AccessControlService();
      expect(service.config.sessionTimeout).toBe(3600000);
      expect(service.config.maxConcurrentSessions).toBe(10);
    });

    it('should accept custom config values', () => {
      expect(acs.config.sessionTimeout).toBe(3600000);
      expect(acs.config.maxConcurrentSessions).toBe(3);
    });
  });

  // ============ Role Management ============

  describe('Role Management', () => {
    describe('createRole', () => {
      it('should create a role and return its data', () => {
        const role = acs.createRole({
          name: 'editor',
          description: 'Can edit documents',
          permissions: ['read', 'write']
        });

        expect(role.name).toBe('editor');
        expect(role.description).toBe('Can edit documents');
        expect(role.permissions).toEqual(expect.arrayContaining(['read', 'write']));
        expect(role.builtIn).toBe(false);
      });

      it('should throw when creating a duplicate role', () => {
        acs.createRole({ name: 'admin', description: 'Admin', permissions: ['*'] });
        expect(() =>
          acs.createRole({ name: 'admin', description: 'Admin2', permissions: ['read'] })
        ).toThrow('Role already exists: admin');
      });

      it('should support builtIn flag', () => {
        const role = acs.createRole({
          name: 'super_admin',
          description: 'Super admin',
          permissions: ['*'],
          builtIn: true
        });
        expect(role.builtIn).toBe(true);
      });

      it('should store policies and inherits arrays', () => {
        acs.createRole({ name: 'base', description: 'Base', permissions: ['read'] });
        const role = acs.createRole({
          name: 'extended',
          description: 'Extended',
          permissions: ['write'],
          policies: ['office_hours'],
          inherits: ['base']
        });
        expect(role.policies).toEqual(['office_hours']);
        expect(role.inherits).toEqual(['base']);
      });
    });

    describe('updateRole', () => {
      it('should update role permissions', () => {
        acs.createRole({ name: 'viewer', description: 'Viewer', permissions: ['read'] });
        const updated = acs.updateRole('viewer', { permissions: ['read', 'comment'] });
        expect(updated.permissions).toEqual(expect.arrayContaining(['read', 'comment']));
      });

      it('should update role description', () => {
        acs.createRole({ name: 'viewer', description: 'Old', permissions: ['read'] });
        const updated = acs.updateRole('viewer', { description: 'New description' });
        expect(updated.description).toBe('New description');
      });

      it('should update policies and inherits', () => {
        acs.createRole({ name: 'r1', description: 'R1', permissions: ['a'] });
        acs.updateRole('r1', { policies: ['p1'], inherits: ['base'] });
        expect(acs.roles.get('r1').policies).toEqual(['p1']);
        expect(acs.roles.get('r1').inherits).toEqual(['base']);
      });

      it('should throw when updating non-existent role', () => {
        expect(() => acs.updateRole('ghost', { permissions: [] })).toThrow('Role not found: ghost');
      });
    });

    describe('deleteRole', () => {
      it('should delete a role', () => {
        acs.createRole({ name: 'temp', description: 'Temp', permissions: ['read'] });
        acs.deleteRole('temp');
        expect(() => acs.getRole('temp')).toThrow('Role not found: temp');
      });

      it('should throw when deleting non-existent role', () => {
        expect(() => acs.deleteRole('nope')).toThrow('Role not found: nope');
      });

      it('should throw when deleting a built-in role', () => {
        acs.createRole({ name: 'sys', description: 'System', permissions: ['*'], builtIn: true });
        expect(() => acs.deleteRole('sys')).toThrow('Cannot delete built-in role');
      });
    });

    describe('getRole', () => {
      it('should return role data', () => {
        acs.createRole({ name: 'viewer', description: 'Viewer', permissions: ['read'] });
        const role = acs.getRole('viewer');
        expect(role.name).toBe('viewer');
        expect(role.permissions).toContain('read');
      });

      it('should throw for unknown role', () => {
        expect(() => acs.getRole('unknown')).toThrow('Role not found: unknown');
      });
    });

    describe('getAllRoles', () => {
      it('should return empty array when no roles exist', () => {
        expect(acs.getAllRoles()).toEqual([]);
      });

      it('should return all created roles', () => {
        acs.createRole({ name: 'a', description: 'A', permissions: ['x'] });
        acs.createRole({ name: 'b', description: 'B', permissions: ['y'] });
        const roles = acs.getAllRoles();
        expect(roles).toHaveLength(2);
        expect(roles.map(r => r.name)).toEqual(expect.arrayContaining(['a', 'b']));
      });
    });
  });

  // ============ User Role Assignment ============

  describe('User Role Assignment', () => {
    beforeEach(() => {
      acs.createRole({ name: 'admin', description: 'Admin', permissions: ['*'] });
      acs.createRole({ name: 'editor', description: 'Editor', permissions: ['read', 'write'] });
    });

    describe('assignRole', () => {
      it('should assign a role to a user', () => {
        acs.assignRole('user1', 'admin');
        expect(acs.getUserRoles('user1')).toContain('admin');
      });

      it('should support multiple roles', () => {
        acs.assignRole('user1', 'admin');
        acs.assignRole('user1', 'editor');
        expect(acs.getUserRoles('user1')).toHaveLength(2);
      });

      it('should throw when assigning non-existent role', () => {
        expect(() => acs.assignRole('user1', 'fake')).toThrow('Role not found: fake');
      });

      it('should log role assignment in history', () => {
        acs.assignRole('user1', 'admin');
        const history = acs.getRoleChangeHistory('user1');
        expect(history).toHaveLength(1);
        expect(history[0].action).toBe('ROLE_ASSIGNED');
        expect(history[0].role).toBe('admin');
      });
    });

    describe('removeRole', () => {
      it('should remove an assigned role', () => {
        acs.assignRole('user1', 'admin');
        acs.removeRole('user1', 'admin');
        expect(acs.getUserRoles('user1')).not.toContain('admin');
      });

      it('should log role removal in history', () => {
        acs.assignRole('user1', 'editor');
        acs.removeRole('user1', 'editor');
        const history = acs.getRoleChangeHistory('user1');
        expect(history).toHaveLength(2);
        expect(history[1].action).toBe('ROLE_REMOVED');
      });

      it('should not throw when removing role from user with no roles', () => {
        expect(() => acs.removeRole('nonexistent', 'admin')).not.toThrow();
      });
    });

    describe('getUserRoles', () => {
      it('should return empty array for unknown user', () => {
        expect(acs.getUserRoles('nobody')).toEqual([]);
      });
    });
  });

  // ============ Resource-Level Permissions ============

  describe('Resource-Level Permissions', () => {
    beforeEach(() => {
      acs.createRole({ name: 'viewer', description: 'Viewer', permissions: ['read'] });
      acs.assignRole('user1', 'viewer');
    });

    describe('grantResourcePermission', () => {
      it('should grant permission on a resource', () => {
        acs.grantResourcePermission({
          userId: 'user1',
          resourceType: 'document',
          resourceId: 'doc1',
          permissions: ['edit', 'delete']
        });

        expect(acs.checkResourcePermission({
          userId: 'user1',
          resourceType: 'document',
          resourceId: 'doc1',
          permission: 'edit'
        })).toBe(true);
      });

      it('should log permission changes', () => {
        acs.grantResourcePermission({
          userId: 'user1',
          resourceType: 'document',
          resourceId: 'doc1',
          permissions: ['edit']
        });
        const history = acs.getPermissionChangeHistory('user1');
        expect(history).toHaveLength(1);
        expect(history[0].action).toBe('PERMISSION_GRANTED');
      });
    });

    describe('revokeResourcePermission', () => {
      it('should revoke a granted permission', () => {
        acs.grantResourcePermission({
          userId: 'user1',
          resourceType: 'document',
          resourceId: 'doc1',
          permissions: ['edit', 'delete']
        });
        acs.revokeResourcePermission({
          userId: 'user1',
          resourceType: 'document',
          resourceId: 'doc1',
          permissions: ['delete']
        });
        expect(acs.checkResourcePermission({
          userId: 'user1',
          resourceType: 'document',
          resourceId: 'doc1',
          permission: 'delete'
        })).toBe(false);
        expect(acs.checkResourcePermission({
          userId: 'user1',
          resourceType: 'document',
          resourceId: 'doc1',
          permission: 'edit'
        })).toBe(true);
      });

      it('should handle revoking when no permissions exist', () => {
        expect(() => acs.revokeResourcePermission({
          userId: 'user1',
          resourceType: 'doc',
          resourceId: 'x',
          permissions: ['read']
        })).not.toThrow();
      });
    });

    describe('checkResourcePermission', () => {
      it('should check wildcard resource permissions', () => {
        acs.grantResourcePermission({
          userId: 'user1',
          resourceType: 'document',
          resourceId: '*',
          permissions: ['read']
        });
        expect(acs.checkResourcePermission({
          userId: 'user1',
          resourceType: 'document',
          resourceId: 'any-doc',
          permission: 'read'
        })).toBe(true);
      });

      it('should fall back to role-based permissions', () => {
        expect(acs.checkResourcePermission({
          userId: 'user1',
          resourceType: 'document',
          resourceId: 'doc1',
          permission: 'read'
        })).toBe(true);
      });

      it('should return false when no matching permission exists', () => {
        expect(acs.checkResourcePermission({
          userId: 'user1',
          resourceType: 'document',
          resourceId: 'doc1',
          permission: 'admin'
        })).toBe(false);
      });
    });

    describe('getResourcePermissions', () => {
      it('should return all users with permissions on a resource', () => {
        acs.grantResourcePermission({
          userId: 'user1',
          resourceType: 'document',
          resourceId: 'doc1',
          permissions: ['read']
        });
        acs.grantResourcePermission({
          userId: 'user2',
          resourceType: 'document',
          resourceId: 'doc1',
          permissions: ['write']
        });

        const perms = acs.getResourcePermissions('document', 'doc1');
        expect(perms).toHaveLength(2);
        const userIds = perms.map(p => p.userId);
        expect(userIds).toContain('user1');
        expect(userIds).toContain('user2');
      });

      it('should return empty array for resource with no permissions', () => {
        expect(acs.getResourcePermissions('doc', 'none')).toEqual([]);
      });
    });
  });

  // ============ Permission Checking ============

  describe('Permission Checking', () => {
    beforeEach(() => {
      acs.createRole({ name: 'admin', description: 'Admin', permissions: ['*'] });
      acs.createRole({ name: 'base', description: 'Base', permissions: ['read'] });
      acs.createRole({ name: 'extended', description: 'Ext', permissions: ['write'], inherits: ['base'] });
    });

    describe('hasPermission', () => {
      it('should grant access via wildcard (*) permission', () => {
        acs.assignRole('user1', 'admin');
        expect(acs.hasPermission('user1', 'anything')).toBe(true);
      });

      it('should check inherited permissions', () => {
        acs.assignRole('user1', 'extended');
        expect(acs.hasPermission('user1', 'read')).toBe(true);
        expect(acs.hasPermission('user1', 'write')).toBe(true);
      });

      it('should return false for users without the permission', () => {
        acs.assignRole('user1', 'base');
        expect(acs.hasPermission('user1', 'write')).toBe(false);
      });

      it('should return false for users with no roles', () => {
        expect(acs.hasPermission('nobody', 'read')).toBe(false);
      });

      it('should increment permission check stats', () => {
        const before = acs.stats.permissionChecks;
        acs.hasPermission('user1', 'read');
        expect(acs.stats.permissionChecks).toBe(before + 1);
      });

      it('should log audit entry when audit option is true', () => {
        acs.assignRole('user1', 'base');
        acs.hasPermission('user1', 'read', { audit: true });
        const log = acs.getPermissionAuditLog('user1');
        expect(log).toHaveLength(1);
        expect(log[0].granted).toBe(true);
      });

      it('should check delegated permissions when role-based fails', () => {
        const futureDate = new Date(Date.now() + 3600000).toISOString();
        acs.delegatePermission({
          fromUserId: 'admin1',
          toUserId: 'user1',
          permissions: ['deploy'],
          expiresAt: futureDate
        });
        expect(acs.hasPermission('user1', 'deploy')).toBe(true);
      });
    });

    describe('getInheritedPermissions', () => {
      it('should handle circular inheritance', () => {
        acs.createRole({ name: 'cycleA', description: 'A', permissions: ['a'], inherits: ['cycleB'] });
        acs.createRole({ name: 'cycleB', description: 'B', permissions: ['b'], inherits: ['cycleA'] });
        const perms = acs.getInheritedPermissions('cycleA');
        expect(perms.has('a')).toBe(true);
        expect(perms.has('b')).toBe(true);
      });

      it('should return empty set for non-existent role', () => {
        const perms = acs.getInheritedPermissions('nonexistent');
        expect(perms.size).toBe(0);
      });
    });

    describe('getEffectivePermissions', () => {
      it('should combine role and delegated permissions', () => {
        acs.assignRole('user1', 'base');
        const futureDate = new Date(Date.now() + 3600000).toISOString();
        acs.delegatePermission({
          fromUserId: 'admin1',
          toUserId: 'user1',
          permissions: ['deploy'],
          expiresAt: futureDate
        });

        const perms = acs.getEffectivePermissions('user1');
        expect(perms).toContain('read');
        expect(perms).toContain('deploy');
      });

      it('should return empty array for user with no roles or delegations', () => {
        expect(acs.getEffectivePermissions('nobody')).toEqual([]);
      });

      it('should not include expired delegations', () => {
        const pastDate = new Date(Date.now() - 1000).toISOString();
        acs.delegatePermission({
          fromUserId: 'admin1',
          toUserId: 'user1',
          permissions: ['deploy'],
          expiresAt: pastDate
        });
        expect(acs.getEffectivePermissions('user1')).not.toContain('deploy');
      });
    });
  });

  // ============ Policy Management ============

  describe('Policy Management', () => {
    it('should create and evaluate a policy', () => {
      acs.createPolicy({
        name: 'office_hours',
        condition: (ctx) => ctx.hour >= 9 && ctx.hour <= 17
      });
      expect(acs.evaluatePolicies(['office_hours'], { hour: 10 })).toBe(true);
      expect(acs.evaluatePolicies(['office_hours'], { hour: 3 })).toBe(false);
    });

    it('should return true when all policies pass', () => {
      acs.createPolicy({ name: 'p1', condition: () => true });
      acs.createPolicy({ name: 'p2', condition: () => true });
      expect(acs.evaluatePolicies(['p1', 'p2'], {})).toBe(true);
    });

    it('should return false if any policy fails', () => {
      acs.createPolicy({ name: 'p1', condition: () => true });
      acs.createPolicy({ name: 'p2', condition: () => false });
      expect(acs.evaluatePolicies(['p1', 'p2'], {})).toBe(false);
    });

    it('should skip unknown policies and return true', () => {
      expect(acs.evaluatePolicies(['nonexistent'], {})).toBe(true);
    });

    it('should enforce policy on hasPermission check', () => {
      acs.createPolicy({ name: 'deny_all', condition: () => false });
      acs.createRole({
        name: 'restricted',
        description: 'Restricted',
        permissions: ['read'],
        policies: ['deny_all']
      });
      acs.assignRole('user1', 'restricted');
      expect(acs.hasPermission('user1', 'read', { context: {} })).toBe(false);
    });
  });

  // ============ Session Management ============

  describe('Session Management', () => {
    describe('createSession', () => {
      it('should create a new session', () => {
        const session = acs.createSession({
          userId: 'user1',
          ipAddress: '127.0.0.1',
          userAgent: 'Jest'
        });

        expect(session.id).toBeDefined();
        expect(session.userId).toBe('user1');
        expect(session.isActive).toBe(true);
        expect(session.activityLog).toEqual([]);
      });

      it('should enforce max concurrent sessions', () => {
        const s1 = acs.createSession({ userId: 'u1', ipAddress: '1.1.1.1', userAgent: 'A' });
        const s2 = acs.createSession({ userId: 'u1', ipAddress: '1.1.1.2', userAgent: 'B' });
        const s3 = acs.createSession({ userId: 'u1', ipAddress: '1.1.1.3', userAgent: 'C' });
        const s4 = acs.createSession({ userId: 'u1', ipAddress: '1.1.1.4', userAgent: 'D' });

        expect(acs.getSession(s1.id).isActive).toBe(false);
        expect(acs.getSession(s4.id).isActive).toBe(true);
      });
    });

    describe('validateSession', () => {
      it('should return true for valid active session', () => {
        const session = acs.createSession({ userId: 'u1', ipAddress: '1.1.1.1', userAgent: 'A' });
        expect(acs.validateSession(session.id)).toBe(true);
      });

      it('should return false for non-existent session', () => {
        expect(acs.validateSession('fake-id')).toBe(false);
      });

      it('should return false for terminated session', () => {
        const session = acs.createSession({ userId: 'u1', ipAddress: '1.1.1.1', userAgent: 'A' });
        acs.terminateSession(session.id);
        expect(acs.validateSession(session.id)).toBe(false);
      });

      it('should return false for expired session', () => {
        const session = acs.createSession({ userId: 'u1', ipAddress: '1.1.1.1', userAgent: 'A' });
        acs.sessions.get(session.id).expiresAt = Date.now() - 1000;
        expect(acs.validateSession(session.id)).toBe(false);
      });
    });

    describe('refreshSession', () => {
      it('should extend session expiry', () => {
        const session = acs.createSession({ userId: 'u1', ipAddress: '1.1.1.1', userAgent: 'A' });
        acs.sessions.get(session.id).expiresAt = Date.now() + 100;
        acs.refreshSession(session.id);
        const refreshed = acs.getSession(session.id);
        expect(refreshed.expiresAt).toBeGreaterThan(Date.now() + 3500000);
      });

      it('should not refresh an inactive session', () => {
        const session = acs.createSession({ userId: 'u1', ipAddress: '1.1.1.1', userAgent: 'A' });
        acs.terminateSession(session.id);
        const expiresAt = acs.getSession(session.id).expiresAt;
        acs.refreshSession(session.id);
        expect(acs.getSession(session.id).expiresAt).toBe(expiresAt);
      });
    });

    describe('terminateAllUserSessions', () => {
      it('should terminate all sessions for a user', () => {
        acs.createSession({ userId: 'u1', ipAddress: '1.1.1.1', userAgent: 'A' });
        acs.createSession({ userId: 'u1', ipAddress: '1.1.1.2', userAgent: 'B' });
        acs.terminateAllUserSessions('u1');
        const sessions = acs.getUserSessions('u1');
        sessions.forEach(s => expect(s.isActive).toBe(false));
      });

      it('should not throw for user with no sessions', () => {
        expect(() => acs.terminateAllUserSessions('nobody')).not.toThrow();
      });
    });

    describe('getUserSessions', () => {
      it('should return empty array for user with no sessions', () => {
        expect(acs.getUserSessions('nobody')).toEqual([]);
      });
    });

    describe('recordSessionActivity', () => {
      it('should add activity to session log', () => {
        const session = acs.createSession({ userId: 'u1', ipAddress: '1.1.1.1', userAgent: 'A' });
        acs.recordSessionActivity(session.id, { action: 'viewed_page', path: '/dashboard' });
        const updated = acs.getSession(session.id);
        expect(updated.activityLog).toHaveLength(1);
        expect(updated.activityLog[0].action).toBe('viewed_page');
      });

      it('should not throw for non-existent session', () => {
        expect(() => acs.recordSessionActivity('fake', { action: 'test' })).not.toThrow();
      });
    });
  });

  // ============ Delegation ============

  describe('Delegation', () => {
    it('should delegate permissions', () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString();
      const delegation = acs.delegatePermission({
        fromUserId: 'admin1',
        toUserId: 'user1',
        permissions: ['read', 'write'],
        expiresAt: futureDate
      });

      expect(delegation.id).toBeDefined();
      expect(delegation.fromUserId).toBe('admin1');
      expect(delegation.toUserId).toBe('user1');
    });

    it('should check delegated permissions', () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString();
      acs.delegatePermission({
        fromUserId: 'admin1',
        toUserId: 'user1',
        permissions: ['deploy'],
        expiresAt: futureDate
      });

      expect(acs.checkDelegatedPermissions('user1', 'deploy')).toBe(true);
      expect(acs.checkDelegatedPermissions('user1', 'destroy')).toBe(false);
    });

    it('should not grant expired delegations', () => {
      const pastDate = new Date(Date.now() - 10000).toISOString();
      acs.delegatePermission({
        fromUserId: 'admin1',
        toUserId: 'user1',
        permissions: ['deploy'],
        expiresAt: pastDate
      });

      expect(acs.checkDelegatedPermissions('user1', 'deploy')).toBe(false);
    });

    it('should revoke a delegation', () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString();
      const delegation = acs.delegatePermission({
        fromUserId: 'admin1',
        toUserId: 'user1',
        permissions: ['deploy'],
        expiresAt: futureDate
      });
      acs.revokeDelegation(delegation.id);
      expect(acs.checkDelegatedPermissions('user1', 'deploy')).toBe(false);
    });
  });

  // ============ Audit Logging ============

  describe('Audit Logging', () => {
    it('should return empty audit log for unknown user', () => {
      expect(acs.getPermissionAuditLog('nobody')).toEqual([]);
    });

    it('should return empty role change history for unknown user', () => {
      expect(acs.getRoleChangeHistory('nobody')).toEqual([]);
    });

    it('should return empty permission change history for unknown user', () => {
      expect(acs.getPermissionChangeHistory('nobody')).toEqual([]);
    });
  });

  // ============ Statistics ============

  describe('getStatistics', () => {
    it('should return correct statistics', () => {
      acs.createRole({ name: 'a', description: 'A', permissions: ['x'] });
      acs.assignRole('u1', 'a');
      acs.createSession({ userId: 'u1', ipAddress: '1.1.1.1', userAgent: 'X' });
      acs.hasPermission('u1', 'x');

      const stats = acs.getStatistics();
      expect(stats.totalRoles).toBe(1);
      expect(stats.totalUsers).toBe(1);
      expect(stats.activeSessions).toBe(1);
      expect(stats.permissionChecks).toBe(1);
    });
  });

  // ============ Reset ============

  describe('reset', () => {
    it('should clear all data', () => {
      acs.createRole({ name: 'a', description: 'A', permissions: ['x'] });
      acs.assignRole('u1', 'a');
      acs.createSession({ userId: 'u1', ipAddress: '1.1.1.1', userAgent: 'X' });
      acs.hasPermission('u1', 'x');
      acs.reset();

      const stats = acs.getStatistics();
      expect(stats.totalRoles).toBe(0);
      expect(stats.totalUsers).toBe(0);
      expect(stats.activeSessions).toBe(0);
      expect(stats.permissionChecks).toBe(0);
    });
  });

  // ============ generateId ============

  describe('generateId', () => {
    it('should produce unique IDs', () => {
      const ids = new Set(Array.from({ length: 20 }, () => acs.generateId()));
      expect(ids.size).toBe(20);
    });
  });
});

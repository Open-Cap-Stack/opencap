/**
 * AccessControlService Tests
 *
 * Test suite for fine-grained permissions and access control
 * Tests resource-level permissions, session management, permission auditing
 */

const AccessControlService = require('../../../../services/security/accessControlService');

describe('AccessControlService', () => {
  let accessService;

  beforeEach(() => {
    accessService = new AccessControlService();
  });

  afterEach(() => {
    accessService.reset();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      expect(accessService).toBeDefined();
      expect(accessService.config).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const customService = new AccessControlService({
        sessionTimeout: 7200000,
        maxConcurrentSessions: 5
      });
      expect(customService.config.sessionTimeout).toBe(7200000);
      expect(customService.config.maxConcurrentSessions).toBe(5);
    });

    it('should have default session timeout of 1 hour', () => {
      expect(accessService.config.sessionTimeout).toBe(3600000);
    });
  });

  describe('role management', () => {
    it('should create a new role', () => {
      const role = accessService.createRole({
        name: 'editor',
        description: 'Can edit content',
        permissions: ['read', 'write', 'update']
      });

      expect(role.name).toBe('editor');
      expect(role.permissions).toContain('read');
      expect(role.permissions).toContain('write');
    });

    it('should update an existing role', () => {
      accessService.createRole({
        name: 'editor',
        permissions: ['read', 'write']
      });

      const updated = accessService.updateRole('editor', {
        permissions: ['read', 'write', 'delete']
      });

      expect(updated.permissions).toContain('delete');
    });

    it('should delete a role', () => {
      accessService.createRole({
        name: 'temp-role',
        permissions: ['read']
      });

      accessService.deleteRole('temp-role');

      expect(() => accessService.getRole('temp-role')).toThrow();
    });

    it('should get all roles', () => {
      accessService.createRole({ name: 'role1', permissions: ['read'] });
      accessService.createRole({ name: 'role2', permissions: ['write'] });

      const roles = accessService.getAllRoles();
      expect(roles.length).toBeGreaterThanOrEqual(2);
    });

    it('should prevent deletion of built-in roles', () => {
      accessService.createRole({
        name: 'admin',
        permissions: ['*'],
        builtIn: true
      });

      expect(() => accessService.deleteRole('admin')).toThrow('Cannot delete built-in role');
    });
  });

  describe('user role assignment', () => {
    beforeEach(() => {
      accessService.createRole({ name: 'viewer', permissions: ['read'] });
      accessService.createRole({ name: 'editor', permissions: ['read', 'write'] });
    });

    it('should assign role to user', () => {
      accessService.assignRole('user123', 'editor');
      const userRoles = accessService.getUserRoles('user123');
      expect(userRoles).toContain('editor');
    });

    it('should assign multiple roles to user', () => {
      accessService.assignRole('user123', 'viewer');
      accessService.assignRole('user123', 'editor');

      const userRoles = accessService.getUserRoles('user123');
      expect(userRoles).toContain('viewer');
      expect(userRoles).toContain('editor');
    });

    it('should remove role from user', () => {
      accessService.assignRole('user123', 'editor');
      accessService.removeRole('user123', 'editor');

      const userRoles = accessService.getUserRoles('user123');
      expect(userRoles).not.toContain('editor');
    });

    it('should throw error for non-existent role', () => {
      expect(() => accessService.assignRole('user123', 'non-existent')).toThrow();
    });
  });

  describe('resource-level permissions', () => {
    beforeEach(() => {
      accessService.createRole({ name: 'user', permissions: ['read'] });
      accessService.assignRole('user123', 'user');
    });

    it('should grant permission on specific resource', () => {
      accessService.grantResourcePermission({
        userId: 'user123',
        resourceType: 'document',
        resourceId: 'doc456',
        permissions: ['read', 'write']
      });

      const hasPermission = accessService.checkResourcePermission({
        userId: 'user123',
        resourceType: 'document',
        resourceId: 'doc456',
        permission: 'write'
      });

      expect(hasPermission).toBe(true);
    });

    it('should deny permission on resource without grant', () => {
      const hasPermission = accessService.checkResourcePermission({
        userId: 'user123',
        resourceType: 'document',
        resourceId: 'doc456',
        permission: 'delete'
      });

      expect(hasPermission).toBe(false);
    });

    it('should revoke resource permission', () => {
      accessService.grantResourcePermission({
        userId: 'user123',
        resourceType: 'document',
        resourceId: 'doc456',
        permissions: ['read', 'write']
      });

      accessService.revokeResourcePermission({
        userId: 'user123',
        resourceType: 'document',
        resourceId: 'doc456',
        permissions: ['write']
      });

      const hasReadPermission = accessService.checkResourcePermission({
        userId: 'user123',
        resourceType: 'document',
        resourceId: 'doc456',
        permission: 'read'
      });

      const hasWritePermission = accessService.checkResourcePermission({
        userId: 'user123',
        resourceType: 'document',
        resourceId: 'doc456',
        permission: 'write'
      });

      expect(hasReadPermission).toBe(true);
      expect(hasWritePermission).toBe(false);
    });

    it('should get all permissions for a resource', () => {
      accessService.grantResourcePermission({
        userId: 'user123',
        resourceType: 'document',
        resourceId: 'doc456',
        permissions: ['read', 'write']
      });

      accessService.grantResourcePermission({
        userId: 'user456',
        resourceType: 'document',
        resourceId: 'doc456',
        permissions: ['read']
      });

      const permissions = accessService.getResourcePermissions('document', 'doc456');
      expect(permissions.length).toBe(2);
    });

    it('should support wildcard resource permissions', () => {
      accessService.grantResourcePermission({
        userId: 'user123',
        resourceType: 'document',
        resourceId: '*',
        permissions: ['read']
      });

      const hasPermission = accessService.checkResourcePermission({
        userId: 'user123',
        resourceType: 'document',
        resourceId: 'any-doc-id',
        permission: 'read'
      });

      expect(hasPermission).toBe(true);
    });
  });

  describe('permission checking', () => {
    beforeEach(() => {
      accessService.createRole({ name: 'viewer', permissions: ['read'] });
      accessService.createRole({ name: 'editor', permissions: ['read', 'write', 'update'] });
      accessService.createRole({ name: 'admin', permissions: ['*'] });
    });

    it('should check if user has permission', () => {
      accessService.assignRole('user123', 'viewer');

      expect(accessService.hasPermission('user123', 'read')).toBe(true);
      expect(accessService.hasPermission('user123', 'write')).toBe(false);
    });

    it('should allow all permissions for admin role', () => {
      accessService.assignRole('admin1', 'admin');

      expect(accessService.hasPermission('admin1', 'read')).toBe(true);
      expect(accessService.hasPermission('admin1', 'write')).toBe(true);
      expect(accessService.hasPermission('admin1', 'delete')).toBe(true);
      expect(accessService.hasPermission('admin1', 'any-permission')).toBe(true);
    });

    it('should combine permissions from multiple roles', () => {
      accessService.createRole({ name: 'reporter', permissions: ['report'] });
      accessService.assignRole('user123', 'viewer');
      accessService.assignRole('user123', 'reporter');

      expect(accessService.hasPermission('user123', 'read')).toBe(true);
      expect(accessService.hasPermission('user123', 'report')).toBe(true);
    });

    it('should get all effective permissions for user', () => {
      accessService.assignRole('user123', 'editor');

      const permissions = accessService.getEffectivePermissions('user123');
      expect(permissions).toContain('read');
      expect(permissions).toContain('write');
      expect(permissions).toContain('update');
    });
  });

  describe('session management', () => {
    it('should create a new session', () => {
      const session = accessService.createSession({
        userId: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      });

      expect(session.id).toBeDefined();
      expect(session.userId).toBe('user123');
      expect(session.isActive).toBe(true);
    });

    it('should validate an active session', () => {
      const session = accessService.createSession({
        userId: 'user123',
        ipAddress: '192.168.1.1'
      });

      const isValid = accessService.validateSession(session.id);
      expect(isValid).toBe(true);
    });

    it('should invalidate expired sessions', () => {
      jest.useFakeTimers();

      const session = accessService.createSession({
        userId: 'user123',
        ipAddress: '192.168.1.1'
      });

      // Fast forward past session timeout (1 hour + 1 minute)
      jest.advanceTimersByTime(61 * 60 * 1000);

      const isValid = accessService.validateSession(session.id);
      expect(isValid).toBe(false);

      jest.useRealTimers();
    });

    it('should terminate a session', () => {
      const session = accessService.createSession({
        userId: 'user123',
        ipAddress: '192.168.1.1'
      });

      accessService.terminateSession(session.id);

      const isValid = accessService.validateSession(session.id);
      expect(isValid).toBe(false);
    });

    it('should terminate all sessions for a user', () => {
      accessService.createSession({ userId: 'user123', ipAddress: '192.168.1.1' });
      accessService.createSession({ userId: 'user123', ipAddress: '192.168.1.2' });
      accessService.createSession({ userId: 'user123', ipAddress: '192.168.1.3' });

      accessService.terminateAllUserSessions('user123');

      const activeSessions = accessService.getUserSessions('user123');
      expect(activeSessions.filter(s => s.isActive).length).toBe(0);
    });

    it('should get all active sessions for user', () => {
      accessService.createSession({ userId: 'user123', ipAddress: '192.168.1.1' });
      accessService.createSession({ userId: 'user123', ipAddress: '192.168.1.2' });

      const sessions = accessService.getUserSessions('user123');
      expect(sessions.filter(s => s.isActive).length).toBe(2);
    });

    it('should limit concurrent sessions', () => {
      const limitedService = new AccessControlService({
        maxConcurrentSessions: 2
      });

      limitedService.createSession({ userId: 'user123', ipAddress: '192.168.1.1' });
      limitedService.createSession({ userId: 'user123', ipAddress: '192.168.1.2' });
      limitedService.createSession({ userId: 'user123', ipAddress: '192.168.1.3' });

      const sessions = limitedService.getUserSessions('user123');
      expect(sessions.filter(s => s.isActive).length).toBe(2);
    });

    it('should refresh session timeout', () => {
      jest.useFakeTimers();

      const session = accessService.createSession({
        userId: 'user123',
        ipAddress: '192.168.1.1'
      });

      // Advance 30 minutes
      jest.advanceTimersByTime(30 * 60 * 1000);

      // Refresh session
      accessService.refreshSession(session.id);

      // Advance another 45 minutes (total 75 minutes from start, but only 45 from refresh)
      jest.advanceTimersByTime(45 * 60 * 1000);

      const isValid = accessService.validateSession(session.id);
      expect(isValid).toBe(true);

      jest.useRealTimers();
    });

    it('should track session activity', () => {
      const session = accessService.createSession({
        userId: 'user123',
        ipAddress: '192.168.1.1'
      });

      accessService.recordSessionActivity(session.id, {
        action: 'page_view',
        resource: '/dashboard'
      });

      const sessionData = accessService.getSession(session.id);
      expect(sessionData.activityLog.length).toBe(1);
    });
  });

  describe('permission auditing', () => {
    it('should log permission checks', () => {
      accessService.createRole({ name: 'viewer', permissions: ['read'] });
      accessService.assignRole('user123', 'viewer');

      accessService.hasPermission('user123', 'read', { audit: true });

      const auditLog = accessService.getPermissionAuditLog('user123');
      expect(auditLog.length).toBeGreaterThan(0);
      expect(auditLog[0].permission).toBe('read');
      expect(auditLog[0].granted).toBe(true);
    });

    it('should log denied permission attempts', () => {
      accessService.createRole({ name: 'viewer', permissions: ['read'] });
      accessService.assignRole('user123', 'viewer');

      accessService.hasPermission('user123', 'delete', { audit: true });

      const auditLog = accessService.getPermissionAuditLog('user123');
      const deniedEntry = auditLog.find(e => e.permission === 'delete');
      expect(deniedEntry).toBeDefined();
      expect(deniedEntry.granted).toBe(false);
    });

    it('should log role changes', () => {
      accessService.createRole({ name: 'editor', permissions: ['read', 'write'] });
      accessService.assignRole('user123', 'editor');

      const changes = accessService.getRoleChangeHistory('user123');
      expect(changes.length).toBe(1);
      expect(changes[0].action).toBe('ROLE_ASSIGNED');
      expect(changes[0].role).toBe('editor');
    });

    it('should log permission grants and revocations', () => {
      accessService.grantResourcePermission({
        userId: 'user123',
        resourceType: 'document',
        resourceId: 'doc1',
        permissions: ['read']
      });

      accessService.revokeResourcePermission({
        userId: 'user123',
        resourceType: 'document',
        resourceId: 'doc1',
        permissions: ['read']
      });

      const history = accessService.getPermissionChangeHistory('user123');
      expect(history.length).toBe(2);
    });
  });

  describe('policy enforcement', () => {
    it('should enforce time-based access policies', () => {
      accessService.createPolicy({
        name: 'office-hours-only',
        condition: (context) => {
          const hour = new Date(context.timestamp).getHours();
          return hour >= 9 && hour <= 17;
        }
      });

      accessService.createRole({
        name: 'contractor',
        permissions: ['read'],
        policies: ['office-hours-only']
      });

      accessService.assignRole('contractor1', 'contractor');

      // Mock office hours
      const officeTime = new Date();
      officeTime.setHours(10, 0, 0, 0);

      const hasAccess = accessService.hasPermission('contractor1', 'read', {
        context: { timestamp: officeTime }
      });

      expect(hasAccess).toBe(true);
    });

    it('should enforce IP-based access policies', () => {
      accessService.createPolicy({
        name: 'internal-network-only',
        condition: (context) => {
          return context.ipAddress && context.ipAddress.startsWith('192.168.');
        }
      });

      accessService.createRole({
        name: 'internal-user',
        permissions: ['read', 'write'],
        policies: ['internal-network-only']
      });

      accessService.assignRole('user123', 'internal-user');

      const internalAccess = accessService.hasPermission('user123', 'write', {
        context: { ipAddress: '192.168.1.100' }
      });

      const externalAccess = accessService.hasPermission('user123', 'write', {
        context: { ipAddress: '10.0.0.100' }
      });

      expect(internalAccess).toBe(true);
      expect(externalAccess).toBe(false);
    });
  });

  describe('delegation', () => {
    it('should allow permission delegation', () => {
      accessService.createRole({ name: 'manager', permissions: ['read', 'write', 'delegate'] });
      accessService.assignRole('manager1', 'manager');

      accessService.delegatePermission({
        fromUserId: 'manager1',
        toUserId: 'assistant1',
        permissions: ['read'],
        expiresAt: new Date(Date.now() + 86400000) // 24 hours
      });

      const hasPermission = accessService.hasPermission('assistant1', 'read');
      expect(hasPermission).toBe(true);
    });

    it('should expire delegated permissions', () => {
      jest.useFakeTimers();

      accessService.createRole({ name: 'manager', permissions: ['read', 'write', 'delegate'] });
      accessService.assignRole('manager1', 'manager');

      accessService.delegatePermission({
        fromUserId: 'manager1',
        toUserId: 'assistant1',
        permissions: ['read'],
        expiresAt: new Date(Date.now() + 3600000) // 1 hour
      });

      // Fast forward past expiration
      jest.advanceTimersByTime(3600001);

      const hasPermission = accessService.hasPermission('assistant1', 'read');
      expect(hasPermission).toBe(false);

      jest.useRealTimers();
    });

    it('should revoke delegated permissions', () => {
      accessService.createRole({ name: 'manager', permissions: ['read', 'write', 'delegate'] });
      accessService.assignRole('manager1', 'manager');

      const delegation = accessService.delegatePermission({
        fromUserId: 'manager1',
        toUserId: 'assistant1',
        permissions: ['read'],
        expiresAt: new Date(Date.now() + 86400000)
      });

      accessService.revokeDelegation(delegation.id);

      const hasPermission = accessService.hasPermission('assistant1', 'read');
      expect(hasPermission).toBe(false);
    });
  });

  describe('access control statistics', () => {
    it('should return access control statistics', () => {
      accessService.createRole({ name: 'viewer', permissions: ['read'] });
      accessService.assignRole('user1', 'viewer');
      accessService.createSession({ userId: 'user1', ipAddress: '192.168.1.1' });

      const stats = accessService.getStatistics();

      expect(stats).toHaveProperty('totalRoles');
      expect(stats).toHaveProperty('totalUsers');
      expect(stats).toHaveProperty('activeSessions');
      expect(stats).toHaveProperty('permissionChecks');
    });
  });

  describe('hierarchical roles', () => {
    it('should support role inheritance', () => {
      accessService.createRole({ name: 'viewer', permissions: ['read'] });
      accessService.createRole({
        name: 'editor',
        permissions: ['write', 'update'],
        inherits: ['viewer']
      });

      accessService.assignRole('user123', 'editor');

      const permissions = accessService.getEffectivePermissions('user123');
      expect(permissions).toContain('read');
      expect(permissions).toContain('write');
      expect(permissions).toContain('update');
    });

    it('should support multi-level inheritance', () => {
      accessService.createRole({ name: 'viewer', permissions: ['read'] });
      accessService.createRole({
        name: 'editor',
        permissions: ['write'],
        inherits: ['viewer']
      });
      accessService.createRole({
        name: 'admin',
        permissions: ['delete', 'manage'],
        inherits: ['editor']
      });

      accessService.assignRole('admin1', 'admin');

      const permissions = accessService.getEffectivePermissions('admin1');
      expect(permissions).toContain('read');
      expect(permissions).toContain('write');
      expect(permissions).toContain('delete');
      expect(permissions).toContain('manage');
    });
  });
});

/**
 * AccessControlService
 *
 * Fine-grained permissions and access control service
 * Handles resource-level permissions, session management, permission auditing
 */

const crypto = require('crypto');
const EventEmitter = require('events');

class AccessControlService extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      sessionTimeout: config.sessionTimeout || 3600000, // 1 hour
      maxConcurrentSessions: config.maxConcurrentSessions || 10,
      ...config
    };

    // Data stores
    this.roles = new Map(); // roleName -> { permissions, policies, inherits, builtIn }
    this.userRoles = new Map(); // userId -> Set of roleNames
    this.resourcePermissions = new Map(); // `${resourceType}:${resourceId}:${userId}` -> Set of permissions
    this.sessions = new Map(); // sessionId -> session data
    this.userSessions = new Map(); // userId -> Set of sessionIds
    this.policies = new Map(); // policyName -> policy function
    this.delegations = new Map(); // delegationId -> delegation data
    this.permissionAuditLog = new Map(); // userId -> [audit entries]
    this.roleChangeHistory = new Map(); // userId -> [role change entries]
    this.permissionChangeHistory = new Map(); // userId -> [permission change entries]

    // Statistics
    this.stats = {
      permissionChecks: 0
    };
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return crypto.randomBytes(16).toString('hex');
  }

  // ============ Role Management ============

  /**
   * Create a new role
   */
  createRole({ name, description, permissions, policies = [], inherits = [], builtIn = false }) {
    if (this.roles.has(name)) {
      throw new Error(`Role already exists: ${name}`);
    }

    const role = {
      name,
      description,
      permissions: new Set(permissions),
      policies,
      inherits,
      builtIn,
      createdAt: Date.now()
    };

    this.roles.set(name, role);

    return {
      name: role.name,
      description: role.description,
      permissions: Array.from(role.permissions),
      policies: role.policies,
      inherits: role.inherits,
      builtIn: role.builtIn
    };
  }

  /**
   * Update an existing role
   */
  updateRole(name, updates) {
    const role = this.roles.get(name);
    if (!role) {
      throw new Error(`Role not found: ${name}`);
    }

    if (updates.permissions) {
      role.permissions = new Set(updates.permissions);
    }
    if (updates.description !== undefined) {
      role.description = updates.description;
    }
    if (updates.policies) {
      role.policies = updates.policies;
    }
    if (updates.inherits) {
      role.inherits = updates.inherits;
    }

    role.updatedAt = Date.now();

    return {
      name: role.name,
      description: role.description,
      permissions: Array.from(role.permissions)
    };
  }

  /**
   * Delete a role
   */
  deleteRole(name) {
    const role = this.roles.get(name);
    if (!role) {
      throw new Error(`Role not found: ${name}`);
    }
    if (role.builtIn) {
      throw new Error('Cannot delete built-in role');
    }

    this.roles.delete(name);
  }

  /**
   * Get a role by name
   */
  getRole(name) {
    const role = this.roles.get(name);
    if (!role) {
      throw new Error(`Role not found: ${name}`);
    }
    return {
      name: role.name,
      description: role.description,
      permissions: Array.from(role.permissions)
    };
  }

  /**
   * Get all roles
   */
  getAllRoles() {
    return Array.from(this.roles.values()).map(role => ({
      name: role.name,
      description: role.description,
      permissions: Array.from(role.permissions)
    }));
  }

  // ============ User Role Assignment ============

  /**
   * Assign role to user
   */
  assignRole(userId, roleName) {
    if (!this.roles.has(roleName)) {
      throw new Error(`Role not found: ${roleName}`);
    }

    if (!this.userRoles.has(userId)) {
      this.userRoles.set(userId, new Set());
    }

    this.userRoles.get(userId).add(roleName);

    // Log role change
    this.logRoleChange(userId, {
      action: 'ROLE_ASSIGNED',
      role: roleName,
      timestamp: Date.now()
    });
  }

  /**
   * Remove role from user
   */
  removeRole(userId, roleName) {
    const userRoles = this.userRoles.get(userId);
    if (userRoles) {
      userRoles.delete(roleName);

      // Log role change
      this.logRoleChange(userId, {
        action: 'ROLE_REMOVED',
        role: roleName,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get roles for user
   */
  getUserRoles(userId) {
    const roles = this.userRoles.get(userId);
    return roles ? Array.from(roles) : [];
  }

  // ============ Resource-Level Permissions ============

  /**
   * Grant permission on specific resource
   */
  grantResourcePermission({ userId, resourceType, resourceId, permissions }) {
    const key = `${resourceType}:${resourceId}:${userId}`;

    if (!this.resourcePermissions.has(key)) {
      this.resourcePermissions.set(key, new Set());
    }

    permissions.forEach(p => this.resourcePermissions.get(key).add(p));

    // Log permission change
    this.logPermissionChange(userId, {
      action: 'PERMISSION_GRANTED',
      resourceType,
      resourceId,
      permissions,
      timestamp: Date.now()
    });
  }

  /**
   * Revoke permission on specific resource
   */
  revokeResourcePermission({ userId, resourceType, resourceId, permissions }) {
    const key = `${resourceType}:${resourceId}:${userId}`;
    const existing = this.resourcePermissions.get(key);

    if (existing) {
      permissions.forEach(p => existing.delete(p));
    }

    // Log permission change
    this.logPermissionChange(userId, {
      action: 'PERMISSION_REVOKED',
      resourceType,
      resourceId,
      permissions,
      timestamp: Date.now()
    });
  }

  /**
   * Check permission on specific resource
   */
  checkResourcePermission({ userId, resourceType, resourceId, permission }) {
    // Check specific resource permission
    const specificKey = `${resourceType}:${resourceId}:${userId}`;
    const specificPerms = this.resourcePermissions.get(specificKey);
    if (specificPerms && specificPerms.has(permission)) {
      return true;
    }

    // Check wildcard permission
    const wildcardKey = `${resourceType}:*:${userId}`;
    const wildcardPerms = this.resourcePermissions.get(wildcardKey);
    if (wildcardPerms && wildcardPerms.has(permission)) {
      return true;
    }

    // Check role-based permissions
    return this.hasPermission(userId, permission);
  }

  /**
   * Get all permissions for a resource
   */
  getResourcePermissions(resourceType, resourceId) {
    const results = [];
    const prefix = `${resourceType}:${resourceId}:`;

    this.resourcePermissions.forEach((permissions, key) => {
      if (key.startsWith(prefix)) {
        const userId = key.slice(prefix.length);
        results.push({
          userId,
          permissions: Array.from(permissions)
        });
      }
    });

    return results;
  }

  // ============ Permission Checking ============

  /**
   * Get all permissions from role inheritance chain
   */
  getInheritedPermissions(roleName, visited = new Set()) {
    if (visited.has(roleName)) return new Set(); // Prevent circular inheritance
    visited.add(roleName);

    const role = this.roles.get(roleName);
    if (!role) return new Set();

    const permissions = new Set(role.permissions);

    // Add inherited permissions
    if (role.inherits) {
      role.inherits.forEach(parentRole => {
        this.getInheritedPermissions(parentRole, visited).forEach(p => permissions.add(p));
      });
    }

    return permissions;
  }

  /**
   * Check if user has permission
   */
  hasPermission(userId, permission, options = {}) {
    this.stats.permissionChecks++;

    const userRoles = this.userRoles.get(userId) || new Set();
    let hasPermission = false;

    // Check role-based permissions
    for (const roleName of userRoles) {
      const permissions = this.getInheritedPermissions(roleName);

      // Check for wildcard permission (admin)
      if (permissions.has('*')) {
        hasPermission = true;
        break;
      }

      if (permissions.has(permission)) {
        // Check policies if any
        const role = this.roles.get(roleName);
        if (role.policies && role.policies.length > 0) {
          hasPermission = this.evaluatePolicies(role.policies, options.context || {});
        } else {
          hasPermission = true;
        }

        if (hasPermission) break;
      }
    }

    // Check delegated permissions
    if (!hasPermission) {
      hasPermission = this.checkDelegatedPermissions(userId, permission);
    }

    // Log audit if requested
    if (options.audit) {
      this.logPermissionAudit(userId, {
        permission,
        granted: hasPermission,
        timestamp: Date.now()
      });
    }

    return hasPermission;
  }

  /**
   * Get all effective permissions for user
   */
  getEffectivePermissions(userId) {
    const permissions = new Set();
    const userRoles = this.userRoles.get(userId) || new Set();

    for (const roleName of userRoles) {
      this.getInheritedPermissions(roleName).forEach(p => permissions.add(p));
    }

    // Add delegated permissions
    this.delegations.forEach(delegation => {
      if (delegation.toUserId === userId && !this.isDelegationExpired(delegation)) {
        delegation.permissions.forEach(p => permissions.add(p));
      }
    });

    return Array.from(permissions);
  }

  // ============ Policy Management ============

  /**
   * Create a policy
   */
  createPolicy({ name, condition }) {
    this.policies.set(name, condition);
  }

  /**
   * Evaluate policies
   */
  evaluatePolicies(policyNames, context) {
    for (const policyName of policyNames) {
      const policy = this.policies.get(policyName);
      if (policy && !policy(context)) {
        return false;
      }
    }
    return true;
  }

  // ============ Session Management ============

  /**
   * Create a new session
   */
  createSession({ userId, ipAddress, userAgent }) {
    const sessionId = this.generateId();
    const now = Date.now();

    const session = {
      id: sessionId,
      userId,
      ipAddress,
      userAgent,
      createdAt: now,
      lastActivity: now,
      expiresAt: now + this.config.sessionTimeout,
      isActive: true,
      activityLog: []
    };

    // Enforce max concurrent sessions
    this.enforceMaxSessions(userId);

    this.sessions.set(sessionId, session);

    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId).add(sessionId);

    return session;
  }

  /**
   * Enforce maximum concurrent sessions
   */
  enforceMaxSessions(userId) {
    const userSessionIds = this.userSessions.get(userId);
    if (!userSessionIds) return;

    const activeSessions = Array.from(userSessionIds)
      .map(id => this.sessions.get(id))
      .filter(s => s && s.isActive)
      .sort((a, b) => a.createdAt - b.createdAt);

    while (activeSessions.length >= this.config.maxConcurrentSessions) {
      const oldestSession = activeSessions.shift();
      if (oldestSession) {
        oldestSession.isActive = false;
      }
    }
  }

  /**
   * Validate a session
   */
  validateSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    if (!session.isActive) return false;

    if (Date.now() > session.expiresAt) {
      session.isActive = false;
      return false;
    }

    return true;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  /**
   * Refresh session timeout
   */
  refreshSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session && session.isActive) {
      const now = Date.now();
      session.lastActivity = now;
      session.expiresAt = now + this.config.sessionTimeout;
    }
  }

  /**
   * Terminate a session
   */
  terminateSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      session.terminatedAt = Date.now();
    }
  }

  /**
   * Terminate all sessions for user
   */
  terminateAllUserSessions(userId) {
    const sessionIds = this.userSessions.get(userId);
    if (sessionIds) {
      sessionIds.forEach(id => this.terminateSession(id));
    }
  }

  /**
   * Get all sessions for user
   */
  getUserSessions(userId) {
    const sessionIds = this.userSessions.get(userId) || new Set();
    return Array.from(sessionIds)
      .map(id => this.sessions.get(id))
      .filter(Boolean);
  }

  /**
   * Record session activity
   */
  recordSessionActivity(sessionId, activity) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.activityLog.push({
        ...activity,
        timestamp: Date.now()
      });
      session.lastActivity = Date.now();
    }
  }

  // ============ Delegation ============

  /**
   * Delegate permissions to another user
   */
  delegatePermission({ fromUserId, toUserId, permissions, expiresAt }) {
    const delegation = {
      id: this.generateId(),
      fromUserId,
      toUserId,
      permissions,
      expiresAt,
      createdAt: Date.now()
    };

    this.delegations.set(delegation.id, delegation);

    return delegation;
  }

  /**
   * Check if delegation is expired
   */
  isDelegationExpired(delegation) {
    return delegation.expiresAt && Date.now() > new Date(delegation.expiresAt).getTime();
  }

  /**
   * Check delegated permissions
   */
  checkDelegatedPermissions(userId, permission) {
    for (const delegation of this.delegations.values()) {
      if (delegation.toUserId === userId &&
          !this.isDelegationExpired(delegation) &&
          delegation.permissions.includes(permission)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Revoke a delegation
   */
  revokeDelegation(delegationId) {
    this.delegations.delete(delegationId);
  }

  // ============ Audit Logging ============

  /**
   * Log permission audit entry
   */
  logPermissionAudit(userId, entry) {
    if (!this.permissionAuditLog.has(userId)) {
      this.permissionAuditLog.set(userId, []);
    }
    this.permissionAuditLog.get(userId).push(entry);
  }

  /**
   * Get permission audit log
   */
  getPermissionAuditLog(userId) {
    return this.permissionAuditLog.get(userId) || [];
  }

  /**
   * Log role change
   */
  logRoleChange(userId, entry) {
    if (!this.roleChangeHistory.has(userId)) {
      this.roleChangeHistory.set(userId, []);
    }
    this.roleChangeHistory.get(userId).push(entry);
  }

  /**
   * Get role change history
   */
  getRoleChangeHistory(userId) {
    return this.roleChangeHistory.get(userId) || [];
  }

  /**
   * Log permission change
   */
  logPermissionChange(userId, entry) {
    if (!this.permissionChangeHistory.has(userId)) {
      this.permissionChangeHistory.set(userId, []);
    }
    this.permissionChangeHistory.get(userId).push(entry);
  }

  /**
   * Get permission change history
   */
  getPermissionChangeHistory(userId) {
    return this.permissionChangeHistory.get(userId) || [];
  }

  // ============ Statistics ============

  /**
   * Get access control statistics
   */
  getStatistics() {
    return {
      totalRoles: this.roles.size,
      totalUsers: this.userRoles.size,
      activeSessions: Array.from(this.sessions.values()).filter(s => s.isActive).length,
      permissionChecks: this.stats.permissionChecks
    };
  }

  // ============ Reset ============

  /**
   * Reset all data (for testing)
   */
  reset() {
    this.roles.clear();
    this.userRoles.clear();
    this.resourcePermissions.clear();
    this.sessions.clear();
    this.userSessions.clear();
    this.policies.clear();
    this.delegations.clear();
    this.permissionAuditLog.clear();
    this.roleChangeHistory.clear();
    this.permissionChangeHistory.clear();
    this.stats.permissionChecks = 0;
  }
}

module.exports = AccessControlService;

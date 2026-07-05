/**
 * Role-Based Access Control (RBAC) Middleware
 * [Feature] OCAE-302: Implement role-based access control
 * 
 * This middleware provides role and permission-based access control
 * for API endpoints following Semantic Seed security standards.
 */

/**
 * Role-to-permissions mapping
 * This defines what permissions each role has access to
 */
const rolePermissions = {
  'super_admin': [
    'read:users', 'write:users', 'delete:users',
    'read:companies', 'write:companies', 'delete:companies',
    'read:reports', 'write:reports', 'delete:reports',
    'read:spv', 'write:spv', 'delete:spv',
    'read:assets', 'write:assets', 'delete:assets',
    'read:compliance', 'write:compliance', 'delete:compliance',
    'read:equity', 'write:equity',
    'read:documents', 'write:documents',
    'read:valuations', 'write:valuations', 'sign:valuations',
    'financialReports.view',
    'admin:all',
    'platform:manage_roles', 'platform:manage_tenants', 'platform:view_audit_logs'
  ],
  'admin': [
    'read:users', 'write:users', 'delete:users',
    'read:companies', 'write:companies', 'delete:companies',
    'read:reports', 'write:reports', 'delete:reports',
    'read:spv', 'write:spv', 'delete:spv',
    'read:assets', 'write:assets', 'delete:assets',
    'read:compliance', 'write:compliance', 'delete:compliance',
    'read:equity', 'write:equity',
    'read:documents', 'write:documents',
    'read:valuations', 'write:valuations',
    'financialReports.view',
    'admin:all'
  ],
  'founder': [
    'read:users', 'write:users',
    'read:companies', 'write:companies',
    'read:reports', 'write:reports',
    'read:spv', 'write:spv',
    'read:assets', 'write:assets',
    'read:compliance', 'write:compliance',
    'read:equity', 'write:equity',
    'read:documents', 'write:documents',
    'read:valuations',
    'financialReports.view'
  ],
  'accountant': [
    'read:users',
    'read:companies',
    'read:reports',
    'read:compliance', 'write:compliance',
    'read:documents',
    'read:valuations', 'write:valuations', 'sign:valuations'
  ],
  'investor': [
    'read:users',
    'read:companies',
    'read:reports',
    'read:spv',
    'read:assets',
    'read:compliance',
    'read:equity'
  ],
  'manager': [
    'read:users', 'write:users',
    'read:companies', 'write:companies',
    'read:reports', 'write:reports',
    'read:spv', 'write:spv',
    'read:assets', 'write:assets',
    'read:compliance', 'write:compliance'
  ],
  'employee': [
    'read:own_equity',
    'read:own_documents',
    'read:valuation',
    'read:companies',
    'read:compliance'
  ],
  'service_provider': [
    'read:users',
    'read:companies',
    'read:reports',
    'read:compliance', 'write:compliance',
    'read:documents',
    'read:spv',
    'read:assets'
  ],
  'client': [
    'read:companies',
    'read:reports',
    'read:spv',
    'read:assets'
  ]
};

/**
 * Get permissions for a user based on their role and explicit permissions
 * @param {Object} user - User object from request
 * @returns {Array} - Array of permissions the user has
 */
const getUserPermissions = (user) => {
  if (!user) return [];
  
  // Start with explicitly assigned permissions
  let permissions = Array.isArray(user.permissions) ? [...user.permissions] : [];
  
  // Add role-based permissions if role exists
  if (user.role && rolePermissions[user.role]) {
    // Add permissions from role if not already included
    rolePermissions[user.role].forEach(perm => {
      if (!permissions.includes(perm)) {
        permissions.push(perm);
      }
    });
  }
  
  return permissions;
};

/**
 * Check if user has a specific permission
 * @param {Object} user - User object from request
 * @param {String|Array} requiredPermission - Permission or array of permissions to check
 * @returns {Boolean} - Whether user has the required permission
 */
const checkPermission = (user, requiredPermission) => {
  if (!user) {
    return false;
  }

  // Get all user permissions (explicit + role-based)
  const permissions = getUserPermissions(user);
  
  if (Array.isArray(requiredPermission)) {
    // If any permission matches (OR logic)
    return requiredPermission.some(permission => 
      permissions.includes(permission)
    );
  }

  return permissions.includes(requiredPermission);
};

/**
 * Middleware to verify if user has required role
 * @param {Array|String} allowedRoles - Role or roles that can access this resource
 * @returns {Function} Express middleware
 */
const hasRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    if (roles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({ message: 'Access denied: Insufficient role permissions' });
  };
};

/**
 * Middleware to verify if user has required permission
 * @param {String|Array} requiredPermission - Permission or permissions to check
 * @returns {Function} Express middleware
 */
const hasPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (checkPermission(req.user, requiredPermission)) {
      return next();
    }

    return res.status(403).json({ message: 'Access denied: Insufficient permissions' });
  };
};

/**
 * Agent capability scope map
 * Defines which capability labels an agent JWT may carry, and what
 * underlying access those labels grant. Agents are provisioned with
 * one or more capability strings; access is denied unless the agent's
 * capabilities array contains the exact scope required.
 */
const agentCapabilities = {
  'read:cap_table':  ['read:equity', 'read:companies', 'read:users'],
  'read:documents':  ['read:documents'],
  'read:reports':    ['read:reports'],
  'write:documents': ['read:documents', 'write:documents'],
  'admin:all':       ['admin:all'], // only for explicitly provisioned agents
};

/**
 * Middleware factory: verify that an agent JWT carries a required capability.
 * For non-agent requests the check is skipped and next() is called immediately,
 * so the middleware is safe to stack in front of the normal hasRole/hasPermission
 * guards without affecting existing human-user flows.
 *
 * @param {string} requiredCapability - One of the keys in agentCapabilities
 * @returns {Function} Express middleware
 */
const hasAgentCapability = (requiredCapability) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Non-agent requests fall through to normal RBAC handling
    if (req.user.type !== 'agent') {
      return next();
    }

    const capabilities = Array.isArray(req.user.capabilities) ? req.user.capabilities : [];
    if (capabilities.includes(requiredCapability)) {
      return next();
    }

    return res.status(403).json({
      message: `Agent token lacks required capability: ${requiredCapability}`,
    });
  };
};

/**
 * Middleware: block agent tokens from reaching user-sensitive endpoints.
 * Apply after authenticateToken on routes that must never be accessible
 * to machine credentials (user management, billing, admin panel, API key
 * management).
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const requireUserNotAgent = (req, res, next) => {
  if (req.user?.type === 'agent') {
    return res.status(403).json({ message: 'Agent tokens cannot access this endpoint' });
  }
  return next();
};

module.exports = {
  checkPermission,
  hasRole,
  hasPermission,
  getUserPermissions, // Export for testing
  rolePermissions,    // Export for reference
  agentCapabilities,
  hasAgentCapability,
  requireUserNotAgent,
};

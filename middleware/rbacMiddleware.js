/**
 * Role-Based Access Control (RBAC) Middleware
 * [Feature] OCAE-302: Implement role-based access control
 * 
 * This middleware provides role and permission-based access control
 * for API endpoints following Semantic Seed security standards.
 */

/**
 * Check if user has a specific permission
 * @param {Object} user - User object from request
 * @param {String|Array} requiredPermission - Permission or array of permissions to check
 * @returns {Boolean} - Whether user has the required permission
 */
const checkPermission = (user, requiredPermission) => {
  if (!user || !user.permissions) {
    return false;
  }

  if (Array.isArray(requiredPermission)) {
    // If any permission matches (OR logic)
    return requiredPermission.some(permission => 
      user.permissions.includes(permission)
    );
  }

  return user.permissions.includes(requiredPermission);
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

module.exports = {
  checkPermission,
  hasRole,
  hasPermission
};

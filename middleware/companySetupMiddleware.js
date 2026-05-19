/**
 * Company Setup Middleware
 * Allows authenticated users without a company to create their first company
 * during onboarding, bypassing the normal RBAC permission check.
 *
 * Once a user has a companyId, normal permission checks apply.
 */

const { checkPermission } = require('./rbacMiddleware');

/**
 * Middleware that allows first-time company creation for any authenticated user.
 * If the user already has a companyId, falls back to standard permission check.
 *
 * @param {String|Array} requiredPermission - Permission required for users who already have a company
 * @returns {Function} Express middleware
 */
const allowCompanySetup = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Allow first-time company setup: user has no companyId yet
    if (!req.user.companyId) {
      return next();
    }

    // User already has a company — enforce normal RBAC
    if (checkPermission(req.user, requiredPermission)) {
      return next();
    }

    return res.status(403).json({ message: 'Access denied: Insufficient permissions' });
  };
};

module.exports = {
  allowCompanySetup
};

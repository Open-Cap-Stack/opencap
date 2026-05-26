'use strict';

/**
 * Engagement Scope Middleware
 *
 * Phase 4: Service provider engagement-scoped access
 *
 * For service_provider role: checks req.user.profile.accessScopes includes the required scope.
 * For all other roles: calls next() immediately (normal RBAC already applied upstream).
 */

/**
 * Middleware factory: check that a service_provider has the required engagement scope.
 *
 * @param {string} scope - Required scope string e.g. 'documents', 'compliance', 'cap_table_read'
 * @returns {Function} Express middleware
 */
const requireEngagementScope = (scope) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Non-service_provider roles: bypass engagement scope check, normal RBAC applies
    if (req.user.role !== 'service_provider') {
      return next();
    }

    // service_provider: validate accessScopes in profile
    const accessScopes = req.user.profile?.accessScopes;

    if (!Array.isArray(accessScopes) || !accessScopes.includes(scope)) {
      return res.status(403).json({
        message: `Access denied: engagement scope '${scope}' is not permitted for this service provider`,
      });
    }

    return next();
  };
};

module.exports = { requireEngagementScope };

'use strict';

/**
 * Middleware that enforces company-scoped resource access.
 * Adds req.companyId from the authenticated user and provides
 * helpers for controllers to validate resource ownership.
 */

/**
 * Middleware: ensures req.user.companyId is present.
 * Attaches req.companyId for convenience.
 */
const requireCompanyScope = (req, res, next) => {
  if (!req.user?.companyId) {
    return res.status(403).json({ message: 'No company scope — access denied' });
  }
  req.companyId = req.user.companyId;
  return next();
};

/**
 * Validates that a fetched resource belongs to the requesting user's company.
 * Returns false and sends 403 if mismatch.
 * Only enforces when resource.companyId is set and differs from the user's —
 * allows admin/founder/manager who legitimately access cross-resource data
 * to pass through when the resource has no companyId set.
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Object|null} resource - The fetched resource to validate
 * @returns {boolean} true if access is allowed, false if a 403/404 was sent
 */
const ADMIN_ROLES = new Set(['admin', 'superadmin', 'super_admin']);

const assertCompanyOwnership = (req, res, resource) => {
  if (!resource) {
    res.status(404).json({ error: 'Resource not found' });
    return false;
  }
  // Admin roles have platform-wide access and bypass the company scope check
  if (ADMIN_ROLES.has(req.user?.role)) {
    return true;
  }
  if (resource.companyId && resource.companyId !== req.user?.companyId) {
    res.status(403).json({ error: 'Access denied: resource belongs to another company' });
    return false;
  }
  return true;
};

/**
 * Validates that a resource belongs to the requesting user (for employee self-service).
 * Returns false and sends 403 if mismatch.
 * Only enforces when resource[userIdField] is set and differs from req.user.userId.
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Object|null} resource - The fetched resource to validate
 * @param {string} userIdField - The field name on the resource containing the owner's userId
 * @returns {boolean} true if access is allowed, false if a 403/404 was sent
 */
const assertUserOwnership = (req, res, resource, userIdField = 'userId') => {
  if (!resource) {
    res.status(404).json({ error: 'Resource not found' });
    return false;
  }
  if (resource[userIdField] && resource[userIdField] !== req.user?.userId) {
    res.status(403).json({ error: 'Access denied: resource belongs to another user' });
    return false;
  }
  return true;
};

module.exports = { requireCompanyScope, assertCompanyOwnership, assertUserOwnership };

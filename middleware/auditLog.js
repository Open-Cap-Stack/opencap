'use strict';

/**
 * Audit Log Middleware
 * Phase 5: Intercept responses and record role-gated actions
 *
 * Usage:
 *   router.post('/grants', authenticateToken, hasRole([...]),
 *     auditAction('create_equity_grant', 'equity_grant'),
 *     equityGrantController.createEquityGrant);
 *
 * The middleware wraps res.json so the log is written after the response
 * body is determined. Uses fire-and-forget (.catch(() => {})) so audit
 * failures never block or alter the primary response.
 */

const auditLogService = require('../services/auditLogService');

/**
 * Determine outcome string from HTTP status code.
 * @param {number} statusCode
 * @returns {'success'|'denied'|'error'}
 */
function outcomeFromStatus(statusCode) {
  if (statusCode < 400) return 'success';
  if (statusCode === 403) return 'denied';
  return 'error';
}

/**
 * Middleware factory that wraps res.json to log the action after the
 * response is sent.
 *
 * @param {string} action   - Action name e.g. 'create_equity_grant'
 * @param {string} resource - Resource name e.g. 'equity_grant'
 * @returns {Function} Express middleware (req, res, next)
 */
function auditAction(action, resource) {
  return function auditActionMiddleware(req, res, next) {
    const originalJson = res.json.bind(res);

    res.json = function auditWrappedJson(body) {
      const outcome = outcomeFromStatus(res.statusCode);

      auditLogService.logAction({
        userId: req.user?.userId,
        userRole: req.user?.role,
        companyId: req.user?.companyId,
        action,
        resource,
        outcome,
        req
      }).catch(() => {});

      return originalJson(body);
    };

    next();
  };
}

module.exports = { auditAction };

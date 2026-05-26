'use strict';

/**
 * Audit Log Controller
 * Phase 5: Query endpoints for audit log records
 *
 * All endpoints require super_admin or admin role (enforced at the route level).
 * - GET /api/v1/audit-logs       — list with filters
 * - GET /api/v1/audit-logs/:id   — single log by logId
 */

const auditLogService = require('../services/auditLogService');

/**
 * GET /api/v1/audit-logs
 * Query audit logs. Admins are scoped to their own company.
 * Super admins may query any company by passing ?companyId=...
 */
async function getAuditLogs(req, res, next) {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';

    // Non-super_admins are always scoped to their own company
    const companyId = isSuperAdmin
      ? (req.query.companyId || undefined)
      : req.user?.companyId;

    const filters = {
      companyId,
      userId: req.query.userId || undefined,
      action: req.query.action || undefined,
      startDate: req.query.startDate || undefined,
      endDate: req.query.endDate || undefined,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
      skip: req.query.skip ? parseInt(req.query.skip, 10) : undefined
    };

    const logs = await auditLogService.getAuditLogs(filters);

    return res.status(200).json({ logs });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/audit-logs/:id
 * Retrieve a single audit log entry by its logId.
 */
async function getAuditLogById(req, res, next) {
  try {
    const log = await auditLogService.getAuditLogById(req.params.id);

    if (!log) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    return res.status(200).json({ log });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getAuditLogs,
  getAuditLogById
};

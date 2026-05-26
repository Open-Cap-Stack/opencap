'use strict';

/**
 * Audit Log Routes
 * Phase 5: Expose audit log query endpoints
 *
 * Mounted at /api/v1/audit-logs by app.js
 * Access restricted to super_admin and admin roles.
 */

const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const auditLogController = require('../../controllers/auditLogController');

const AUDIT_ROLES = ['super_admin', 'admin'];

// Apply authentication to all audit log routes
router.use(authenticateToken);

// GET /api/v1/audit-logs — list with optional filters
router.get('/', hasRole(AUDIT_ROLES), auditLogController.getAuditLogs);

// GET /api/v1/audit-logs/:id — single log by logId
router.get('/:id', hasRole(AUDIT_ROLES), auditLogController.getAuditLogById);

module.exports = router;

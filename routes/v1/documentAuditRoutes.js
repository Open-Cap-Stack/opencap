/**
 * Document Audit Routes
 *
 * Issue #102: Add Document Audit Trail
 *
 * Routes for document audit trail operations.
 * Provides endpoints for querying, searching, and reporting on document activities.
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const documentAuditController = require('../../controllers/documentAuditController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * GET /api/v1/audit/action-types
 * Get available action types
 */
router.get('/action-types', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), documentAuditController.getActionTypes);

/**
 * GET /api/v1/audit/search
 * Search audit trail with various filters
 *
 * Query Parameters:
 * - documentId: Filter by document
 * - userId: Filter by user
 * - actionType: Filter by action type (comma-separated for multiple)
 * - companyId: Filter by company
 * - ipAddress: Filter by IP address
 * - startDate: Start date filter (ISO string)
 * - endDate: End date filter (ISO string)
 * - keyword: Keyword search
 * - limit: Maximum results (default: 100)
 * - skip: Number to skip for pagination
 */
router.get('/search', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), documentAuditController.searchAuditTrail);

/**
 * GET /api/v1/audit/date-range
 * Get audit entries by date range
 *
 * Query Parameters:
 * - startDate: Start date (required, ISO string)
 * - endDate: End date (required, ISO string)
 * - documentId: Filter by document
 * - actionType: Filter by action type
 * - companyId: Filter by company
 * - userId: Filter by user
 * - limit: Maximum results (default: 100)
 * - skip: Number to skip for pagination
 */
router.get('/date-range', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), documentAuditController.getAuditByDateRange);

/**
 * GET /api/v1/audit/user/:userId
 * Get audit entries by user
 *
 * Query Parameters:
 * - actionType: Filter by action type
 * - documentId: Filter by document
 * - startDate: Start date filter (ISO string)
 * - endDate: End date filter (ISO string)
 * - limit: Maximum results (default: 100)
 * - skip: Number to skip for pagination
 */
router.get('/user/:userId', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), documentAuditController.getAuditByUser);

/**
 * POST /api/v1/audit/report
 * Generate compliance audit report
 *
 * Body Parameters:
 * - companyId: Company ID (required)
 * - startDate: Report start date (required, ISO string)
 * - endDate: Report end date (required, ISO string)
 * - reportType: Type of report (optional, default: 'comprehensive')
 */
router.post('/report', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), documentAuditController.generateAuditReport);

/**
 * POST /api/v1/audit/log
 * Log a manual audit entry
 *
 * Body Parameters:
 * - documentId: Document ID (required)
 * - actionType: Action type (required)
 * - metadata: Additional metadata (optional)
 * - reason: Reason for action (optional)
 */
router.post('/log', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), documentAuditController.logAuditEntry);

/**
 * GET /api/v1/audit/documents/:documentId
 * Get audit trail for a specific document
 *
 * Query Parameters:
 * - actionType: Filter by action type
 * - startDate: Start date filter (ISO string)
 * - endDate: End date filter (ISO string)
 * - limit: Maximum results (default: 100)
 * - skip: Number to skip for pagination
 */
router.get('/documents/:documentId', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), documentAuditController.getDocumentAuditTrail);

/**
 * GET /api/v1/audit/documents/:documentId/stats
 * Get document action statistics
 *
 * Query Parameters:
 * - startDate: Start date filter (ISO string)
 * - endDate: End date filter (ISO string)
 */
router.get('/documents/:documentId/stats', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), documentAuditController.getDocumentAuditStats);

module.exports = router;

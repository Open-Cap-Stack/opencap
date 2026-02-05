/**
 * Bulk Reports Routes (v1)
 * Issue #238: Implement Bulk Reports Endpoint
 *
 * Routes for bulk report generation with JWT authentication.
 */

const express = require('express');
const router = express.Router();
const bulkReportsController = require('../../controllers/bulkReportsController');
const { authenticateToken } = require('../../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * POST /api/v1/reports/bulk
 * Generate multiple reports in bulk
 *
 * Body:
 * {
 *   reports: [
 *     { reportType: 'financial', format: 'pdf', parameters: {...} },
 *     { reportType: 'equity', format: 'csv', parameters: {...} }
 *   ]
 * }
 */
router.post('/', bulkReportsController.generateBulkReports);

/**
 * GET /api/v1/reports/bulk
 * Get all bulk jobs for authenticated user
 *
 * Query params:
 * - status: Filter by job status (optional)
 */
router.get('/', bulkReportsController.getUserBulkJobs);

/**
 * GET /api/v1/reports/bulk/:jobId
 * Get status of a specific bulk job
 */
router.get('/:jobId', bulkReportsController.getBulkJobStatus);

/**
 * DELETE /api/v1/reports/bulk/:jobId
 * Cancel a bulk job
 */
router.delete('/:jobId', bulkReportsController.cancelBulkJob);

module.exports = router;

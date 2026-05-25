/**
 * EquityPlanReport Routes
 * Issue #110: Implement Equity Plan Reports
 * Issue #234: Fix Reports Page 401 Unauthorized Errors
 *
 * API routes for equity plan report operations.
 */
const express = require('express');
const router = express.Router();
const equityPlanReportController = require('../../controllers/equityPlanReportController');
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Report type and format info
router.get('/types', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityPlanReportController.getAvailableReportTypes);
router.get('/formats', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityPlanReportController.getAvailableFormats);

// Generate specific report types
router.post('/generate/option-pool-summary', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityPlanReportController.generateOptionPoolSummary);
router.post('/generate/grant-status', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityPlanReportController.generateGrantStatusReport);
router.post('/generate/vesting-schedule', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityPlanReportController.generateVestingScheduleReport);
router.post('/generate/dilution-analysis', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityPlanReportController.generateDilutionAnalysis);

// Report CRUD
router.post('/', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityPlanReportController.createReport);
router.get('/', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityPlanReportController.getReports);
router.get('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityPlanReportController.getReportById);
router.delete('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityPlanReportController.deleteReport);

// Export report
router.get('/:id/export', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityPlanReportController.exportReport);

module.exports = router;

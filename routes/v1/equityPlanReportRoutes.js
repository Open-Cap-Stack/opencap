/**
 * EquityPlanReport Routes
 * Issue #110: Implement Equity Plan Reports
 *
 * API routes for equity plan report operations.
 */
const express = require('express');
const router = express.Router();
const equityPlanReportController = require('../../controllers/equityPlanReportController');

// Report type and format info
router.get('/types', equityPlanReportController.getAvailableReportTypes);
router.get('/formats', equityPlanReportController.getAvailableFormats);

// Generate specific report types
router.post('/generate/option-pool-summary', equityPlanReportController.generateOptionPoolSummary);
router.post('/generate/grant-status', equityPlanReportController.generateGrantStatusReport);
router.post('/generate/vesting-schedule', equityPlanReportController.generateVestingScheduleReport);
router.post('/generate/dilution-analysis', equityPlanReportController.generateDilutionAnalysis);

// Report CRUD
router.post('/', equityPlanReportController.createReport);
router.get('/', equityPlanReportController.getReports);
router.get('/:id', equityPlanReportController.getReportById);
router.delete('/:id', equityPlanReportController.deleteReport);

// Export report
router.get('/:id/export', equityPlanReportController.exportReport);

module.exports = router;

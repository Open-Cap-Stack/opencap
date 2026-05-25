/**
 * Financial Report Routes (v1)
 * 
 * [Feature] OCAE-205: Implement financial reporting endpoints
 * Versioned routes for financial report management with JWT auth
 */

const express = require('express');
const router = express.Router();
const financialReportController = require('../../controllers/v1/financialReportController.zerodb');
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Basic collection routes
router.post('/', hasRole(['super_admin', 'admin', 'founder', 'accountant']), financialReportController.createFinancialReport);
router.get('/', hasRole(['super_admin', 'admin', 'founder', 'accountant']), financialReportController.getAllFinancialReports);

// Special endpoints - must be defined BEFORE the :id route to avoid matching conflicts
router.get('/search', hasRole(['super_admin', 'admin', 'founder', 'accountant']), financialReportController.searchFinancialReports);
router.get('/analytics', hasRole(['super_admin', 'admin', 'founder', 'accountant']), financialReportController.getFinancialReportAnalytics);
router.post('/bulk', hasRole(['super_admin', 'admin', 'founder', 'accountant']), financialReportController.bulkCreateFinancialReports);

// Individual resource routes with parameters
router.get('/:id', hasRole(['super_admin', 'admin', 'founder', 'accountant']), financialReportController.getFinancialReportById);
router.put('/:id', hasRole(['super_admin', 'admin', 'founder', 'accountant']), financialReportController.updateFinancialReport);
router.delete('/:id', hasRole(['super_admin', 'admin', 'founder', 'accountant']), financialReportController.deleteFinancialReport);

module.exports = router;

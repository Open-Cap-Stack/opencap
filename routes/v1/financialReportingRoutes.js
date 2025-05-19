/**
 * Financial Report Routes (v1)
 * 
 * [Feature] OCAE-205: Implement financial reporting endpoints
 * Versioned routes for financial report management with JWT auth
 */

const express = require('express');
const router = express.Router();
const financialReportController = require('../../controllers/v1/financialReportController');
const { authenticateToken } = require('../../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Basic collection routes
router.post('/', financialReportController.createFinancialReport);
router.get('/', financialReportController.getAllFinancialReports);

// Special endpoints - must be defined BEFORE the :id route to avoid matching conflicts
router.get('/search', financialReportController.searchFinancialReports);
router.get('/analytics', financialReportController.getFinancialReportAnalytics);
router.post('/bulk', financialReportController.bulkCreateFinancialReports);

// Individual resource routes with parameters
router.get('/:id', financialReportController.getFinancialReportById);
router.put('/:id', financialReportController.updateFinancialReport);
router.delete('/:id', financialReportController.deleteFinancialReport);

module.exports = router;

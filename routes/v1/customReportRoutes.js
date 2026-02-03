/**
 * Custom Report Routes (v1)
 * Issue #197: Build Custom Report Builder Engine
 *
 * Routes for custom report builder functionality with JWT authentication.
 */

const express = require('express');
const router = express.Router();
const customReportController = require('../../controllers/customReportController');
const { authenticateToken } = require('../../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Metadata endpoints - must be before parameterized routes
router.get('/data-sources', customReportController.getDataSources);
router.get('/fields', customReportController.getAvailableFields);
router.post('/preview', customReportController.previewReport);

// Basic CRUD operations
router.post('/', customReportController.createCustomReport);
router.get('/', customReportController.listCustomReports);

// Individual resource routes
router.get('/:id', customReportController.getCustomReport);
router.put('/:id', customReportController.updateCustomReport);
router.delete('/:id', customReportController.deleteCustomReport);

// Report execution
router.post('/:id/execute', customReportController.executeCustomReport);

module.exports = router;

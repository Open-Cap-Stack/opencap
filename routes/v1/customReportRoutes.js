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
const { hasRole } = require('../../middleware/rbacMiddleware');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Metadata endpoints - must be before parameterized routes
router.get('/data-sources', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), customReportController.getDataSources);
router.get('/fields', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), customReportController.getAvailableFields);
router.post('/preview', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), customReportController.previewReport);

// Basic CRUD operations
router.post('/', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), customReportController.createCustomReport);
router.get('/', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), customReportController.listCustomReports);

// Individual resource routes
router.get('/:id', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), customReportController.getCustomReport);
router.put('/:id', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), customReportController.updateCustomReport);
router.delete('/:id', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), customReportController.deleteCustomReport);

// Report execution
router.post('/:id/execute', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), customReportController.executeCustomReport);

module.exports = router;

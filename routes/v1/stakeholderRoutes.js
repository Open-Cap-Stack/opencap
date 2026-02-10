/**
 * Stakeholder Routes
 * Migrated to use ZeroDB model
 */

const express = require('express');
const router = express.Router();
const stakeholderController = require('../../controllers/stakeholderController');
const bulkReportsController = require('../../controllers/bulkReportsController');
const { authenticateToken } = require('../../middleware/authMiddleware');

// Apply authentication to all stakeholder routes
router.use(authenticateToken);

/**
 * POST /api/v1/stakeholders/reports/bulk
 * Generate bulk reports for multiple stakeholders
 */
router.post('/reports/bulk', bulkReportsController.generateBulkReports);

/**
 * GET /api/v1/stakeholders
 * Get all stakeholders (supports companyId, projectId, role, status filters + pagination)
 */
router.get('/', stakeholderController.getAllStakeholders);

/**
 * GET /api/v1/stakeholders/:id
 * Get stakeholder by ID (_id or stakeholderId)
 */
router.get('/:id', stakeholderController.getStakeholderById);

/**
 * POST /api/v1/stakeholders
 * Create a new stakeholder
 */
router.post('/', stakeholderController.createStakeholder);

/**
 * PUT /api/v1/stakeholders/:id
 * Update a stakeholder
 */
router.put('/:id', stakeholderController.updateStakeholderById);

/**
 * DELETE /api/v1/stakeholders/:id
 * Delete a stakeholder
 */
router.delete('/:id', stakeholderController.deleteStakeholderById);

module.exports = router;

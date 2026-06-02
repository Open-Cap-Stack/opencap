/**
 * Stakeholder Routes
 * Migrated to use ZeroDB model
 */

const express = require('express');
const router = express.Router();
const stakeholderController = require('../../controllers/stakeholderController');
const bulkReportsController = require('../../controllers/bulkReportsController');
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const { auditAction } = require('../../middleware/auditLog');
const qsbsEligibilityService = require('../../services/qsbsEligibilityService');

// Apply authentication to all stakeholder routes
router.use(authenticateToken);

/**
 * POST /api/v1/stakeholders/reports/bulk
 * Generate bulk reports for multiple stakeholders
 */
router.post('/reports/bulk', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), bulkReportsController.generateBulkReports);

/**
 * GET /api/v1/stakeholders
 * Get all stakeholders (supports companyId, projectId, role, status filters + pagination)
 */
router.get('/', hasRole(['super_admin', 'admin', 'founder', 'manager', 'employee', 'service_provider']), stakeholderController.getAllStakeholders);

/**
 * GET /api/v1/stakeholders/:id/qsbs-eligibility
 * Issue #656: QSBS Section 1202 eligibility check for a stakeholder
 * Query params: entityType, grossAssetsAtIssuance, acquisitionDate, businessType,
 *               sharesAcquired, acquisitionPrice
 */
router.get('/:id/qsbs-eligibility', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), async (req, res) => {
  try {
    const { entityType, grossAssetsAtIssuance, acquisitionDate, businessType, sharesAcquired, acquisitionPrice } = req.query;
    const eligibilityData = {
      stakeholderId: req.params.id,
      entityType,
      grossAssetsAtIssuance: grossAssetsAtIssuance ? parseFloat(grossAssetsAtIssuance) : undefined,
      acquisitionDate,
      businessType,
      sharesAcquired: sharesAcquired ? parseInt(sharesAcquired, 10) : undefined,
      acquisitionPrice: acquisitionPrice ? parseFloat(acquisitionPrice) : undefined
    };
    const result = qsbsEligibilityService.evaluateEligibility(eligibilityData);
    res.status(200).json(result);
  } catch (error) {
    console.error('QSBS eligibility check failed:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/v1/stakeholders/:id
 * Get stakeholder by ID (_id or stakeholderId)
 */
router.get('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'employee', 'service_provider']), stakeholderController.getStakeholderById);

/**
 * POST /api/v1/stakeholders
 * Create a new stakeholder
 */
router.post('/', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), auditAction('create_stakeholder', 'stakeholder'), stakeholderController.createStakeholder);

/**
 * PUT /api/v1/stakeholders/:id
 * Update a stakeholder
 */
router.put('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), auditAction('update_stakeholder', 'stakeholder'), stakeholderController.updateStakeholderById);

/**
 * DELETE /api/v1/stakeholders/:id
 * Delete a stakeholder
 */
router.delete('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), auditAction('delete_stakeholder', 'stakeholder'), stakeholderController.deleteStakeholderById);

module.exports = router;

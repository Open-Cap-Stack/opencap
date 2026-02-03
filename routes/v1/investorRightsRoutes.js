/**
 * InvestorRights Routes
 *
 * Issue #92: Implement Investor Rights Tracking
 *
 * API routes for managing investor rights including:
 * - CRUD operations
 * - Rights exercise workflow
 * - Expiration tracking
 * - Conflict detection
 * - Audit history
 */

const express = require('express');
const router = express.Router();
const investorRightsController = require('../../controllers/investorRightsController');

/**
 * @route GET /api/v1/investor-rights
 * @desc Get all investor rights with optional filters
 * @query {string} investorId - Filter by investor ID
 * @query {string} companyId - Filter by company ID
 * @query {string} shareClassId - Filter by share class ID
 * @query {string} rightType - Filter by right type
 * @query {string} status - Filter by status
 * @access Public
 */
router.get('/', investorRightsController.getAllInvestorRights);

/**
 * @route GET /api/v1/investor-rights/expiring
 * @desc Get rights expiring within specified days
 * @query {number} days - Number of days to look ahead (default 30)
 * @query {string} companyId - Optional company filter
 * @access Public
 */
router.get('/expiring', investorRightsController.getExpiringRights);

/**
 * @route POST /api/v1/investor-rights/check-conflicts
 * @desc Check for conflicts with a proposed new right
 * @body {string} companyId - Company ID (required)
 * @body {string} investorId - Investor ID
 * @body {string} rightType - Right type (required)
 * @body {Object} terms - Right terms
 * @access Public
 */
router.post('/check-conflicts', investorRightsController.checkConflicts);

/**
 * @route GET /api/v1/investor-rights/share-class/:shareClassId
 * @desc Get all rights for a specific share class
 * @param {string} shareClassId - Share class ID
 * @access Public
 */
router.get('/share-class/:shareClassId', investorRightsController.getRightsByShareClass);

/**
 * @route GET /api/v1/investor-rights/report/:companyId
 * @desc Generate rights summary report for a company
 * @param {string} companyId - Company ID
 * @access Public
 */
router.get('/report/:companyId', investorRightsController.generateReport);

/**
 * @route GET /api/v1/investor-rights/:id
 * @desc Get investor right by ID
 * @param {string} id - Investor right ID
 * @access Public
 */
router.get('/:id', investorRightsController.getInvestorRightById);

/**
 * @route POST /api/v1/investor-rights
 * @desc Create a new investor right
 * @body {string} rightId - Unique right ID (required)
 * @body {string} investorId - Investor ID (required)
 * @body {string} companyId - Company ID (required)
 * @body {string} shareClassId - Share class ID
 * @body {string} rightType - Right type (required)
 * @body {string} status - Status (default: ACTIVE)
 * @body {Object} terms - Right-specific terms
 * @body {Date} expirationDate - Expiration date
 * @body {Date} effectiveDate - Effective date
 * @body {string} sourceDocument - Source document reference
 * @body {string} sourceDocumentType - Type of source document
 * @body {string} notes - Additional notes
 * @access Public
 */
router.post('/', investorRightsController.createInvestorRight);

/**
 * @route PUT /api/v1/investor-rights/:id
 * @desc Update investor right by ID
 * @param {string} id - Investor right ID
 * @access Public
 */
router.put('/:id', investorRightsController.updateInvestorRight);

/**
 * @route DELETE /api/v1/investor-rights/:id
 * @desc Delete investor right by ID
 * @param {string} id - Investor right ID
 * @access Public
 */
router.delete('/:id', investorRightsController.deleteInvestorRight);

/**
 * @route POST /api/v1/investor-rights/:id/exercise
 * @desc Exercise a right
 * @param {string} id - Investor right ID
 * @body {number} exerciseAmount - Amount to exercise
 * @body {Date} exerciseDate - Date of exercise
 * @body {string} notes - Exercise notes
 * @access Public
 */
router.post('/:id/exercise', investorRightsController.exerciseRight);

/**
 * @route POST /api/v1/investor-rights/:id/waive
 * @desc Waive a right
 * @param {string} id - Investor right ID
 * @body {string} reason - Reason for waiving
 * @body {string} documentReference - Reference to waiver document
 * @access Public
 */
router.post('/:id/waive', investorRightsController.waiveRight);

/**
 * @route GET /api/v1/investor-rights/:id/audit
 * @desc Get audit history for a right
 * @param {string} id - Investor right ID
 * @access Public
 */
router.get('/:id/audit', investorRightsController.getAuditHistory);

module.exports = router;

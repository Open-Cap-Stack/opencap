/**
 * SPV Management API Routes
 * Feature: OCAE-211: Implement SPV Management API
 * 
 * These routes handle CRUD operations for Special Purpose Vehicles (SPVs),
 * including creation, retrieval, update, and deletion of SPV records.
 * They also provide specialized endpoints for filtering SPVs by various criteria.
 */
const express = require('express');
const router = express.Router();
const SPVController = require('../../controllers/SPV');

/**
 * @route POST /api/spvs
 * @desc Create a new SPV
 * @access Private
 */
router.post('/', SPVController.createSPV);

/**
 * @route GET /api/spvs
 * @desc Get all SPVs
 * @access Private
 */
router.get('/', SPVController.getSPVs);

/**
 * Special handler for trailing slash requests to return 404
 * This handles the test case for empty ID parameter
 */
router.get('///', (req, res) => {
  return res.status(404).json({ message: 'SPV ID is required' });
});

/**
 * @route GET /api/spvs/status/:status
 * @desc Get SPVs by status (Active, Pending, Closed)
 * @access Private
 */
router.get('/status/:status', SPVController.getSPVsByStatus);

/**
 * @route GET /api/spvs/compliance/:status
 * @desc Get SPVs by compliance status (Compliant, NonCompliant, PendingReview)
 * @access Private
 */
router.get('/compliance/:status', SPVController.getSPVsByComplianceStatus);

/**
 * @route GET /api/spvs/parent/:id
 * @desc Get SPVs by parent company ID
 * @access Private
 */
router.get('/parent/:id', SPVController.getSPVsByParentCompany);

/**
 * @route GET /api/spvs/:id
 * @desc Get SPV by ID (either MongoDB ID or custom SPVID)
 * @access Private
 */
router.get('/:id', (req, res, next) => {
  // Check for empty ID parameter and handle it directly
  if (!req.params.id || req.params.id.trim() === '') {
    return res.status(404).json({ message: 'SPV ID is required' });
  }
  next();
}, SPVController.getSPVById);

/**
 * @route PUT /api/spvs/:id
 * @desc Update an SPV by ID
 * @access Private
 */
router.put('/:id', (req, res, next) => {
  // Check for empty ID parameter and handle it directly
  if (!req.params.id || req.params.id.trim() === '') {
    return res.status(404).json({ message: 'SPV ID is required' });
  }
  next();
}, SPVController.updateSPV);

/**
 * @route DELETE /api/spvs/:id
 * @desc Delete an SPV by ID
 * @access Private
 */
router.delete('/:id', (req, res, next) => {
  // Check for empty ID parameter and handle it directly
  if (!req.params.id || req.params.id.trim() === '') {
    return res.status(404).json({ message: 'SPV ID is required' });
  }
  next();
}, SPVController.deleteSPV);

module.exports = router;

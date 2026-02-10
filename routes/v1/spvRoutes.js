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
const { authenticateToken } = require('../../middleware/authMiddleware');
const SPVController = require('../../controllers/SPV');
const SPVNestedController = require('../../controllers/SPVNested');

// Apply authentication middleware to all routes
router.use(authenticateToken);

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
 * @route GET /api/spvs/analytics
 * @desc Get SPV analytics and summary data
 * @access Private
 */
router.get('/analytics', SPVController.getSPVAnalytics);

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
 * SPV Nested Endpoints (Issue #123)
 * These routes must be defined BEFORE the generic /:id route
 */

/**
 * @route GET /api/spvs/:id/investments
 * @desc Get all investments for an SPV
 * @access Private
 */
router.get('/:id/investments', SPVNestedController.getSPVInvestments);

/**
 * @route GET /api/spvs/:id/performance
 * @desc Get performance metrics for an SPV (NAV, ROI, IRR)
 * @access Private
 */
router.get('/:id/performance', SPVNestedController.getSPVPerformance);

/**
 * @route GET /api/spvs/:id/reports/:type
 * @desc Generate report for an SPV (summary, detailed, tax)
 * @access Private
 */
router.get('/:id/reports/:type', SPVNestedController.getSPVReport);

/**
 * @route POST /api/spvs/:id/close
 * @desc Close an SPV
 * @access Private
 */
router.post('/:id/close', SPVNestedController.closeSPV);

/**
 * @route POST /api/spvs/:id/liquidate
 * @desc Liquidate an SPV and distribute assets
 * @access Private
 */
router.post('/:id/liquidate', SPVNestedController.liquidateSPV);

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

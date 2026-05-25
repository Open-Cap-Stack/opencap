/**
 * Fundraise Model Routes
 * Issue #195: Interactive Fundraising Modeling Engine
 *
 * API routes for fundraising model operations
 */

const express = require('express');
const router = express.Router();
const fundraiseModelController = require('../../controllers/fundraiseModelController');
const { authenticate } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   POST /api/v1/fundraise-models
 * @desc    Create a new fundraising model
 * @access  Private
 */
router.post('/', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), fundraiseModelController.createModel);

/**
 * @route   GET /api/v1/fundraise-models
 * @desc    Get all fundraising models with optional filters
 * @access  Private
 * @query   companyId, status, modelType
 */
router.get('/', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), fundraiseModelController.getModels);

/**
 * @route   GET /api/v1/fundraise-models/:id
 * @desc    Get a specific fundraising model
 * @access  Private
 */
router.get('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), fundraiseModelController.getModel);

/**
 * @route   PUT /api/v1/fundraise-models/:id
 * @desc    Update a fundraising model
 * @access  Private
 */
router.put('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), fundraiseModelController.updateModel);

/**
 * @route   POST /api/v1/fundraise-models/:id/calculate
 * @desc    Calculate dilution and pro-forma cap table
 * @access  Private
 */
router.post('/:id/calculate', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), fundraiseModelController.calculateModel);

/**
 * @route   POST /api/v1/fundraise-models/:id/waterfall
 * @desc    Calculate waterfall distribution for exit scenario
 * @access  Private
 */
router.post('/:id/waterfall', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), fundraiseModelController.calculateWaterfall);

/**
 * @route   POST /api/v1/fundraise-models/:id/scenarios
 * @desc    Add a new scenario to the model
 * @access  Private
 */
router.post('/:id/scenarios', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), fundraiseModelController.addScenario);

/**
 * @route   GET /api/v1/fundraise-models/:id/scenarios/:scenarioId
 * @desc    Get a specific scenario
 * @access  Private
 */
router.get('/:id/scenarios/:scenarioId', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), fundraiseModelController.getScenario);

/**
 * @route   GET /api/v1/fundraise-models/:id/pro-forma
 * @desc    Get pro-forma cap table for the model
 * @access  Private
 */
router.get('/:id/pro-forma', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), fundraiseModelController.getProFormaCapTable);

/**
 * @route   POST /api/v1/fundraise-models/:id/export
 * @desc    Export model results (JSON or CSV)
 * @access  Private
 * @query   format (json|csv)
 */
router.post('/:id/export', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), fundraiseModelController.exportModel);

/**
 * @route   POST /api/v1/fundraise-models/:id/finalize
 * @desc    Finalize a model (prevent further changes)
 * @access  Private
 */
router.post('/:id/finalize', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), fundraiseModelController.finalizeModel);

/**
 * @route   POST /api/v1/fundraise-models/:id/clone
 * @desc    Clone a model for scenario comparison
 * @access  Private
 */
router.post('/:id/clone', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), fundraiseModelController.cloneModel);

/**
 * @route   POST /api/v1/fundraise-models/compare
 * @desc    Compare multiple scenarios
 * @access  Private
 */
router.post('/compare', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), fundraiseModelController.compareScenarios);

/**
 * @route   DELETE /api/v1/fundraise-models/:id
 * @desc    Delete a fundraising model
 * @access  Private
 */
router.delete('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), fundraiseModelController.deleteModel);

module.exports = router;

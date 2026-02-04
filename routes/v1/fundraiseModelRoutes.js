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

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   POST /api/v1/fundraise-models
 * @desc    Create a new fundraising model
 * @access  Private
 */
router.post('/', fundraiseModelController.createModel);

/**
 * @route   GET /api/v1/fundraise-models
 * @desc    Get all fundraising models with optional filters
 * @access  Private
 * @query   companyId, status, modelType
 */
router.get('/', fundraiseModelController.getModels);

/**
 * @route   GET /api/v1/fundraise-models/:id
 * @desc    Get a specific fundraising model
 * @access  Private
 */
router.get('/:id', fundraiseModelController.getModel);

/**
 * @route   PUT /api/v1/fundraise-models/:id
 * @desc    Update a fundraising model
 * @access  Private
 */
router.put('/:id', fundraiseModelController.updateModel);

/**
 * @route   POST /api/v1/fundraise-models/:id/calculate
 * @desc    Calculate dilution and pro-forma cap table
 * @access  Private
 */
router.post('/:id/calculate', fundraiseModelController.calculateModel);

/**
 * @route   POST /api/v1/fundraise-models/:id/waterfall
 * @desc    Calculate waterfall distribution for exit scenario
 * @access  Private
 */
router.post('/:id/waterfall', fundraiseModelController.calculateWaterfall);

/**
 * @route   POST /api/v1/fundraise-models/:id/scenarios
 * @desc    Add a new scenario to the model
 * @access  Private
 */
router.post('/:id/scenarios', fundraiseModelController.addScenario);

/**
 * @route   GET /api/v1/fundraise-models/:id/scenarios/:scenarioId
 * @desc    Get a specific scenario
 * @access  Private
 */
router.get('/:id/scenarios/:scenarioId', fundraiseModelController.getScenario);

/**
 * @route   GET /api/v1/fundraise-models/:id/pro-forma
 * @desc    Get pro-forma cap table for the model
 * @access  Private
 */
router.get('/:id/pro-forma', fundraiseModelController.getProFormaCapTable);

/**
 * @route   POST /api/v1/fundraise-models/:id/export
 * @desc    Export model results (JSON or CSV)
 * @access  Private
 * @query   format (json|csv)
 */
router.post('/:id/export', fundraiseModelController.exportModel);

/**
 * @route   POST /api/v1/fundraise-models/:id/finalize
 * @desc    Finalize a model (prevent further changes)
 * @access  Private
 */
router.post('/:id/finalize', fundraiseModelController.finalizeModel);

/**
 * @route   POST /api/v1/fundraise-models/:id/clone
 * @desc    Clone a model for scenario comparison
 * @access  Private
 */
router.post('/:id/clone', fundraiseModelController.cloneModel);

/**
 * @route   POST /api/v1/fundraise-models/compare
 * @desc    Compare multiple scenarios
 * @access  Private
 */
router.post('/compare', fundraiseModelController.compareScenarios);

/**
 * @route   DELETE /api/v1/fundraise-models/:id
 * @desc    Delete a fundraising model
 * @access  Private
 */
router.delete('/:id', fundraiseModelController.deleteModel);

module.exports = router;

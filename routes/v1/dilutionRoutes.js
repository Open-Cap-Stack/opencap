/**
 * Dilution Routes
 * Issue #200: Implement Dilution Calculator Backend
 *
 * Route definitions for dilution calculator API endpoints.
 */

const express = require('express');
const router = express.Router();
const dilutionController = require('../../controllers/dilutionController');
const { authenticate } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');

// Apply authentication middleware to all routes
router.use(authenticate);

// Calculation endpoints
router.post('/calculate', hasRole(['super_admin', 'admin', 'founder', 'manager']), dilutionController.calculate);
router.post('/safe', hasRole(['super_admin', 'admin', 'founder', 'manager']), dilutionController.calculateSAFE);
router.post('/option-pool', hasRole(['super_admin', 'admin', 'founder', 'manager']), dilutionController.calculateOptionPool);
router.post('/multi-round', hasRole(['super_admin', 'admin', 'founder', 'manager']), dilutionController.calculateMultiRound);
router.post('/compare', hasRole(['super_admin', 'admin', 'founder', 'manager']), dilutionController.compareScenarios);

// History and summary endpoints
router.get('/history/:companyId', hasRole(['super_admin', 'admin', 'founder', 'manager']), dilutionController.getHistory);
router.get('/fully-diluted/:companyId', hasRole(['super_admin', 'admin', 'founder', 'manager']), dilutionController.getFullyDiluted);
router.get('/option-pool-summary/:companyId', hasRole(['super_admin', 'admin', 'founder', 'manager']), dilutionController.getOptionPoolSummary);
router.get('/safe-summary/:companyId', hasRole(['super_admin', 'admin', 'founder', 'manager']), dilutionController.getSAFESummary);

// Scenario management endpoints
router.post('/scenario', hasRole(['super_admin', 'admin', 'founder', 'manager']), dilutionController.createScenario);
router.get('/scenario/:scenarioId', hasRole(['super_admin', 'admin', 'founder', 'manager']), dilutionController.getScenario);
router.get('/scenarios/:companyId', hasRole(['super_admin', 'admin', 'founder', 'manager']), dilutionController.getScenarios);
router.put('/scenario/:scenarioId', hasRole(['super_admin', 'admin', 'founder', 'manager']), dilutionController.updateScenario);
router.delete('/scenario/:scenarioId', hasRole(['super_admin', 'admin', 'founder', 'manager']), dilutionController.deleteScenario);

// Calculation retrieval endpoints
router.get('/calculation/:calculationId', hasRole(['super_admin', 'admin', 'founder', 'manager']), dilutionController.getCalculation);
router.get('/calculations/scenario/:scenarioId', hasRole(['super_admin', 'admin', 'founder', 'manager']), dilutionController.getScenarioCalculations);

module.exports = router;

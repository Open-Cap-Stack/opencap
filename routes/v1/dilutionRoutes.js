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

// Apply authentication middleware to all routes
router.use(authenticate);

// Calculation endpoints
router.post('/calculate', dilutionController.calculate);
router.post('/safe', dilutionController.calculateSAFE);
router.post('/option-pool', dilutionController.calculateOptionPool);
router.post('/multi-round', dilutionController.calculateMultiRound);
router.post('/compare', dilutionController.compareScenarios);

// History and summary endpoints
router.get('/history/:companyId', dilutionController.getHistory);
router.get('/fully-diluted/:companyId', dilutionController.getFullyDiluted);
router.get('/option-pool-summary/:companyId', dilutionController.getOptionPoolSummary);
router.get('/safe-summary/:companyId', dilutionController.getSAFESummary);

// Scenario management endpoints
router.post('/scenario', dilutionController.createScenario);
router.get('/scenario/:scenarioId', dilutionController.getScenario);
router.get('/scenarios/:companyId', dilutionController.getScenarios);
router.put('/scenario/:scenarioId', dilutionController.updateScenario);
router.delete('/scenario/:scenarioId', dilutionController.deleteScenario);

// Calculation retrieval endpoints
router.get('/calculation/:calculationId', dilutionController.getCalculation);
router.get('/calculations/scenario/:scenarioId', dilutionController.getScenarioCalculations);

module.exports = router;

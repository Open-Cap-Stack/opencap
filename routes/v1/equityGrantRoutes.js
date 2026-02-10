/**
 * EquityGrant Routes
 * Issue #77: Create Equity Grant Model and Workflow
 *
 * API routes for equity grant operations.
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const equityGrantController = require('../../controllers/equityGrantController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Grant Templates
router.get('/templates', equityGrantController.getGrantTemplates);
router.post('/from-template', equityGrantController.createGrantFromTemplate);

// Grant CRUD
router.post('/', equityGrantController.createEquityGrant);
router.get('/', equityGrantController.getEquityGrants);
router.get('/:id', equityGrantController.getEquityGrantById);
router.put('/:id', equityGrantController.updateEquityGrant);
router.delete('/:id', equityGrantController.deleteEquityGrant);

// Grant Status Management
router.patch('/:id/status', equityGrantController.updateGrantStatus);

// Exercise Operations
router.post('/:id/exercise', equityGrantController.exerciseGrant);

// Vesting Information
router.get('/:id/vesting', equityGrantController.getVestingSchedule);

// Equity Value Calculation
router.get('/:id/value', equityGrantController.calculateEquityValue);

// Employee-specific routes
router.get('/employee/:employeeId', equityGrantController.getGrantsByEmployee);
router.get('/employee/:employeeId/summary', equityGrantController.getEmployeeGrantSummary);

module.exports = router;

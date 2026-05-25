/**
 * EquityGrant Routes
 * Issue #77: Create Equity Grant Model and Workflow
 *
 * API routes for equity grant operations.
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const equityGrantController = require('../../controllers/equityGrantController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Grant Templates
router.get('/templates', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityGrantController.getGrantTemplates);
router.post('/from-template', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityGrantController.createGrantFromTemplate);

// Grant CRUD
router.post('/', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityGrantController.createEquityGrant);
router.get('/', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityGrantController.getEquityGrants);
router.get('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityGrantController.getEquityGrantById);
router.put('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityGrantController.updateEquityGrant);
router.delete('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityGrantController.deleteEquityGrant);

// Grant Status Management
router.patch('/:id/status', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityGrantController.updateGrantStatus);

// Exercise Operations
router.post('/:id/exercise', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityGrantController.exerciseGrant);

// Vesting Information
router.get('/:id/vesting', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityGrantController.getVestingSchedule);

// Equity Value Calculation
router.get('/:id/value', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityGrantController.calculateEquityValue);

// Employee-specific routes
router.get('/employee/:employeeId', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityGrantController.getGrantsByEmployee);
router.get('/employee/:employeeId/summary', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityGrantController.getEmployeeGrantSummary);

module.exports = router;

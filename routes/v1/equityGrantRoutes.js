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
const { auditAction } = require('../../middleware/auditLog');
const equityGrantController = require('../../controllers/equityGrantController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Grant Templates
router.get('/templates', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityGrantController.getGrantTemplates);
router.post('/from-template', hasRole(['super_admin', 'admin', 'founder', 'manager']), auditAction('create_equity_grant_from_template', 'equity_grant'), equityGrantController.createGrantFromTemplate);

// Grant CRUD
router.post('/', hasRole(['super_admin', 'admin', 'founder', 'manager']), auditAction('create_equity_grant', 'equity_grant'), equityGrantController.createEquityGrant);
router.get('/', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityGrantController.getEquityGrants);
router.get('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityGrantController.getEquityGrantById);
router.put('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager']), auditAction('update_equity_grant', 'equity_grant'), equityGrantController.updateEquityGrant);
router.delete('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager']), auditAction('delete_equity_grant', 'equity_grant'), equityGrantController.deleteEquityGrant);

// Grant Status Management
router.patch('/:id/status', hasRole(['super_admin', 'admin', 'founder', 'manager']), auditAction('update_equity_grant_status', 'equity_grant'), equityGrantController.updateGrantStatus);

// Exercise Operations
router.post('/:id/exercise', hasRole(['super_admin', 'admin', 'founder', 'manager']), auditAction('exercise_equity_grant', 'equity_grant'), equityGrantController.exerciseGrant);

// Vesting Information
router.get('/:id/vesting', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityGrantController.getVestingSchedule);

// Equity Value Calculation
router.get('/:id/value', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityGrantController.calculateEquityValue);

// Employee-specific routes
router.get('/employee/:employeeId', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityGrantController.getGrantsByEmployee);
router.get('/employee/:employeeId/summary', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityGrantController.getEmployeeGrantSummary);

module.exports = router;

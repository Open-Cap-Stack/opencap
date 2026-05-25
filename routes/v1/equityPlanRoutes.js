const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const equityPlanController = require('../../controllers/equityPlanController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

router.post('/', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityPlanController.createEquityPlan);
router.get('/', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityPlanController.getEquityPlans);
router.get('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityPlanController.getEquityPlanById);
router.put('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityPlanController.updateEquityPlan);
router.delete('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager']), equityPlanController.deleteEquityPlan);

module.exports = router;

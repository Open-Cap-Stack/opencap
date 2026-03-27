const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const equityPlanController = require('../../controllers/equityPlanController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

router.post('/', equityPlanController.createEquityPlan);
router.get('/', equityPlanController.getEquityPlans);
router.get('/:id', equityPlanController.getEquityPlanById);
router.put('/:id', equityPlanController.updateEquityPlan);
router.delete('/:id', equityPlanController.deleteEquityPlan);

module.exports = router;

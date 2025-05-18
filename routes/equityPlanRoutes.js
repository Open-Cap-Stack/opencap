const express = require('express');
const router = express.Router();
const equityPlanController = require('../controllers/equityPlanController');

router.post('/', equityPlanController.createEquityPlan);
router.get('/', equityPlanController.getEquityPlans);
router.get('/:id', equityPlanController.getEquityPlanById);
router.put('/:id', equityPlanController.updateEquityPlan);
router.delete('/:id', equityPlanController.deleteEquityPlan);

module.exports = router;

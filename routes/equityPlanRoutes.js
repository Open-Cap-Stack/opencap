const express = require('express');
const router = express.Router();
const equityPlanController = require('../controllers/equityPlanController');

router.post('/equity-plans', equityPlanController.createEquityPlan);
router.get('/equity-plans', equityPlanController.getEquityPlans);
router.get('/equity-plans/:id', equityPlanController.getEquityPlanById);
router.put('/equity-plans/:id', equityPlanController.updateEquityPlan);
router.delete('/equity-plans/:id', equityPlanController.deleteEquityPlan);

module.exports = router;

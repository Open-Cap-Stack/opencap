const express = require('express');
const { authenticateToken } = require('../../middleware/authMiddleware');
const taxCalculatorController = require('../../controllers/TaxCalculator');
const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

router.post('/calculate', taxCalculatorController.calculateTax);
router.get('/', taxCalculatorController.getTaxCalculations);
router.get('/:id', taxCalculatorController.getTaxCalculationById);
router.put('/:id', taxCalculatorController.updateTaxCalculation);
router.delete('/:id', taxCalculatorController.deleteTaxCalculation);

module.exports = router;

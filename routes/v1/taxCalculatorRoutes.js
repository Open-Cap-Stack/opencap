const express = require('express');
const taxCalculatorController = require('../../controllers/TaxCalculator');
const router = express.Router();

router.post('/calculate', taxCalculatorController.calculateTax);
router.get('/', taxCalculatorController.getTaxCalculations);
router.get('/:id', taxCalculatorController.getTaxCalculationById);
router.put('/:id', taxCalculatorController.updateTaxCalculation);
router.delete('/:id', taxCalculatorController.deleteTaxCalculation);

module.exports = router;

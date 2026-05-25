const express = require('express');
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const taxCalculatorController = require('../../controllers/TaxCalculator');
const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

router.post('/calculate', hasRole(['super_admin', 'admin', 'founder', 'accountant']), taxCalculatorController.calculateTax);
router.get('/', hasRole(['super_admin', 'admin', 'founder', 'accountant']), taxCalculatorController.getTaxCalculations);
router.get('/:id', hasRole(['super_admin', 'admin', 'founder', 'accountant']), taxCalculatorController.getTaxCalculationById);
router.put('/:id', hasRole(['super_admin', 'admin', 'founder', 'accountant']), taxCalculatorController.updateTaxCalculation);
router.delete('/:id', hasRole(['super_admin', 'admin', 'founder', 'accountant']), taxCalculatorController.deleteTaxCalculation);

module.exports = router;

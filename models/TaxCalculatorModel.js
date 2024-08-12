const express = require('express');
const TaxCalculator = require('./TaxCalculator');

const router = express.Router();

// POST /api/taxCalculations/calculate - Calculate tax and create a new record
router.post('/calculate', async (req, res) => {
  const { income, deductions } = req.body;
  
  if (!income || !deductions) {
    return res.status(400).json({ message: 'Income and deductions are required' });
  }

  const taxAmount = (income - deductions) * 0.3; // Example tax calculation

  try {
    const taxCalculator = new TaxCalculator({
      income,
      deductions,
      taxAmount,
    });

    const savedTaxCalculator = await taxCalculator.save();
    res.status(201).json(savedTaxCalculator);
  } catch (error) {
    res.status(500).json({ message: 'Error calculating tax', error: error.message });
  }
});

// GET /api/taxCalculations - Get all tax calculations
router.get('/', async (req, res) => {
  try {
    const taxCalculations = await TaxCalculator.find({});
    if (taxCalculations.length === 0) {
      return res.status(404).json({ message: 'No tax calculations found' });
    }
    res.status(200).json({ taxCalculations });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving tax calculations', error: error.message });
  }
});

// GET /api/taxCalculations/:id - Get a tax calculation by ID
router.get('/:id', async (req, res) => {
  try {
    const taxCalculation = await TaxCalculator.findById(req.params.id);

    if (!taxCalculation) {
      return res.status(404).json({ message: 'Tax calculation not found' });
    }

    res.status(200).json({ taxCalculation });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving tax calculation', error: error.message });
  }
});

// DELETE /api/taxCalculations/:id - Delete a tax calculation by ID
router.delete('/:id', async (req, res) => {
  try {
    const taxCalculation = await TaxCalculator.findByIdAndDelete(req.params.id);

    if (!taxCalculation) {
      return res.status(404).json({ message: 'Tax calculation not found' });
    }

    res.status(200).json({ message: 'Tax calculation deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting tax calculation', error: error.message });
  }
});

module.exports = router;

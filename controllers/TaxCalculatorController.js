// File: controllers/taxCalculatorController.js

const TaxCalculator = require('../models/TaxCalculatorModel');

// Calculate tax and create a new tax calculation record
exports.calculateTax = async (req, res) => {
  const { income, deductions } = req.body;

  if (!income || !deductions) {
    return res.status(400).json({ message: 'Invalid tax calculation data' });
  }

  const taxAmount = (income - deductions) * 0.3; // Example tax calculation logic

  try {
    const taxCalculation = new TaxCalculator({
      income,
      deductions,
      taxAmount,
    });

    const savedTaxCalculation = await taxCalculation.save();
    res.status(201).json(savedTaxCalculation);
  } catch (error) {
    res.status(500).json({ message: 'Error calculating tax', error: error.message });
  }
};

// Get all tax calculations
exports.getTaxCalculations = async (req, res) => {
  try {
    const taxCalculations = await TaxCalculator.find({});
    if (taxCalculations.length === 0) {
      return res.status(404).json({ message: 'No tax calculations found' });
    }
    res.status(200).json(taxCalculations);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving tax calculations', error: error.message });
  }
};

// Get a tax calculation by ID
exports.getTaxCalculationById = async (req, res) => {
  try {
    const taxCalculation = await TaxCalculator.findById(req.params.id);

    if (!taxCalculation) {
      return res.status(404).json({ message: 'Tax calculation not found' });
    }

    res.status(200).json(taxCalculation);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving tax calculation', error: error.message });
  }
};

// Delete a tax calculation by ID
exports.deleteTaxCalculation = async (req, res) => {
  try {
    const taxCalculation = await TaxCalculator.findByIdAndDelete(req.params.id);

    if (!taxCalculation) {
      return res.status(404).json({ message: 'Tax calculation not found' });
    }

    res.status(200).json({ message: 'Tax calculation deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting tax calculation', error: error.message });
  }
};

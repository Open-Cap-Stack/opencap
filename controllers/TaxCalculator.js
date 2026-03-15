/**
 * TaxCalculator Controller - ZeroDB Migration
 * Issue #20 - Batch 3 Controllers
 * Uses TaxCalculator model directly for database operations
 */

const TaxCalculator = require('../models/TaxCalculator');

// Calculate tax and create a new tax calculation record
exports.calculateTax = async (req, res) => {
  try {
    const { calculationId, SaleScenario, ShareClassInvolved, SaleAmount, TaxRate, TaxImplication, TaxDueDate } = req.body;

    if (!SaleScenario || !ShareClassInvolved || !SaleAmount || !TaxRate || !TaxImplication || !TaxDueDate) {
      return res.status(400).json({ message: 'Invalid tax calculation data' });
    }

    const CalculatedTax = SaleAmount * TaxRate;

    const taxData = {
      calculationId,
      SaleScenario,
      ShareClassInvolved,
      SaleAmount,
      TaxRate,
      TaxImplication,
      CalculatedTax,
      TaxDueDate,
    };

    const savedCalculation = await TaxCalculator.create(taxData);
    return res.status(201).json(savedCalculation);
  } catch (error) {
    console.error('Tax calculation error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    if (error.name === 'DuplicateError') {
      return res.status(409).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all tax calculations
exports.getTaxCalculations = async (req, res) => {
  try {
    const query = {};
    const companyId = req.query.companyId || req.user?.companyId;
    if (companyId) query.companyId = companyId;
    const taxCalculations = await TaxCalculator.find(query);
    // Return 200 with empty array for consistent REST API behavior
    res.status(200).json({ taxCalculations: taxCalculations || [] });
  } catch (error) {
    console.error('Error fetching tax calculations:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get a tax calculation by ID
exports.getTaxCalculationById = async (req, res) => {
  try {
    const taxCalculation = await TaxCalculator.findById(req.params.id);
    if (!taxCalculation) {
      return res.status(404).json({ message: 'Tax calculation not found' });
    }
    res.status(200).json({ taxCalculation });
  } catch (error) {
    console.error('Error fetching tax calculation:', error);
    res.status(500).json({ message: 'Server error' });
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
    console.error('Error deleting tax calculation:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update a tax calculation by ID
exports.updateTaxCalculation = async (req, res) => {
  try {
    const { id } = req.params;
    const { SaleAmount, TaxRate } = req.body;

    // If updating SaleAmount or TaxRate, recalculate CalculatedTax
    if ((SaleAmount !== undefined || TaxRate !== undefined) && !req.body.CalculatedTax) {
      // Get current calculation if needed
      const currentCalculation = await TaxCalculator.findById(id);
      if (!currentCalculation) {
        return res.status(404).json({ message: 'Tax calculation not found' });
      }

      // Use provided values or existing values
      const updatedSaleAmount = SaleAmount !== undefined ? SaleAmount : currentCalculation.SaleAmount;
      const updatedTaxRate = TaxRate !== undefined ? TaxRate : currentCalculation.TaxRate;

      // Validate numeric values
      if (isNaN(updatedSaleAmount) || isNaN(updatedTaxRate) || updatedTaxRate < 0 || updatedTaxRate > 1) {
        return res.status(400).json({ message: 'Invalid tax calculation data' });
      }

      // Calculate new tax amount
      const updatedCalculatedTax = updatedSaleAmount * updatedTaxRate;
      req.body.CalculatedTax = updatedCalculatedTax;
    }

    // Prevent calculationId from being updated (it's the unique identifier)
    if (req.body.calculationId) {
      delete req.body.calculationId;
    }

    const updatedCalculation = await TaxCalculator.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );

    if (!updatedCalculation) {
      return res.status(404).json({ message: 'Tax calculation not found' });
    }

    res.status(200).json({ taxCalculation: updatedCalculation });
  } catch (error) {
    console.error('Tax calculation update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

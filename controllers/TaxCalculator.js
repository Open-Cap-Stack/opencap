const TaxCalculator = require('../models/TaxCalculator');

// Calculate tax and create a new tax calculation record
exports.calculateTax = async (req, res) => {
  try {
    const { calculationId, SaleScenario, ShareClassInvolved, SaleAmount, TaxRate, TaxImplication, TaxDueDate } = req.body;

    if (!calculationId || !SaleScenario || !ShareClassInvolved || !SaleAmount || !TaxRate || !TaxImplication || !TaxDueDate) {
      return res.status(400).json({ message: 'Invalid tax calculation data' });
    }

    const CalculatedTax = SaleAmount * TaxRate;

    const taxCalculation = new TaxCalculator({
      calculationId,
      SaleScenario,
      ShareClassInvolved,
      SaleAmount,
      TaxRate,
      TaxImplication,
      CalculatedTax,
      TaxDueDate,
    });

    const savedCalculation = await taxCalculation.save();
    return res.status(201).json(savedCalculation);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all tax calculations
exports.getTaxCalculations = async (req, res) => {
  try {
    const taxCalculations = await TaxCalculator.find();
    if (taxCalculations.length === 0) {
      return res.status(404).json({ message: 'No tax calculations found' });
    }
    res.status(200).json({ taxCalculations });  // Wrap the array in an object
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get a tax calculation by ID
exports.getTaxCalculationById = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid tax calculation ID format' });
    }
    
    const taxCalculation = await TaxCalculator.findById(req.params.id);
    if (!taxCalculation) {
      return res.status(404).json({ message: 'Tax calculation not found' });
    }
    res.status(200).json({ taxCalculation });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a tax calculation by ID
exports.deleteTaxCalculation = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid tax calculation ID format' });
    }
    
    const taxCalculation = await TaxCalculator.findByIdAndDelete(req.params.id);
    if (!taxCalculation) {
      return res.status(404).json({ message: 'Tax calculation not found' });
    }
    res.status(200).json({ message: 'Tax calculation deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Update a tax calculation by ID - New Endpoint
exports.updateTaxCalculation = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ID format first
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid tax calculation ID format' });
    }
    
    const { SaleAmount, TaxRate, SaleScenario, ShareClassInvolved, TaxImplication, TaxDueDate } = req.body;

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
      { new: true, runValidators: true }
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

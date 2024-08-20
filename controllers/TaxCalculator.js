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
    const taxCalculation = await TaxCalculator.findById(req.params.id);
    if (!taxCalculation) {
      return res.status(404).json({ message: 'Tax calculation not found' });
    }
    res.status(200).json({ taxCalculation });  // Wrap the object in an object
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a tax calculation by ID
exports.deleteTaxCalculation = async (req, res) => {
  try {
    const deletedCalculation = await TaxCalculator.findByIdAndDelete(req.params.id);
    if (!deletedCalculation) {
      return res.status(404).json({ message: 'Tax calculation not found' });
    }
    res.status(200).json({ message: 'Tax calculation deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

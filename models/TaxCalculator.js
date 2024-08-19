const mongoose = require('mongoose');

const TaxCalculatorSchema = new mongoose.Schema({
  calculationId: {
    type: String,
    required: true,
    unique: true,
  },
  SaleScenario: {
    type: Object,
    required: true,
  },
  ShareClassInvolved: {
    type: String, // You can replace this with an ObjectId reference if needed
    required: true,
  },
  SaleAmount: {
    type: Number,
    required: true,
  },
  TaxRate: {
    type: Number,
    required: true,
  },
  TaxImplication: {
    type: Object,
    required: true,
  },
  CalculatedTax: {
    type: Number,
    required: true,
  },
  TaxDueDate: {
    type: Date,
    required: true,
  },
});

module.exports = mongoose.model('TaxCalculator', TaxCalculatorSchema);

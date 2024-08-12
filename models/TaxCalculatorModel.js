// File: models/TaxCalculatorModel.js
const mongoose = require('mongoose');

const taxCalculatorSchema = new mongoose.Schema({
  income: {
    type: Number,
    required: true,
  },
  deductions: {
    type: Number,
    required: true,
  },
  taxAmount: {
    type: Number,
    required: true,
  },
});

const TaxCalculator = mongoose.model('TaxCalculator', taxCalculatorSchema);

module.exports = TaxCalculator;

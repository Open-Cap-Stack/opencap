// File: models/TaxCalculator.js
const mongoose = require('mongoose');

// Define the TaxCalculator schema
const TaxCalculatorSchema = new mongoose.Schema({
  income: {
    type: Number,
    required: [true, 'Income is required'],
    validate: {
      validator: function (value) {
        return value > 0;
      },
      message: 'Income must be a positive number'
    }
  },
  deductions: {
    type: Number,
    required: [true, 'Deductions are required'],
    validate: {
      validator: function (value) {
        return value >= 0;
      },
      message: 'Deductions cannot be negative'
    }
  },
  taxAmount: {
    type: Number,
    required: [true, 'Tax amount is required'],
    validate: {
      validator: function (value) {
        return value >= 0;
      },
      message: 'Tax amount cannot be negative'
    }
  }
});

// Create the TaxCalculator model from the schema
const TaxCalculator = mongoose.model('TaxCalculator', TaxCalculatorSchema);

module.exports = TaxCalculator;

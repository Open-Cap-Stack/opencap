const mongoose = require('mongoose');
const path = require('path');
const TaxCalculator = require('../models/TaxCalculatorModel');
const { connectDB, disconnectDB } = require('../db');


beforeAll(async () => {
  await mongoose.connect('mongodb://localhost:27017/test', { useNewUrlParser: true, useUnifiedTopology: true });
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('TaxCalculator Model', () => {
  it('should create a tax calculation with valid fields', async () => {
    const taxData = {
      income: 100000,
      deductions: 10000,
      taxAmount: 27000,
    };

    const taxCalculator = new TaxCalculator(taxData);
    const savedTaxCalculator = await taxCalculator.save();

    expect(savedTaxCalculator.income).toBe(taxData.income);
    expect(savedTaxCalculator.deductions).toBe(taxData.deductions);
    expect(savedTaxCalculator.taxAmount).toBe(taxData.taxAmount);
  });

  it('should not create a tax calculation without required fields', async () => {
    const taxData = {
      income: 100000,
    };

    const taxCalculator = new TaxCalculator(taxData);

    await expect(taxCalculator.save()).rejects.toThrow();
  });

  it('should not create a tax calculation with invalid field values', async () => {
    const taxData = {
      income: 'invalidIncome', // Invalid income field
      deductions: 10000,
      taxAmount: 27000,
    };

    const taxCalculator = new TaxCalculator(taxData);

    await expect(taxCalculator.save()).rejects.toThrow();
  });
});

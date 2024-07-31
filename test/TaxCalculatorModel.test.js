const mongoose = require('mongoose');
const chai = require('chai');
const expect = chai.expect;
const TaxCalculation = require('../models/TaxCalculation');

before(async function () {
  await mongoose.connect('mongodb://localhost:27017/test', { useNewUrlParser: true, useUnifiedTopology: true });
  await mongoose.connection.dropDatabase();
});

after(async function () {
  await mongoose.disconnect();
});

describe('TaxCalculation Model', function () {
  it('should create a tax calculation with valid fields', async function () {
    const taxData = {
      income: 100000,
      deductions: 10000,
      taxAmount: 27000,
    };

    const taxCalculation = new TaxCalculation(taxData);
    const savedTaxCalculation = await taxCalculation.save();

    expect(savedTaxCalculation.income).to.equal(taxData.income);
    expect(savedTaxCalculation.deductions).to.equal(taxData.deductions);
    expect(savedTaxCalculation.taxAmount).to.equal(taxData.taxAmount);
  });

  it('should not create a tax calculation without required fields', async function () {
    const taxData = {
      income: 100000,
    };

    const taxCalculation = new TaxCalculation(taxData);

    try {
      await taxCalculation.save();
    } catch (error) {
      expect(error).to.exist;
      expect(error.errors.deductions).to.exist;
      expect(error.errors.taxAmount).to.exist;
    }
  });

  it('should not create a tax calculation with invalid field values', async function () {
    const taxData = {
      income: 'invalidIncome', // Invalid income field
      deductions: 10000,
      taxAmount: 27000,
    };

    const taxCalculation = new TaxCalculation(taxData);

    try {
      await taxCalculation.save();
    } catch (error) {
      expect(error).to.exist;
      expect(error.errors.income).to.exist;
    }
  });
});

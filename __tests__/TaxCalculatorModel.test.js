const mongoose = require('mongoose');
const TaxCalculator = require('../models/TaxCalculator');

beforeAll(async () => {
  await mongoose.connect('mongodb://localhost:27017/test');
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('TaxCalculator Model', () => {
  it('should create a tax calculation with valid fields', async () => {
    const taxData = {
      calculationId: 'unique-calculation-id',
      SaleScenario: { type: 'sale', description: 'Test sale scenario' },
      ShareClassInvolved: 'Common Stock',
      SaleAmount: 100000,
      TaxRate: 0.27,
      TaxImplication: { type: 'federal', description: 'Federal tax' },
      CalculatedTax: 27000,
      TaxDueDate: new Date(),
    };

    const taxCalculator = new TaxCalculator(taxData);
    const savedTaxCalculator = await taxCalculator.save();

    expect(savedTaxCalculator.calculationId).toBe(taxData.calculationId);
    expect(savedTaxCalculator.SaleScenario).toEqual(taxData.SaleScenario);
    expect(savedTaxCalculator.ShareClassInvolved).toBe(taxData.ShareClassInvolved);
    expect(savedTaxCalculator.SaleAmount).toBe(taxData.SaleAmount);
    expect(savedTaxCalculator.TaxRate).toBe(taxData.TaxRate);
    expect(savedTaxCalculator.TaxImplication).toEqual(taxData.TaxImplication);
    expect(savedTaxCalculator.CalculatedTax).toBe(taxData.CalculatedTax);
    expect(new Date(savedTaxCalculator.TaxDueDate).toISOString()).toEqual(new Date(taxData.TaxDueDate).toISOString());
  });

  it('should not create a tax calculation without required fields', async () => {
    const taxData = {
      income: 100000, // Missing other required fields
    };

    const taxCalculator = new TaxCalculator(taxData);

    await expect(taxCalculator.save()).rejects.toThrow();
  });

  it('should not create a tax calculation with invalid field values', async () => {
    const taxData = {
      calculationId: 'invalidId', // Invalid calculationId
      SaleScenario: { type: 'sale', description: 'Test sale scenario' },
      ShareClassInvolved: 'Common Stock',
      SaleAmount: 'invalidAmount', // Invalid SaleAmount
      TaxRate: 0.27,
      TaxImplication: { type: 'federal', description: 'Federal tax' },
      CalculatedTax: 27000,
      TaxDueDate: 'invalidDate', // Invalid TaxDueDate
    };

    const taxCalculator = new TaxCalculator(taxData);

    await expect(taxCalculator.save()).rejects.toThrow();
  });
});

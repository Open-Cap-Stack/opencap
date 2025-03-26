const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const taxCalculatorRoutes = require('../routes/TaxCalculator');
const TaxCalculator = require('../models/TaxCalculator');
const { setupTestDB, teardownTestDB, clearDatabase } = require('./setup/dbHandler');

const app = express();
app.use(express.json());
app.use('/api/tax-calculator', taxCalculatorRoutes);

// BDD-style test suite following Semantic Seed Venture Studio Coding Standards V2.0
describe('TaxCalculator API - PUT/Update Functionality', () => {
  // Test data
  const taxCalculationData = {
    calculationId: 'CALC-123',
    SaleScenario: { scenario: 'Stock Sale' },
    ShareClassInvolved: 'Common Stock',
    SaleAmount: 10000,
    TaxRate: 0.20,
    TaxImplication: { implication: 'Capital Gains' },
    CalculatedTax: 2000,
    TaxDueDate: new Date('2025-04-15')
  };
  
  let savedCalculation;

  // Setup database connection
  beforeAll(async () => {
    await setupTestDB();
  });

  // Clean up after all tests
  afterAll(async () => {
    await teardownTestDB();
  });

  // Reset data before each test
  beforeEach(async () => {
    await clearDatabase();
    savedCalculation = await TaxCalculator.create(taxCalculationData);
  });

  describe('PUT /api/tax-calculator/:id', () => {
    test('should update a tax calculation when provided valid data', async () => {
      const updateData = {
        SaleAmount: 15000,
        TaxRate: 0.22,
        TaxImplication: { implication: 'Updated Capital Gains' },
        TaxDueDate: new Date('2025-05-15')
      };
      
      // Calculate the expected new tax amount
      const expectedCalculatedTax = updateData.SaleAmount * updateData.TaxRate;

      const res = await request(app)
        .put(`/api/tax-calculator/${savedCalculation._id}`)
        .send(updateData)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('taxCalculation');
      expect(res.body.taxCalculation).toHaveProperty('SaleAmount', updateData.SaleAmount);
      expect(res.body.taxCalculation).toHaveProperty('TaxRate', updateData.TaxRate);
      expect(res.body.taxCalculation.TaxImplication).toEqual(updateData.TaxImplication);
      // Verify calculated tax is updated based on new values
      expect(res.body.taxCalculation.CalculatedTax).toEqual(expectedCalculatedTax);
      
      // Fields not included in the update should remain unchanged
      expect(res.body.taxCalculation).toHaveProperty('calculationId', taxCalculationData.calculationId);
      expect(res.body.taxCalculation).toHaveProperty('ShareClassInvolved', taxCalculationData.ShareClassInvolved);
    });

    test('should return 404 when tax calculation with given ID does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const updateData = { SaleAmount: 20000 };
      
      const res = await request(app)
        .put(`/api/tax-calculator/${nonExistentId}`)
        .send(updateData)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('Tax calculation not found');
    });

    test('should return 400 for invalid ID format', async () => {
      const updateData = { SaleAmount: 20000 };
      
      const res = await request(app)
        .put('/api/tax-calculator/invalid-id-format')
        .send(updateData)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Invalid tax calculation ID format');
    });

    test('should validate update data and recalculate tax', async () => {
      const invalidData = {
        SaleAmount: 'not-a-number',  // Should be a number
        TaxRate: 1.5  // Should be between 0 and 1
      };
      
      const res = await request(app)
        .put(`/api/tax-calculator/${savedCalculation._id}`)
        .send(invalidData)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Invalid tax calculation data');
    });

    test('should handle database errors gracefully', async () => {
      // Mock a database error
      jest.spyOn(TaxCalculator, 'findByIdAndUpdate').mockRejectedValueOnce(new Error('Database error'));
      
      const updateData = { SaleAmount: 20000 };
      
      const res = await request(app)
        .put(`/api/tax-calculator/${savedCalculation._id}`)
        .send(updateData)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('Server error');
    });
  });
});

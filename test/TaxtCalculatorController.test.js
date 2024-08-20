const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const taxCalculatorController = require('../controllers/TaxCalculator');
const TaxCalculator = require('../models/TaxCalculator');

// Mock the TaxCalculator model
jest.mock('../models/TaxCalculator');

const app = express();
app.use(express.json());

// Mock routes for testing
app.post('/calculateTax', taxCalculatorController.calculateTax);
app.get('/taxCalculations', taxCalculatorController.getTaxCalculations);
app.get('/taxCalculations/:id', taxCalculatorController.getTaxCalculationById);
app.delete('/taxCalculations/:id', taxCalculatorController.deleteTaxCalculation);

describe('TaxCalculator Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /taxCalculations', () => {
    it('should get all tax calculations', async () => {
      const taxCalculations = [
        {
          calculationId: 'calculation-id-1',
          SaleScenario: { type: 'sale', description: 'Test sale scenario 1' },
          ShareClassInvolved: 'Common Stock',
          SaleAmount: 100000,
          TaxRate: 0.27,
          TaxImplication: { type: 'federal', description: 'Federal tax' },
          CalculatedTax: 27000,
          TaxDueDate: new Date().toISOString(),
          _id: mongoose.Types.ObjectId('66bda65bcaf7b4f25b64b9ff').toString(),
        },
        {
          calculationId: 'calculation-id-2',
          SaleScenario: { type: 'sale', description: 'Test sale scenario 2' },
          ShareClassInvolved: 'Preferred Stock',
          SaleAmount: 50000,
          TaxRate: 0.2,
          TaxImplication: { type: 'state', description: 'State tax' },
          CalculatedTax: 10000,
          TaxDueDate: new Date().toISOString(),
          _id: mongoose.Types.ObjectId('66bda65bcaf7b4f25b64ba00').toString(),
        },
      ];

      TaxCalculator.find.mockResolvedValue(taxCalculations);

      const response = await request(app).get('/taxCalculations');

      // Convert _id to string for comparison
      const expectedTaxCalculations = taxCalculations.map(calc => ({
        ...calc,
        _id: calc._id.toString(),
      }));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ taxCalculations: expectedTaxCalculations });
    });

    it('should return 404 if no tax calculations are found', async () => {
      TaxCalculator.find.mockResolvedValue([]);

      const response = await request(app).get('/taxCalculations');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'No tax calculations found' });
    });
  });

  describe('GET /taxCalculations/:id', () => {
    it('should get a tax calculation by id', async () => {
      const taxCalculation = {
        calculationId: 'calculation-id-1',
        SaleScenario: { type: 'sale', description: 'Test sale scenario 1' },
        ShareClassInvolved: 'Common Stock',
        SaleAmount: 100000,
        TaxRate: 0.27,
        TaxImplication: { type: 'federal', description: 'Federal tax' },
        CalculatedTax: 27000,
        TaxDueDate: new Date().toISOString(),
        _id: mongoose.Types.ObjectId('66bda65ccaf7b4f25b64ba01').toString(),
      };

      TaxCalculator.findById.mockResolvedValue(taxCalculation);

      const response = await request(app).get(`/taxCalculations/${taxCalculation._id}`);

      // Convert _id to string for comparison
      const expectedTaxCalculation = {
        ...taxCalculation,
        _id: taxCalculation._id.toString(),
      };

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ taxCalculation: expectedTaxCalculation });
    });

    it('should return 404 if tax calculation is not found', async () => {
      TaxCalculator.findById.mockResolvedValue(null);

      const response = await request(app).get(`/taxCalculations/${mongoose.Types.ObjectId()}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Tax calculation not found' });
    });
  });
});

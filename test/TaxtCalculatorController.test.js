const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const taxCalculatorController = require('../controllers/TaxCalculatorController'); // Updated to match the new file name
const TaxCalculator = require('../models/TaxCalculator'); // Updated to correct model name

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

  describe('POST /calculateTax', () => {
    it('should calculate tax and create a new tax calculation record', async () => {
      const taxData = {
        income: 100000,
        deductions: 10000
      };
      
      const calculatedTax = {
        ...taxData,
        taxAmount: 27000, // Example tax calculation
        _id: mongoose.Types.ObjectId().toString()
      };

      TaxCalculator.prototype.save.mockResolvedValue(calculatedTax);

      const response = await request(app)
        .post('/calculateTax')
        .send(taxData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(calculatedTax);
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/calculateTax')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: 'Invalid tax calculation data' });
    });
  });

  describe('GET /taxCalculations', () => {
    it('should get all tax calculations', async () => {
      const taxCalculations = [
        { _id: mongoose.Types.ObjectId().toString(), income: 100000, taxAmount: 27000 },
        { _id: mongoose.Types.ObjectId().toString(), income: 50000, taxAmount: 13500 }
      ];

      TaxCalculator.find.mockResolvedValue(taxCalculations);

      const response = await request(app).get('/taxCalculations');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(taxCalculations);
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
        _id: mongoose.Types.ObjectId().toString(),
        income: 100000,
        taxAmount: 27000
      };

      TaxCalculator.findById.mockResolvedValue(taxCalculation);

      const response = await request(app).get(`/taxCalculations/${taxCalculation._id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(taxCalculation);
    });

    it('should return 404 if tax calculation is not found', async () => {
      TaxCalculator.findById.mockResolvedValue(null);

      const response = await request(app).get(`/taxCalculations/${mongoose.Types.ObjectId()}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Tax calculation not found' });
    });
  });

  describe('DELETE /taxCalculations/:id', () => {
    it('should delete a tax calculation by id', async () => {
      const taxCalculationId = mongoose.Types.ObjectId().toString();
      TaxCalculator.findByIdAndDelete.mockResolvedValue({ _id: taxCalculationId });

      const response = await request(app).delete(`/taxCalculations/${taxCalculationId}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Tax calculation deleted' });
    });

    it('should return 404 if tax calculation to delete is not found', async () => {
      TaxCalculator.findByIdAndDelete.mockResolvedValue(null);

      const response = await request(app).delete(`/taxCalculations/${mongoose.Types.ObjectId()}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Tax calculation not found' });
    });
  });
});

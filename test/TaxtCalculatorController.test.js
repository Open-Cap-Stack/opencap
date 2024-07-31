const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const taxcalculatorController = require('../controllers/taxcalculatorController');
const TaxCalculation = require('../models/TaxCalculation');

// Mock the TaxCalculation model
jest.mock('../models/TaxCalculation');

const app = express();
app.use(express.json());

// Mock routes for testing
app.post('/calculateTax', taxcalculatorController.calculateTax);
app.get('/taxCalculations', taxcalculatorController.getTaxCalculations);
app.get('/taxCalculations/:id', taxcalculatorController.getTaxCalculationById);
app.delete('/taxCalculations/:id', taxcalculatorController.deleteTaxCalculation);

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

      TaxCalculation.prototype.save.mockResolvedValue(calculatedTax);

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

      TaxCalculation.find.mockResolvedValue(taxCalculations);

      const response = await request(app).get('/taxCalculations');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(taxCalculations);
    });

    it('should return 404 if no tax calculations are found', async () => {
      TaxCalculation.find.mockResolvedValue(null);

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

      TaxCalculation.findById.mockResolvedValue(taxCalculation);

      const response = await request(app).get(`/taxCalculations/${taxCalculation._id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(taxCalculation);
    });

    it('should return 404 if tax calculation is not found', async () => {
      TaxCalculation.findById.mockResolvedValue(null);

      const response = await request(app).get(`/taxCalculations/${mongoose.Types.ObjectId()}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Tax calculation not found' });
    });
  });

  describe('DELETE /taxCalculations/:id', () => {
    it('should delete a tax calculation by id', async () => {
      const taxCalculationId = mongoose.Types.ObjectId().toString();
      TaxCalculation.findByIdAndDelete.mockResolvedValue({ _id: taxCalculationId });

      const response = await request(app).delete(`/taxCalculations/${taxCalculationId}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Tax calculation deleted' });
    });

    it('should return 404 if tax calculation to delete is not found', async () => {
      TaxCalculation.findByIdAndDelete.mockResolvedValue(null);

      const response = await request(app).delete(`/taxCalculations/${mongoose.Types.ObjectId()}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Tax calculation not found' });
    });
  });
});

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../db'); // Correctly import both connectDB and disconnectDB
const TaxCalculator = require('../models/TaxCalculator');
const taxCalculatorRoutes = require('../routes/TaxCalculator');

const app = express();
app.use(express.json());
app.use('/api/taxCalculations', taxCalculatorRoutes);

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  if (mongoose.connection && mongoose.connection.db) {
    try {
      await mongoose.connection.db.dropDatabase();
      console.log('Test database dropped');
    } catch (err) {
      console.error('Error dropping test database:', err.message);
    }
  }
  await disconnectDB();
});

beforeEach(async () => {
  await TaxCalculator.deleteMany({});
});

describe('TaxCalculator API Test', () => {
  it('should calculate tax and create a new tax calculation record', async () => {
    const res = await request(app)
      .post('/api/taxCalculations/calculate')
      .send({
        calculationId: 'test-calculation-id',
        SaleScenario: {
          type: 'sale',
          description: 'Test sale scenario',
        },
        ShareClassInvolved: 'Common Stock',
        SaleAmount: 100000,
        TaxRate: 0.27,
        TaxImplication: {
          type: 'federal',
          description: 'Federal tax',
        },
        CalculatedTax: 27000,
        TaxDueDate: new Date().toISOString(),
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('calculationId', 'test-calculation-id');
    expect(res.body).toHaveProperty('SaleAmount', 100000);
    expect(res.body).toHaveProperty('CalculatedTax', 27000);
    expect(res.body).toHaveProperty('TaxRate', 0.27);
    expect(res.body).toHaveProperty('ShareClassInvolved', 'Common Stock');
    expect(res.body).toHaveProperty('SaleScenario');
    expect(res.body.SaleScenario).toHaveProperty('type', 'sale');
  });

  it('should return 400 if required fields are missing', async () => {
    const res = await request(app)
      .post('/api/taxCalculations/calculate')
      .send({});

    expect(res.statusCode).toEqual(400);
    expect(res.body).toEqual({ message: 'Invalid tax calculation data' });
  });

  it('should get all tax calculations', async () => {
    const taxCalculations = [
      {
        calculationId: 'calculation-id-1',
        SaleScenario: {
          type: 'sale',
          description: 'Test sale scenario 1',
        },
        ShareClassInvolved: 'Common Stock',
        SaleAmount: 100000,
        TaxRate: 0.27,
        TaxImplication: {
          type: 'federal',
          description: 'Federal tax',
        },
        CalculatedTax: 27000,
        TaxDueDate: new Date().toISOString(),
      },
      {
        calculationId: 'calculation-id-2',
        SaleScenario: {
          type: 'sale',
          description: 'Test sale scenario 2',
        },
        ShareClassInvolved: 'Preferred Stock',
        SaleAmount: 50000,
        TaxRate: 0.2,
        TaxImplication: {
          type: 'state',
          description: 'State tax',
        },
        CalculatedTax: 10000,
        TaxDueDate: new Date().toISOString(),
      },
    ];

    await TaxCalculator.insertMany(taxCalculations);

    const res = await request(app).get('/api/taxCalculations');

    expect(res.statusCode).toEqual(200);
    expect(res.body.taxCalculations).toBeInstanceOf(Array);
    expect(res.body.taxCalculations.length).toBe(2);
    expect(res.body.taxCalculations[0]).toHaveProperty('calculationId', 'calculation-id-1');
    expect(res.body.taxCalculations[1]).toHaveProperty('calculationId', 'calculation-id-2');
  });

  it('should return 404 if no tax calculations are found', async () => {
    const res = await request(app).get('/api/taxCalculations');

    expect(res.statusCode).toEqual(404);
    expect(res.body).toEqual({ message: 'No tax calculations found' });
  });

  it('should get a tax calculation by ID', async () => {
    const taxCalculation = new TaxCalculator({
      calculationId: 'test-calculation-id',
      SaleScenario: {
        type: 'sale',
        description: 'Test sale scenario',
      },
      ShareClassInvolved: 'Common Stock',
      SaleAmount: 100000,
      TaxRate: 0.27,
      TaxImplication: {
        type: 'federal',
        description: 'Federal tax',
      },
      CalculatedTax: 27000,
      TaxDueDate: new Date().toISOString(),
    });
    await taxCalculation.save();

    const res = await request(app).get(`/api/taxCalculations/${taxCalculation._id}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('taxCalculation');
    expect(res.body.taxCalculation).toHaveProperty('_id', taxCalculation._id.toString());
    expect(res.body.taxCalculation).toHaveProperty('calculationId', 'test-calculation-id');
  });

  it('should return 404 if tax calculation is not found by ID', async () => {
    const nonExistentId = mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/taxCalculations/${nonExistentId}`);

    expect(res.statusCode).toEqual(404);
    expect(res.body).toEqual({ message: 'Tax calculation not found' });
  });

  it('should delete a tax calculation by ID', async () => {
    const taxCalculation = new TaxCalculator({
      calculationId: 'test-calculation-id',
      SaleScenario: {
        type: 'sale',
        description: 'Test sale scenario',
      },
      ShareClassInvolved: 'Common Stock',
      SaleAmount: 100000,
      TaxRate: 0.27,
      TaxImplication: {
        type: 'federal',
        description: 'Federal tax',
      },
      CalculatedTax: 27000,
      TaxDueDate: new Date().toISOString(),
    });
    await taxCalculation.save();

    const res = await request(app).delete(`/api/taxCalculations/${taxCalculation._id}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ message: 'Tax calculation deleted' });
  });

  it('should return 404 if tax calculation to delete is not found', async () => {
    const nonExistentId = mongoose.Types.ObjectId();
    const res = await request(app).delete(`/api/taxCalculations/${nonExistentId}`);

    expect(res.statusCode).toEqual(404);
    expect(res.body).toEqual({ message: 'Tax calculation not found' });
  });
});

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../db'); // Correctly import both connectDB and disconnectDB
const TaxCalculator = require('../models/TaxCalculator');

const app = express();
app.use(express.json());
app.use('/api/taxCalculations', require('../routes/TaxCalculator'));

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
        income: 100000,
        deductions: 10000,
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('income', 100000);
    expect(res.body).toHaveProperty('deductions', 10000);
    expect(res.body).toHaveProperty('taxAmount', 27000); // Example tax calculation
    expect(res.body).toHaveProperty('_id');
  });

  it('should return 400 if required fields are missing', async () => {
    const res = await request(app)
      .post('/api/taxCalculations/calculate')
      .send({}); // No data sent

    expect(res.statusCode).toEqual(400);
    expect(res.body).toEqual({ message: 'Income and deductions are required' });
  });

  it('should get all tax calculations', async () => {
    const taxCalculations = [
      { income: 100000, deductions: 10000, taxAmount: 27000 },
      { income: 50000, deductions: 5000, taxAmount: 13500 },
    ];

    await TaxCalculator.insertMany(taxCalculations);

    const res = await request(app).get('/api/taxCalculations');

    expect(res.statusCode).toEqual(200);
    expect(res.body.taxCalculations).toBeInstanceOf(Array);
    expect(res.body.taxCalculations.length).toBe(2);
    expect(res.body.taxCalculations[0]).toHaveProperty('income', 100000);
    expect(res.body.taxCalculations[1]).toHaveProperty('income', 50000);
  });

  it('should return 404 if no tax calculations are found', async () => {
    const res = await request(app).get('/api/taxCalculations');

    expect(res.statusCode).toEqual(404);
    expect(res.body).toEqual({ message: 'No tax calculations found' });
  });

  it('should get a tax calculation by ID', async () => {
    const taxCalculation = new TaxCalculator({
      income: 100000,
      deductions: 10000,
      taxAmount: 27000,
    });
    await taxCalculation.save();

    const res = await request(app).get(`/api/taxCalculations/${taxCalculation._id}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('taxCalculation');
    expect(res.body.taxCalculation).toHaveProperty('_id', taxCalculation._id.toString());
    expect(res.body.taxCalculation).toHaveProperty('income', 100000);
  });

  it('should return 404 if tax calculation is not found by ID', async () => {
    const nonExistentId = mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/taxCalculations/${nonExistentId}`);

    expect(res.statusCode).toEqual(404);
    expect(res.body).toEqual({ message: 'Tax calculation not found' });
  });

  it('should delete a tax calculation by ID', async () => {
    const taxCalculation = new TaxCalculator({
      income: 100000,
      deductions: 10000,
      taxAmount: 27000,
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

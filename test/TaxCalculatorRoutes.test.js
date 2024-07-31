const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const TaxCalculation = require('../models/TaxCalculation');
const connectDB = require('../db');

const app = express();
app.use(express.json());
app.use('/api/taxCalculations', require('../routes/taxCalculatorRoutes'));

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(async () => {
  await TaxCalculation.deleteMany({});
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
  }, 10000);

  it('should get all tax calculations', async () => {
    await new TaxCalculation({
      income: 100000,
      deductions: 10000,
      taxAmount: 27000,
    }).save();

    const res = await request(app).get('/api/taxCalculations');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('taxCalculations');
    expect(res.body.taxCalculations).toBeInstanceOf(Array);
    expect(res.body.taxCalculations.length).toBe(1);
  }, 10000);

  it('should get a tax calculation by ID', async () => {
    const taxCalculation = new TaxCalculation({
      income: 100000,
      deductions: 10000,
      taxAmount: 27000,
    });
    await taxCalculation.save();

    const res = await request(app).get(`/api/taxCalculations/${taxCalculation._id}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('taxCalculation');
    expect(res.body.taxCalculation).toHaveProperty('_id', taxCalculation._id.toString());
  }, 10000);

  it('should delete a tax calculation by ID', async () => {
    const taxCalculation = new TaxCalculation({
      income: 100000,
      deductions: 10000,
      taxAmount: 27000,
    });
    await taxCalculation.save();

    const res = await request(app).delete(`/api/taxCalculations/${taxCalculation._id}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', 'Tax calculation deleted');
  }, 10000);
});

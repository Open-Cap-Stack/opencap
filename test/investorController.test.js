const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const Investor = require('../models/Investor');
const investorRouter = require('../routes/investorRoutes');
const { connectDB } = require('../db');

const app = express();
app.use(express.json());
app.use('/investors', investorRouter);

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Investor Controller Test', () => {
  let investorId;

  it('should create a new investor', async () => {
    const response = await request(app).post('/investors').send({
      investorId: 'INV123',
      investmentAmount: 50000,
      equityPercentage: 10,
      investorType: 'Angel',
      relatedFundraisingRound: new mongoose.Types.ObjectId(),
    });

    expect(response.statusCode).toBe(201);
    expect(response.body._id).toBeDefined();
    investorId = response.body._id;
  });

  it('should fetch an investor by ID', async () => {
    const response = await request(app).get(`/investors/${investorId}`);
    expect(response.statusCode).toBe(200);
    expect(response.body.investor).toHaveProperty('investorId', 'INV123');
  });

  it('should fetch all investors', async () => {
    const response = await request(app).get('/investors');
    expect(response.statusCode).toBe(200);
    expect(response.body.investors).toBeInstanceOf(Array);
  });

  it('should update an investor', async () => {
    const response = await request(app).put(`/investors/${investorId}`).send({
      investorId: 'INV123',
      investmentAmount: 100000,
      equityPercentage: 20,
      investorType: 'Venture Capital',
      relatedFundraisingRound: new mongoose.Types.ObjectId(),
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.investmentAmount).toBe(100000);
  });

  it('should delete an investor', async () => {
    const response = await request(app).delete(`/investors/${investorId}`);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Investor deleted');
  });
});

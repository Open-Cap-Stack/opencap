const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const ComplianceCheck = require('../models/ComplianceCheck');
const complianceCheckRoutes = require('../routes/ComplianceCheck'); // Updated to match the correct file name

const app = express();
app.use(express.json());
app.use('/api/complianceChecks', complianceCheckRoutes);

describe('ComplianceCheck Routes', () => {
  beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await mongoose.connection.dropDatabase();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await ComplianceCheck.deleteMany({});
  });

  it('should create a new compliance check', async () => {
    const complianceData = {
      CheckID: 'unique-check-id',
      SPVID: 'spv123',
      RegulationType: 'GDPR',
      Status: 'Compliant',
      Details: 'All checks passed',
      Timestamp: new Date(),
    };

    const res = await request(app)
      .post('/api/complianceChecks')
      .send(complianceData);

    expect(res.statusCode).toBe(201);
    expect(res.body.CheckID).toBe(complianceData.CheckID);
  });

  it('should get all compliance checks', async () => {
    const complianceData = {
      CheckID: 'unique-check-id',
      SPVID: 'spv123',
      RegulationType: 'GDPR',
      Status: 'Compliant',
      Details: 'All checks passed',
      Timestamp: new Date(),
    };

    await new ComplianceCheck(complianceData).save();

    const res = await request(app).get('/api/complianceChecks');

    expect(res.statusCode).toBe(200);
    expect(res.body.complianceChecks).toBeInstanceOf(Array);
    expect(res.body.complianceChecks[0].CheckID).toBe(complianceData.CheckID);
  });

  it('should delete a compliance check by ID', async () => {
    const complianceCheck = new ComplianceCheck({
      CheckID: 'unique-check-id',
      SPVID: 'spv123',
      RegulationType: 'GDPR',
      Status: 'Compliant',
      Details: 'All checks passed',
      Timestamp: new Date(),
    });
    await complianceCheck.save();

    const res = await request(app).delete(`/api/complianceChecks/${complianceCheck._id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Compliance check deleted');
  });
});

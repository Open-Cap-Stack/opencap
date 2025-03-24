const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const SPV = require('../models/SPV');
const spvRoutes = require('../routes/SPV'); // Make sure to create this route file

const app = express();
app.use(express.json());
app.use('/api/spvs', spvRoutes);

describe('SPV Routes', () => {
  beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/test');
    await mongoose.connection.dropDatabase();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await SPV.deleteMany({});
  });

  it('should create a new SPV', async () => {
    const spvData = {
      SPVID: 'unique-spv-id',
      Name: 'Test SPV',
      Purpose: 'Investment',
      CreationDate: new Date(),
      Status: 'Active',
      ParentCompanyID: 'company123',
      ComplianceStatus: 'Compliant',
    };

    const res = await request(app)
      .post('/api/spvs')
      .send(spvData);

    expect(res.statusCode).toBe(201);
    expect(res.body.SPVID).toBe(spvData.SPVID);
  });

  it('should get all SPVs', async () => {
    const spvData = {
      SPVID: 'unique-spv-id',
      Name: 'Test SPV',
      Purpose: 'Investment',
      CreationDate: new Date(),
      Status: 'Active',
      ParentCompanyID: 'company123',
      ComplianceStatus: 'Compliant',
    };

    await new SPV(spvData).save();

    const res = await request(app).get('/api/spvs');

    expect(res.statusCode).toBe(200);
    expect(res.body.spvs).toBeInstanceOf(Array);
    expect(res.body.spvs[0].SPVID).toBe(spvData.SPVID);
  });

  it('should delete an SPV by ID', async () => {
    const spv = new SPV({
      SPVID: 'unique-spv-id',
      Name: 'Test SPV',
      Purpose: 'Investment',
      CreationDate: new Date(),
      Status: 'Active',
      ParentCompanyID: 'company123',
      ComplianceStatus: 'Compliant',
    });
    await spv.save();

    const res = await request(app).delete(`/api/spvs/${spv._id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('SPV deleted successfully');
  });
});

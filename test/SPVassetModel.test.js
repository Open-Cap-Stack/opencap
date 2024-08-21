const mongoose = require('mongoose');
const { expect } = require('@jest/globals');
const SPV = require('../models/SPV');

describe('SPV Model', () => {
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
    await SPV.deleteMany({});
  });

  it('should create an SPV with valid fields', async () => {
    const spvData = {
      SPVID: 'unique-spv-id',
      Name: 'Test SPV',
      Purpose: 'Investment',
      CreationDate: new Date(),
      Status: 'Active',
      ParentCompanyID: 'company123',
      ComplianceStatus: 'Compliant',
    };

    const spv = new SPV(spvData);
    const savedSPV = await spv.save();

    expect(savedSPV.SPVID).toBe(spvData.SPVID);
    expect(savedSPV.Name).toBe(spvData.Name);
    expect(savedSPV.Purpose).toBe(spvData.Purpose);
    expect(new Date(savedSPV.CreationDate).toISOString()).toBe(spvData.CreationDate.toISOString());
    expect(savedSPV.Status).toBe(spvData.Status);
    expect(savedSPV.ParentCompanyID).toBe(spvData.ParentCompanyID);
    expect(savedSPV.ComplianceStatus).toBe(spvData.ComplianceStatus);
  });

  it('should not create an SPV without required fields', async () => {
    const spvData = {
      Name: 'Test SPV',
      Purpose: 'Investment',
    };

    try {
      const spv = new SPV(spvData);
      await spv.save();
    } catch (error) {
      expect(error.errors.SPVID).toBeTruthy();
      expect(error.errors.CreationDate).toBeTruthy();
      expect(error.errors.Status).toBeTruthy();
      expect(error.errors.ParentCompanyID).toBeTruthy();
      expect(error.errors.ComplianceStatus).toBeTruthy();
    }
  });

  it('should not create an SPV with invalid enum values', async () => {
    const spvData = {
      SPVID: 'unique-spv-id',
      Name: 'Test SPV',
      Purpose: 'Investment',
      CreationDate: new Date(),
      Status: 'InvalidStatus', // Invalid enum value
      ParentCompanyID: 'company123',
      ComplianceStatus: 'InvalidStatus', // Invalid enum value
    };

    try {
      const spv = new SPV(spvData);
      await spv.save();
    } catch (error) {
      expect(error.errors.Status).toBeTruthy();
      expect(error.errors.ComplianceStatus).toBeTruthy();
    }
  });
});

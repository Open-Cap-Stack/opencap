const mongoose = require('mongoose');
const { expect } = require('@jest/globals');
const ComplianceCheck = require('../models/ComplianceCheck');

describe('ComplianceCheck Model', () => {
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

  it('should not create a compliance check without required fields', async () => {
    const complianceData = {
      SPVID: 'spv123',
      RegulationType: 'GDPR',
      Status: 'Compliant',
    };

    try {
      const complianceCheck = new ComplianceCheck(complianceData);
      await complianceCheck.save();
    } catch (error) {
      console.log('Full error object:', error);

      expect(error.errors).toHaveProperty('CheckID');

      // Explicitly check if the error object contains an error for 'Timestamp'
      if (!complianceData.Timestamp) {
        expect(error.message).toContain('Timestamp is required');
      }
    }
  });
});

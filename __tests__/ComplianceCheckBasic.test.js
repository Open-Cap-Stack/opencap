// __tests__/ComplianceCheckBasic.test.js
const mongoose = require('mongoose');
const ComplianceCheck = require('../models/ComplianceCheck');
const { setupTestDB, teardownTestDB, clearDatabase } = require('./setup/dbHandler');

// Create the test data object outside the tests
const validCheckData = {
  CheckID: 'CHECK-001',
  SPVID: 'SPV-123',
  RegulationType: 'GDPR',
  Status: 'Compliant',
  LastCheckedBy: 'Admin',
  Timestamp: new Date(),
  Details: 'Initial compliance check'
};

describe('ComplianceCheck Model - Basic Operations', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('Basic CRUD Operations', () => {
    test('should create a compliance check with valid fields', async () => {
      const savedCheck = await ComplianceCheck.create(validCheckData);
      
      expect(savedCheck.CheckID).toBe(validCheckData.CheckID);
      expect(savedCheck.SPVID).toBe(validCheckData.SPVID);
      expect(savedCheck.RegulationType).toBe(validCheckData.RegulationType);
      expect(savedCheck.Status).toBe(validCheckData.Status);
      expect(savedCheck.LastCheckedBy).toBe(validCheckData.LastCheckedBy);
      expect(savedCheck.Details).toBe(validCheckData.Details);
      expect(savedCheck.Timestamp).toBeInstanceOf(Date);
      expect(savedCheck.CreatedAt).toBeInstanceOf(Date);
      expect(savedCheck.UpdatedAt).toBeInstanceOf(Date);
    });

    test('should not create a compliance check without required fields', async () => {
      const check = new ComplianceCheck({});
      
      const validationError = check.validateSync();
      expect(validationError.errors).toHaveProperty('CheckID');
      expect(validationError.errors).toHaveProperty('SPVID');
      expect(validationError.errors).toHaveProperty('RegulationType');
      expect(validationError.errors).toHaveProperty('Status');
      expect(validationError.errors).toHaveProperty('LastCheckedBy');
      expect(validationError.errors).toHaveProperty('Timestamp');
    });

    test('should not create a compliance check with duplicate CheckID', async () => {
      await ComplianceCheck.create(validCheckData);
      
      const duplicateData = {
        ...validCheckData,
        SPVID: 'SPV-124'
      };
      
      await expect(ComplianceCheck.create(duplicateData))
        .rejects.toThrow('A compliance check with this CheckID already exists');
    });
  });

  describe('Timestamps and Updates', () => {
    test('should auto-update UpdatedAt on modification', async () => {
      const check = await ComplianceCheck.create(validCheckData);
      const originalUpdatedAt = check.UpdatedAt;

      await new Promise(resolve => setTimeout(resolve, 100));

      check.Status = 'Non-Compliant';
      await check.save();

      expect(check.UpdatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    test('should not modify CreatedAt on update', async () => {
      const check = await ComplianceCheck.create(validCheckData);
      const originalCreatedAt = check.CreatedAt;

      check.Status = 'Non-Compliant';
      await check.save();

      expect(check.CreatedAt.getTime()).toBe(originalCreatedAt.getTime());
    });
  });
});
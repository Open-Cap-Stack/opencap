const mongoose = require('mongoose');
const ComplianceCheck = require('../models/ComplianceCheck');
const { setupTestDB, teardownTestDB, clearDatabase } = require('./setup/dbHandler');

describe('ComplianceCheck Model', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  const validCheckData = {
    CheckID: 'CHECK-001',
    SPVID: 'SPV-123',
    RegulationType: 'GDPR',
    Status: 'Compliant',
    LastCheckedBy: 'Admin',
    Timestamp: new Date(),
    Details: 'Initial compliance check'
  };

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

  describe('Validation Rules', () => {
    test('should validate SPVID format', async () => {
      const check = new ComplianceCheck({
        ...validCheckData,
        SPVID: 'invalid_spv_id'
      });
      
      const validationError = check.validateSync();
      expect(validationError.errors.SPVID.message)
        .toBe('SPVID must contain only uppercase letters, numbers, and hyphens');
    });

    test('should validate CheckID format', async () => {
      const check = new ComplianceCheck({
        ...validCheckData,
        CheckID: 'invalid_check_id'
      });
      
      const validationError = check.validateSync();
      expect(validationError.errors.CheckID.message)
        .toBe('CheckID must contain only uppercase letters, numbers, and hyphens');
    });

    test('should validate RegulationType enum values', async () => {
      const check = new ComplianceCheck({
        ...validCheckData,
        RegulationType: 'INVALID-TYPE'
      });
      
      const validationError = check.validateSync();
      expect(validationError.errors.RegulationType.message)
        .toMatch(/RegulationType must be one of:/);
    });

    test('should validate Status enum values', async () => {
      const check = new ComplianceCheck({
        ...validCheckData,
        Status: 'INVALID-STATUS'
      });
      
      const validationError = check.validateSync();
      expect(validationError.errors.Status.message)
        .toMatch(/Status must be one of:/);
    });

    test('should not allow future Timestamp', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const check = new ComplianceCheck({
        ...validCheckData,
        Timestamp: futureDate
      });
      
      const validationError = check.validateSync();
      expect(validationError.errors.Timestamp.message)
        .toBe('Timestamp cannot be in the future');
    });

    test('should validate Details length', async () => {
      const check = new ComplianceCheck({
        ...validCheckData,
        Details: 'a'.repeat(1001)
      });
      
      const validationError = check.validateSync();
      expect(validationError.errors.Details.message)
        .toBe('Details cannot be longer than 1000 characters');
    });

    test('should require valid date for Timestamp', async () => {
      const check = new ComplianceCheck({
        ...validCheckData,
        Timestamp: 'invalid-date'
      });
      
      const validationError = check.validateSync();
      expect(validationError.errors.Timestamp.message)
        .toBe('Cast to date failed for value "invalid-date" (type string) at path "Timestamp"');
    });
  });

  describe('Virtual Fields and Methods', () => {
    test('should calculate compliance age correctly', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      
      const check = await ComplianceCheck.create({
        ...validCheckData,
        Timestamp: pastDate
      });

      expect(check.complianceAge).toBeGreaterThanOrEqual(9);
      expect(check.complianceAge).toBeLessThanOrEqual(10);
    });

    test('should return null compliance age for missing timestamp', async () => {
      const check = new ComplianceCheck(validCheckData);
      check.Timestamp = undefined;
      expect(check.complianceAge).toBeNull();
    });

    test('should determine if compliance is expired', async () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 2);
      
      const check = await ComplianceCheck.create({
        ...validCheckData,
        Timestamp: pastDate
      });

      expect(check.isExpired()).toBe(true);
      expect(check.isExpired(1000)).toBe(false);
    });
  });

  describe('Static Methods', () => {
    test('should find non-compliant checks', async () => {
      await ComplianceCheck.create(validCheckData);
      await ComplianceCheck.create({
        ...validCheckData,
        CheckID: 'CHECK-002',
        Status: 'Non-Compliant'
      });

      const nonCompliant = await ComplianceCheck.findNonCompliant();
      expect(nonCompliant).toHaveLength(1);
      expect(nonCompliant[0].Status).toBe('Non-Compliant');
    });

    test('should find checks by regulation type', async () => {
      await ComplianceCheck.create({
        ...validCheckData,
        CheckID: 'CHECK-002',
        RegulationType: 'HIPAA'
      });

      const hipaaChecks = await ComplianceCheck.findByRegulation('hipaa');
      expect(hipaaChecks).toHaveLength(1);
      expect(hipaaChecks[0].RegulationType).toBe('HIPAA');
    });

    test('should return empty array when no matching regulation type found', async () => {
      const result = await ComplianceCheck.findByRegulation('HIPAA');
      expect(result).toHaveLength(0);
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
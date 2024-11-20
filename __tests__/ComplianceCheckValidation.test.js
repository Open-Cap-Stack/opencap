// __tests__/ComplianceCheckValidation.test.js
const mongoose = require('mongoose');
const ComplianceCheck = require('../models/ComplianceCheck');
const { setupTestDB, teardownTestDB, clearDatabase } = require('./setup/dbHandler');

const validCheckData = {
  CheckID: 'CHECK-001',
  SPVID: 'SPV-123',
  RegulationType: 'GDPR',
  Status: 'Compliant',
  LastCheckedBy: 'Admin',
  Timestamp: new Date(),
  Details: 'Initial compliance check'
};

describe('ComplianceCheck Model - Validation', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('ID Validations', () => {
    test('should validate CheckID format', async () => {
      const check = new ComplianceCheck({
        ...validCheckData,
        CheckID: 'invalid_check_id'
      });
      
      const validationError = check.validateSync();
      expect(validationError.errors.CheckID.message)
        .toBe('CheckID must contain only uppercase letters, numbers, and hyphens');
    });

    test('should validate SPVID format', async () => {
      const check = new ComplianceCheck({
        ...validCheckData,
        SPVID: 'invalid_spv_id'
      });
      
      const validationError = check.validateSync();
      expect(validationError.errors.SPVID.message)
        .toBe('SPVID must contain only uppercase letters, numbers, and hyphens');
    });
  });

  describe('RegulationType Validation', () => {
    test('should validate RegulationType enum values', async () => {
      const check = new ComplianceCheck({
        ...validCheckData,
        RegulationType: 'INVALID-TYPE'
      });
      
      const validationError = check.validateSync();
      expect(validationError.errors.RegulationType.message)
        .toMatch(/RegulationType must be one of:/);
    });

    test('should convert lowercase RegulationType to uppercase', async () => {
      const check = new ComplianceCheck({
        ...validCheckData,
        RegulationType: 'gdpr'
      });

      await check.save();
      expect(check.RegulationType).toBe('GDPR');
    });

    test('should reject invalid RegulationType regardless of case', async () => {
      const check = new ComplianceCheck({
        ...validCheckData,
        RegulationType: 'invalid'
      });

      const validationError = check.validateSync();
      expect(validationError.errors.RegulationType).toBeDefined();
    });
  });

  describe('Status Validation', () => {
    test('should validate Status enum values', async () => {
      const check = new ComplianceCheck({
        ...validCheckData,
        Status: 'INVALID-STATUS'
      });
      
      const validationError = check.validateSync();
      expect(validationError.errors.Status.message)
        .toMatch(/Status must be one of:/);
    });
  });

  describe('Timestamp Validation', () => {
    test('should not allow future Timestamp', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const check = new ComplianceCheck({
        ...validCheckData,
        Timestamp: futureDate
      });
      
      await expect(check.save()).rejects.toThrow('Timestamp cannot be in the future');
    });

    test('should handle invalid date formats', async () => {
      const invalidDates = ['invalid-date', '2023-13-45', '', null];

      for (const invalidDate of invalidDates) {
        const check = new ComplianceCheck({
          ...validCheckData,
          Timestamp: invalidDate
        });
        
        const validationError = check.validateSync();
        expect(validationError.errors.Timestamp).toBeDefined();
      }
    });
  });

  describe('Details Validation', () => {
    test('should validate Details length', async () => {
      const check = new ComplianceCheck({
        ...validCheckData,
        Details: 'a'.repeat(1001)
      });
      
      const validationError = check.validateSync();
      expect(validationError.errors.Details.message)
        .toBe('Details cannot be longer than 1000 characters');
    });

    test('should allow empty Details', async () => {
      const check = new ComplianceCheck({
        ...validCheckData,
        Details: ''
      });
      
      const validationError = check.validateSync();
      expect(validationError?.errors?.Details).toBeUndefined();
    });
  });

  describe('LastCheckedBy Validation', () => {
    test('should require LastCheckedBy', async () => {
      const check = new ComplianceCheck({
        ...validCheckData,
        LastCheckedBy: null
      });
      
      const validationError = check.validateSync();
      expect(validationError.errors.LastCheckedBy).toBeDefined();
      expect(validationError.errors.LastCheckedBy.message)
        .toBe('LastCheckedBy is required');
    });

    test('should trim LastCheckedBy value', async () => {
      const check = new ComplianceCheck({
        ...validCheckData,
        LastCheckedBy: '  Admin  '
      });

      await check.save();
      expect(check.LastCheckedBy).toBe('Admin');
    });
  });
});
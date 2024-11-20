const mongoose = require('mongoose');
const ComplianceCheck = require('../models/ComplianceCheck');
const { setupTestDB, teardownTestDB, clearDatabase } = require('./setup/dbHandler');

const testData = {
  basic: {
    CheckID: 'CHECK-001',
    SPVID: 'SPV-123',
    RegulationType: 'GDPR',
    Status: 'Compliant',
    LastCheckedBy: 'Admin',
    Timestamp: new Date(),
    Details: 'Initial compliance check'
  },
  complianceChecks: [
    {
      CheckID: 'CHECK-001',
      SPVID: 'SPV-123',
      RegulationType: 'GDPR',
      Status: 'Compliant',
      LastCheckedBy: 'Admin',
      Timestamp: new Date(),
      Details: 'Test check 1'
    },
    {
      CheckID: 'CHECK-002',
      SPVID: 'SPV-124',
      RegulationType: 'HIPAA',
      Status: 'Non-Compliant',
      LastCheckedBy: 'Admin',
      Timestamp: new Date(Date.now() - 86400000),
      Details: 'Test check 2'
    },
    {
      CheckID: 'CHECK-003',
      SPVID: 'SPV-125',
      RegulationType: 'GDPR',
      Status: 'Non-Compliant',
      LastCheckedBy: 'Admin',
      Timestamp: new Date(Date.now() - 172800000),
      Details: 'Test check 3'
    }
  ]
};

describe('ComplianceCheck Model - Methods', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
    jest.restoreAllMocks();
  });

  describe('Schema Validation and Error Handling', () => {
    test('should handle schema options and unknown fields', async () => {
      const dataWithExtra = {
        ...testData.basic,
        unknownField: 'should be ignored'
      };
      const check = new ComplianceCheck(dataWithExtra);
      expect(check.unknownField).toBeUndefined();
      expect(check.toJSON().unknownField).toBeUndefined();
    });

    test('should handle schema path validation', async () => {
      const check = new ComplianceCheck(testData.basic);
      const pathInstance = check.schema.path('RegulationType');
      expect(pathInstance).toBeDefined();
      expect(pathInstance.instance).toBe('String');
      // Coverage for line 72
      expect(pathInstance.options.required[0]).toBe(true);
    });

    test('should handle model initialization errors', async () => {
      const check = new ComplianceCheck({
        ...testData.basic,
        Timestamp: 'invalid-date'
      });
      const validationError = check.validateSync();
      expect(validationError.errors.Timestamp).toBeDefined();
    });

    test('should handle validation error propagation', async () => {
      const check = new ComplianceCheck({
        ...testData.basic,
        RegulationType: null
      });
      
      try {
        // Coverage for line 75
        await check.validate();
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).toBe('ValidationError');
        expect(error.errors.RegulationType).toBeDefined();
        // Coverage for line 79
        expect(error.errors.RegulationType.kind).toBe('required');
      }
    });

    test('should validate path requirements', async () => {
      const check = new ComplianceCheck({});
      const validationError = check.validateSync();
      const pathErrors = Object.keys(validationError.errors);
      expect(pathErrors).toContain('RegulationType');
      expect(validationError.errors.RegulationType.kind).toBe('required');
    });
  });

  describe('Virtual Properties', () => {
    test('should calculate complianceAge correctly', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      
      const check = await ComplianceCheck.create({
        ...testData.basic,
        Timestamp: pastDate
      });

      expect(check.complianceAge).toBeGreaterThanOrEqual(9);
      expect(check.complianceAge).toBeLessThanOrEqual(10);
    });

    test('should handle null Timestamp for complianceAge', async () => {
      const check = new ComplianceCheck({
        ...testData.basic,
        Timestamp: undefined
      });
      expect(check.complianceAge).toBeNull();
    });
  });

  describe('Instance Methods', () => {
    test('should determine if compliance is expired', async () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 2);
      
      const check = await ComplianceCheck.create({
        ...testData.basic,
        Timestamp: pastDate
      });
      expect(check.isExpired()).toBe(true);
    });

    test('should respect custom expiry threshold', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 500);
      
      const check = await ComplianceCheck.create({
        ...testData.basic,
        Timestamp: pastDate
      });
      expect(check.isExpired(1000)).toBe(false);
      expect(check.isExpired(400)).toBe(true);
    });

    test('should handle null Timestamp in isExpired', async () => {
      const check = new ComplianceCheck(testData.basic);
      check.Timestamp = null;
      expect(check.isExpired()).toBe(true);
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      await ComplianceCheck.create(testData.complianceChecks);
    });

    describe('findNonCompliant', () => {
      test('should find all non-compliant checks', async () => {
        const results = await ComplianceCheck.findNonCompliant();
        expect(results).toHaveLength(2);
        expect(results.every(check => check.Status === 'Non-Compliant')).toBe(true);
      });

      test('should sort non-compliant checks by timestamp descending', async () => {
        const results = await ComplianceCheck.findNonCompliant();
        expect(results[0].CheckID).toBe('CHECK-002');
        expect(results[1].CheckID).toBe('CHECK-003');
      });

      test('should handle database errors gracefully', async () => {
        const mockFind = jest.spyOn(mongoose.Model, 'find');
        mockFind.mockImplementationOnce(() => {
          throw new Error('Database error');
        });
        const results = await ComplianceCheck.findNonCompliant();
        expect(results).toEqual([]);
      });
    });

    describe('findByRegulation', () => {
      test('should find checks by regulation type', async () => {
        const gdprChecks = await ComplianceCheck.findByRegulation('GDPR');
        expect(gdprChecks).toHaveLength(2);
        expect(gdprChecks.every(check => check.RegulationType === 'GDPR')).toBe(true);
      });

      test('should handle case-insensitive search', async () => {
        const results = await ComplianceCheck.findByRegulation('gdpr');
        expect(results).toHaveLength(2);
        expect(results.every(check => check.RegulationType === 'GDPR')).toBe(true);
      });

      test('should handle null regulation type', async () => {
        const results = await ComplianceCheck.findByRegulation(null);
        expect(results).toEqual([]);
      });

      test('should handle undefined regulation type', async () => {
        const results = await ComplianceCheck.findByRegulation(undefined);
        expect(results).toEqual([]);
      });

      test('should handle database errors gracefully', async () => {
        const mockFind = jest.spyOn(mongoose.Model, 'find');
        mockFind.mockImplementationOnce(() => {
          throw new Error('Database error');
        });
        const results = await ComplianceCheck.findByRegulation('GDPR');
        expect(results).toEqual([]);
      });
    });
  });

  describe('Indexes and Constraints', () => {
    test('should enforce unique CheckID constraint', async () => {
      await ComplianceCheck.create(testData.basic);
      await expect(ComplianceCheck.create(testData.basic))
        .rejects.toThrow(/CheckID already exists/);
    });

    test('should verify index creation', async () => {
      const indexes = await ComplianceCheck.collection.getIndexes();
      expect(indexes['CheckID_1']).toBeDefined();
      expect(indexes['SPVID_1_Timestamp_-1']).toBeDefined();
      expect(indexes['RegulationType_1_Status_1']).toBeDefined();
    });
  });

  describe('JSON Serialization', () => {
    test('should transform document to JSON correctly', async () => {
      const check = await ComplianceCheck.create(testData.basic);
      const json = check.toJSON();
      

      expect(json._id).toBeUndefined();
      expect(json.__v).toBeUndefined();
      expect(json.CheckID).toBe(testData.basic.CheckID);
      expect(typeof json.complianceAge).toBe('number');
      expect(json.RegulationType).toBe(testData.basic.RegulationType);
      expect(json.Status).toBe(testData.basic.Status);
    });
  });
});
const request = require('supertest'); // Add this import
const mongoose = require('mongoose');
const express = require('express');
const complianceCheckRoutes = require('../routes/ComplianceCheck');
const ComplianceCheck = require('../models/ComplianceCheck');
const { setupTestDB, teardownTestDB, clearDatabase } = require('./setup/dbHandler');

const app = express();
app.use(express.json());
app.use('/api/complianceChecks', complianceCheckRoutes);

describe('ComplianceCheck Advanced Features', () => {
  const testData = {
    basic: {
      CheckID: 'CHECK-001',
      SPVID: 'SPV-123',
      RegulationType: 'GDPR',
      Status: 'Compliant',
      LastCheckedBy: 'TestAdmin',
      Timestamp: new Date(),
      Details: 'Test compliance check'
    }
  };

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

  describe('Timestamp Handling', () => {
    test('should handle undefined Timestamp in compliance age calculation', () => {
      const check = new ComplianceCheck({
        ...testData.basic,
        CheckID: 'CHECK-UNDEFINED',
        Timestamp: undefined
      });
      expect(check.complianceAge).toBeNull();
    });

    test('should handle invalid date in Timestamp validation', async () => {
      const check = new ComplianceCheck({
        ...testData.basic,
        CheckID: 'CHECK-INVALID-DATE',
        Timestamp: 'invalid-date'
      });
      const error = check.validateSync();
      expect(error.errors.Timestamp).toBeDefined();
      expect(error.errors.Timestamp.message)
        .toBe('Cast to date failed for value "invalid-date" (type string) at path "Timestamp"');
    });

    test('should reject future timestamps', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const check = new ComplianceCheck({
        ...testData.basic,
        CheckID: 'CHECK-FUTURE',
        Timestamp: futureDate
      });

      await expect(check.save()).rejects.toThrow(/future/);
    });
  });

  describe('RegulationType Handling', () => {
    test('should validate RegulationType case conversion', async () => {
      const check = await ComplianceCheck.create({
        ...testData.basic,
        CheckID: 'CHECK-CASE',
        RegulationType: 'gdpr'
      });
      expect(check.RegulationType).toBe('GDPR');
    });

    test('should handle invalid RegulationType values', async () => {
      const check = new ComplianceCheck({
        ...testData.basic,
        CheckID: 'CHECK-INVALID-TYPE',
        RegulationType: 'INVALID'
      });

      const error = check.validateSync();
      expect(error.errors.RegulationType).toBeDefined();
      expect(error.errors.RegulationType.message).toContain('must be one of');
    });
  });

  describe('Compliance Status Features', () => {
    test('should find non-compliant checks by status', async () => {
      await ComplianceCheck.create([
        {
          ...testData.basic,
          CheckID: 'CHECK-NC1',
          Status: 'Non-Compliant'
        },
        {
          ...testData.basic,
          CheckID: 'CHECK-NC2',
          Status: 'Non-Compliant'
        }
      ]);

      const nonCompliant = await ComplianceCheck.findNonCompliant();
      expect(nonCompliant).toHaveLength(2);
      nonCompliant.forEach(check => {
        expect(check.Status).toBe('Non-Compliant');
      });
    });

    test('should sort non-compliant checks by timestamp', async () => {
      const olderDate = new Date(Date.now() - 172800000); // 2 days ago
      const newerDate = new Date(Date.now() - 86400000);  // 1 day ago
      
      await ComplianceCheck.create([
        {
          ...testData.basic,
          CheckID: 'CHECK-NC1',
          Status: 'Non-Compliant',
          Timestamp: olderDate
        },
        {
          ...testData.basic,
          CheckID: 'CHECK-NC2',
          Status: 'Non-Compliant',
          Timestamp: newerDate
        }
      ]);

      const nonCompliant = await ComplianceCheck.findNonCompliant();
      expect(nonCompliant[0].Timestamp.getTime())
        .toBeGreaterThan(nonCompliant[1].Timestamp.getTime());
    });
  });

  describe('Error Handling', () => {
    test('should handle findOne database errors', async () => {
      jest.spyOn(ComplianceCheck, 'findOne').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/complianceChecks')
        .send({
          ...testData.basic,
          CheckID: 'CHECK-ERROR'
        });

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('Failed to create compliance check');
    });

    test('should handle validation errors properly', async () => {
      const res = await request(app)
        .post('/api/complianceChecks')
        .send({
          ...testData.basic,
          CheckID: 'CHECK-VALIDATION',
          RegulationType: 'INVALID'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Failed to create compliance check');
      expect(res.body.error).toMatch(/RegulationType/);
    });
  });
});

// Add these tests at the end, before the final closing brace

describe('Coverage Gaps', () => {
    describe('Model Coverage', () => {
      test('should cover model initialization (line 13)', () => {
        const instance = new ComplianceCheck();
        expect(instance).toBeInstanceOf(mongoose.Model);
      });

      test('should cover schema paths validation (line 72)', async () => {
        const instance = new ComplianceCheck({
          ...testData.basic,
          CheckID: 'CHECK-PATHS'
        });
        const paths = instance.schema.paths;
        expect(paths.RegulationType.options.uppercase).toBe(true);
      });

      test('should cover pre-validate hook (lines 79-98)', async () => {
        const check = new ComplianceCheck({
          ...testData.basic,
          CheckID: 'CHECK-HOOK',
          Timestamp: null
        });
        const validationError = await check.validate().catch(e => e);
        expect(validationError).toBeDefined();
        expect(validationError.name).toBe('ValidationError');
      });

      test('should cover RegulationType validation (lines 110-111)', async () => {
        await ComplianceCheck.create({
          ...testData.basic,
          CheckID: 'CHECK-REG-TYPE',
          RegulationType: 'gdpr'
        });
        const results = await ComplianceCheck.findByRegulation('GDPR');
        expect(results[0].RegulationType).toBe('GDPR');
      });

      test('should cover virtual field edge cases (lines 122-136)', () => {
        const check = new ComplianceCheck({
          ...testData.basic,
          CheckID: 'CHECK-VIRTUAL',
          Timestamp: undefined
        });
        expect(check.complianceAge).toBeNull();
        expect(check.isExpired()).toBe(true);
      });
    });

    describe('Route Coverage', () => {
      test('should cover error middleware (lines 157,162)', async () => {
        jest.spyOn(ComplianceCheck.prototype, 'save')
          .mockRejectedValueOnce(new mongoose.Error.ValidationError());

        const res = await request(app)
          .post('/api/complianceChecks')
          .send({
            ...testData.basic,
            CheckID: 'CHECK-MIDDLEWARE'
          });

        expect(res.statusCode).toBe(400);
      });

      test('should cover route edge cases (lines 11,19,39-43)', async () => {
        // Cover GET error handling
        jest.spyOn(ComplianceCheck, 'find')
          .mockRejectedValueOnce(new Error('Database error'));

        const res = await request(app)
          .get('/api/complianceChecks');

        expect(res.statusCode).toBe(500);
      });

      test('should cover DELETE edge cases (lines 52-70)', async () => {
        // Invalid ID format
        const invalidRes = await request(app)
          .delete('/api/complianceChecks/invalid-id');
        expect(invalidRes.statusCode).toBe(400);

        // Database error
        const validId = new mongoose.Types.ObjectId();
        jest.spyOn(ComplianceCheck, 'findByIdAndDelete')
          .mockRejectedValueOnce(new Error('Database error'));

        const errorRes = await request(app)
          .delete(`/api/complianceChecks/${validId}`);
        expect(errorRes.statusCode).toBe(500);
      });
    });
  });
/**
 * ComplianceCheck Model Tests
 * Feature: Issue #40 - Model Test Coverage
 * Tests for compliance check validation, constants, and custom methods
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock the zerodbService to prevent real API calls
jest.mock('../../../services/zerodbService', () => ({
  initialize: jest.fn(),
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  deleteRowById: jest.fn(),
  createTable: jest.fn(),
  client: { put: jest.fn() },
  projectId: 'test-project'
}));

const ComplianceCheck = require('../../../models/ComplianceCheck');
const zerodbService = require('../../../services/zerodbService');

describe('ComplianceCheck Model', () => {
  let store = [];
  let idCounter = 0;

  beforeEach(() => {
    store = [];
    idCounter = 0;
    jest.clearAllMocks();

    // Mock insertRow
    zerodbService.insertRow.mockImplementation((tableName, doc) => {
      const row_id = ++idCounter;
      const storedDoc = { ...doc };
      store.push(storedDoc);
      return Promise.resolve({
        data: [{ row_id, row_data: storedDoc }]
      });
    });

    // Mock queryTable
    zerodbService.queryTable.mockImplementation((tableName, { filter = {} } = {}) => {
      let results = [...store];
      for (const [key, value] of Object.entries(filter)) {
        results = results.filter(doc => doc[key] === value);
      }
      return Promise.resolve({
        data: results.map((doc, i) => ({ row_id: i + 1, row_data: doc }))
      });
    });

    // Mock client.put for updates
    zerodbService.client.put.mockImplementation((url, { row_data }) => {
      const idx = store.findIndex(doc => doc._id === row_data._id);
      if (idx !== -1) {
        store[idx] = { ...store[idx], ...row_data };
      }
      return Promise.resolve({ data: { row_data } });
    });
  });

  // ─── Constants ───────────────────────────────────────────────

  describe('Constants', () => {
    it('should expose REGULATION_TYPES', () => {
      expect(ComplianceCheck.REGULATION_TYPES).toEqual(['GDPR', 'HIPAA', 'SOX', 'CCPA']);
    });

    it('should expose COMPLIANCE_STATUSES', () => {
      expect(ComplianceCheck.COMPLIANCE_STATUSES).toEqual(['Compliant', 'Non-Compliant']);
    });

    it('should have DEFAULT_EXPIRY_DAYS of 365', () => {
      expect(ComplianceCheck.DEFAULT_EXPIRY_DAYS).toBe(365);
    });
  });

  // ─── Schema Validation ───────────────────────────────────────

  describe('Schema Validation', () => {
    it('should have the correct schema fields', () => {
      expect(ComplianceCheck.schema).toBeDefined();
      expect(ComplianceCheck.schema.CheckID).toBeDefined();
      expect(ComplianceCheck.schema.SPVID).toBeDefined();
      expect(ComplianceCheck.schema.RegulationType).toBeDefined();
      expect(ComplianceCheck.schema.Status).toBeDefined();
      expect(ComplianceCheck.schema.Details).toBeDefined();
      expect(ComplianceCheck.schema.Timestamp).toBeDefined();
      expect(ComplianceCheck.schema.LastCheckedBy).toBeDefined();
    });

    it('should require CheckID', () => {
      expect(ComplianceCheck.schema.CheckID.required).toBe(true);
      expect(ComplianceCheck.schema.CheckID.unique).toBe(true);
    });

    it('should require SPVID', () => {
      expect(ComplianceCheck.schema.SPVID.required).toBe(true);
    });

    it('should require RegulationType with enum', () => {
      expect(ComplianceCheck.schema.RegulationType.required).toBe(true);
      expect(ComplianceCheck.schema.RegulationType.enum).toEqual(['GDPR', 'HIPAA', 'SOX', 'CCPA']);
    });

    it('should require Status with enum', () => {
      expect(ComplianceCheck.schema.Status.required).toBe(true);
      expect(ComplianceCheck.schema.Status.enum).toEqual(['Compliant', 'Non-Compliant']);
    });

    it('should have Details maxLength of 1000', () => {
      expect(ComplianceCheck.schema.Details.maxLength).toBe(1000);
    });

    it('should require Timestamp', () => {
      expect(ComplianceCheck.schema.Timestamp.required).toBe(true);
    });

    it('should require LastCheckedBy', () => {
      expect(ComplianceCheck.schema.LastCheckedBy.required).toBe(true);
    });
  });

  // ─── validateComplianceCheck ─────────────────────────────────

  describe('validateComplianceCheck()', () => {
    const validData = {
      CheckID: 'CHK-001',
      SPVID: 'SPV-001',
      RegulationType: 'GDPR',
      Status: 'Compliant',
      Timestamp: new Date(Date.now() - 86400000), // yesterday
      LastCheckedBy: 'admin@company.com',
      Details: 'All systems compliant'
    };

    it('should pass validation with valid data', () => {
      const result = ComplianceCheck.validateComplianceCheck(validData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail if CheckID is missing', () => {
      const data = { ...validData, CheckID: undefined };
      const result = ComplianceCheck.validateComplianceCheck(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('CheckID is required');
    });

    it('should fail if CheckID has invalid format', () => {
      const data = { ...validData, CheckID: 'chk_lowercase' };
      const result = ComplianceCheck.validateComplianceCheck(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('CheckID must contain only uppercase letters, numbers, and hyphens');
    });

    it('should accept valid CheckID formats', () => {
      const data = { ...validData, CheckID: 'CHK-001-A' };
      const result = ComplianceCheck.validateComplianceCheck(data);
      expect(result.valid).toBe(true);
    });

    it('should fail if SPVID is missing', () => {
      const data = { ...validData, SPVID: undefined };
      const result = ComplianceCheck.validateComplianceCheck(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SPVID is required');
    });

    it('should fail if SPVID has invalid format', () => {
      const data = { ...validData, SPVID: 'spv_lowercase' };
      const result = ComplianceCheck.validateComplianceCheck(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SPVID must contain only uppercase letters, numbers, and hyphens');
    });

    it('should fail if RegulationType is missing', () => {
      const data = { ...validData, RegulationType: undefined };
      const result = ComplianceCheck.validateComplianceCheck(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('RegulationType is required');
    });

    it('should fail if RegulationType is invalid', () => {
      const data = { ...validData, RegulationType: 'INVALID' };
      const result = ComplianceCheck.validateComplianceCheck(data);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('RegulationType must be one of');
    });

    it('should normalize case for RegulationType validation', () => {
      const data = { ...validData, RegulationType: 'gdpr' };
      const result = ComplianceCheck.validateComplianceCheck(data);
      expect(result.valid).toBe(true);
    });

    it('should fail if Status is missing', () => {
      const data = { ...validData, Status: undefined };
      const result = ComplianceCheck.validateComplianceCheck(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Status is required');
    });

    it('should fail if Status is invalid', () => {
      const data = { ...validData, Status: 'Unknown' };
      const result = ComplianceCheck.validateComplianceCheck(data);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Status must be one of');
    });

    it('should fail if Timestamp is missing', () => {
      const data = { ...validData, Timestamp: undefined };
      const result = ComplianceCheck.validateComplianceCheck(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Timestamp is required');
    });

    it('should fail if Timestamp is in the future', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const data = { ...validData, Timestamp: futureDate };
      const result = ComplianceCheck.validateComplianceCheck(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Timestamp cannot be in the future');
    });

    it('should fail if Timestamp is invalid date', () => {
      const data = { ...validData, Timestamp: 'not-a-date' };
      const result = ComplianceCheck.validateComplianceCheck(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Timestamp must be a valid date');
    });

    it('should fail if Details exceeds 1000 characters', () => {
      const data = { ...validData, Details: 'x'.repeat(1001) };
      const result = ComplianceCheck.validateComplianceCheck(data);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Details cannot be longer than 1000 characters');
    });

    it('should accept Details at exactly 1000 characters', () => {
      const data = { ...validData, Details: 'x'.repeat(1000) };
      const result = ComplianceCheck.validateComplianceCheck(data);
      expect(result.valid).toBe(true);
    });

    it('should fail if LastCheckedBy is missing', () => {
      const data = { ...validData, LastCheckedBy: undefined };
      const result = ComplianceCheck.validateComplianceCheck(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('LastCheckedBy is required');
    });

    it('should collect multiple errors', () => {
      const data = {
        CheckID: undefined,
        SPVID: undefined,
        RegulationType: undefined,
        Status: undefined,
        Timestamp: undefined,
        LastCheckedBy: undefined
      };
      const result = ComplianceCheck.validateComplianceCheck(data);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(6);
    });
  });

  // ─── normalizeRegulationType ─────────────────────────────────

  describe('normalizeRegulationType()', () => {
    it('should uppercase and trim input', () => {
      expect(ComplianceCheck.normalizeRegulationType(' gdpr ')).toBe('GDPR');
    });

    it('should handle null input', () => {
      expect(ComplianceCheck.normalizeRegulationType(null)).toBe('');
    });

    it('should handle undefined input', () => {
      expect(ComplianceCheck.normalizeRegulationType(undefined)).toBe('');
    });

    it('should handle non-string input', () => {
      expect(ComplianceCheck.normalizeRegulationType(123)).toBe('');
    });
  });

  // ─── Create ──────────────────────────────────────────────────

  describe('create()', () => {
    const validData = {
      CheckID: 'CHK-001',
      SPVID: 'SPV-001',
      RegulationType: 'gdpr',
      Status: 'Compliant',
      Timestamp: new Date(Date.now() - 86400000),
      LastCheckedBy: 'admin@company.com',
      Details: '  All systems compliant  '
    };

    it('should create a valid compliance check', async () => {
      const result = await ComplianceCheck.create(validData);

      expect(result).toBeDefined();
      expect(result.CheckID).toBe('CHK-001');
      expect(result.RegulationType).toBe('GDPR'); // normalized
    });

    it('should normalize RegulationType on create', async () => {
      const result = await ComplianceCheck.create(validData);
      expect(result.RegulationType).toBe('GDPR');
    });

    it('should trim Details on create', async () => {
      const result = await ComplianceCheck.create(validData);
      expect(result.Details).toBe('All systems compliant');
    });

    it('should normalize Timestamp to ISO string', async () => {
      const result = await ComplianceCheck.create(validData);
      expect(typeof result.Timestamp).toBe('string');
    });

    it('should set CreatedAt and UpdatedAt', async () => {
      const result = await ComplianceCheck.create(validData);
      expect(result.CreatedAt).toBeDefined();
      expect(result.UpdatedAt).toBeDefined();
    });

    it('should throw ValidationError for invalid data', async () => {
      try {
        await ComplianceCheck.create({ CheckID: 'bad_id' });
        fail('Should have thrown');
      } catch (error) {
        expect(error.name).toBe('ValidationError');
      }
    });

    it('should throw DuplicateError for duplicate CheckID', async () => {
      await ComplianceCheck.create(validData);

      try {
        await ComplianceCheck.create(validData);
        fail('Should have thrown');
      } catch (error) {
        expect(error.name).toBe('DuplicateError');
      }
    });
  });

  // ─── findNonCompliant ────────────────────────────────────────

  describe('findNonCompliant()', () => {
    it('should find non-compliant records sorted by timestamp desc', async () => {
      await ComplianceCheck.create({
        CheckID: 'CHK-NC-001',
        SPVID: 'SPV-001',
        RegulationType: 'GDPR',
        Status: 'Non-Compliant',
        Timestamp: new Date('2026-01-01'),
        LastCheckedBy: 'admin@company.com'
      });
      await ComplianceCheck.create({
        CheckID: 'CHK-NC-002',
        SPVID: 'SPV-001',
        RegulationType: 'HIPAA',
        Status: 'Non-Compliant',
        Timestamp: new Date('2026-06-01'),
        LastCheckedBy: 'admin@company.com'
      });
      await ComplianceCheck.create({
        CheckID: 'CHK-C-001',
        SPVID: 'SPV-001',
        RegulationType: 'SOX',
        Status: 'Compliant',
        Timestamp: new Date('2026-03-01'),
        LastCheckedBy: 'admin@company.com'
      });

      const results = await ComplianceCheck.findNonCompliant();
      expect(results.length).toBe(2);
      // Sorted by timestamp descending
      expect(new Date(results[0].Timestamp) >= new Date(results[1].Timestamp)).toBe(true);
    });

    it('should return empty array when no non-compliant records exist', async () => {
      await ComplianceCheck.create({
        CheckID: 'CHK-C-002',
        SPVID: 'SPV-001',
        RegulationType: 'CCPA',
        Status: 'Compliant',
        Timestamp: new Date('2026-03-01'),
        LastCheckedBy: 'admin@company.com'
      });

      const results = await ComplianceCheck.findNonCompliant();
      expect(results.length).toBe(0);
    });
  });

  // ─── findByRegulation ────────────────────────────────────────

  describe('findByRegulation()', () => {
    it('should find checks by regulation type', async () => {
      await ComplianceCheck.create({
        CheckID: 'CHK-REG-001',
        SPVID: 'SPV-001',
        RegulationType: 'SOX',
        Status: 'Compliant',
        Timestamp: new Date('2026-03-01'),
        LastCheckedBy: 'admin@company.com'
      });
      await ComplianceCheck.create({
        CheckID: 'CHK-REG-002',
        SPVID: 'SPV-002',
        RegulationType: 'GDPR',
        Status: 'Compliant',
        Timestamp: new Date('2026-03-01'),
        LastCheckedBy: 'admin@company.com'
      });

      const results = await ComplianceCheck.findByRegulation('SOX');
      expect(results.length).toBe(1);
      expect(results[0].RegulationType).toBe('SOX');
    });

    it('should normalize the regulation type for search', async () => {
      await ComplianceCheck.create({
        CheckID: 'CHK-REG-003',
        SPVID: 'SPV-001',
        RegulationType: 'HIPAA',
        Status: 'Compliant',
        Timestamp: new Date('2026-03-01'),
        LastCheckedBy: 'admin@company.com'
      });

      const results = await ComplianceCheck.findByRegulation('hipaa');
      expect(results.length).toBe(1);
    });

    it('should return empty array for invalid regulation type', async () => {
      const results = await ComplianceCheck.findByRegulation('INVALID');
      expect(results).toEqual([]);
    });

    it('should return empty array for null input', async () => {
      const results = await ComplianceCheck.findByRegulation(null);
      expect(results).toEqual([]);
    });
  });

  // ─── getComplianceAge ────────────────────────────────────────

  describe('getComplianceAge()', () => {
    it('should calculate age in days from Timestamp', () => {
      const daysAgo = 30;
      const timestamp = new Date(Date.now() - daysAgo * 86400000);
      const doc = { Timestamp: timestamp };

      const age = ComplianceCheck.getComplianceAge(doc);
      expect(age).toBe(daysAgo);
    });

    it('should handle ISO string timestamps', () => {
      const daysAgo = 10;
      const timestamp = new Date(Date.now() - daysAgo * 86400000).toISOString();
      const doc = { Timestamp: timestamp };

      const age = ComplianceCheck.getComplianceAge(doc);
      expect(age).toBe(daysAgo);
    });

    it('should return null for missing timestamp', () => {
      const doc = {};
      const age = ComplianceCheck.getComplianceAge(doc);
      expect(age).toBeNull();
    });

    it('should return null for invalid timestamp', () => {
      const doc = { Timestamp: 'not-a-date' };
      const age = ComplianceCheck.getComplianceAge(doc);
      expect(age).toBeNull();
    });
  });

  // ─── isExpired ───────────────────────────────────────────────

  describe('isExpired()', () => {
    it('should return true if age exceeds threshold', () => {
      const timestamp = new Date(Date.now() - 400 * 86400000);
      const doc = { Timestamp: timestamp };

      expect(ComplianceCheck.isExpired(doc)).toBe(true);
    });

    it('should return false if age is within threshold', () => {
      const timestamp = new Date(Date.now() - 100 * 86400000);
      const doc = { Timestamp: timestamp };

      expect(ComplianceCheck.isExpired(doc)).toBe(false);
    });

    it('should use custom threshold', () => {
      const timestamp = new Date(Date.now() - 35 * 86400000);
      const doc = { Timestamp: timestamp };

      expect(ComplianceCheck.isExpired(doc, 30)).toBe(true);
      expect(ComplianceCheck.isExpired(doc, 60)).toBe(false);
    });

    it('should default to 365 days threshold', () => {
      const timestamp = new Date(Date.now() - 364 * 86400000);
      const doc = { Timestamp: timestamp };

      expect(ComplianceCheck.isExpired(doc)).toBe(false);
    });

    it('should return true for null timestamp', () => {
      const doc = {};
      expect(ComplianceCheck.isExpired(doc)).toBe(true);
    });
  });

  // ─── toJSON ──────────────────────────────────────────────────

  describe('toJSON()', () => {
    it('should transform document, removing _id and __v', () => {
      const doc = {
        _id: 'abc',
        __v: 0,
        CheckID: 'CHK-001',
        SPVID: 'SPV-001',
        RegulationType: 'GDPR',
        Status: 'Compliant',
        Timestamp: new Date(Date.now() - 86400000).toISOString(),
        LastCheckedBy: 'admin'
      };

      const json = ComplianceCheck.toJSON(doc);
      expect(json._id).toBeUndefined();
      expect(json.__v).toBeUndefined();
      expect(json.CheckID).toBe('CHK-001');
    });

    it('should include complianceAge in transformed output', () => {
      const doc = {
        _id: 'abc',
        CheckID: 'CHK-001',
        Timestamp: new Date(Date.now() - 10 * 86400000).toISOString()
      };

      const json = ComplianceCheck.toJSON(doc);
      expect(json.complianceAge).toBe(10);
    });

    it('should return null for null input', () => {
      expect(ComplianceCheck.toJSON(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(ComplianceCheck.toJSON(undefined)).toBeNull();
    });
  });
});

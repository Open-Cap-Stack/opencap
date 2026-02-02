/**
 * @jest-environment node
 */

const DataIntegrityValidator = require('../../scripts/data-integrity-validator');
const zerodbService = require('../../services/zerodbService');
const mongoose = require('mongoose');

jest.mock('../../services/zerodbService');
jest.mock('mongoose');

describe('Data Integrity Validator', () => {
  let validator;
  const mockToken = 'mock-jwt-token';

  beforeEach(() => {
    jest.clearAllMocks();
    validator = new DataIntegrityValidator({
      strictMode: true,
      validateChecksums: true,
      validateRelationships: true
    });
  });

  describe('Checksum Validation', () => {
    it('should validate data checksums match expectations', async () => {
      // GIVEN: Data with known checksum
      const mockData = [
        { _id: '1', ReportID: 'R001', Type: 'Annual' },
        { _id: '2', ReportID: 'R002', Type: 'Quarterly' }
      ];
      const expectedChecksum = validator.calculateChecksum(mockData);

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.queryTable.mockResolvedValue(mockData);

      // WHEN: Validating checksums
      const result = await validator.validateTableChecksum(
        'financial_reports',
        expectedChecksum,
        mockToken
      );

      // THEN: Should validate successfully
      expect(result.valid).toBe(true);
      expect(result.checksum).toBe(expectedChecksum);
    });

    it('should detect data corruption via checksum mismatch', async () => {
      // GIVEN: Corrupted data
      const mockData = [{ _id: '1', ReportID: 'R001', Type: 'Annual' }];
      const expectedChecksum = 'expected-checksum-value';

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.queryTable.mockResolvedValue(mockData);

      // WHEN: Validating checksums
      const result = await validator.validateTableChecksum(
        'financial_reports',
        expectedChecksum,
        mockToken
      );

      // THEN: Should detect corruption
      expect(result.valid).toBe(false);
      expect(result.corruption).toBe(true);
      expect(result.expectedChecksum).toBe(expectedChecksum);
      expect(result.actualChecksum).not.toBe(expectedChecksum);
    });

    it('should calculate SHA256 checksums for data', () => {
      // GIVEN: Data to checksum
      const data = [
        { _id: '1', value: 'test' },
        { _id: '2', value: 'data' }
      ];

      // WHEN: Calculating checksum
      const checksum1 = validator.calculateChecksum(data);
      const checksum2 = validator.calculateChecksum(data);

      // THEN: Should be consistent
      expect(checksum1).toBe(checksum2);
      expect(checksum1).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex format
    });
  });

  describe('Record Count Validation', () => {
    it('should validate record counts match between systems', async () => {
      // GIVEN: Matching record counts
      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.countRows.mockResolvedValue(100);

      const mockModel = {
        countDocuments: jest.fn().mockResolvedValue(100)
      };
      mongoose.model = jest.fn().mockReturnValue(mockModel);

      // WHEN: Validating counts
      const result = await validator.validateRecordCount(
        'financial_reports',
        mockToken
      );

      // THEN: Counts should match
      expect(result.valid).toBe(true);
      expect(result.zerodbCount).toBe(100);
      expect(result.mongodbCount).toBe(100);
    });

    it('should detect missing records', async () => {
      // GIVEN: Mismatched record counts
      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.countRows.mockResolvedValue(95); // Missing 5 records

      const mockModel = {
        countDocuments: jest.fn().mockResolvedValue(100)
      };
      mongoose.model = jest.fn().mockReturnValue(mockModel);

      // WHEN: Validating counts
      const result = await validator.validateRecordCount(
        'financial_reports',
        mockToken
      );

      // THEN: Should detect mismatch
      expect(result.valid).toBe(false);
      expect(result.missingRecords).toBe(5);
      expect(result.discrepancy).toBe('zerodb_missing_records');
    });
  });

  describe('Field-Level Validation', () => {
    it('should validate all required fields are present', async () => {
      // GIVEN: Data with all required fields
      const mockData = [
        {
          _id: '1',
          ReportID: 'R001',
          Type: 'Annual',
          TotalRevenue: 1000000,
          TotalExpenses: 800000,
          NetIncome: 200000,
          Timestamp: new Date().toISOString()
        }
      ];

      const requiredFields = [
        'ReportID',
        'Type',
        'TotalRevenue',
        'TotalExpenses',
        'NetIncome',
        'Timestamp'
      ];

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.queryTable.mockResolvedValue(mockData);

      // WHEN: Validating fields
      const result = await validator.validateRequiredFields(
        'financial_reports',
        requiredFields,
        mockToken
      );

      // THEN: Should validate successfully
      expect(result.valid).toBe(true);
      expect(result.missingFields).toEqual([]);
    });

    it('should detect missing required fields', async () => {
      // GIVEN: Data missing required fields
      const mockData = [
        {
          _id: '1',
          ReportID: 'R001'
          // Missing Type, TotalRevenue, etc.
        }
      ];

      const requiredFields = ['ReportID', 'Type', 'TotalRevenue'];

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.queryTable.mockResolvedValue(mockData);

      // WHEN: Validating fields
      const result = await validator.validateRequiredFields(
        'financial_reports',
        requiredFields,
        mockToken
      );

      // THEN: Should detect missing fields
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('Type');
      expect(result.missingFields).toContain('TotalRevenue');
    });

    it('should validate field data types', async () => {
      // GIVEN: Data with correct types
      const mockData = [
        {
          _id: '1',
          ReportID: 'R001',
          TotalRevenue: 1000000, // number
          Type: 'Annual', // string
          Timestamp: new Date().toISOString() // date string
        }
      ];

      const fieldTypes = {
        ReportID: 'string',
        TotalRevenue: 'number',
        Type: 'string',
        Timestamp: 'string'
      };

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.queryTable.mockResolvedValue(mockData);

      // WHEN: Validating types
      const result = await validator.validateFieldTypes(
        'financial_reports',
        fieldTypes,
        mockToken
      );

      // THEN: Should validate successfully
      expect(result.valid).toBe(true);
      expect(result.typeErrors).toEqual([]);
    });

    it('should detect type mismatches', async () => {
      // GIVEN: Data with wrong types
      const mockData = [
        {
          _id: '1',
          ReportID: 123, // Should be string
          TotalRevenue: '1000000' // Should be number
        }
      ];

      const fieldTypes = {
        ReportID: 'string',
        TotalRevenue: 'number'
      };

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.queryTable.mockResolvedValue(mockData);

      // WHEN: Validating types
      const result = await validator.validateFieldTypes(
        'financial_reports',
        fieldTypes,
        mockToken
      );

      // THEN: Should detect type errors
      expect(result.valid).toBe(false);
      expect(result.typeErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Referential Integrity', () => {
    it('should validate foreign key relationships', async () => {
      // GIVEN: Data with valid references
      const mockReports = [
        { _id: '1', ReportID: 'R001', CompanyID: 'C001' }
      ];
      const mockCompanies = [{ _id: 'C001', CompanyName: 'Test Corp' }];

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.queryTable
        .mockResolvedValueOnce(mockReports)
        .mockResolvedValueOnce(mockCompanies);

      // WHEN: Validating relationships
      const result = await validator.validateForeignKeys(
        'financial_reports',
        'CompanyID',
        'companies',
        '_id',
        mockToken
      );

      // THEN: Should validate successfully
      expect(result.valid).toBe(true);
      expect(result.orphanedRecords).toEqual([]);
    });

    it('should detect orphaned records', async () => {
      // GIVEN: Data with invalid references
      const mockReports = [
        { _id: '1', ReportID: 'R001', CompanyID: 'C001' },
        { _id: '2', ReportID: 'R002', CompanyID: 'C999' } // Invalid reference
      ];
      const mockCompanies = [{ _id: 'C001', CompanyName: 'Test Corp' }];

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.queryTable
        .mockResolvedValueOnce(mockReports)
        .mockResolvedValueOnce(mockCompanies);

      // WHEN: Validating relationships
      const result = await validator.validateForeignKeys(
        'financial_reports',
        'CompanyID',
        'companies',
        '_id',
        mockToken
      );

      // THEN: Should detect orphaned records
      expect(result.valid).toBe(false);
      expect(result.orphanedRecords).toContain('2');
    });
  });

  describe('Business Logic Validation', () => {
    it('should validate financial calculations', async () => {
      // GIVEN: Financially valid data
      const mockData = [
        {
          _id: '1',
          TotalRevenue: 1000000,
          TotalExpenses: 800000,
          NetIncome: 200000 // Correct: 1000000 - 800000
        }
      ];

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.queryTable.mockResolvedValue(mockData);

      // WHEN: Validating business logic
      const result = await validator.validateFinancialLogic(
        'financial_reports',
        mockToken
      );

      // THEN: Should validate successfully
      expect(result.valid).toBe(true);
      expect(result.calculationErrors).toEqual([]);
    });

    it('should detect calculation errors', async () => {
      // GIVEN: Incorrect calculations
      const mockData = [
        {
          _id: '1',
          TotalRevenue: 1000000,
          TotalExpenses: 800000,
          NetIncome: 300000 // Wrong: Should be 200000
        }
      ];

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.queryTable.mockResolvedValue(mockData);

      // WHEN: Validating business logic
      const result = await validator.validateFinancialLogic(
        'financial_reports',
        mockToken
      );

      // THEN: Should detect errors
      expect(result.valid).toBe(false);
      expect(result.calculationErrors.length).toBeGreaterThan(0);
      expect(result.calculationErrors[0].recordId).toBe('1');
    });

    it('should validate date ranges and sequences', async () => {
      // GIVEN: Data with valid date sequence
      const mockData = [
        {
          _id: '1',
          CreatedAt: '2026-01-01T00:00:00Z',
          UpdatedAt: '2026-01-02T00:00:00Z' // After CreatedAt
        }
      ];

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.queryTable.mockResolvedValue(mockData);

      // WHEN: Validating dates
      const result = await validator.validateDateSequence(
        'financial_reports',
        'CreatedAt',
        'UpdatedAt',
        mockToken
      );

      // THEN: Should validate successfully
      expect(result.valid).toBe(true);
      expect(result.dateSequenceErrors).toEqual([]);
    });

    it('should detect invalid date sequences', async () => {
      // GIVEN: Data with invalid date sequence
      const mockData = [
        {
          _id: '1',
          CreatedAt: '2026-01-02T00:00:00Z',
          UpdatedAt: '2026-01-01T00:00:00Z' // Before CreatedAt - invalid
        }
      ];

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.queryTable.mockResolvedValue(mockData);

      // WHEN: Validating dates
      const result = await validator.validateDateSequence(
        'financial_reports',
        'CreatedAt',
        'UpdatedAt',
        mockToken
      );

      // THEN: Should detect invalid sequence
      expect(result.valid).toBe(false);
      expect(result.dateSequenceErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Cross-System Consistency', () => {
    it('should compare data between ZeroDB and MongoDB', async () => {
      // GIVEN: Matching data in both systems
      const mockData = [
        { _id: '1', ReportID: 'R001', Type: 'Annual' },
        { _id: '2', ReportID: 'R002', Type: 'Quarterly' }
      ];

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.queryTable.mockResolvedValue(mockData);

      const mockModel = {
        find: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockData)
          })
        })
      };
      mongoose.model = jest.fn().mockReturnValue(mockModel);

      // WHEN: Validating cross-system consistency
      const result = await validator.validateCrossSystemConsistency(
        'financial_reports',
        mockToken
      );

      // THEN: Should be consistent
      expect(result.consistent).toBe(true);
      expect(result.discrepancies).toEqual([]);
    });

    it('should detect data divergence between systems', async () => {
      // GIVEN: Different data in systems
      const zerodbData = [
        { _id: '1', ReportID: 'R001', Type: 'Annual' },
        { _id: '2', ReportID: 'R002', Type: 'Quarterly' }
      ];

      const mongodbData = [
        { _id: '1', ReportID: 'R001', Type: 'Annual' },
        { _id: '2', ReportID: 'R002', Type: 'Monthly' } // Different Type
      ];

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.queryTable.mockResolvedValue(zerodbData);

      const mockModel = {
        find: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mongodbData)
          })
        })
      };
      mongoose.model = jest.fn().mockReturnValue(mockModel);

      // WHEN: Validating cross-system consistency
      const result = await validator.validateCrossSystemConsistency(
        'financial_reports',
        mockToken
      );

      // THEN: Should detect divergence
      expect(result.consistent).toBe(false);
      expect(result.discrepancies.length).toBeGreaterThan(0);
      expect(result.discrepancies[0].type).toBe('field_mismatch');
    });
  });

  describe('Comprehensive Validation Reports', () => {
    it('should generate detailed validation report', async () => {
      // GIVEN: Multiple validation checks
      const mockData = [
        {
          _id: '1',
          ReportID: 'R001',
          Type: 'Annual',
          TotalRevenue: 1000000,
          TotalExpenses: 800000,
          NetIncome: 200000
        }
      ];

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.queryTable.mockResolvedValue(mockData);
      zerodbService.countRows.mockResolvedValue(1);

      const mockModel = {
        countDocuments: jest.fn().mockResolvedValue(1),
        find: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockData)
          })
        })
      };
      mongoose.model = jest.fn().mockReturnValue(mockModel);

      // WHEN: Running comprehensive validation
      const result = await validator.runComprehensiveValidation(
        'financial_reports',
        mockToken,
        {
          validateChecksums: true,
          validateCounts: true,
          validateTypes: true,
          validateBusinessLogic: true
        }
      );

      // THEN: Should provide detailed report
      expect(result.summary).toBeDefined();
      expect(result.summary.totalChecks).toBeGreaterThan(0);
      expect(result.summary.passed).toBeDefined();
      expect(result.summary.failed).toBeDefined();
      expect(result.checks).toBeDefined();
      expect(result.overallValid).toBe(true);
    });

    it('should prioritize validation issues by severity', async () => {
      // GIVEN: Multiple validation failures
      const validationResults = {
        checksumValidation: { valid: false, severity: 'critical' },
        countValidation: { valid: false, severity: 'high' },
        typeValidation: { valid: false, severity: 'medium' }
      };

      // WHEN: Prioritizing issues
      const prioritized = validator.prioritizeValidationIssues(validationResults);

      // THEN: Should order by severity
      expect(prioritized[0].severity).toBe('critical');
      expect(prioritized[1].severity).toBe('high');
      expect(prioritized[2].severity).toBe('medium');
    });

    it('should provide remediation recommendations', () => {
      // GIVEN: Validation failures
      const issues = [
        {
          type: 'checksum_mismatch',
          severity: 'critical',
          details: 'Data corruption detected'
        },
        {
          type: 'missing_records',
          severity: 'high',
          details: '5 records missing in ZeroDB'
        }
      ];

      // WHEN: Getting recommendations
      const recommendations = validator.getRemediationRecommendations(issues);

      // THEN: Should provide actionable steps
      expect(recommendations.length).toBe(2);
      expect(recommendations[0].action).toBeDefined();
      expect(recommendations[0].steps).toBeDefined();
      expect(recommendations[0].urgency).toBe('immediate');
    });
  });
});

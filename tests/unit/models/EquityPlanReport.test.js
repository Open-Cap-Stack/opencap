/**
 * EquityPlanReport Model Unit Tests
 * Issue #110: Implement Equity Plan Reports
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

const mongoose = require('mongoose');

// Mock mongoose to avoid database connection
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    connect: jest.fn().mockResolvedValue({}),
    connection: {
      readyState: 1,
      on: jest.fn(),
      once: jest.fn()
    }
  };
});

describe('EquityPlanReport Model', () => {
  let EquityPlanReport;

  beforeAll(() => {
    // Clear module cache to ensure fresh model load
    jest.resetModules();
    EquityPlanReport = require('../../../models/EquityPlanReport');
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  describe('Schema Definition', () => {
    it('should have reportId field', () => {
      const schema = EquityPlanReport.schema;
      expect(schema.path('reportId')).toBeDefined();
    });

    it('should have reportType field with valid enum values', () => {
      const schema = EquityPlanReport.schema;
      const reportTypePath = schema.path('reportType');
      expect(reportTypePath).toBeDefined();
      expect(reportTypePath.enumValues).toContain('option_pool_summary');
      expect(reportTypePath.enumValues).toContain('grant_status');
      expect(reportTypePath.enumValues).toContain('vesting_schedule');
      expect(reportTypePath.enumValues).toContain('dilution_analysis');
    });

    it('should have companyId field', () => {
      const schema = EquityPlanReport.schema;
      expect(schema.path('companyId')).toBeDefined();
    });

    it('should have date range fields (startDate, endDate)', () => {
      const schema = EquityPlanReport.schema;
      expect(schema.path('startDate')).toBeDefined();
      expect(schema.path('endDate')).toBeDefined();
    });

    it('should have generatedData field for storing report results', () => {
      const schema = EquityPlanReport.schema;
      expect(schema.path('generatedData')).toBeDefined();
    });

    it('should have format field with valid enum values', () => {
      const schema = EquityPlanReport.schema;
      const formatPath = schema.path('format');
      expect(formatPath).toBeDefined();
      expect(formatPath.enumValues).toContain('pdf');
      expect(formatPath.enumValues).toContain('excel');
      expect(formatPath.enumValues).toContain('csv');
      expect(formatPath.enumValues).toContain('json');
    });

    it('should have status field with valid enum values', () => {
      const schema = EquityPlanReport.schema;
      const statusPath = schema.path('status');
      expect(statusPath).toBeDefined();
      expect(statusPath.enumValues).toContain('pending');
      expect(statusPath.enumValues).toContain('generating');
      expect(statusPath.enumValues).toContain('completed');
      expect(statusPath.enumValues).toContain('failed');
    });

    it('should have timestamps', () => {
      const schema = EquityPlanReport.schema;
      expect(schema.options.timestamps).toBe(true);
    });

    it('should have requestedBy field', () => {
      const schema = EquityPlanReport.schema;
      expect(schema.path('requestedBy')).toBeDefined();
    });

    it('should have generatedAt field', () => {
      const schema = EquityPlanReport.schema;
      expect(schema.path('generatedAt')).toBeDefined();
    });

    it('should have errorMessage field for failed reports', () => {
      const schema = EquityPlanReport.schema;
      expect(schema.path('errorMessage')).toBeDefined();
    });

    it('should have fileUrl field for storing exported file URL', () => {
      const schema = EquityPlanReport.schema;
      expect(schema.path('fileUrl')).toBeDefined();
    });

    it('should have parameters field for report configuration', () => {
      const schema = EquityPlanReport.schema;
      expect(schema.path('parameters')).toBeDefined();
    });
  });

  describe('Default Values', () => {
    it('should have default status of pending', () => {
      const report = new EquityPlanReport({
        reportId: 'RPT-001',
        reportType: 'option_pool_summary',
        companyId: 'COMP-001'
      });
      expect(report.status).toBe('pending');
    });

    it('should have default format of json', () => {
      const report = new EquityPlanReport({
        reportId: 'RPT-001',
        reportType: 'option_pool_summary',
        companyId: 'COMP-001'
      });
      expect(report.format).toBe('json');
    });
  });

  describe('Validation', () => {
    it('should require reportId', async () => {
      const report = new EquityPlanReport({
        reportType: 'option_pool_summary',
        companyId: 'COMP-001'
      });

      let validationError;
      try {
        await report.validate();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.reportId).toBeDefined();
    });

    it('should require reportType', async () => {
      const report = new EquityPlanReport({
        reportId: 'RPT-001',
        companyId: 'COMP-001'
      });

      let validationError;
      try {
        await report.validate();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.reportType).toBeDefined();
    });

    it('should require companyId', async () => {
      const report = new EquityPlanReport({
        reportId: 'RPT-001',
        reportType: 'option_pool_summary'
      });

      let validationError;
      try {
        await report.validate();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.companyId).toBeDefined();
    });

    it('should reject invalid reportType', async () => {
      const report = new EquityPlanReport({
        reportId: 'RPT-001',
        reportType: 'invalid_type',
        companyId: 'COMP-001'
      });

      let validationError;
      try {
        await report.validate();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.reportType).toBeDefined();
    });

    it('should reject invalid status', async () => {
      const report = new EquityPlanReport({
        reportId: 'RPT-001',
        reportType: 'option_pool_summary',
        companyId: 'COMP-001',
        status: 'invalid_status'
      });

      let validationError;
      try {
        await report.validate();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.status).toBeDefined();
    });

    it('should reject invalid format', async () => {
      const report = new EquityPlanReport({
        reportId: 'RPT-001',
        reportType: 'option_pool_summary',
        companyId: 'COMP-001',
        format: 'invalid_format'
      });

      let validationError;
      try {
        await report.validate();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.format).toBeDefined();
    });

    it('should validate successfully with all required fields', async () => {
      const report = new EquityPlanReport({
        reportId: 'RPT-001',
        reportType: 'option_pool_summary',
        companyId: 'COMP-001'
      });

      let validationError;
      try {
        await report.validate();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeUndefined();
    });
  });

  describe('Instance Creation', () => {
    it('should create a valid option pool summary report', () => {
      const report = new EquityPlanReport({
        reportId: 'RPT-001',
        reportType: 'option_pool_summary',
        companyId: 'COMP-001',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        format: 'pdf',
        requestedBy: 'USER-001'
      });

      expect(report.reportId).toBe('RPT-001');
      expect(report.reportType).toBe('option_pool_summary');
      expect(report.companyId).toBe('COMP-001');
      expect(report.format).toBe('pdf');
    });

    it('should create a valid grant status report', () => {
      const report = new EquityPlanReport({
        reportId: 'RPT-002',
        reportType: 'grant_status',
        companyId: 'COMP-001',
        parameters: {
          includeTerminated: false,
          grantTypes: ['ISO', 'NSO']
        }
      });

      expect(report.reportType).toBe('grant_status');
      expect(report.parameters.grantTypes).toContain('ISO');
    });

    it('should create a valid vesting schedule report', () => {
      const report = new EquityPlanReport({
        reportId: 'RPT-003',
        reportType: 'vesting_schedule',
        companyId: 'COMP-001',
        parameters: {
          forecastMonths: 12
        }
      });

      expect(report.reportType).toBe('vesting_schedule');
    });

    it('should create a valid dilution analysis report', () => {
      const report = new EquityPlanReport({
        reportId: 'RPT-004',
        reportType: 'dilution_analysis',
        companyId: 'COMP-001',
        parameters: {
          includeOptions: true,
          includeWarrants: true
        }
      });

      expect(report.reportType).toBe('dilution_analysis');
    });
  });

  describe('Indexes', () => {
    it('should have index on reportId', () => {
      const indexes = EquityPlanReport.schema.indexes();
      const reportIdIndex = indexes.find(idx => idx[0].reportId);
      expect(reportIdIndex).toBeDefined();
    });

    it('should have index on companyId', () => {
      const indexes = EquityPlanReport.schema.indexes();
      const companyIdIndex = indexes.find(idx => idx[0].companyId);
      expect(companyIdIndex).toBeDefined();
    });

    it('should have index on status', () => {
      const indexes = EquityPlanReport.schema.indexes();
      const statusIndex = indexes.find(idx => idx[0].status);
      expect(statusIndex).toBeDefined();
    });
  });

  describe('Virtual Properties', () => {
    it('should have isReady virtual that returns true when status is completed', () => {
      const report = new EquityPlanReport({
        reportId: 'RPT-001',
        reportType: 'option_pool_summary',
        companyId: 'COMP-001',
        status: 'completed'
      });

      expect(report.isReady).toBe(true);
    });

    it('should have isReady virtual that returns false when status is not completed', () => {
      const report = new EquityPlanReport({
        reportId: 'RPT-001',
        reportType: 'option_pool_summary',
        companyId: 'COMP-001',
        status: 'pending'
      });

      expect(report.isReady).toBe(false);
    });

    it('should have hasFailed virtual that returns true when status is failed', () => {
      const report = new EquityPlanReport({
        reportId: 'RPT-001',
        reportType: 'option_pool_summary',
        companyId: 'COMP-001',
        status: 'failed'
      });

      expect(report.hasFailed).toBe(true);
    });

    it('should have hasFailed virtual that returns false when status is not failed', () => {
      const report = new EquityPlanReport({
        reportId: 'RPT-001',
        reportType: 'option_pool_summary',
        companyId: 'COMP-001',
        status: 'completed'
      });

      expect(report.hasFailed).toBe(false);
    });
  });

  describe('toJSON and toObject', () => {
    it('should include virtuals in JSON output', () => {
      const report = new EquityPlanReport({
        reportId: 'RPT-001',
        reportType: 'option_pool_summary',
        companyId: 'COMP-001',
        status: 'completed'
      });

      const json = report.toJSON();
      expect(json.isReady).toBe(true);
      expect(json.hasFailed).toBe(false);
    });

    it('should include virtuals in object output', () => {
      const report = new EquityPlanReport({
        reportId: 'RPT-001',
        reportType: 'option_pool_summary',
        companyId: 'COMP-001',
        status: 'failed'
      });

      const obj = report.toObject();
      expect(obj.isReady).toBe(false);
      expect(obj.hasFailed).toBe(true);
    });
  });
});

/**
 * EquityPlanReport Model Unit Tests
 * Issue #110: Implement Equity Plan Reports
 * Rewritten for ZeroDB model compatibility
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock zerodbService to prevent real API calls
jest.mock('../../../services/zerodbService', () => ({
  initialize: jest.fn(),
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  projectId: 'test-project'
}));

describe('EquityPlanReport Model', () => {
  let EquityPlanReport;

  beforeAll(() => {
    jest.resetModules();
    EquityPlanReport = require('../../../models/EquityPlanReport');
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  describe('Schema Definition', () => {
    it('should have reportId field', () => {
      expect(EquityPlanReport.schema.reportId).toBeDefined();
    });

    it('should have reportType field with valid enum values', () => {
      const reportTypeField = EquityPlanReport.schema.reportType;
      expect(reportTypeField).toBeDefined();
      expect(reportTypeField.enum).toContain('option_pool_summary');
      expect(reportTypeField.enum).toContain('grant_status');
      expect(reportTypeField.enum).toContain('vesting_schedule');
      expect(reportTypeField.enum).toContain('dilution_analysis');
    });

    it('should have companyId field', () => {
      expect(EquityPlanReport.schema.companyId).toBeDefined();
    });

    it('should have date range fields (startDate, endDate)', () => {
      expect(EquityPlanReport.schema.startDate).toBeDefined();
      expect(EquityPlanReport.schema.endDate).toBeDefined();
    });

    it('should have generatedData field for storing report results', () => {
      expect(EquityPlanReport.schema.generatedData).toBeDefined();
    });

    it('should have format field with valid enum values', () => {
      const formatField = EquityPlanReport.schema.format;
      expect(formatField).toBeDefined();
      expect(formatField.enum).toContain('pdf');
      expect(formatField.enum).toContain('excel');
      expect(formatField.enum).toContain('csv');
      expect(formatField.enum).toContain('json');
    });

    it('should have status field with valid enum values', () => {
      const statusField = EquityPlanReport.schema.status;
      expect(statusField).toBeDefined();
      expect(statusField.enum).toContain('pending');
      expect(statusField.enum).toContain('generating');
      expect(statusField.enum).toContain('completed');
      expect(statusField.enum).toContain('failed');
    });

    it('should have timestamps (createdAt and updatedAt)', () => {
      expect(EquityPlanReport.schema.createdAt).toBeDefined();
      expect(EquityPlanReport.schema.updatedAt).toBeDefined();
    });

    it('should have requestedBy field', () => {
      expect(EquityPlanReport.schema.requestedBy).toBeDefined();
    });

    it('should have generatedAt field', () => {
      expect(EquityPlanReport.schema.generatedAt).toBeDefined();
    });

    it('should have errorMessage field for failed reports', () => {
      expect(EquityPlanReport.schema.errorMessage).toBeDefined();
    });

    it('should have fileUrl field for storing exported file URL', () => {
      expect(EquityPlanReport.schema.fileUrl).toBeDefined();
    });

    it('should have parameters field for report configuration', () => {
      expect(EquityPlanReport.schema.parameters).toBeDefined();
    });
  });

  describe('Field Properties', () => {
    it('should require reportId', () => {
      expect(EquityPlanReport.schema.reportId.required).toBe(true);
    });

    it('should require reportType', () => {
      expect(EquityPlanReport.schema.reportType.required).toBe(true);
    });

    it('should require companyId', () => {
      expect(EquityPlanReport.schema.companyId.required).toBe(true);
    });

    it('should have reportId marked as unique', () => {
      expect(EquityPlanReport.schema.reportId.unique).toBe(true);
    });
  });

  describe('Default Values', () => {
    it('should have default status of pending', () => {
      expect(EquityPlanReport.schema.status.default).toBe('pending');
    });

    it('should have default format of json', () => {
      expect(EquityPlanReport.schema.format.default).toBe('json');
    });
  });

  describe('Enum Validation', () => {
    it('should only allow valid reportType values', () => {
      const validTypes = ['option_pool_summary', 'grant_status', 'vesting_schedule', 'dilution_analysis'];
      expect(EquityPlanReport.schema.reportType.enum).toEqual(validTypes);
    });

    it('should only allow valid status values', () => {
      const validStatuses = ['pending', 'generating', 'completed', 'failed'];
      expect(EquityPlanReport.schema.status.enum).toEqual(validStatuses);
    });

    it('should only allow valid format values', () => {
      const validFormats = ['pdf', 'excel', 'csv', 'json'];
      expect(EquityPlanReport.schema.format.enum).toEqual(validFormats);
    });

    it('should not include invalid reportType values', () => {
      expect(EquityPlanReport.schema.reportType.enum).not.toContain('invalid_type');
    });

    it('should not include invalid status values', () => {
      expect(EquityPlanReport.schema.status.enum).not.toContain('invalid_status');
    });

    it('should not include invalid format values', () => {
      expect(EquityPlanReport.schema.format.enum).not.toContain('invalid_format');
    });
  });

  describe('Business Logic - isReady', () => {
    it('should return true when status is completed', () => {
      const report = { status: 'completed' };
      expect(EquityPlanReport.isReady(report)).toBe(true);
    });

    it('should return false when status is not completed', () => {
      const report = { status: 'pending' };
      expect(EquityPlanReport.isReady(report)).toBe(false);
    });

    it('should return false when status is generating', () => {
      const report = { status: 'generating' };
      expect(EquityPlanReport.isReady(report)).toBe(false);
    });

    it('should return false when status is failed', () => {
      const report = { status: 'failed' };
      expect(EquityPlanReport.isReady(report)).toBe(false);
    });
  });

  describe('Business Logic - hasFailed', () => {
    it('should return true when status is failed', () => {
      const report = { status: 'failed' };
      expect(EquityPlanReport.hasFailed(report)).toBe(true);
    });

    it('should return false when status is not failed', () => {
      const report = { status: 'completed' };
      expect(EquityPlanReport.hasFailed(report)).toBe(false);
    });

    it('should return false when status is pending', () => {
      const report = { status: 'pending' };
      expect(EquityPlanReport.hasFailed(report)).toBe(false);
    });
  });

  describe('Exported Constants', () => {
    it('should export REPORT_TYPES', () => {
      expect(EquityPlanReport.REPORT_TYPES).toBeDefined();
      expect(EquityPlanReport.REPORT_TYPES).toContain('option_pool_summary');
      expect(EquityPlanReport.REPORT_TYPES).toContain('grant_status');
      expect(EquityPlanReport.REPORT_TYPES).toContain('vesting_schedule');
      expect(EquityPlanReport.REPORT_TYPES).toContain('dilution_analysis');
    });

    it('should export REPORT_FORMATS', () => {
      expect(EquityPlanReport.REPORT_FORMATS).toBeDefined();
      expect(EquityPlanReport.REPORT_FORMATS).toContain('pdf');
      expect(EquityPlanReport.REPORT_FORMATS).toContain('excel');
      expect(EquityPlanReport.REPORT_FORMATS).toContain('csv');
      expect(EquityPlanReport.REPORT_FORMATS).toContain('json');
    });

    it('should export VALID_STATUSES', () => {
      expect(EquityPlanReport.VALID_STATUSES).toBeDefined();
      expect(EquityPlanReport.VALID_STATUSES).toContain('pending');
      expect(EquityPlanReport.VALID_STATUSES).toContain('generating');
      expect(EquityPlanReport.VALID_STATUSES).toContain('completed');
      expect(EquityPlanReport.VALID_STATUSES).toContain('failed');
    });
  });

  describe('Model Methods', () => {
    it('should have create method', () => {
      expect(typeof EquityPlanReport.create).toBe('function');
    });

    it('should have find method', () => {
      expect(typeof EquityPlanReport.find).toBe('function');
    });

    it('should have findOne method', () => {
      expect(typeof EquityPlanReport.findOne).toBe('function');
    });

    it('should have findById method', () => {
      expect(typeof EquityPlanReport.findById).toBe('function');
    });

    it('should have findByReportId method', () => {
      expect(typeof EquityPlanReport.findByReportId).toBe('function');
    });

    it('should have findByCompany method', () => {
      expect(typeof EquityPlanReport.findByCompany).toBe('function');
    });

    it('should have isReady method', () => {
      expect(typeof EquityPlanReport.isReady).toBe('function');
    });

    it('should have hasFailed method', () => {
      expect(typeof EquityPlanReport.hasFailed).toBe('function');
    });

    it('should have startGenerating method', () => {
      expect(typeof EquityPlanReport.startGenerating).toBe('function');
    });

    it('should have complete method', () => {
      expect(typeof EquityPlanReport.complete).toBe('function');
    });

    it('should have fail method', () => {
      expect(typeof EquityPlanReport.fail).toBe('function');
    });
  });
});

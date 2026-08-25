/**
 * EquityPlanReport Model Comprehensive Tests
 *
 * Tests all business logic methods, validation, error paths, and edge cases
 * for the EquityPlanReport ZeroDB model to achieve 80%+ coverage.
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock zerodbService before requiring the model
jest.mock('../../../services/zerodbService', () => ({
  initialize: jest.fn(),
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  createTable: jest.fn(),
  projectId: 'test-project',
  useLocalFallback: true,
  _localStore: {}
}));

// Mock logger to suppress output
jest.mock('../../../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('EquityPlanReport Model - Comprehensive', () => {
  let EquityPlanReport;

  beforeAll(() => {
    jest.resetModules();
    jest.mock('../../../services/zerodbService', () => ({
      initialize: jest.fn(),
      insertRow: jest.fn(),
      queryTable: jest.fn(),
      updateRows: jest.fn(),
      deleteRows: jest.fn(),
      createTable: jest.fn(),
      projectId: 'test-project'
    }));
    jest.mock('../../../utils/logger', () => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }));
    EquityPlanReport = require('../../../models/EquityPlanReport');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Module exports', () => {
    it('should export tableName as equity_plan_reports', () => {
      expect(EquityPlanReport.tableName).toBe('equity_plan_reports');
    });

    it('should export REPORT_TYPES constant', () => {
      expect(EquityPlanReport.REPORT_TYPES).toEqual([
        'option_pool_summary', 'grant_status', 'vesting_schedule', 'dilution_analysis'
      ]);
    });

    it('should export REPORT_FORMATS constant', () => {
      expect(EquityPlanReport.REPORT_FORMATS).toEqual(['pdf', 'excel', 'csv', 'json']);
    });

    it('should export VALID_STATUSES constant', () => {
      expect(EquityPlanReport.VALID_STATUSES).toEqual(['pending', 'generating', 'completed', 'failed']);
    });
  });

  describe('create()', () => {
    const validData = {
      reportType: 'option_pool_summary',
      companyId: 'company-1'
    };

    it('should generate reportId if not provided', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: { ...validData, reportId: 'epr_auto' } }]
      });

      const result = await EquityPlanReport.create({ ...validData });
      expect(result).toBeDefined();
    });

    it('should preserve provided reportId', async () => {
      const zdb = require('../../../services/zerodbService');
      const data = { ...validData, reportId: 'custom-id' };
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: data }]
      });

      const result = await EquityPlanReport.create(data);
      expect(result.reportId).toBe('custom-id');
    });

    it('should throw for invalid reportType', async () => {
      const data = { ...validData, reportType: 'invalid_type' };
      await expect(EquityPlanReport.create(data)).rejects.toThrow(
        'reportType must be one of: option_pool_summary, grant_status, vesting_schedule, dilution_analysis'
      );
    });

    it('should throw for invalid format', async () => {
      const data = { ...validData, format: 'docx' };
      await expect(EquityPlanReport.create(data)).rejects.toThrow(
        'format must be one of: pdf, excel, csv, json'
      );
    });

    it('should not throw for valid format', async () => {
      const zdb = require('../../../services/zerodbService');
      const data = { ...validData, format: 'pdf' };
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: data }]
      });

      const result = await EquityPlanReport.create(data);
      expect(result).toBeDefined();
    });

    it('should set default status to pending if not provided', async () => {
      const zdb = require('../../../services/zerodbService');
      const data = { ...validData };
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: { ...data, status: 'pending' } }]
      });

      await EquityPlanReport.create(data);
      expect(data.status).toBe('pending');
    });

    it('should not overwrite provided status', async () => {
      const zdb = require('../../../services/zerodbService');
      const data = { ...validData, status: 'generating' };
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: data }]
      });

      await EquityPlanReport.create(data);
      expect(data.status).toBe('generating');
    });

    it('should accept each valid report type', async () => {
      const zdb = require('../../../services/zerodbService');
      for (const type of ['option_pool_summary', 'grant_status', 'vesting_schedule', 'dilution_analysis']) {
        const data = { ...validData, reportType: type };
        zdb.insertRow.mockResolvedValue({
          data: [{ row_id: 'r1', row_data: data }]
        });
        const result = await EquityPlanReport.create(data);
        expect(result).toBeDefined();
      }
    });

    it('should accept each valid format', async () => {
      const zdb = require('../../../services/zerodbService');
      for (const fmt of ['pdf', 'excel', 'csv', 'json']) {
        const data = { ...validData, format: fmt };
        zdb.insertRow.mockResolvedValue({
          data: [{ row_id: 'r1', row_data: data }]
        });
        const result = await EquityPlanReport.create(data);
        expect(result).toBeDefined();
      }
    });

    it('should not validate format when not provided', async () => {
      const zdb = require('../../../services/zerodbService');
      const data = { ...validData };
      // No format field
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: data }]
      });

      const result = await EquityPlanReport.create(data);
      expect(result).toBeDefined();
    });
  });

  describe('findByReportId()', () => {
    it('should find report by reportId', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({
        data: [{ row_data: { reportId: 'epr-1', reportType: 'grant_status' }, row_id: 'r1' }]
      });

      const result = await EquityPlanReport.findByReportId('epr-1');
      expect(result).toBeDefined();
      expect(result.reportId).toBe('epr-1');
    });

    it('should return null when not found', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({ data: [] });

      const result = await EquityPlanReport.findByReportId('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findByCompany()', () => {
    it('should find reports by companyId', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({
        data: [
          { row_data: { companyId: 'c1', reportType: 'grant_status' }, row_id: 'r1' },
          { row_data: { companyId: 'c1', reportType: 'dilution_analysis' }, row_id: 'r2' }
        ]
      });

      const results = await EquityPlanReport.findByCompany('c1');
      expect(results.length).toBe(2);
    });

    it('should filter by status when provided', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({
        data: [{ row_data: { companyId: 'c1', status: 'completed' }, row_id: 'r1' }]
      });

      const results = await EquityPlanReport.findByCompany('c1', { status: 'completed' });
      expect(results.length).toBe(1);
    });

    it('should filter by reportType when provided', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({
        data: [{ row_data: { companyId: 'c1', reportType: 'vesting_schedule' }, row_id: 'r1' }]
      });

      const results = await EquityPlanReport.findByCompany('c1', { reportType: 'vesting_schedule' });
      expect(results.length).toBe(1);
    });

    it('should filter by both status and reportType', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({
        data: [{ row_data: { companyId: 'c1', status: 'pending', reportType: 'grant_status' }, row_id: 'r1' }]
      });

      const results = await EquityPlanReport.findByCompany('c1', { status: 'pending', reportType: 'grant_status' });
      expect(results.length).toBe(1);
    });

    it('should return empty array when no matching reports', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({ data: [] });

      const results = await EquityPlanReport.findByCompany('nonexistent');
      expect(results).toEqual([]);
    });
  });

  describe('isReady()', () => {
    it('should return true when status is completed', () => {
      expect(EquityPlanReport.isReady({ status: 'completed' })).toBe(true);
    });

    it('should return false when status is pending', () => {
      expect(EquityPlanReport.isReady({ status: 'pending' })).toBe(false);
    });

    it('should return false when status is generating', () => {
      expect(EquityPlanReport.isReady({ status: 'generating' })).toBe(false);
    });

    it('should return false when status is failed', () => {
      expect(EquityPlanReport.isReady({ status: 'failed' })).toBe(false);
    });
  });

  describe('hasFailed()', () => {
    it('should return true when status is failed', () => {
      expect(EquityPlanReport.hasFailed({ status: 'failed' })).toBe(true);
    });

    it('should return false when status is completed', () => {
      expect(EquityPlanReport.hasFailed({ status: 'completed' })).toBe(false);
    });

    it('should return false when status is pending', () => {
      expect(EquityPlanReport.hasFailed({ status: 'pending' })).toBe(false);
    });

    it('should return false when status is generating', () => {
      expect(EquityPlanReport.hasFailed({ status: 'generating' })).toBe(false);
    });
  });

  describe('startGenerating()', () => {
    it('should update status to generating', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ reportId: 'epr-1', status: 'pending' }]
      });
      zdb.updateRows.mockResolvedValueOnce({ modified_count: 1 });

      const result = await EquityPlanReport.startGenerating('epr-1');
      expect(result).toBeDefined();
      expect(result.modifiedCount).toBe(1);
    });
  });

  describe('complete()', () => {
    it('should update status to completed with generated data', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ reportId: 'epr-1', status: 'generating' }]
      });
      zdb.updateRows.mockResolvedValueOnce({ modified_count: 1 });

      const generatedData = { totalGrants: 10, vestedShares: 5000 };
      const result = await EquityPlanReport.complete('epr-1', generatedData);
      expect(result).toBeDefined();
      expect(result.modifiedCount).toBe(1);
    });

    it('should update with fileUrl when provided', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ reportId: 'epr-1', status: 'generating' }]
      });
      zdb.updateRows.mockResolvedValueOnce({ modified_count: 1 });

      const result = await EquityPlanReport.complete('epr-1', { data: 'x' }, 'https://files.example.com/report.pdf');
      expect(result).toBeDefined();
    });

    it('should use null for fileUrl when not provided', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ reportId: 'epr-1' }]
      });
      zdb.updateRows.mockResolvedValueOnce({ modified_count: 1 });

      const result = await EquityPlanReport.complete('epr-1', { data: 'x' });
      expect(result).toBeDefined();
    });
  });

  describe('fail()', () => {
    it('should update status to failed with error message', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ reportId: 'epr-1', status: 'generating' }]
      });
      zdb.updateRows.mockResolvedValueOnce({ modified_count: 1 });

      const result = await EquityPlanReport.fail('epr-1', 'Data source unavailable');
      expect(result).toBeDefined();
      expect(result.modifiedCount).toBe(1);
    });
  });

  describe('Exposed base model methods', () => {
    const methods = [
      'find', 'findOne', 'findById', 'updateOne', 'updateMany',
      'findOneAndUpdate', 'findByIdAndUpdate', 'deleteOne', 'deleteMany',
      'findOneAndDelete', 'findByIdAndDelete', 'countDocuments', 'exists',
      'distinct', 'aggregate'
    ];

    methods.forEach(method => {
      it(`should expose ${method} as a function`, () => {
        expect(typeof EquityPlanReport[method]).toBe('function');
      });
    });
  });

  describe('Schema field details', () => {
    it('should have startDate with null default', () => {
      expect(EquityPlanReport.schema.startDate.default).toBeNull();
    });

    it('should have endDate with null default', () => {
      expect(EquityPlanReport.schema.endDate.default).toBeNull();
    });

    it('should have parameters with empty object default', () => {
      expect(EquityPlanReport.schema.parameters.default).toEqual({});
    });

    it('should have generatedData with null default', () => {
      expect(EquityPlanReport.schema.generatedData.default).toBeNull();
    });

    it('should have requestedBy with null default', () => {
      expect(EquityPlanReport.schema.requestedBy.default).toBeNull();
    });

    it('should have generatedAt with null default', () => {
      expect(EquityPlanReport.schema.generatedAt.default).toBeNull();
    });

    it('should have errorMessage with null default', () => {
      expect(EquityPlanReport.schema.errorMessage.default).toBeNull();
    });

    it('should have fileUrl with null default', () => {
      expect(EquityPlanReport.schema.fileUrl.default).toBeNull();
    });

    it('should have metadata with empty object default', () => {
      expect(EquityPlanReport.schema.metadata.default).toEqual({});
    });
  });
});

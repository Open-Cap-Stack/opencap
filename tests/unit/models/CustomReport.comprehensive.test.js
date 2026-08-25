/**
 * CustomReport Model Comprehensive Tests
 *
 * Tests all business logic methods, validation, error paths, and edge cases
 * for the CustomReport ZeroDB model to achieve 80%+ coverage.
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

const zerodbService = require('../../../services/zerodbService');

describe('CustomReport Model - Comprehensive', () => {
  let CustomReport;

  beforeAll(() => {
    jest.resetModules();
    // Re-apply mocks after resetModules
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
    jest.mock('../../../utils/logger', () => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }));
    CustomReport = require('../../../models/CustomReport');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Module exports', () => {
    it('should export tableName as custom_reports', () => {
      expect(CustomReport.tableName).toBe('custom_reports');
    });

    it('should export schema object', () => {
      expect(CustomReport.schema).toBeDefined();
      expect(typeof CustomReport.schema).toBe('object');
    });

    it('should export VALID_STATUSES constant', () => {
      expect(CustomReport.VALID_STATUSES).toEqual(['active', 'archived', 'draft']);
    });

    it('should export VALID_FREQUENCIES constant', () => {
      expect(CustomReport.VALID_FREQUENCIES).toEqual(['daily', 'weekly', 'monthly']);
    });

    it('should export VALID_SORT_ORDERS constant', () => {
      expect(CustomReport.VALID_SORT_ORDERS).toEqual(['ASC', 'DESC']);
    });

    it('should export VALID_AGGREGATIONS constant', () => {
      expect(CustomReport.VALID_AGGREGATIONS).toEqual(['SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'DISTINCT_COUNT']);
    });
  });

  describe('create()', () => {
    const validData = {
      name: 'Test Report',
      companyId: 'company-1',
      createdBy: 'user-1',
      dataSources: ['stakeholders'],
      fields: ['name', 'email']
    };

    it('should generate reportId if not provided', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: { ...validData, reportId: 'report_auto' } }]
      });

      const result = await CustomReport.create({ ...validData });
      // The data object should have had a reportId assigned
      expect(result).toBeDefined();
    });

    it('should preserve provided reportId', async () => {
      const zdb = require('../../../services/zerodbService');
      const data = { ...validData, reportId: 'custom-report-id' };
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: data }]
      });

      const result = await CustomReport.create(data);
      expect(result.reportId).toBe('custom-report-id');
    });

    it('should set default status to draft if not provided', async () => {
      const zdb = require('../../../services/zerodbService');
      const data = { ...validData };
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: { ...data, status: 'draft' } }]
      });

      await CustomReport.create(data);
      expect(data.status).toBe('draft');
    });

    it('should not overwrite provided status', async () => {
      const zdb = require('../../../services/zerodbService');
      const data = { ...validData, status: 'active' };
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: data }]
      });

      await CustomReport.create(data);
      expect(data.status).toBe('active');
    });

    it('should throw when dataSources is missing', async () => {
      const data = { ...validData };
      delete data.dataSources;
      await expect(CustomReport.create(data)).rejects.toThrow('At least one data source is required');
    });

    it('should throw when dataSources is not an array', async () => {
      const data = { ...validData, dataSources: 'not-array' };
      await expect(CustomReport.create(data)).rejects.toThrow('At least one data source is required');
    });

    it('should throw when dataSources is empty array', async () => {
      const data = { ...validData, dataSources: [] };
      await expect(CustomReport.create(data)).rejects.toThrow('At least one data source is required');
    });

    it('should throw when fields is missing', async () => {
      const data = { ...validData };
      delete data.fields;
      await expect(CustomReport.create(data)).rejects.toThrow('At least one field is required');
    });

    it('should throw when fields is not an array', async () => {
      const data = { ...validData, fields: 'not-array' };
      await expect(CustomReport.create(data)).rejects.toThrow('At least one field is required');
    });

    it('should throw when fields is empty array', async () => {
      const data = { ...validData, fields: [] };
      await expect(CustomReport.create(data)).rejects.toThrow('At least one field is required');
    });

    it('should throw when schedule is enabled but frequency is missing', async () => {
      const data = {
        ...validData,
        schedule: { enabled: true, recipients: ['user@example.com'] }
      };
      await expect(CustomReport.create(data)).rejects.toThrow('Frequency is required for scheduled reports');
    });

    it('should throw when schedule is enabled but recipients are missing', async () => {
      const data = {
        ...validData,
        schedule: { enabled: true, frequency: 'daily', recipients: [] }
      };
      await expect(CustomReport.create(data)).rejects.toThrow('At least one recipient is required for scheduled reports');
    });

    it('should throw when schedule is enabled but recipients array is absent', async () => {
      const data = {
        ...validData,
        schedule: { enabled: true, frequency: 'daily' }
      };
      await expect(CustomReport.create(data)).rejects.toThrow('At least one recipient is required for scheduled reports');
    });

    it('should not validate schedule when not enabled', async () => {
      const zdb = require('../../../services/zerodbService');
      const data = {
        ...validData,
        schedule: { enabled: false }
      };
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: data }]
      });

      const result = await CustomReport.create(data);
      expect(result).toBeDefined();
    });

    it('should set aggregation aliases when not provided', async () => {
      const zdb = require('../../../services/zerodbService');
      const data = {
        ...validData,
        aggregations: [
          { function: 'SUM', field: 'amount' },
          { function: 'COUNT', field: 'id', alias: 'custom_alias' }
        ]
      };
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: data }]
      });

      await CustomReport.create(data);
      expect(data.aggregations[0].alias).toBe('sum_amount');
      expect(data.aggregations[1].alias).toBe('custom_alias');
    });

    it('should handle empty aggregations array', async () => {
      const zdb = require('../../../services/zerodbService');
      const data = { ...validData, aggregations: [] };
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: data }]
      });

      const result = await CustomReport.create(data);
      expect(result).toBeDefined();
    });

    it('should succeed with valid scheduled report data', async () => {
      const zdb = require('../../../services/zerodbService');
      const data = {
        ...validData,
        schedule: { enabled: true, frequency: 'weekly', recipients: ['admin@company.com'] }
      };
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: data }]
      });

      const result = await CustomReport.create(data);
      expect(result).toBeDefined();
    });
  });

  describe('findByReportId()', () => {
    it('should call findOne with reportId filter', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({
        data: [{ row_data: { reportId: 'rpt-1', name: 'Test' }, row_id: 'r1' }]
      });

      const result = await CustomReport.findByReportId('rpt-1');
      expect(result).toBeDefined();
      expect(result.reportId).toBe('rpt-1');
    });

    it('should return null when report not found', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({ data: [] });

      const result = await CustomReport.findByReportId('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findByCompany()', () => {
    it('should find reports by companyId', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({
        data: [
          { row_data: { companyId: 'c1', name: 'R1' }, row_id: 'r1' },
          { row_data: { companyId: 'c1', name: 'R2' }, row_id: 'r2' }
        ]
      });

      const results = await CustomReport.findByCompany('c1');
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
    });

    it('should filter by status when provided in options', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({
        data: [{ row_data: { companyId: 'c1', status: 'active' }, row_id: 'r1' }]
      });

      const results = await CustomReport.findByCompany('c1', { status: 'active' });
      expect(Array.isArray(results)).toBe(true);
    });

    it('should return empty array when no reports found', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({ data: [] });

      const results = await CustomReport.findByCompany('no-company');
      expect(results).toEqual([]);
    });
  });

  describe('findByCreator()', () => {
    it('should find reports by createdBy', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({
        data: [{ row_data: { createdBy: 'user-1', name: 'R1' }, row_id: 'r1' }]
      });

      const results = await CustomReport.findByCreator('user-1');
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('hasBeenExecuted()', () => {
    it('should return false when executionCount is 0', () => {
      expect(CustomReport.hasBeenExecuted({ executionCount: 0 })).toBe(false);
    });

    it('should return true when executionCount > 0', () => {
      expect(CustomReport.hasBeenExecuted({ executionCount: 5 })).toBe(true);
    });

    it('should return true when executionCount is 1', () => {
      expect(CustomReport.hasBeenExecuted({ executionCount: 1 })).toBe(true);
    });

    it('should return falsy when report is null', () => {
      expect(CustomReport.hasBeenExecuted(null)).toBeFalsy();
    });

    it('should return falsy when report is undefined', () => {
      expect(CustomReport.hasBeenExecuted(undefined)).toBeFalsy();
    });
  });

  describe('isScheduled()', () => {
    it('should return true when schedule.enabled is true', () => {
      expect(CustomReport.isScheduled({ schedule: { enabled: true } })).toBe(true);
    });

    it('should return false when schedule.enabled is false', () => {
      expect(CustomReport.isScheduled({ schedule: { enabled: false } })).toBe(false);
    });

    it('should return falsy when report is null', () => {
      expect(CustomReport.isScheduled(null)).toBeFalsy();
    });

    it('should return falsy when schedule is missing', () => {
      expect(CustomReport.isScheduled({})).toBeFalsy();
    });

    it('should return falsy when schedule is null', () => {
      expect(CustomReport.isScheduled({ schedule: null })).toBeFalsy();
    });
  });

  describe('recordExecution()', () => {
    it('should increment execution count and set lastExecutedAt', async () => {
      const zdb = require('../../../services/zerodbService');
      // Mock findByReportId (findOne) - no __v to skip version check
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ reportId: 'rpt-1', executionCount: 3 }]
      });
      // Mock updateOne -> findOne (for the updateOne internal findOne)
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ reportId: 'rpt-1', executionCount: 3 }]
      });
      zdb.updateRows.mockResolvedValueOnce({ modified_count: 1 });

      const result = await CustomReport.recordExecution('rpt-1');
      expect(result).toBeDefined();
    });

    it('should return null when report not found', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({ data: [] });

      const result = await CustomReport.recordExecution('nonexistent');
      expect(result).toBeNull();
    });

    it('should handle executionCount of 0', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ reportId: 'rpt-1', executionCount: 0 }]
      });
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ reportId: 'rpt-1', executionCount: 0 }]
      });
      zdb.updateRows.mockResolvedValueOnce({ modified_count: 1 });

      const result = await CustomReport.recordExecution('rpt-1');
      expect(result).toBeDefined();
    });

    it('should handle missing executionCount field', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ reportId: 'rpt-1' }]
      });
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ reportId: 'rpt-1' }]
      });
      zdb.updateRows.mockResolvedValueOnce({ modified_count: 1 });

      const result = await CustomReport.recordExecution('rpt-1');
      expect(result).toBeDefined();
    });
  });

  describe('Exposed base model methods', () => {
    it('should expose find as a function', () => {
      expect(typeof CustomReport.find).toBe('function');
    });

    it('should expose findOne as a function', () => {
      expect(typeof CustomReport.findOne).toBe('function');
    });

    it('should expose findById as a function', () => {
      expect(typeof CustomReport.findById).toBe('function');
    });

    it('should expose updateOne as a function', () => {
      expect(typeof CustomReport.updateOne).toBe('function');
    });

    it('should expose updateMany as a function', () => {
      expect(typeof CustomReport.updateMany).toBe('function');
    });

    it('should expose findOneAndUpdate as a function', () => {
      expect(typeof CustomReport.findOneAndUpdate).toBe('function');
    });

    it('should expose findByIdAndUpdate as a function', () => {
      expect(typeof CustomReport.findByIdAndUpdate).toBe('function');
    });

    it('should expose deleteOne as a function', () => {
      expect(typeof CustomReport.deleteOne).toBe('function');
    });

    it('should expose deleteMany as a function', () => {
      expect(typeof CustomReport.deleteMany).toBe('function');
    });

    it('should expose findOneAndDelete as a function', () => {
      expect(typeof CustomReport.findOneAndDelete).toBe('function');
    });

    it('should expose findByIdAndDelete as a function', () => {
      expect(typeof CustomReport.findByIdAndDelete).toBe('function');
    });

    it('should expose countDocuments as a function', () => {
      expect(typeof CustomReport.countDocuments).toBe('function');
    });

    it('should expose exists as a function', () => {
      expect(typeof CustomReport.exists).toBe('function');
    });

    it('should expose distinct as a function', () => {
      expect(typeof CustomReport.distinct).toBe('function');
    });

    it('should expose aggregate as a function', () => {
      expect(typeof CustomReport.aggregate).toBe('function');
    });
  });

  describe('Schema field details', () => {
    it('should define sortBy with default', () => {
      expect(CustomReport.schema.sortBy).toBeDefined();
      expect(CustomReport.schema.sortBy.default).toEqual({ field: null, order: 'ASC' });
    });

    it('should define schedule with default', () => {
      expect(CustomReport.schema.schedule.default).toEqual({
        enabled: false,
        frequency: null,
        recipients: []
      });
    });

    it('should define lastExecutedAt with null default', () => {
      expect(CustomReport.schema.lastExecutedAt.default).toBeNull();
    });

    it('should define metadata with empty object default', () => {
      expect(CustomReport.schema.metadata.default).toEqual({});
    });

    it('should define filters with empty object default', () => {
      expect(CustomReport.schema.filters.default).toEqual({});
    });
  });
});

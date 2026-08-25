/**
 * FinancialForecast & ForecastLine Model Tests
 * Feature: Issue #264 - Create financial forecasts model for DCF valuation inputs
 * Tests creation, validation, workflow transitions, queries, line management, and calculations.
 */

// Mock zerodbService before any require
jest.mock('../../../services/zerodbService', () => ({
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  deleteRowById: jest.fn(),
  initialize: jest.fn(),
  projectId: 'mock-project-id',
  useLocalFallback: false,
  client: { put: jest.fn().mockResolvedValue({}) }
}));

const zerodbService = require('../../../services/zerodbService');

describe('FinancialForecast Model', () => {
  let FinancialForecast, ForecastLine, FORECAST_METRICS;

  beforeAll(() => {
    const mod = require('../../../models/FinancialForecast');
    FinancialForecast = mod.FinancialForecast;
    ForecastLine = mod.ForecastLine;
    FORECAST_METRICS = mod.FORECAST_METRICS;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    zerodbService.queryTable.mockReset();
    zerodbService.insertRow.mockReset();
    zerodbService.client.put.mockReset();
    zerodbService.client.put.mockResolvedValue({});
    zerodbService.queryTable.mockResolvedValue({ data: [] });
  });

  // Helpers
  const mockInsert = (returnData = {}) => {
    const data = { _id: 'mock-id', ...returnData };
    zerodbService.insertRow.mockResolvedValue({ data: [{ row_id: 'row_1', row_data: data }] });
    return data;
  };

  const mockFind = (docs = []) => {
    zerodbService.queryTable.mockResolvedValue({
      data: docs.map((d, i) => ({ row_id: `row_${i}`, row_data: d }))
    });
  };

  const mockFindOne = (doc) => {
    if (doc) {
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: doc }]
      });
    } else {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
    }
  };

  const buildForecastData = (overrides = {}) => ({
    companyId: 'company_123',
    name: '2026 Revenue Projection',
    forecastType: 'PROJECTION',
    startDate: '2026-01-01',
    endDate: '2030-12-31',
    createdBy: 'user_789',
    ...overrides
  });

  // -------------------------------------------------------------------
  // Exported Constants
  // -------------------------------------------------------------------
  describe('Exported Constants', () => {
    it('should export FORECAST_METRICS with 24 items', () => {
      expect(FORECAST_METRICS).toHaveLength(24);
    });

    it('should include revenue metrics', () => {
      expect(FORECAST_METRICS).toContain('REVENUE');
      expect(FORECAST_METRICS).toContain('REVENUE_RECURRING');
      expect(FORECAST_METRICS).toContain('REVENUE_SERVICES');
      expect(FORECAST_METRICS).toContain('REVENUE_OTHER');
    });

    it('should include profitability metrics', () => {
      expect(FORECAST_METRICS).toContain('EBITDA');
      expect(FORECAST_METRICS).toContain('EBIT');
      expect(FORECAST_METRICS).toContain('NET_INCOME');
    });

    it('should include operational metrics', () => {
      expect(FORECAST_METRICS).toContain('HEADCOUNT');
      expect(FORECAST_METRICS).toContain('CUSTOMERS');
      expect(FORECAST_METRICS).toContain('ARR');
      expect(FORECAST_METRICS).toContain('MRR');
    });

    it('should include cash metrics', () => {
      expect(FORECAST_METRICS).toContain('CASH_BURN');
      expect(FORECAST_METRICS).toContain('FREE_CASH_FLOW');
    });

    it('should have correct table name', () => {
      expect(FinancialForecast.tableName).toBe('forecasts');
    });
  });

  // -------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------
  describe('create', () => {
    it('should create a forecast with auto-generated forecastId', async () => {
      const data = buildForecastData();
      mockInsert({ ...data });

      await FinancialForecast.create(data);

      expect(zerodbService.insertRow).toHaveBeenCalledTimes(1);
      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.forecastId).toMatch(/^forecast_/);
    });

    it('should keep caller-provided forecastId', async () => {
      const data = buildForecastData({ forecastId: 'forecast_custom' });
      mockInsert({ ...data });

      await FinancialForecast.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.forecastId).toBe('forecast_custom');
    });

    it('should default status to DRAFT', async () => {
      const data = buildForecastData();
      mockInsert({ ...data });

      await FinancialForecast.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.status).toBe('DRAFT');
    });

    it('should default scenarioType to BASE', async () => {
      const data = buildForecastData();
      mockInsert({ ...data });

      await FinancialForecast.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.scenarioType).toBe('BASE');
    });

    it('should default periodType to ANNUAL', async () => {
      const data = buildForecastData();
      mockInsert({ ...data });

      await FinancialForecast.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.periodType).toBe('ANNUAL');
    });

    it('should initialize statusHistory with DRAFT entry', async () => {
      const data = buildForecastData();
      mockInsert({ ...data });

      await FinancialForecast.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.statusHistory).toHaveLength(1);
      expect(insertArg.statusHistory[0].status).toBe('DRAFT');
      expect(insertArg.statusHistory[0].changedBy).toBe('user_789');
    });

    it('should throw when companyId is missing', async () => {
      const data = buildForecastData({ companyId: undefined });
      await expect(FinancialForecast.create(data)).rejects.toThrow('companyId is required');
    });

    it('should throw when name is missing', async () => {
      const data = buildForecastData({ name: undefined });
      await expect(FinancialForecast.create(data)).rejects.toThrow('name is required');
    });

    it('should throw when forecastType is missing', async () => {
      const data = buildForecastData({ forecastType: undefined });
      await expect(FinancialForecast.create(data)).rejects.toThrow('forecastType is required');
    });

    it('should throw when startDate is missing', async () => {
      const data = buildForecastData({ startDate: undefined });
      await expect(FinancialForecast.create(data)).rejects.toThrow('startDate is required');
    });

    it('should throw when endDate is missing', async () => {
      const data = buildForecastData({ endDate: undefined });
      await expect(FinancialForecast.create(data)).rejects.toThrow('endDate is required');
    });

    it('should throw when createdBy is missing', async () => {
      const data = buildForecastData({ createdBy: undefined });
      await expect(FinancialForecast.create(data)).rejects.toThrow('createdBy is required');
    });

    it('should throw for invalid forecastType', async () => {
      const data = buildForecastData({ forecastType: 'INVALID' });
      await expect(FinancialForecast.create(data)).rejects.toThrow('Invalid forecastType: INVALID');
    });

    it('should throw for invalid scenarioType', async () => {
      const data = buildForecastData({ scenarioType: 'INVALID' });
      await expect(FinancialForecast.create(data)).rejects.toThrow('Invalid scenarioType: INVALID');
    });

    it('should throw when endDate is before startDate', async () => {
      const data = buildForecastData({ startDate: '2030-01-01', endDate: '2025-01-01' });
      await expect(FinancialForecast.create(data)).rejects.toThrow('endDate must be after startDate');
    });

    it('should accept BUDGET forecastType', async () => {
      const data = buildForecastData({ forecastType: 'BUDGET' });
      mockInsert({ ...data });

      await FinancialForecast.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.forecastType).toBe('BUDGET');
    });

    it('should accept SCENARIO forecastType', async () => {
      const data = buildForecastData({ forecastType: 'SCENARIO' });
      mockInsert({ ...data });

      await FinancialForecast.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.forecastType).toBe('SCENARIO');
    });
  });

  // -------------------------------------------------------------------
  // canTransitionTo
  // -------------------------------------------------------------------
  describe('canTransitionTo', () => {
    it('should allow DRAFT to SUBMITTED', () => {
      expect(FinancialForecast.canTransitionTo('DRAFT', 'SUBMITTED')).toBe(true);
    });

    it('should allow SUBMITTED to APPROVED', () => {
      expect(FinancialForecast.canTransitionTo('SUBMITTED', 'APPROVED')).toBe(true);
    });

    it('should allow SUBMITTED back to DRAFT', () => {
      expect(FinancialForecast.canTransitionTo('SUBMITTED', 'DRAFT')).toBe(true);
    });

    it('should allow APPROVED to SUPERSEDED', () => {
      expect(FinancialForecast.canTransitionTo('APPROVED', 'SUPERSEDED')).toBe(true);
    });

    it('should not allow DRAFT to APPROVED', () => {
      expect(FinancialForecast.canTransitionTo('DRAFT', 'APPROVED')).toBe(false);
    });

    it('should not allow APPROVED to DRAFT', () => {
      expect(FinancialForecast.canTransitionTo('APPROVED', 'DRAFT')).toBe(false);
    });

    it('should not allow any transition from SUPERSEDED', () => {
      expect(FinancialForecast.canTransitionTo('SUPERSEDED', 'DRAFT')).toBe(false);
      expect(FinancialForecast.canTransitionTo('SUPERSEDED', 'SUBMITTED')).toBe(false);
      expect(FinancialForecast.canTransitionTo('SUPERSEDED', 'APPROVED')).toBe(false);
    });

    it('should return false for unknown status', () => {
      expect(FinancialForecast.canTransitionTo('UNKNOWN', 'DRAFT')).toBe(false);
    });
  });

  // -------------------------------------------------------------------
  // transitionTo
  // -------------------------------------------------------------------
  describe('transitionTo', () => {
    it('should transition to new status and append to statusHistory', async () => {
      const forecast = {
        forecastId: 'f1', status: 'DRAFT', statusHistory: [{ status: 'DRAFT' }], row_id: 'row_1'
      };
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: forecast }]
      });

      await FinancialForecast.transitionTo('f1', 'SUBMITTED', 'user_1', 'Submitting');

      expect(zerodbService.client.put).toHaveBeenCalled();
    });

    it('should throw when forecast not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      await expect(FinancialForecast.transitionTo('missing', 'SUBMITTED', 'user_1'))
        .rejects.toThrow('Forecast not found');
    });

    it('should throw for invalid transition', async () => {
      const forecast = { forecastId: 'f1', status: 'DRAFT', row_id: 'row_1' };
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: forecast }]
      });

      await expect(FinancialForecast.transitionTo('f1', 'APPROVED', 'user_1'))
        .rejects.toThrow('Cannot transition from DRAFT to APPROVED');
    });

    it('should set approvedBy and approvedAt when transitioning to APPROVED', async () => {
      const forecast = {
        forecastId: 'f1', status: 'SUBMITTED', statusHistory: [], row_id: 'row_1'
      };
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: forecast }]
      });

      await FinancialForecast.transitionTo('f1', 'APPROVED', 'user_1');

      expect(zerodbService.client.put).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------
  // submit
  // -------------------------------------------------------------------
  describe('submit', () => {
    it('should have submit method', () => {
      expect(typeof FinancialForecast.submit).toBe('function');
    });

    it('should transition to SUBMITTED', async () => {
      const forecast = { forecastId: 'f1', status: 'DRAFT', statusHistory: [], row_id: 'row_1' };
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: forecast }]
      });

      await FinancialForecast.submit('f1', 'user_1');

      expect(zerodbService.client.put).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------
  // approve
  // -------------------------------------------------------------------
  describe('approve', () => {
    it('should call updateOne when approving', async () => {
      const forecast = { forecastId: 'f2', companyId: 'c1', status: 'SUBMITTED', statusHistory: [], row_id: 'row_2' };
      // All queries return the forecast; the approve flow will attempt to supersede
      // existing approved forecasts and then approve the target
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_2', row_data: forecast }]
      });

      await FinancialForecast.approve('f2', 'admin_1');

      expect(zerodbService.client.put).toHaveBeenCalled();
    });

    it('should throw when forecast not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      await expect(FinancialForecast.approve('missing', 'user_1'))
        .rejects.toThrow('Forecast not found');
    });
  });

  // -------------------------------------------------------------------
  // linkToValuation
  // -------------------------------------------------------------------
  describe('linkToValuation', () => {
    it('should link approved forecast to valuation', async () => {
      const forecast = { forecastId: 'f1', status: 'APPROVED', row_id: 'row_1' };
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: forecast }]
      });

      await FinancialForecast.linkToValuation('f1', 'val_1', 'user_1');

      expect(zerodbService.client.put).toHaveBeenCalled();
    });

    it('should throw when forecast not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      await expect(FinancialForecast.linkToValuation('missing', 'val_1', 'user_1'))
        .rejects.toThrow('Forecast not found');
    });

    it('should throw when forecast is not approved', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: { forecastId: 'f1', status: 'DRAFT', row_id: 'row_1' } }]
      });

      await expect(FinancialForecast.linkToValuation('f1', 'val_1', 'user_1'))
        .rejects.toThrow('Only approved forecasts can be linked to valuations');
    });
  });

  // -------------------------------------------------------------------
  // isStale
  // -------------------------------------------------------------------
  describe('isStale', () => {
    it('should return true for forecasts approved >6 months ago', () => {
      const sevenMonthsAgo = new Date();
      sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);

      expect(FinancialForecast.isStale({ approvedAt: sevenMonthsAgo.toISOString() })).toBe(true);
    });

    it('should return false for forecasts approved <6 months ago', () => {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      expect(FinancialForecast.isStale({ approvedAt: threeMonthsAgo.toISOString() })).toBe(false);
    });

    it('should return false when approvedAt is null', () => {
      expect(FinancialForecast.isStale({ approvedAt: null })).toBe(false);
    });

    it('should return false when approvedAt is undefined', () => {
      expect(FinancialForecast.isStale({})).toBe(false);
    });
  });

  // -------------------------------------------------------------------
  // findByCompany
  // -------------------------------------------------------------------
  describe('findByCompany', () => {
    it('should query by companyId', async () => {
      mockFind([{ companyId: 'c1' }]);

      const result = await FinancialForecast.findByCompany('c1');

      expect(result).toHaveLength(1);
    });

    it('should filter by status when provided', async () => {
      mockFind([]);

      await FinancialForecast.findByCompany('c1', 'APPROVED');

      const callArg = zerodbService.queryTable.mock.calls[0][1];
      expect(callArg.filter.status).toBe('APPROVED');
    });
  });

  // -------------------------------------------------------------------
  // findLatestApproved
  // -------------------------------------------------------------------
  describe('findLatestApproved', () => {
    it('should return the first approved forecast', async () => {
      const approved = { companyId: 'c1', status: 'APPROVED', forecastId: 'f1' };
      mockFind([approved]);

      const result = await FinancialForecast.findLatestApproved('c1');

      expect(result.forecastId).toBe('f1');
    });

    it('should return null when no approved forecasts exist', async () => {
      mockFind([]);

      const result = await FinancialForecast.findLatestApproved('c1');

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------
  // updateGrowthAssumptions
  // -------------------------------------------------------------------
  describe('updateGrowthAssumptions', () => {
    it('should merge new assumptions with existing ones', async () => {
      const forecast = {
        forecastId: 'f1', status: 'DRAFT', row_id: 'row_1',
        growthAssumptions: { revenueGrowthRate: 0.25 }
      };
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: forecast }]
      });

      await FinancialForecast.updateGrowthAssumptions('f1', { discountRate: 0.12 }, 'user_1');

      expect(zerodbService.client.put).toHaveBeenCalled();
    });

    it('should throw when forecast not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      await expect(FinancialForecast.updateGrowthAssumptions('missing', {}, 'user_1'))
        .rejects.toThrow('Forecast not found');
    });

    it('should throw when forecast is approved', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: { forecastId: 'f1', status: 'APPROVED', row_id: 'row_1' } }]
      });

      await expect(FinancialForecast.updateGrowthAssumptions('f1', {}, 'user_1'))
        .rejects.toThrow('Cannot modify approved forecasts');
    });
  });

  // -------------------------------------------------------------------
  // validatePeriodCoverage
  // -------------------------------------------------------------------
  describe('validatePeriodCoverage', () => {
    it('should return valid for forecasts with lines', () => {
      const forecast = { startDate: '2026-01-01', endDate: '2030-12-31' };
      const lines = [
        { periodStart: '2026-01-01', periodEnd: '2026-12-31', metric: 'REVENUE', value: 1000000 },
        { periodStart: '2027-01-01', periodEnd: '2027-12-31', metric: 'REVENUE', value: 1250000 }
      ];

      const result = FinancialForecast.validatePeriodCoverage(forecast, lines);

      expect(result.valid).toBe(true);
      expect(result.periodCount).toBe(2);
    });

    it('should return invalid for empty lines', () => {
      const forecast = { startDate: '2026-01-01', endDate: '2030-12-31' };

      const result = FinancialForecast.validatePeriodCoverage(forecast, []);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No forecast lines defined');
    });
  });
});

// =====================================================================
// ForecastLine Model
// =====================================================================
describe('ForecastLine Model', () => {
  let ForecastLine, FinancialForecast, FORECAST_METRICS;

  beforeAll(() => {
    const mod = require('../../../models/FinancialForecast');
    ForecastLine = mod.ForecastLine;
    FinancialForecast = mod.FinancialForecast;
    FORECAST_METRICS = mod.FORECAST_METRICS;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    zerodbService.queryTable.mockReset();
    zerodbService.insertRow.mockReset();
    zerodbService.client.put.mockReset();
    zerodbService.client.put.mockResolvedValue({});
    zerodbService.queryTable.mockResolvedValue({ data: [] });
  });

  const mockInsert = (returnData = {}) => {
    const data = { _id: 'mock-id', ...returnData };
    zerodbService.insertRow.mockResolvedValue({ data: [{ row_id: 'row_1', row_data: data }] });
    return data;
  };

  const mockFind = (docs = []) => {
    zerodbService.queryTable.mockResolvedValue({
      data: docs.map((d, i) => ({ row_id: `row_${i}`, row_data: d }))
    });
  };

  const mockFindOne = (doc) => {
    if (doc) {
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: doc }]
      });
    } else {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
    }
  };

  const buildLineData = (overrides = {}) => ({
    forecastId: 'forecast_123',
    periodStart: '2026-01-01',
    periodEnd: '2026-12-31',
    metric: 'REVENUE',
    value: 5000000,
    ...overrides
  });

  // -------------------------------------------------------------------
  // Constants
  // -------------------------------------------------------------------
  describe('Constants', () => {
    it('should have correct table name', () => {
      expect(ForecastLine.tableName).toBe('forecast_lines');
    });

    it('should export FORECAST_METRICS', () => {
      expect(ForecastLine.FORECAST_METRICS).toEqual(FORECAST_METRICS);
    });
  });

  // -------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------
  describe('create', () => {
    it('should create a line with auto-generated lineId', async () => {
      const data = buildLineData();
      mockInsert({ ...data });

      await ForecastLine.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.lineId).toMatch(/^line_/);
    });

    it('should default currency to USD', async () => {
      const data = buildLineData();
      mockInsert({ ...data });

      await ForecastLine.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.currency).toBe('USD');
    });

    it('should default confidence to MEDIUM', async () => {
      const data = buildLineData();
      mockInsert({ ...data });

      await ForecastLine.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.confidence).toBe('MEDIUM');
    });

    it('should throw when forecastId is missing', async () => {
      await expect(ForecastLine.create(buildLineData({ forecastId: undefined })))
        .rejects.toThrow('forecastId is required');
    });

    it('should throw when periodStart is missing', async () => {
      await expect(ForecastLine.create(buildLineData({ periodStart: undefined })))
        .rejects.toThrow('periodStart is required');
    });

    it('should throw when periodEnd is missing', async () => {
      await expect(ForecastLine.create(buildLineData({ periodEnd: undefined })))
        .rejects.toThrow('periodEnd is required');
    });

    it('should throw when metric is missing', async () => {
      await expect(ForecastLine.create(buildLineData({ metric: undefined })))
        .rejects.toThrow('metric is required');
    });

    it('should throw when value is missing', async () => {
      await expect(ForecastLine.create(buildLineData({ value: undefined })))
        .rejects.toThrow('value is required');
    });

    it('should throw when value is null', async () => {
      await expect(ForecastLine.create(buildLineData({ value: null })))
        .rejects.toThrow('value is required');
    });

    it('should throw for invalid metric', async () => {
      await expect(ForecastLine.create(buildLineData({ metric: 'INVALID_METRIC' })))
        .rejects.toThrow('Invalid metric: INVALID_METRIC');
    });

    it('should throw for invalid confidence', async () => {
      await expect(ForecastLine.create(buildLineData({ confidence: 'VERY_HIGH' })))
        .rejects.toThrow('Invalid confidence: VERY_HIGH');
    });

    it('should accept zero value', async () => {
      const data = buildLineData({ value: 0 });
      mockInsert({ ...data });

      await ForecastLine.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.value).toBe(0);
    });

    it('should accept negative value', async () => {
      const data = buildLineData({ value: -500000, metric: 'CASH_BURN' });
      mockInsert({ ...data });

      await ForecastLine.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.value).toBe(-500000);
    });
  });

  // -------------------------------------------------------------------
  // createMany
  // -------------------------------------------------------------------
  describe('createMany', () => {
    it('should create multiple lines', async () => {
      zerodbService.insertRow
        .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: { lineId: 'l1' } }] })
        .mockResolvedValueOnce({ data: [{ row_id: 'r2', row_data: { lineId: 'l2' } }] });

      const lines = [
        buildLineData({ metric: 'REVENUE', value: 1000000 }),
        buildLineData({ metric: 'COGS', value: 300000 })
      ];

      const result = await ForecastLine.createMany(lines);

      expect(result).toHaveLength(2);
      expect(zerodbService.insertRow).toHaveBeenCalledTimes(2);
    });
  });

  // -------------------------------------------------------------------
  // findByForecast
  // -------------------------------------------------------------------
  describe('findByForecast', () => {
    it('should query by forecastId', async () => {
      mockFind([{ forecastId: 'f1', metric: 'REVENUE' }]);

      const result = await ForecastLine.findByForecast('f1');

      expect(result).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------
  // findByMetric
  // -------------------------------------------------------------------
  describe('findByMetric', () => {
    it('should query by forecastId and metric', async () => {
      mockFind([{ forecastId: 'f1', metric: 'REVENUE', value: 1000000 }]);

      const result = await ForecastLine.findByMetric('f1', 'REVENUE');

      expect(result).toHaveLength(1);
      const callArg = zerodbService.queryTable.mock.calls[0][1];
      expect(callArg.filter.forecastId).toBe('f1');
      expect(callArg.filter.metric).toBe('REVENUE');
    });
  });

  // -------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------
  describe('update', () => {
    it('should update a forecast line', async () => {
      const line = { lineId: 'l1', forecastId: 'f1', value: 1000000, row_id: 'row_1' };
      // Both ForecastLine.findOne and FinancialForecast.findOne use different tables
      // but the mock returns the same data; the update flow works through client.put
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: { ...line, status: 'DRAFT' } }]
      });

      await ForecastLine.update('l1', { value: 2000000 });

      expect(zerodbService.client.put).toHaveBeenCalled();
    });

    it('should throw when line not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      await expect(ForecastLine.update('missing', { value: 100 }))
        .rejects.toThrow('Forecast line not found');
    });

    it('should throw when forecast is approved', async () => {
      // ForecastLine.update first finds the line, then finds the forecast.
      // Both use the same mock. We need the line to be found but forecast to be APPROVED.
      // Since both use queryTable with different table names, we use mockResolvedValue
      // that returns a doc with status APPROVED - the line findOne will find it,
      // then the forecast findOne will also find it with APPROVED status.
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: { lineId: 'l1', forecastId: 'f1', status: 'APPROVED', row_id: 'row_1' } }]
      });

      await expect(ForecastLine.update('l1', { value: 100 }))
        .rejects.toThrow('Cannot modify lines of approved forecasts');
    });

    it('should throw for invalid metric', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: { lineId: 'l1', forecastId: 'f1', status: 'DRAFT', row_id: 'row_1' } }]
      });

      await expect(ForecastLine.update('l1', { metric: 'INVALID' }))
        .rejects.toThrow('Invalid metric: INVALID');
    });
  });

  // -------------------------------------------------------------------
  // deleteByForecast
  // -------------------------------------------------------------------
  describe('deleteByForecast', () => {
    it('should throw when forecast is approved', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: { forecastId: 'f1', status: 'APPROVED', row_id: 'row_1' } }]
      });

      await expect(ForecastLine.deleteByForecast('f1'))
        .rejects.toThrow('Cannot delete lines of approved forecasts');
    });
  });

  // -------------------------------------------------------------------
  // calculateEBITDA
  // -------------------------------------------------------------------
  describe('calculateEBITDA', () => {
    it('should calculate EBITDA from revenue, cogs, and opex', async () => {
      const lines = [
        { metric: 'REVENUE', value: 10000000, periodStart: '2026-01-01', periodEnd: '2026-12-31' },
        { metric: 'COGS', value: 3000000, periodStart: '2026-01-01', periodEnd: '2026-12-31' },
        { metric: 'OPEX_TOTAL', value: 4000000, periodStart: '2026-01-01', periodEnd: '2026-12-31' }
      ];
      mockFind(lines);

      const result = await ForecastLine.calculateEBITDA('f1', '2026-01-01', '2026-12-31');

      expect(result).toBe(3000000);
    });

    it('should return null when revenue is zero', async () => {
      mockFind([]);

      const result = await ForecastLine.calculateEBITDA('f1', '2026-01-01', '2026-12-31');

      expect(result).toBeNull();
    });

    it('should handle negative EBITDA', async () => {
      const lines = [
        { metric: 'REVENUE', value: 5000000 },
        { metric: 'COGS', value: 3000000 },
        { metric: 'OPEX_TOTAL', value: 6000000 }
      ];
      mockFind(lines);

      const result = await ForecastLine.calculateEBITDA('f1', '2026-01-01', '2026-12-31');

      expect(result).toBe(-4000000);
    });
  });

  // -------------------------------------------------------------------
  // getSummaryByMetric
  // -------------------------------------------------------------------
  describe('getSummaryByMetric', () => {
    it('should aggregate values by metric', async () => {
      const lines = [
        { metric: 'REVENUE', value: 1000000, periodStart: '2026-01-01', periodEnd: '2026-12-31' },
        { metric: 'REVENUE', value: 1250000, periodStart: '2027-01-01', periodEnd: '2027-12-31' },
        { metric: 'COGS', value: 300000, periodStart: '2026-01-01', periodEnd: '2026-12-31' }
      ];
      mockFind(lines);

      const summary = await ForecastLine.getSummaryByMetric('f1');

      expect(summary.REVENUE.total).toBe(2250000);
      expect(summary.REVENUE.periods).toHaveLength(2);
      expect(summary.COGS.total).toBe(300000);
      expect(summary.COGS.periods).toHaveLength(1);
    });

    it('should handle empty lines', async () => {
      mockFind([]);

      const summary = await ForecastLine.getSummaryByMetric('f1');

      expect(Object.keys(summary)).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------
  // CRUD method existence
  // -------------------------------------------------------------------
  describe('CRUD Methods', () => {
    it('should have all required methods', () => {
      expect(typeof ForecastLine.create).toBe('function');
      expect(typeof ForecastLine.find).toBe('function');
      expect(typeof ForecastLine.findOne).toBe('function');
      expect(typeof ForecastLine.updateOne).toBe('function');
      expect(typeof ForecastLine.deleteOne).toBe('function');
      expect(typeof ForecastLine.deleteMany).toBe('function');
      expect(typeof ForecastLine.createMany).toBe('function');
      expect(typeof ForecastLine.findByForecast).toBe('function');
      expect(typeof ForecastLine.findByMetric).toBe('function');
      expect(typeof ForecastLine.update).toBe('function');
      expect(typeof ForecastLine.deleteByForecast).toBe('function');
      expect(typeof ForecastLine.calculateEBITDA).toBe('function');
      expect(typeof ForecastLine.getSummaryByMetric).toBe('function');
    });
  });
});

/**
 * Financial Report Controller (ZeroDB) Tests
 * Tests for type coercion, regex escaping, and ownership checks
 */

const zerodbService = require('../../../services/zerodbService');

// Import the controller by requiring the module
const controller = require('../../../controllers/v1/financialReportController.zerodb');

// Mock zerodbService
jest.mock('../../../services/zerodbService');

describe('Financial Report Controller - calculateTotals', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { id: 'user-1', companyId: 'company-1' },
      body: {},
      params: {},
      query: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  it('should coerce string revenue values to numbers (prevent string concat)', async () => {
    req.body = {
      companyId: 'company-1',
      reportingPeriod: 'Q1 2026',
      reportType: 'quarterly',
      revenue: { sales: '1000', services: '2000', other: '500' },
      expenses: { salaries: '500', marketing: '200', operations: '100', other: '50' }
    };

    zerodbService.insertRow.mockResolvedValue({
      rows: [{
        ...req.body,
        totalRevenue: 3500,
        totalExpenses: 850,
        netIncome: 2650
      }]
    });

    await controller.createFinancialReport(req, res);

    expect(res.status).toHaveBeenCalledWith(201);

    // Verify the data passed to insertRow has numeric totals
    const insertedData = zerodbService.insertRow.mock.calls[0][1];
    expect(typeof insertedData.totalRevenue).toBe('number');
    expect(insertedData.totalRevenue).toBe(3500);
    expect(typeof insertedData.totalExpenses).toBe('number');
    expect(insertedData.totalExpenses).toBe(850);
    expect(insertedData.netIncome).toBe(2650);
  });

  it('should coerce string totalRevenue/totalExpenses when no breakdown provided', async () => {
    req.body = {
      companyId: 'company-1',
      reportingPeriod: 'Q1 2026',
      reportType: 'quarterly',
      totalRevenue: '5000',
      totalExpenses: '3000'
    };

    zerodbService.insertRow.mockResolvedValue({ rows: [req.body] });

    await controller.createFinancialReport(req, res);

    const insertedData = zerodbService.insertRow.mock.calls[0][1];
    expect(typeof insertedData.totalRevenue).toBe('number');
    expect(insertedData.totalRevenue).toBe(5000);
    expect(typeof insertedData.totalExpenses).toBe('number');
    expect(insertedData.totalExpenses).toBe(3000);
    expect(insertedData.netIncome).toBe(2000);
  });
});

describe('Financial Report Controller - Ownership Checks', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { id: 'user-1', companyId: 'company-1' },
      body: {},
      params: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa' },
      query: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  it('getById should return 403 for report from another company', async () => {
    zerodbService.queryTable.mockResolvedValue([
      { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', companyId: 'company-2', totalRevenue: 1000 }
    ]);

    await controller.getFinancialReportById(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Access denied') })
    );
  });

  it('getById should return report if same company', async () => {
    const report = { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', companyId: 'company-1', totalRevenue: 1000 };
    zerodbService.queryTable.mockResolvedValue([report]);

    await controller.getFinancialReportById(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(report);
  });

  it('updateFinancialReport should return 403 for report from another company', async () => {
    zerodbService.queryTable.mockResolvedValue([
      { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', companyId: 'company-2' }
    ]);

    await controller.updateFinancialReport(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('deleteFinancialReport should return 403 for report from another company', async () => {
    zerodbService.queryTable.mockResolvedValue([
      { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', companyId: 'company-2' }
    ]);

    await controller.deleteFinancialReport(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('Financial Report Controller - Search Regex Escaping', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { id: 'user-1', companyId: 'company-1' },
      body: {},
      params: {},
      query: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  it('should escape regex special characters in search query', async () => {
    req.query = { q: 'Q1 (2026)' };

    zerodbService.queryTable.mockResolvedValue([]);

    await controller.searchFinancialReports(req, res);

    // Verify the filter passed to queryTable has escaped regex
    const queryArgs = zerodbService.queryTable.mock.calls[0][1];
    const regexUsed = queryArgs.filter.$or[0].reportingPeriod.$regex;
    expect(regexUsed).toBe('Q1 \\(2026\\)');
  });

  it('should escape all dangerous regex chars', async () => {
    req.query = { q: '.*+?^${}()|[]\\' };

    zerodbService.queryTable.mockResolvedValue([]);

    await controller.searchFinancialReports(req, res);

    const queryArgs = zerodbService.queryTable.mock.calls[0][1];
    const regexUsed = queryArgs.filter.$or[0].reportingPeriod.$regex;
    // All special chars should be escaped
    expect(regexUsed).not.toContain('.*');
    expect(regexUsed).toContain('\\.');
    expect(regexUsed).toContain('\\*');
  });
});

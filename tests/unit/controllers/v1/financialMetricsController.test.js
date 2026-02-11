/**
 * Financial Metrics Controller Unit Tests
 *
 * Tests for all Financial Metrics controller methods including validation,
 * error handling, and edge cases. Issue #39: Controller Test Coverage
 */

// Mock the dependencies
jest.mock('../../../../models/financialReport');
jest.mock('../../../../models/Company');

const financialMetricsController = require('../../../../controllers/v1/financialMetricsController');
const FinancialReport = require('../../../../models/financialReport');
const Company = require('../../../../models/Company');

describe('Financial Metrics Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: { id: 'user-123' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      metrics: {}
    };
    jest.clearAllMocks();
  });

  describe('calculateProfitabilityMetrics', () => {
    const validCompanyId = '507f1f77bcf86cd799439011';
    const mockReport = {
      companyId: validCompanyId,
      reportingPeriod: '2024-Q1',
      reportType: 'quarterly',
      revenue: { sales: 100000, services: 50000, other: 5000 },
      expenses: { salaries: 60000, marketing: 20000, operations: 15000, other: 5000 }
    };

    it('should calculate profitability metrics successfully', async () => {
      req.params.companyId = validCompanyId;
      req.query.period = '2024-Q1';

      FinancialReport.find.mockResolvedValue([mockReport]);

      await financialMetricsController.calculateProfitabilityMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: validCompanyId,
          period: '2024-Q1',
          grossProfitMargin: expect.any(Number),
          operatingProfitMargin: expect.any(Number),
          netProfitMargin: expect.any(Number)
        })
      );
    });

    it('should return 400 for invalid company ID', async () => {
      req.params.companyId = 'invalid-id';
      req.query.period = '2024-Q1';


      await financialMetricsController.calculateProfitabilityMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Invalid company ID' })
      );
    });

    it('should return 400 for invalid period format', async () => {
      req.params.companyId = validCompanyId;
      req.query.period = 'invalid-period';


      await financialMetricsController.calculateProfitabilityMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('Invalid period format') })
      );
    });

    it('should return 400 for missing period', async () => {
      req.params.companyId = validCompanyId;
      req.query = {};


      await financialMetricsController.calculateProfitabilityMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when no financial data available', async () => {
      req.params.companyId = validCompanyId;
      req.query.period = '2024-Q1';

      FinancialReport.find.mockResolvedValue([]);

      await financialMetricsController.calculateProfitabilityMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'No financial data available for the specified period' })
      );
    });

    it('should handle annual period format', async () => {
      req.params.companyId = validCompanyId;
      req.query.period = '2024-annual';


      const annualReport = { ...mockReport, reportType: 'annual' };
      FinancialReport.find.mockResolvedValue([annualReport]);

      await financialMetricsController.calculateProfitabilityMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle database errors', async () => {
      req.params.companyId = validCompanyId;
      req.query.period = '2024-Q1';

      FinancialReport.find.mockRejectedValue(new Error('Database error'));

      await financialMetricsController.calculateProfitabilityMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to calculate profitability metrics' })
      );
    });
  });

  describe('calculateLiquidityMetrics', () => {
    const validCompanyId = '507f1f77bcf86cd799439011';
    const mockReport = {
      companyId: validCompanyId,
      reportingPeriod: '2024-Q1',
      reportType: 'quarterly',
      revenue: { sales: 100000, services: 50000, other: 5000 },
      expenses: { salaries: 60000, marketing: 20000, operations: 15000, other: 5000 }
    };

    it('should calculate liquidity metrics successfully', async () => {
      req.params.companyId = validCompanyId;
      req.query.period = '2024-Q2';

      FinancialReport.find.mockResolvedValue([mockReport]);

      await financialMetricsController.calculateLiquidityMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: validCompanyId,
          period: '2024-Q2',
          currentRatio: expect.any(Number),
          quickRatio: expect.any(Number),
          cashRatio: expect.any(Number)
        })
      );
    });

    it('should return 400 for invalid company ID', async () => {
      req.params.companyId = 'invalid-id';
      req.query.period = '2024-Q1';


      await financialMetricsController.calculateLiquidityMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Invalid company ID' })
      );
    });

    it('should return 400 for invalid period format', async () => {
      req.params.companyId = validCompanyId;
      req.query.period = '2024';


      await financialMetricsController.calculateLiquidityMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when no financial data available', async () => {
      req.params.companyId = validCompanyId;
      req.query.period = '2024-Q1';

      FinancialReport.find.mockResolvedValue([]);

      await financialMetricsController.calculateLiquidityMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should handle database errors', async () => {
      req.params.companyId = validCompanyId;
      req.query.period = '2024-Q1';

      FinancialReport.find.mockRejectedValue(new Error('Database error'));

      await financialMetricsController.calculateLiquidityMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to calculate liquidity metrics' })
      );
    });
  });

  describe('calculateSolvencyMetrics', () => {
    const validCompanyId = '507f1f77bcf86cd799439011';
    const mockReport = {
      companyId: validCompanyId,
      reportingPeriod: '2024-Q1',
      reportType: 'quarterly',
      revenue: { sales: 100000, services: 50000, other: 5000 },
      expenses: { salaries: 60000, marketing: 20000, operations: 15000, other: 5000 }
    };

    it('should calculate solvency metrics successfully', async () => {
      req.params.companyId = validCompanyId;
      req.query.period = '2024-Q3';

      FinancialReport.find.mockResolvedValue([mockReport]);

      await financialMetricsController.calculateSolvencyMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: validCompanyId,
          period: '2024-Q3',
          debtToEquityRatio: expect.any(Number),
          debtToAssetsRatio: expect.any(Number),
          interestCoverageRatio: expect.any(Number)
        })
      );
    });

    it('should return 400 for invalid company ID', async () => {
      req.params.companyId = 'invalid-id';
      req.query.period = '2024-Q1';


      await financialMetricsController.calculateSolvencyMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Invalid company ID' })
      );
    });

    it('should return 400 for invalid period format', async () => {
      req.params.companyId = validCompanyId;
      req.query.period = 'Q1-2024';


      await financialMetricsController.calculateSolvencyMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when no financial data available', async () => {
      req.params.companyId = validCompanyId;
      req.query.period = '2024-Q1';

      FinancialReport.find.mockResolvedValue([]);

      await financialMetricsController.calculateSolvencyMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should handle database errors', async () => {
      req.params.companyId = validCompanyId;
      req.query.period = '2024-Q1';

      FinancialReport.find.mockRejectedValue(new Error('Database error'));

      await financialMetricsController.calculateSolvencyMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to calculate solvency metrics' })
      );
    });
  });

  describe('calculateEfficiencyMetrics', () => {
    const validCompanyId = '507f1f77bcf86cd799439011';
    const mockReport = {
      companyId: validCompanyId,
      reportingPeriod: '2024-Q1',
      reportType: 'quarterly',
      revenue: { sales: 100000, services: 50000, other: 5000 },
      expenses: { salaries: 60000, marketing: 20000, operations: 15000, other: 5000 }
    };

    it('should calculate efficiency metrics successfully', async () => {
      req.params.companyId = validCompanyId;
      req.query.period = '2024-Q4';

      FinancialReport.find.mockResolvedValue([mockReport]);

      await financialMetricsController.calculateEfficiencyMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: validCompanyId,
          period: '2024-Q4',
          cashConversionCycle: expect.any(Number),
          assetTurnover: expect.any(Number),
          inventoryTurnover: expect.any(Number)
        })
      );
    });

    it('should return 400 for invalid company ID', async () => {
      req.params.companyId = '';
      req.query.period = '2024-Q1';


      await financialMetricsController.calculateEfficiencyMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Invalid company ID' })
      );
    });

    it('should return 400 for invalid period format', async () => {
      req.params.companyId = validCompanyId;
      req.query.period = '24-Q1';


      await financialMetricsController.calculateEfficiencyMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when no financial data available', async () => {
      req.params.companyId = validCompanyId;
      req.query.period = '2024-Q1';

      FinancialReport.find.mockResolvedValue([]);

      await financialMetricsController.calculateEfficiencyMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should handle database errors', async () => {
      req.params.companyId = validCompanyId;
      req.query.period = '2024-Q1';

      FinancialReport.find.mockRejectedValue(new Error('Database error'));

      await financialMetricsController.calculateEfficiencyMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to calculate efficiency metrics' })
      );
    });
  });

  describe('calculateGrowthMetrics', () => {
    const validCompanyId = '507f1f77bcf86cd799439011';

    it('should calculate growth metrics with previous year comparison', async () => {
      req.params.companyId = validCompanyId;
      req.query = { period: '2024-Q1', compareWith: 'previous-year' };


      FinancialReport.find.mockResolvedValue([{
        data: { revenue: 100000, netIncome: 20000 }
      }]);

      await financialMetricsController.calculateGrowthMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: validCompanyId,
          currentPeriod: '2024-Q1'
        })
      );
    });

    it('should calculate growth metrics with previous quarter comparison', async () => {
      req.params.companyId = validCompanyId;
      req.query = { period: '2024-Q2', compareWith: 'previous-quarter' };


      FinancialReport.find.mockResolvedValue([{
        data: { revenue: 120000, netIncome: 25000 }
      }]);

      await financialMetricsController.calculateGrowthMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle Q1 with previous quarter comparison (rollover to previous year Q4)', async () => {
      req.params.companyId = validCompanyId;
      req.query = { period: '2024-Q1', compareWith: 'previous-quarter' };


      FinancialReport.find.mockResolvedValue([{
        data: { revenue: 100000, netIncome: 20000 }
      }]);

      await financialMetricsController.calculateGrowthMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for invalid company ID', async () => {
      req.params.companyId = 'invalid-id';
      req.query.period = '2024-Q1';


      await financialMetricsController.calculateGrowthMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Invalid company ID' })
      );
    });

    it('should return 400 for invalid period format', async () => {
      req.params.companyId = validCompanyId;
      req.query.period = 'invalid';


      await financialMetricsController.calculateGrowthMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle database errors', async () => {
      req.params.companyId = validCompanyId;
      req.query.period = '2024-Q1';

      FinancialReport.find.mockRejectedValue(new Error('Database error'));

      await financialMetricsController.calculateGrowthMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to calculate growth metrics' })
      );
    });
  });

  describe('calculateComprehensiveMetrics', () => {
    const validCompanyId = '507f1f77bcf86cd799439011';
    const mockCompany = {
      _id: validCompanyId,
      name: 'Test Company',
      isPublic: false
    };
    const mockReport = {
      companyId: validCompanyId,
      reportingPeriod: '2024-Q1',
      reportType: 'quarterly',
      revenue: { sales: 100000, services: 50000, other: 5000 },
      expenses: { salaries: 60000, marketing: 20000, operations: 15000, other: 5000 }
    };

    it('should calculate comprehensive metrics for private company', async () => {
      req.params.companyId = validCompanyId;
      req.query.period = '2024-Q1';

      Company.findById.mockResolvedValue(mockCompany);
      FinancialReport.find.mockResolvedValue([mockReport]);

      await financialMetricsController.calculateComprehensiveMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: validCompanyId,
          period: '2024-Q1'
        })
      );
    });

    it('should calculate comprehensive metrics including valuation for public company', async () => {
      req.params.companyId = validCompanyId;
      req.query.period = '2024-Q1';


      const publicCompany = { ...mockCompany, isPublic: true };
      Company.findById.mockResolvedValue(publicCompany);
      FinancialReport.find.mockResolvedValue([mockReport]);

      await financialMetricsController.calculateComprehensiveMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for invalid company ID', async () => {
      req.params.companyId = 'invalid-id';
      req.query.period = '2024-Q1';


      await financialMetricsController.calculateComprehensiveMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Invalid company ID' })
      );
    });

    it('should return 400 for invalid period format', async () => {
      req.params.companyId = validCompanyId;
      req.query.period = 'invalid';


      await financialMetricsController.calculateComprehensiveMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when company not found', async () => {
      req.params.companyId = validCompanyId;
      req.query.period = '2024-Q1';

      Company.findById.mockResolvedValue(null);

      await financialMetricsController.calculateComprehensiveMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Company not found' })
      );
    });

    it('should handle database errors', async () => {
      req.params.companyId = validCompanyId;
      req.query.period = '2024-Q1';

      Company.findById.mockRejectedValue(new Error('Database error'));

      await financialMetricsController.calculateComprehensiveMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to calculate comprehensive financial metrics' })
      );
    });
  });

  describe('getFinancialDashboard', () => {
    const validCompanyId = '507f1f77bcf86cd799439011';
    const mockReport = {
      revenue: 500000,
      grossProfit: 300000,
      operatingIncome: 150000,
      netIncome: 100000,
      currentAssets: 200000,
      currentLiabilities: 100000,
      totalLiabilities: 250000,
      totalEquity: 400000,
      totalAssets: 650000,
      inventory: 50000,
      costOfGoodsSold: 200000,
      interestExpense: 10000,
      periodEnd: new Date(),
      period: 'Q1 2024'
    };

    it('should return financial dashboard metrics', async () => {
      req.params.companyId = validCompanyId;

      FinancialReport.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockReport)
        })
      });

      await financialMetricsController.getFinancialDashboard(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            profitability: expect.any(Object),
            liquidity: expect.any(Object),
            solvency: expect.any(Object),
            efficiency: expect.any(Object)
          })
        })
      );
    });

    it('should return 404 when no financial data found', async () => {
      req.params.companyId = validCompanyId;

      FinancialReport.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null)
        })
      });

      await financialMetricsController.getFinancialDashboard(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'No financial data found for this company'
        })
      );
    });

    it('should handle database errors', async () => {
      req.params.companyId = validCompanyId;

      FinancialReport.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockRejectedValue(new Error('Database error'))
        })
      });

      await financialMetricsController.getFinancialDashboard(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Server error while retrieving financial dashboard'
        })
      );
    });
  });

  describe('Period Parsing Edge Cases', () => {
    const validCompanyId = '507f1f77bcf86cd799439011';

    beforeEach(() => {
      // IDs use valid 24-char hex format for ObjectId validation
    });

    it('should accept Q1 period format', async () => {
      req.params.companyId = validCompanyId;
      req.query.period = '2024-Q1';
      FinancialReport.find.mockResolvedValue([{}]);

      await financialMetricsController.calculateProfitabilityMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should accept Q2 period format', async () => {
      req.params.companyId = validCompanyId;
      req.query.period = '2024-Q2';
      FinancialReport.find.mockResolvedValue([{}]);

      await financialMetricsController.calculateProfitabilityMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should accept Q3 period format', async () => {
      req.params.companyId = validCompanyId;
      req.query.period = '2024-Q3';
      FinancialReport.find.mockResolvedValue([{}]);

      await financialMetricsController.calculateProfitabilityMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should accept Q4 period format', async () => {
      req.params.companyId = validCompanyId;
      req.query.period = '2024-Q4';
      FinancialReport.find.mockResolvedValue([{}]);

      await financialMetricsController.calculateProfitabilityMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should accept annual period format', async () => {
      req.params.companyId = validCompanyId;
      req.query.period = '2024-annual';
      FinancialReport.find.mockResolvedValue([{}]);

      await financialMetricsController.calculateProfitabilityMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should reject invalid quarter (Q5)', async () => {
      req.params.companyId = validCompanyId;
      req.query.period = '2024-Q5';

      await financialMetricsController.calculateProfitabilityMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reject invalid year format (3 digits)', async () => {
      req.params.companyId = validCompanyId;
      req.query.period = '202-Q1';

      await financialMetricsController.calculateProfitabilityMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reject empty period', async () => {
      req.params.companyId = validCompanyId;
      req.query.period = '';

      await financialMetricsController.calculateProfitabilityMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reject period with wrong separator', async () => {
      req.params.companyId = validCompanyId;
      req.query.period = '2024/Q1';

      await financialMetricsController.calculateProfitabilityMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});

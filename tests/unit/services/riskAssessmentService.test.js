/**
 * Risk Assessment Service Test Suite
 *
 * [Feature] Issue #44: Implement Enhanced Financial Services
 * Comprehensive test coverage for risk assessment features including:
 * - Financial risk scoring
 * - Anomaly detection in transactions
 * - Alert system for risk thresholds
 */

const riskAssessmentService = require('../../../services/riskAssessmentService');
const databaseAdapter = require('../../../services/databaseAdapter');

// Mock database adapter
jest.mock('../../../services/databaseAdapter');

describe('Risk Assessment Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock for initialized state
    databaseAdapter.initialized = true;
    databaseAdapter._checkInitialized = jest.fn();
  });

  describe('calculateRiskScore', () => {
    it('should calculate overall financial risk score', async () => {
      const companyId = 'COMP001';

      databaseAdapter.findOne = jest.fn().mockResolvedValue({
        companyId: 'COMP001',
        currentAssets: 500000,
        currentLiabilities: 200000,
        totalDebt: 300000,
        totalEquity: 700000,
        totalRevenue: 1000000,
        netIncome: 150000,
        operatingCashFlow: 200000,
        interestExpense: 30000
      });

      databaseAdapter.find = jest.fn().mockResolvedValue([
        { reportDate: new Date('2023-03-31'), totalRevenue: 250000, netIncome: 30000 },
        { reportDate: new Date('2023-06-30'), totalRevenue: 250000, netIncome: 35000 },
        { reportDate: new Date('2023-09-30'), totalRevenue: 250000, netIncome: 40000 },
        { reportDate: new Date('2023-12-31'), totalRevenue: 250000, netIncome: 45000 }
      ]);

      const result = await riskAssessmentService.calculateRiskScore(companyId);

      expect(result).toBeDefined();
      expect(result.companyId).toBe(companyId);
      expect(result.overallScore).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.riskLevel).toBeDefined();
      expect(result.components).toBeDefined();
    });

    it('should categorize risk level as low', async () => {
      const companyId = 'COMP001';

      databaseAdapter.findOne = jest.fn().mockResolvedValue({
        currentAssets: 1000000,
        currentLiabilities: 200000,
        totalDebt: 100000,
        totalEquity: 1500000,
        totalRevenue: 2000000,
        netIncome: 400000,
        operatingCashFlow: 500000,
        interestExpense: 5000
      });

      databaseAdapter.find = jest.fn().mockResolvedValue([
        { reportDate: new Date('2023-03-31'), totalRevenue: 450000, netIncome: 90000 },
        { reportDate: new Date('2023-06-30'), totalRevenue: 480000, netIncome: 95000 },
        { reportDate: new Date('2023-09-30'), totalRevenue: 510000, netIncome: 100000 },
        { reportDate: new Date('2023-12-31'), totalRevenue: 560000, netIncome: 115000 }
      ]);

      const result = await riskAssessmentService.calculateRiskScore(companyId);

      expect(result.riskLevel).toBe('low');
      expect(result.overallScore).toBeLessThan(30);
    });

    it('should categorize risk level as medium', async () => {
      const companyId = 'COMP002';

      databaseAdapter.findOne = jest.fn().mockResolvedValue({
        currentAssets: 220000,
        currentLiabilities: 200000,
        totalDebt: 600000,
        totalEquity: 400000,
        totalRevenue: 1000000,
        netIncome: 50000,
        operatingIncome: 80000,
        operatingCashFlow: 60000,
        interestExpense: 50000
      });

      databaseAdapter.find = jest.fn().mockResolvedValue([
        { reportDate: new Date('2023-03-31'), totalRevenue: 280000, netIncome: 12000 },
        { reportDate: new Date('2023-06-30'), totalRevenue: 250000, netIncome: 11000 },
        { reportDate: new Date('2023-09-30'), totalRevenue: 240000, netIncome: 13000 },
        { reportDate: new Date('2023-12-31'), totalRevenue: 230000, netIncome: 14000 }
      ]);

      const result = await riskAssessmentService.calculateRiskScore(companyId);

      expect(result.riskLevel).toBe('medium');
      expect(result.overallScore).toBeGreaterThanOrEqual(30);
      expect(result.overallScore).toBeLessThan(70);
    });

    it('should categorize risk level as high', async () => {
      const companyId = 'COMP003';

      databaseAdapter.findOne = jest.fn().mockResolvedValue({
        currentAssets: 100000,
        currentLiabilities: 200000,
        totalDebt: 800000,
        totalEquity: 100000,
        totalRevenue: 500000,
        netIncome: -50000,
        operatingCashFlow: -30000,
        interestExpense: 80000
      });

      databaseAdapter.find = jest.fn().mockResolvedValue([
        { reportDate: new Date('2023-03-31'), totalRevenue: 150000, netIncome: -10000 },
        { reportDate: new Date('2023-06-30'), totalRevenue: 130000, netIncome: -15000 },
        { reportDate: new Date('2023-09-30'), totalRevenue: 115000, netIncome: -12000 },
        { reportDate: new Date('2023-12-31'), totalRevenue: 105000, netIncome: -13000 }
      ]);

      const result = await riskAssessmentService.calculateRiskScore(companyId);

      expect(result.riskLevel).toBe('high');
      expect(result.overallScore).toBeGreaterThanOrEqual(70);
    });

    it('should calculate individual risk components', async () => {
      const companyId = 'COMP001';

      databaseAdapter.findOne = jest.fn().mockResolvedValue({
        currentAssets: 500000,
        currentLiabilities: 200000,
        totalDebt: 300000,
        totalEquity: 700000,
        totalRevenue: 1000000,
        netIncome: 150000,
        operatingCashFlow: 200000,
        interestExpense: 30000
      });

      databaseAdapter.find = jest.fn().mockResolvedValue([]);

      const result = await riskAssessmentService.calculateRiskScore(companyId);

      expect(result.components).toBeDefined();
      expect(result.components.liquidityRisk).toBeDefined();
      expect(result.components.leverageRisk).toBeDefined();
      expect(result.components.profitabilityRisk).toBeDefined();
      expect(result.components.cashFlowRisk).toBeDefined();
    });

    it('should throw error for missing company ID', async () => {
      await expect(riskAssessmentService.calculateRiskScore(null))
        .rejects.toThrow('Company ID is required');
    });

    it('should handle missing financial data', async () => {
      const companyId = 'COMP001';

      databaseAdapter.findOne = jest.fn().mockResolvedValue(null);
      databaseAdapter.find = jest.fn().mockResolvedValue([]);

      await expect(riskAssessmentService.calculateRiskScore(companyId))
        .rejects.toThrow('Financial data not found');
    });
  });

  describe('detectAnomalies', () => {
    it('should detect unusual transaction patterns', async () => {
      const companyId = 'COMP001';
      const options = { period: 'Q4-2023' };

      // Create data with clear anomaly - TX004 is 10x the mean
      databaseAdapter.find = jest.fn().mockResolvedValue([
        { transactionId: 'TX001', amount: 1000, type: 'expense', date: new Date('2023-10-15') },
        { transactionId: 'TX002', amount: 1000, type: 'expense', date: new Date('2023-10-20') },
        { transactionId: 'TX003', amount: 1000, type: 'expense', date: new Date('2023-11-01') },
        { transactionId: 'TX004', amount: 100000, type: 'expense', date: new Date('2023-11-15') }, // Clear anomaly - 100x typical
        { transactionId: 'TX005', amount: 1000, type: 'expense', date: new Date('2023-12-01') },
        { transactionId: 'TX006', amount: 1000, type: 'expense', date: new Date('2023-12-05') },
        { transactionId: 'TX007', amount: 1000, type: 'expense', date: new Date('2023-12-10') }
      ]);

      const result = await riskAssessmentService.detectAnomalies(companyId, options);

      expect(result).toBeDefined();
      expect(result.anomalies).toBeDefined();
      expect(result.anomalies.length).toBeGreaterThan(0);
      expect(result.anomalies[0].transactionId).toBe('TX004');
    });

    it('should detect volume anomalies', async () => {
      const companyId = 'COMP001';
      const options = { detectionType: 'volume' };

      // Normal daily transaction counts followed by an unusual spike
      databaseAdapter.find = jest.fn().mockResolvedValue([
        { transactionId: 'TX001', amount: 100, type: 'expense', date: new Date('2023-12-01') },
        { transactionId: 'TX002', amount: 100, type: 'expense', date: new Date('2023-12-01') },
        { transactionId: 'TX003', amount: 100, type: 'expense', date: new Date('2023-12-01') },
        { transactionId: 'TX004', amount: 100, type: 'expense', date: new Date('2023-12-02') },
        { transactionId: 'TX005', amount: 100, type: 'expense', date: new Date('2023-12-02') },
        // Spike day - many more transactions
        { transactionId: 'TX006', amount: 100, type: 'expense', date: new Date('2023-12-03') },
        { transactionId: 'TX007', amount: 100, type: 'expense', date: new Date('2023-12-03') },
        { transactionId: 'TX008', amount: 100, type: 'expense', date: new Date('2023-12-03') },
        { transactionId: 'TX009', amount: 100, type: 'expense', date: new Date('2023-12-03') },
        { transactionId: 'TX010', amount: 100, type: 'expense', date: new Date('2023-12-03') },
        { transactionId: 'TX011', amount: 100, type: 'expense', date: new Date('2023-12-03') },
        { transactionId: 'TX012', amount: 100, type: 'expense', date: new Date('2023-12-03') },
        { transactionId: 'TX013', amount: 100, type: 'expense', date: new Date('2023-12-03') },
        { transactionId: 'TX014', amount: 100, type: 'expense', date: new Date('2023-12-03') },
        { transactionId: 'TX015', amount: 100, type: 'expense', date: new Date('2023-12-03') }
      ]);

      const result = await riskAssessmentService.detectAnomalies(companyId, options);

      expect(result.volumeAnomalies).toBeDefined();
    });

    it('should detect timing anomalies', async () => {
      const companyId = 'COMP001';
      const options = { detectionType: 'timing' };

      databaseAdapter.find = jest.fn().mockResolvedValue([
        { transactionId: 'TX001', amount: 5000, type: 'expense', date: new Date('2023-12-15T10:30:00') },
        { transactionId: 'TX002', amount: 5000, type: 'expense', date: new Date('2023-12-15T11:00:00') },
        { transactionId: 'TX003', amount: 5000, type: 'expense', date: new Date('2023-12-15T02:30:00') }, // Unusual time
        { transactionId: 'TX004', amount: 5000, type: 'expense', date: new Date('2023-12-16T09:00:00') }
      ]);

      const result = await riskAssessmentService.detectAnomalies(companyId, options);

      expect(result.timingAnomalies).toBeDefined();
    });

    it('should calculate anomaly severity', async () => {
      const companyId = 'COMP001';

      // Need at least 5 data points for anomaly detection and clear anomaly
      databaseAdapter.find = jest.fn().mockResolvedValue([
        { transactionId: 'TX001', amount: 1000, type: 'expense', date: new Date('2023-12-01') },
        { transactionId: 'TX002', amount: 1000, type: 'expense', date: new Date('2023-12-02') },
        { transactionId: 'TX003', amount: 1000, type: 'expense', date: new Date('2023-12-03') },
        { transactionId: 'TX004', amount: 1000, type: 'expense', date: new Date('2023-12-04') },
        { transactionId: 'TX005', amount: 1000, type: 'expense', date: new Date('2023-12-05') },
        { transactionId: 'TX006', amount: 500000, type: 'expense', date: new Date('2023-12-06') } // Major anomaly 500x
      ]);

      const result = await riskAssessmentService.detectAnomalies(companyId);

      expect(result.anomalies[0]).toBeDefined();
      expect(result.anomalies[0].severity).toBeDefined();
      expect(['low', 'medium', 'high', 'critical']).toContain(result.anomalies[0].severity);
    });

    it('should return empty anomalies for normal data', async () => {
      const companyId = 'COMP001';

      databaseAdapter.find = jest.fn().mockResolvedValue([
        { transactionId: 'TX001', amount: 1000, type: 'expense', date: new Date('2023-12-01') },
        { transactionId: 'TX002', amount: 1050, type: 'expense', date: new Date('2023-12-02') },
        { transactionId: 'TX003', amount: 980, type: 'expense', date: new Date('2023-12-03') },
        { transactionId: 'TX004', amount: 1020, type: 'expense', date: new Date('2023-12-04') }
      ]);

      const result = await riskAssessmentService.detectAnomalies(companyId);

      expect(result.anomalies).toHaveLength(0);
    });

    it('should throw error for missing company ID', async () => {
      await expect(riskAssessmentService.detectAnomalies(null))
        .rejects.toThrow('Company ID is required');
    });
  });

  describe('createAlert', () => {
    it('should create risk alert for threshold breach', async () => {
      const companyId = 'COMP001';
      const alertData = {
        type: 'liquidity',
        threshold: 1.5,
        currentValue: 1.2,
        message: 'Current ratio below threshold'
      };

      databaseAdapter.create = jest.fn().mockResolvedValue({
        alertId: 'ALERT001',
        ...alertData,
        companyId,
        status: 'active',
        createdAt: new Date()
      });

      const result = await riskAssessmentService.createAlert(companyId, alertData);

      expect(result).toBeDefined();
      expect(result.alertId).toBeDefined();
      expect(result.type).toBe('liquidity');
      expect(result.status).toBe('active');
    });

    it('should categorize alert severity based on deviation', async () => {
      const companyId = 'COMP001';
      const alertData = {
        type: 'leverage',
        threshold: 2.0,
        currentValue: 5.0,
        message: 'Debt to equity ratio critically high'
      };

      databaseAdapter.create = jest.fn().mockResolvedValue({
        alertId: 'ALERT002',
        ...alertData,
        companyId,
        severity: 'critical',
        status: 'active',
        createdAt: new Date()
      });

      const result = await riskAssessmentService.createAlert(companyId, alertData);

      expect(result.severity).toBe('critical');
    });

    it('should prevent duplicate active alerts', async () => {
      const companyId = 'COMP001';
      const alertData = {
        type: 'liquidity',
        threshold: 1.5,
        currentValue: 1.2,
        message: 'Current ratio below threshold'
      };

      databaseAdapter.findOne = jest.fn().mockResolvedValue({
        alertId: 'ALERT001',
        type: 'liquidity',
        companyId,
        status: 'active'
      });

      const result = await riskAssessmentService.createAlert(companyId, alertData);

      expect(result.duplicate).toBe(true);
      expect(result.existingAlertId).toBe('ALERT001');
    });

    it('should create alert with custom severity', async () => {
      const companyId = 'COMP001';
      const alertData = {
        type: 'custom',
        severity: 'high',
        message: 'Custom risk alert'
      };

      databaseAdapter.findOne = jest.fn().mockResolvedValue(null);
      databaseAdapter.create = jest.fn().mockResolvedValue({
        alertId: 'ALERT003',
        ...alertData,
        companyId,
        status: 'active',
        createdAt: new Date()
      });

      const result = await riskAssessmentService.createAlert(companyId, alertData);

      expect(result.severity).toBe('high');
    });

    it('should throw error for missing company ID', async () => {
      await expect(riskAssessmentService.createAlert(null, {}))
        .rejects.toThrow('Company ID is required');
    });

    it('should throw error for missing alert type', async () => {
      await expect(riskAssessmentService.createAlert('COMP001', {}))
        .rejects.toThrow('Alert type is required');
    });
  });

  describe('getAlerts', () => {
    it('should retrieve active alerts for a company', async () => {
      const companyId = 'COMP001';

      databaseAdapter.find = jest.fn().mockResolvedValue([
        { alertId: 'ALERT001', type: 'liquidity', severity: 'medium', status: 'active' },
        { alertId: 'ALERT002', type: 'leverage', severity: 'high', status: 'active' }
      ]);

      const result = await riskAssessmentService.getAlerts(companyId);

      expect(result).toBeDefined();
      expect(result.alerts).toHaveLength(2);
    });

    it('should filter alerts by status', async () => {
      const companyId = 'COMP001';
      const options = { status: 'resolved' };

      databaseAdapter.find = jest.fn().mockResolvedValue([
        { alertId: 'ALERT001', type: 'liquidity', severity: 'medium', status: 'resolved' }
      ]);

      const result = await riskAssessmentService.getAlerts(companyId, options);

      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0].status).toBe('resolved');
    });

    it('should filter alerts by severity', async () => {
      const companyId = 'COMP001';
      const options = { severity: 'high' };

      databaseAdapter.find = jest.fn().mockResolvedValue([
        { alertId: 'ALERT002', type: 'leverage', severity: 'high', status: 'active' }
      ]);

      const result = await riskAssessmentService.getAlerts(companyId, options);

      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0].severity).toBe('high');
    });
  });

  describe('resolveAlert', () => {
    it('should resolve an active alert', async () => {
      const alertId = 'ALERT001';
      const resolution = {
        resolvedBy: 'user123',
        notes: 'Liquidity issue addressed'
      };

      databaseAdapter.findByIdAndUpdate = jest.fn().mockResolvedValue({
        alertId: 'ALERT001',
        status: 'resolved',
        resolvedAt: new Date(),
        ...resolution
      });

      const result = await riskAssessmentService.resolveAlert(alertId, resolution);

      expect(result.status).toBe('resolved');
      expect(result.resolvedAt).toBeDefined();
    });

    it('should throw error for invalid alert ID', async () => {
      databaseAdapter.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

      await expect(riskAssessmentService.resolveAlert('INVALID', {}))
        .rejects.toThrow('Alert not found');
    });
  });

  describe('getRiskSummary', () => {
    it('should return comprehensive risk summary', async () => {
      const companyId = 'COMP001';

      databaseAdapter.findOne = jest.fn().mockResolvedValue({
        currentAssets: 500000,
        currentLiabilities: 200000,
        totalDebt: 300000,
        totalEquity: 700000,
        totalRevenue: 1000000,
        netIncome: 150000,
        operatingCashFlow: 200000,
        interestExpense: 30000
      });

      databaseAdapter.find = jest.fn()
        .mockResolvedValueOnce([
          { reportDate: new Date('2023-12-31'), totalRevenue: 250000, netIncome: 40000 }
        ])
        .mockResolvedValueOnce([
          { transactionId: 'TX001', amount: 5000, type: 'expense', date: new Date('2023-12-15') }
        ])
        .mockResolvedValueOnce([
          { alertId: 'ALERT001', type: 'liquidity', severity: 'low', status: 'active' }
        ]);

      const result = await riskAssessmentService.getRiskSummary(companyId);

      expect(result).toBeDefined();
      expect(result.riskScore).toBeDefined();
      expect(result.anomalyCount).toBeDefined();
      expect(result.activeAlerts).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const companyId = 'COMP001';

      databaseAdapter.findOne = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      await expect(riskAssessmentService.calculateRiskScore(companyId))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('getAlerts - additional filters', () => {
    it('should throw error for missing company ID', async () => {
      await expect(riskAssessmentService.getAlerts(null))
        .rejects.toThrow('Company ID is required');
    });

    it('should filter alerts by type', async () => {
      databaseAdapter.find = jest.fn().mockResolvedValue([
        { alertId: 'ALERT001', type: 'liquidity', status: 'active' }
      ]);

      const result = await riskAssessmentService.getAlerts('COMP001', { type: 'liquidity' });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'RiskAlert',
        expect.objectContaining({ type: 'liquidity' }),
        expect.any(Object)
      );
      expect(result.count).toBe(1);
    });
  });

  describe('resolveAlert - missing alert ID', () => {
    it('should throw error for null alert ID', async () => {
      await expect(riskAssessmentService.resolveAlert(null))
        .rejects.toThrow('Alert ID is required');
    });
  });

  describe('getRiskSummary - missing company ID', () => {
    it('should throw error for missing company ID', async () => {
      await expect(riskAssessmentService.getRiskSummary(null))
        .rejects.toThrow('Company ID is required');
    });
  });

  describe('_calculateLiquidityRisk - branch coverage', () => {
    it('should score low risk for excellent liquidity (currentRatio > 2.0)', () => {
      const result = riskAssessmentService._calculateLiquidityRisk({
        currentAssets: 500000,
        currentLiabilities: 100000,
        inventory: 0
      });
      // currentRatio = 5.0, quickRatio = 5.0 -- both above low threshold
      expect(result.score).toBe(0);
      expect(result.assessment).toBe('low');
    });

    it('should score medium risk when currentRatio is between 1.5 and 2.0', () => {
      const result = riskAssessmentService._calculateLiquidityRisk({
        currentAssets: 180000,
        currentLiabilities: 100000,
        inventory: 0
      });
      // currentRatio = 1.8 (between medium 1.5 and low 2.0) -> 10
      // quickRatio = 1.8 (between low 1.5 and above) -> 0
      expect(result.score).toBe(10);
    });

    it('should score high risk for poor liquidity', () => {
      const result = riskAssessmentService._calculateLiquidityRisk({
        currentAssets: 80000,
        currentLiabilities: 100000,
        inventory: 50000
      });
      // currentRatio = 0.8 < high (1.0) -> 40
      // quickRatio = 0.3 < high (0.5) -> 40
      expect(result.score).toBe(80);
      expect(result.assessment).toBe('high');
    });

    it('should score medium for quickRatio between 1.0 and 1.5', () => {
      const result = riskAssessmentService._calculateLiquidityRisk({
        currentAssets: 300000,
        currentLiabilities: 100000,
        inventory: 180000
      });
      // currentRatio = 3.0 -> 0
      // quickRatio = 1.2 (between medium 1.0 and low 1.5) -> 10
      expect(result.score).toBe(10);
    });
  });

  describe('_calculateLeverageRisk - branch coverage', () => {
    it('should score low risk for low leverage', () => {
      const result = riskAssessmentService._calculateLeverageRisk({
        totalDebt: 100000,
        totalEquity: 1000000,
        interestExpense: 1000,
        operatingIncome: 100000
      });
      // debtToEquity = 0.1 < low (0.5) -> 0
      // interestCoverage = 100 > low (5.0) -> 0
      expect(result.score).toBe(0);
      expect(result.assessment).toBe('low');
    });

    it('should score medium for debtToEquity between 0.5 and 1.0', () => {
      const result = riskAssessmentService._calculateLeverageRisk({
        totalDebt: 700000,
        totalEquity: 1000000,
        interestExpense: 10000,
        operatingIncome: 30000
      });
      // debtToEquity = 0.7 (between low 0.5 and medium 1.0) -> 10
      // interestCoverage = 3.0 (between medium 2.5 and low 5.0) -> 10
      expect(result.score).toBe(20);
    });

    it('should score medium for debtToEquity between 1.0 and 2.0', () => {
      const result = riskAssessmentService._calculateLeverageRisk({
        totalDebt: 1500000,
        totalEquity: 1000000,
        interestExpense: 10000,
        operatingIncome: 100000
      });
      // debtToEquity = 1.5 (between medium 1.0 and high 2.0) -> 25
      // interestCoverage = 10 > low (5.0) -> 0
      expect(result.score).toBe(25);
    });

    it('should handle zero interest expense', () => {
      const result = riskAssessmentService._calculateLeverageRisk({
        totalDebt: 100000,
        totalEquity: 1000000,
        interestExpense: 0,
        operatingIncome: 100000
      });
      // interestCoverage = 999 (no interest expense)
      expect(result.interestCoverage).toBe(999);
    });

    it('should score high for interestCoverage below 1.5', () => {
      const result = riskAssessmentService._calculateLeverageRisk({
        totalDebt: 100000,
        totalEquity: 1000000,
        interestExpense: 100000,
        operatingIncome: 120000
      });
      // debtToEquity = 0.1 -> 0
      // interestCoverage = 1.2 < high (1.5) -> 40
      expect(result.score).toBe(40);
    });

    it('should score medium for interestCoverage between 1.5 and 2.5', () => {
      const result = riskAssessmentService._calculateLeverageRisk({
        totalDebt: 100000,
        totalEquity: 1000000,
        interestExpense: 100000,
        operatingIncome: 200000
      });
      // interestCoverage = 2.0 (between high 1.5 and medium 2.5) -> 25
      expect(result.score).toBe(25);
    });
  });

  describe('_calculateProfitabilityRisk - branch coverage', () => {
    it('should return score 10 for high net margin (> 15%)', () => {
      const result = riskAssessmentService._calculateProfitabilityRisk({
        netIncome: 200000,
        totalRevenue: 1000000
      });
      // netMargin = 20% > low (15) -> 10
      expect(result.score).toBe(10);
      expect(result.assessment).toBe('low');
    });

    it('should return score 25 for net margin between 8% and 15%', () => {
      const result = riskAssessmentService._calculateProfitabilityRisk({
        netIncome: 100000,
        totalRevenue: 1000000
      });
      // netMargin = 10% (between medium 8 and low 15) -> 25
      expect(result.score).toBe(25);
      expect(result.assessment).toBe('low');
    });

    it('should return score 50 for net margin between 3% and 8%', () => {
      const result = riskAssessmentService._calculateProfitabilityRisk({
        netIncome: 50000,
        totalRevenue: 1000000
      });
      // netMargin = 5% (between high 3 and medium 8) -> 50
      expect(result.score).toBe(50);
      expect(result.assessment).toBe('medium');
    });

    it('should return score 80 for net margin below 3%', () => {
      const result = riskAssessmentService._calculateProfitabilityRisk({
        netIncome: 20000,
        totalRevenue: 1000000
      });
      // netMargin = 2% < high (3) -> 80
      expect(result.score).toBe(80);
      expect(result.assessment).toBe('high');
    });

    it('should return score 100 for negative net margin', () => {
      const result = riskAssessmentService._calculateProfitabilityRisk({
        netIncome: -50000,
        totalRevenue: 1000000
      });
      expect(result.score).toBe(100);
      expect(result.assessment).toBe('high');
    });
  });

  describe('_calculateCashFlowRisk - branch coverage', () => {
    it('should score 0 for healthy cash flow', () => {
      const result = riskAssessmentService._calculateCashFlowRisk({
        operatingCashFlow: 500000,
        totalDebt: 100000,
        netIncome: 400000
      });
      // cashFlowToDebt = 5.0 >= 0.4 -> 0
      // cashFlowQuality = 1.25 >= 0.8 -> 0
      expect(result.score).toBe(0);
      expect(result.assessment).toBe('low');
    });

    it('should score for moderate cash flow to debt ratio (0.2-0.4)', () => {
      const result = riskAssessmentService._calculateCashFlowRisk({
        operatingCashFlow: 30000,
        totalDebt: 100000,
        netIncome: 30000
      });
      // cashFlowToDebt = 0.3 (between 0.2 and 0.4) -> 20
      // cashFlowQuality = 1.0 >= 0.8 -> 0
      expect(result.score).toBe(20);
    });

    it('should score for low cash flow to debt ratio (< 0.2)', () => {
      const result = riskAssessmentService._calculateCashFlowRisk({
        operatingCashFlow: 15000,
        totalDebt: 100000,
        netIncome: 15000
      });
      // cashFlowToDebt = 0.15 < 0.2 -> 35
      // cashFlowQuality = 1.0 >= 0.8 -> 0
      expect(result.score).toBe(35);
    });

    it('should score for poor cash flow quality (< 0.8)', () => {
      const result = riskAssessmentService._calculateCashFlowRisk({
        operatingCashFlow: 70000,
        totalDebt: 100000,
        netIncome: 100000
      });
      // cashFlowToDebt = 0.7 >= 0.4 -> 0
      // cashFlowQuality = 0.7 (between 0.5 and 0.8) -> 15
      expect(result.score).toBe(15);
    });

    it('should score for very poor cash flow quality (< 0.5)', () => {
      const result = riskAssessmentService._calculateCashFlowRisk({
        operatingCashFlow: 40000,
        totalDebt: 100000,
        netIncome: 100000
      });
      // cashFlowToDebt = 0.4 >= 0.4 -> 0
      // cashFlowQuality = 0.4 < 0.5 -> 30
      expect(result.score).toBe(30);
      expect(result.assessment).toBe('medium');
    });

    it('should handle zero total debt', () => {
      const result = riskAssessmentService._calculateCashFlowRisk({
        operatingCashFlow: 100000,
        totalDebt: 0,
        netIncome: 100000
      });
      expect(result.cashFlowToDebt).toBe(999);
    });

    it('should handle zero netIncome', () => {
      const result = riskAssessmentService._calculateCashFlowRisk({
        operatingCashFlow: 100000,
        totalDebt: 100000,
        netIncome: 0
      });
      expect(result.cashFlowQuality).toBe(1);
    });
  });

  describe('_calculateVolatilityRisk - branch coverage', () => {
    it('should return insufficient_data for less than 3 data points', () => {
      const result = riskAssessmentService._calculateVolatilityRisk([
        { totalRevenue: 100000 }
      ]);
      expect(result.assessment).toBe('insufficient_data');
      expect(result.volatility).toBeNull();
    });

    it('should return insufficient_data for null input', () => {
      const result = riskAssessmentService._calculateVolatilityRisk(null);
      expect(result.assessment).toBe('insufficient_data');
    });

    it('should score low for low volatility (< 0.1)', () => {
      const result = riskAssessmentService._calculateVolatilityRisk([
        { totalRevenue: 100000 },
        { totalRevenue: 100500 },
        { totalRevenue: 99500 }
      ]);
      // Very stable revenue -> low volatility
      expect(result.score).toBeLessThanOrEqual(20);
    });

    it('should score medium for moderate volatility (0.1 - 0.2)', () => {
      const result = riskAssessmentService._calculateVolatilityRisk([
        { totalRevenue: 100000 },
        { totalRevenue: 80000 },
        { totalRevenue: 120000 }
      ]);
      // Moderate variation
      expect(result.volatility).toBeGreaterThan(0.1);
    });

    it('should score high for high volatility (> 0.3)', () => {
      const result = riskAssessmentService._calculateVolatilityRisk([
        { totalRevenue: 50000 },
        { totalRevenue: 200000 },
        { totalRevenue: 30000 },
        { totalRevenue: 180000 }
      ]);
      // High variation -> high volatility
      expect(result.volatility).toBeGreaterThan(0.3);
      expect(result.score).toBe(70);
    });
  });

  describe('_calculateCoeffientOfVariation', () => {
    it('should return 0 for single value', () => {
      const result = riskAssessmentService._calculateCoeffientOfVariation([100]);
      expect(result).toBe(0);
    });

    it('should return 0 when mean is zero', () => {
      const result = riskAssessmentService._calculateCoeffientOfVariation([0, 0, 0]);
      expect(result).toBe(0);
    });

    it('should calculate coefficient of variation correctly', () => {
      const result = riskAssessmentService._calculateCoeffientOfVariation([10, 20, 30]);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('_detectAmountAnomalies - edge cases', () => {
    it('should handle transactions with zero standard deviation', () => {
      const transactions = [
        { transactionId: 'T1', amount: 100, date: new Date(), type: 'expense' },
        { transactionId: 'T2', amount: 100, date: new Date(), type: 'expense' },
        { transactionId: 'T3', amount: 100, date: new Date(), type: 'expense' },
        { transactionId: 'T4', amount: 100, date: new Date(), type: 'expense' },
        { transactionId: 'T5', amount: 100, date: new Date(), type: 'expense' }
      ];

      const result = riskAssessmentService._detectAmountAnomalies(transactions);
      expect(result).toEqual([]);
    });
  });

  describe('_detectVolumeAnomalies - edge cases', () => {
    it('should return empty array for fewer than 3 days of data', () => {
      const transactions = [
        { transactionId: 'T1', amount: 100, date: new Date('2023-12-01'), type: 'expense' },
        { transactionId: 'T2', amount: 100, date: new Date('2023-12-02'), type: 'expense' }
      ];

      const result = riskAssessmentService._detectVolumeAnomalies(transactions);
      expect(result).toEqual([]);
    });

    it('should detect volume anomaly when one day has significantly more transactions', () => {
      const transactions = [];
      // 10 normal days with 1 transaction each to establish a stable baseline
      for (let i = 1; i <= 10; i++) {
        const day = i < 10 ? `0${i}` : `${i}`;
        transactions.push({ transactionId: `T${i}`, amount: 100, date: new Date(`2023-12-${day}`), type: 'expense' });
      }
      // 1 anomalous day with 50 transactions (massive spike vs baseline of 1/day)
      for (let i = 0; i < 50; i++) {
        transactions.push({ transactionId: `A${i}`, amount: 100, date: new Date('2023-12-11'), type: 'expense' });
      }

      const result = riskAssessmentService._detectVolumeAnomalies(transactions);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].date).toBe('2023-12-11');
    });
  });

  describe('_detectTimingAnomalies - edge cases', () => {
    it('should flag transactions before 8 AM with appropriate severity', () => {
      const transactions = [
        { transactionId: 'T1', amount: 100, date: new Date('2023-12-15T03:00:00'), type: 'expense' }
      ];

      const result = riskAssessmentService._detectTimingAnomalies(transactions);
      expect(result).toHaveLength(1);
      expect(result[0].severity).toBe('high');
    });

    it('should flag transactions after 6 PM with medium severity', () => {
      const transactions = [
        { transactionId: 'T1', amount: 100, date: new Date('2023-12-15T20:00:00'), type: 'expense' }
      ];

      const result = riskAssessmentService._detectTimingAnomalies(transactions);
      expect(result).toHaveLength(1);
      expect(result[0].severity).toBe('medium');
    });

    it('should not flag transactions during business hours', () => {
      const transactions = [
        { transactionId: 'T1', amount: 100, date: new Date('2023-12-15T10:00:00'), type: 'expense' },
        { transactionId: 'T2', amount: 100, date: new Date('2023-12-15T14:00:00'), type: 'expense' }
      ];

      const result = riskAssessmentService._detectTimingAnomalies(transactions);
      expect(result).toHaveLength(0);
    });
  });

  describe('_getAnomalySeverity', () => {
    it('should return critical for z-score > 4', () => {
      expect(riskAssessmentService._getAnomalySeverity(4.5)).toBe('critical');
    });

    it('should return high for z-score between 3.5 and 4', () => {
      expect(riskAssessmentService._getAnomalySeverity(3.7)).toBe('high');
    });

    it('should return medium for z-score between 3 and 3.5', () => {
      expect(riskAssessmentService._getAnomalySeverity(3.2)).toBe('medium');
    });

    it('should return low for z-score <= 3', () => {
      expect(riskAssessmentService._getAnomalySeverity(2.5)).toBe('low');
    });
  });

  describe('_calculateAlertSeverity', () => {
    it('should return critical for deviation > 1.0', () => {
      const result = riskAssessmentService._calculateAlertSeverity({
        threshold: 100,
        currentValue: 300
      });
      expect(result).toBe('critical');
    });

    it('should return high for deviation 0.5-1.0', () => {
      const result = riskAssessmentService._calculateAlertSeverity({
        threshold: 100,
        currentValue: 170
      });
      expect(result).toBe('high');
    });

    it('should return medium for deviation 0.25-0.5', () => {
      const result = riskAssessmentService._calculateAlertSeverity({
        threshold: 100,
        currentValue: 135
      });
      expect(result).toBe('medium');
    });

    it('should return low for deviation < 0.25', () => {
      const result = riskAssessmentService._calculateAlertSeverity({
        threshold: 100,
        currentValue: 110
      });
      expect(result).toBe('low');
    });

    it('should return medium when threshold or currentValue is missing', () => {
      expect(riskAssessmentService._calculateAlertSeverity({})).toBe('medium');
      expect(riskAssessmentService._calculateAlertSeverity({ threshold: 100 })).toBe('medium');
    });
  });

  describe('_parsePeriod', () => {
    it('should parse Q1 correctly', () => {
      const result = riskAssessmentService._parsePeriod('Q1-2023');
      expect(result.start.getMonth()).toBe(0); // January
      expect(result.end.getMonth()).toBe(2);   // March
    });

    it('should parse Q4 correctly', () => {
      const result = riskAssessmentService._parsePeriod('Q4-2023');
      expect(result.start.getMonth()).toBe(9);  // October
      expect(result.end.getMonth()).toBe(11);   // December
    });

    it('should return null for invalid period format', () => {
      expect(riskAssessmentService._parsePeriod('2023-Q1')).toBeNull();
      expect(riskAssessmentService._parsePeriod('invalid')).toBeNull();
    });
  });

  describe('_generateAlertId', () => {
    it('should generate alert IDs starting with ALERT-', () => {
      const id = riskAssessmentService._generateAlertId();
      expect(id).toMatch(/^ALERT-/);
    });

    it('should generate unique alert IDs', () => {
      const id1 = riskAssessmentService._generateAlertId();
      const id2 = riskAssessmentService._generateAlertId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('_generateRiskSummaryText', () => {
    it('should include anomaly count when anomalies exist', () => {
      const result = riskAssessmentService._generateRiskSummaryText(
        { riskLevel: 'medium', overallScore: 50, components: { liquidityRisk: { score: 30 } } },
        { anomalies: [{ id: 1 }, { id: 2 }] },
        { count: 0, alerts: [] }
      );
      expect(result).toContain('2 transaction anomalies detected');
    });

    it('should include active alert count when alerts exist', () => {
      const result = riskAssessmentService._generateRiskSummaryText(
        { riskLevel: 'high', overallScore: 80, components: { leverageRisk: { score: 70 } } },
        { anomalies: [] },
        { count: 3, alerts: [{}, {}, {}] }
      );
      expect(result).toContain('3 active risk alerts');
    });

    it('should include primary concern when highest component score > 50', () => {
      const result = riskAssessmentService._generateRiskSummaryText(
        {
          riskLevel: 'high',
          overallScore: 75,
          components: {
            liquidityRisk: { score: 80 },
            leverageRisk: { score: 30 },
            profitabilityRisk: { score: 20 },
            cashFlowRisk: { score: 10 },
            volatilityRisk: { score: 5 }
          }
        },
        { anomalies: [] },
        { count: 0, alerts: [] }
      );
      expect(result).toContain('Primary concern: liquidity');
    });

    it('should not include primary concern when all scores are low', () => {
      const result = riskAssessmentService._generateRiskSummaryText(
        {
          riskLevel: 'low',
          overallScore: 15,
          components: {
            liquidityRisk: { score: 10 },
            leverageRisk: { score: 20 }
          }
        },
        { anomalies: [] },
        { count: 0, alerts: [] }
      );
      expect(result).not.toContain('Primary concern');
    });
  });

  describe('detectAnomalies - period parsing', () => {
    it('should handle period filter in query', async () => {
      databaseAdapter.find = jest.fn().mockResolvedValue([]);

      await riskAssessmentService.detectAnomalies('COMP001', { period: 'Q2-2023' });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'Transaction',
        expect.objectContaining({
          companyId: 'COMP001',
          date: expect.any(Object)
        }),
        expect.any(Object)
      );
    });

    it('should handle invalid period format', async () => {
      databaseAdapter.find = jest.fn().mockResolvedValue([]);

      await riskAssessmentService.detectAnomalies('COMP001', { period: 'invalid' });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'Transaction',
        { companyId: 'COMP001' },
        expect.any(Object)
      );
    });

    it('should return insufficient data message for small dataset', async () => {
      databaseAdapter.find = jest.fn().mockResolvedValue([
        { transactionId: 'T1', amount: 100, date: new Date(), type: 'expense' }
      ]);

      const result = await riskAssessmentService.detectAnomalies('COMP001');

      expect(result.message).toBe('Insufficient data for anomaly detection');
      expect(result.analyzedTransactions).toBe(1);
    });

    it('should detect only amount anomalies when detectionType is amount', async () => {
      // Need enough data points with a clear outlier to exceed z-score threshold of 2.0
      databaseAdapter.find = jest.fn().mockResolvedValue([
        { transactionId: 'T1', amount: 100, date: new Date('2023-12-01T10:00:00'), type: 'expense' },
        { transactionId: 'T2', amount: 100, date: new Date('2023-12-02T10:00:00'), type: 'expense' },
        { transactionId: 'T3', amount: 100, date: new Date('2023-12-03T10:00:00'), type: 'expense' },
        { transactionId: 'T4', amount: 100, date: new Date('2023-12-04T10:00:00'), type: 'expense' },
        { transactionId: 'T5', amount: 100, date: new Date('2023-12-05T10:00:00'), type: 'expense' },
        { transactionId: 'T6', amount: 100, date: new Date('2023-12-06T10:00:00'), type: 'expense' },
        { transactionId: 'T7', amount: 100, date: new Date('2023-12-07T10:00:00'), type: 'expense' },
        { transactionId: 'T8', amount: 500000, date: new Date('2023-12-08T10:00:00'), type: 'expense' }
      ]);

      const result = await riskAssessmentService.detectAnomalies('COMP001', { detectionType: 'amount' });

      expect(result.anomalies.length).toBeGreaterThan(0);
      expect(result.volumeAnomalies).toEqual([]);
      expect(result.timingAnomalies).toEqual([]);
    });
  });
});

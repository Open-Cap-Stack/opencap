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
});

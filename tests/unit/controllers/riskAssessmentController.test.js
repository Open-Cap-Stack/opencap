/**
 * Risk Assessment Controller Test Suite
 *
 * [Feature] Issue #44: Implement Enhanced Financial Services
 * Tests for risk assessment controller endpoints
 */

const riskAssessmentController = require('../../../controllers/riskAssessmentController');
const riskAssessmentService = require('../../../services/riskAssessmentService');

// Mock the service
jest.mock('../../../services/riskAssessmentService');

describe('Risk Assessment Controller', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { id: 'user123' }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('getRiskScore', () => {
    it('should get risk score successfully', async () => {
      mockReq.params = { companyId: 'COMP001' };

      const expectedResult = {
        companyId: 'COMP001',
        overallScore: 35,
        riskLevel: 'medium',
        components: {}
      };

      riskAssessmentService.calculateRiskScore.mockResolvedValue(expectedResult);

      await riskAssessmentController.getRiskScore(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expectedResult);
    });

    it('should return 400 for missing company ID', async () => {
      mockReq.params = {};

      await riskAssessmentController.getRiskScore(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Company ID is required' });
    });

    it('should return 404 for missing financial data', async () => {
      mockReq.params = { companyId: 'COMP001' };

      riskAssessmentService.calculateRiskScore.mockRejectedValue(
        new Error('Financial data not found')
      );

      await riskAssessmentController.getRiskScore(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('calculateRiskScore', () => {
    it('should calculate risk score with options', async () => {
      mockReq.body = {
        companyId: 'COMP001',
        options: { includeHistorical: true }
      };

      const expectedResult = {
        companyId: 'COMP001',
        overallScore: 45,
        riskLevel: 'medium'
      };

      riskAssessmentService.calculateRiskScore.mockResolvedValue(expectedResult);

      await riskAssessmentController.calculateRiskScore(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expectedResult);
    });

    it('should return 400 for missing company ID', async () => {
      mockReq.body = { options: {} };

      await riskAssessmentController.calculateRiskScore(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getAnomalies', () => {
    it('should get anomalies successfully', async () => {
      mockReq.params = { companyId: 'COMP001' };
      mockReq.query = { period: 'Q4-2023' };

      const expectedResult = {
        companyId: 'COMP001',
        anomalies: [{ transactionId: 'TX001', amount: 50000 }]
      };

      riskAssessmentService.detectAnomalies.mockResolvedValue(expectedResult);

      await riskAssessmentController.getAnomalies(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expectedResult);
    });

    it('should return 400 for missing company ID', async () => {
      mockReq.params = {};

      await riskAssessmentController.getAnomalies(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('detectAnomalies', () => {
    it('should detect anomalies with custom options', async () => {
      mockReq.body = {
        companyId: 'COMP001',
        period: 'Q4-2023',
        detectionType: 'amount'
      };

      const expectedResult = {
        companyId: 'COMP001',
        anomalies: []
      };

      riskAssessmentService.detectAnomalies.mockResolvedValue(expectedResult);

      await riskAssessmentController.detectAnomalies(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for missing company ID', async () => {
      mockReq.body = { period: 'Q4-2023' };

      await riskAssessmentController.detectAnomalies(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('createAlert', () => {
    it('should create alert successfully', async () => {
      mockReq.body = {
        companyId: 'COMP001',
        type: 'liquidity',
        threshold: 1.5,
        currentValue: 1.2,
        message: 'Current ratio below threshold'
      };

      const expectedResult = {
        alertId: 'ALERT001',
        companyId: 'COMP001',
        type: 'liquidity',
        status: 'active'
      };

      riskAssessmentService.createAlert.mockResolvedValue(expectedResult);

      await riskAssessmentController.createAlert(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(expectedResult);
    });

    it('should return 409 for duplicate alert', async () => {
      mockReq.body = {
        companyId: 'COMP001',
        type: 'liquidity'
      };

      riskAssessmentService.createAlert.mockResolvedValue({
        duplicate: true,
        existingAlertId: 'ALERT001'
      });

      await riskAssessmentController.createAlert(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
    });

    it('should return 400 for missing company ID', async () => {
      mockReq.body = { type: 'liquidity' };

      await riskAssessmentController.createAlert(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for missing alert type', async () => {
      mockReq.body = { companyId: 'COMP001' };

      await riskAssessmentController.createAlert(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Alert type is required' });
    });
  });

  describe('getAlerts', () => {
    it('should get alerts successfully', async () => {
      mockReq.params = { companyId: 'COMP001' };
      mockReq.query = { status: 'active' };

      const expectedResult = {
        companyId: 'COMP001',
        alerts: [{ alertId: 'ALERT001' }],
        count: 1
      };

      riskAssessmentService.getAlerts.mockResolvedValue(expectedResult);

      await riskAssessmentController.getAlerts(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expectedResult);
    });

    it('should return 400 for missing company ID', async () => {
      mockReq.params = {};

      await riskAssessmentController.getAlerts(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('resolveAlert', () => {
    it('should resolve alert successfully', async () => {
      mockReq.params = { alertId: 'ALERT001' };
      mockReq.body = { notes: 'Issue resolved' };

      const expectedResult = {
        alertId: 'ALERT001',
        status: 'resolved',
        resolvedAt: new Date()
      };

      riskAssessmentService.resolveAlert.mockResolvedValue(expectedResult);

      await riskAssessmentController.resolveAlert(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expectedResult);
    });

    it('should return 400 for missing alert ID', async () => {
      mockReq.params = {};

      await riskAssessmentController.resolveAlert(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Alert ID is required' });
    });

    it('should return 404 for non-existent alert', async () => {
      mockReq.params = { alertId: 'INVALID' };

      riskAssessmentService.resolveAlert.mockRejectedValue(
        new Error('Alert not found')
      );

      await riskAssessmentController.resolveAlert(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getRiskSummary', () => {
    it('should get risk summary successfully', async () => {
      mockReq.params = { companyId: 'COMP001' };

      const expectedResult = {
        companyId: 'COMP001',
        riskScore: 35,
        riskLevel: 'medium',
        anomalyCount: 2,
        activeAlertCount: 1
      };

      riskAssessmentService.getRiskSummary.mockResolvedValue(expectedResult);

      await riskAssessmentController.getRiskSummary(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expectedResult);
    });

    it('should return 400 for missing company ID', async () => {
      mockReq.params = {};

      await riskAssessmentController.getRiskSummary(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});

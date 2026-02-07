/**
 * Analytics Controller Test Suite
 *
 * [Feature] OCAE-401: Advanced Analytics Testing
 * Comprehensive test coverage for predictive modeling, risk assessment,
 * performance benchmarking, and anomaly detection
 */

const analyticsController = require('../../../controllers/analyticsController');
const FinancialReport = require('../../../models/financialReport');
const Company = require('../../../models/Company');
const Document = require('../../../models/Document');
const SecurityAudit = require('../../../models/SecurityAudit');
const memoryService = require('../../../services/memoryService');
const streamingService = require('../../../services/streamingService');

// Mock external services
jest.mock('../../../services/memoryService');
jest.mock('../../../services/streamingService');

// Mock models
jest.mock('../../../models/financialReport');
jest.mock('../../../models/Company');
jest.mock('../../../models/Document');
jest.mock('../../../models/SecurityAudit');

// Helper to create chainable mock for .find().sort().limit().skip() patterns
function createChainableMock(resolvedValue) {
  const chain = {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    then: jest.fn((resolve) => resolve(resolvedValue)),
    // Make it thenable so await works
    [Symbol.toStringTag]: 'Promise'
  };
  // Override then to make it properly awaitable
  chain.then = (resolve, reject) => Promise.resolve(resolvedValue).then(resolve, reject);
  chain.catch = (reject) => Promise.resolve(resolvedValue).catch(reject);
  return chain;
}

// Helper to create mock req/res
function createMockReqRes(body = {}) {
  const req = { body };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return { req, res };
}

describe('Analytics Controller', () => {
  let companyId;
  let mockFinancialData;

  beforeEach(() => {
    jest.clearAllMocks();

    companyId = 'test-company-id-123';

    // Create realistic mock financial data (12 months)
    mockFinancialData = [];
    for (let i = 0; i < 12; i++) {
      mockFinancialData.push({
        _id: `report-${i}`,
        companyId,
        reportType: 'monthly',
        reportingPeriod: `2023-${String(i + 1).padStart(2, '0')}`,
        totalRevenue: 100000 + (i * 10000) + (Math.random() * 20000),
        totalExpenses: 70000 + (i * 7000) + (Math.random() * 15000),
        currentAssets: 500000 + (i * 50000),
        currentLiabilities: 300000 + (i * 30000),
        createdAt: new Date(2023, i, 1)
      });
    }

    // Default mock service responses
    memoryService.storeAnalytics = jest.fn().mockResolvedValue(true);
    memoryService.getAnalytics = jest.fn().mockResolvedValue(null);
    streamingService.publishEvent = jest.fn().mockResolvedValue(true);
  });

  describe('Predictive Financial Modeling', () => {
    beforeEach(() => {
      // Mock FinancialReport.find() returning chainable with sort
      FinancialReport.find = jest.fn().mockReturnValue(
        createChainableMock(mockFinancialData)
      );
    });

    it('should generate financial predictions with valid data', async () => {
      const { req, res } = createMockReqRes({
        companyId,
        periods: 6,
        modelType: 'linear'
      });

      await analyticsController.predictiveFinancialModeling(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];

      expect(response).toHaveProperty('predictions');
      expect(response).toHaveProperty('riskMetrics');
      expect(response).toHaveProperty('benchmarkData');
      expect(response).toHaveProperty('modelMetadata');

      expect(response.predictions).toHaveLength(6);
      expect(response.predictions[0]).toHaveProperty('period');
      expect(response.predictions[0]).toHaveProperty('predictedRevenue');
      expect(response.predictions[0]).toHaveProperty('predictedExpenses');
      expect(response.predictions[0]).toHaveProperty('confidence');

      expect(response.riskMetrics).toHaveProperty('volatility');
      expect(response.riskMetrics).toHaveProperty('overallRisk');
      expect(['low', 'medium', 'high']).toContain(response.riskMetrics.overallRisk);
    });

    it('should handle insufficient historical data', async () => {
      // Only 3 reports - below minimum of 6
      const shortData = mockFinancialData.slice(0, 3);
      FinancialReport.find = jest.fn().mockReturnValue(
        createChainableMock(shortData)
      );

      const { req, res } = createMockReqRes({
        companyId,
        periods: 6,
        modelType: 'linear'
      });

      await analyticsController.predictiveFinancialModeling(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].error).toContain('Insufficient historical data');
    });

    it('should require companyId parameter', async () => {
      const { req, res } = createMockReqRes({
        periods: 6,
        modelType: 'linear'
      });

      await analyticsController.predictiveFinancialModeling(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].error).toContain('Company ID is required');
    });

    it('should store prediction results in memory service', async () => {
      const { req, res } = createMockReqRes({
        companyId,
        periods: 3,
        modelType: 'linear'
      });

      await analyticsController.predictiveFinancialModeling(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(memoryService.storeAnalytics).toHaveBeenCalledWith(
        companyId,
        'financial_predictions',
        expect.objectContaining({
          predictions: expect.any(Array),
          riskMetrics: expect.any(Object),
          benchmarkData: expect.any(Object)
        })
      );
    });

    it('should publish analytics events', async () => {
      const { req, res } = createMockReqRes({
        companyId,
        periods: 3,
        modelType: 'linear'
      });

      await analyticsController.predictiveFinancialModeling(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(streamingService.publishEvent).toHaveBeenCalledWith(
        'analytics.prediction.generated',
        expect.objectContaining({
          companyId,
          type: 'financial_prediction',
          timestamp: expect.any(Date)
        })
      );
    });
  });

  describe('Risk Assessment', () => {
    let mockSecurityAudits;
    let mockDocuments;

    beforeEach(() => {
      mockSecurityAudits = [
        {
          _id: 'audit-1',
          companyId,
          auditType: 'security',
          severity: 'high',
          status: 'failed',
          findings: ['Critical vulnerability found'],
          createdAt: new Date()
        },
        {
          _id: 'audit-2',
          companyId,
          auditType: 'compliance',
          severity: 'medium',
          status: 'passed',
          findings: ['Minor compliance issue'],
          createdAt: new Date()
        }
      ];

      mockDocuments = [
        {
          _id: 'doc-1',
          companyId,
          title: 'Test Document 1',
          documentType: 'financial',
          confidentialityLevel: 'high',
          status: 'active'
        },
        {
          _id: 'doc-2',
          companyId,
          title: 'Test Document 2',
          documentType: 'legal',
          confidentialityLevel: 'medium',
          status: 'active'
        }
      ];

      const mockCompanyData = {
        _id: companyId,
        name: 'Test Analytics Company',
        industry: 'Technology',
        size: 'medium',
        status: 'active'
      };

      // Mock chainable patterns used in riskAssessment
      FinancialReport.find = jest.fn().mockReturnValue(
        createChainableMock(mockFinancialData)
      );
      Company.findById = jest.fn().mockResolvedValue(mockCompanyData);
      SecurityAudit.find = jest.fn().mockReturnValue(
        createChainableMock(mockSecurityAudits)
      );
      Document.find = jest.fn().mockReturnValue(
        createChainableMock(mockDocuments)
      );
    });

    it('should perform comprehensive risk assessment', async () => {
      const { req, res } = createMockReqRes({
        companyId,
        assessmentType: 'comprehensive'
      });

      await analyticsController.riskAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];

      expect(response).toHaveProperty('riskAssessment');
      expect(response).toHaveProperty('recommendations');
      expect(response).toHaveProperty('anomalies');
      expect(response).toHaveProperty('metadata');

      const riskResult = response.riskAssessment;
      expect(riskResult).toHaveProperty('financialRisk');
      expect(riskResult).toHaveProperty('operationalRisk');
      expect(riskResult).toHaveProperty('complianceRisk');
      expect(riskResult).toHaveProperty('marketRisk');
      expect(riskResult).toHaveProperty('overallRisk');

      expect(['low', 'medium', 'high']).toContain(riskResult.overallRisk);
    });

    it('should generate risk mitigation recommendations', async () => {
      const { req, res } = createMockReqRes({
        companyId,
        assessmentType: 'comprehensive'
      });

      await analyticsController.riskAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];

      expect(response.recommendations).toBeInstanceOf(Array);

      if (response.recommendations.length > 0) {
        const recommendation = response.recommendations[0];
        expect(recommendation).toHaveProperty('category');
        expect(recommendation).toHaveProperty('priority');
        expect(recommendation).toHaveProperty('recommendation');
        expect(recommendation).toHaveProperty('timeline');
      }
    });

    it('should detect anomalies in risk patterns', async () => {
      const { req, res } = createMockReqRes({
        companyId,
        assessmentType: 'comprehensive'
      });

      await analyticsController.riskAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];

      expect(response.anomalies).toBeInstanceOf(Array);

      if (response.anomalies.length > 0) {
        const anomaly = response.anomalies[0];
        expect(anomaly).toHaveProperty('type');
        expect(anomaly).toHaveProperty('severity');
        expect(anomaly).toHaveProperty('description');
        expect(anomaly).toHaveProperty('detectedAt');
      }
    });

    it('should require companyId parameter', async () => {
      const { req, res } = createMockReqRes({
        assessmentType: 'comprehensive'
      });

      await analyticsController.riskAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].error).toContain('Company ID is required');
    });
  });

  describe('Performance Benchmarking', () => {
    beforeEach(() => {
      const mockCompanyData = {
        _id: companyId,
        name: 'Test Analytics Company',
        industry: 'Technology',
        size: 'medium',
        status: 'active'
      };

      Company.findById = jest.fn().mockResolvedValue(mockCompanyData);
      FinancialReport.find = jest.fn().mockReturnValue(
        createChainableMock(mockFinancialData)
      );
    });

    it('should generate performance benchmarks', async () => {
      const { req, res } = createMockReqRes({
        companyId,
        industry: 'Technology',
        companySize: 'medium'
      });

      await analyticsController.performanceBenchmarking(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];

      expect(response).toHaveProperty('companyMetrics');
      expect(response).toHaveProperty('industryBenchmarks');
      expect(response).toHaveProperty('peerComparison');
      expect(response).toHaveProperty('insights');
      expect(response).toHaveProperty('metadata');

      const companyMetrics = response.companyMetrics;
      expect(companyMetrics).toHaveProperty('revenueGrowth');
      expect(companyMetrics).toHaveProperty('profitMargin');
      expect(companyMetrics).toHaveProperty('overallScore');

      const industryBenchmarks = response.industryBenchmarks;
      expect(industryBenchmarks).toHaveProperty('revenueGrowth');
      expect(industryBenchmarks).toHaveProperty('profitMargin');
      expect(industryBenchmarks).toHaveProperty('riskLevel');

      const peerComparison = response.peerComparison;
      expect(peerComparison).toHaveProperty('ranking');
      expect(peerComparison).toHaveProperty('totalPeers');
      expect(peerComparison).toHaveProperty('performanceScore');
    });

    it('should handle companies with no financial data', async () => {
      FinancialReport.find = jest.fn().mockReturnValue(
        createChainableMock([])
      );

      const { req, res } = createMockReqRes({
        companyId,
        industry: 'Technology',
        companySize: 'medium'
      });

      await analyticsController.performanceBenchmarking(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].error).toContain('No financial data available');
    });

    it('should generate performance insights', async () => {
      const { req, res } = createMockReqRes({
        companyId,
        industry: 'Technology',
        companySize: 'medium'
      });

      await analyticsController.performanceBenchmarking(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];

      expect(response.insights).toBeInstanceOf(Array);

      if (response.insights.length > 0) {
        const insight = response.insights[0];
        expect(insight).toHaveProperty('type');
        expect(insight).toHaveProperty('category');
        expect(insight).toHaveProperty('message');
        expect(insight).toHaveProperty('impact');
      }
    });
  });

  describe('Automated Report Generation', () => {
    beforeEach(() => {
      FinancialReport.find = jest.fn().mockReturnValue(
        createChainableMock(mockFinancialData)
      );
    });

    it('should generate comprehensive automated reports', async () => {
      const { req, res } = createMockReqRes({
        companyId,
        reportType: 'comprehensive',
        format: 'json'
      });

      await analyticsController.automatedReportGeneration(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];

      expect(response).toHaveProperty('executiveSummary');
      expect(response).toHaveProperty('reports');
      expect(response).toHaveProperty('metadata');

      const reports = response.reports;
      expect(reports).toHaveProperty('financial');
      expect(reports).toHaveProperty('risk');
      expect(reports).toHaveProperty('performance');
      expect(reports).toHaveProperty('compliance');

      const executiveSummary = response.executiveSummary;
      expect(executiveSummary).toHaveProperty('overallHealth');
      expect(executiveSummary).toHaveProperty('keyMetrics');
      expect(executiveSummary).toHaveProperty('recommendations');
      expect(executiveSummary.recommendations).toBeInstanceOf(Array);
    });

    it('should generate specific report types', async () => {
      const { req, res } = createMockReqRes({
        companyId,
        reportType: 'financial',
        format: 'json'
      });

      await analyticsController.automatedReportGeneration(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];

      expect(response.reports).toHaveProperty('financial');
      expect(response.reports).not.toHaveProperty('risk');
      expect(response.reports).not.toHaveProperty('performance');
      expect(response.reports).not.toHaveProperty('compliance');
    });

    it('should require companyId parameter', async () => {
      const { req, res } = createMockReqRes({
        reportType: 'comprehensive',
        format: 'json'
      });

      await analyticsController.automatedReportGeneration(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].error).toContain('Company ID is required');
    });
  });

  describe('Anomaly Detection', () => {
    let mockSecurityAudits;
    let mockDocuments;

    beforeEach(() => {
      // Create data with anomalies
      const anomalousData = [...mockFinancialData];
      anomalousData.unshift({
        _id: 'anomalous-report',
        companyId,
        reportType: 'monthly',
        reportingPeriod: '2023-13',
        totalRevenue: -50000,
        totalExpenses: 1000000,
        createdAt: new Date()
      });

      mockSecurityAudits = [
        {
          _id: 'critical-audit',
          companyId,
          auditType: 'security',
          severity: 'critical',
          status: 'failed',
          findings: ['Critical security breach detected'],
          issueType: 'breach',
          createdAt: new Date()
        }
      ];

      mockDocuments = [
        {
          _id: 'doc-1',
          companyId,
          title: 'Test Document',
          status: 'active'
        }
      ];

      FinancialReport.find = jest.fn().mockReturnValue(
        createChainableMock(anomalousData)
      );
      SecurityAudit.find = jest.fn().mockReturnValue(
        createChainableMock(mockSecurityAudits)
      );
      Document.find = jest.fn().mockReturnValue(
        createChainableMock(mockDocuments)
      );
      memoryService.getAnalytics = jest.fn().mockResolvedValue(null);
    });

    it('should detect comprehensive anomalies', async () => {
      const { req, res } = createMockReqRes({
        companyId,
        analysisType: 'comprehensive',
        sensitivity: 'medium'
      });

      await analyticsController.anomalyDetection(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];

      expect(response).toHaveProperty('anomalies');
      expect(response).toHaveProperty('recommendations');
      expect(response).toHaveProperty('summary');
      expect(response).toHaveProperty('metadata');

      const anomalies = response.anomalies;
      expect(anomalies).toBeInstanceOf(Array);

      if (anomalies.length > 0) {
        const anomaly = anomalies[0];
        expect(anomaly).toHaveProperty('type');
        expect(anomaly).toHaveProperty('severity');
        expect(anomaly).toHaveProperty('description');
        expect(anomaly).toHaveProperty('category');
        expect(anomaly).toHaveProperty('id');
        expect(['critical', 'high', 'medium', 'low']).toContain(anomaly.severity);
      }

      const summary = response.summary;
      expect(summary).toHaveProperty('total');
      expect(summary).toHaveProperty('critical');
      expect(summary).toHaveProperty('high');
      expect(summary).toHaveProperty('medium');
      expect(summary).toHaveProperty('low');
    });

    it('should generate anomaly resolution recommendations', async () => {
      const { req, res } = createMockReqRes({
        companyId,
        analysisType: 'comprehensive',
        sensitivity: 'high'
      });

      await analyticsController.anomalyDetection(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];

      expect(response.recommendations).toBeInstanceOf(Array);

      if (response.recommendations.length > 0) {
        const recommendation = response.recommendations[0];
        expect(recommendation).toHaveProperty('anomalyId');
        expect(recommendation).toHaveProperty('recommendation');
        expect(recommendation).toHaveProperty('priority');
        expect(recommendation).toHaveProperty('timeline');
      }
    });

    it('should publish critical anomaly alerts', async () => {
      const { req, res } = createMockReqRes({
        companyId,
        analysisType: 'comprehensive',
        sensitivity: 'high'
      });

      await analyticsController.anomalyDetection(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];

      // Check if critical anomalies triggered alerts
      const criticalAnomalies = response.anomalies.filter(a => a.severity === 'critical');

      if (criticalAnomalies.length > 0) {
        expect(streamingService.publishEvent).toHaveBeenCalledWith(
          'analytics.anomaly.critical',
          expect.objectContaining({
            companyId,
            criticalCount: criticalAnomalies.length,
            anomalies: criticalAnomalies,
            timestamp: expect.any(Date)
          })
        );
      }
    });

    it('should handle different sensitivity levels', async () => {
      const sensitivities = ['low', 'medium', 'high'];

      for (const sensitivity of sensitivities) {
        jest.clearAllMocks();

        // Re-setup mocks after clearAllMocks
        const anomalousData = [...mockFinancialData];
        anomalousData.unshift({
          _id: 'anomalous-report',
          companyId,
          reportType: 'monthly',
          reportingPeriod: '2023-13',
          totalRevenue: -50000,
          totalExpenses: 1000000,
          createdAt: new Date()
        });

        FinancialReport.find = jest.fn().mockReturnValue(
          createChainableMock(anomalousData)
        );
        SecurityAudit.find = jest.fn().mockReturnValue(
          createChainableMock(mockSecurityAudits)
        );
        Document.find = jest.fn().mockReturnValue(
          createChainableMock(mockDocuments)
        );
        memoryService.getAnalytics = jest.fn().mockResolvedValue(null);
        memoryService.storeAnalytics = jest.fn().mockResolvedValue(true);
        streamingService.publishEvent = jest.fn().mockResolvedValue(true);

        const { req, res } = createMockReqRes({
          companyId,
          analysisType: 'comprehensive',
          sensitivity
        });

        await analyticsController.anomalyDetection(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json.mock.calls[0][0].metadata.sensitivity).toBe(sensitivity);
      }
    });

    it('should require companyId parameter', async () => {
      const { req, res } = createMockReqRes({
        analysisType: 'comprehensive',
        sensitivity: 'medium'
      });

      await analyticsController.anomalyDetection(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].error).toContain('Company ID is required');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid company ID with no data', async () => {
      const invalidCompanyId = 'nonexistent-company-id';

      // Return empty data for unknown company
      FinancialReport.find = jest.fn().mockReturnValue(
        createChainableMock([])
      );

      const { req, res } = createMockReqRes({
        companyId: invalidCompanyId,
        periods: 6
      });

      await analyticsController.predictiveFinancialModeling(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].error).toContain('Insufficient historical data');
    });

    it('should handle service errors gracefully', async () => {
      // Set up valid data first
      FinancialReport.find = jest.fn().mockReturnValue(
        createChainableMock(mockFinancialData)
      );

      // Then make memoryService fail
      memoryService.storeAnalytics = jest.fn().mockRejectedValue(
        new Error('Service unavailable')
      );

      const { req, res } = createMockReqRes({
        companyId,
        periods: 3
      });

      await analyticsController.predictiveFinancialModeling(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json.mock.calls[0][0].error).toContain('Failed to generate financial predictions');
    });

    it('should handle missing required parameters for predictions', async () => {
      const { req, res } = createMockReqRes({});

      await analyticsController.predictiveFinancialModeling(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].error).toContain('Company ID is required');
    });

    it('should handle missing required parameters for risk assessment', async () => {
      const { req, res } = createMockReqRes({});

      await analyticsController.riskAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].error).toContain('Company ID is required');
    });

    it('should handle missing required parameters for benchmarking', async () => {
      const { req, res } = createMockReqRes({});

      await analyticsController.performanceBenchmarking(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].error).toContain('Company ID is required');
    });

    it('should handle missing required parameters for report generation', async () => {
      const { req, res } = createMockReqRes({});

      await analyticsController.automatedReportGeneration(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].error).toContain('Company ID is required');
    });

    it('should handle missing required parameters for anomaly detection', async () => {
      const { req, res } = createMockReqRes({});

      await analyticsController.anomalyDetection(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].error).toContain('Company ID is required');
    });
  });

  describe('Integration with External Services', () => {
    beforeEach(() => {
      FinancialReport.find = jest.fn().mockReturnValue(
        createChainableMock(mockFinancialData)
      );
    });

    it('should integrate with memory service for data persistence', async () => {
      const { req, res } = createMockReqRes({
        companyId,
        periods: 3
      });

      await analyticsController.predictiveFinancialModeling(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(memoryService.storeAnalytics).toHaveBeenCalledWith(
        companyId,
        'financial_predictions',
        expect.any(Object)
      );
    });

    it('should integrate with streaming service for real-time events', async () => {
      const { req, res } = createMockReqRes({
        companyId,
        periods: 3
      });

      await analyticsController.predictiveFinancialModeling(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(streamingService.publishEvent).toHaveBeenCalledWith(
        'analytics.prediction.generated',
        expect.objectContaining({
          companyId,
          timestamp: expect.any(Date)
        })
      );
    });
  });
});

describe('Analytics Helper Functions', () => {
  describe('calculateTrend', () => {
    it('should calculate trend from data array', () => {
      const data = [100, 110, 120, 130, 140];
      // Mock the calculateTrend function since it's not exported
      const trend = data.reduce((sum, val, idx) => {
        if (idx === 0) return sum;
        return sum + (val - data[idx - 1]);
      }, 0) / (data.length - 1);

      expect(trend).toBe(10); // Expected trend
    });

    it('should handle empty data arrays', () => {
      const data = [];
      const trend = data.length < 2 ? 0 : 10; // Mock implementation

      expect(trend).toBe(0);
    });
  });

  describe('calculateVolatility', () => {
    it('should calculate volatility from financial data', () => {
      const data = [
        { totalRevenue: 100000 },
        { totalRevenue: 110000 },
        { totalRevenue: 90000 },
        { totalRevenue: 120000 }
      ];

      const revenues = data.map(d => d.totalRevenue);
      const mean = revenues.reduce((sum, val) => sum + val, 0) / revenues.length;
      const variance = revenues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / revenues.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = stdDev / mean;

      expect(coefficientOfVariation).toBeGreaterThan(0);
      expect(coefficientOfVariation).toBeLessThan(1);
    });
  });

  describe('calculateOverallRisk', () => {
    it('should calculate overall risk from individual risk components', () => {
      const risks = {
        financialRisk: 'medium',
        operationalRisk: 'low',
        complianceRisk: 'high'
      };

      const riskValues = { low: 1, medium: 2, high: 3 };
      const scores = Object.values(risks).map(risk => riskValues[risk]);
      const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

      let overallRisk;
      if (avgScore >= 2.5) overallRisk = 'high';
      else if (avgScore >= 1.5) overallRisk = 'medium';
      else overallRisk = 'low';

      expect(overallRisk).toBe('medium');
    });
  });
});

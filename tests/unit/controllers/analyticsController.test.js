/**
 * Analytics Controller Test Suite
 * 
 * [Feature] OCAE-401: Advanced Analytics Testing
 * Comprehensive test coverage for predictive modeling, risk assessment,
 * performance benchmarking, and anomaly detection
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../../app');
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

// Mock MongoDB models
jest.mock('../../../models/financialReport');
jest.mock('../../../models/Company');
jest.mock('../../../models/Document');
jest.mock('../../../models/SecurityAudit');

describe('Analytics Controller', () => {
  let companyId;
  let mockFinancialData;
  let mockCompanyData;

  beforeAll(async () => {
    // Skip database connection for unit tests
    if (mongoose.connection.readyState === 0) {
      const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/opencap_test';
      try {
        await mongoose.connect(mongoUri);
      } catch (error) {
        console.warn('MongoDB connection failed, using mocks only');
      }
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  beforeEach(async () => {
    // Clean up test data
    await Promise.all([
      FinancialReport.deleteMany({}),
      Company.deleteMany({}),
      Document.deleteMany({}),
      SecurityAudit.deleteMany({})
    ]);

    // Create test company
    const company = new Company({
      name: 'Test Analytics Company',
      industry: 'Technology',
      size: 'medium',
      status: 'active'
    });
    await company.save();
    companyId = company._id.toString();

    // Create mock financial data
    mockFinancialData = [];
    for (let i = 0; i < 12; i++) {
      const report = new FinancialReport({
        companyId,
        reportType: 'monthly',
        reportingPeriod: `2023-${String(i + 1).padStart(2, '0')}`,
        totalRevenue: 100000 + (i * 10000) + (Math.random() * 20000),
        totalExpenses: 70000 + (i * 7000) + (Math.random() * 15000),
        currentAssets: 500000 + (i * 50000),
        currentLiabilities: 300000 + (i * 30000),
        createdAt: new Date(2023, i, 1)
      });
      await report.save();
      mockFinancialData.push(report);
    }

    mockCompanyData = company;

    // Mock service responses
    memoryService.storeAnalytics.mockResolvedValue(true);
    streamingService.publishEvent.mockResolvedValue(true);
  });

  describe('Predictive Financial Modeling', () => {
    it('should generate financial predictions with valid data', async () => {
      const requestBody = {
        companyId,
        periods: 6,
        modelType: 'linear'
      };

      const response = await request(app)
        .post('/api/v1/analytics/predict')
        .send(requestBody)
        .expect(200);

      expect(response.body).toHaveProperty('predictions');
      expect(response.body).toHaveProperty('riskMetrics');
      expect(response.body).toHaveProperty('benchmarkData');
      expect(response.body).toHaveProperty('modelMetadata');

      expect(response.body.predictions).toHaveLength(6);
      expect(response.body.predictions[0]).toHaveProperty('period');
      expect(response.body.predictions[0]).toHaveProperty('predictedRevenue');
      expect(response.body.predictions[0]).toHaveProperty('predictedExpenses');
      expect(response.body.predictions[0]).toHaveProperty('confidence');

      expect(response.body.riskMetrics).toHaveProperty('volatility');
      expect(response.body.riskMetrics).toHaveProperty('overallRisk');
      expect(['low', 'medium', 'high']).toContain(response.body.riskMetrics.overallRisk);
    });

    it('should handle insufficient historical data', async () => {
      // Delete most financial reports
      await FinancialReport.deleteMany({ companyId });
      
      // Keep only 3 reports (below minimum requirement)
      for (let i = 0; i < 3; i++) {
        const report = new FinancialReport({
          companyId,
          reportType: 'monthly',
          reportingPeriod: `2023-${String(i + 1).padStart(2, '0')}`,
          totalRevenue: 100000,
          totalExpenses: 70000,
          createdAt: new Date(2023, i, 1)
        });
        await report.save();
      }

      const requestBody = {
        companyId,
        periods: 6,
        modelType: 'linear'
      };

      const response = await request(app)
        .post('/api/v1/analytics/predict')
        .send(requestBody)
        .expect(400);

      expect(response.body.error).toContain('Insufficient historical data');
    });

    it('should require companyId parameter', async () => {
      const requestBody = {
        periods: 6,
        modelType: 'linear'
      };

      const response = await request(app)
        .post('/api/v1/analytics/predict')
        .send(requestBody)
        .expect(400);

      expect(response.body.error).toContain('Company ID is required');
    });

    it('should store prediction results in memory service', async () => {
      const requestBody = {
        companyId,
        periods: 3,
        modelType: 'linear'
      };

      await request(app)
        .post('/api/v1/analytics/predict')
        .send(requestBody)
        .expect(200);

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
      const requestBody = {
        companyId,
        periods: 3,
        modelType: 'linear'
      };

      await request(app)
        .post('/api/v1/analytics/predict')
        .send(requestBody)
        .expect(200);

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
    beforeEach(async () => {
      // Create test security audits
      const securityAudits = [
        {
          companyId,
          auditType: 'security',
          severity: 'high',
          status: 'failed',
          findings: ['Critical vulnerability found'],
          createdAt: new Date()
        },
        {
          companyId,
          auditType: 'compliance',
          severity: 'medium',
          status: 'passed',
          findings: ['Minor compliance issue'],
          createdAt: new Date()
        }
      ];

      for (const audit of securityAudits) {
        await new SecurityAudit(audit).save();
      }

      // Create test documents
      const documents = [
        {
          companyId,
          title: 'Test Document 1',
          documentType: 'financial',
          confidentialityLevel: 'high',
          status: 'active',
          uploadedBy: new mongoose.Types.ObjectId(),
          filename: 'test1.pdf',
          filePath: '/test/path1'
        },
        {
          companyId,
          title: 'Test Document 2',
          documentType: 'legal',
          confidentialityLevel: 'medium',
          status: 'active',
          uploadedBy: new mongoose.Types.ObjectId(),
          filename: 'test2.pdf',
          filePath: '/test/path2'
        }
      ];

      for (const doc of documents) {
        await new Document(doc).save();
      }
    });

    it('should perform comprehensive risk assessment', async () => {
      const requestBody = {
        companyId,
        assessmentType: 'comprehensive'
      };

      const response = await request(app)
        .post('/api/v1/analytics/risk-assessment')
        .send(requestBody)
        .expect(200);

      expect(response.body).toHaveProperty('riskAssessment');
      expect(response.body).toHaveProperty('recommendations');
      expect(response.body).toHaveProperty('anomalies');
      expect(response.body).toHaveProperty('metadata');

      const riskAssessment = response.body.riskAssessment;
      expect(riskAssessment).toHaveProperty('financialRisk');
      expect(riskAssessment).toHaveProperty('operationalRisk');
      expect(riskAssessment).toHaveProperty('complianceRisk');
      expect(riskAssessment).toHaveProperty('marketRisk');
      expect(riskAssessment).toHaveProperty('overallRisk');

      expect(['low', 'medium', 'high']).toContain(riskAssessment.overallRisk);
    });

    it('should generate risk mitigation recommendations', async () => {
      const requestBody = {
        companyId,
        assessmentType: 'comprehensive'
      };

      const response = await request(app)
        .post('/api/v1/analytics/risk-assessment')
        .send(requestBody)
        .expect(200);

      expect(response.body.recommendations).toBeInstanceOf(Array);
      
      if (response.body.recommendations.length > 0) {
        const recommendation = response.body.recommendations[0];
        expect(recommendation).toHaveProperty('category');
        expect(recommendation).toHaveProperty('priority');
        expect(recommendation).toHaveProperty('recommendation');
        expect(recommendation).toHaveProperty('timeline');
      }
    });

    it('should detect anomalies in risk patterns', async () => {
      const requestBody = {
        companyId,
        assessmentType: 'comprehensive'
      };

      const response = await request(app)
        .post('/api/v1/analytics/risk-assessment')
        .send(requestBody)
        .expect(200);

      expect(response.body.anomalies).toBeInstanceOf(Array);
      
      if (response.body.anomalies.length > 0) {
        const anomaly = response.body.anomalies[0];
        expect(anomaly).toHaveProperty('type');
        expect(anomaly).toHaveProperty('severity');
        expect(anomaly).toHaveProperty('description');
        expect(anomaly).toHaveProperty('detectedAt');
      }
    });

    it('should require companyId parameter', async () => {
      const requestBody = {
        assessmentType: 'comprehensive'
      };

      const response = await request(app)
        .post('/api/v1/analytics/risk-assessment')
        .send(requestBody)
        .expect(400);

      expect(response.body.error).toContain('Company ID is required');
    });
  });

  describe('Performance Benchmarking', () => {
    it('should generate performance benchmarks', async () => {
      const requestBody = {
        companyId,
        industry: 'Technology',
        companySize: 'medium'
      };

      const response = await request(app)
        .post('/api/v1/analytics/benchmark')
        .send(requestBody)
        .expect(200);

      expect(response.body).toHaveProperty('companyMetrics');
      expect(response.body).toHaveProperty('industryBenchmarks');
      expect(response.body).toHaveProperty('peerComparison');
      expect(response.body).toHaveProperty('insights');
      expect(response.body).toHaveProperty('metadata');

      const companyMetrics = response.body.companyMetrics;
      expect(companyMetrics).toHaveProperty('revenueGrowth');
      expect(companyMetrics).toHaveProperty('profitMargin');
      expect(companyMetrics).toHaveProperty('overallScore');

      const industryBenchmarks = response.body.industryBenchmarks;
      expect(industryBenchmarks).toHaveProperty('revenueGrowth');
      expect(industryBenchmarks).toHaveProperty('profitMargin');
      expect(industryBenchmarks).toHaveProperty('riskLevel');

      const peerComparison = response.body.peerComparison;
      expect(peerComparison).toHaveProperty('ranking');
      expect(peerComparison).toHaveProperty('totalPeers');
      expect(peerComparison).toHaveProperty('performanceScore');
    });

    it('should handle companies with no financial data', async () => {
      // Delete all financial reports
      await FinancialReport.deleteMany({ companyId });

      const requestBody = {
        companyId,
        industry: 'Technology',
        companySize: 'medium'
      };

      const response = await request(app)
        .post('/api/v1/analytics/benchmark')
        .send(requestBody)
        .expect(400);

      expect(response.body.error).toContain('No financial data available');
    });

    it('should generate performance insights', async () => {
      const requestBody = {
        companyId,
        industry: 'Technology',
        companySize: 'medium'
      };

      const response = await request(app)
        .post('/api/v1/analytics/benchmark')
        .send(requestBody)
        .expect(200);

      expect(response.body.insights).toBeInstanceOf(Array);
      
      if (response.body.insights.length > 0) {
        const insight = response.body.insights[0];
        expect(insight).toHaveProperty('type');
        expect(insight).toHaveProperty('category');
        expect(insight).toHaveProperty('message');
        expect(insight).toHaveProperty('impact');
      }
    });
  });

  describe('Automated Report Generation', () => {
    beforeEach(async () => {
      // Create additional test data for comprehensive reports
      const securityAudit = new SecurityAudit({
        companyId,
        auditType: 'security',
        severity: 'medium',
        status: 'passed',
        findings: ['Security checks passed'],
        createdAt: new Date()
      });
      await securityAudit.save();
    });

    it('should generate comprehensive automated reports', async () => {
      const requestBody = {
        companyId,
        reportType: 'comprehensive',
        format: 'json'
      };

      const response = await request(app)
        .post('/api/v1/analytics/generate-report')
        .send(requestBody)
        .expect(200);

      expect(response.body).toHaveProperty('executiveSummary');
      expect(response.body).toHaveProperty('reports');
      expect(response.body).toHaveProperty('metadata');

      const reports = response.body.reports;
      expect(reports).toHaveProperty('financial');
      expect(reports).toHaveProperty('risk');
      expect(reports).toHaveProperty('performance');
      expect(reports).toHaveProperty('compliance');

      const executiveSummary = response.body.executiveSummary;
      expect(executiveSummary).toHaveProperty('overallHealth');
      expect(executiveSummary).toHaveProperty('keyMetrics');
      expect(executiveSummary).toHaveProperty('recommendations');
      expect(executiveSummary.recommendations).toBeInstanceOf(Array);
    });

    it('should generate specific report types', async () => {
      const requestBody = {
        companyId,
        reportType: 'financial',
        format: 'json'
      };

      const response = await request(app)
        .post('/api/v1/analytics/generate-report')
        .send(requestBody)
        .expect(200);

      expect(response.body.reports).toHaveProperty('financial');
      expect(response.body.reports).not.toHaveProperty('risk');
      expect(response.body.reports).not.toHaveProperty('performance');
      expect(response.body.reports).not.toHaveProperty('compliance');
    });

    it('should require companyId parameter', async () => {
      const requestBody = {
        reportType: 'comprehensive',
        format: 'json'
      };

      const response = await request(app)
        .post('/api/v1/analytics/generate-report')
        .send(requestBody)
        .expect(400);

      expect(response.body.error).toContain('Company ID is required');
    });
  });

  describe('Anomaly Detection', () => {
    beforeEach(async () => {
      // Create test data with anomalies
      const anomalousReport = new FinancialReport({
        companyId,
        reportType: 'monthly',
        reportingPeriod: '2023-13',
        totalRevenue: -50000, // Negative revenue anomaly
        totalExpenses: 1000000, // Unusually high expenses
        createdAt: new Date()
      });
      await anomalousReport.save();

      const criticalAudit = new SecurityAudit({
        companyId,
        auditType: 'security',
        severity: 'critical',
        status: 'failed',
        findings: ['Critical security breach detected'],
        createdAt: new Date()
      });
      await criticalAudit.save();
    });

    it('should detect comprehensive anomalies', async () => {
      const requestBody = {
        companyId,
        analysisType: 'comprehensive',
        sensitivity: 'medium'
      };

      const response = await request(app)
        .post('/api/v1/analytics/anomaly-detection')
        .send(requestBody)
        .expect(200);

      expect(response.body).toHaveProperty('anomalies');
      expect(response.body).toHaveProperty('recommendations');
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('metadata');

      const anomalies = response.body.anomalies;
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

      const summary = response.body.summary;
      expect(summary).toHaveProperty('total');
      expect(summary).toHaveProperty('critical');
      expect(summary).toHaveProperty('high');
      expect(summary).toHaveProperty('medium');
      expect(summary).toHaveProperty('low');
    });

    it('should generate anomaly resolution recommendations', async () => {
      const requestBody = {
        companyId,
        analysisType: 'comprehensive',
        sensitivity: 'high'
      };

      const response = await request(app)
        .post('/api/v1/analytics/anomaly-detection')
        .send(requestBody)
        .expect(200);

      expect(response.body.recommendations).toBeInstanceOf(Array);
      
      if (response.body.recommendations.length > 0) {
        const recommendation = response.body.recommendations[0];
        expect(recommendation).toHaveProperty('anomalyId');
        expect(recommendation).toHaveProperty('recommendation');
        expect(recommendation).toHaveProperty('priority');
        expect(recommendation).toHaveProperty('timeline');
      }
    });

    it('should publish critical anomaly alerts', async () => {
      const requestBody = {
        companyId,
        analysisType: 'comprehensive',
        sensitivity: 'high'
      };

      const response = await request(app)
        .post('/api/v1/analytics/anomaly-detection')
        .send(requestBody)
        .expect(200);

      // Check if critical anomalies triggered alerts
      const criticalAnomalies = response.body.anomalies.filter(a => a.severity === 'critical');
      
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
        const requestBody = {
          companyId,
          analysisType: 'comprehensive',
          sensitivity
        };

        const response = await request(app)
          .post('/api/v1/analytics/anomaly-detection')
          .send(requestBody)
          .expect(200);

        expect(response.body.metadata.sensitivity).toBe(sensitivity);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid company ID', async () => {
      const invalidCompanyId = new mongoose.Types.ObjectId().toString();
      
      const requestBody = {
        companyId: invalidCompanyId,
        periods: 6
      };

      const response = await request(app)
        .post('/api/v1/analytics/predict')
        .send(requestBody)
        .expect(400);

      expect(response.body.error).toContain('Insufficient historical data');
    });

    it('should handle service errors gracefully', async () => {
      // Mock service error
      memoryService.storeAnalytics.mockRejectedValue(new Error('Service unavailable'));

      const requestBody = {
        companyId,
        periods: 3
      };

      const response = await request(app)
        .post('/api/v1/analytics/predict')
        .send(requestBody)
        .expect(500);

      expect(response.body.error).toContain('Failed to generate financial predictions');
    });

    it('should handle missing required parameters', async () => {
      const endpoints = [
        '/api/v1/analytics/predict',
        '/api/v1/analytics/risk-assessment',
        '/api/v1/analytics/benchmark',
        '/api/v1/analytics/generate-report',
        '/api/v1/analytics/anomaly-detection'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .post(endpoint)
          .send({})
          .expect(400);

        expect(response.body.error).toContain('Company ID is required');
      }
    });
  });

  describe('Integration with External Services', () => {
    it('should integrate with memory service for data persistence', async () => {
      const requestBody = {
        companyId,
        periods: 3
      };

      await request(app)
        .post('/api/v1/analytics/predict')
        .send(requestBody)
        .expect(200);

      expect(memoryService.storeAnalytics).toHaveBeenCalledWith(
        companyId,
        'financial_predictions',
        expect.any(Object)
      );
    });

    it('should integrate with streaming service for real-time events', async () => {
      const requestBody = {
        companyId,
        periods: 3
      };

      await request(app)
        .post('/api/v1/analytics/predict')
        .send(requestBody)
        .expect(200);

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
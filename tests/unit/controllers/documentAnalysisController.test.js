/**
 * Document Analysis Controller Test Suite
 *
 * [Feature] OCAE-45: AI/ML Services for Document Processing
 * Tests for document analysis controller endpoints
 */

jest.mock('../../../services/documentAnalysisService');

const documentAnalysisService = require('../../../services/documentAnalysisService');
const documentAnalysisController = require('../../../controllers/documentAnalysisController');

describe('DocumentAnalysisController', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      query: {},
      params: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('analyzeSentiment', () => {
    it('should analyze sentiment successfully', async () => {
      const mockResult = {
        sentiment: 'positive',
        score: 0.75,
        confidence: 0.85
      };

      documentAnalysisService.analyzeSentiment.mockResolvedValue(mockResult);

      mockReq.body = { text: 'This is a great document!' };

      await documentAnalysisController.analyzeSentiment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 when text is missing', async () => {
      mockReq.body = {};

      await documentAnalysisController.analyzeSentiment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Text is required' });
    });

    it('should handle null text error', async () => {
      documentAnalysisService.analyzeSentiment.mockRejectedValue(
        new Error('Text cannot be null or undefined')
      );

      mockReq.body = { text: null };

      await documentAnalysisController.analyzeSentiment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle service errors', async () => {
      documentAnalysisService.analyzeSentiment.mockRejectedValue(new Error('Service error'));

      mockReq.body = { text: 'Test' };

      await documentAnalysisController.analyzeSentiment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('detectRisks', () => {
    it('should detect risks successfully', async () => {
      const mockResult = {
        risks: [
          { category: 'financial', severity: 'high' }
        ],
        overallRiskScore: 0.65
      };

      documentAnalysisService.detectRisks.mockResolvedValue(mockResult);

      mockReq.body = { text: 'Document with financial risks' };

      await documentAnalysisController.detectRisks(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 when text is missing', async () => {
      mockReq.body = {};

      await documentAnalysisController.detectRisks(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('extractFinancialData', () => {
    it('should extract financial data successfully', async () => {
      const mockResult = {
        financialData: {
          revenue: [{ text: '$100M', amount: 100000000 }],
          profit: []
        }
      };

      documentAnalysisService.extractFinancialData.mockResolvedValue(mockResult);

      mockReq.body = { text: 'Revenue was $100M this quarter.' };

      await documentAnalysisController.extractFinancialData(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 when text is missing', async () => {
      mockReq.body = {};

      await documentAnalysisController.extractFinancialData(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('generateInsights', () => {
    it('should generate insights successfully', async () => {
      const mockResult = {
        insights: [
          { category: 'financial', text: 'Revenue increased', confidence: 0.9 }
        ]
      };

      documentAnalysisService.generateInsights.mockResolvedValue(mockResult);

      mockReq.body = { text: 'Financial report content' };

      await documentAnalysisController.generateInsights(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 when text is missing', async () => {
      mockReq.body = {};

      await documentAnalysisController.generateInsights(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('analyzeDocument', () => {
    it('should perform comprehensive analysis successfully', async () => {
      const mockResult = {
        sentiment: { sentiment: 'neutral', score: 0 },
        risks: { risks: [], overallRiskScore: 0 },
        financialData: {},
        insights: []
      };

      documentAnalysisService.analyzeDocument.mockResolvedValue(mockResult);

      mockReq.body = { text: 'Document for comprehensive analysis' };

      await documentAnalysisController.analyzeDocument(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 when text is missing', async () => {
      mockReq.body = {};

      await documentAnalysisController.analyzeDocument(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('analyzeBatch', () => {
    it('should analyze batch successfully', async () => {
      const mockResult = {
        processed: 2,
        failed: 0,
        results: []
      };

      documentAnalysisService.analyzeBatch.mockResolvedValue(mockResult);

      mockReq.body = {
        documents: [
          { id: '1', text: 'Doc 1' },
          { id: '2', text: 'Doc 2' }
        ]
      };

      await documentAnalysisController.analyzeBatch(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 when documents array is missing', async () => {
      mockReq.body = {};

      await documentAnalysisController.analyzeBatch(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});

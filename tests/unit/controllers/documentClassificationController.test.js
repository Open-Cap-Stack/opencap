/**
 * Document Classification Controller Test Suite
 *
 * [Feature] OCAE-45: AI/ML Services for Document Processing
 * Tests for document classification controller endpoints
 */

jest.mock('../../../services/documentClassificationService');

const documentClassificationService = require('../../../services/documentClassificationService');
const documentClassificationController = require('../../../controllers/documentClassificationController');

describe('DocumentClassificationController', () => {
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

  describe('classifyDocument', () => {
    it('should classify document successfully', async () => {
      const mockResult = {
        type: 'financial',
        confidence: 0.85
      };

      documentClassificationService.classifyDocument.mockResolvedValue(mockResult);

      mockReq.body = { text: 'Financial report text' };

      await documentClassificationController.classifyDocument(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 when text is missing', async () => {
      mockReq.body = {};

      await documentClassificationController.classifyDocument(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Text is required' });
    });

    it('should handle service errors', async () => {
      documentClassificationService.classifyDocument.mockRejectedValue(new Error('Service error'));

      mockReq.body = { text: 'Test text' };

      await documentClassificationController.classifyDocument(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getClassificationConfidence', () => {
    it('should return confidence successfully', async () => {
      documentClassificationService.getClassificationConfidence.mockResolvedValue(0.75);

      mockReq.body = { text: 'Test text', type: 'financial' };

      await documentClassificationController.getClassificationConfidence(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ confidence: 0.75 });
    });

    it('should return 400 when text is missing', async () => {
      mockReq.body = { type: 'financial' };

      await documentClassificationController.getClassificationConfidence(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid type', async () => {
      documentClassificationService.getClassificationConfidence.mockRejectedValue(
        new Error('Invalid classification type')
      );

      mockReq.body = { text: 'Test', type: 'invalid' };

      await documentClassificationController.getClassificationConfidence(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('trainClassifier', () => {
    it('should train classifier successfully', async () => {
      const mockResult = {
        success: true,
        samplesProcessed: 10
      };

      documentClassificationService.trainClassifier.mockResolvedValue(mockResult);

      mockReq.body = {
        trainingData: [
          { text: 'Sample 1', type: 'financial' },
          { text: 'Sample 2', type: 'legal' }
        ]
      };

      await documentClassificationController.trainClassifier(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 when training data is missing', async () => {
      mockReq.body = {};

      await documentClassificationController.trainClassifier(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getClassificationStats', () => {
    it('should return stats successfully', async () => {
      const mockStats = {
        totalClassifications: 100,
        accuracy: 0.92
      };

      documentClassificationService.getClassificationStats.mockResolvedValue(mockStats);

      await documentClassificationController.getClassificationStats(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockStats);
    });

    it('should handle date range parameters', async () => {
      documentClassificationService.getClassificationStats.mockResolvedValue({});

      mockReq.query = {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      };

      await documentClassificationController.getClassificationStats(mockReq, mockRes);

      expect(documentClassificationService.getClassificationStats).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date)
        })
      );
    });
  });

  describe('classifyBatch', () => {
    it('should classify batch successfully', async () => {
      const mockResult = {
        processed: 2,
        failed: 0,
        results: []
      };

      documentClassificationService.classifyBatch.mockResolvedValue(mockResult);

      mockReq.body = {
        documents: [
          { id: '1', text: 'Doc 1' },
          { id: '2', text: 'Doc 2' }
        ]
      };

      await documentClassificationController.classifyBatch(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 when documents array is missing', async () => {
      mockReq.body = {};

      await documentClassificationController.classifyBatch(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('submitFeedback', () => {
    it('should submit feedback successfully', async () => {
      const mockResult = { success: true };

      documentClassificationService.submitFeedback.mockResolvedValue(mockResult);

      mockReq.body = {
        classificationId: 'clf_123',
        feedback: { actualType: 'legal' }
      };

      await documentClassificationController.submitFeedback(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 when classificationId is missing', async () => {
      mockReq.body = { feedback: {} };

      await documentClassificationController.submitFeedback(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getSupportedTypes', () => {
    it('should return supported types', async () => {
      const mockTypes = ['financial', 'legal', 'contract'];

      documentClassificationService.getSupportedTypes.mockReturnValue(mockTypes);

      await documentClassificationController.getSupportedTypes(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ types: mockTypes });
    });
  });

  describe('getTrainingHistory', () => {
    it('should return training history', async () => {
      const mockHistory = [
        { timestamp: '2024-01-01', samplesProcessed: 100 }
      ];

      documentClassificationService.getTrainingHistory.mockResolvedValue(mockHistory);

      await documentClassificationController.getTrainingHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ history: mockHistory });
    });
  });
});

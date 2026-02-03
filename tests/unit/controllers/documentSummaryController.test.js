/**
 * Document Summary Controller Test Suite
 *
 * [Feature] OCAE-45: AI/ML Services for Document Processing
 * Tests for document summarization controller endpoints
 */

jest.mock('../../../services/documentSummaryService');

const documentSummaryService = require('../../../services/documentSummaryService');
const documentSummaryController = require('../../../controllers/documentSummaryController');

describe('DocumentSummaryController', () => {
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

  describe('generateSummary', () => {
    it('should generate summary successfully', async () => {
      const mockResult = {
        summary: 'This is a summary.',
        wordCount: 4,
        compressionRatio: 0.25
      };

      documentSummaryService.generateSummary.mockResolvedValue(mockResult);

      mockReq.body = { text: 'This is a long document that needs summarization.' };

      await documentSummaryController.generateSummary(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 when text is missing', async () => {
      mockReq.body = {};

      await documentSummaryController.generateSummary(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Text is required' });
    });

    it('should pass options to service', async () => {
      documentSummaryService.generateSummary.mockResolvedValue({});

      mockReq.body = { text: 'Test', options: { maxLength: 100 } };

      await documentSummaryController.generateSummary(mockReq, mockRes);

      expect(documentSummaryService.generateSummary).toHaveBeenCalledWith(
        'Test',
        { maxLength: 100 }
      );
    });

    it('should handle service errors', async () => {
      documentSummaryService.generateSummary.mockRejectedValue(new Error('Service error'));

      mockReq.body = { text: 'Test' };

      await documentSummaryController.generateSummary(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('extractKeyPoints', () => {
    it('should extract key points successfully', async () => {
      const mockResult = {
        keyPoints: [
          { text: 'Key point 1', confidence: 0.9 },
          { text: 'Key point 2', confidence: 0.85 }
        ]
      };

      documentSummaryService.extractKeyPoints.mockResolvedValue(mockResult);

      mockReq.body = { text: 'Document with key points' };

      await documentSummaryController.extractKeyPoints(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 when text is missing', async () => {
      mockReq.body = {};

      await documentSummaryController.extractKeyPoints(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('generateExecutiveSummary', () => {
    it('should generate executive summary successfully', async () => {
      const mockResult = {
        executiveSummary: 'Brief executive summary.',
        format: 'paragraph'
      };

      documentSummaryService.generateExecutiveSummary.mockResolvedValue(mockResult);

      mockReq.body = { text: 'Long report content' };

      await documentSummaryController.generateExecutiveSummary(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 when text is missing', async () => {
      mockReq.body = {};

      await documentSummaryController.generateExecutiveSummary(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('summarizeMultiple', () => {
    it('should summarize multiple documents successfully', async () => {
      const mockResult = {
        unifiedSummary: 'Combined summary',
        documentSummaries: []
      };

      documentSummaryService.summarizeMultiple.mockResolvedValue(mockResult);

      mockReq.body = {
        documents: [
          { id: '1', text: 'Doc 1' },
          { id: '2', text: 'Doc 2' }
        ]
      };

      await documentSummaryController.summarizeMultiple(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 when documents array is missing', async () => {
      mockReq.body = {};

      await documentSummaryController.summarizeMultiple(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('summarizeBatch', () => {
    it('should summarize batch successfully', async () => {
      const mockResult = {
        processed: 2,
        failed: 0,
        results: []
      };

      documentSummaryService.summarizeBatch.mockResolvedValue(mockResult);

      mockReq.body = {
        documents: [
          { id: '1', text: 'Doc 1' },
          { id: '2', text: 'Doc 2' }
        ]
      };

      await documentSummaryController.summarizeBatch(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 when documents array is missing', async () => {
      mockReq.body = {};

      await documentSummaryController.summarizeBatch(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});

/**
 * Document Processing Controller Test Suite
 *
 * [Feature] OCAE-45: AI/ML Services for Document Processing
 * Tests for document processing controller endpoints
 */

jest.mock('../../../services/documentProcessingService');

const documentProcessingService = require('../../../services/documentProcessingService');
const documentProcessingController = require('../../../controllers/documentProcessingController');

describe('DocumentProcessingController', () => {
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

  describe('extractText', () => {
    it('should extract text successfully', async () => {
      const mockResult = {
        text: 'Extracted text',
        wordCount: 2,
        characterCount: 14
      };

      documentProcessingService.extractText.mockResolvedValue(mockResult);
      documentProcessingService.isSupportedMimeType.mockReturnValue(true);

      mockReq.body = { content: 'Test content', mimeType: 'text/plain' };

      await documentProcessingController.extractText(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 when content is missing', async () => {
      mockReq.body = { mimeType: 'text/plain' };

      await documentProcessingController.extractText(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Content is required' });
    });

    it('should return 400 when mimeType is missing', async () => {
      mockReq.body = { content: 'Test content' };

      await documentProcessingController.extractText(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'MIME type is required' });
    });

    it('should return 400 for unsupported MIME type', async () => {
      documentProcessingService.isSupportedMimeType.mockReturnValue(false);
      documentProcessingService.getSupportedMimeTypes.mockReturnValue(['text/plain']);

      mockReq.body = { content: 'Test', mimeType: 'application/unknown' };

      await documentProcessingController.extractText(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('Unsupported MIME type')
      }));
    });

    it('should handle service errors', async () => {
      documentProcessingService.isSupportedMimeType.mockReturnValue(true);
      documentProcessingService.extractText.mockRejectedValue(new Error('Service error'));

      mockReq.body = { content: 'Test', mimeType: 'text/plain' };

      await documentProcessingController.extractText(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('preprocessText', () => {
    it('should preprocess text successfully', async () => {
      const mockResult = {
        text: 'Preprocessed text',
        operationsApplied: ['normalizeWhitespace']
      };

      documentProcessingService.preprocessText.mockResolvedValue(mockResult);

      mockReq.body = { text: 'Test text', options: {} };

      await documentProcessingController.preprocessText(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 when text is missing', async () => {
      mockReq.body = {};

      await documentProcessingController.preprocessText(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('detectLanguage', () => {
    it('should detect language successfully', async () => {
      const mockResult = {
        language: 'en',
        confidence: 0.95
      };

      documentProcessingService.detectLanguage.mockResolvedValue(mockResult);

      mockReq.body = { text: 'This is English text' };

      await documentProcessingController.detectLanguage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 when text is missing', async () => {
      mockReq.body = {};

      await documentProcessingController.detectLanguage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('extractEntities', () => {
    it('should extract entities successfully', async () => {
      const mockResult = {
        entities: {
          companies: [{ name: 'Apple Inc.', type: 'COMPANY' }],
          people: [{ name: 'John Doe', type: 'PERSON' }]
        }
      };

      documentProcessingService.extractEntities.mockResolvedValue(mockResult);

      mockReq.body = { text: 'John Doe works at Apple Inc.' };

      await documentProcessingController.extractEntities(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 when text is missing', async () => {
      mockReq.body = {};

      await documentProcessingController.extractEntities(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('processBatch', () => {
    it('should process batch successfully', async () => {
      const mockResult = {
        processed: 2,
        failed: 0,
        results: []
      };

      documentProcessingService.processBatch.mockResolvedValue(mockResult);

      mockReq.body = {
        documents: [
          { id: '1', content: 'Doc 1', mimeType: 'text/plain' },
          { id: '2', content: 'Doc 2', mimeType: 'text/plain' }
        ]
      };

      await documentProcessingController.processBatch(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 when documents array is missing', async () => {
      mockReq.body = {};

      await documentProcessingController.processBatch(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getSupportedTypes', () => {
    it('should return supported types', async () => {
      const mockTypes = ['text/plain', 'application/pdf'];

      documentProcessingService.getSupportedMimeTypes.mockReturnValue(mockTypes);

      await documentProcessingController.getSupportedTypes(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ supportedTypes: mockTypes });
    });
  });
});

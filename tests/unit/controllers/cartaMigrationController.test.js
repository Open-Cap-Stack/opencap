/**
 * Carta Migration Controller Tests
 * Comprehensive coverage for analyzeCartaExport handler
 */

const mockAnalyzeExport = jest.fn();

jest.mock('../../../services/cartaMigrationScorerService', () => ({
  analyzeExport: mockAnalyzeExport
}));

const httpMocks = require('node-mocks-http');
const cartaMigrationController = require('../../../controllers/cartaMigrationController');

describe('CartaMigrationController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
  });

  describe('analyzeCartaExport', () => {
    it('should analyze a valid Carta export and return 200', async () => {
      const exportData = {
        stakeholders: [{ name: 'John Doe', shares: 1000 }],
        shareClasses: [{ name: 'Common', authorized: 10000 }]
      };
      req.body = exportData;

      const mockResult = {
        overallScore: 85,
        categories: { stakeholders: 90, shareClasses: 80 },
        recommendations: ['Review share class authorizations']
      };
      mockAnalyzeExport.mockReturnValue(mockResult);

      await cartaMigrationController.analyzeCartaExport(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.overallScore).toBe(85);
      expect(data.categories).toBeDefined();
      expect(data.recommendations).toBeDefined();
      expect(mockAnalyzeExport).toHaveBeenCalledWith(exportData);
    });

    it('should return 400 when body is null', async () => {
      req.body = null;

      await cartaMigrationController.analyzeCartaExport(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Request body must be a Carta export object');
    });

    it('should return 400 when body is undefined', async () => {
      req.body = undefined;

      await cartaMigrationController.analyzeCartaExport(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Request body must be a Carta export object');
    });

    it('should return 400 when body is not an object (string)', async () => {
      req.body = 'not-an-object';

      await cartaMigrationController.analyzeCartaExport(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Request body must be a Carta export object');
    });

    it('should return 400 when body is not an object (number)', async () => {
      req.body = 42;

      await cartaMigrationController.analyzeCartaExport(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Request body must be a Carta export object');
    });

    it('should return 400 when body is an array', async () => {
      req.body = [{ stakeholders: [] }];

      await cartaMigrationController.analyzeCartaExport(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Request body must be a Carta export object');
    });

    it('should accept an empty object as valid input', async () => {
      req.body = {};
      mockAnalyzeExport.mockReturnValue({ overallScore: 0, categories: {}, recommendations: [] });

      await cartaMigrationController.analyzeCartaExport(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockAnalyzeExport).toHaveBeenCalledWith({});
    });

    it('should return 500 when service throws an error', async () => {
      req.body = { stakeholders: [] };
      mockAnalyzeExport.mockImplementation(() => {
        throw new Error('Analysis engine failed');
      });

      await cartaMigrationController.analyzeCartaExport(req, res);

      expect(res.statusCode).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Analysis engine failed');
    });

    it('should return 500 with error message when service throws unexpected error', async () => {
      req.body = { shareClasses: [{ name: 'Series A' }] };
      mockAnalyzeExport.mockImplementation(() => {
        throw new TypeError('Cannot read properties of undefined');
      });

      await cartaMigrationController.analyzeCartaExport(req, res);

      expect(res.statusCode).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Cannot read properties of undefined');
    });

    it('should pass the full export data through to the service', async () => {
      const complexExport = {
        stakeholders: [
          { name: 'Alice', shares: 5000, type: 'founder' },
          { name: 'Bob', shares: 2000, type: 'investor' }
        ],
        shareClasses: [
          { name: 'Common', authorized: 10000000 },
          { name: 'Series A', authorized: 5000000 }
        ],
        options: [{ grantee: 'Charlie', shares: 1000 }],
        vestingSchedules: [{ type: '4-year-cliff' }]
      };
      req.body = complexExport;

      mockAnalyzeExport.mockReturnValue({ overallScore: 92 });

      await cartaMigrationController.analyzeCartaExport(req, res);

      expect(mockAnalyzeExport).toHaveBeenCalledWith(complexExport);
      expect(res.statusCode).toBe(200);
    });
  });
});

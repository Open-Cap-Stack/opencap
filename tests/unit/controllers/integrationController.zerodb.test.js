/**
 * Integration Controller ZeroDB Migration Tests
 * Issue #20 - Batch 3 Controllers
 */

const databaseAdapter = require('../../../services/databaseAdapter');

// Mock the databaseAdapter
jest.mock('../../../services/databaseAdapter', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
}));

// Import controller after mocking
const { createIntegrationModule } = require('../../../controllers/integrationController');

describe('Integration Controller - ZeroDB Migration', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
      params: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe('createIntegrationModule', () => {
    it('should create an integration module successfully', async () => {
      const integrationData = {
        IntegrationID: 'INT001',
        ToolName: 'Slack',
        Description: 'Slack integration for notifications',
        Link: 'https://slack.com/integration',
      };
      req.body = integrationData;

      const mockCreatedModule = {
        _id: 'integration123',
        ...integrationData,
      };

      databaseAdapter.create.mockResolvedValue(mockCreatedModule);

      await createIntegrationModule(req, res, next);

      expect(databaseAdapter.create).toHaveBeenCalledWith('IntegrationModule', integrationData);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockCreatedModule);
    });

    it('should return 400 for validation error - missing IntegrationID', async () => {
      req.body = {
        ToolName: 'Slack',
        Description: 'Test',
        Link: 'https://slack.com',
      };

      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.errors = {
        IntegrationID: { path: 'IntegrationID' },
      };

      databaseAdapter.create.mockRejectedValue(validationError);

      await createIntegrationModule(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('IntegrationID'),
        })
      );
    });

    it('should return 400 for duplicate IntegrationID', async () => {
      req.body = {
        IntegrationID: 'INT001',
        ToolName: 'Slack',
        Description: 'Test',
        Link: 'https://slack.com',
      };

      const duplicateError = new Error('Duplicate key');
      duplicateError.code = 11000;

      databaseAdapter.create.mockRejectedValue(duplicateError);

      await createIntegrationModule(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'IntegrationID must be unique.' });
    });

    it('should call next() for other errors', async () => {
      req.body = {
        IntegrationID: 'INT001',
        ToolName: 'Slack',
        Description: 'Test',
        Link: 'https://slack.com',
      };

      const serverError = new Error('Database connection failed');

      databaseAdapter.create.mockRejectedValue(serverError);

      await createIntegrationModule(req, res, next);

      expect(next).toHaveBeenCalledWith(serverError);
    });

    it('should handle multiple validation errors', async () => {
      req.body = {};

      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.errors = {
        IntegrationID: { path: 'IntegrationID' },
        ToolName: { path: 'ToolName' },
      };

      databaseAdapter.create.mockRejectedValue(validationError);

      await createIntegrationModule(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      const responseBody = res.json.mock.calls[0][0];
      expect(responseBody.message).toContain('IntegrationID');
      expect(responseBody.message).toContain('ToolName');
    });
  });
});

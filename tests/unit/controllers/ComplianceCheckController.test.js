/**
 * ComplianceCheck Controller Unit Tests
 * Issue #20: Migrate remaining controllers to ZeroDB (Batch 1)
 * TDD Red Phase: Tests written before migration
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock must be before any requires
jest.mock('../../../services/databaseAdapter', () => ({
  initialized: true,
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  aggregate: jest.fn()
}));

const httpMocks = require('node-mocks-http');
const complianceCheckController = require('../../../controllers/ComplianceCheck');
const databaseAdapter = require('../../../services/databaseAdapter');

describe('ComplianceCheck Controller', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  describe('createComplianceCheck', () => {
    const validComplianceData = {
      CheckID: 'CHECK001',
      SPVID: 'SPV001',
      RegulationType: 'SEC',
      Status: 'Passed',
      Details: 'Compliance check passed successfully',
      Timestamp: '2024-01-15T10:00:00Z',
      LastCheckedBy: 'admin123'
    };

    it('should create a compliance check successfully', async () => {
      req.body = validComplianceData;
      const mockSavedCheck = { _id: 'check123', ...validComplianceData };
      databaseAdapter.create.mockResolvedValue(mockSavedCheck);

      await complianceCheckController.createComplianceCheck(req, res);

      expect(databaseAdapter.create).toHaveBeenCalledWith('ComplianceCheck', expect.objectContaining({
        CheckID: 'CHECK001',
        SPVID: 'SPV001',
        RegulationType: 'SEC'
      }));
      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res._getData())).toEqual(mockSavedCheck);
    });

    it('should return 400 when CheckID is missing', async () => {
      req.body = { ...validComplianceData, CheckID: undefined };

      await complianceCheckController.createComplianceCheck(req, res);

      expect(res.statusCode).toBe(400);
      const response = JSON.parse(res._getData());
      expect(response).toHaveProperty('message', 'Failed to create compliance check');
      expect(response.error).toContain('CheckID');
    });

    it('should return 400 when SPVID is missing', async () => {
      req.body = { ...validComplianceData, SPVID: undefined };

      await complianceCheckController.createComplianceCheck(req, res);

      expect(res.statusCode).toBe(400);
      const response = JSON.parse(res._getData());
      expect(response.error).toContain('SPVID');
    });

    it('should return 400 when multiple fields are missing', async () => {
      req.body = { CheckID: 'CHECK001' };

      await complianceCheckController.createComplianceCheck(req, res);

      expect(res.statusCode).toBe(400);
      const response = JSON.parse(res._getData());
      expect(response).toHaveProperty('message', 'Failed to create compliance check');
    });

    it('should return 500 on database error', async () => {
      req.body = validComplianceData;
      databaseAdapter.create.mockRejectedValue(new Error('Database error'));

      await complianceCheckController.createComplianceCheck(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Failed to create compliance check');
    });
  });

  describe('getComplianceChecks', () => {
    it('should return all compliance checks', async () => {
      const mockChecks = [
        { _id: 'check1', CheckID: 'CHECK001', Status: 'Passed' },
        { _id: 'check2', CheckID: 'CHECK002', Status: 'Failed' }
      ];
      databaseAdapter.find.mockResolvedValue(mockChecks);

      await complianceCheckController.getComplianceChecks(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('ComplianceCheck', {});
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({ complianceChecks: mockChecks });
    });

    it('should return empty array when no checks exist', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      await complianceCheckController.getComplianceChecks(req, res);

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({ complianceChecks: [] });
    });

    it('should return 500 on database error', async () => {
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await complianceCheckController.getComplianceChecks(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Failed to retrieve compliance checks');
    });
  });

  describe('deleteComplianceCheck', () => {
    it('should delete compliance check successfully', async () => {
      req.params = { id: 'check123' };
      const mockDeletedCheck = { _id: 'check123', CheckID: 'CHECK001' };
      databaseAdapter.findByIdAndDelete.mockResolvedValue(mockDeletedCheck);

      await complianceCheckController.deleteComplianceCheck(req, res);

      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('ComplianceCheck', 'check123');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Compliance check deleted');
    });

    it('should return 404 when compliance check not found', async () => {
      req.params = { id: 'nonexistent' };
      databaseAdapter.findByIdAndDelete.mockResolvedValue(null);

      await complianceCheckController.deleteComplianceCheck(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Compliance check not found');
    });

    it('should return 500 on database error', async () => {
      req.params = { id: 'check123' };
      databaseAdapter.findByIdAndDelete.mockRejectedValue(new Error('Database error'));

      await complianceCheckController.deleteComplianceCheck(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Failed to delete compliance check');
    });
  });
});

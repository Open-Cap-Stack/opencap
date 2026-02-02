/**
 * Communication Controller Unit Tests
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
const communicationController = require('../../../controllers/Communication');
const databaseAdapter = require('../../../services/databaseAdapter');

describe('Communication Controller', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  describe('createCommunication', () => {
    const validCommunicationData = {
      communicationId: 'COMM001',
      MessageType: 'Email',
      Sender: 'admin@company.com',
      Recipient: 'user@company.com',
      Timestamp: '2024-01-15T10:00:00Z',
      Content: 'This is a test communication'
    };

    it('should create a communication successfully', async () => {
      req.body = validCommunicationData;
      const mockSavedCommunication = { _id: 'comm123', ...validCommunicationData };
      databaseAdapter.create.mockResolvedValue(mockSavedCommunication);

      await communicationController.createCommunication(req, res);

      expect(databaseAdapter.create).toHaveBeenCalledWith('Communication', expect.objectContaining({
        communicationId: 'COMM001',
        MessageType: 'Email',
        Sender: 'admin@company.com'
      }));
      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res._getData())).toEqual(mockSavedCommunication);
    });

    it('should return 400 when required fields are missing', async () => {
      req.body = { communicationId: 'COMM001', MessageType: 'Email' };

      await communicationController.createCommunication(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Invalid communication data');
    });

    it('should return 500 on database error', async () => {
      req.body = validCommunicationData;
      databaseAdapter.create.mockRejectedValue(new Error('Database error'));

      await communicationController.createCommunication(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Database error');
    });
  });

  describe('getCommunications', () => {
    it('should return all communications', async () => {
      const mockCommunications = [
        { _id: 'comm1', communicationId: 'COMM001', MessageType: 'Email' },
        { _id: 'comm2', communicationId: 'COMM002', MessageType: 'SMS' }
      ];
      databaseAdapter.find.mockResolvedValue(mockCommunications);

      await communicationController.getCommunications(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('Communication', {});
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockCommunications);
    });

    it('should return 404 when no communications found', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      await communicationController.getCommunications(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'No communications found');
    });

    it('should return 500 on database error', async () => {
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await communicationController.getCommunications(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Database error');
    });
  });

  describe('getCommunicationById', () => {
    it('should return communication by ID', async () => {
      const mockCommunication = { _id: 'comm123', communicationId: 'COMM001', MessageType: 'Email' };
      req.params = { id: 'comm123' };
      databaseAdapter.findById.mockResolvedValue(mockCommunication);

      await communicationController.getCommunicationById(req, res);

      expect(databaseAdapter.findById).toHaveBeenCalledWith('Communication', 'comm123');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockCommunication);
    });

    it('should return 404 when communication not found', async () => {
      req.params = { id: 'nonexistent' };
      databaseAdapter.findById.mockResolvedValue(null);

      await communicationController.getCommunicationById(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Communication not found');
    });

    it('should return 500 on database error', async () => {
      req.params = { id: 'comm123' };
      databaseAdapter.findById.mockRejectedValue(new Error('Database error'));

      await communicationController.getCommunicationById(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Database error');
    });
  });

  describe('updateCommunication', () => {
    it('should update communication successfully', async () => {
      req.params = { id: 'comm123' };
      req.body = {
        communicationId: 'COMM001',
        MessageType: 'Email',
        Sender: 'admin@company.com',
        Recipient: 'newuser@company.com',
        Timestamp: '2024-01-15T10:00:00Z',
        Content: 'Updated content'
      };
      const mockUpdatedCommunication = { _id: 'comm123', ...req.body };
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedCommunication);

      await communicationController.updateCommunication(req, res);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'Communication',
        'comm123',
        expect.objectContaining({ Content: 'Updated content' }),
        { new: true, runValidators: true }
      );
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockUpdatedCommunication);
    });

    it('should return 404 when communication not found', async () => {
      req.params = { id: 'nonexistent' };
      req.body = { Content: 'Updated content' };
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(null);

      await communicationController.updateCommunication(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Communication not found');
    });

    it('should return 500 on database error', async () => {
      req.params = { id: 'comm123' };
      req.body = { Content: 'Updated content' };
      databaseAdapter.findByIdAndUpdate.mockRejectedValue(new Error('Database error'));

      await communicationController.updateCommunication(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Database error');
    });
  });

  describe('deleteCommunication', () => {
    it('should delete communication successfully', async () => {
      req.params = { id: 'comm123' };
      const mockDeletedCommunication = { _id: 'comm123', communicationId: 'COMM001' };
      databaseAdapter.findByIdAndDelete.mockResolvedValue(mockDeletedCommunication);

      await communicationController.deleteCommunication(req, res);

      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('Communication', 'comm123');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Communication deleted');
    });

    it('should return 404 when communication not found', async () => {
      req.params = { id: 'nonexistent' };
      databaseAdapter.findByIdAndDelete.mockResolvedValue(null);

      await communicationController.deleteCommunication(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Communication not found');
    });

    it('should return 500 on database error', async () => {
      req.params = { id: 'comm123' };
      databaseAdapter.findByIdAndDelete.mockRejectedValue(new Error('Database error'));

      await communicationController.deleteCommunication(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Database error');
    });
  });
});

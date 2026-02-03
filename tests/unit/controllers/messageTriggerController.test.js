/**
 * MessageTrigger Controller Tests
 *
 * Issue #88: Build Automated Triggered Messages
 *
 * TDD Tests for the message trigger controller
 * Tests CRUD operations and trigger management API endpoints
 */

const httpMocks = require('node-mocks-http');
const databaseAdapter = require('../../../services/databaseAdapter');

// Mock dependencies
jest.mock('../../../services/databaseAdapter');

// Import controller after mocking
const messageTriggerController = require('../../../controllers/messageTriggerController');

describe('MessageTriggerController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
  });

  describe('createTrigger', () => {
    it('should create a new message trigger successfully', async () => {
      const triggerData = {
        triggerId: 'TRG-001',
        name: 'Vesting Notification',
        eventType: 'vesting',
        triggerType: 'immediate',
        messageTemplate: {
          subject: 'Vesting Alert: {{vestingAmount}} shares',
          body: 'Dear {{recipientName}}, your shares have vested.',
          variables: ['vestingAmount', 'recipientName']
        },
        isActive: true,
        companyId: 'company-001'
      };

      req.body = triggerData;

      const mockCreatedTrigger = {
        _id: 'mongo_123',
        ...triggerData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      databaseAdapter.create.mockResolvedValue(mockCreatedTrigger);

      await messageTriggerController.createTrigger(req, res);

      expect(res.statusCode).toBe(201);
      expect(databaseAdapter.create).toHaveBeenCalledWith('MessageTrigger', expect.objectContaining({
        triggerId: 'TRG-001',
        name: 'Vesting Notification'
      }));
    });

    it('should return 400 when required fields are missing', async () => {
      req.body = {
        name: 'Incomplete Trigger'
        // Missing required fields: triggerId, eventType, triggerType, messageTemplate
      };

      await messageTriggerController.createTrigger(req, res);

      expect(res.statusCode).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.message).toContain('required');
    });

    it('should return 400 when eventType is invalid', async () => {
      req.body = {
        triggerId: 'TRG-002',
        name: 'Invalid Event Trigger',
        eventType: 'invalid_event_type',
        triggerType: 'immediate',
        messageTemplate: {
          subject: 'Test',
          body: 'Test',
          variables: []
        },
        companyId: 'company-001'
      };

      await messageTriggerController.createTrigger(req, res);

      expect(res.statusCode).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.message).toContain('event');
    });

    it('should return 409 when triggerId already exists', async () => {
      req.body = {
        triggerId: 'TRG-EXISTING',
        name: 'Duplicate Trigger',
        eventType: 'vesting',
        triggerType: 'immediate',
        messageTemplate: {
          subject: 'Test',
          body: 'Test',
          variables: []
        },
        companyId: 'company-001'
      };

      databaseAdapter.create.mockRejectedValue({
        code: 11000,
        message: 'Duplicate key error'
      });

      await messageTriggerController.createTrigger(req, res);

      expect(res.statusCode).toBe(409);
    });

    it('should handle server errors', async () => {
      req.body = {
        triggerId: 'TRG-003',
        name: 'Server Error Trigger',
        eventType: 'vesting',
        triggerType: 'immediate',
        messageTemplate: {
          subject: 'Test',
          body: 'Test',
          variables: []
        },
        companyId: 'company-001'
      };

      databaseAdapter.create.mockRejectedValue(new Error('Database error'));

      await messageTriggerController.createTrigger(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('getTriggers', () => {
    it('should return all triggers', async () => {
      const mockTriggers = [
        { _id: 'mongo_1', triggerId: 'TRG-001', name: 'Trigger 1', eventType: 'vesting' },
        { _id: 'mongo_2', triggerId: 'TRG-002', name: 'Trigger 2', eventType: 'document_signing' }
      ];

      databaseAdapter.find.mockResolvedValue(mockTriggers);
      databaseAdapter.count.mockResolvedValue(2);

      await messageTriggerController.getTriggers(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.find).toHaveBeenCalledWith('MessageTrigger', {}, expect.any(Object));
    });

    it('should filter triggers by eventType', async () => {
      req.query = { eventType: 'vesting' };

      databaseAdapter.find.mockResolvedValue([]);
      databaseAdapter.count.mockResolvedValue(0);

      await messageTriggerController.getTriggers(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'MessageTrigger',
        expect.objectContaining({ eventType: 'vesting' }),
        expect.any(Object)
      );
    });

    it('should filter triggers by companyId', async () => {
      req.query = { companyId: 'company-001' };

      databaseAdapter.find.mockResolvedValue([]);
      databaseAdapter.count.mockResolvedValue(0);

      await messageTriggerController.getTriggers(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'MessageTrigger',
        expect.objectContaining({ companyId: 'company-001' }),
        expect.any(Object)
      );
    });

    it('should filter triggers by isActive status', async () => {
      req.query = { isActive: 'true' };

      databaseAdapter.find.mockResolvedValue([]);
      databaseAdapter.count.mockResolvedValue(0);

      await messageTriggerController.getTriggers(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'MessageTrigger',
        expect.objectContaining({ isActive: true }),
        expect.any(Object)
      );
    });

    it('should support pagination', async () => {
      req.query = { page: '2', limit: '10' };

      databaseAdapter.find.mockResolvedValue([]);
      databaseAdapter.count.mockResolvedValue(25);

      await messageTriggerController.getTriggers(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'MessageTrigger',
        {},
        expect.objectContaining({ skip: 10, limit: 10 })
      );
    });
  });

  describe('getTriggerById', () => {
    it('should return trigger by ID', async () => {
      req.params = { id: 'mongo_123' };
      const mockTrigger = {
        _id: 'mongo_123',
        triggerId: 'TRG-001',
        name: 'Test Trigger'
      };

      databaseAdapter.findById.mockResolvedValue(mockTrigger);

      await messageTriggerController.getTriggerById(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.findById).toHaveBeenCalledWith('MessageTrigger', 'mongo_123');
    });

    it('should return 404 when trigger not found', async () => {
      req.params = { id: 'nonexistent_id' };

      databaseAdapter.findById.mockResolvedValue(null);

      await messageTriggerController.getTriggerById(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('updateTrigger', () => {
    it('should update trigger successfully', async () => {
      req.params = { id: 'mongo_123' };
      req.body = {
        name: 'Updated Trigger Name',
        isActive: false
      };

      const mockUpdatedTrigger = {
        _id: 'mongo_123',
        triggerId: 'TRG-001',
        name: 'Updated Trigger Name',
        isActive: false
      };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedTrigger);

      await messageTriggerController.updateTrigger(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'MessageTrigger',
        'mongo_123',
        expect.objectContaining({ name: 'Updated Trigger Name' }),
        expect.any(Object)
      );
    });

    it('should return 404 when trigger to update not found', async () => {
      req.params = { id: 'nonexistent_id' };
      req.body = { name: 'New Name' };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(null);

      await messageTriggerController.updateTrigger(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should prevent updating triggerId', async () => {
      req.params = { id: 'mongo_123' };
      req.body = {
        triggerId: 'NEW-TRG-ID', // Should not be allowed
        name: 'Updated Name'
      };

      const mockUpdatedTrigger = {
        _id: 'mongo_123',
        triggerId: 'TRG-001', // Original ID preserved
        name: 'Updated Name'
      };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedTrigger);

      await messageTriggerController.updateTrigger(req, res);

      // Verify triggerId was removed from update payload
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'MessageTrigger',
        'mongo_123',
        expect.not.objectContaining({ triggerId: 'NEW-TRG-ID' }),
        expect.any(Object)
      );
    });
  });

  describe('deleteTrigger', () => {
    it('should delete trigger successfully', async () => {
      req.params = { id: 'mongo_123' };

      databaseAdapter.findByIdAndDelete.mockResolvedValue({ _id: 'mongo_123' });

      await messageTriggerController.deleteTrigger(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('MessageTrigger', 'mongo_123');
    });

    it('should return 404 when trigger to delete not found', async () => {
      req.params = { id: 'nonexistent_id' };

      databaseAdapter.findByIdAndDelete.mockResolvedValue(null);

      await messageTriggerController.deleteTrigger(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('activateTrigger', () => {
    it('should activate trigger successfully', async () => {
      req.params = { id: 'mongo_123' };

      const mockUpdatedTrigger = {
        _id: 'mongo_123',
        triggerId: 'TRG-001',
        isActive: true
      };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedTrigger);

      await messageTriggerController.activateTrigger(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'MessageTrigger',
        'mongo_123',
        { isActive: true },
        expect.any(Object)
      );
    });
  });

  describe('deactivateTrigger', () => {
    it('should deactivate trigger successfully', async () => {
      req.params = { id: 'mongo_123' };

      const mockUpdatedTrigger = {
        _id: 'mongo_123',
        triggerId: 'TRG-001',
        isActive: false
      };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedTrigger);

      await messageTriggerController.deactivateTrigger(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'MessageTrigger',
        'mongo_123',
        { isActive: false },
        expect.any(Object)
      );
    });
  });

  describe('testTrigger', () => {
    it('should test trigger with sample payload', async () => {
      req.params = { id: 'mongo_123' };
      req.body = {
        testPayload: {
          vestingAmount: 1000,
          recipientName: 'Test User'
        }
      };

      const mockTrigger = {
        _id: 'mongo_123',
        triggerId: 'TRG-001',
        messageTemplate: {
          subject: 'Vesting: {{vestingAmount}} shares',
          body: 'Dear {{recipientName}}, your shares vested.',
          variables: ['vestingAmount', 'recipientName']
        },
        triggerRules: null,
        deliveryChannels: ['email']
      };

      databaseAdapter.findById.mockResolvedValue(mockTrigger);

      await messageTriggerController.testTrigger(req, res);

      expect(res.statusCode).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.triggerId).toBe('TRG-001');
      expect(responseData.rulesPassed).toBe(true);
      expect(responseData.preview).toBeDefined();
      expect(responseData.preview.subject).toBe('Vesting: 1000 shares');
      expect(responseData.preview.body).toBe('Dear Test User, your shares vested.');
    });

    it('should return rule evaluation result in test', async () => {
      req.params = { id: 'mongo_123' };
      req.body = {
        testPayload: { amount: 500 }
      };

      const mockTrigger = {
        _id: 'mongo_123',
        triggerId: 'TRG-001',
        messageTemplate: {
          subject: 'Test',
          body: 'Test',
          variables: []
        },
        triggerRules: {
          conditions: [{ field: 'amount', operator: 'gt', value: 1000 }],
          logic: 'AND'
        },
        deliveryChannels: ['in_app']
      };

      databaseAdapter.findById.mockResolvedValue(mockTrigger);

      await messageTriggerController.testTrigger(req, res);

      expect(res.statusCode).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.rulesPassed).toBe(false);
    });

    it('should return 404 when trigger not found for testing', async () => {
      req.params = { id: 'nonexistent' };
      req.body = { testPayload: {} };

      databaseAdapter.findById.mockResolvedValue(null);

      await messageTriggerController.testTrigger(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('getTriggerHistory', () => {
    it('should return trigger execution history', async () => {
      req.params = { id: 'mongo_123' };
      req.query = { limit: '50' };

      const mockTrigger = {
        _id: 'mongo_123',
        triggerId: 'TRG-001',
        fireCount: 5,
        lastFiredAt: new Date()
      };

      const mockHistory = [
        {
          _id: 'hist_1',
          triggerId: 'TRG-001',
          executedAt: new Date(),
          status: 'success',
          recipientCount: 5
        }
      ];

      databaseAdapter.findById.mockResolvedValue(mockTrigger);
      databaseAdapter.find.mockResolvedValue(mockHistory);

      await messageTriggerController.getTriggerHistory(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.findById).toHaveBeenCalledWith('MessageTrigger', 'mongo_123');
      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'TriggerHistory',
        expect.objectContaining({ triggerId: 'TRG-001' }),
        expect.objectContaining({ limit: 50 })
      );
    });

    it('should return 404 when trigger not found for history', async () => {
      req.params = { id: 'nonexistent' };
      req.query = {};

      databaseAdapter.findById.mockResolvedValue(null);

      await messageTriggerController.getTriggerHistory(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('fireManualTrigger', () => {
    it('should manually fire a trigger', async () => {
      req.params = { id: 'mongo_123' };
      req.body = {
        payload: { customData: 'test' },
        recipientIds: ['user-1', 'user-2']
      };

      const mockTrigger = {
        _id: 'mongo_123',
        triggerId: 'TRG-001',
        name: 'Manual Trigger',
        messageTemplate: {
          subject: 'Manual Alert',
          body: 'Manual message',
          variables: []
        },
        deliveryChannels: ['email']
      };

      databaseAdapter.findById.mockResolvedValue(mockTrigger);
      databaseAdapter.create.mockResolvedValue({ _id: 'history-001' });

      await messageTriggerController.fireManualTrigger(req, res);

      expect(res.statusCode).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.message).toContain('fired');
    });
  });

  describe('getEventTypes', () => {
    it('should return all supported event types', async () => {
      await messageTriggerController.getEventTypes(req, res);

      expect(res.statusCode).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.eventTypes).toBeDefined();
      expect(Array.isArray(responseData.eventTypes)).toBe(true);
      expect(responseData.eventTypes).toContain('vesting');
      expect(responseData.eventTypes).toContain('document_signing');
    });
  });

  describe('getTriggerTypes', () => {
    it('should return all supported trigger types', async () => {
      await messageTriggerController.getTriggerTypes(req, res);

      expect(res.statusCode).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.triggerTypes).toBeDefined();
      expect(Array.isArray(responseData.triggerTypes)).toBe(true);
      expect(responseData.triggerTypes).toContain('immediate');
      expect(responseData.triggerTypes).toContain('scheduled');
    });
  });
});

/**
 * InvestorCommunication Controller Unit Tests
 * Issue #91: Build Investor Communication System
 * TDD Red Phase: Tests written before implementation
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
  count: jest.fn(),
  aggregate: jest.fn()
}));

jest.mock('../../../services/investorCommunicationService', () => ({
  segmentInvestors: jest.fn(),
  sendCommunication: jest.fn(),
  scheduleCommunication: jest.fn(),
  getDeliveryStatus: jest.fn(),
  trackDelivery: jest.fn(),
  getInvestorPreferences: jest.fn(),
  updateInvestorPreferences: jest.fn(),
  unsubscribe: jest.fn()
}));

const httpMocks = require('node-mocks-http');
const investorCommunicationController = require('../../../controllers/investorCommunicationController');
const databaseAdapter = require('../../../services/databaseAdapter');
const investorCommunicationService = require('../../../services/investorCommunicationService');

describe('InvestorCommunication Controller', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  describe('createCommunication', () => {
    const validCommunicationData = {
      communicationId: 'INVCOM-001',
      companyId: '507f1f77bcf86cd799439011',
      communicationType: 'quarterly_update',
      subject: 'Q4 2025 Quarterly Update',
      content: 'Dear Investors, here is our quarterly update...',
      deliveryChannel: 'email',
      createdBy: '507f1f77bcf86cd799439012'
    };

    it('should create a communication successfully', async () => {
      req.body = validCommunicationData;
      const mockSavedCommunication = { _id: 'comm123', ...validCommunicationData, status: 'draft' };
      databaseAdapter.create.mockResolvedValue(mockSavedCommunication);

      await investorCommunicationController.createCommunication(req, res);

      expect(databaseAdapter.create).toHaveBeenCalledWith('InvestorCommunication', expect.objectContaining({
        communicationId: 'INVCOM-001',
        communicationType: 'quarterly_update'
      }));
      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res._getData())).toHaveProperty('_id', 'comm123');
    });

    it('should return 400 when required fields are missing', async () => {
      req.body = { communicationId: 'INVCOM-001' };

      await investorCommunicationController.createCommunication(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('message');
    });

    it('should return 500 on database error', async () => {
      req.body = validCommunicationData;
      databaseAdapter.create.mockRejectedValue(new Error('Database error'));

      await investorCommunicationController.createCommunication(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Database error');
    });
  });

  describe('getCommunications', () => {
    it('should return all communications for a company', async () => {
      req.query = { companyId: '507f1f77bcf86cd799439011' };
      const mockCommunications = [
        { _id: 'comm1', communicationId: 'INVCOM-001', communicationType: 'quarterly_update' },
        { _id: 'comm2', communicationId: 'INVCOM-002', communicationType: 'annual_report' }
      ];
      databaseAdapter.find.mockResolvedValue(mockCommunications);

      await investorCommunicationController.getCommunications(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('InvestorCommunication', expect.objectContaining({
        companyId: '507f1f77bcf86cd799439011'
      }), expect.any(Object));
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveLength(2);
    });

    it('should filter by communicationType', async () => {
      req.query = { companyId: '507f1f77bcf86cd799439011', communicationType: 'quarterly_update' };
      const mockCommunications = [
        { _id: 'comm1', communicationId: 'INVCOM-001', communicationType: 'quarterly_update' }
      ];
      databaseAdapter.find.mockResolvedValue(mockCommunications);

      await investorCommunicationController.getCommunications(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('InvestorCommunication', expect.objectContaining({
        communicationType: 'quarterly_update'
      }), expect.any(Object));
      expect(res.statusCode).toBe(200);
    });

    it('should filter by status', async () => {
      req.query = { companyId: '507f1f77bcf86cd799439011', status: 'sent' };
      databaseAdapter.find.mockResolvedValue([]);

      await investorCommunicationController.getCommunications(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('InvestorCommunication', expect.objectContaining({
        status: 'sent'
      }), expect.any(Object));
    });

    it('should return 404 when no communications found', async () => {
      req.query = { companyId: '507f1f77bcf86cd799439011' };
      databaseAdapter.find.mockResolvedValue([]);

      await investorCommunicationController.getCommunications(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'No communications found');
    });

    it('should return 500 on database error', async () => {
      req.query = { companyId: '507f1f77bcf86cd799439011' };
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await investorCommunicationController.getCommunications(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('getCommunicationById', () => {
    it('should return communication by ID', async () => {
      req.params = { id: 'comm123' };
      const mockCommunication = { _id: 'comm123', communicationId: 'INVCOM-001', communicationType: 'quarterly_update' };
      databaseAdapter.findById.mockResolvedValue(mockCommunication);

      await investorCommunicationController.getCommunicationById(req, res);

      expect(databaseAdapter.findById).toHaveBeenCalledWith('InvestorCommunication', 'comm123');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockCommunication);
    });

    it('should return 404 when communication not found', async () => {
      req.params = { id: 'nonexistent' };
      databaseAdapter.findById.mockResolvedValue(null);

      await investorCommunicationController.getCommunicationById(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Communication not found');
    });

    it('should return 500 on database error', async () => {
      req.params = { id: 'comm123' };
      databaseAdapter.findById.mockRejectedValue(new Error('Database error'));

      await investorCommunicationController.getCommunicationById(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('updateCommunication', () => {
    it('should update communication successfully', async () => {
      req.params = { id: 'comm123' };
      req.body = {
        subject: 'Updated Q4 Report',
        content: 'Updated content...'
      };
      const existingCommunication = { _id: 'comm123', status: 'draft' };
      const mockUpdatedCommunication = { _id: 'comm123', ...req.body, status: 'draft' };
      databaseAdapter.findById.mockResolvedValue(existingCommunication);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedCommunication);

      await investorCommunicationController.updateCommunication(req, res);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'InvestorCommunication',
        'comm123',
        expect.objectContaining({ subject: 'Updated Q4 Report' }),
        { new: true, runValidators: true }
      );
      expect(res.statusCode).toBe(200);
    });

    it('should return 404 when communication not found', async () => {
      req.params = { id: 'nonexistent' };
      req.body = { subject: 'Updated' };
      databaseAdapter.findById.mockResolvedValue(null);

      await investorCommunicationController.updateCommunication(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should not allow updating sent communications', async () => {
      req.params = { id: 'comm123' };
      req.body = { subject: 'Updated' };
      const sentCommunication = { _id: 'comm123', status: 'sent' };
      databaseAdapter.findById.mockResolvedValue(sentCommunication);

      await investorCommunicationController.updateCommunication(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('message');
    });

    it('should return 500 on database error', async () => {
      req.params = { id: 'comm123' };
      req.body = { subject: 'Updated' };
      databaseAdapter.findById.mockResolvedValue({ _id: 'comm123', status: 'draft' });
      databaseAdapter.findByIdAndUpdate.mockRejectedValue(new Error('Database error'));

      await investorCommunicationController.updateCommunication(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('deleteCommunication', () => {
    it('should delete communication successfully', async () => {
      req.params = { id: 'comm123' };
      const mockDeletedCommunication = { _id: 'comm123', status: 'draft' };
      databaseAdapter.findById.mockResolvedValue(mockDeletedCommunication);
      databaseAdapter.findByIdAndDelete.mockResolvedValue(mockDeletedCommunication);

      await investorCommunicationController.deleteCommunication(req, res);

      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('InvestorCommunication', 'comm123');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Communication deleted successfully');
    });

    it('should return 404 when communication not found', async () => {
      req.params = { id: 'nonexistent' };
      databaseAdapter.findById.mockResolvedValue(null);

      await investorCommunicationController.deleteCommunication(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should not allow deleting sent communications', async () => {
      req.params = { id: 'comm123' };
      const sentCommunication = { _id: 'comm123', status: 'sent' };
      databaseAdapter.findById.mockResolvedValue(sentCommunication);

      await investorCommunicationController.deleteCommunication(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('message');
    });

    it('should return 500 on database error', async () => {
      req.params = { id: 'comm123' };
      databaseAdapter.findById.mockResolvedValue({ _id: 'comm123', status: 'draft' });
      databaseAdapter.findByIdAndDelete.mockRejectedValue(new Error('Database error'));

      await investorCommunicationController.deleteCommunication(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('sendCommunication', () => {
    it('should send communication successfully', async () => {
      req.params = { id: 'comm123' };
      const mockCommunication = { _id: 'comm123', status: 'draft', segmentation: {} };
      databaseAdapter.findById.mockResolvedValue(mockCommunication);
      investorCommunicationService.segmentInvestors.mockResolvedValue([
        { _id: 'inv1', email: 'investor1@example.com' },
        { _id: 'inv2', email: 'investor2@example.com' }
      ]);
      investorCommunicationService.sendCommunication.mockResolvedValue({
        success: true,
        sent: 2,
        failed: 0
      });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ ...mockCommunication, status: 'sent' });

      await investorCommunicationController.sendCommunication(req, res);

      expect(investorCommunicationService.sendCommunication).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('success', true);
    });

    it('should return 404 when communication not found', async () => {
      req.params = { id: 'nonexistent' };
      databaseAdapter.findById.mockResolvedValue(null);

      await investorCommunicationController.sendCommunication(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for already sent communications', async () => {
      req.params = { id: 'comm123' };
      const sentCommunication = { _id: 'comm123', status: 'sent' };
      databaseAdapter.findById.mockResolvedValue(sentCommunication);

      await investorCommunicationController.sendCommunication(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('message');
    });

    it('should return 500 on service error', async () => {
      req.params = { id: 'comm123' };
      const mockCommunication = { _id: 'comm123', status: 'draft' };
      databaseAdapter.findById.mockResolvedValue(mockCommunication);
      investorCommunicationService.segmentInvestors.mockRejectedValue(new Error('Service error'));

      await investorCommunicationController.sendCommunication(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('scheduleCommunication', () => {
    it('should schedule communication successfully', async () => {
      req.params = { id: 'comm123' };
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now
      req.body = { scheduledFor: futureDate };
      const mockCommunication = { _id: 'comm123', status: 'draft' };
      databaseAdapter.findById.mockResolvedValue(mockCommunication);
      investorCommunicationService.scheduleCommunication.mockResolvedValue({
        success: true,
        scheduledFor: futureDate
      });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ ...mockCommunication, status: 'scheduled' });

      await investorCommunicationController.scheduleCommunication(req, res);

      expect(investorCommunicationService.scheduleCommunication).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('success', true);
    });

    it('should return 400 when scheduledFor is missing', async () => {
      req.params = { id: 'comm123' };
      req.body = {};

      await investorCommunicationController.scheduleCommunication(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when scheduledFor is in the past', async () => {
      req.params = { id: 'comm123' };
      req.body = { scheduledFor: '2020-01-01T10:00:00Z' };

      await investorCommunicationController.scheduleCommunication(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('message');
    });

    it('should return 404 when communication not found', async () => {
      req.params = { id: 'nonexistent' };
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      req.body = { scheduledFor: futureDate };
      databaseAdapter.findById.mockResolvedValue(null);

      await investorCommunicationController.scheduleCommunication(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('segmentInvestors', () => {
    it('should return segmented investors', async () => {
      req.body = {
        companyId: '507f1f77bcf86cd799439011',
        investorTypes: ['Angel', 'Venture Capital'],
        minInvestmentAmount: 50000
      };
      const mockInvestors = [
        { _id: 'inv1', investorType: 'Angel', investmentAmount: 100000 },
        { _id: 'inv2', investorType: 'Venture Capital', investmentAmount: 500000 }
      ];
      investorCommunicationService.segmentInvestors.mockResolvedValue(mockInvestors);

      await investorCommunicationController.segmentInvestors(req, res);

      expect(investorCommunicationService.segmentInvestors).toHaveBeenCalledWith(expect.objectContaining({
        companyId: '507f1f77bcf86cd799439011',
        investorTypes: ['Angel', 'Venture Capital'],
        minInvestmentAmount: 50000
      }));
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).investors).toHaveLength(2);
    });

    it('should return 400 when companyId is missing', async () => {
      req.body = { investorTypes: ['Angel'] };

      await investorCommunicationController.segmentInvestors(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 500 on service error', async () => {
      req.body = { companyId: '507f1f77bcf86cd799439011' };
      investorCommunicationService.segmentInvestors.mockRejectedValue(new Error('Service error'));

      await investorCommunicationController.segmentInvestors(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('getDeliveryStatus', () => {
    it('should return delivery status for a communication', async () => {
      req.params = { id: 'comm123' };
      const mockCommunication = {
        _id: 'comm123',
        status: 'sent',
        deliveryTracking: [
          { investorId: 'inv1', status: 'delivered', deliveredAt: new Date() },
          { investorId: 'inv2', status: 'sent', deliveredAt: null }
        ]
      };
      databaseAdapter.findById.mockResolvedValue(mockCommunication);
      investorCommunicationService.getDeliveryStatus.mockResolvedValue({
        total: 2,
        delivered: 1,
        sent: 1,
        failed: 0
      });

      await investorCommunicationController.getDeliveryStatus(req, res);

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('total', 2);
    });

    it('should return 404 when communication not found', async () => {
      req.params = { id: 'nonexistent' };
      databaseAdapter.findById.mockResolvedValue(null);

      await investorCommunicationController.getDeliveryStatus(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should return 500 on database error', async () => {
      req.params = { id: 'comm123' };
      databaseAdapter.findById.mockRejectedValue(new Error('Database error'));

      await investorCommunicationController.getDeliveryStatus(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('createTemplate', () => {
    it('should create a communication template', async () => {
      req.body = {
        templateId: 'TPL-001',
        companyId: '507f1f77bcf86cd799439011',
        name: 'Quarterly Update Template',
        communicationType: 'quarterly_update',
        subject: 'Q{{quarter}} {{year}} Quarterly Update',
        content: 'Dear {{investorName}}, here is our quarterly update...',
        createdBy: '507f1f77bcf86cd799439012'
      };
      const mockTemplate = { _id: 'template123', ...req.body };
      databaseAdapter.create.mockResolvedValue(mockTemplate);

      await investorCommunicationController.createTemplate(req, res);

      expect(databaseAdapter.create).toHaveBeenCalledWith('InvestorCommunicationTemplate', expect.objectContaining({
        templateId: 'TPL-001'
      }));
      expect(res.statusCode).toBe(201);
    });

    it('should return 400 when required fields are missing', async () => {
      req.body = { templateId: 'TPL-001' };

      await investorCommunicationController.createTemplate(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('getTemplates', () => {
    it('should return templates for a company', async () => {
      req.query = { companyId: '507f1f77bcf86cd799439011' };
      const mockTemplates = [
        { _id: 'tpl1', name: 'Template 1' },
        { _id: 'tpl2', name: 'Template 2' }
      ];
      databaseAdapter.find.mockResolvedValue(mockTemplates);

      await investorCommunicationController.getTemplates(req, res);

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).templates).toHaveLength(2);
    });

    it('should return 400 when companyId is missing', async () => {
      req.query = {};

      await investorCommunicationController.getTemplates(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should filter by communicationType', async () => {
      req.query = { companyId: '507f1f77bcf86cd799439011', communicationType: 'quarterly_update' };
      const mockTemplates = [{ _id: 'tpl1', name: 'Quarterly Template', communicationType: 'quarterly_update' }];
      databaseAdapter.find.mockResolvedValue(mockTemplates);

      await investorCommunicationController.getTemplates(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('InvestorCommunicationTemplate', expect.objectContaining({
        communicationType: 'quarterly_update'
      }), expect.any(Object));
      expect(res.statusCode).toBe(200);
    });

    it('should filter by isActive status', async () => {
      req.query = { companyId: '507f1f77bcf86cd799439011', isActive: 'true' };
      const mockTemplates = [{ _id: 'tpl1', name: 'Active Template', isActive: true }];
      databaseAdapter.find.mockResolvedValue(mockTemplates);

      await investorCommunicationController.getTemplates(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('InvestorCommunicationTemplate', expect.objectContaining({
        isActive: true
      }), expect.any(Object));
      expect(res.statusCode).toBe(200);
    });

    it('should return 500 on database error', async () => {
      req.query = { companyId: '507f1f77bcf86cd799439011' };
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await investorCommunicationController.getTemplates(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('getPreferences', () => {
    it('should return investor preferences successfully', async () => {
      req.params = { investorId: 'inv123', companyId: 'comp123' };
      const mockPreferences = {
        investorId: 'inv123',
        companyId: 'comp123',
        communicationPreferences: { email: true, sms: false },
        frequency: 'immediate'
      };
      investorCommunicationService.getInvestorPreferences = jest.fn().mockResolvedValue(mockPreferences);

      await investorCommunicationController.getPreferences(req, res);

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('communicationPreferences');
    });

    it('should return 400 when investorId is missing', async () => {
      req.params = { companyId: 'comp123' };

      await investorCommunicationController.getPreferences(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when companyId is missing', async () => {
      req.params = { investorId: 'inv123' };

      await investorCommunicationController.getPreferences(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 500 on service error', async () => {
      req.params = { investorId: 'inv123', companyId: 'comp123' };
      investorCommunicationService.getInvestorPreferences = jest.fn().mockRejectedValue(new Error('Service error'));

      await investorCommunicationController.getPreferences(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('updatePreferences', () => {
    it('should update investor preferences successfully', async () => {
      req.params = { investorId: 'inv123', companyId: 'comp123' };
      req.body = {
        communicationPreferences: { email: true, sms: true },
        frequency: 'daily_digest'
      };
      const mockUpdatedPreferences = {
        investorId: 'inv123',
        companyId: 'comp123',
        ...req.body
      };
      investorCommunicationService.updateInvestorPreferences = jest.fn().mockResolvedValue(mockUpdatedPreferences);

      await investorCommunicationController.updatePreferences(req, res);

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('frequency', 'daily_digest');
    });

    it('should return 400 when investorId is missing', async () => {
      req.params = { companyId: 'comp123' };
      req.body = { frequency: 'daily_digest' };

      await investorCommunicationController.updatePreferences(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when companyId is missing', async () => {
      req.params = { investorId: 'inv123' };
      req.body = { frequency: 'daily_digest' };

      await investorCommunicationController.updatePreferences(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 500 on service error', async () => {
      req.params = { investorId: 'inv123', companyId: 'comp123' };
      req.body = { frequency: 'daily_digest' };
      investorCommunicationService.updateInvestorPreferences = jest.fn().mockRejectedValue(new Error('Service error'));

      await investorCommunicationController.updatePreferences(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe investor from all communications', async () => {
      req.params = { investorId: 'inv123', companyId: 'comp123' };
      req.body = {};
      const mockResult = {
        investorId: 'inv123',
        companyId: 'comp123',
        unsubscribedAll: true
      };
      investorCommunicationService.unsubscribe = jest.fn().mockResolvedValue(mockResult);

      await investorCommunicationController.unsubscribe(req, res);

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Unsubscribed from all communications');
    });

    it('should unsubscribe investor from specific communication type', async () => {
      req.params = { investorId: 'inv123', companyId: 'comp123' };
      req.body = { communicationType: 'quarterly_update' };
      const mockResult = {
        investorId: 'inv123',
        companyId: 'comp123',
        notificationTypes: { quarterlyUpdates: false }
      };
      investorCommunicationService.unsubscribe = jest.fn().mockResolvedValue(mockResult);

      await investorCommunicationController.unsubscribe(req, res);

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Unsubscribed from quarterly_update communications');
    });

    it('should return 400 when investorId is missing', async () => {
      req.params = { companyId: 'comp123' };
      req.body = {};

      await investorCommunicationController.unsubscribe(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when companyId is missing', async () => {
      req.params = { investorId: 'inv123' };
      req.body = {};

      await investorCommunicationController.unsubscribe(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 500 on service error', async () => {
      req.params = { investorId: 'inv123', companyId: 'comp123' };
      req.body = {};
      investorCommunicationService.unsubscribe = jest.fn().mockRejectedValue(new Error('Service error'));

      await investorCommunicationController.unsubscribe(req, res);

      expect(res.statusCode).toBe(500);
    });
  });
});

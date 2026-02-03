/**
 * InvestorCommunication Service Unit Tests
 * Issue #91: Build Investor Communication System
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

jest.mock('../../../services/databaseAdapter', () => ({
  initialized: true,
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  create: jest.fn(),
  aggregate: jest.fn()
}));

const databaseAdapter = require('../../../services/databaseAdapter');
const investorCommunicationService = require('../../../services/investorCommunicationService');

describe('InvestorCommunication Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('segmentInvestors', () => {
    it('should segment investors by type', async () => {
      const criteria = {
        companyId: '507f1f77bcf86cd799439011',
        investorTypes: ['Angel', 'Venture Capital']
      };
      const mockInvestors = [
        { _id: 'inv1', investorType: 'Angel', investmentAmount: 100000 },
        { _id: 'inv2', investorType: 'Venture Capital', investmentAmount: 500000 }
      ];
      databaseAdapter.find.mockResolvedValue(mockInvestors);

      const result = await investorCommunicationService.segmentInvestors(criteria);

      expect(databaseAdapter.find).toHaveBeenCalledWith('Investor', expect.objectContaining({
        investorType: { $in: ['Angel', 'Venture Capital'] }
      }), expect.any(Object));
      expect(result).toHaveLength(2);
    });

    it('should segment investors by investment amount range', async () => {
      const criteria = {
        companyId: '507f1f77bcf86cd799439011',
        minInvestmentAmount: 50000,
        maxInvestmentAmount: 200000
      };
      const mockInvestors = [
        { _id: 'inv1', investorType: 'Angel', investmentAmount: 100000 }
      ];
      databaseAdapter.find.mockResolvedValue(mockInvestors);

      const result = await investorCommunicationService.segmentInvestors(criteria);

      expect(databaseAdapter.find).toHaveBeenCalledWith('Investor', expect.objectContaining({
        investmentAmount: { $gte: 50000, $lte: 200000 }
      }), expect.any(Object));
      expect(result).toHaveLength(1);
    });

    it('should segment investors by investment date range', async () => {
      const criteria = {
        companyId: '507f1f77bcf86cd799439011',
        investmentDateFrom: '2024-01-01',
        investmentDateTo: '2024-12-31'
      };
      databaseAdapter.find.mockResolvedValue([]);

      await investorCommunicationService.segmentInvestors(criteria);

      expect(databaseAdapter.find).toHaveBeenCalledWith('Investor', expect.objectContaining({
        createdAt: expect.objectContaining({
          $gte: expect.any(Date),
          $lte: expect.any(Date)
        })
      }), expect.any(Object));
    });

    it('should segment by specific investor IDs', async () => {
      const criteria = {
        companyId: '507f1f77bcf86cd799439011',
        investorIds: ['inv1', 'inv2', 'inv3']
      };
      const mockInvestors = [
        { _id: 'inv1', investorType: 'Angel' },
        { _id: 'inv2', investorType: 'Venture Capital' }
      ];
      databaseAdapter.find.mockResolvedValue(mockInvestors);

      const result = await investorCommunicationService.segmentInvestors(criteria);

      expect(databaseAdapter.find).toHaveBeenCalledWith('Investor', expect.objectContaining({
        _id: { $in: ['inv1', 'inv2', 'inv3'] }
      }), expect.any(Object));
      expect(result).toHaveLength(2);
    });

    it('should return all investors when no criteria specified', async () => {
      const criteria = {
        companyId: '507f1f77bcf86cd799439011'
      };
      const mockInvestors = [
        { _id: 'inv1' },
        { _id: 'inv2' },
        { _id: 'inv3' }
      ];
      databaseAdapter.find.mockResolvedValue(mockInvestors);

      const result = await investorCommunicationService.segmentInvestors(criteria);

      expect(result).toHaveLength(3);
    });

    it('should respect investor communication preferences', async () => {
      const criteria = {
        companyId: '507f1f77bcf86cd799439011',
        respectPreferences: true,
        communicationType: 'quarterly_update'
      };
      const mockInvestors = [
        { _id: 'inv1', investorType: 'Angel' }
      ];
      databaseAdapter.find.mockResolvedValue(mockInvestors);

      await investorCommunicationService.segmentInvestors(criteria);

      // Should filter out investors who have opted out of quarterly updates
      expect(databaseAdapter.find).toHaveBeenCalled();
    });
  });

  describe('sendCommunication', () => {
    it('should send communication to all targeted investors', async () => {
      const communication = {
        _id: 'comm123',
        subject: 'Quarterly Update',
        content: 'Dear Investor...',
        deliveryChannel: 'email'
      };
      const investors = [
        { _id: 'inv1', email: 'investor1@example.com' },
        { _id: 'inv2', email: 'investor2@example.com' }
      ];

      const result = await investorCommunicationService.sendCommunication(communication, investors);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('sent', 2);
      expect(result).toHaveProperty('failed', 0);
    });

    it('should track delivery status for each investor', async () => {
      const communication = {
        _id: 'comm123',
        subject: 'Quarterly Update',
        content: 'Dear Investor...',
        deliveryChannel: 'email'
      };
      const investors = [
        { _id: 'inv1', email: 'investor1@example.com' }
      ];

      const result = await investorCommunicationService.sendCommunication(communication, investors);

      expect(result).toHaveProperty('deliveryStatuses');
      expect(result.deliveryStatuses).toHaveLength(1);
      expect(result.deliveryStatuses[0]).toHaveProperty('investorId', 'inv1');
    });

    it('should handle partial failures', async () => {
      const communication = {
        _id: 'comm123',
        subject: 'Quarterly Update',
        content: 'Dear Investor...',
        deliveryChannel: 'email'
      };
      const investors = [
        { _id: 'inv1', email: 'investor1@example.com' },
        { _id: 'inv2', email: 'invalid-email' }
      ];

      const result = await investorCommunicationService.sendCommunication(communication, investors);

      expect(result).toHaveProperty('sent');
      expect(result).toHaveProperty('failed');
    });

    it('should send via all channels when deliveryChannel is all', async () => {
      const communication = {
        _id: 'comm123',
        subject: 'Quarterly Update',
        content: 'Dear Investor...',
        deliveryChannel: 'all'
      };
      const investors = [
        { _id: 'inv1', email: 'investor1@example.com', phone: '+1234567890' }
      ];

      const result = await investorCommunicationService.sendCommunication(communication, investors);

      expect(result).toHaveProperty('success', true);
      // Should have sent via email, SMS, and portal
      expect(result).toHaveProperty('channels');
    });
  });

  describe('scheduleCommunication', () => {
    it('should schedule a communication for future delivery', async () => {
      const communicationId = 'comm123';
      // Use a date far in the future to ensure it's always after current date
      const scheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        _id: communicationId,
        status: 'scheduled',
        scheduledFor
      });

      const result = await investorCommunicationService.scheduleCommunication(communicationId, scheduledFor);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('scheduledFor');
    });

    it('should reject scheduling in the past', async () => {
      const communicationId = 'comm123';
      const pastDate = new Date('2020-01-01T10:00:00Z');

      await expect(
        investorCommunicationService.scheduleCommunication(communicationId, pastDate)
      ).rejects.toThrow();
    });

    it('should cancel previously scheduled delivery', async () => {
      const communicationId = 'comm123';
      // Use dates far in the future
      const newScheduledFor = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days from now
      databaseAdapter.findById.mockResolvedValue({
        _id: communicationId,
        status: 'scheduled',
        scheduledFor: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        _id: communicationId,
        status: 'scheduled',
        scheduledFor: newScheduledFor
      });

      const result = await investorCommunicationService.scheduleCommunication(communicationId, newScheduledFor);

      expect(result).toHaveProperty('success', true);
      expect(result.scheduledFor).toEqual(newScheduledFor);
    });
  });

  describe('getDeliveryStatus', () => {
    it('should return aggregated delivery status', async () => {
      const communicationId = 'comm123';
      const mockCommunication = {
        _id: communicationId,
        status: 'sent',
        deliveryTracking: [
          { investorId: 'inv1', status: 'delivered', deliveredAt: new Date() },
          { investorId: 'inv2', status: 'sent', deliveredAt: null },
          { investorId: 'inv3', status: 'failed', error: 'Invalid email' }
        ]
      };
      databaseAdapter.findById.mockResolvedValue(mockCommunication);

      const result = await investorCommunicationService.getDeliveryStatus(communicationId);

      expect(result).toHaveProperty('total', 3);
      expect(result).toHaveProperty('delivered', 1);
      expect(result).toHaveProperty('sent', 1);
      expect(result).toHaveProperty('failed', 1);
    });

    it('should include delivery timestamps', async () => {
      const communicationId = 'comm123';
      const deliveredAt = new Date();
      const mockCommunication = {
        _id: communicationId,
        status: 'sent',
        deliveryTracking: [
          { investorId: 'inv1', status: 'delivered', deliveredAt }
        ]
      };
      databaseAdapter.findById.mockResolvedValue(mockCommunication);

      const result = await investorCommunicationService.getDeliveryStatus(communicationId);

      expect(result.details[0]).toHaveProperty('deliveredAt');
    });

    it('should return empty status for draft communications', async () => {
      const communicationId = 'comm123';
      const mockCommunication = {
        _id: communicationId,
        status: 'draft',
        deliveryTracking: []
      };
      databaseAdapter.findById.mockResolvedValue(mockCommunication);

      const result = await investorCommunicationService.getDeliveryStatus(communicationId);

      expect(result).toHaveProperty('total', 0);
    });
  });

  describe('trackDelivery', () => {
    it('should update delivery status for an investor', async () => {
      const communicationId = 'comm123';
      const investorId = 'inv1';
      const status = 'delivered';
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ success: true });

      const result = await investorCommunicationService.trackDelivery(communicationId, investorId, status);

      expect(result).toHaveProperty('success', true);
    });

    it('should record delivery timestamp', async () => {
      const communicationId = 'comm123';
      const investorId = 'inv1';
      const status = 'delivered';
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ success: true });

      await investorCommunicationService.trackDelivery(communicationId, investorId, status);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'InvestorCommunication',
        communicationId,
        expect.objectContaining({
          $set: expect.objectContaining({
            'deliveryTracking.$[elem].deliveredAt': expect.any(Date)
          })
        }),
        expect.any(Object)
      );
    });

    it('should record failure reason', async () => {
      const communicationId = 'comm123';
      const investorId = 'inv1';
      const status = 'failed';
      const error = 'Invalid email address';
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ success: true });

      await investorCommunicationService.trackDelivery(communicationId, investorId, status, error);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'InvestorCommunication',
        communicationId,
        expect.objectContaining({
          $set: expect.objectContaining({
            'deliveryTracking.$[elem].error': error
          })
        }),
        expect.any(Object)
      );
    });
  });

  describe('processTemplate', () => {
    it('should replace template variables', () => {
      const template = 'Dear {{investorName}}, thank you for your {{investmentAmount}} investment.';
      const variables = {
        investorName: 'John Doe',
        investmentAmount: '$100,000'
      };

      const result = investorCommunicationService.processTemplate(template, variables);

      expect(result).toBe('Dear John Doe, thank you for your $100,000 investment.');
    });

    it('should handle missing variables gracefully', () => {
      const template = 'Dear {{investorName}}, your investment in {{companyName}}.';
      const variables = {
        investorName: 'John Doe'
      };

      const result = investorCommunicationService.processTemplate(template, variables);

      // Should keep placeholder or use empty string
      expect(result).toContain('John Doe');
    });

    it('should handle nested object variables', () => {
      const template = 'Quarter: {{quarter.number}}, Year: {{quarter.year}}';
      const variables = {
        quarter: { number: 'Q4', year: '2025' }
      };

      const result = investorCommunicationService.processTemplate(template, variables);

      expect(result).toBe('Quarter: Q4, Year: 2025');
    });
  });

  describe('getInvestorPreferences', () => {
    it('should return investor communication preferences', async () => {
      const investorId = 'inv1';
      const companyId = 'comp1';
      const mockPreferences = {
        investorId,
        companyId,
        communicationPreferences: {
          email: true,
          sms: false,
          portalNotifications: true
        },
        notificationTypes: {
          quarterlyUpdates: true,
          annualReports: true
        },
        frequency: 'immediate'
      };
      databaseAdapter.findOne.mockResolvedValue(mockPreferences);

      const result = await investorCommunicationService.getInvestorPreferences(investorId, companyId);

      expect(result).toEqual(mockPreferences);
    });

    it('should return default preferences if none exist', async () => {
      const investorId = 'inv1';
      const companyId = 'comp1';
      databaseAdapter.findOne.mockResolvedValue(null);

      const result = await investorCommunicationService.getInvestorPreferences(investorId, companyId);

      expect(result).toHaveProperty('communicationPreferences');
      expect(result.communicationPreferences.email).toBe(true);
    });
  });

  describe('updateInvestorPreferences', () => {
    it('should update investor preferences', async () => {
      const investorId = 'inv1';
      const companyId = 'comp1';
      const preferences = {
        communicationPreferences: {
          email: true,
          sms: true
        }
      };
      databaseAdapter.findOne.mockResolvedValue({ _id: 'pref1', investorId, companyId });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ ...preferences, investorId, companyId });

      const result = await investorCommunicationService.updateInvestorPreferences(investorId, companyId, preferences);

      expect(result).toHaveProperty('communicationPreferences');
    });

    it('should create preferences if none exist', async () => {
      const investorId = 'inv1';
      const companyId = 'comp1';
      const preferences = {
        communicationPreferences: { email: true }
      };
      databaseAdapter.findOne.mockResolvedValue(null);
      databaseAdapter.create.mockResolvedValue({ ...preferences, investorId, companyId });

      const result = await investorCommunicationService.updateInvestorPreferences(investorId, companyId, preferences);

      expect(databaseAdapter.create).toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe investor from all communications', async () => {
      const investorId = 'inv1';
      const companyId = 'comp1';
      databaseAdapter.findOne.mockResolvedValue({ _id: 'pref1', investorId, companyId });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        investorId,
        companyId,
        unsubscribedAll: true,
        unsubscribedAt: new Date()
      });

      const result = await investorCommunicationService.unsubscribe(investorId, companyId);

      expect(result).toHaveProperty('unsubscribedAll', true);
    });

    it('should unsubscribe from specific communication type', async () => {
      const investorId = 'inv1';
      const companyId = 'comp1';
      const communicationType = 'quarterly_update';
      databaseAdapter.findOne.mockResolvedValue({ _id: 'pref1', investorId, companyId });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        investorId,
        companyId,
        notificationTypes: { quarterlyUpdates: false }
      });

      const result = await investorCommunicationService.unsubscribe(investorId, companyId, communicationType);

      expect(result.notificationTypes.quarterlyUpdates).toBe(false);
    });
  });
});

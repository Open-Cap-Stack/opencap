/**
 * InvestorCommunication Model Unit Tests
 * Issue #91: Build Investor Communication System
 *
 * Tests for ZeroDB-based InvestorCommunication model
 */
process.env.SKIP_DB_SETUP = 'true';

const InvestorCommunication = require('../../../models/InvestorCommunication');

describe('InvestorCommunication Model', () => {
  describe('Schema Definition', () => {
    it('should have correct table name', () => {
      expect(InvestorCommunication.tableName).toBe('investor_communications');
    });

    it('should have required fields defined', () => {
      const schema = InvestorCommunication.schema;
      expect(schema.communicationId).toBeDefined();
      expect(schema.companyId).toBeDefined();
      expect(schema.communicationType).toBeDefined();
      expect(schema.subject).toBeDefined();
      expect(schema.content).toBeDefined();
      expect(schema.status).toBeDefined();
    });

    it('should mark required fields as required', () => {
      const schema = InvestorCommunication.schema;
      expect(schema.communicationId.required).toBe(true);
      expect(schema.companyId.required).toBe(true);
      expect(schema.communicationType.required).toBe(true);
      expect(schema.subject.required).toBe(true);
      expect(schema.content.required).toBe(true);
      expect(schema.createdBy.required).toBe(true);
    });

    it('should have correct enum values for communicationType', () => {
      const enumValues = InvestorCommunication.schema.communicationType.enum;
      expect(enumValues).toContain('quarterly_update');
      expect(enumValues).toContain('annual_report');
      expect(enumValues).toContain('document_notification');
      expect(enumValues).toContain('portal_announcement');
      expect(enumValues).toContain('funding_update');
      expect(enumValues).toContain('general');
    });

    it('should have correct enum values for status', () => {
      const enumValues = InvestorCommunication.schema.status.enum;
      expect(enumValues).toContain('draft');
      expect(enumValues).toContain('scheduled');
      expect(enumValues).toContain('sent');
      expect(enumValues).toContain('delivered');
      expect(enumValues).toContain('failed');
    });

    it('should have correct enum values for deliveryChannel', () => {
      const enumValues = InvestorCommunication.schema.deliveryChannel.enum;
      expect(enumValues).toContain('email');
      expect(enumValues).toContain('portal');
      expect(enumValues).toContain('sms');
      expect(enumValues).toContain('all');
    });

    it('should have segmentation as object field', () => {
      const schema = InvestorCommunication.schema;
      expect(schema.segmentation).toBeDefined();
      expect(schema.segmentation.type).toBe('object');
    });

    it('should have segmentation default with expected keys', () => {
      const segDefault = InvestorCommunication.schema.segmentation.default;
      expect(segDefault).toHaveProperty('investorTypes');
      expect(segDefault).toHaveProperty('minInvestmentAmount');
      expect(segDefault).toHaveProperty('maxInvestmentAmount');
      expect(segDefault).toHaveProperty('investmentDateFrom');
      expect(segDefault).toHaveProperty('investmentDateTo');
      expect(segDefault).toHaveProperty('investorIds');
    });

    it('should have tracking fields', () => {
      const schema = InvestorCommunication.schema;
      expect(schema.sentAt).toBeDefined();
      expect(schema.scheduledFor).toBeDefined();
      expect(schema.createdBy).toBeDefined();
    });

    it('should have deliveryTracking array field', () => {
      const schema = InvestorCommunication.schema;
      expect(schema.deliveryTracking).toBeDefined();
      expect(schema.deliveryTracking.type).toBe('array');
    });

    it('should default status to draft', () => {
      expect(InvestorCommunication.schema.status.default).toBe('draft');
    });

    it('should default deliveryChannel to email', () => {
      expect(InvestorCommunication.schema.deliveryChannel.default).toBe('email');
    });
  });

  describe('getRecipientCount', () => {
    it('should calculate recipientCount from deliveryTracking', () => {
      const communication = {
        deliveryTracking: [
          { investorId: 'inv-1', status: 'sent' },
          { investorId: 'inv-2', status: 'delivered' },
          { investorId: 'inv-3', status: 'pending' }
        ]
      };

      expect(InvestorCommunication.getRecipientCount(communication)).toBe(3);
    });

    it('should return 0 when no deliveryTracking', () => {
      const communication = {};
      expect(InvestorCommunication.getRecipientCount(communication)).toBe(0);
    });

    it('should return 0 for empty deliveryTracking', () => {
      const communication = { deliveryTracking: [] };
      expect(InvestorCommunication.getRecipientCount(communication)).toBe(0);
    });
  });

  describe('getDeliveryStats', () => {
    it('should calculate delivery stats from deliveryTracking', () => {
      const communication = {
        deliveryTracking: [
          { investorId: 'inv-1', status: 'pending' },
          { investorId: 'inv-2', status: 'sent' },
          { investorId: 'inv-3', status: 'sent' },
          { investorId: 'inv-4', status: 'delivered' },
          { investorId: 'inv-5', status: 'opened' },
          { investorId: 'inv-6', status: 'clicked' },
          { investorId: 'inv-7', status: 'failed' }
        ]
      };

      const stats = InvestorCommunication.getDeliveryStats(communication);

      expect(stats.total).toBe(7);
      expect(stats.pending).toBe(1);
      expect(stats.sent).toBe(2);
      expect(stats.delivered).toBe(1);
      expect(stats.opened).toBe(1);
      expect(stats.clicked).toBe(1);
      expect(stats.failed).toBe(1);
    });

    it('should return empty stats when no deliveryTracking', () => {
      const communication = {};
      const stats = InvestorCommunication.getDeliveryStats(communication);

      expect(stats.total).toBe(0);
      expect(stats.sent).toBe(0);
      expect(stats.delivered).toBe(0);
      expect(stats.failed).toBe(0);
    });

    it('should return empty stats for empty deliveryTracking', () => {
      const communication = { deliveryTracking: [] };
      const stats = InvestorCommunication.getDeliveryStats(communication);

      expect(stats.total).toBe(0);
    });
  });

  describe('Constants', () => {
    it('should export COMMUNICATION_TYPES constant', () => {
      expect(InvestorCommunication.COMMUNICATION_TYPES).toBeDefined();
      expect(InvestorCommunication.COMMUNICATION_TYPES).toContain('quarterly_update');
    });

    it('should export STATUS_TYPES constant', () => {
      expect(InvestorCommunication.STATUS_TYPES).toBeDefined();
      expect(InvestorCommunication.STATUS_TYPES).toContain('draft');
    });

    it('should export DELIVERY_CHANNELS constant', () => {
      expect(InvestorCommunication.DELIVERY_CHANNELS).toBeDefined();
      expect(InvestorCommunication.DELIVERY_CHANNELS).toContain('email');
    });

    it('should export DELIVERY_STATUSES constant', () => {
      expect(InvestorCommunication.DELIVERY_STATUSES).toBeDefined();
      expect(InvestorCommunication.DELIVERY_STATUSES).toContain('pending');
      expect(InvestorCommunication.DELIVERY_STATUSES).toContain('sent');
    });
  });

  describe('Model Methods', () => {
    it('should have create method', () => {
      expect(typeof InvestorCommunication.create).toBe('function');
    });

    it('should have find method', () => {
      expect(typeof InvestorCommunication.find).toBe('function');
    });

    it('should have findOne method', () => {
      expect(typeof InvestorCommunication.findOne).toBe('function');
    });

    it('should have findByCommunicationId method', () => {
      expect(typeof InvestorCommunication.findByCommunicationId).toBe('function');
    });

    it('should have findByCompany method', () => {
      expect(typeof InvestorCommunication.findByCompany).toBe('function');
    });

    it('should have addDeliveryTracking method', () => {
      expect(typeof InvestorCommunication.addDeliveryTracking).toBe('function');
    });

    it('should have markSent method', () => {
      expect(typeof InvestorCommunication.markSent).toBe('function');
    });

    it('should have schedule method', () => {
      expect(typeof InvestorCommunication.schedule).toBe('function');
    });
  });
});

/**
 * InvestorCommunication Model Unit Tests
 * Issue #91: Build Investor Communication System
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

const mongoose = require('mongoose');

// We'll test the model schema and validation
describe('InvestorCommunication Model', () => {
  let InvestorCommunication;

  beforeAll(() => {
    // Load the model after mongoose setup
    InvestorCommunication = require('../../../models/InvestorCommunication');
  });

  describe('Schema Validation', () => {
    it('should have required fields defined', () => {
      const schema = InvestorCommunication.schema;

      expect(schema.paths.communicationId).toBeDefined();
      expect(schema.paths.companyId).toBeDefined();
      expect(schema.paths.communicationType).toBeDefined();
      expect(schema.paths.subject).toBeDefined();
      expect(schema.paths.content).toBeDefined();
      expect(schema.paths.status).toBeDefined();
    });

    it('should have correct enum values for communicationType', () => {
      const schema = InvestorCommunication.schema;
      const enumValues = schema.paths.communicationType.enumValues;

      expect(enumValues).toContain('quarterly_update');
      expect(enumValues).toContain('annual_report');
      expect(enumValues).toContain('document_notification');
      expect(enumValues).toContain('portal_announcement');
      expect(enumValues).toContain('funding_update');
      expect(enumValues).toContain('general');
    });

    it('should have correct enum values for status', () => {
      const schema = InvestorCommunication.schema;
      const enumValues = schema.paths.status.enumValues;

      expect(enumValues).toContain('draft');
      expect(enumValues).toContain('scheduled');
      expect(enumValues).toContain('sent');
      expect(enumValues).toContain('delivered');
      expect(enumValues).toContain('failed');
    });

    it('should have correct enum values for deliveryChannel', () => {
      const schema = InvestorCommunication.schema;
      const enumValues = schema.paths.deliveryChannel.enumValues;

      expect(enumValues).toContain('email');
      expect(enumValues).toContain('portal');
      expect(enumValues).toContain('sms');
      expect(enumValues).toContain('all');
    });

    it('should have segmentation criteria fields', () => {
      const schema = InvestorCommunication.schema;

      // Nested schema paths are accessed through the parent path's schema
      expect(schema.paths.segmentation).toBeDefined();
      const segmentationSchema = schema.paths.segmentation.schema;
      expect(segmentationSchema.paths.investorTypes).toBeDefined();
      expect(segmentationSchema.paths.minInvestmentAmount).toBeDefined();
      expect(segmentationSchema.paths.maxInvestmentAmount).toBeDefined();
      expect(segmentationSchema.paths.investmentDateFrom).toBeDefined();
      expect(segmentationSchema.paths.investmentDateTo).toBeDefined();
      expect(segmentationSchema.paths.investorIds).toBeDefined();
    });

    it('should have tracking fields', () => {
      const schema = InvestorCommunication.schema;

      expect(schema.paths.sentAt).toBeDefined();
      expect(schema.paths.scheduledFor).toBeDefined();
      expect(schema.paths.createdBy).toBeDefined();
    });

    it('should have delivery tracking array', () => {
      const schema = InvestorCommunication.schema;

      expect(schema.paths.deliveryTracking).toBeDefined();
    });
  });

  describe('Document Creation', () => {
    it('should create a valid communication document', () => {
      const communicationData = {
        communicationId: 'INVCOM-001',
        companyId: new mongoose.Types.ObjectId(),
        communicationType: 'quarterly_update',
        subject: 'Q4 2025 Quarterly Update',
        content: 'Dear Investors, here is our quarterly update...',
        status: 'draft',
        deliveryChannel: 'email',
        createdBy: new mongoose.Types.ObjectId()
      };

      const communication = new InvestorCommunication(communicationData);

      expect(communication.communicationId).toBe('INVCOM-001');
      expect(communication.communicationType).toBe('quarterly_update');
      expect(communication.status).toBe('draft');
    });

    it('should have default status of draft', () => {
      const communicationData = {
        communicationId: 'INVCOM-002',
        companyId: new mongoose.Types.ObjectId(),
        communicationType: 'general',
        subject: 'Test Subject',
        content: 'Test content',
        createdBy: new mongoose.Types.ObjectId()
      };

      const communication = new InvestorCommunication(communicationData);

      expect(communication.status).toBe('draft');
    });

    it('should have default deliveryChannel of email', () => {
      const communicationData = {
        communicationId: 'INVCOM-003',
        companyId: new mongoose.Types.ObjectId(),
        communicationType: 'general',
        subject: 'Test Subject',
        content: 'Test content',
        createdBy: new mongoose.Types.ObjectId()
      };

      const communication = new InvestorCommunication(communicationData);

      expect(communication.deliveryChannel).toBe('email');
    });

    it('should allow segmentation criteria', () => {
      const communicationData = {
        communicationId: 'INVCOM-004',
        companyId: new mongoose.Types.ObjectId(),
        communicationType: 'quarterly_update',
        subject: 'Q4 Update for Large Investors',
        content: 'Special update for major investors...',
        createdBy: new mongoose.Types.ObjectId(),
        segmentation: {
          investorTypes: ['Angel', 'Venture Capital'],
          minInvestmentAmount: 100000,
          maxInvestmentAmount: 1000000
        }
      };

      const communication = new InvestorCommunication(communicationData);

      expect(communication.segmentation.investorTypes).toContain('Angel');
      expect(communication.segmentation.minInvestmentAmount).toBe(100000);
    });

    it('should allow attachments', () => {
      const communicationData = {
        communicationId: 'INVCOM-005',
        companyId: new mongoose.Types.ObjectId(),
        communicationType: 'document_notification',
        subject: 'New Document Available',
        content: 'A new document has been shared...',
        createdBy: new mongoose.Types.ObjectId(),
        attachments: [
          {
            documentId: new mongoose.Types.ObjectId(),
            fileName: 'Q4_Report.pdf',
            fileType: 'application/pdf'
          }
        ]
      };

      const communication = new InvestorCommunication(communicationData);

      expect(communication.attachments).toHaveLength(1);
      expect(communication.attachments[0].fileName).toBe('Q4_Report.pdf');
    });
  });

  describe('Virtual Properties', () => {
    it('should calculate recipientCount from deliveryTracking', () => {
      const communicationData = {
        communicationId: 'INVCOM-010',
        companyId: new mongoose.Types.ObjectId(),
        communicationType: 'quarterly_update',
        subject: 'Test Subject',
        content: 'Test content',
        createdBy: new mongoose.Types.ObjectId(),
        deliveryTracking: [
          { investorId: new mongoose.Types.ObjectId(), status: 'sent' },
          { investorId: new mongoose.Types.ObjectId(), status: 'delivered' },
          { investorId: new mongoose.Types.ObjectId(), status: 'pending' }
        ]
      };

      const communication = new InvestorCommunication(communicationData);

      expect(communication.recipientCount).toBe(3);
    });

    it('should return 0 for recipientCount when no deliveryTracking', () => {
      const communicationData = {
        communicationId: 'INVCOM-011',
        companyId: new mongoose.Types.ObjectId(),
        communicationType: 'general',
        subject: 'Test Subject',
        content: 'Test content',
        createdBy: new mongoose.Types.ObjectId()
      };

      const communication = new InvestorCommunication(communicationData);

      expect(communication.recipientCount).toBe(0);
    });

    it('should calculate deliveryStats from deliveryTracking', () => {
      const communicationData = {
        communicationId: 'INVCOM-012',
        companyId: new mongoose.Types.ObjectId(),
        communicationType: 'quarterly_update',
        subject: 'Test Subject',
        content: 'Test content',
        createdBy: new mongoose.Types.ObjectId(),
        deliveryTracking: [
          { investorId: new mongoose.Types.ObjectId(), status: 'pending' },
          { investorId: new mongoose.Types.ObjectId(), status: 'sent' },
          { investorId: new mongoose.Types.ObjectId(), status: 'sent' },
          { investorId: new mongoose.Types.ObjectId(), status: 'delivered' },
          { investorId: new mongoose.Types.ObjectId(), status: 'opened' },
          { investorId: new mongoose.Types.ObjectId(), status: 'clicked' },
          { investorId: new mongoose.Types.ObjectId(), status: 'failed' }
        ]
      };

      const communication = new InvestorCommunication(communicationData);
      const stats = communication.deliveryStats;

      expect(stats.total).toBe(7);
      expect(stats.pending).toBe(1);
      expect(stats.sent).toBe(2);
      expect(stats.delivered).toBe(1);
      expect(stats.opened).toBe(1);
      expect(stats.clicked).toBe(1);
      expect(stats.failed).toBe(1);
    });

    it('should return empty deliveryStats when no deliveryTracking', () => {
      const communicationData = {
        communicationId: 'INVCOM-013',
        companyId: new mongoose.Types.ObjectId(),
        communicationType: 'general',
        subject: 'Test Subject',
        content: 'Test content',
        createdBy: new mongoose.Types.ObjectId()
      };

      const communication = new InvestorCommunication(communicationData);
      const stats = communication.deliveryStats;

      expect(stats.total).toBe(0);
      expect(stats.sent).toBe(0);
      expect(stats.delivered).toBe(0);
      expect(stats.failed).toBe(0);
    });
  });

  describe('Model Exports', () => {
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
  });
});

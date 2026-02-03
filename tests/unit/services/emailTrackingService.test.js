/**
 * EmailTrackingService Tests
 *
 * Issue #87: Implement Email Delivery Tracking
 *
 * TDD: Red phase - Tests written before implementation
 * Tests email tracking functionality including webhooks, analytics, and list hygiene
 */

const emailTrackingService = require('../../../services/emailTrackingService');
const databaseAdapter = require('../../../services/databaseAdapter');

// Mock the database adapter
jest.mock('../../../services/databaseAdapter');

describe('EmailTrackingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEmailRecord', () => {
    it('should create a new email tracking record', async () => {
      const emailData = {
        messageId: 'msg_123',
        recipientEmail: 'test@example.com',
        senderEmail: 'noreply@opencap.com',
        subject: 'Welcome to OpenCap',
        templateId: 'welcome_email',
        companyId: 'comp_123'
      };

      const mockCreated = {
        _id: 'track_123',
        ...emailData,
        status: 'queued',
        createdAt: new Date()
      };

      databaseAdapter.create.mockResolvedValue(mockCreated);

      const result = await emailTrackingService.createEmailRecord(emailData);

      expect(databaseAdapter.create).toHaveBeenCalledWith('EmailTracking', expect.objectContaining({
        messageId: 'msg_123',
        recipientEmail: 'test@example.com',
        status: 'queued'
      }));
      expect(result).toEqual(mockCreated);
    });

    it('should generate tracking pixel URL', async () => {
      const emailData = {
        messageId: 'msg_456',
        recipientEmail: 'test@example.com',
        senderEmail: 'noreply@opencap.com',
        subject: 'Test Email'
      };

      const mockCreated = {
        _id: 'track_456',
        ...emailData,
        trackingPixelUrl: expect.stringContaining('/api/v1/email-tracking/pixel/')
      };

      databaseAdapter.create.mockResolvedValue(mockCreated);

      const result = await emailTrackingService.createEmailRecord(emailData);

      expect(result).toBeDefined();
    });
  });

  describe('updateDeliveryStatus', () => {
    it('should update status to sent', async () => {
      const messageId = 'msg_123';
      const mockUpdated = {
        _id: 'track_123',
        messageId,
        status: 'sent',
        sentAt: new Date()
      };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdated);
      databaseAdapter.findOne.mockResolvedValue({ _id: 'track_123', messageId });

      const result = await emailTrackingService.updateDeliveryStatus(messageId, 'sent');

      expect(result.status).toBe('sent');
    });

    it('should update status to delivered', async () => {
      const messageId = 'msg_123';
      const mockUpdated = {
        _id: 'track_123',
        messageId,
        status: 'delivered',
        deliveredAt: new Date()
      };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdated);
      databaseAdapter.findOne.mockResolvedValue({ _id: 'track_123', messageId });

      const result = await emailTrackingService.updateDeliveryStatus(messageId, 'delivered');

      expect(result.status).toBe('delivered');
    });

    it('should handle bounce events', async () => {
      const messageId = 'msg_123';
      const bounceData = {
        type: 'hard',
        reason: 'Address not found',
        code: '550'
      };
      const mockUpdated = {
        _id: 'track_123',
        messageId,
        status: 'bounced',
        bounceType: 'hard',
        bounceReason: 'Address not found'
      };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdated);
      databaseAdapter.findOne.mockResolvedValue({ _id: 'track_123', messageId });

      const result = await emailTrackingService.updateDeliveryStatus(messageId, 'bounced', bounceData);

      expect(result.status).toBe('bounced');
      expect(result.bounceType).toBe('hard');
    });
  });

  describe('recordOpen', () => {
    it('should record email open event', async () => {
      const trackingId = 'track_123';
      const openData = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date()
      };

      const mockRecord = {
        _id: trackingId,
        status: 'delivered',
        opens: []
      };

      databaseAdapter.findById.mockResolvedValue(mockRecord);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockRecord,
        status: 'opened',
        opens: [openData],
        firstOpenedAt: openData.timestamp,
        openCount: 1
      });

      const result = await emailTrackingService.recordOpen(trackingId, openData);

      expect(result.status).toBe('opened');
      expect(result.openCount).toBe(1);
    });

    it('should increment open count on subsequent opens', async () => {
      const trackingId = 'track_123';
      const previousOpen = { timestamp: new Date(Date.now() - 3600000) };
      const openData = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date()
      };

      const mockRecord = {
        _id: trackingId,
        status: 'opened',
        opens: [previousOpen],
        openCount: 1
      };

      databaseAdapter.findById.mockResolvedValue(mockRecord);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockRecord,
        opens: [previousOpen, openData],
        openCount: 2
      });

      const result = await emailTrackingService.recordOpen(trackingId, openData);

      expect(result.openCount).toBe(2);
    });
  });

  describe('recordClick', () => {
    it('should record link click event', async () => {
      const trackingId = 'track_123';
      const clickData = {
        url: 'https://opencap.com/dashboard',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date()
      };

      const mockRecord = {
        _id: trackingId,
        status: 'opened',
        clicks: []
      };

      databaseAdapter.findById.mockResolvedValue(mockRecord);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockRecord,
        status: 'clicked',
        clicks: [clickData],
        firstClickedAt: clickData.timestamp,
        clickCount: 1
      });

      const result = await emailTrackingService.recordClick(trackingId, clickData);

      expect(result.status).toBe('clicked');
      expect(result.clickCount).toBe(1);
    });

    it('should track unique URLs clicked', async () => {
      const trackingId = 'track_123';
      const clickData = {
        url: 'https://opencap.com/settings',
        timestamp: new Date()
      };

      const mockRecord = {
        _id: trackingId,
        clicks: [{ url: 'https://opencap.com/dashboard' }],
        uniqueUrlsClicked: ['https://opencap.com/dashboard'],
        clickCount: 1
      };

      databaseAdapter.findById.mockResolvedValue(mockRecord);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockRecord,
        clicks: [...mockRecord.clicks, clickData],
        uniqueUrlsClicked: ['https://opencap.com/dashboard', 'https://opencap.com/settings'],
        clickCount: 2
      });

      const result = await emailTrackingService.recordClick(trackingId, clickData);

      expect(result.uniqueUrlsClicked).toContain('https://opencap.com/settings');
    });
  });

  describe('processWebhook', () => {
    it('should process SendGrid delivery webhook', async () => {
      const webhookPayload = {
        provider: 'sendgrid',
        event: 'delivered',
        messageId: 'msg_123',
        timestamp: Date.now()
      };

      databaseAdapter.findOne.mockResolvedValue({ _id: 'track_123', messageId: 'msg_123' });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        _id: 'track_123',
        status: 'delivered'
      });

      const result = await emailTrackingService.processWebhook(webhookPayload);

      expect(result.processed).toBe(true);
    });

    it('should process SendGrid bounce webhook', async () => {
      const webhookPayload = {
        provider: 'sendgrid',
        event: 'bounce',
        messageId: 'msg_123',
        bounceType: 'hard',
        reason: 'Invalid recipient',
        timestamp: Date.now()
      };

      databaseAdapter.findOne.mockResolvedValue({ _id: 'track_123', messageId: 'msg_123' });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        _id: 'track_123',
        status: 'bounced',
        bounceType: 'hard'
      });

      const result = await emailTrackingService.processWebhook(webhookPayload);

      expect(result.processed).toBe(true);
    });

    it('should process spam report webhook', async () => {
      const webhookPayload = {
        provider: 'sendgrid',
        event: 'spamreport',
        messageId: 'msg_123',
        timestamp: Date.now()
      };

      databaseAdapter.findOne.mockResolvedValue({ _id: 'track_123', messageId: 'msg_123' });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        _id: 'track_123',
        status: 'spam'
      });

      const result = await emailTrackingService.processWebhook(webhookPayload);

      expect(result.processed).toBe(true);
    });

    it('should return false for unknown message ID', async () => {
      const webhookPayload = {
        provider: 'sendgrid',
        event: 'delivered',
        messageId: 'unknown_msg',
        timestamp: Date.now()
      };

      databaseAdapter.findOne.mockResolvedValue(null);

      const result = await emailTrackingService.processWebhook(webhookPayload);

      expect(result.processed).toBe(false);
    });
  });

  describe('handleBounce', () => {
    it('should add email to suppression list for hard bounce', async () => {
      const bounceData = {
        email: 'bounced@example.com',
        type: 'hard',
        reason: 'User unknown'
      };

      databaseAdapter.create.mockResolvedValue({
        email: bounceData.email,
        suppressed: true
      });

      const result = await emailTrackingService.handleBounce(bounceData);

      expect(result.suppressed).toBe(true);
    });

    it('should track soft bounce count', async () => {
      const bounceData = {
        email: 'softbounce@example.com',
        type: 'soft',
        reason: 'Mailbox full'
      };

      databaseAdapter.findOne.mockResolvedValue({
        email: bounceData.email,
        softBounceCount: 2
      });

      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        email: bounceData.email,
        softBounceCount: 3
      });

      const result = await emailTrackingService.handleBounce(bounceData);

      expect(result.softBounceCount).toBe(3);
    });

    it('should suppress email after 3 soft bounces', async () => {
      const bounceData = {
        email: 'softbounce@example.com',
        type: 'soft',
        reason: 'Mailbox full'
      };

      databaseAdapter.findOne.mockResolvedValue({
        email: bounceData.email,
        softBounceCount: 3
      });

      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        email: bounceData.email,
        softBounceCount: 4,
        suppressed: true
      });

      const result = await emailTrackingService.handleBounce(bounceData);

      expect(result.suppressed).toBe(true);
    });
  });

  describe('getAnalytics', () => {
    it('should return email analytics for a company', async () => {
      const companyId = 'comp_123';
      const dateRange = {
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-31')
      };

      const mockEmails = [
        { status: 'delivered', openCount: 2, clickCount: 1 },
        { status: 'delivered', openCount: 0, clickCount: 0 },
        { status: 'opened', openCount: 1, clickCount: 0 },
        { status: 'bounced', openCount: 0, clickCount: 0 }
      ];

      databaseAdapter.find.mockResolvedValue(mockEmails);

      const result = await emailTrackingService.getAnalytics(companyId, dateRange);

      expect(result).toHaveProperty('totalSent');
      expect(result).toHaveProperty('deliveryRate');
      expect(result).toHaveProperty('openRate');
      expect(result).toHaveProperty('clickRate');
      expect(result).toHaveProperty('bounceRate');
    });

    it('should calculate correct delivery rate', async () => {
      const companyId = 'comp_123';
      const mockEmails = [
        { status: 'delivered' },
        { status: 'delivered' },
        { status: 'bounced' },
        { status: 'delivered' }
      ];

      databaseAdapter.find.mockResolvedValue(mockEmails);

      const result = await emailTrackingService.getAnalytics(companyId, {});

      expect(result.deliveryRate).toBe(75); // 3 delivered out of 4
    });

    it('should calculate correct open rate', async () => {
      const companyId = 'comp_123';
      const mockEmails = [
        { status: 'opened', openCount: 1 },
        { status: 'clicked', openCount: 2 },
        { status: 'delivered', openCount: 0 },
        { status: 'delivered', openCount: 0 }
      ];

      databaseAdapter.find.mockResolvedValue(mockEmails);

      const result = await emailTrackingService.getAnalytics(companyId, {});

      expect(result.openRate).toBe(50); // 2 opened out of 4
    });

    it('should return analytics by template', async () => {
      const companyId = 'comp_123';
      const mockEmails = [
        { templateId: 'welcome', status: 'opened' },
        { templateId: 'welcome', status: 'delivered' },
        { templateId: 'notification', status: 'clicked' }
      ];

      databaseAdapter.find.mockResolvedValue(mockEmails);

      const result = await emailTrackingService.getAnalytics(companyId, {}, { groupBy: 'template' });

      expect(result.byTemplate).toBeDefined();
    });
  });

  describe('getEngagementReport', () => {
    it('should return engagement metrics', async () => {
      const companyId = 'comp_123';
      const mockEmails = [
        { recipientEmail: 'user1@example.com', openCount: 5, clickCount: 3 },
        { recipientEmail: 'user2@example.com', openCount: 10, clickCount: 8 },
        { recipientEmail: 'user3@example.com', openCount: 0, clickCount: 0 }
      ];

      databaseAdapter.find.mockResolvedValue(mockEmails);

      const result = await emailTrackingService.getEngagementReport(companyId);

      expect(result).toHaveProperty('highlyEngaged');
      expect(result).toHaveProperty('moderatelyEngaged');
      expect(result).toHaveProperty('notEngaged');
    });
  });

  describe('isEmailSuppressed', () => {
    it('should return true for suppressed email', async () => {
      const email = 'suppressed@example.com';

      databaseAdapter.findOne.mockResolvedValue({
        email,
        suppressed: true
      });

      const result = await emailTrackingService.isEmailSuppressed(email);

      expect(result).toBe(true);
    });

    it('should return false for non-suppressed email', async () => {
      const email = 'active@example.com';

      databaseAdapter.findOne.mockResolvedValue(null);

      const result = await emailTrackingService.isEmailSuppressed(email);

      expect(result).toBe(false);
    });
  });

  describe('generateTrackingLinks', () => {
    it('should wrap links with tracking URLs', () => {
      const trackingId = 'track_123';
      const originalUrl = 'https://opencap.com/dashboard';

      const trackedUrl = emailTrackingService.generateTrackingLink(trackingId, originalUrl);

      expect(trackedUrl).toContain('/api/v1/email-tracking/click/');
      expect(trackedUrl).toContain(trackingId);
    });

    it('should generate pixel tracking URL', () => {
      const trackingId = 'track_123';

      const pixelUrl = emailTrackingService.generatePixelUrl(trackingId);

      expect(pixelUrl).toContain('/api/v1/email-tracking/pixel/');
      expect(pixelUrl).toContain(trackingId);
    });
  });

  describe('cleanupOldRecords', () => {
    it('should delete records older than retention period', async () => {
      const retentionDays = 90;

      databaseAdapter.delete.mockResolvedValue({ deletedCount: 150 });

      const result = await emailTrackingService.cleanupOldRecords(retentionDays);

      expect(result.deletedCount).toBe(150);
    });
  });
});

/**
 * EmailTracking Controller Tests
 *
 * Issue #87: Implement Email Delivery Tracking
 *
 * TDD: Red phase - Tests written before implementation
 * Tests for the email tracking controller using DatabaseAdapter
 */

const httpMocks = require('node-mocks-http');
const emailTrackingController = require('../../../controllers/emailTrackingController');
const emailTrackingService = require('../../../services/emailTrackingService');

// Mock the email tracking service
jest.mock('../../../services/emailTrackingService');

describe('EmailTrackingController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
  });

  describe('createEmailTracking', () => {
    it('should create an email tracking record successfully', async () => {
      const emailData = {
        messageId: 'msg_123',
        recipientEmail: 'test@example.com',
        senderEmail: 'noreply@opencap.com',
        subject: 'Welcome to OpenCap',
        templateId: 'welcome_email',
        companyId: 'comp_123'
      };

      req.body = emailData;

      const mockCreated = {
        _id: 'track_123',
        ...emailData,
        status: 'queued',
        trackingPixelUrl: '/api/v1/email-tracking/pixel/track_123'
      };

      emailTrackingService.createEmailRecord.mockResolvedValue(mockCreated);

      await emailTrackingController.createEmailTracking(req, res);

      expect(res.statusCode).toBe(201);
      const responseData = res._getJSONData();
      expect(responseData.messageId).toBe('msg_123');
      expect(responseData.status).toBe('queued');
    });

    it('should return 400 for missing required fields', async () => {
      req.body = { subject: 'Test' }; // Missing recipientEmail

      emailTrackingService.createEmailRecord.mockRejectedValue(new Error('Validation error'));

      await emailTrackingController.createEmailTracking(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('getEmailTracking', () => {
    it('should return email tracking record by ID', async () => {
      req.params = { id: 'track_123' };

      const mockRecord = {
        _id: 'track_123',
        messageId: 'msg_123',
        status: 'delivered',
        openCount: 2
      };

      emailTrackingService.getEmailRecord.mockResolvedValue(mockRecord);

      await emailTrackingController.getEmailTracking(req, res);

      expect(res.statusCode).toBe(200);
      const responseData = res._getJSONData();
      expect(responseData._id).toBe('track_123');
    });

    it('should return 404 for non-existent record', async () => {
      req.params = { id: 'nonexistent' };

      emailTrackingService.getEmailRecord.mockResolvedValue(null);

      await emailTrackingController.getEmailTracking(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('getEmailTrackingByMessageId', () => {
    it('should return email tracking record by message ID', async () => {
      req.params = { messageId: 'msg_123' };

      const mockRecord = {
        _id: 'track_123',
        messageId: 'msg_123',
        status: 'opened'
      };

      emailTrackingService.getEmailRecordByMessageId.mockResolvedValue(mockRecord);

      await emailTrackingController.getEmailTrackingByMessageId(req, res);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('listEmailTracking', () => {
    it('should return paginated list of email tracking records', async () => {
      req.query = { page: 1, limit: 10, companyId: 'comp_123' };

      const mockRecords = [
        { _id: 'track_1', messageId: 'msg_1', status: 'delivered' },
        { _id: 'track_2', messageId: 'msg_2', status: 'opened' }
      ];

      emailTrackingService.listEmailRecords.mockResolvedValue({
        records: mockRecords,
        total: 25,
        hasMore: true
      });

      await emailTrackingController.listEmailTracking(req, res);

      expect(res.statusCode).toBe(200);
      const responseData = res._getJSONData();
      expect(responseData.records).toHaveLength(2);
      expect(responseData.total).toBe(25);
    });

    it('should filter by status', async () => {
      req.query = { status: 'bounced', companyId: 'comp_123' };

      emailTrackingService.listEmailRecords.mockResolvedValue({
        records: [{ status: 'bounced' }],
        total: 5,
        hasMore: false
      });

      await emailTrackingController.listEmailTracking(req, res);

      expect(emailTrackingService.listEmailRecords).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'bounced' })
      );
    });
  });

  describe('handlePixelTracking', () => {
    it('should record open and return transparent pixel', async () => {
      req.params = { trackingId: 'track_123' };
      req.ip = '192.168.1.1';
      req.get = jest.fn().mockReturnValue('Mozilla/5.0');

      emailTrackingService.recordOpen.mockResolvedValue({
        _id: 'track_123',
        status: 'opened'
      });

      await emailTrackingController.handlePixelTracking(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.getHeader('Content-Type')).toBe('image/gif');
      expect(emailTrackingService.recordOpen).toHaveBeenCalledWith('track_123', expect.objectContaining({
        ipAddress: '192.168.1.1'
      }));
    });

    it('should still return pixel even if tracking fails', async () => {
      req.params = { trackingId: 'track_123' };
      req.ip = '192.168.1.1';
      req.get = jest.fn().mockReturnValue('Mozilla/5.0');

      emailTrackingService.recordOpen.mockRejectedValue(new Error('DB error'));

      await emailTrackingController.handlePixelTracking(req, res);

      // Should still return 200 with pixel to not break email display
      expect(res.statusCode).toBe(200);
      expect(res.getHeader('Content-Type')).toBe('image/gif');
    });
  });

  describe('handleClickTracking', () => {
    it('should record click and redirect to original URL', async () => {
      req.params = { trackingId: 'track_123' };
      req.query = { url: 'https://opencap.com/dashboard' };
      req.ip = '192.168.1.1';
      req.get = jest.fn().mockReturnValue('Mozilla/5.0');

      emailTrackingService.recordClick.mockResolvedValue({
        _id: 'track_123',
        status: 'clicked'
      });

      await emailTrackingController.handleClickTracking(req, res);

      expect(res.statusCode).toBe(302);
      // node-mocks-http redirect stores the redirect URL
      expect(res._getRedirectUrl()).toBe('https://opencap.com/dashboard');
    });

    it('should return 400 for missing URL', async () => {
      req.params = { trackingId: 'track_123' };
      req.query = {};

      await emailTrackingController.handleClickTracking(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should redirect even if tracking fails', async () => {
      req.params = { trackingId: 'track_123' };
      req.query = { url: 'https://opencap.com/dashboard' };
      req.ip = '192.168.1.1';
      req.get = jest.fn().mockReturnValue('Mozilla/5.0');

      emailTrackingService.recordClick.mockRejectedValue(new Error('DB error'));

      await emailTrackingController.handleClickTracking(req, res);

      // Should still redirect to not break user experience
      expect(res.statusCode).toBe(302);
    });
  });

  describe('handleWebhook', () => {
    it('should process SendGrid webhook', async () => {
      req.body = [
        {
          event: 'delivered',
          sg_message_id: 'msg_123',
          timestamp: Date.now()
        }
      ];
      req.params = { provider: 'sendgrid' };

      emailTrackingService.processWebhook.mockResolvedValue({ processed: true });

      await emailTrackingController.handleWebhook(req, res);

      expect(res.statusCode).toBe(200);
      expect(emailTrackingService.processWebhook).toHaveBeenCalled();
    });

    it('should process Mailgun webhook', async () => {
      req.body = {
        'event-data': {
          event: 'delivered',
          message: { headers: { 'message-id': 'msg_123' } }
        }
      };
      req.params = { provider: 'mailgun' };

      emailTrackingService.processWebhook.mockResolvedValue({ processed: true });

      await emailTrackingController.handleWebhook(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should return 400 for unsupported provider', async () => {
      req.body = {};
      req.params = { provider: 'unknown' };

      await emailTrackingController.handleWebhook(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should verify webhook signature for SendGrid', async () => {
      req.body = [{ event: 'delivered' }];
      req.params = { provider: 'sendgrid' };
      req.headers = {
        'x-twilio-email-event-webhook-signature': 'valid_signature',
        'x-twilio-email-event-webhook-timestamp': Date.now().toString()
      };

      emailTrackingService.verifyWebhookSignature = jest.fn().mockReturnValue(true);
      emailTrackingService.processWebhook.mockResolvedValue({ processed: true });

      await emailTrackingController.handleWebhook(req, res);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('getAnalytics', () => {
    it('should return email analytics for a company', async () => {
      req.query = {
        companyId: 'comp_123',
        startDate: '2026-01-01',
        endDate: '2026-01-31'
      };

      const mockAnalytics = {
        totalSent: 1000,
        deliveryRate: 95.5,
        openRate: 42.3,
        clickRate: 12.8,
        bounceRate: 2.1,
        spamRate: 0.1
      };

      emailTrackingService.getAnalytics.mockResolvedValue(mockAnalytics);

      await emailTrackingController.getAnalytics(req, res);

      expect(res.statusCode).toBe(200);
      const responseData = res._getJSONData();
      expect(responseData.totalSent).toBe(1000);
      expect(responseData.openRate).toBe(42.3);
    });

    it('should return analytics grouped by template', async () => {
      req.query = {
        companyId: 'comp_123',
        groupBy: 'template'
      };

      const mockAnalytics = {
        byTemplate: {
          welcome_email: { sent: 500, openRate: 65 },
          notification: { sent: 500, openRate: 30 }
        }
      };

      emailTrackingService.getAnalytics.mockResolvedValue(mockAnalytics);

      await emailTrackingController.getAnalytics(req, res);

      expect(res.statusCode).toBe(200);
      const responseData = res._getJSONData();
      expect(responseData.byTemplate).toBeDefined();
    });
  });

  describe('getEngagementReport', () => {
    it('should return engagement report', async () => {
      req.query = { companyId: 'comp_123' };

      const mockReport = {
        highlyEngaged: 150,
        moderatelyEngaged: 300,
        notEngaged: 50,
        averageOpenRate: 45.2,
        averageClickRate: 15.8
      };

      emailTrackingService.getEngagementReport.mockResolvedValue(mockReport);

      await emailTrackingController.getEngagementReport(req, res);

      expect(res.statusCode).toBe(200);
      const responseData = res._getJSONData();
      expect(responseData.highlyEngaged).toBe(150);
    });
  });

  describe('getBouncedEmails', () => {
    it('should return list of bounced emails', async () => {
      req.query = { companyId: 'comp_123' };

      const mockBounced = [
        { email: 'bounced1@example.com', bounceType: 'hard', reason: 'Invalid address' },
        { email: 'bounced2@example.com', bounceType: 'soft', reason: 'Mailbox full' }
      ];

      emailTrackingService.getBouncedEmails.mockResolvedValue(mockBounced);

      await emailTrackingController.getBouncedEmails(req, res);

      expect(res.statusCode).toBe(200);
      const responseData = res._getJSONData();
      expect(responseData).toHaveLength(2);
    });
  });

  describe('getSuppressedEmails', () => {
    it('should return suppression list', async () => {
      req.query = { companyId: 'comp_123' };

      const mockSuppressed = [
        { email: 'suppressed1@example.com', reason: 'hard_bounce', suppressedAt: new Date() },
        { email: 'suppressed2@example.com', reason: 'spam_report', suppressedAt: new Date() }
      ];

      emailTrackingService.getSuppressedEmails.mockResolvedValue(mockSuppressed);

      await emailTrackingController.getSuppressedEmails(req, res);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('removeSuppression', () => {
    it('should remove email from suppression list', async () => {
      req.params = { email: 'test@example.com' };

      emailTrackingService.removeSuppression.mockResolvedValue({ removed: true });

      await emailTrackingController.removeSuppression(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should return 404 if email not in suppression list', async () => {
      req.params = { email: 'notfound@example.com' };

      emailTrackingService.removeSuppression.mockResolvedValue(null);

      await emailTrackingController.removeSuppression(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('checkEmailSuppression', () => {
    it('should return suppression status', async () => {
      req.params = { email: 'test@example.com' };

      emailTrackingService.isEmailSuppressed.mockResolvedValue(true);

      await emailTrackingController.checkEmailSuppression(req, res);

      expect(res.statusCode).toBe(200);
      const responseData = res._getJSONData();
      expect(responseData.suppressed).toBe(true);
    });
  });
});

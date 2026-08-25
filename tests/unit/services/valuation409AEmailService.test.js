/**
 * 409A Valuation Email Notification Service Test Suite
 *
 * Tests email sending for the 409A workflow:
 * - Payment confirmation
 * - Accountant queue notification
 * - Report released notification
 * - Credential checks and skipping behavior
 */

// Store original env and restore after each test
const originalEnv = { ...process.env };

// Shared mock for sendMail - prefixed with "mock" so jest allows it in factory
const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'msg_123' });
const mockCreateTransportArgs = [];

jest.mock('nodemailer', () => ({
  createTransport: jest.fn((config) => {
    mockCreateTransportArgs.push(config);
    return { sendMail: mockSendMail };
  })
}));

describe('Valuation 409A Email Service', () => {
  let emailService;

  beforeEach(() => {
    jest.resetModules();
    mockSendMail.mockClear();
    mockSendMail.mockResolvedValue({ messageId: 'msg_123' });
    mockCreateTransportArgs.length = 0;

    // Re-apply the mock after resetModules
    jest.mock('nodemailer', () => ({
      createTransport: jest.fn((config) => {
        mockCreateTransportArgs.push(config);
        return { sendMail: mockSendMail };
      })
    }));

    // Set env so emails are not skipped
    process.env.EMAIL_PASS = 'test-pass';
    process.env.RESEND_API_KEY = 'test-key';
    process.env.EMAIL_HOST = 'smtp.test.com';
    process.env.EMAIL_PORT = '587';
    process.env.EMAIL_FROM = 'test@opencapstack.com';
    process.env.FRONTEND_URL = 'https://app.test.com';
    process.env.EMAIL_USER = 'testuser';

    emailService = require('../../../services/valuation409AEmailService');
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // ── sendPaymentConfirmed ──
  describe('sendPaymentConfirmed', () => {
    it('should send payment confirmation email with correct params', async () => {
      await emailService.sendPaymentConfirmed({
        to: 'founder@example.com',
        companyId: 'comp_1',
        valuationId: 'val_1',
        fmv: 1.2345
      });

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.to).toBe('founder@example.com');
      expect(callArgs.from).toBe('test@opencapstack.com');
      expect(callArgs.subject).toContain('Payment confirmed');
      expect(callArgs.html).toContain('comp_1');
      expect(callArgs.html).toContain('val_1');
    });

    it('should include a link to the valuation page', async () => {
      await emailService.sendPaymentConfirmed({
        to: 'founder@example.com',
        companyId: 'comp_1',
        valuationId: 'val_abc'
      });

      const html = mockSendMail.mock.calls[0][0].html;
      expect(html).toContain('https://app.test.com/valuations/val_abc');
    });

    it('should include the valuation ID in the HTML body', async () => {
      await emailService.sendPaymentConfirmed({
        to: 'a@b.com',
        companyId: 'c',
        valuationId: 'val_xyz'
      });

      const html = mockSendMail.mock.calls[0][0].html;
      expect(html).toContain('val_xyz');
    });
  });

  // ── sendAccountantQueueNotification ──
  describe('sendAccountantQueueNotification', () => {
    it('should send email to each accountant', async () => {
      await emailService.sendAccountantQueueNotification({
        accountantEmails: ['acc1@example.com', 'acc2@example.com'],
        companyId: 'comp_1',
        valuationId: 'val_1',
        fmv: 2.5678
      });

      expect(mockSendMail).toHaveBeenCalledTimes(2);
      expect(mockSendMail.mock.calls[0][0].to).toBe('acc1@example.com');
      expect(mockSendMail.mock.calls[1][0].to).toBe('acc2@example.com');
    });

    it('should include FMV formatted to 4 decimal places', async () => {
      await emailService.sendAccountantQueueNotification({
        accountantEmails: ['acc@example.com'],
        companyId: 'comp_1',
        valuationId: 'val_1',
        fmv: 3.14159
      });

      const html = mockSendMail.mock.calls[0][0].html;
      expect(html).toContain('$3.1416');
    });

    it('should handle null FMV gracefully', async () => {
      await emailService.sendAccountantQueueNotification({
        accountantEmails: ['acc@example.com'],
        companyId: 'comp_1',
        valuationId: 'val_1',
        fmv: null
      });

      const html = mockSendMail.mock.calls[0][0].html;
      expect(html).toContain('$0.0000');
    });

    it('should skip when accountantEmails is empty', async () => {
      await emailService.sendAccountantQueueNotification({
        accountantEmails: [],
        companyId: 'comp_1',
        valuationId: 'val_1'
      });

      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('should skip when accountantEmails is null', async () => {
      await emailService.sendAccountantQueueNotification({
        accountantEmails: null,
        companyId: 'comp_1',
        valuationId: 'val_1'
      });

      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('should skip when accountantEmails is undefined', async () => {
      await emailService.sendAccountantQueueNotification({
        companyId: 'comp_1',
        valuationId: 'val_1'
      });

      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('should include link to accountant dashboard', async () => {
      await emailService.sendAccountantQueueNotification({
        accountantEmails: ['acc@example.com'],
        companyId: 'comp_1',
        valuationId: 'val_1',
        fmv: 1.0
      });

      const html = mockSendMail.mock.calls[0][0].html;
      expect(html).toContain('https://app.test.com/accountant');
    });

    it('should include companyId in subject line', async () => {
      await emailService.sendAccountantQueueNotification({
        accountantEmails: ['acc@example.com'],
        companyId: 'AcmeCorp',
        valuationId: 'val_1',
        fmv: 1.0
      });

      const subject = mockSendMail.mock.calls[0][0].subject;
      expect(subject).toContain('AcmeCorp');
    });
  });

  // ── sendReportReleased ──
  describe('sendReportReleased', () => {
    it('should send report released email with FMV and signer', async () => {
      await emailService.sendReportReleased({
        to: 'founder@example.com',
        companyId: 'comp_1',
        valuationId: 'val_1',
        fmv: 5.0001,
        signedBy: 'Jane CPA'
      });

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.to).toBe('founder@example.com');
      expect(callArgs.subject).toContain('409A Valuation Report is ready');
      expect(callArgs.html).toContain('$5.0001');
      expect(callArgs.html).toContain('Jane CPA');
    });

    it('should handle missing signedBy gracefully', async () => {
      await emailService.sendReportReleased({
        to: 'founder@example.com',
        companyId: 'comp_1',
        valuationId: 'val_1',
        fmv: 1.0
      });

      const html = mockSendMail.mock.calls[0][0].html;
      expect(html).not.toContain('Reviewed');
    });

    it('should include link to valuation detail page', async () => {
      await emailService.sendReportReleased({
        to: 'founder@example.com',
        companyId: 'comp_1',
        valuationId: 'val_xyz',
        fmv: 1.0
      });

      const html = mockSendMail.mock.calls[0][0].html;
      expect(html).toContain('https://app.test.com/valuations/val_xyz');
    });

    it('should handle null FMV gracefully', async () => {
      await emailService.sendReportReleased({
        to: 'founder@example.com',
        companyId: 'comp_1',
        valuationId: 'val_1',
        fmv: null
      });

      const html = mockSendMail.mock.calls[0][0].html;
      expect(html).toContain('$0.0000');
    });

    it('should handle undefined FMV', async () => {
      await emailService.sendReportReleased({
        to: 'founder@example.com',
        companyId: 'comp_1',
        valuationId: 'val_1'
      });

      const html = mockSendMail.mock.calls[0][0].html;
      expect(html).toContain('$0.0000');
    });

    it('should include signer name when signedBy is present', async () => {
      await emailService.sendReportReleased({
        to: 'founder@example.com',
        companyId: 'comp_1',
        valuationId: 'val_1',
        fmv: 1.0,
        signedBy: 'John Accountant'
      });

      const html = mockSendMail.mock.calls[0][0].html;
      expect(html).toContain('John Accountant');
    });
  });

  // ── Email skipping when no credentials ──
  describe('Email credential checks', () => {
    it('should skip sending when neither EMAIL_PASS nor RESEND_API_KEY is set', async () => {
      jest.resetModules();
      jest.mock('nodemailer', () => ({
        createTransport: jest.fn((config) => {
          mockCreateTransportArgs.push(config);
          return { sendMail: mockSendMail };
        })
      }));
      delete process.env.EMAIL_PASS;
      delete process.env.RESEND_API_KEY;
      mockSendMail.mockClear();

      const freshService = require('../../../services/valuation409AEmailService');
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await freshService.sendPaymentConfirmed({
        to: 'test@example.com',
        companyId: 'comp_1',
        valuationId: 'val_1'
      });

      expect(mockSendMail).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('skipping email')
      );
      consoleSpy.mockRestore();
    });

    it('should send when only RESEND_API_KEY is set', async () => {
      jest.resetModules();
      jest.mock('nodemailer', () => ({
        createTransport: jest.fn((config) => {
          mockCreateTransportArgs.push(config);
          return { sendMail: mockSendMail };
        })
      }));
      delete process.env.EMAIL_PASS;
      process.env.RESEND_API_KEY = 'rk_test';
      mockSendMail.mockClear();

      const freshService = require('../../../services/valuation409AEmailService');

      await freshService.sendPaymentConfirmed({
        to: 'test@example.com',
        companyId: 'comp_1',
        valuationId: 'val_1'
      });

      expect(mockSendMail).toHaveBeenCalledTimes(1);
    });

    it('should send when only EMAIL_PASS is set', async () => {
      jest.resetModules();
      jest.mock('nodemailer', () => ({
        createTransport: jest.fn((config) => {
          mockCreateTransportArgs.push(config);
          return { sendMail: mockSendMail };
        })
      }));
      process.env.EMAIL_PASS = 'pass123';
      delete process.env.RESEND_API_KEY;
      mockSendMail.mockClear();

      const freshService = require('../../../services/valuation409AEmailService');

      await freshService.sendPaymentConfirmed({
        to: 'test@example.com',
        companyId: 'comp_1',
        valuationId: 'val_1'
      });

      expect(mockSendMail).toHaveBeenCalledTimes(1);
    });
  });

  // ── Transporter configuration ──
  describe('Transporter configuration', () => {
    it('should use secure=true when port is 465', async () => {
      jest.resetModules();
      mockCreateTransportArgs.length = 0;
      jest.mock('nodemailer', () => ({
        createTransport: jest.fn((config) => {
          mockCreateTransportArgs.push(config);
          return { sendMail: mockSendMail };
        })
      }));
      process.env.EMAIL_PASS = 'pass';
      process.env.EMAIL_PORT = '465';
      mockSendMail.mockClear();

      const freshService = require('../../../services/valuation409AEmailService');
      await freshService.sendPaymentConfirmed({ to: 'test@example.com', companyId: 'c', valuationId: 'v' });

      const config = mockCreateTransportArgs[mockCreateTransportArgs.length - 1];
      expect(config.port).toBe(465);
      expect(config.secure).toBe(true);
    });

    it('should use secure=false when port is not 465', async () => {
      jest.resetModules();
      mockCreateTransportArgs.length = 0;
      jest.mock('nodemailer', () => ({
        createTransport: jest.fn((config) => {
          mockCreateTransportArgs.push(config);
          return { sendMail: mockSendMail };
        })
      }));
      process.env.EMAIL_PASS = 'pass';
      process.env.EMAIL_PORT = '587';
      mockSendMail.mockClear();

      const freshService = require('../../../services/valuation409AEmailService');
      await freshService.sendPaymentConfirmed({ to: 'test@example.com', companyId: 'c', valuationId: 'v' });

      const config = mockCreateTransportArgs[mockCreateTransportArgs.length - 1];
      expect(config.port).toBe(587);
      expect(config.secure).toBe(false);
    });

    it('should use defaults when env vars are not set', async () => {
      jest.resetModules();
      mockCreateTransportArgs.length = 0;
      jest.mock('nodemailer', () => ({
        createTransport: jest.fn((config) => {
          mockCreateTransportArgs.push(config);
          return { sendMail: mockSendMail };
        })
      }));
      process.env.EMAIL_PASS = 'pass';
      delete process.env.EMAIL_HOST;
      delete process.env.EMAIL_PORT;
      delete process.env.EMAIL_USER;
      delete process.env.EMAIL_FROM;
      delete process.env.FRONTEND_URL;
      mockSendMail.mockClear();

      const freshService = require('../../../services/valuation409AEmailService');
      await freshService.sendPaymentConfirmed({ to: 'test@example.com', companyId: 'c', valuationId: 'v' });

      const config = mockCreateTransportArgs[mockCreateTransportArgs.length - 1];
      expect(config.host).toBe('smtp.resend.com');
      expect(config.port).toBe(465);
      expect(config.secure).toBe(true);
      expect(config.auth.user).toBe('resend');
    });
  });

  // ── HTML layout ──
  describe('HTML layout', () => {
    it('should wrap content in a well-formed HTML document', async () => {
      await emailService.sendPaymentConfirmed({
        to: 'test@example.com',
        companyId: 'c',
        valuationId: 'v'
      });

      const html = mockSendMail.mock.calls[0][0].html;
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('</html>');
      expect(html).toContain('OpenCap Stack');
    });

    it('should include 409A Platform subtitle in header', async () => {
      await emailService.sendPaymentConfirmed({
        to: 'test@example.com',
        companyId: 'c',
        valuationId: 'v'
      });

      const html = mockSendMail.mock.calls[0][0].html;
      expect(html).toContain('409A Valuation Platform');
    });
  });
});

/**
 * Tests: Stripe Connect Webhook Controller
 * Issue #567: Handle Stripe Connect events for accountant payouts
 */

const {
  handleStripeConnectWebhook,
  handleAccountUpdated,
  handlePayoutFailed
} = require('../controllers/stripeConnectWebhookController');

// Mock dependencies
jest.mock('../services/stripeService', () => ({
  constructEvent: jest.fn(),
  getStripe: jest.fn()
}));

jest.mock('../models/User', () => ({
  find: jest.fn()
}));

const stripeService = require('../services/stripeService');
const User = require('../models/User');

describe('Stripe Connect Webhook Controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET = 'whsec_test_secret';

    req = {
      headers: { 'stripe-signature': 'sig_test_123' },
      body: Buffer.from('{}')
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  afterEach(() => {
    delete process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  });

  describe('handleStripeConnectWebhook', () => {
    it('should return 400 when stripe-signature header is missing', async () => {
      req.headers = {};

      await handleStripeConnectWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing stripe-signature header' });
    });

    it('should return 400 when signature verification fails (invalid signature)', async () => {
      stripeService.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await handleStripeConnectWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid signature' });
    });

    it('should return 500 when webhook secret is not configured', async () => {
      delete process.env.STRIPE_CONNECT_WEBHOOK_SECRET;

      await handleStripeConnectWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Webhook secret not configured' });
    });

    it('should return 200 and trigger schedule update for account.updated with payouts_enabled', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({});
      stripeService.getStripe.mockReturnValue({ accounts: { update: mockUpdate } });
      stripeService.constructEvent.mockReturnValue({
        type: 'account.updated',
        data: {
          object: {
            id: 'acct_test_123',
            payouts_enabled: true
          }
        }
      });
      User.find.mockResolvedValue([{ userId: 'user_abc', stripeConnectAccountId: 'acct_test_123' }]);

      await handleStripeConnectWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true });
      expect(mockUpdate).toHaveBeenCalledWith('acct_test_123', {
        settings: {
          payouts: {
            schedule: {
              interval: 'weekly',
              weekly_anchor: 'monday'
            }
          }
        }
      });
    });

    it('should return 200 but NOT update schedule when payouts_enabled is false', async () => {
      const mockUpdate = jest.fn();
      stripeService.getStripe.mockReturnValue({ accounts: { update: mockUpdate } });
      stripeService.constructEvent.mockReturnValue({
        type: 'account.updated',
        data: {
          object: {
            id: 'acct_test_456',
            payouts_enabled: false
          }
        }
      });

      await handleStripeConnectWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true });
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should handle payout.failed event without error', async () => {
      stripeService.constructEvent.mockReturnValue({
        type: 'payout.failed',
        data: {
          object: {
            id: 'po_failed_1',
            amount: 24975,
            destination: 'acct_test_789',
            failure_message: 'Insufficient funds'
          }
        }
      });

      await handleStripeConnectWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('should return 200 for unknown event types (ignore gracefully)', async () => {
      stripeService.constructEvent.mockReturnValue({
        type: 'some.unknown.event',
        data: { object: {} }
      });

      await handleStripeConnectWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('should handle transfer.created event without error', async () => {
      stripeService.constructEvent.mockReturnValue({
        type: 'transfer.created',
        data: {
          object: {
            id: 'tr_test_1',
            amount: 24975,
            destination: 'acct_test_123'
          }
        }
      });

      await handleStripeConnectWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('should handle payout.paid event without error', async () => {
      stripeService.constructEvent.mockReturnValue({
        type: 'payout.paid',
        data: {
          object: {
            id: 'po_paid_1',
            amount: 24975,
            destination: 'acct_test_123'
          }
        }
      });

      await handleStripeConnectWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });
  });

  describe('handleAccountUpdated (unit)', () => {
    it('should not call stripe update when payouts_enabled is false', async () => {
      const mockUpdate = jest.fn();
      stripeService.getStripe.mockReturnValue({ accounts: { update: mockUpdate } });

      await handleAccountUpdated({
        data: { object: { id: 'acct_1', payouts_enabled: false } }
      });

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should call stripe update and look up user when payouts_enabled is true', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({});
      stripeService.getStripe.mockReturnValue({ accounts: { update: mockUpdate } });
      User.find.mockResolvedValue([]);

      await handleAccountUpdated({
        data: { object: { id: 'acct_2', payouts_enabled: true } }
      });

      expect(mockUpdate).toHaveBeenCalledWith('acct_2', {
        settings: {
          payouts: {
            schedule: { interval: 'weekly', weekly_anchor: 'monday' }
          }
        }
      });
      expect(User.find).toHaveBeenCalledWith({ stripeConnectAccountId: 'acct_2' });
    });
  });

  describe('handlePayoutFailed (unit)', () => {
    it('should log error and attempt email alert gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await handlePayoutFailed({
        data: {
          object: {
            id: 'po_fail_1',
            amount: 24975,
            destination: 'acct_test',
            failure_message: 'Account closed'
          }
        }
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('payout.failed')
      );

      consoleSpy.mockRestore();
      warnSpy.mockRestore();
    });
  });
});

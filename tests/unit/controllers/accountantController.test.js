/**
 * Accountant Controller Tests
 *
 * Unit tests for the accountant review workflow: queue management,
 * annotations, sign-off, Stripe Connect onboarding, and admin operations.
 */

const httpMocks = require('node-mocks-http');
const accountantController = require('../../../controllers/accountantController');

// Mock all external dependencies
jest.mock('../../../models/AccountantQueue');
jest.mock('../../../models/Valuation409A');
jest.mock('../../../models/User');
jest.mock('../../../services/emailService');
jest.mock('../../../services/stripeService');
jest.mock('../../../middleware/companyScope', () => ({
  assertCompanyOwnership: jest.fn(() => true)
}));
jest.mock('../../../models/TransferLog', () => ({
  create: jest.fn().mockResolvedValue({}),
  find: jest.fn().mockResolvedValue([])
}));

const AccountantQueue = require('../../../models/AccountantQueue');
const Valuation409A = require('../../../models/Valuation409A');
const User = require('../../../models/User');
const emailService = require('../../../services/emailService');
const stripeService = require('../../../services/stripeService');
const { assertCompanyOwnership } = require('../../../middleware/companyScope');

describe('AccountantController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    req.user = { userId: 'user-1', email: 'acct@example.com', role: 'accountant', companyId: 'comp-1' };
    assertCompanyOwnership.mockReturnValue(true);
  });

  // ─── getQueue ────────────────────────────────────────────────────────────

  describe('getQueue', () => {
    it('should return enriched queue items for accountant role', async () => {
      const mockItems = [
        { queueId: 'q1', valuationId: 'v1', assignedAccountantId: null, status: 'unassigned' },
        { queueId: 'q2', valuationId: 'v2', assignedAccountantId: 'user-1', status: 'assigned' }
      ];
      AccountantQueue.find.mockResolvedValue(mockItems);
      Valuation409A.findOne.mockResolvedValue({
        valuationId: 'v1',
        companyId: 'comp-1',
        status: 'pending',
        aiStatus: 'complete',
        fairMarketValue: 5000000,
        businessContext: {},
        createdAt: '2026-01-01'
      });

      await accountantController.getQueue(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.total).toBe(2);
    });

    it('should filter by status query param for admin', async () => {
      req.user.role = 'admin';
      req.query = { status: 'assigned' };
      AccountantQueue.find.mockResolvedValue([]);

      await accountantController.getQueue(req, res);

      expect(res.statusCode).toBe(200);
      expect(AccountantQueue.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'assigned' }),
        expect.any(Object)
      );
    });

    it('should return 403 for non-accountant/admin roles', async () => {
      req.user.role = 'investor';

      await accountantController.getQueue(req, res);

      expect(res.statusCode).toBe(403);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
    });

    it('should handle enrichment when valuation not found', async () => {
      AccountantQueue.find.mockResolvedValue([
        { queueId: 'q1', valuationId: 'v-missing', assignedAccountantId: null }
      ]);
      Valuation409A.findOne.mockResolvedValue(null);

      await accountantController.getQueue(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data[0].valuation).toBeNull();
    });

    it('should return 500 on database error', async () => {
      AccountantQueue.find.mockRejectedValue(new Error('DB down'));

      await accountantController.getQueue(req, res);

      expect(res.statusCode).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('DB down');
    });

    it('should filter items for accountant to own + unassigned', async () => {
      AccountantQueue.find.mockResolvedValue([
        { queueId: 'q1', assignedAccountantId: null, valuationId: 'v1' },
        { queueId: 'q2', assignedAccountantId: 'user-1', valuationId: 'v2' },
        { queueId: 'q3', assignedAccountantId: 'other-user', valuationId: 'v3' }
      ]);
      Valuation409A.findOne.mockResolvedValue(null);

      await accountantController.getQueue(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      // Should exclude q3 (assigned to another accountant)
      expect(data.data).toHaveLength(2);
    });

    it('should use status filter for accountant role', async () => {
      req.query = { status: 'unassigned' };
      AccountantQueue.find.mockResolvedValue([]);

      await accountantController.getQueue(req, res);

      expect(res.statusCode).toBe(200);
      expect(AccountantQueue.find).toHaveBeenCalledWith(
        { status: 'unassigned' },
        expect.any(Object)
      );
    });

    it('should use row_id fallback when valuationId lookup fails', async () => {
      AccountantQueue.find.mockResolvedValue([
        { queueId: 'q1', valuationId: 'v1', assignedAccountantId: null }
      ]);
      Valuation409A.findOne
        .mockResolvedValueOnce(null) // first call (valuationId) returns null
        .mockResolvedValueOnce({ row_id: 'v1', companyId: 'c1', status: 'pending', aiStatus: 'done', fairMarketValue: 100, businessContext: {}, createdAt: '2026-01-01' });

      await accountantController.getQueue(req, res);

      expect(Valuation409A.findOne).toHaveBeenCalledTimes(2);
    });
  });

  // ─── getQueueItem ──────────────────────────────────────────────────────

  describe('getQueueItem', () => {
    it('should return a single queue item with valuation', async () => {
      req.params = { queueId: 'q1' };
      AccountantQueue.findOne.mockResolvedValue({ queueId: 'q1', valuationId: 'v1' });
      Valuation409A.findOne.mockResolvedValue({ valuationId: 'v1', status: 'pending' });

      await accountantController.getQueueItem(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.valuation).toBeTruthy();
    });

    it('should return 404 when queue item not found', async () => {
      req.params = { queueId: 'nonexistent' };
      AccountantQueue.findOne.mockResolvedValue(null);

      await accountantController.getQueueItem(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should return 500 on error', async () => {
      req.params = { queueId: 'q1' };
      AccountantQueue.findOne.mockRejectedValue(new Error('DB error'));

      await accountantController.getQueueItem(req, res);

      expect(res.statusCode).toBe(500);
    });

    it('should use row_id fallback for valuation lookup', async () => {
      req.params = { queueId: 'q1' };
      AccountantQueue.findOne.mockResolvedValue({ queueId: 'q1', valuationId: 'v1' });
      Valuation409A.findOne
        .mockResolvedValueOnce(null) // valuationId not found
        .mockResolvedValueOnce({ row_id: 'v1', status: 'pending' }); // row_id found

      await accountantController.getQueueItem(req, res);

      expect(res.statusCode).toBe(200);
      expect(Valuation409A.findOne).toHaveBeenCalledTimes(2);
    });
  });

  // ─── claimQueueItem ────────────────────────────────────────────────────

  describe('claimQueueItem', () => {
    it('should claim an unassigned queue item', async () => {
      req.params = { queueId: 'q1' };
      AccountantQueue.findOne.mockResolvedValue({ queueId: 'q1', valuationId: 'v1', assignedAccountantId: null });
      AccountantQueue.updateOne.mockResolvedValue({});
      Valuation409A.findOne.mockResolvedValue({ valuationId: 'v1' });
      Valuation409A.updateOne.mockResolvedValue({});

      await accountantController.claimQueueItem(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Queue item claimed');
    });

    it('should return 404 when queue item not found', async () => {
      req.params = { queueId: 'nonexistent' };
      AccountantQueue.findOne.mockResolvedValue(null);

      await accountantController.claimQueueItem(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should return 409 when already claimed by another accountant', async () => {
      req.params = { queueId: 'q1' };
      AccountantQueue.findOne.mockResolvedValue({
        queueId: 'q1',
        valuationId: 'v1',
        assignedAccountantId: 'other-user'
      });

      await accountantController.claimQueueItem(req, res);

      expect(res.statusCode).toBe(409);
    });

    it('should allow re-claiming own item', async () => {
      req.params = { queueId: 'q1' };
      AccountantQueue.findOne.mockResolvedValue({
        queueId: 'q1',
        valuationId: 'v1',
        assignedAccountantId: 'user-1'
      });
      AccountantQueue.updateOne.mockResolvedValue({});
      Valuation409A.findOne.mockResolvedValue({ valuationId: 'v1' });
      Valuation409A.updateOne.mockResolvedValue({});

      await accountantController.claimQueueItem(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should return 500 on error', async () => {
      req.params = { queueId: 'q1' };
      AccountantQueue.findOne.mockRejectedValue(new Error('DB error'));

      await accountantController.claimQueueItem(req, res);

      expect(res.statusCode).toBe(500);
    });

    it('should handle valuation not found during claim', async () => {
      req.params = { queueId: 'q1' };
      AccountantQueue.findOne.mockResolvedValue({ queueId: 'q1', valuationId: 'v1', assignedAccountantId: null });
      AccountantQueue.updateOne.mockResolvedValue({});
      Valuation409A.findOne.mockResolvedValue(null);

      await accountantController.claimQueueItem(req, res);

      expect(res.statusCode).toBe(200);
    });
  });

  // ─── startReview ───────────────────────────────────────────────────────

  describe('startReview', () => {
    it('should start review for assigned accountant', async () => {
      req.params = { queueId: 'q1' };
      AccountantQueue.findOne.mockResolvedValue({ queueId: 'q1', assignedAccountantId: 'user-1' });
      AccountantQueue.updateOne.mockResolvedValue({});

      await accountantController.startReview(req, res);

      expect(res.statusCode).toBe(200);
      expect(AccountantQueue.updateOne).toHaveBeenCalledWith(
        { queueId: 'q1' },
        expect.objectContaining({ $set: expect.objectContaining({ status: 'in_review' }) })
      );
    });

    it('should return 404 when queue item not found', async () => {
      req.params = { queueId: 'nonexistent' };
      AccountantQueue.findOne.mockResolvedValue(null);

      await accountantController.startReview(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should return 403 when assigned to another and not admin', async () => {
      req.params = { queueId: 'q1' };
      AccountantQueue.findOne.mockResolvedValue({ queueId: 'q1', assignedAccountantId: 'other-user' });

      await accountantController.startReview(req, res);

      expect(res.statusCode).toBe(403);
    });

    it('should allow admin to start review for any item', async () => {
      req.user.role = 'admin';
      req.params = { queueId: 'q1' };
      AccountantQueue.findOne.mockResolvedValue({ queueId: 'q1', assignedAccountantId: 'other-user' });
      AccountantQueue.updateOne.mockResolvedValue({});

      await accountantController.startReview(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should return 500 on error', async () => {
      req.params = { queueId: 'q1' };
      AccountantQueue.findOne.mockRejectedValue(new Error('DB error'));

      await accountantController.startReview(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // ─── addAnnotation ─────────────────────────────────────────────────────

  describe('addAnnotation', () => {
    it('should add annotation to valuation', async () => {
      req.params = { valuationId: 'v1' };
      req.body = { section: 'methodology', comment: 'Looks correct' };
      Valuation409A.findOne.mockResolvedValue({
        valuationId: 'v1',
        accountantReview: { annotations: [], changeRequests: [] }
      });
      Valuation409A.updateOne.mockResolvedValue({});

      await accountantController.addAnnotation(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.section).toBe('methodology');
      expect(data.data.annotationId).toBeTruthy();
    });

    it('should return 400 when section missing', async () => {
      req.params = { valuationId: 'v1' };
      req.body = { comment: 'No section' };

      await accountantController.addAnnotation(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when comment missing', async () => {
      req.params = { valuationId: 'v1' };
      req.body = { section: 'methodology' };

      await accountantController.addAnnotation(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should handle missing accountantReview on valuation', async () => {
      req.params = { valuationId: 'v1' };
      req.body = { section: 'summary', comment: 'Good' };
      Valuation409A.findOne.mockResolvedValue({
        valuationId: 'v1',
        accountantReview: null
      });
      Valuation409A.updateOne.mockResolvedValue({});

      await accountantController.addAnnotation(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should return when company ownership fails', async () => {
      req.params = { valuationId: 'v1' };
      req.body = { section: 'summary', comment: 'Good' };
      Valuation409A.findOne.mockResolvedValue({ valuationId: 'v1' });
      assertCompanyOwnership.mockReturnValue(false);

      await accountantController.addAnnotation(req, res);

      // Controller returns early when assertCompanyOwnership returns false
      expect(Valuation409A.updateOne).not.toHaveBeenCalled();
    });

    it('should use row_id fallback for valuation', async () => {
      req.params = { valuationId: 'v1' };
      req.body = { section: 'summary', comment: 'Good' };
      Valuation409A.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ row_id: 'v1', accountantReview: null });
      Valuation409A.updateOne.mockResolvedValue({});

      await accountantController.addAnnotation(req, res);

      expect(Valuation409A.findOne).toHaveBeenCalledTimes(2);
    });
  });

  // ─── resolveAnnotation ─────────────────────────────────────────────────

  describe('resolveAnnotation', () => {
    it('should resolve an annotation by id', async () => {
      req.params = { valuationId: 'v1', annotationId: 'ann-1' };
      Valuation409A.findOne.mockResolvedValue({
        valuationId: 'v1',
        accountantReview: {
          annotations: [{ annotationId: 'ann-1', resolved: false }],
          changeRequests: []
        }
      });
      Valuation409A.updateOne.mockResolvedValue({});

      await accountantController.resolveAnnotation(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Annotation resolved');
    });

    it('should return 500 on error', async () => {
      req.params = { valuationId: 'v1', annotationId: 'ann-1' };
      Valuation409A.findOne.mockRejectedValue(new Error('DB error'));

      await accountantController.resolveAnnotation(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // ─── approveAndSign ────────────────────────────────────────────────────

  describe('approveAndSign', () => {
    it('should approve and sign a valuation', async () => {
      req.params = { valuationId: 'v1' };
      req.body = { confirmApproval: true, overallNotes: 'LGTM' };
      req.ip = '127.0.0.1';
      req.headers = { 'user-agent': 'test-agent' };
      Valuation409A.findOne.mockResolvedValue({
        valuationId: 'v1',
        fairMarketValue: 5000000,
        accountantReview: { annotations: [] }
      });
      Valuation409A.updateOne.mockResolvedValue({});
      AccountantQueue.findOne.mockResolvedValue({ queueId: 'q1' });
      AccountantQueue.updateOne.mockResolvedValue({});

      await accountantController.approveAndSign(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.signatureId).toBeTruthy();
    });

    it('should return 400 when confirmApproval is false', async () => {
      req.params = { valuationId: 'v1' };
      req.body = { confirmApproval: false };

      await accountantController.approveAndSign(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 403 for non-accountant/admin', async () => {
      req.user.role = 'investor';
      req.params = { valuationId: 'v1' };
      req.body = { confirmApproval: true };

      await accountantController.approveAndSign(req, res);

      expect(res.statusCode).toBe(403);
    });

    it('should allow admin role', async () => {
      req.user.role = 'admin';
      req.params = { valuationId: 'v1' };
      req.body = { confirmApproval: true };
      req.ip = '127.0.0.1';
      req.headers = { 'user-agent': 'test' };
      Valuation409A.findOne.mockResolvedValue({ valuationId: 'v1', fairMarketValue: 100, accountantReview: {} });
      Valuation409A.updateOne.mockResolvedValue({});
      AccountantQueue.findOne.mockResolvedValue(null);

      await accountantController.approveAndSign(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should return 500 on error', async () => {
      req.params = { valuationId: 'v1' };
      req.body = { confirmApproval: true };
      req.ip = '127.0.0.1';
      req.headers = { 'user-agent': 'test' };
      Valuation409A.findOne.mockRejectedValue(new Error('DB error'));

      await accountantController.approveAndSign(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // ─── releaseToCompany ──────────────────────────────────────────────────

  describe('releaseToCompany', () => {
    it('should release approved valuation to company', async () => {
      req.user.role = 'admin';
      req.params = { valuationId: 'v1' };
      Valuation409A.findOne.mockResolvedValue({
        valuationId: 'v1',
        status: 'accountant_approved',
        requestedBy: 'user-2',
        accountantSignatureRecord: { signerEmail: 'acct@test.com' },
        fairMarketValue: 5000000
      });
      Valuation409A.updateOne.mockResolvedValue({});
      AccountantQueue.findOne.mockResolvedValue(null);
      User.findOne.mockResolvedValue({ email: 'founder@test.com' });
      emailService.sendReportReleased = jest.fn().mockResolvedValue({});

      await accountantController.releaseToCompany(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Valuation released to company dashboard');
    });

    it('should return 403 for non-admin', async () => {
      req.user.role = 'accountant';
      req.params = { valuationId: 'v1' };

      await accountantController.releaseToCompany(req, res);

      expect(res.statusCode).toBe(403);
    });

    it('should return 400 when valuation not accountant_approved', async () => {
      req.user.role = 'admin';
      req.params = { valuationId: 'v1' };
      Valuation409A.findOne.mockResolvedValue({ valuationId: 'v1', status: 'pending' });

      await accountantController.releaseToCompany(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should handle Stripe transfer error gracefully', async () => {
      req.user.role = 'admin';
      req.params = { valuationId: 'v1' };
      Valuation409A.findOne.mockResolvedValue({
        valuationId: 'v1',
        status: 'accountant_approved',
        requestedBy: 'user-2'
      });
      Valuation409A.updateOne.mockResolvedValue({});
      AccountantQueue.findOne.mockResolvedValue({
        assignedAccountantId: 'acct-1',
        queueId: 'q1'
      });
      stripeService.isConfigured = jest.fn().mockReturnValue(true);
      User.findOne.mockResolvedValueOnce({ stripeConnectAccountId: 'acct_123' });
      stripeService.getStripe = jest.fn().mockReturnValue({
        transfers: { create: jest.fn().mockRejectedValue(new Error('Stripe error')) }
      });
      // For the email requester lookup
      User.findOne.mockResolvedValueOnce(null);

      await accountantController.releaseToCompany(req, res);

      // Should still succeed even if Stripe transfer fails
      expect(res.statusCode).toBe(200);
    });

    it('should handle email notification error gracefully', async () => {
      req.user.role = 'admin';
      req.params = { valuationId: 'v1' };
      Valuation409A.findOne.mockResolvedValue({
        valuationId: 'v1',
        status: 'accountant_approved',
        requestedBy: 'user-2',
        fairMarketValue: 100
      });
      Valuation409A.updateOne.mockResolvedValue({});
      AccountantQueue.findOne.mockResolvedValue(null);
      User.findOne.mockResolvedValue({ email: 'founder@test.com' });
      emailService.sendReportReleased = jest.fn().mockRejectedValue(new Error('Email error'));

      await accountantController.releaseToCompany(req, res);

      // Should still succeed even if email fails
      expect(res.statusCode).toBe(200);
    });

    it('should return 500 on error', async () => {
      req.user.role = 'admin';
      req.params = { valuationId: 'v1' };
      Valuation409A.findOne.mockRejectedValue(new Error('DB error'));

      await accountantController.releaseToCompany(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // ─── getStats ──────────────────────────────────────────────────────────

  describe('getStats', () => {
    it('should return stats for accountant', async () => {
      AccountantQueue.find.mockResolvedValue([
        { status: 'unassigned' },
        { status: 'assigned' },
        { status: 'assigned' },
        { status: 'completed' }
      ]);

      await accountantController.getStats(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data.totalInQueue).toBe(4);
      expect(data.data.unassigned).toBe(1);
      expect(data.data.assigned).toBe(2);
      expect(data.data.completed).toBe(1);
    });

    it('should return all stats for admin', async () => {
      req.user.role = 'admin';
      AccountantQueue.find.mockResolvedValue([]);

      await accountantController.getStats(req, res);

      expect(res.statusCode).toBe(200);
      expect(AccountantQueue.find).toHaveBeenCalledWith({});
    });

    it('should return 500 on error', async () => {
      AccountantQueue.find.mockRejectedValue(new Error('DB error'));

      await accountantController.getStats(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // ─── createConnectOnboardingLink ───────────────────────────────────────

  describe('createConnectOnboardingLink', () => {
    it('should return 403 for non-accountant/admin', async () => {
      req.user.role = 'investor';

      await accountantController.createConnectOnboardingLink(req, res);

      expect(res.statusCode).toBe(403);
    });

    it('should return 503 when Stripe not configured', async () => {
      stripeService.isConfigured = jest.fn().mockReturnValue(false);

      await accountantController.createConnectOnboardingLink(req, res);

      expect(res.statusCode).toBe(503);
    });

    it('should return 404 when user not found', async () => {
      stripeService.isConfigured = jest.fn().mockReturnValue(true);
      User.findOne.mockResolvedValue(null);

      await accountantController.createConnectOnboardingLink(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should create new Stripe account if not exists', async () => {
      stripeService.isConfigured = jest.fn().mockReturnValue(true);
      const mockStripe = {
        accounts: {
          create: jest.fn().mockResolvedValue({ id: 'acct_new' })
        },
        accountLinks: {
          create: jest.fn().mockResolvedValue({ url: 'https://stripe.com/onboard' })
        }
      };
      stripeService.getStripe = jest.fn().mockReturnValue(mockStripe);
      User.findOne.mockResolvedValue({ userId: 'user-1', stripeConnectAccountId: null });
      User.updateOne.mockResolvedValue({});

      await accountantController.createConnectOnboardingLink(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.url).toBe('https://stripe.com/onboard');
    });

    it('should reuse existing Stripe account', async () => {
      stripeService.isConfigured = jest.fn().mockReturnValue(true);
      const mockStripe = {
        accountLinks: {
          create: jest.fn().mockResolvedValue({ url: 'https://stripe.com/onboard' })
        }
      };
      stripeService.getStripe = jest.fn().mockReturnValue(mockStripe);
      User.findOne.mockResolvedValue({ userId: 'user-1', stripeConnectAccountId: 'acct_existing' });

      await accountantController.createConnectOnboardingLink(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should return 500 on error', async () => {
      stripeService.isConfigured = jest.fn().mockReturnValue(true);
      User.findOne.mockRejectedValue(new Error('DB error'));

      await accountantController.createConnectOnboardingLink(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // ─── getConnectStatus ──────────────────────────────────────────────────

  describe('getConnectStatus', () => {
    it('should return 403 for non-accountant/admin', async () => {
      req.user.role = 'investor';

      await accountantController.getConnectStatus(req, res);

      expect(res.statusCode).toBe(403);
    });

    it('should return 404 when user not found', async () => {
      User.findOne.mockResolvedValue(null);

      await accountantController.getConnectStatus(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should return connected:false when no stripe account', async () => {
      User.findOne.mockResolvedValue({ userId: 'user-1', stripeConnectAccountId: null });

      await accountantController.getConnectStatus(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data.connected).toBe(false);
    });

    it('should return account info when stripe configured', async () => {
      stripeService.isConfigured = jest.fn().mockReturnValue(true);
      User.findOne.mockResolvedValue({ userId: 'user-1', stripeConnectAccountId: 'acct_123' });
      stripeService.getStripe = jest.fn().mockReturnValue({
        accounts: {
          retrieve: jest.fn().mockResolvedValue({
            charges_enabled: true,
            payouts_enabled: true,
            details_submitted: true
          })
        }
      });

      await accountantController.getConnectStatus(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data.connected).toBe(true);
      expect(data.data.chargesEnabled).toBe(true);
    });

    it('should handle stripe not configured with existing account', async () => {
      stripeService.isConfigured = jest.fn().mockReturnValue(false);
      User.findOne.mockResolvedValue({ userId: 'user-1', stripeConnectAccountId: 'acct_123' });

      await accountantController.getConnectStatus(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data.connected).toBe(true);
      expect(data.data.chargesEnabled).toBe(false);
    });

    it('should return 500 on error', async () => {
      User.findOne.mockRejectedValue(new Error('DB error'));

      await accountantController.getConnectStatus(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // ─── listAccountants ──────────────────────────────────────────────────

  describe('listAccountants', () => {
    it('should list accountants for admin', async () => {
      req.user.role = 'admin';
      User.find.mockResolvedValue([{ userId: 'u1', role: 'accountant' }]);

      await accountantController.listAccountants(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data).toHaveLength(1);
    });

    it('should return 403 for non-admin', async () => {
      req.user.role = 'accountant';

      await accountantController.listAccountants(req, res);

      expect(res.statusCode).toBe(403);
    });

    it('should return 500 on error', async () => {
      req.user.role = 'admin';
      User.find.mockRejectedValue(new Error('DB error'));

      await accountantController.listAccountants(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // ─── getTransferHistory ───────────────────────────────────────────────

  describe('getTransferHistory', () => {
    it('should return transfer history for accountant', async () => {
      const TransferLog = require('../../../models/TransferLog');
      TransferLog.find.mockResolvedValue([{ transferId: 't1' }]);

      await accountantController.getTransferHistory(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should return all transfers for admin', async () => {
      req.user.role = 'admin';
      const TransferLog = require('../../../models/TransferLog');
      TransferLog.find.mockResolvedValue([]);

      await accountantController.getTransferHistory(req, res);

      expect(res.statusCode).toBe(200);
      expect(TransferLog.find).toHaveBeenCalledWith({}, expect.any(Object));
    });
  });

  // ─── adminCreateQueueItem ─────────────────────────────────────────────

  describe('adminCreateQueueItem', () => {
    it('should create queue item', async () => {
      req.body = { valuationId: 'v1', companyId: 'c1', priority: 'high' };
      AccountantQueue.create.mockResolvedValue({ queueId: 'q-new', valuationId: 'v1' });

      await accountantController.adminCreateQueueItem(req, res);

      expect(res.statusCode).toBe(201);
    });

    it('should return 400 when valuationId missing', async () => {
      req.body = {};

      await accountantController.adminCreateQueueItem(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should use default priority and companyId from user', async () => {
      req.body = { valuationId: 'v1' };
      AccountantQueue.create.mockResolvedValue({ queueId: 'q-new' });

      await accountantController.adminCreateQueueItem(req, res);

      expect(AccountantQueue.create).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'normal',
          companyId: 'comp-1'
        })
      );
    });

    it('should return 500 on error', async () => {
      req.body = { valuationId: 'v1' };
      AccountantQueue.create.mockRejectedValue(new Error('DB error'));

      await accountantController.adminCreateQueueItem(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // ─── adminAssignQueueItem ─────────────────────────────────────────────

  describe('adminAssignQueueItem', () => {
    it('should assign queue item as admin', async () => {
      req.user.role = 'admin';
      req.params = { queueId: 'q1' };
      req.body = { accountantUserId: 'acct-1' };
      AccountantQueue.findOne.mockResolvedValue({ queueId: 'q1' });
      AccountantQueue.updateOne.mockResolvedValue({});

      await accountantController.adminAssignQueueItem(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should return 403 for non-admin', async () => {
      req.params = { queueId: 'q1' };
      req.body = { accountantUserId: 'acct-1' };

      await accountantController.adminAssignQueueItem(req, res);

      expect(res.statusCode).toBe(403);
    });

    it('should return 400 when accountantUserId missing', async () => {
      req.user.role = 'admin';
      req.params = { queueId: 'q1' };
      req.body = {};

      await accountantController.adminAssignQueueItem(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 404 when queue item not found', async () => {
      req.user.role = 'admin';
      req.params = { queueId: 'nonexistent' };
      req.body = { accountantUserId: 'acct-1' };
      AccountantQueue.findOne.mockResolvedValue(null);

      await accountantController.adminAssignQueueItem(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should return 500 on error', async () => {
      req.user.role = 'admin';
      req.params = { queueId: 'q1' };
      req.body = { accountantUserId: 'acct-1' };
      AccountantQueue.findOne.mockRejectedValue(new Error('DB error'));

      await accountantController.adminAssignQueueItem(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // ─── createReviewPaymentIntent ────────────────────────────────────────

  describe('createReviewPaymentIntent', () => {
    it('should create payment intent', async () => {
      req.body = { valuationId: 'v1', amount: 99900 };
      AccountantQueue.find.mockResolvedValue([]);
      stripeService.createPaymentIntent = jest.fn().mockResolvedValue({
        client_secret: 'pi_secret',
        id: 'pi_123'
      });

      await accountantController.createReviewPaymentIntent(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.clientSecret).toBe('pi_secret');
    });

    it('should return 400 when valuationId missing', async () => {
      req.body = {};

      await accountantController.createReviewPaymentIntent(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should use default amount when not provided', async () => {
      req.body = { valuationId: 'v1' };
      AccountantQueue.find.mockResolvedValue([]);
      stripeService.createPaymentIntent = jest.fn().mockResolvedValue({
        client_secret: 'pi_secret',
        id: 'pi_123'
      });

      await accountantController.createReviewPaymentIntent(req, res);

      expect(stripeService.createPaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 99900 })
      );
    });

    it('should return 500 on error', async () => {
      req.body = { valuationId: 'v1' };
      AccountantQueue.find.mockResolvedValue([]);
      stripeService.createPaymentIntent = jest.fn().mockRejectedValue(new Error('Stripe error'));

      await accountantController.createReviewPaymentIntent(req, res);

      expect(res.statusCode).toBe(500);
    });
  });
});

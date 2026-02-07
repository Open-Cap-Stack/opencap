/**
 * Billing Controller Tests
 * Issue #201: Enhance Billing Dashboard APIs
 */

const billingController = require('../../../controllers/billingController');
const BillingService = require('../../../services/billingService');

jest.mock('../../../services/billingService');

describe('BillingController', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = { params: {}, query: {}, body: {}, user: { companyId: 'company-123', userId: 'user-123' } };
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), setHeader: jest.fn().mockReturnThis(), send: jest.fn().mockReturnThis() };
  });

  describe('GET /billing/current-plan', () => {
    it('should return current plan details', async () => {
      const mockPlanData = { subscription: { subscriptionId: 'SUB-123', status: 'active' }, plan: { planId: 'PLAN-PRO', name: 'Professional', price: 99 }, isActive: true, daysRemaining: 15 };
      BillingService.getCurrentPlan.mockResolvedValue(mockPlanData);
      await billingController.getCurrentPlan(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ subscription: expect.any(Object), plan: expect.any(Object) }));
    });

    it('should return default free plan when no active plan exists', async () => {
      BillingService.getCurrentPlan.mockResolvedValue(null);
      await billingController.getCurrentPlan(mockReq, mockRes);
      // Controller returns default free plan with 200 when plan is null
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ planId: 'free', planName: 'Free', status: 'active' }));
    });

    it('should handle errors gracefully', async () => {
      BillingService.getCurrentPlan.mockRejectedValue(new Error('Database error'));
      await billingController.getCurrentPlan(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('GET /billing/usage', () => {
    it('should return usage metrics', async () => {
      const mockUsage = { stakeholders: { current: 45, limit: 100 }, documents: { current: 120 } };
      BillingService.getUsageMetrics.mockResolvedValue(mockUsage);
      await billingController.getUsageMetrics(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockUsage);
    });
    it('should handle errors gracefully', async () => {
      BillingService.getUsageMetrics.mockRejectedValue(new Error('Service unavailable'));
      await billingController.getUsageMetrics(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('GET /billing/invoices', () => {
    it('should list invoices with pagination', async () => {
      mockReq.query = { page: '1', limit: '10' };
      const mockInvoices = { invoices: [{ invoiceId: 'INV-001' }], totalCount: 25 };
      BillingService.getInvoices.mockResolvedValue(mockInvoices);
      await billingController.getInvoices(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockInvoices);
    });
    it('should filter by status', async () => {
      mockReq.query = { status: 'paid' };
      BillingService.getInvoices.mockResolvedValue({ invoices: [] });
      await billingController.getInvoices(mockReq, mockRes);
      expect(BillingService.getInvoices).toHaveBeenCalledWith('company-123', expect.objectContaining({ status: 'paid' }));
    });
    it('should filter by date range', async () => {
      mockReq.query = { startDate: '2026-01-01', endDate: '2026-01-31' };
      BillingService.getInvoices.mockResolvedValue({ invoices: [] });
      await billingController.getInvoices(mockReq, mockRes);
      expect(BillingService.getInvoices).toHaveBeenCalledWith('company-123', expect.objectContaining({ startDate: '2026-01-01', endDate: '2026-01-31' }));
    });
  });

  describe('GET /billing/invoices/:id', () => {
    it('should return invoice details', async () => {
      mockReq.params.id = 'INV-123';
      BillingService.getInvoiceById.mockResolvedValue({ invoiceId: 'INV-123', amount: 99 });
      await billingController.getInvoiceById(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
    it('should return 404 if invoice not found', async () => {
      mockReq.params.id = 'INV-NOTFOUND';
      BillingService.getInvoiceById.mockRejectedValue(new Error('Invoice not found'));
      await billingController.getInvoiceById(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
    it('should return 400 if invoice ID is missing', async () => {
      mockReq.params.id = undefined;
      await billingController.getInvoiceById(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('GET /billing/invoices/:id/download', () => {
    it('should return PDF buffer with correct headers', async () => {
      mockReq.params.id = 'INV-123';
      BillingService.generateInvoicePDF.mockResolvedValue({ buffer: Buffer.from('PDF'), filename: 'invoice-INV-123.pdf' });
      await billingController.downloadInvoice(mockReq, mockRes);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    });
    it('should return 404 if invoice not found', async () => {
      mockReq.params.id = 'INV-NOTFOUND';
      BillingService.generateInvoicePDF.mockRejectedValue(new Error('Invoice not found'));
      await billingController.downloadInvoice(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('GET /billing/payment-methods', () => {
    it('should return payment methods', async () => {
      BillingService.getPaymentMethods.mockResolvedValue([{ methodId: 'PM-001' }]);
      await billingController.getPaymentMethods(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('POST /billing/payment-methods', () => {
    it('should add a new payment method', async () => {
      mockReq.body = { type: 'card', last4: '4242' };
      BillingService.addPaymentMethod.mockResolvedValue({ methodId: 'PM-123', ...mockReq.body });
      await billingController.addPaymentMethod(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
    it('should validate required fields', async () => {
      mockReq.body = { type: 'card' };
      BillingService.addPaymentMethod.mockRejectedValue(new Error('last4 is required'));
      await billingController.addPaymentMethod(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('DELETE /billing/payment-methods/:id', () => {
    it('should remove a payment method', async () => {
      mockReq.params.id = 'PM-123';
      BillingService.removePaymentMethod.mockResolvedValue({ success: true });
      await billingController.removePaymentMethod(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
    it('should return 404 if method not found', async () => {
      mockReq.params.id = 'PM-NOTFOUND';
      BillingService.removePaymentMethod.mockRejectedValue(new Error('Payment method not found'));
      await billingController.removePaymentMethod(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('POST /billing/upgrade', () => {
    it('should upgrade subscription plan', async () => {
      mockReq.body = { planId: 'PLAN-PRO' };
      BillingService.upgradePlan.mockResolvedValue({ success: true });
      await billingController.upgradePlan(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
    it('should return 400 if planId is missing', async () => {
      mockReq.body = {};
      await billingController.upgradePlan(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
    it('should handle upgrade errors', async () => {
      mockReq.body = { planId: 'PLAN-PRO' };
      BillingService.upgradePlan.mockRejectedValue(new Error('No active subscription'));
      await billingController.upgradePlan(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('POST /billing/downgrade', () => {
    it('should downgrade subscription plan', async () => {
      mockReq.body = { planId: 'PLAN-BASIC' };
      BillingService.downgradePlan.mockResolvedValue({ success: true });
      await billingController.downgradePlan(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
    it('should return 400 if planId is missing', async () => {
      mockReq.body = {};
      await billingController.downgradePlan(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('GET /billing/payment-history', () => {
    it('should return payment history', async () => {
      mockReq.query = { page: '1', limit: '10' };
      BillingService.getPaymentHistory.mockResolvedValue({ payments: [] });
      await billingController.getPaymentHistory(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Error handling', () => {
    it('should return default free plan when no companyId', async () => {
      mockReq.user = {};
      await billingController.getCurrentPlan(mockReq, mockRes);
      // Controller returns default free plan when no companyId
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ planId: 'free' }));
    });

    it('should return appropriate status codes based on error type', async () => {
      BillingService.getInvoiceById.mockRejectedValue(new Error('Invoice not found'));
      mockReq.params.id = 'INV-123';
      await billingController.getInvoiceById(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);

      mockRes.status.mockClear();
      mockRes.json.mockClear();

      BillingService.getInvoiceById.mockRejectedValue(new Error('Invalid invoice ID format'));
      await billingController.getInvoiceById(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});

/**
 * Billing Controller Tests
 * Issue #201: Enhance Billing Dashboard APIs
 *
 * Test suite for billing controller HTTP endpoints
 */

const billingController = require('../../../controllers/billingController');
const BillingService = require('../../../services/billingService');

// Mock the billing service
jest.mock('../../../services/billingService');

describe('BillingController', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { companyId: 'company-123', userId: 'user-123' }
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
  });

  describe('GET /billing/current-plan', () => {
    it('should return current plan details', async () => {
      const mockPlanData = {
        subscription: {
          subscriptionId: 'SUB-12345678',
          status: 'active',
          currentPeriodEnd: new Date('2026-02-15')
        },
        plan: {
          planId: 'PLAN-PRO',
          name: 'Professional',
          price: 99
        },
        isActive: true,
        daysRemaining: 15
      };

      BillingService.getCurrentPlan.mockResolvedValue(mockPlanData);

      await billingController.getCurrentPlan(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        subscription: expect.any(Object),
        plan: expect.any(Object)
      }));
    });

    it('should return 404 when no active plan exists', async () => {
      BillingService.getCurrentPlan.mockResolvedValue(null);

      await billingController.getCurrentPlan(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'No active subscription found'
      });
    });

    it('should handle errors gracefully', async () => {
      BillingService.getCurrentPlan.mockRejectedValue(new Error('Database error'));

      await billingController.getCurrentPlan(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Database error'
      });
    });
  });

  describe('GET /billing/usage', () => {
    it('should return usage metrics', async () => {
      const mockUsage = {
        stakeholders: { current: 45, limit: 100, percentUsed: 45 },
        documents: { current: 120, limit: -1, unlimited: true },
        users: { current: 8, limit: 25, percentUsed: 32 },
        apiCalls: { current: 15000, limit: 50000, percentUsed: 30 },
        storage: { current: 2.5, limit: 10, percentUsed: 25, unit: 'GB' }
      };

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

      const mockInvoices = {
        invoices: [
          { invoiceId: 'INV-001', amount: 99, status: 'paid' },
          { invoiceId: 'INV-002', amount: 99, status: 'paid' }
        ],
        totalCount: 25,
        currentPage: 1,
        totalPages: 3
      };

      BillingService.getInvoices.mockResolvedValue(mockInvoices);

      await billingController.getInvoices(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockInvoices);
      expect(BillingService.getInvoices).toHaveBeenCalledWith('company-123', {
        page: 1,
        limit: 10,
        status: undefined,
        startDate: undefined,
        endDate: undefined
      });
    });

    it('should filter by status', async () => {
      mockReq.query = { status: 'paid' };

      BillingService.getInvoices.mockResolvedValue({ invoices: [] });

      await billingController.getInvoices(mockReq, mockRes);

      expect(BillingService.getInvoices).toHaveBeenCalledWith('company-123', expect.objectContaining({
        status: 'paid'
      }));
    });

    it('should filter by date range', async () => {
      mockReq.query = {
        startDate: '2026-01-01',
        endDate: '2026-01-31'
      };

      BillingService.getInvoices.mockResolvedValue({ invoices: [] });

      await billingController.getInvoices(mockReq, mockRes);

      expect(BillingService.getInvoices).toHaveBeenCalledWith('company-123', expect.objectContaining({
        startDate: '2026-01-01',
        endDate: '2026-01-31'
      }));
    });
  });

  describe('GET /billing/invoices/:id', () => {
    it('should return invoice details', async () => {
      mockReq.params.id = 'INV-12345678';

      const mockInvoice = {
        invoiceId: 'INV-12345678',
        companyId: 'company-123',
        amount: 99,
        status: 'paid',
        lineItems: [
          { description: 'Professional Plan', amount: 99, quantity: 1 }
        ]
      };

      BillingService.getInvoiceById.mockResolvedValue(mockInvoice);

      await billingController.getInvoiceById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockInvoice);
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
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invoice ID is required'
      });
    });
  });

  describe('GET /billing/invoices/:id/download', () => {
    it('should return PDF buffer with correct headers', async () => {
      mockReq.params.id = 'INV-12345678';

      const mockPDFResult = {
        buffer: Buffer.from('PDF content'),
        filename: 'invoice-INV-12345678.pdf'
      };

      BillingService.generateInvoicePDF.mockResolvedValue(mockPDFResult);

      await billingController.downloadInvoice(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="invoice-INV-12345678.pdf"'
      );
      expect(mockRes.send).toHaveBeenCalledWith(mockPDFResult.buffer);
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
      const mockMethods = [
        { methodId: 'PM-001', type: 'card', last4: '4242', isDefault: true },
        { methodId: 'PM-002', type: 'card', last4: '1234', isDefault: false }
      ];

      BillingService.getPaymentMethods.mockResolvedValue(mockMethods);

      await billingController.getPaymentMethods(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockMethods);
    });
  });

  describe('POST /billing/payment-methods', () => {
    it('should add a new payment method', async () => {
      mockReq.body = {
        type: 'card',
        last4: '4242',
        brand: 'visa',
        expiryMonth: 12,
        expiryYear: 2028
      };

      const mockMethod = {
        methodId: 'PM-12345678',
        ...mockReq.body,
        isDefault: true
      };

      BillingService.addPaymentMethod.mockResolvedValue(mockMethod);

      await billingController.addPaymentMethod(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockMethod);
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
      mockReq.params.id = 'PM-12345678';

      BillingService.removePaymentMethod.mockResolvedValue({ success: true });

      await billingController.removePaymentMethod(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ success: true });
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

      const mockResult = {
        success: true,
        subscription: { subscriptionId: 'SUB-12345678', planId: 'PLAN-PRO' },
        prorationAmount: 35.50
      };

      BillingService.upgradePlan.mockResolvedValue(mockResult);

      await billingController.upgradePlan(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 if planId is missing', async () => {
      mockReq.body = {};

      await billingController.upgradePlan(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'planId is required'
      });
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

      const mockResult = {
        success: true,
        scheduledDowngrade: true,
        effectiveDate: new Date('2026-02-15').toISOString(),
        currentPlan: 'PLAN-PRO',
        newPlan: 'PLAN-BASIC'
      };

      BillingService.downgradePlan.mockResolvedValue(mockResult);

      await billingController.downgradePlan(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 if planId is missing', async () => {
      mockReq.body = {};

      await billingController.downgradePlan(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('GET /billing/payment-history', () => {
    it('should return payment history with summary', async () => {
      mockReq.query = { page: '1', limit: '10' };

      const mockHistory = {
        payments: [
          { paymentId: 'PAY-001', amount: 99, status: 'succeeded' },
          { paymentId: 'PAY-002', amount: 99, status: 'succeeded' }
        ],
        totalCount: 2,
        currentPage: 1,
        totalPages: 1,
        summary: {
          totalPaid: 198,
          totalRefunded: 0,
          netAmount: 198
        }
      };

      BillingService.getPaymentHistory.mockResolvedValue(mockHistory);

      await billingController.getPaymentHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockHistory);
    });
  });

  describe('Error handling', () => {
    it('should return 400 for validation errors', async () => {
      BillingService.getCurrentPlan.mockRejectedValue(new Error('companyId is required'));

      mockReq.user = {};

      await billingController.getCurrentPlan(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return appropriate status codes based on error type', async () => {
      // Test not found error
      BillingService.getInvoiceById.mockRejectedValue(new Error('Invoice not found'));
      mockReq.params.id = 'INV-123';

      await billingController.getInvoiceById(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);

      // Reset mocks
      mockRes.status.mockClear();
      mockRes.json.mockClear();

      // Test validation error
      BillingService.getInvoiceById.mockRejectedValue(new Error('Invalid invoice ID format'));

      await billingController.getInvoiceById(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});

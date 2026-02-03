/**
 * Payment Controller Tests
 * Feature: Issue #116 - Integrate Payment Processing
 * TDD Red Phase: Tests written before implementation
 */

const paymentController = require('../../../controllers/paymentController');
const paymentService = require('../../../services/paymentService');

// Mock payment service
jest.mock('../../../services/paymentService');

describe('Payment Controller', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { id: 'user-123', companyId: 'company-123', role: 'admin' }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
  });

  describe('createPaymentIntent', () => {
    const validPaymentData = {
      customerId: 'customer-456',
      amount: 10000,
      currency: 'USD',
      paymentMethod: 'card',
      description: 'Test payment'
    };

    it('should create a payment intent successfully', async () => {
      mockReq.body = validPaymentData;
      const mockPayment = {
        paymentId: 'pay-123',
        ...validPaymentData,
        companyId: 'company-123',
        status: 'pending',
        stripePaymentIntentId: 'pi_test_123'
      };

      paymentService.createPaymentIntent.mockResolvedValue(mockPayment);

      await paymentController.createPaymentIntent(mockReq, mockRes, mockNext);

      expect(paymentService.createPaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'customer-456',
          companyId: 'company-123',
          amount: 10000
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockPayment);
    });

    it('should return 400 for missing required fields', async () => {
      mockReq.body = { amount: 10000 };

      paymentService.createPaymentIntent.mockRejectedValue(
        new Error('customerId is required')
      );

      await paymentController.createPaymentIntent(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('required') })
      );
    });

    it('should return 400 for invalid amount', async () => {
      mockReq.body = { ...validPaymentData, amount: -100 };

      paymentService.createPaymentIntent.mockRejectedValue(
        new Error('Amount must be a positive number')
      );

      await paymentController.createPaymentIntent(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('Amount') })
      );
    });

    it('should return 400 for invalid currency', async () => {
      mockReq.body = { ...validPaymentData, currency: 'INVALID' };

      paymentService.createPaymentIntent.mockRejectedValue(
        new Error('Invalid currency code')
      );

      await paymentController.createPaymentIntent(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('currency') })
      );
    });

    it('should handle service errors gracefully', async () => {
      mockReq.body = validPaymentData;

      paymentService.createPaymentIntent.mockRejectedValue(
        new Error('Failed to create payment intent')
      );

      await paymentController.createPaymentIntent(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('confirmPayment', () => {
    it('should confirm a payment successfully', async () => {
      mockReq.params.id = 'pay-123';
      const confirmedPayment = {
        paymentId: 'pay-123',
        status: 'processing'
      };

      paymentService.confirmPayment.mockResolvedValue(confirmedPayment);

      await paymentController.confirmPayment(mockReq, mockRes, mockNext);

      expect(paymentService.confirmPayment).toHaveBeenCalledWith('pay-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(confirmedPayment);
    });

    it('should return 400 for missing payment ID', async () => {
      mockReq.params.id = undefined;

      await paymentController.confirmPayment(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('Payment ID') })
      );
    });

    it('should return 404 for non-existent payment', async () => {
      mockReq.params.id = 'non-existent';

      paymentService.confirmPayment.mockRejectedValue(new Error('Payment not found'));

      await paymentController.confirmPayment(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 for invalid payment status', async () => {
      mockReq.params.id = 'pay-123';

      paymentService.confirmPayment.mockRejectedValue(
        new Error('Payment is not in pending status')
      );

      await paymentController.confirmPayment(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('processPayment', () => {
    it('should process a payment successfully', async () => {
      mockReq.params.id = 'pay-123';
      const processedPayment = {
        paymentId: 'pay-123',
        status: 'succeeded'
      };

      paymentService.processPayment.mockResolvedValue(processedPayment);

      await paymentController.processPayment(mockReq, mockRes, mockNext);

      expect(paymentService.processPayment).toHaveBeenCalledWith('pay-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(processedPayment);
    });

    it('should return 400 for missing payment ID', async () => {
      mockReq.params.id = undefined;

      await paymentController.processPayment(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 for non-existent payment', async () => {
      mockReq.params.id = 'non-existent';

      paymentService.processPayment.mockRejectedValue(new Error('Payment not found'));

      await paymentController.processPayment(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('refundPayment', () => {
    it('should refund a payment successfully', async () => {
      mockReq.params.id = 'pay-123';
      mockReq.body = { amount: 5000, reason: 'Customer request' };

      const refundResult = {
        refundId: 're-123',
        paymentId: 'pay-123',
        refundAmount: 5000
      };

      paymentService.refundPayment.mockResolvedValue(refundResult);

      await paymentController.refundPayment(mockReq, mockRes, mockNext);

      expect(paymentService.refundPayment).toHaveBeenCalledWith('pay-123', {
        amount: 5000,
        reason: 'Customer request'
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(refundResult);
    });

    it('should process full refund when no amount specified', async () => {
      mockReq.params.id = 'pay-123';
      mockReq.body = {};

      const refundResult = {
        refundId: 're-123',
        paymentId: 'pay-123',
        refundAmount: 10000
      };

      paymentService.refundPayment.mockResolvedValue(refundResult);

      await paymentController.refundPayment(mockReq, mockRes, mockNext);

      expect(paymentService.refundPayment).toHaveBeenCalledWith('pay-123', {});
    });

    it('should return 400 for refund exceeding amount', async () => {
      mockReq.params.id = 'pay-123';
      mockReq.body = { amount: 20000 };

      paymentService.refundPayment.mockRejectedValue(
        new Error('Refund amount exceeds available amount')
      );

      await paymentController.refundPayment(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for non-succeeded payment', async () => {
      mockReq.params.id = 'pay-123';
      mockReq.body = {};

      paymentService.refundPayment.mockRejectedValue(
        new Error('Only succeeded payments can be refunded')
      );

      await paymentController.refundPayment(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getPayment', () => {
    it('should get a payment by ID', async () => {
      mockReq.params.id = 'pay-123';
      const mockPayment = {
        paymentId: 'pay-123',
        amount: 10000,
        status: 'succeeded'
      };

      paymentService.getPaymentById.mockResolvedValue(mockPayment);

      await paymentController.getPayment(mockReq, mockRes, mockNext);

      expect(paymentService.getPaymentById).toHaveBeenCalledWith('pay-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockPayment);
    });

    it('should return 400 for missing payment ID', async () => {
      mockReq.params.id = undefined;

      await paymentController.getPayment(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 for non-existent payment', async () => {
      mockReq.params.id = 'non-existent';

      paymentService.getPaymentById.mockRejectedValue(new Error('Payment not found'));

      await paymentController.getPayment(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getPaymentHistory', () => {
    const mockPayments = [
      { paymentId: 'pay-1', amount: 10000, status: 'succeeded' },
      { paymentId: 'pay-2', amount: 5000, status: 'succeeded' }
    ];

    it('should get payment history with pagination', async () => {
      mockReq.query = { customerId: 'customer-456', page: 1, limit: 10 };

      paymentService.getPaymentHistory.mockResolvedValue({
        payments: mockPayments,
        totalCount: 2,
        currentPage: 1,
        totalPages: 1
      });

      await paymentController.getPaymentHistory(mockReq, mockRes, mockNext);

      expect(paymentService.getPaymentHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'customer-456',
          page: 1,
          limit: 10
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should filter by status', async () => {
      mockReq.query = { customerId: 'customer-456', status: 'succeeded' };

      paymentService.getPaymentHistory.mockResolvedValue({
        payments: mockPayments,
        totalCount: 2
      });

      await paymentController.getPaymentHistory(mockReq, mockRes, mockNext);

      expect(paymentService.getPaymentHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'succeeded'
        })
      );
    });

    it('should filter by date range', async () => {
      mockReq.query = {
        customerId: 'customer-456',
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      };

      paymentService.getPaymentHistory.mockResolvedValue({
        payments: mockPayments,
        totalCount: 2
      });

      await paymentController.getPaymentHistory(mockReq, mockRes, mockNext);

      expect(paymentService.getPaymentHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        })
      );
    });

    it('should return 400 for missing customerId', async () => {
      mockReq.query = {};

      await paymentController.getPaymentHistory(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('customerId') })
      );
    });
  });

  describe('addPaymentMethod', () => {
    const validMethodData = {
      type: 'card',
      last4: '4242',
      brand: 'visa',
      expiryMonth: 12,
      expiryYear: 2028
    };

    it('should add a payment method successfully', async () => {
      mockReq.params.customerId = 'customer-456';
      mockReq.body = validMethodData;

      const createdMethod = {
        methodId: 'pm-123',
        customerId: 'customer-456',
        ...validMethodData,
        isDefault: true
      };

      paymentService.addPaymentMethod.mockResolvedValue(createdMethod);

      await paymentController.addPaymentMethod(mockReq, mockRes, mockNext);

      expect(paymentService.addPaymentMethod).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'customer-456',
          type: 'card',
          last4: '4242'
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 for missing customer ID', async () => {
      mockReq.params.customerId = undefined;
      mockReq.body = validMethodData;

      await paymentController.addPaymentMethod(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid card type', async () => {
      mockReq.params.customerId = 'customer-456';
      mockReq.body = { ...validMethodData, type: 'invalid' };

      paymentService.addPaymentMethod.mockRejectedValue(
        new Error('Invalid payment method type')
      );

      await paymentController.addPaymentMethod(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for expired card', async () => {
      mockReq.params.customerId = 'customer-456';
      mockReq.body = { ...validMethodData, expiryYear: 2020 };

      paymentService.addPaymentMethod.mockRejectedValue(new Error('Card is expired'));

      await paymentController.addPaymentMethod(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('removePaymentMethod', () => {
    it('should remove a payment method successfully', async () => {
      mockReq.params.customerId = 'customer-456';
      mockReq.params.methodId = 'pm-123';

      paymentService.removePaymentMethod.mockResolvedValue({
        success: true,
        methodId: 'pm-123'
      });

      await paymentController.removePaymentMethod(mockReq, mockRes, mockNext);

      expect(paymentService.removePaymentMethod).toHaveBeenCalledWith(
        'pm-123',
        'customer-456'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for missing customer ID', async () => {
      mockReq.params.customerId = undefined;
      mockReq.params.methodId = 'pm-123';

      await paymentController.removePaymentMethod(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 for non-existent payment method', async () => {
      mockReq.params.customerId = 'customer-456';
      mockReq.params.methodId = 'non-existent';

      paymentService.removePaymentMethod.mockRejectedValue(
        new Error('Payment method not found')
      );

      await paymentController.removePaymentMethod(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getPaymentMethods', () => {
    const mockMethods = [
      { methodId: 'pm-1', type: 'card', last4: '4242', isDefault: true },
      { methodId: 'pm-2', type: 'card', last4: '1234', isDefault: false }
    ];

    it('should get all payment methods for a customer', async () => {
      mockReq.params.customerId = 'customer-456';

      paymentService.getPaymentMethods.mockResolvedValue(mockMethods);

      await paymentController.getPaymentMethods(mockReq, mockRes, mockNext);

      expect(paymentService.getPaymentMethods).toHaveBeenCalledWith(
        'customer-456',
        {}
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockMethods);
    });

    it('should filter by type', async () => {
      mockReq.params.customerId = 'customer-456';
      mockReq.query = { type: 'card' };

      paymentService.getPaymentMethods.mockResolvedValue(mockMethods);

      await paymentController.getPaymentMethods(mockReq, mockRes, mockNext);

      expect(paymentService.getPaymentMethods).toHaveBeenCalledWith(
        'customer-456',
        { type: 'card' }
      );
    });

    it('should return 400 for missing customer ID', async () => {
      mockReq.params.customerId = undefined;

      await paymentController.getPaymentMethods(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('setDefaultPaymentMethod', () => {
    it('should set payment method as default', async () => {
      mockReq.params.customerId = 'customer-456';
      mockReq.params.methodId = 'pm-123';

      paymentService.setDefaultPaymentMethod.mockResolvedValue({
        methodId: 'pm-123',
        isDefault: true
      });

      await paymentController.setDefaultPaymentMethod(mockReq, mockRes, mockNext);

      expect(paymentService.setDefaultPaymentMethod).toHaveBeenCalledWith(
        'pm-123',
        'customer-456'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 for non-existent payment method', async () => {
      mockReq.params.customerId = 'customer-456';
      mockReq.params.methodId = 'non-existent';

      paymentService.setDefaultPaymentMethod.mockRejectedValue(
        new Error('Payment method not found')
      );

      await paymentController.setDefaultPaymentMethod(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('handleWebhook', () => {
    it('should handle payment_intent.succeeded webhook', async () => {
      mockReq.body = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123'
          }
        }
      };

      paymentService.handleWebhook.mockResolvedValue({
        handled: true,
        paymentId: 'pay-123',
        status: 'succeeded'
      });

      await paymentController.handleWebhook(mockReq, mockRes, mockNext);

      expect(paymentService.handleWebhook).toHaveBeenCalledWith(mockReq.body);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle payment_intent.payment_failed webhook', async () => {
      mockReq.body = {
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test_123',
            last_payment_error: { message: 'Card declined' }
          }
        }
      };

      paymentService.handleWebhook.mockResolvedValue({
        handled: true,
        paymentId: 'pay-123',
        status: 'failed'
      });

      await paymentController.handleWebhook(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 200 for unhandled webhook events', async () => {
      mockReq.body = {
        type: 'unknown.event',
        data: { object: {} }
      };

      paymentService.handleWebhook.mockResolvedValue({
        handled: false,
        message: 'Event type not handled'
      });

      await paymentController.handleWebhook(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle service errors gracefully', async () => {
      mockReq.body = {
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test_123' } }
      };

      paymentService.handleWebhook.mockRejectedValue(new Error('Service error'));

      await paymentController.handleWebhook(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors with 400', async () => {
      mockReq.body = { amount: 'invalid' };

      paymentService.createPaymentIntent.mockRejectedValue(
        new Error('Amount must be a positive number')
      );

      await paymentController.createPaymentIntent(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle not found errors with 404', async () => {
      mockReq.params.id = 'non-existent';

      paymentService.getPaymentById.mockRejectedValue(new Error('Payment not found'));

      await paymentController.getPayment(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should handle unexpected errors with 500', async () => {
      mockReq.body = {};

      paymentService.createPaymentIntent.mockRejectedValue(
        new Error('Database connection failed')
      );

      await paymentController.createPaymentIntent(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});

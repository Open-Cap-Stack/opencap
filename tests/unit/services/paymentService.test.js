/**
 * Payment Service Tests
 * Feature: Issue #116 - Integrate Payment Processing
 * TDD Red Phase: Tests written before implementation
 */

const paymentService = require('../../../services/paymentService');
const zerodbService = require('../../../services/zerodbService');

// Mock ZeroDB service
jest.mock('../../../services/zerodbService');

describe('PaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset ZeroDB mock
    zerodbService.queryTable = jest.fn();
    zerodbService.insertRow = jest.fn();
    zerodbService.updateRows = jest.fn();
    zerodbService.deleteRows = jest.fn();
    zerodbService.countRows = jest.fn();
  });

  describe('createPaymentIntent', () => {
    const validPaymentData = {
      companyId: 'company-123',
      customerId: 'customer-456',
      amount: 10000, // $100.00 in cents
      currency: 'USD',
      paymentMethod: 'card',
      description: 'Test payment'
    };

    it('should create a payment intent successfully', async () => {
      const mockPayment = {
        paymentId: expect.any(String),
        ...validPaymentData,
        status: 'pending',
        stripePaymentIntentId: expect.any(String)
      };

      zerodbService.insertRow.mockResolvedValue({ rows: [mockPayment] });

      const result = await paymentService.createPaymentIntent(validPaymentData);

      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'payments',
        expect.objectContaining({
          companyId: 'company-123',
          customerId: 'customer-456',
          amount: 10000,
          currency: 'USD',
          status: 'pending'
        })
      );
      expect(result.status).toBe('pending');
      expect(result.paymentId).toBeDefined();
    });

    it('should throw error for missing required fields', async () => {
      const invalidData = { amount: 10000 };

      await expect(paymentService.createPaymentIntent(invalidData))
        .rejects.toThrow('companyId is required');
    });

    it('should throw error for invalid amount', async () => {
      const invalidData = {
        ...validPaymentData,
        amount: -100
      };

      await expect(paymentService.createPaymentIntent(invalidData))
        .rejects.toThrow('Amount must be a positive number');
    });

    it('should throw error for invalid currency', async () => {
      const invalidData = {
        ...validPaymentData,
        currency: 'INVALID'
      };

      await expect(paymentService.createPaymentIntent(invalidData))
        .rejects.toThrow('Invalid currency code');
    });

    it('should generate unique payment ID', async () => {
      zerodbService.insertRow.mockResolvedValue({ rows: [{}] });

      const result1 = await paymentService.createPaymentIntent(validPaymentData);
      const result2 = await paymentService.createPaymentIntent(validPaymentData);

      expect(result1.paymentId).not.toBe(result2.paymentId);
    });

    it('should handle ZeroDB errors gracefully', async () => {
      zerodbService.insertRow.mockRejectedValue(new Error('Database error'));

      await expect(paymentService.createPaymentIntent(validPaymentData))
        .rejects.toThrow('Failed to create payment intent');
    });
  });

  describe('confirmPayment', () => {
    it('should confirm a pending payment successfully', async () => {
      const pendingPayment = {
        paymentId: 'pay-123',
        status: 'pending',
        amount: 10000
      };

      const confirmedPayment = {
        ...pendingPayment,
        status: 'succeeded'
      };

      zerodbService.queryTable.mockResolvedValue([pendingPayment]);
      zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });

      const result = await paymentService.confirmPayment('pay-123');

      expect(zerodbService.updateRows).toHaveBeenCalledWith(
        'payments',
        { paymentId: 'pay-123' },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'processing'
          })
        })
      );
      expect(result.status).toBe('processing');
    });

    it('should throw error for non-existent payment', async () => {
      zerodbService.queryTable.mockResolvedValue([]);

      await expect(paymentService.confirmPayment('non-existent'))
        .rejects.toThrow('Payment not found');
    });

    it('should throw error for already processed payment', async () => {
      const processedPayment = {
        paymentId: 'pay-123',
        status: 'succeeded'
      };

      zerodbService.queryTable.mockResolvedValue([processedPayment]);

      await expect(paymentService.confirmPayment('pay-123'))
        .rejects.toThrow('Payment is not in pending status');
    });

    it('should simulate Stripe payment confirmation', async () => {
      const pendingPayment = {
        paymentId: 'pay-123',
        status: 'pending',
        stripePaymentIntentId: 'pi_test_123'
      };

      zerodbService.queryTable
        .mockResolvedValueOnce([pendingPayment])
        .mockResolvedValueOnce([{ ...pendingPayment, status: 'processing' }]);
      zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });

      const result = await paymentService.confirmPayment('pay-123');

      expect(result.stripePaymentIntentId).toBe('pi_test_123');
    });
  });

  describe('refundPayment', () => {
    const succeededPayment = {
      paymentId: 'pay-123',
      status: 'succeeded',
      amount: 10000,
      refundedAmount: 0,
      currency: 'USD',
      companyId: 'company-123',
      customerId: 'customer-456'
    };

    it('should process full refund successfully', async () => {
      zerodbService.queryTable.mockResolvedValue([succeededPayment]);
      zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });
      zerodbService.insertRow.mockResolvedValue({ rows: [{}] });

      const result = await paymentService.refundPayment('pay-123');

      expect(zerodbService.updateRows).toHaveBeenCalledWith(
        'payments',
        { paymentId: 'pay-123' },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'refunded',
            refundedAmount: 10000
          })
        })
      );
      expect(result.refundAmount).toBe(10000);
    });

    it('should process partial refund successfully', async () => {
      zerodbService.queryTable.mockResolvedValue([succeededPayment]);
      zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });
      zerodbService.insertRow.mockResolvedValue({ rows: [{}] });

      const result = await paymentService.refundPayment('pay-123', { amount: 5000 });

      expect(result.refundAmount).toBe(5000);
    });

    it('should throw error for refund amount exceeding payment', async () => {
      zerodbService.queryTable.mockResolvedValue([succeededPayment]);

      await expect(paymentService.refundPayment('pay-123', { amount: 20000 }))
        .rejects.toThrow('Refund amount exceeds available amount');
    });

    it('should throw error for non-succeeded payment', async () => {
      const pendingPayment = { ...succeededPayment, status: 'pending' };
      zerodbService.queryTable.mockResolvedValue([pendingPayment]);

      await expect(paymentService.refundPayment('pay-123'))
        .rejects.toThrow('Only succeeded payments can be refunded');
    });

    it('should throw error for already fully refunded payment', async () => {
      const refundedPayment = {
        ...succeededPayment,
        status: 'refunded',
        refundedAmount: 10000
      };
      zerodbService.queryTable.mockResolvedValue([refundedPayment]);

      await expect(paymentService.refundPayment('pay-123'))
        .rejects.toThrow('Payment has already been fully refunded');
    });

    it('should create refund record', async () => {
      zerodbService.queryTable.mockResolvedValue([succeededPayment]);
      zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });
      zerodbService.insertRow.mockResolvedValue({ rows: [{}] });

      await paymentService.refundPayment('pay-123', { reason: 'Customer request' });

      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'refunds',
        expect.objectContaining({
          paymentId: 'pay-123',
          reason: 'Customer request'
        })
      );
    });
  });

  describe('addPaymentMethod', () => {
    const validMethodData = {
      customerId: 'customer-456',
      type: 'card',
      last4: '4242',
      brand: 'visa',
      expiryMonth: 12,
      expiryYear: 2028
    };

    it('should add payment method successfully', async () => {
      zerodbService.insertRow.mockResolvedValue({ rows: [validMethodData] });
      zerodbService.queryTable.mockResolvedValue([]);

      const result = await paymentService.addPaymentMethod(validMethodData);

      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'payment_methods',
        expect.objectContaining({
          customerId: 'customer-456',
          type: 'card',
          last4: '4242'
        })
      );
      expect(result.methodId).toBeDefined();
    });

    it('should set first payment method as default', async () => {
      zerodbService.queryTable.mockResolvedValue([]); // No existing methods
      zerodbService.insertRow.mockResolvedValue({ rows: [{ isDefault: true }] });

      const result = await paymentService.addPaymentMethod(validMethodData);

      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'payment_methods',
        expect.objectContaining({
          isDefault: true
        })
      );
    });

    it('should not set as default if other methods exist', async () => {
      zerodbService.queryTable.mockResolvedValue([{ methodId: 'existing-method' }]);
      zerodbService.insertRow.mockResolvedValue({ rows: [{ isDefault: false }] });

      const result = await paymentService.addPaymentMethod(validMethodData);

      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'payment_methods',
        expect.objectContaining({
          isDefault: false
        })
      );
    });

    it('should throw error for invalid card type', async () => {
      const invalidData = { ...validMethodData, type: 'invalid' };

      await expect(paymentService.addPaymentMethod(invalidData))
        .rejects.toThrow('Invalid payment method type');
    });

    it('should throw error for expired card', async () => {
      const expiredCard = {
        ...validMethodData,
        expiryMonth: 1,
        expiryYear: 2020
      };

      await expect(paymentService.addPaymentMethod(expiredCard))
        .rejects.toThrow('Card is expired');
    });

    it('should validate last4 format', async () => {
      const invalidLast4 = { ...validMethodData, last4: '123' };

      await expect(paymentService.addPaymentMethod(invalidLast4))
        .rejects.toThrow('last4 must be exactly 4 digits');
    });
  });

  describe('removePaymentMethod', () => {
    it('should remove payment method successfully', async () => {
      const existingMethod = {
        methodId: 'pm-123',
        customerId: 'customer-456',
        isDefault: false
      };

      zerodbService.queryTable.mockResolvedValue([existingMethod]);
      zerodbService.deleteRows.mockResolvedValue({ deletedCount: 1 });

      const result = await paymentService.removePaymentMethod('pm-123', 'customer-456');

      expect(zerodbService.deleteRows).toHaveBeenCalledWith(
        'payment_methods',
        { methodId: 'pm-123', customerId: 'customer-456' }
      );
      expect(result.success).toBe(true);
    });

    it('should throw error for non-existent payment method', async () => {
      zerodbService.queryTable.mockResolvedValue([]);

      await expect(paymentService.removePaymentMethod('non-existent', 'customer-456'))
        .rejects.toThrow('Payment method not found');
    });

    it('should set another method as default when removing default', async () => {
      const defaultMethod = {
        methodId: 'pm-123',
        customerId: 'customer-456',
        isDefault: true
      };
      const otherMethod = {
        methodId: 'pm-456',
        customerId: 'customer-456',
        isDefault: false
      };

      zerodbService.queryTable
        .mockResolvedValueOnce([defaultMethod])
        .mockResolvedValueOnce([otherMethod]);
      zerodbService.deleteRows.mockResolvedValue({ deletedCount: 1 });
      zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });

      await paymentService.removePaymentMethod('pm-123', 'customer-456');

      expect(zerodbService.updateRows).toHaveBeenCalledWith(
        'payment_methods',
        { methodId: 'pm-456' },
        expect.objectContaining({
          $set: { isDefault: true }
        })
      );
    });
  });

  describe('getPaymentHistory', () => {
    const mockPayments = [
      { paymentId: 'pay-1', amount: 10000, status: 'succeeded', createdAt: '2024-01-15' },
      { paymentId: 'pay-2', amount: 5000, status: 'succeeded', createdAt: '2024-01-10' }
    ];

    it('should get payment history for a customer', async () => {
      zerodbService.queryTable.mockResolvedValue(mockPayments);
      zerodbService.countRows.mockResolvedValue(2);

      const result = await paymentService.getPaymentHistory({
        customerId: 'customer-456'
      });

      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'payments',
        expect.objectContaining({
          filter: { customerId: 'customer-456' }
        })
      );
      expect(result.payments).toHaveLength(2);
      expect(result.totalCount).toBe(2);
    });

    it('should filter by date range', async () => {
      zerodbService.queryTable.mockResolvedValue(mockPayments);
      zerodbService.countRows.mockResolvedValue(2);

      await paymentService.getPaymentHistory({
        customerId: 'customer-456',
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });

      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'payments',
        expect.objectContaining({
          filter: expect.objectContaining({
            createdAt: expect.any(Object)
          })
        })
      );
    });

    it('should filter by status', async () => {
      zerodbService.queryTable.mockResolvedValue(mockPayments);
      zerodbService.countRows.mockResolvedValue(2);

      await paymentService.getPaymentHistory({
        customerId: 'customer-456',
        status: 'succeeded'
      });

      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'payments',
        expect.objectContaining({
          filter: expect.objectContaining({
            status: 'succeeded'
          })
        })
      );
    });

    it('should paginate results', async () => {
      zerodbService.queryTable.mockResolvedValue(mockPayments);
      zerodbService.countRows.mockResolvedValue(50);

      const result = await paymentService.getPaymentHistory({
        customerId: 'customer-456',
        page: 2,
        limit: 10
      });

      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'payments',
        expect.objectContaining({
          skip: 10,
          limit: 10
        })
      );
      expect(result.currentPage).toBe(2);
      expect(result.totalPages).toBe(5);
    });

    it('should sort by date descending by default', async () => {
      zerodbService.queryTable.mockResolvedValue(mockPayments);
      zerodbService.countRows.mockResolvedValue(2);

      await paymentService.getPaymentHistory({
        customerId: 'customer-456'
      });

      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'payments',
        expect.objectContaining({
          sort: { createdAt: -1 }
        })
      );
    });
  });

  describe('handleWebhook', () => {
    it('should handle payment_intent.succeeded event', async () => {
      const webhookEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            status: 'succeeded',
            amount: 10000
          }
        }
      };

      const existingPayment = {
        paymentId: 'pay-123',
        stripePaymentIntentId: 'pi_test_123',
        status: 'processing'
      };

      zerodbService.queryTable.mockResolvedValue([existingPayment]);
      zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });

      const result = await paymentService.handleWebhook(webhookEvent);

      expect(zerodbService.updateRows).toHaveBeenCalledWith(
        'payments',
        { stripePaymentIntentId: 'pi_test_123' },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'succeeded'
          })
        })
      );
      expect(result.handled).toBe(true);
    });

    it('should handle payment_intent.payment_failed event', async () => {
      const webhookEvent = {
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test_123',
            status: 'failed',
            last_payment_error: {
              message: 'Card declined'
            }
          }
        }
      };

      const existingPayment = {
        paymentId: 'pay-123',
        stripePaymentIntentId: 'pi_test_123',
        status: 'processing'
      };

      zerodbService.queryTable.mockResolvedValue([existingPayment]);
      zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });

      const result = await paymentService.handleWebhook(webhookEvent);

      expect(zerodbService.updateRows).toHaveBeenCalledWith(
        'payments',
        { stripePaymentIntentId: 'pi_test_123' },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'failed',
            failureReason: 'Card declined'
          })
        })
      );
    });

    it('should handle charge.refunded event', async () => {
      const webhookEvent = {
        type: 'charge.refunded',
        data: {
          object: {
            payment_intent: 'pi_test_123',
            amount_refunded: 5000
          }
        }
      };

      const existingPayment = {
        paymentId: 'pay-123',
        stripePaymentIntentId: 'pi_test_123',
        status: 'succeeded',
        amount: 10000,
        refundedAmount: 0
      };

      zerodbService.queryTable.mockResolvedValue([existingPayment]);
      zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });

      const result = await paymentService.handleWebhook(webhookEvent);

      expect(zerodbService.updateRows).toHaveBeenCalled();
    });

    it('should ignore unknown webhook events', async () => {
      const webhookEvent = {
        type: 'unknown.event',
        data: { object: {} }
      };

      const result = await paymentService.handleWebhook(webhookEvent);

      expect(result.handled).toBe(false);
      expect(result.message).toBe('Event type not handled');
    });

    it('should handle missing payment gracefully', async () => {
      const webhookEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_non_existent'
          }
        }
      };

      zerodbService.queryTable.mockResolvedValue([]);

      const result = await paymentService.handleWebhook(webhookEvent);

      expect(result.handled).toBe(false);
      expect(result.message).toBe('Payment not found');
    });
  });

  describe('getPaymentById', () => {
    it('should get payment by ID', async () => {
      const mockPayment = {
        paymentId: 'pay-123',
        amount: 10000,
        status: 'succeeded'
      };

      zerodbService.queryTable.mockResolvedValue([mockPayment]);

      const result = await paymentService.getPaymentById('pay-123');

      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'payments',
        expect.objectContaining({
          filter: { paymentId: 'pay-123' }
        })
      );
      expect(result.paymentId).toBe('pay-123');
    });

    it('should throw error for non-existent payment', async () => {
      zerodbService.queryTable.mockResolvedValue([]);

      await expect(paymentService.getPaymentById('non-existent'))
        .rejects.toThrow('Payment not found');
    });
  });

  describe('getPaymentMethods', () => {
    const mockMethods = [
      { methodId: 'pm-1', type: 'card', last4: '4242', isDefault: true },
      { methodId: 'pm-2', type: 'card', last4: '1234', isDefault: false }
    ];

    it('should get all payment methods for a customer', async () => {
      zerodbService.queryTable.mockResolvedValue(mockMethods);

      const result = await paymentService.getPaymentMethods('customer-456');

      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'payment_methods',
        expect.objectContaining({
          filter: { customerId: 'customer-456', status: 'active' }
        })
      );
      expect(result).toHaveLength(2);
    });

    it('should filter by type', async () => {
      zerodbService.queryTable.mockResolvedValue(mockMethods);

      await paymentService.getPaymentMethods('customer-456', { type: 'card' });

      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'payment_methods',
        expect.objectContaining({
          filter: expect.objectContaining({ type: 'card' })
        })
      );
    });
  });

  describe('setDefaultPaymentMethod', () => {
    it('should set payment method as default', async () => {
      const method = {
        methodId: 'pm-123',
        customerId: 'customer-456',
        isDefault: false
      };

      zerodbService.queryTable.mockResolvedValue([method]);
      zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });

      const result = await paymentService.setDefaultPaymentMethod('pm-123', 'customer-456');

      // Should unset all other defaults first
      expect(zerodbService.updateRows).toHaveBeenCalledWith(
        'payment_methods',
        { customerId: 'customer-456', isDefault: true },
        expect.objectContaining({
          $set: { isDefault: false }
        })
      );

      // Should set the new default
      expect(zerodbService.updateRows).toHaveBeenCalledWith(
        'payment_methods',
        { methodId: 'pm-123' },
        expect.objectContaining({
          $set: { isDefault: true }
        })
      );

      expect(result.isDefault).toBe(true);
    });

    it('should throw error for non-existent payment method', async () => {
      zerodbService.queryTable.mockResolvedValue([]);

      await expect(paymentService.setDefaultPaymentMethod('non-existent', 'customer-456'))
        .rejects.toThrow('Payment method not found');
    });
  });

  describe('processPayment', () => {
    it('should process payment end-to-end', async () => {
      const processingPayment = {
        paymentId: 'pay-123',
        status: 'processing',
        amount: 10000
      };

      zerodbService.queryTable
        .mockResolvedValueOnce([processingPayment])
        .mockResolvedValueOnce([{ ...processingPayment, status: 'succeeded' }]);
      zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });

      const result = await paymentService.processPayment('pay-123');

      expect(result.status).toBe('succeeded');
    });

    it('should handle payment processing failure', async () => {
      const processingPayment = {
        paymentId: 'pay-123',
        status: 'processing',
        amount: 10000
      };

      zerodbService.queryTable.mockResolvedValue([processingPayment]);
      zerodbService.updateRows.mockRejectedValue(new Error('Processing failed'));

      await expect(paymentService.processPayment('pay-123'))
        .rejects.toThrow('Payment processing failed');
    });
  });
});

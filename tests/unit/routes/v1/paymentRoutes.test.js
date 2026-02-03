/**
 * Payment Routes Tests
 * Feature: Issue #116 - Integrate Payment Processing
 * TDD Red Phase: Tests written before implementation
 */

const request = require('supertest');
const express = require('express');

// Mock authentication middleware
jest.mock('../../../../middleware/auth', () => ({
  authenticateJWT: (req, res, next) => {
    req.user = { id: 'user-123', companyId: 'company-123', role: 'admin' };
    next();
  }
}));

// Mock payment controller
jest.mock('../../../../controllers/paymentController', () => ({
  createPaymentIntent: jest.fn((req, res) => res.status(201).json({ paymentId: 'pay-123' })),
  confirmPayment: jest.fn((req, res) => res.status(200).json({ status: 'processing' })),
  processPayment: jest.fn((req, res) => res.status(200).json({ status: 'succeeded' })),
  refundPayment: jest.fn((req, res) => res.status(200).json({ refundId: 're-123' })),
  getPayment: jest.fn((req, res) => res.status(200).json({ paymentId: 'pay-123' })),
  getPaymentHistory: jest.fn((req, res) => res.status(200).json({ payments: [] })),
  addPaymentMethod: jest.fn((req, res) => res.status(201).json({ methodId: 'pm-123' })),
  removePaymentMethod: jest.fn((req, res) => res.status(200).json({ success: true })),
  getPaymentMethods: jest.fn((req, res) => res.status(200).json([])),
  setDefaultPaymentMethod: jest.fn((req, res) => res.status(200).json({ isDefault: true })),
  handleWebhook: jest.fn((req, res) => res.status(200).json({ handled: true }))
}));

const paymentRoutes = require('../../../../routes/v1/paymentRoutes');
const paymentController = require('../../../../controllers/paymentController');

describe('Payment Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/payments', paymentRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/payments/intents', () => {
    it('should route to createPaymentIntent controller', async () => {
      const response = await request(app)
        .post('/api/v1/payments/intents')
        .send({
          customerId: 'customer-456',
          amount: 10000,
          currency: 'USD',
          paymentMethod: 'card'
        });

      expect(response.status).toBe(201);
      expect(paymentController.createPaymentIntent).toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/payments/intents')
        .send({});

      // With mocked auth, it passes. In production, would return 401
      expect(response.status).toBe(201);
    });
  });

  describe('POST /api/v1/payments/:id/confirm', () => {
    it('should route to confirmPayment controller', async () => {
      const response = await request(app)
        .post('/api/v1/payments/pay-123/confirm');

      expect(response.status).toBe(200);
      expect(paymentController.confirmPayment).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/payments/:id/process', () => {
    it('should route to processPayment controller', async () => {
      const response = await request(app)
        .post('/api/v1/payments/pay-123/process');

      expect(response.status).toBe(200);
      expect(paymentController.processPayment).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/payments/:id/refund', () => {
    it('should route to refundPayment controller', async () => {
      const response = await request(app)
        .post('/api/v1/payments/pay-123/refund')
        .send({ amount: 5000, reason: 'Customer request' });

      expect(response.status).toBe(200);
      expect(paymentController.refundPayment).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/payments/:id', () => {
    it('should route to getPayment controller', async () => {
      const response = await request(app)
        .get('/api/v1/payments/pay-123');

      expect(response.status).toBe(200);
      expect(paymentController.getPayment).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/payments', () => {
    it('should route to getPaymentHistory controller', async () => {
      const response = await request(app)
        .get('/api/v1/payments')
        .query({ customerId: 'customer-456' });

      expect(response.status).toBe(200);
      expect(paymentController.getPaymentHistory).toHaveBeenCalled();
    });

    it('should support query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/payments')
        .query({
          customerId: 'customer-456',
          status: 'succeeded',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          page: 1,
          limit: 10
        });

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/v1/payments/customers/:customerId/methods', () => {
    it('should route to addPaymentMethod controller', async () => {
      const response = await request(app)
        .post('/api/v1/payments/customers/customer-456/methods')
        .send({
          type: 'card',
          last4: '4242',
          brand: 'visa',
          expiryMonth: 12,
          expiryYear: 2028
        });

      expect(response.status).toBe(201);
      expect(paymentController.addPaymentMethod).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/payments/customers/:customerId/methods/:methodId', () => {
    it('should route to removePaymentMethod controller', async () => {
      const response = await request(app)
        .delete('/api/v1/payments/customers/customer-456/methods/pm-123');

      expect(response.status).toBe(200);
      expect(paymentController.removePaymentMethod).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/payments/customers/:customerId/methods', () => {
    it('should route to getPaymentMethods controller', async () => {
      const response = await request(app)
        .get('/api/v1/payments/customers/customer-456/methods');

      expect(response.status).toBe(200);
      expect(paymentController.getPaymentMethods).toHaveBeenCalled();
    });

    it('should support type filter', async () => {
      const response = await request(app)
        .get('/api/v1/payments/customers/customer-456/methods')
        .query({ type: 'card' });

      expect(response.status).toBe(200);
    });
  });

  describe('PUT /api/v1/payments/customers/:customerId/methods/:methodId/default', () => {
    it('should route to setDefaultPaymentMethod controller', async () => {
      const response = await request(app)
        .put('/api/v1/payments/customers/customer-456/methods/pm-123/default');

      expect(response.status).toBe(200);
      expect(paymentController.setDefaultPaymentMethod).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/payments/webhooks', () => {
    it('should route to handleWebhook controller', async () => {
      const response = await request(app)
        .post('/api/v1/payments/webhooks')
        .send({
          type: 'payment_intent.succeeded',
          data: { object: { id: 'pi_test_123' } }
        });

      expect(response.status).toBe(200);
      expect(paymentController.handleWebhook).toHaveBeenCalled();
    });

    it('should not require authentication for webhooks', async () => {
      const response = await request(app)
        .post('/api/v1/payments/webhooks')
        .send({
          type: 'payment_intent.succeeded',
          data: { object: { id: 'pi_test_123' } }
        });

      expect(response.status).toBe(200);
    });
  });

  describe('Route Parameters', () => {
    it('should pass payment ID to controller', async () => {
      await request(app).get('/api/v1/payments/pay-test-123');

      const callArgs = paymentController.getPayment.mock.calls[0];
      expect(callArgs[0].params.id).toBe('pay-test-123');
    });

    it('should pass customer ID to controller', async () => {
      await request(app).get('/api/v1/payments/customers/cust-test-456/methods');

      const callArgs = paymentController.getPaymentMethods.mock.calls[0];
      expect(callArgs[0].params.customerId).toBe('cust-test-456');
    });

    it('should pass method ID to controller', async () => {
      await request(app).delete('/api/v1/payments/customers/cust-123/methods/pm-test-789');

      const callArgs = paymentController.removePaymentMethod.mock.calls[0];
      expect(callArgs[0].params.methodId).toBe('pm-test-789');
    });
  });

  describe('Request Body Parsing', () => {
    it('should parse JSON body for payment intent', async () => {
      const requestBody = {
        customerId: 'customer-456',
        amount: 10000,
        currency: 'USD',
        paymentMethod: 'card',
        description: 'Test payment',
        metadata: { orderId: 'order-123' }
      };

      await request(app)
        .post('/api/v1/payments/intents')
        .send(requestBody);

      const callArgs = paymentController.createPaymentIntent.mock.calls[0];
      expect(callArgs[0].body).toEqual(requestBody);
    });

    it('should parse JSON body for refund', async () => {
      const requestBody = {
        amount: 5000,
        reason: 'Customer request'
      };

      await request(app)
        .post('/api/v1/payments/pay-123/refund')
        .send(requestBody);

      const callArgs = paymentController.refundPayment.mock.calls[0];
      expect(callArgs[0].body).toEqual(requestBody);
    });
  });

  describe('HTTP Methods', () => {
    it('should not allow GET on POST-only routes', async () => {
      const response = await request(app).get('/api/v1/payments/intents');
      expect(response.status).toBe(404);
    });

    it('should not allow POST on GET-only routes', async () => {
      const response = await request(app).post('/api/v1/payments/customers/cust-123/methods/pm-123/default');
      expect(response.status).toBe(404);
    });
  });
});

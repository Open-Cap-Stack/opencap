/**
 * Payment Routes
 * Feature: Issue #116 - Integrate Payment Processing
 *
 * API endpoints for payment operations
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../../controllers/paymentController');
const { authenticateJWT } = require('../../middleware/authMiddleware');

/**
 * Payment Intent Routes
 */

/**
 * POST /api/v1/payments/intents
 * Create a new payment intent
 *
 * Body:
 * - customerId: Customer ID (required)
 * - amount: Amount in smallest currency unit (required)
 * - currency: ISO currency code (required)
 * - paymentMethod: Payment method type (required)
 * - description: Payment description (optional)
 * - metadata: Additional metadata (optional)
 * - invoiceId: Associated invoice ID (optional)
 */
router.post('/intents', authenticateJWT, paymentController.createPaymentIntent);

/**
 * POST /api/v1/payments/:id/confirm
 * Confirm a pending payment
 */
router.post('/:id/confirm', authenticateJWT, paymentController.confirmPayment);

/**
 * POST /api/v1/payments/:id/process
 * Process/capture a confirmed payment
 */
router.post('/:id/process', authenticateJWT, paymentController.processPayment);

/**
 * POST /api/v1/payments/:id/refund
 * Refund a payment
 *
 * Body:
 * - amount: Partial refund amount (optional, defaults to full refund)
 * - reason: Refund reason (optional)
 */
router.post('/:id/refund', authenticateJWT, paymentController.refundPayment);

/**
 * GET /api/v1/payments/:id
 * Get a payment by ID
 */
router.get('/:id', authenticateJWT, paymentController.getPayment);

/**
 * GET /api/v1/payments
 * Get payment history
 *
 * Query Parameters:
 * - customerId: Customer ID (required)
 * - companyId: Company ID (optional)
 * - status: Filter by status (optional)
 * - startDate: Filter from date (optional)
 * - endDate: Filter to date (optional)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 100)
 */
router.get('/', authenticateJWT, paymentController.getPaymentHistory);

/**
 * Payment Method Routes
 */

/**
 * POST /api/v1/payments/customers/:customerId/methods
 * Add a payment method for a customer
 *
 * Body:
 * - type: Payment method type (card, bank_account)
 * - last4: Last 4 digits
 * - brand: Card brand (optional)
 * - expiryMonth: Expiry month (optional)
 * - expiryYear: Expiry year (optional)
 * - billingDetails: Billing details (optional)
 * - metadata: Additional metadata (optional)
 */
router.post('/customers/:customerId/methods', authenticateJWT, paymentController.addPaymentMethod);

/**
 * DELETE /api/v1/payments/customers/:customerId/methods/:methodId
 * Remove a payment method
 */
router.delete('/customers/:customerId/methods/:methodId', authenticateJWT, paymentController.removePaymentMethod);

/**
 * GET /api/v1/payments/customers/:customerId/methods
 * Get all payment methods for a customer
 *
 * Query Parameters:
 * - type: Filter by type (optional)
 */
router.get('/customers/:customerId/methods', authenticateJWT, paymentController.getPaymentMethods);

/**
 * PUT /api/v1/payments/customers/:customerId/methods/:methodId/default
 * Set a payment method as default
 */
router.put('/customers/:customerId/methods/:methodId/default', authenticateJWT, paymentController.setDefaultPaymentMethod);

/**
 * Webhook Routes
 */

/**
 * POST /api/v1/payments/webhooks
 * Handle Stripe webhook events
 *
 * Note: This endpoint should NOT require authentication
 * In production, verify webhook signature instead
 */
router.post('/webhooks', paymentController.handleWebhook);

module.exports = router;

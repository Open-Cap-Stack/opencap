/**
 * Billing Routes
 * Issue #201: Enhance Billing Dashboard APIs
 *
 * Express routes for billing endpoints:
 * - Stripe webhook (no auth - uses Stripe signature)
 * - Current plan
 * - Usage metrics
 * - Invoices
 * - Payment methods
 * - Plan changes
 * - Checkout sessions
 * - Setup intents
 */

const express = require('express');
const router = express.Router();
const billingController = require('../../controllers/billingController');
const { authenticateToken } = require('../../middleware/authMiddleware');
const { requireUserNotAgent } = require('../../middleware/rbacMiddleware');

// ============================================================
// Webhook route - NO authentication (uses Stripe signature)
// Must be defined BEFORE router.use(authenticateToken)
// ============================================================

/**
 * @route POST /api/v1/billing/webhook
 * @desc Handle Stripe webhook events
 * @access Public (verified via Stripe signature)
 */
router.post('/webhook', billingController.handleStripeWebhook);

// ============================================================
// Public routes (no authentication required)
// ============================================================

/**
 * @route GET /api/v1/billing/plans
 * @desc Get available subscription plans
 * @access Public
 */
router.get('/plans', billingController.getPlans);

// ============================================================
// All routes below require authentication
// Agents are explicitly blocked from billing endpoints
// ============================================================
router.use(authenticateToken);
router.use(requireUserNotAgent);

/**
 * @route GET /api/v1/billing/current-plan
 * @desc Get current subscription plan details
 * @access Private
 */
router.get('/current-plan', billingController.getCurrentPlan);

/**
 * @route GET /api/v1/billing/usage
 * @desc Get usage metrics against plan limits
 * @access Private
 */
router.get('/usage', billingController.getUsageMetrics);

/**
 * @route GET /api/v1/billing/invoices
 * @desc List invoices with pagination and filtering
 * @access Private
 */
router.get('/invoices', billingController.getInvoices);

/**
 * @route POST /api/v1/billing/invoices
 * @desc Create a new invoice
 * @access Private
 */
router.post('/invoices', billingController.createInvoice);

/**
 * @route GET /api/v1/billing/invoices/:id
 * @desc Get invoice details by ID
 * @access Private
 */
router.get('/invoices/:id', billingController.getInvoiceById);

/**
 * @route PUT /api/v1/billing/invoices/:id
 * @desc Update an invoice
 * @access Private
 */
router.put('/invoices/:id', billingController.updateInvoice);

/**
 * @route GET /api/v1/billing/invoices/:id/download
 * @desc Download invoice as PDF
 * @access Private
 */
router.get('/invoices/:id/download', billingController.downloadInvoice);

/**
 * @route GET /api/v1/billing/payment-methods
 * @desc List payment methods
 * @access Private
 */
router.get('/payment-methods', billingController.getPaymentMethods);

/**
 * @route POST /api/v1/billing/payment-methods
 * @desc Add a new payment method
 * @access Private
 */
router.post('/payment-methods', billingController.addPaymentMethod);

/**
 * @route POST /api/v1/billing/payment-methods/:id/set-default
 * @desc Set a payment method as default
 * @access Private
 */
router.post('/payment-methods/:id/set-default', billingController.setDefaultPaymentMethod);

/**
 * @route DELETE /api/v1/billing/payment-methods/:id
 * @desc Remove a payment method
 * @access Private
 */
router.delete('/payment-methods/:id', billingController.removePaymentMethod);

/**
 * @route POST /api/v1/billing/upgrade
 * @desc Upgrade subscription plan
 * @access Private
 */
router.post('/upgrade', billingController.upgradePlan);

/**
 * @route POST /api/v1/billing/downgrade
 * @desc Downgrade subscription plan (effective at period end)
 * @access Private
 */
router.post('/downgrade', billingController.downgradePlan);

/**
 * @route GET /api/v1/billing/payment-history
 * @desc Get payment history with summary
 * @access Private
 */
router.get('/payment-history', billingController.getPaymentHistory);

/**
 * @route POST /api/v1/billing/checkout-session
 * @desc Create a Stripe Checkout session
 * @access Private
 */
router.post('/checkout-session', billingController.createCheckoutSession);

// Keep legacy endpoint for backward compatibility
router.post('/stripe-checkout', billingController.createCheckoutSession);

/**
 * @route POST /api/v1/billing/verify-session
 * @desc Verify a Stripe Checkout session and activate subscription
 * @access Private
 */
router.post('/verify-session', billingController.verifyCheckoutSession);

/**
 * @route POST /api/v1/billing/cancel
 * @desc Cancel subscription
 * @access Private
 */
router.post('/cancel', billingController.cancelSubscription);

/**
 * @route POST /api/v1/billing/reactivate
 * @desc Reactivate a cancelled subscription
 * @access Private
 */
router.post('/reactivate', billingController.reactivateSubscription);

/**
 * @route POST /api/v1/billing/setup-intent
 * @desc Create a Stripe Setup Intent for payment method collection
 * @access Private
 */
router.post('/setup-intent', billingController.createSetupIntent);

/**
 * @route POST /api/v1/billing/customer-portal
 * @desc Create a Stripe Customer Portal session
 * @access Private
 */
router.post('/customer-portal', billingController.createCustomerPortalSession);

/**
 * @route GET /api/v1/billing/checkout-session/:sessionId
 * @desc Get checkout session details for success page
 * @access Private
 */
router.get('/checkout-session/:sessionId', billingController.getCheckoutSession);

module.exports = router;

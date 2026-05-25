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
const { requireUserNotAgent, hasRole } = require('../../middleware/rbacMiddleware');

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
router.get('/current-plan', hasRole(['super_admin', 'admin', 'founder', 'accountant']), billingController.getCurrentPlan);

/**
 * @route GET /api/v1/billing/usage
 * @desc Get usage metrics against plan limits
 * @access Private
 */
router.get('/usage', hasRole(['super_admin', 'admin', 'founder', 'accountant']), billingController.getUsageMetrics);

/**
 * @route GET /api/v1/billing/invoices
 * @desc List invoices with pagination and filtering
 * @access Private
 */
router.get('/invoices', hasRole(['super_admin', 'admin', 'founder', 'accountant']), billingController.getInvoices);

/**
 * @route POST /api/v1/billing/invoices
 * @desc Create a new invoice
 * @access Private
 */
router.post('/invoices', hasRole(['super_admin', 'admin', 'founder', 'accountant']), billingController.createInvoice);

/**
 * @route GET /api/v1/billing/invoices/:id
 * @desc Get invoice details by ID
 * @access Private
 */
router.get('/invoices/:id', hasRole(['super_admin', 'admin', 'founder', 'accountant']), billingController.getInvoiceById);

/**
 * @route PUT /api/v1/billing/invoices/:id
 * @desc Update an invoice
 * @access Private
 */
router.put('/invoices/:id', hasRole(['super_admin', 'admin', 'founder', 'accountant']), billingController.updateInvoice);

/**
 * @route GET /api/v1/billing/invoices/:id/download
 * @desc Download invoice as PDF
 * @access Private
 */
router.get('/invoices/:id/download', hasRole(['super_admin', 'admin', 'founder', 'accountant']), billingController.downloadInvoice);

/**
 * @route GET /api/v1/billing/payment-methods
 * @desc List payment methods
 * @access Private
 */
router.get('/payment-methods', hasRole(['super_admin', 'admin', 'founder', 'accountant']), billingController.getPaymentMethods);

/**
 * @route POST /api/v1/billing/payment-methods
 * @desc Add a new payment method
 * @access Private
 */
router.post('/payment-methods', hasRole(['super_admin', 'admin', 'founder', 'accountant']), billingController.addPaymentMethod);

/**
 * @route POST /api/v1/billing/payment-methods/:id/set-default
 * @desc Set a payment method as default
 * @access Private
 */
router.post('/payment-methods/:id/set-default', hasRole(['super_admin', 'admin', 'founder', 'accountant']), billingController.setDefaultPaymentMethod);

/**
 * @route DELETE /api/v1/billing/payment-methods/:id
 * @desc Remove a payment method
 * @access Private
 */
router.delete('/payment-methods/:id', hasRole(['super_admin', 'admin', 'founder', 'accountant']), billingController.removePaymentMethod);

/**
 * @route POST /api/v1/billing/upgrade
 * @desc Upgrade subscription plan
 * @access Private
 */
router.post('/upgrade', hasRole(['super_admin', 'admin', 'founder', 'accountant']), billingController.upgradePlan);

/**
 * @route POST /api/v1/billing/downgrade
 * @desc Downgrade subscription plan (effective at period end)
 * @access Private
 */
router.post('/downgrade', hasRole(['super_admin', 'admin', 'founder', 'accountant']), billingController.downgradePlan);

/**
 * @route GET /api/v1/billing/payment-history
 * @desc Get payment history with summary
 * @access Private
 */
router.get('/payment-history', hasRole(['super_admin', 'admin', 'founder', 'accountant']), billingController.getPaymentHistory);

/**
 * @route POST /api/v1/billing/checkout-session
 * @desc Create a Stripe Checkout session
 * @access Private
 */
router.post('/checkout-session', hasRole(['super_admin', 'admin', 'founder', 'accountant']), billingController.createCheckoutSession);

// Keep legacy endpoint for backward compatibility
router.post('/stripe-checkout', hasRole(['super_admin', 'admin', 'founder', 'accountant']), billingController.createCheckoutSession);

/**
 * @route POST /api/v1/billing/verify-session
 * @desc Verify a Stripe Checkout session and activate subscription
 * @access Private
 */
router.post('/verify-session', hasRole(['super_admin', 'admin', 'founder', 'accountant']), billingController.verifyCheckoutSession);

/**
 * @route POST /api/v1/billing/cancel
 * @desc Cancel subscription
 * @access Private
 */
router.post('/cancel', hasRole(['super_admin', 'admin', 'founder', 'accountant']), billingController.cancelSubscription);

/**
 * @route POST /api/v1/billing/reactivate
 * @desc Reactivate a cancelled subscription
 * @access Private
 */
router.post('/reactivate', hasRole(['super_admin', 'admin', 'founder', 'accountant']), billingController.reactivateSubscription);

/**
 * @route POST /api/v1/billing/setup-intent
 * @desc Create a Stripe Setup Intent for payment method collection
 * @access Private
 */
router.post('/setup-intent', hasRole(['super_admin', 'admin', 'founder', 'accountant']), billingController.createSetupIntent);

/**
 * @route POST /api/v1/billing/customer-portal
 * @desc Create a Stripe Customer Portal session
 * @access Private
 */
router.post('/customer-portal', hasRole(['super_admin', 'admin', 'founder', 'accountant']), billingController.createCustomerPortalSession);

/**
 * @route GET /api/v1/billing/checkout-session/:sessionId
 * @desc Get checkout session details for success page
 * @access Private
 */
router.get('/checkout-session/:sessionId', hasRole(['super_admin', 'admin', 'founder', 'accountant']), billingController.getCheckoutSession);

module.exports = router;

/**
 * Billing Routes
 * Issue #201: Enhance Billing Dashboard APIs
 *
 * Express routes for billing endpoints:
 * - Current plan
 * - Usage metrics
 * - Invoices
 * - Payment methods
 * - Plan changes
 */

const express = require('express');
const router = express.Router();
const billingController = require('../../controllers/billingController');
const authMiddleware = require('../../middleware/authMiddleware');

// Apply authentication to all routes
router.use(authMiddleware);

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
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 10)
 * @query status - Filter by status (draft, sent, paid, overdue, void, refunded)
 * @query startDate - Filter by start date
 * @query endDate - Filter by end date
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
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 10)
 * @query startDate - Filter by start date
 * @query endDate - Filter by end date
 */
router.get('/payment-history', billingController.getPaymentHistory);

module.exports = router;

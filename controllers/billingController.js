/**
 * Billing Controller
 * Issue #201: Enhance Billing Dashboard APIs
 *
 * HTTP endpoints for billing management including:
 * - Current plan retrieval
 * - Usage metrics
 * - Invoice management
 * - Payment methods
 * - Plan changes
 */

const BillingService = require('../services/billingService');

// Initialize Stripe if configured
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

/**
 * Determine appropriate HTTP status code based on error message
 * @param {Error} error - The error object
 * @returns {number} HTTP status code
 */
function getErrorStatusCode(error) {
  const message = error.message.toLowerCase();

  if (message.includes('not found')) {
    return 404;
  }
  if (message.includes('required') || message.includes('invalid') || message.includes('cannot') ||
      message.includes('no active') || message.includes('already on')) {
    return 400;
  }
  if (message.includes('unauthorized') || message.includes('forbidden')) {
    return 403;
  }

  return 500;
}

/**
 * Get current subscription plan
 * GET /api/v1/billing/current-plan
 */
async function getCurrentPlan(req, res) {
  try {
    const companyId = req.user?.companyId || req.query?.companyId;

    // Return default free plan if no companyId
    if (!companyId) {
      return res.status(200).json({
        planId: 'free',
        planName: 'Free',
        status: 'active',
        features: ['Basic features', 'Limited storage'],
        limits: { stakeholders: 10, documents: 100, storage: '1GB' }
      });
    }

    const plan = await BillingService.getCurrentPlan(companyId);

    if (!plan) {
      // Return default free plan if no subscription found
      return res.status(200).json({
        planId: 'free',
        planName: 'Free',
        status: 'active',
        features: ['Basic features', 'Limited storage'],
        limits: { stakeholders: 10, documents: 100, storage: '1GB' }
      });
    }

    return res.status(200).json(plan);
  } catch (error) {
    console.error('Error getting current plan:', error);
    const statusCode = getErrorStatusCode(error);
    return res.status(statusCode).json({ error: error.message });
  }
}

/**
 * Get usage metrics
 * GET /api/v1/billing/usage
 */
async function getUsageMetrics(req, res) {
  try {
    const companyId = req.user?.companyId || req.query?.companyId;

    // Return default empty usage if no companyId
    if (!companyId) {
      return res.status(200).json({
        stakeholders: { used: 0, limit: 10 },
        documents: { used: 0, limit: 100 },
        storage: { used: 0, limit: 1073741824 }, // 1GB in bytes
        apiCalls: { used: 0, limit: 1000 }
      });
    }

    const usage = await BillingService.getUsageMetrics(companyId);
    return res.status(200).json(usage);
  } catch (error) {
    console.error('Error getting usage metrics:', error);
    const statusCode = getErrorStatusCode(error);
    return res.status(statusCode).json({ error: error.message });
  }
}

/**
 * Get invoices with pagination and filtering
 * GET /api/v1/billing/invoices
 */
async function getInvoices(req, res) {
  try {
    const companyId = req.user?.companyId || req.query?.companyId;

    // Return empty invoices if no companyId
    if (!companyId) {
      return res.status(200).json({
        invoices: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 }
      });
    }

    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };

    const result = await BillingService.getInvoices(companyId, options);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error getting invoices:', error);
    const statusCode = getErrorStatusCode(error);
    return res.status(statusCode).json({ error: error.message });
  }
}

/**
 * Get invoice by ID
 * GET /api/v1/billing/invoices/:id
 */
async function getInvoiceById(req, res) {
  try {
    const invoiceId = req.params.id;

    if (!invoiceId) {
      return res.status(400).json({ error: 'Invoice ID is required' });
    }

    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const invoice = await BillingService.getInvoiceById(invoiceId, companyId);
    return res.status(200).json(invoice);
  } catch (error) {
    console.error('Error getting invoice:', error);
    const statusCode = getErrorStatusCode(error);
    return res.status(statusCode).json({ error: error.message });
  }
}

/**
 * Download invoice as PDF
 * GET /api/v1/billing/invoices/:id/download
 */
async function downloadInvoice(req, res) {
  try {
    const invoiceId = req.params.id;

    if (!invoiceId) {
      return res.status(400).json({ error: 'Invoice ID is required' });
    }

    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const { buffer, filename } = await BillingService.generateInvoicePDF(invoiceId, companyId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (error) {
    console.error('Error downloading invoice:', error);
    const statusCode = getErrorStatusCode(error);
    return res.status(statusCode).json({ error: error.message });
  }
}

/**
 * Create a new invoice
 * POST /api/v1/billing/invoices
 */
async function createInvoice(req, res) {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const invoiceData = {
      ...req.body,
      companyId,
      createdBy: req.user?.userId
    };

    const invoice = await BillingService.createInvoice(invoiceData);
    return res.status(201).json(invoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    const statusCode = getErrorStatusCode(error);
    return res.status(statusCode).json({ error: error.message });
  }
}

/**
 * Update an invoice
 * PUT /api/v1/billing/invoices/:id
 */
async function updateInvoice(req, res) {
  try {
    const invoiceId = req.params.id;

    if (!invoiceId) {
      return res.status(400).json({ error: 'Invoice ID is required' });
    }

    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const invoice = await BillingService.updateInvoice(invoiceId, companyId, req.body);
    return res.status(200).json(invoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    const statusCode = getErrorStatusCode(error);
    return res.status(statusCode).json({ error: error.message });
  }
}

/**
 * Get payment methods
 * GET /api/v1/billing/payment-methods
 */
async function getPaymentMethods(req, res) {
  try {
    const companyId = req.user?.companyId || req.query?.companyId;

    // Return empty payment methods if no companyId
    if (!companyId) {
      return res.status(200).json({ paymentMethods: [] });
    }

    const methods = await BillingService.getPaymentMethods(companyId);
    return res.status(200).json(methods);
  } catch (error) {
    console.error('Error getting payment methods:', error);
    const statusCode = getErrorStatusCode(error);
    return res.status(statusCode).json({ error: error.message });
  }
}

/**
 * Add a payment method
 * POST /api/v1/billing/payment-methods
 */
async function addPaymentMethod(req, res) {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const method = await BillingService.addPaymentMethod(companyId, req.body);
    return res.status(201).json(method);
  } catch (error) {
    console.error('Error adding payment method:', error);
    const statusCode = getErrorStatusCode(error);
    return res.status(statusCode).json({ error: error.message });
  }
}

/**
 * Remove a payment method
 * DELETE /api/v1/billing/payment-methods/:id
 */
async function removePaymentMethod(req, res) {
  try {
    const methodId = req.params.id;

    if (!methodId) {
      return res.status(400).json({ error: 'Payment method ID is required' });
    }

    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const result = await BillingService.removePaymentMethod(companyId, methodId);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error removing payment method:', error);
    const statusCode = getErrorStatusCode(error);
    return res.status(statusCode).json({ error: error.message });
  }
}

/**
 * Upgrade subscription plan
 * POST /api/v1/billing/upgrade
 */
async function upgradePlan(req, res) {
  try {
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ error: 'planId is required' });
    }

    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const result = await BillingService.upgradePlan(companyId, planId);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error upgrading plan:', error);
    const statusCode = getErrorStatusCode(error);
    return res.status(statusCode).json({ error: error.message });
  }
}

/**
 * Downgrade subscription plan
 * POST /api/v1/billing/downgrade
 */
async function downgradePlan(req, res) {
  try {
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ error: 'planId is required' });
    }

    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const result = await BillingService.downgradePlan(companyId, planId);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error downgrading plan:', error);
    const statusCode = getErrorStatusCode(error);
    return res.status(statusCode).json({ error: error.message });
  }
}

/**
 * Get payment history
 * GET /api/v1/billing/payment-history
 */
async function getPaymentHistory(req, res) {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };

    const result = await BillingService.getPaymentHistory(companyId, options);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error getting payment history:', error);
    const statusCode = getErrorStatusCode(error);
    return res.status(statusCode).json({ error: error.message });
  }
}

/**
 * Create Stripe Checkout Session
 * POST /api/v1/billing/stripe-checkout
 */
async function createStripeCheckout(req, res) {
  try {
    if (!stripe) {
      return res.status(503).json({
        error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.'
      });
    }

    const { price_id, success_url, cancel_url, mode } = req.body;

    if (!price_id) {
      return res.status(400).json({ error: 'price_id is required' });
    }

    if (!success_url || !cancel_url) {
      return res.status(400).json({ error: 'success_url and cancel_url are required' });
    }

    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      mode: mode || 'subscription',
      success_url,
      cancel_url,
    };

    // Add customer email if user is authenticated
    if (req.user?.email) {
      sessionConfig.customer_email = req.user.email;
    }

    // Add metadata
    sessionConfig.metadata = {
      userId: req.user?.userId || 'anonymous',
      companyId: req.user?.companyId || 'unknown',
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);

    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
}

module.exports = {
  getCurrentPlan,
  getUsageMetrics,
  getInvoices,
  getInvoiceById,
  downloadInvoice,
  createInvoice,
  updateInvoice,
  getPaymentMethods,
  addPaymentMethod,
  removePaymentMethod,
  upgradePlan,
  downgradePlan,
  getPaymentHistory,
  createStripeCheckout
};

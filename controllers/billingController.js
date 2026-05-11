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
 * - Stripe integration (checkout, webhooks, setup intents)
 */

const BillingService = require('../services/billingService');
const stripeService = require('../services/stripeService');
const { getAllPlans } = require('../config/stripe');

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
  if (message.includes('not configured')) {
    return 503;
  }
  if (message.includes('required') || message.includes('invalid') || message.includes('cannot') ||
      message.includes('no active') || message.includes('already on') || message.includes('not completed')) {
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
        plan: {
          planId: 'free',
          planName: 'Free',
          status: 'active',
          features: ['Basic features', 'Limited storage'],
          limits: { stakeholders: 10, documents: 100, storage: '1GB' }
        }
      });
    }

    const planData = await BillingService.getCurrentPlan(companyId);

    if (!planData) {
      // Return default free plan if no subscription found
      return res.status(200).json({
        plan: {
          planId: 'free',
          planName: 'Free',
          status: 'active',
          features: ['Basic features', 'Limited storage'],
          limits: { stakeholders: 10, documents: 100, storage: '1GB' }
        }
      });
    }

    return res.status(200).json({ plan: planData });
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
        usage: {
          stakeholders: { used: 0, limit: 10 },
          documents: { used: 0, limit: 100 },
          storage: { used: 0, limit: 1073741824 },
          apiCalls: { used: 0, limit: 1000 }
        }
      });
    }

    const usage = await BillingService.getUsageMetrics(companyId);
    return res.status(200).json({ usage });
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
    return res.status(200).json({ invoice });
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
    return res.status(200).json({ paymentMethods: methods });
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

    const { stripePaymentMethodId, setAsDefault } = req.body;

    let method;
    if (stripePaymentMethodId && stripeService.isConfigured()) {
      // Stripe-integrated flow
      method = await BillingService.syncPaymentMethodFromStripe(
        companyId,
        stripePaymentMethodId,
        setAsDefault
      );
    } else {
      // Legacy flow
      method = await BillingService.addPaymentMethod(companyId, req.body);
    }

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

    const result = stripeService.isConfigured()
      ? await BillingService.removePaymentMethodViaStripe(companyId, methodId)
      : await BillingService.removePaymentMethod(companyId, methodId);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error removing payment method:', error);
    const statusCode = getErrorStatusCode(error);
    return res.status(statusCode).json({ error: error.message });
  }
}

/**
 * Set default payment method
 * POST /api/v1/billing/payment-methods/:id/set-default
 */
async function setDefaultPaymentMethod(req, res) {
  try {
    const methodId = req.params.id;

    if (!methodId) {
      return res.status(400).json({ error: 'Payment method ID is required' });
    }

    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const result = await BillingService.setDefaultPaymentMethod(companyId, methodId);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error setting default payment method:', error);
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
 * POST /api/v1/billing/checkout-session
 */
async function createCheckoutSession(req, res) {
  try {
    if (!stripeService.isConfigured()) {
      return res.status(503).json({
        error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.'
      });
    }

    const { priceId, price_id, successUrl, success_url, cancelUrl, cancel_url } = req.body;
    const finalPriceId = priceId || price_id;
    const finalSuccessUrl = successUrl || success_url;
    const finalCancelUrl = cancelUrl || cancel_url;

    if (!finalPriceId) {
      return res.status(400).json({ error: 'priceId is required' });
    }

    if (!finalSuccessUrl || !finalCancelUrl) {
      return res.status(400).json({ error: 'successUrl and cancelUrl are required' });
    }

    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const result = await BillingService.createCheckoutSession(
      companyId,
      finalPriceId,
      finalSuccessUrl,
      finalCancelUrl,
      {
        email: req.user?.email,
        name: req.user?.name,
        userId: req.user?.userId
      }
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error creating checkout session:', error);

    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ error: error.message });
    }

    const statusCode = getErrorStatusCode(error);
    return res.status(statusCode).json({ error: error.message });
  }
}

/**
 * Verify Checkout Session
 * POST /api/v1/billing/verify-session
 */
async function verifyCheckoutSession(req, res) {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const result = await BillingService.verifyCheckoutSession(sessionId);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error verifying checkout session:', error);
    const statusCode = getErrorStatusCode(error);
    return res.status(statusCode).json({ error: error.message });
  }
}

/**
 * Cancel subscription
 * POST /api/v1/billing/cancel
 */
async function cancelSubscription(req, res) {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const { cancelAtPeriodEnd = true } = req.body;
    const result = await BillingService.cancelSubscription(companyId, cancelAtPeriodEnd);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    const statusCode = getErrorStatusCode(error);
    return res.status(statusCode).json({ error: error.message });
  }
}

/**
 * Reactivate subscription
 * POST /api/v1/billing/reactivate
 */
async function reactivateSubscription(req, res) {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const result = await BillingService.reactivateSubscription(companyId);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    const statusCode = getErrorStatusCode(error);
    return res.status(statusCode).json({ error: error.message });
  }
}

/**
 * Create Setup Intent for payment method collection
 * POST /api/v1/billing/setup-intent
 */
async function createSetupIntent(req, res) {
  try {
    if (!stripeService.isConfigured()) {
      return res.status(503).json({ error: 'Stripe is not configured' });
    }

    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const result = await BillingService.createSetupIntent(
      companyId,
      req.user?.email,
      req.user?.name
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error creating setup intent:', error);
    const statusCode = getErrorStatusCode(error);
    return res.status(statusCode).json({ error: error.message });
  }
}

/**
 * Handle Stripe Webhook
 * POST /api/v1/billing/webhook
 * NOTE: No auth middleware - uses Stripe signature verification
 */
async function handleStripeWebhook(req, res) {
  try {
    if (!stripeService.isConfigured()) {
      return res.status(503).json({ error: 'Stripe is not configured' });
    }

    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    let event;
    try {
      event = stripeService.constructEvent(req.body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const result = await BillingService.handleWebhookEvent(event);
    return res.status(200).json({ received: true, ...result });
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Always return 200 to prevent Stripe retries for non-transient errors
    return res.status(200).json({ received: true, error: error.message });
  }
}

/**
 * Get available subscription plans
 * GET /api/v1/billing/plans
 */
async function getPlans(req, res) {
  try {
    const plans = getAllPlans();
    return res.status(200).json({ plans });
  } catch (error) {
    console.error('Error getting plans:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Create a Stripe Customer Portal session
 * POST /api/v1/billing/customer-portal
 */
async function createCustomerPortalSession(req, res) {
  try {
    if (!stripeService.isConfigured()) {
      return res.status(503).json({ error: 'Stripe is not configured' });
    }

    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const customer = await BillingService.getOrCreateStripeCustomer(
      companyId,
      req.user?.email,
      req.user?.name
    );

    const returnUrl = req.body.returnUrl || `${req.headers.origin || 'http://localhost:5173'}/app/billing`;

    const stripe = stripeService.getStripe();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.stripeCustomerId,
      return_url: returnUrl
    });

    return res.status(200).json({ url: portalSession.url });
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    const statusCode = getErrorStatusCode(error);
    return res.status(statusCode).json({ error: error.message });
  }
}

/**
 * Get checkout session details
 * GET /api/v1/billing/checkout-session/:sessionId
 */
async function getCheckoutSession(req, res) {
  try {
    if (!stripeService.isConfigured()) {
      return res.status(503).json({ error: 'Stripe is not configured' });
    }

    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const session = await stripeService.retrieveCheckoutSession(sessionId);

    return res.status(200).json({
      session: {
        id: session.id,
        status: session.status,
        paymentStatus: session.payment_status,
        customerEmail: session.customer_details?.email,
        amountTotal: session.amount_total ? session.amount_total / 100 : null,
        currency: session.currency,
        subscriptionId: session.subscription,
        createdAt: new Date(session.created * 1000).toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting checkout session:', error);
    const statusCode = getErrorStatusCode(error);
    return res.status(statusCode).json({ error: error.message });
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
  setDefaultPaymentMethod,
  upgradePlan,
  downgradePlan,
  getPaymentHistory,
  createCheckoutSession,
  verifyCheckoutSession,
  cancelSubscription,
  reactivateSubscription,
  createSetupIntent,
  handleStripeWebhook,
  getPlans,
  createCustomerPortalSession,
  getCheckoutSession
};

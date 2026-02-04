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
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const plan = await BillingService.getCurrentPlan(companyId);

    if (!plan) {
      return res.status(404).json({ error: 'No active subscription found' });
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
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
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
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
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
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
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
  getPaymentHistory
};

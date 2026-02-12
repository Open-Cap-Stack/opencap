/**
 * Billing Service
 * Issue #201: Enhance Billing Dashboard APIs
 *
 * Business logic for billing management including:
 * - Current plan retrieval
 * - Usage metrics aggregation
 * - Invoice management
 * - Payment history
 * - Plan upgrade/downgrade
 */

const databaseAdapter = require('./databaseAdapter');
const stripeService = require('./stripeService');
const { v4: uuidv4 } = require('uuid');

// Status transition map for invoices
const statusTransitions = {
  draft: ['sent', 'void'],
  sent: ['paid', 'overdue', 'void'],
  overdue: ['paid', 'void'],
  paid: ['refunded'],
  void: [],
  refunded: []
};

class BillingService {
  /**
   * Get current plan for a company
   * @param {string} companyId - Company ID
   * @returns {Object|null} Current plan details or null
   */
  static async getCurrentPlan(companyId) {
    if (!companyId) {
      throw new Error('companyId is required');
    }

    // Find active subscription
    const subscription = await databaseAdapter.findOne('Subscription', {
      companyId,
      status: { $in: ['active', 'trialing'] }
    });

    if (!subscription) {
      return null;
    }

    // Get plan details
    const plan = await databaseAdapter.findOne('SubscriptionPlan', {
      planId: subscription.planId
    });

    // Calculate days remaining
    let daysRemaining = null;
    if (subscription.currentPeriodEnd) {
      const now = new Date();
      const end = new Date(subscription.currentPeriodEnd);
      daysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
    }

    return {
      subscription,
      plan,
      isActive: subscription.status === 'active' || subscription.status === 'trialing',
      daysRemaining
    };
  }

  /**
   * Get usage metrics for a company
   * @param {string} companyId - Company ID
   * @returns {Object} Usage metrics
   */
  static async getUsageMetrics(companyId) {
    if (!companyId) {
      throw new Error('companyId is required');
    }

    // Find active subscription
    const subscription = await databaseAdapter.findOne('Subscription', {
      companyId,
      status: { $in: ['active', 'trialing'] }
    });

    if (!subscription) {
      throw new Error('No active subscription');
    }

    // Get plan limits
    const plan = await databaseAdapter.findOne('SubscriptionPlan', {
      planId: subscription.planId
    });

    if (!plan || !plan.limits) {
      throw new Error('Plan configuration error');
    }

    // Count current usage
    const stakeholderCount = await databaseAdapter.count('Stakeholder', { companyId });
    const documentCount = await databaseAdapter.count('Document', { companyId });
    const userCount = await databaseAdapter.count('User', { companyId });

    // Build usage metrics
    const metrics = {};

    // Stakeholders
    if (plan.limits.stakeholders === -1) {
      metrics.stakeholders = {
        current: stakeholderCount,
        limit: -1,
        unlimited: true
      };
    } else {
      metrics.stakeholders = {
        current: stakeholderCount,
        limit: plan.limits.stakeholders,
        percentUsed: Math.round((stakeholderCount / plan.limits.stakeholders) * 100)
      };
    }

    // Documents
    if (plan.limits.documents === -1) {
      metrics.documents = {
        current: documentCount,
        limit: -1,
        unlimited: true
      };
    } else {
      metrics.documents = {
        current: documentCount,
        limit: plan.limits.documents,
        percentUsed: Math.round((documentCount / plan.limits.documents) * 100)
      };
    }

    // Users
    if (plan.limits.users === -1) {
      metrics.users = {
        current: userCount,
        limit: -1,
        unlimited: true
      };
    } else {
      metrics.users = {
        current: userCount,
        limit: plan.limits.users,
        percentUsed: Math.round((userCount / plan.limits.users) * 100)
      };
    }

    // API calls (placeholder - would need actual tracking)
    if (plan.limits.apiCallsPerMonth) {
      if (plan.limits.apiCallsPerMonth === -1) {
        metrics.apiCalls = {
          current: 0,
          limit: -1,
          unlimited: true
        };
      } else {
        metrics.apiCalls = {
          current: 0,
          limit: plan.limits.apiCallsPerMonth,
          percentUsed: 0
        };
      }
    }

    // Storage (placeholder - would need actual calculation)
    if (plan.limits.storageGB) {
      if (plan.limits.storageGB === -1) {
        metrics.storage = {
          current: 0,
          limit: -1,
          unlimited: true,
          unit: 'GB'
        };
      } else {
        metrics.storage = {
          current: 0,
          limit: plan.limits.storageGB,
          percentUsed: 0,
          unit: 'GB'
        };
      }
    }

    return metrics;
  }

  /**
   * Create a new invoice
   * @param {Object} data - Invoice data
   * @returns {Object} Created invoice
   */
  static async createInvoice(data) {
    if (!data.companyId) {
      throw new Error('companyId is required');
    }
    if (!data.amount && data.amount !== 0) {
      throw new Error('amount is required');
    }
    if (data.amount < 0) {
      throw new Error('amount must be positive');
    }

    // Generate invoice ID and number
    const invoiceId = `INV-${uuidv4().slice(0, 8).toUpperCase()}`;

    // Generate invoice number (YYYYMM-XXXX format)
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = await databaseAdapter.count('Invoice', {
      invoiceNumber: { $regex: `^${yearMonth}-` }
    });
    const invoiceNumber = `${yearMonth}-${String(count + 1).padStart(4, '0')}`;

    const invoice = await databaseAdapter.create('Invoice', {
      invoiceId,
      invoiceNumber,
      companyId: data.companyId,
      subscriptionId: data.subscriptionId,
      status: 'draft',
      currency: data.currency || 'USD',
      lineItems: data.lineItems || [],
      subtotal: data.subtotal || data.amount,
      taxAmount: data.taxAmount || 0,
      discountAmount: data.discountAmount || 0,
      total: data.total || data.amount,
      amount: data.amount,
      amountDue: data.total || data.amount,
      billingDetails: data.billingDetails,
      issueDate: data.issueDate || new Date(),
      dueDate: data.dueDate || this._calculateDueDate(),
      notes: data.notes,
      metadata: data.metadata,
      createdBy: data.createdBy
    });

    return invoice;
  }

  /**
   * Get invoices for a company with pagination and filtering
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Object} Paginated invoices
   */
  static async getInvoices(companyId, options = {}) {
    const { page = 1, limit = 10, status, startDate, endDate } = options;

    const query = { companyId };

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const invoices = await databaseAdapter.find('Invoice', query, {
      sort: { createdAt: -1 },
      skip,
      limit
    });

    const totalCount = await databaseAdapter.count('Invoice', query);
    const totalPages = Math.ceil(totalCount / limit);

    return {
      invoices,
      totalCount,
      currentPage: page,
      totalPages
    };
  }

  /**
   * Get invoice by ID
   * @param {string} invoiceId - Invoice ID
   * @param {string} companyId - Company ID for validation
   * @returns {Object} Invoice
   */
  static async getInvoiceById(invoiceId, companyId) {
    const invoice = await databaseAdapter.findOne('Invoice', { invoiceId });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.companyId !== companyId) {
      throw new Error('Invoice not found');
    }

    return invoice;
  }

  /**
   * Generate PDF for an invoice
   * @param {string} invoiceId - Invoice ID
   * @param {string} companyId - Company ID for validation
   * @returns {Object} PDF buffer and filename
   */
  static async generateInvoicePDF(invoiceId, companyId) {
    const invoice = await this.getInvoiceById(invoiceId, companyId);

    // Try to load pdfkit
    let PDFDocument;
    try {
      PDFDocument = require('pdfkit');
    } catch (err) {
      throw new Error('PDF generation not available');
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            buffer,
            filename: `invoice-${invoiceId}.pdf`
          });
        });
        doc.on('error', reject);

        // Add invoice header
        doc.fontSize(20).text('INVOICE', { align: 'center' });
        doc.moveDown();

        // Invoice details
        doc.fontSize(12);
        doc.text(`Invoice Number: ${invoice.invoiceNumber}`);
        doc.text(`Invoice ID: ${invoice.invoiceId}`);
        doc.text(`Issue Date: ${new Date(invoice.issueDate).toLocaleDateString()}`);
        doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`);
        doc.text(`Status: ${invoice.status.toUpperCase()}`);
        doc.moveDown();

        // Billing details
        if (invoice.billingDetails) {
          doc.text('Bill To:', { underline: true });
          if (invoice.billingDetails.name) doc.text(invoice.billingDetails.name);
          if (invoice.billingDetails.company) doc.text(invoice.billingDetails.company);
          if (invoice.billingDetails.email) doc.text(invoice.billingDetails.email);
          if (invoice.billingDetails.address) {
            const addr = invoice.billingDetails.address;
            if (addr.line1) doc.text(addr.line1);
            if (addr.line2) doc.text(addr.line2);
            if (addr.city || addr.state || addr.postalCode) {
              doc.text(`${addr.city || ''}, ${addr.state || ''} ${addr.postalCode || ''}`);
            }
            if (addr.country) doc.text(addr.country);
          }
          doc.moveDown();
        }

        // Line items
        if (invoice.lineItems && invoice.lineItems.length > 0) {
          doc.text('Items:', { underline: true });
          invoice.lineItems.forEach(item => {
            doc.text(`${item.description} - Qty: ${item.quantity} x $${item.unitPrice} = $${item.amount}`);
          });
          doc.moveDown();
        }

        // Totals
        doc.text(`Subtotal: $${invoice.subtotal.toFixed(2)}`);
        if (invoice.taxAmount > 0) {
          doc.text(`Tax: $${invoice.taxAmount.toFixed(2)}`);
        }
        if (invoice.discountAmount > 0) {
          doc.text(`Discount: -$${invoice.discountAmount.toFixed(2)}`);
        }
        doc.fontSize(14).text(`Total: $${invoice.total.toFixed(2)}`, { bold: true });

        if (invoice.status === 'paid') {
          doc.moveDown();
          doc.fontSize(16).text('PAID', { align: 'center' });
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Update an invoice
   * @param {string} invoiceId - Invoice ID
   * @param {string} companyId - Company ID for validation
   * @param {Object} updates - Update data
   * @returns {Object} Updated invoice
   */
  static async updateInvoice(invoiceId, companyId, updates) {
    const invoice = await databaseAdapter.findOne('Invoice', { invoiceId });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.companyId !== companyId) {
      throw new Error('Invoice not found');
    }

    // Check if paid invoice can be updated
    if (invoice.status === 'paid' && !updates.status) {
      throw new Error('Cannot update paid invoice');
    }

    // Validate status transition if status is being changed
    if (updates.status && updates.status !== invoice.status) {
      const validTransitions = statusTransitions[invoice.status];
      if (!validTransitions || !validTransitions.includes(updates.status)) {
        throw new Error('Invalid status transition');
      }
    }

    const updatedInvoice = await databaseAdapter.findByIdAndUpdate(
      'Invoice',
      invoice._id,
      updates,
      { new: true }
    );

    return updatedInvoice;
  }

  /**
   * Get payment history for a company
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Object} Payment history with summary
   */
  static async getPaymentHistory(companyId, options = {}) {
    const { page = 1, limit = 10, startDate, endDate } = options;

    const query = { companyId };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const payments = await databaseAdapter.find('Payment', query, {
      sort: { createdAt: -1 },
      skip,
      limit
    });

    const totalCount = await databaseAdapter.count('Payment', query);
    const totalPages = Math.ceil(totalCount / limit);

    // Calculate summary
    let totalPaid = 0;
    let totalRefunded = 0;

    payments.forEach(payment => {
      if (payment.status === 'succeeded') {
        totalPaid += payment.amount;
        totalRefunded += payment.refundedAmount || 0;
      }
    });

    return {
      payments,
      totalCount,
      currentPage: page,
      totalPages,
      summary: {
        totalPaid,
        totalRefunded,
        netAmount: totalPaid - totalRefunded
      }
    };
  }

  /**
   * Get payment methods for a company
   * @param {string} companyId - Company ID
   * @returns {Array} Payment methods
   */
  static async getPaymentMethods(companyId) {
    return await databaseAdapter.find('PaymentMethod', {
      customerId: companyId,
      status: 'active'
    }, {
      sort: { isDefault: -1, createdAt: -1 }
    });
  }

  /**
   * Add a payment method
   * @param {string} companyId - Company ID
   * @param {Object} data - Payment method data
   * @returns {Object} Created payment method
   */
  static async addPaymentMethod(companyId, data) {
    if (!data.last4) {
      throw new Error('last4 is required');
    }

    const methodId = `PM-${uuidv4().slice(0, 8).toUpperCase()}`;

    // Check if this should be the default
    const existingMethods = await databaseAdapter.find('PaymentMethod', {
      customerId: companyId,
      status: 'active'
    });

    const isDefault = existingMethods.length === 0 || data.isDefault;

    // If setting as default, unset other defaults
    if (isDefault && existingMethods.length > 0) {
      for (const method of existingMethods) {
        if (method.isDefault) {
          await databaseAdapter.findByIdAndUpdate('PaymentMethod', method._id, {
            isDefault: false
          });
        }
      }
    }

    return await databaseAdapter.create('PaymentMethod', {
      methodId,
      customerId: companyId,
      type: data.type || 'card',
      last4: data.last4,
      brand: data.brand || 'unknown',
      expiryMonth: data.expiryMonth,
      expiryYear: data.expiryYear,
      isDefault,
      status: 'active',
      billingDetails: data.billingDetails,
      metadata: data.metadata
    });
  }

  /**
   * Remove a payment method
   * @param {string} companyId - Company ID
   * @param {string} methodId - Payment method ID
   * @returns {Object} Result
   */
  static async removePaymentMethod(companyId, methodId) {
    const method = await databaseAdapter.findOne('PaymentMethod', {
      methodId,
      customerId: companyId
    });

    if (!method) {
      throw new Error('Payment method not found');
    }

    await databaseAdapter.findByIdAndUpdate('PaymentMethod', method._id, {
      status: 'inactive'
    });

    // If this was the default, set another as default
    if (method.isDefault) {
      const remaining = await databaseAdapter.find('PaymentMethod', {
        customerId: companyId,
        status: 'active'
      });

      if (remaining.length > 0) {
        await databaseAdapter.findByIdAndUpdate('PaymentMethod', remaining[0]._id, {
          isDefault: true
        });
      }
    }

    return { success: true };
  }

  /**
   * Upgrade subscription plan
   * @param {string} companyId - Company ID
   * @param {string} newPlanId - New plan ID
   * @returns {Object} Upgrade result
   */
  static async upgradePlan(companyId, newPlanId) {
    // Find active subscription
    const subscription = await databaseAdapter.findOne('Subscription', {
      companyId,
      status: { $in: ['active', 'trialing'] }
    });

    if (!subscription) {
      throw new Error('No active subscription');
    }

    if (subscription.planId === newPlanId) {
      throw new Error('Already on this plan');
    }

    // Get current and new plan details
    const currentPlan = await databaseAdapter.findOne('SubscriptionPlan', {
      planId: subscription.planId
    });

    const newPlan = await databaseAdapter.findOne('SubscriptionPlan', {
      planId: newPlanId
    });

    if (!newPlan) {
      throw new Error('Plan not found');
    }

    if (!newPlan.isActive) {
      throw new Error('Plan is not active');
    }

    // Calculate proration (simplified)
    let prorationAmount = 0;
    if (currentPlan && subscription.currentPeriodEnd) {
      const now = new Date();
      const periodEnd = new Date(subscription.currentPeriodEnd);
      const daysRemaining = Math.max(0, Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24)));
      const dailyDiff = (newPlan.price - currentPlan.price) / 30;
      prorationAmount = Math.max(0, dailyDiff * daysRemaining);
    }

    // Update subscription
    const updatedSubscription = await databaseAdapter.findByIdAndUpdate(
      'Subscription',
      subscription._id,
      {
        planId: newPlanId,
        $push: {
          history: {
            action: 'plan_changed',
            fromPlanId: subscription.planId,
            toPlanId: newPlanId,
            performedAt: new Date()
          }
        }
      },
      { new: true }
    );

    return {
      success: true,
      subscription: updatedSubscription,
      prorationAmount: Math.round(prorationAmount * 100) / 100
    };
  }

  /**
   * Downgrade subscription plan
   * @param {string} companyId - Company ID
   * @param {string} newPlanId - New plan ID
   * @returns {Object} Downgrade result
   */
  static async downgradePlan(companyId, newPlanId) {
    // Find active subscription
    const subscription = await databaseAdapter.findOne('Subscription', {
      companyId,
      status: { $in: ['active', 'trialing'] }
    });

    if (!subscription) {
      throw new Error('No active subscription');
    }

    if (subscription.planId === newPlanId) {
      throw new Error('Already on this plan');
    }

    // Get current and new plan details
    const currentPlan = await databaseAdapter.findOne('SubscriptionPlan', {
      planId: subscription.planId
    });

    const newPlan = await databaseAdapter.findOne('SubscriptionPlan', {
      planId: newPlanId
    });

    if (!newPlan) {
      throw new Error('Plan not found');
    }

    if (!newPlan.isActive) {
      throw new Error('Plan is not active');
    }

    // Validate it's actually a downgrade
    if (newPlan.price >= currentPlan.price) {
      throw new Error('Cannot downgrade to a more expensive plan');
    }

    // Schedule downgrade for end of billing period
    const updatedSubscription = await databaseAdapter.findByIdAndUpdate(
      'Subscription',
      subscription._id,
      {
        metadata: {
          ...(subscription.metadata || {}),
          scheduledDowngrade: newPlanId,
          scheduledDowngradeDate: subscription.currentPeriodEnd
        },
        $push: {
          history: {
            action: 'plan_changed',
            fromPlanId: subscription.planId,
            toPlanId: newPlanId,
            performedAt: new Date(),
            metadata: { scheduled: true }
          }
        }
      },
      { new: true }
    );

    return {
      success: true,
      scheduledDowngrade: true,
      effectiveDate: subscription.currentPeriodEnd,
      currentPlan: subscription.planId,
      newPlan: newPlanId
    };
  }

  // ============================================================
  // Stripe-Integrated Methods
  // ============================================================

  /**
   * Get or create a Stripe customer for a company
   * @param {string} companyId
   * @param {string} email
   * @param {string} name
   * @returns {Object} Stripe customer mapping
   */
  static async getOrCreateStripeCustomer(companyId, email, name) {
    if (!stripeService.isConfigured()) {
      throw new Error('Stripe is not configured');
    }

    // Check local mapping first
    const existing = await databaseAdapter.findOne('StripeCustomer', { companyId });
    if (existing) {
      return existing;
    }

    // Create in Stripe
    const stripeCustomer = await stripeService.createCustomer({
      email,
      name,
      metadata: { companyId }
    });

    // Save mapping in ZeroDB
    const mapping = await databaseAdapter.create('StripeCustomer', {
      mappingId: `scm_${uuidv4()}`,
      companyId,
      stripeCustomerId: stripeCustomer.id,
      email,
      name
    });

    return mapping;
  }

  /**
   * Create a Stripe Checkout session
   * @param {string} companyId
   * @param {string} priceId - Stripe Price ID
   * @param {string} successUrl
   * @param {string} cancelUrl
   * @param {Object} userInfo - { email, name, userId }
   * @returns {Object} { sessionId, url }
   */
  static async createCheckoutSession(companyId, priceId, successUrl, cancelUrl, userInfo = {}) {
    const customer = await this.getOrCreateStripeCustomer(
      companyId,
      userInfo.email,
      userInfo.name
    );

    const session = await stripeService.createCheckoutSession({
      customerId: customer.stripeCustomerId,
      priceId,
      successUrl,
      cancelUrl,
      metadata: {
        companyId,
        userId: userInfo.userId || ''
      }
    });

    return { sessionId: session.id, url: session.url };
  }

  /**
   * Verify and activate a checkout session
   * @param {string} sessionId - Stripe Checkout Session ID
   * @returns {Object} Subscription details
   */
  static async verifyCheckoutSession(sessionId) {
    const session = await stripeService.retrieveCheckoutSession(sessionId);

    if (session.payment_status !== 'paid') {
      throw new Error('Payment not completed');
    }

    const companyId = session.metadata?.companyId;
    if (!companyId) {
      throw new Error('Invalid session: missing companyId');
    }

    // Sync subscription from Stripe to ZeroDB
    if (session.subscription) {
      const stripeSub = typeof session.subscription === 'string'
        ? await stripeService.getSubscription(session.subscription)
        : session.subscription;

      await this._syncSubscriptionFromStripe(companyId, stripeSub);
    }

    return { success: true, companyId };
  }

  /**
   * Cancel a subscription via Stripe
   * @param {string} companyId
   * @param {boolean} atPeriodEnd
   * @returns {Object} Result
   */
  static async cancelSubscription(companyId, atPeriodEnd = true) {
    const subscription = await databaseAdapter.findOne('Subscription', {
      companyId,
      status: { $in: ['active', 'trialing'] }
    });

    if (!subscription) {
      throw new Error('No active subscription');
    }

    // Cancel in Stripe if linked
    if (subscription.stripeSubscriptionId && stripeService.isConfigured()) {
      await stripeService.cancelSubscription(subscription.stripeSubscriptionId, { atPeriodEnd });
    }

    // Update local record
    const updateData = {
      cancelAtPeriodEnd: atPeriodEnd,
      canceledAt: new Date().toISOString()
    };
    if (!atPeriodEnd) {
      updateData.status = 'canceled';
    }

    await databaseAdapter.findByIdAndUpdate('Subscription', subscription._id, updateData);

    return { success: true, cancelAtPeriodEnd: atPeriodEnd };
  }

  /**
   * Reactivate a cancelled subscription
   * @param {string} companyId
   * @returns {Object} Result
   */
  static async reactivateSubscription(companyId) {
    const subscription = await databaseAdapter.findOne('Subscription', {
      companyId,
      cancelAtPeriodEnd: true
    });

    if (!subscription) {
      throw new Error('No subscription to reactivate');
    }

    // Reactivate in Stripe if linked
    if (subscription.stripeSubscriptionId && stripeService.isConfigured()) {
      await stripeService.reactivateSubscription(subscription.stripeSubscriptionId);
    }

    await databaseAdapter.findByIdAndUpdate('Subscription', subscription._id, {
      cancelAtPeriodEnd: false,
      canceledAt: null,
      cancellationReason: null
    });

    return { success: true };
  }

  /**
   * Create a SetupIntent for adding a payment method
   * @param {string} companyId
   * @param {string} email
   * @param {string} name
   * @returns {Object} { clientSecret }
   */
  static async createSetupIntent(companyId, email, name) {
    const customer = await this.getOrCreateStripeCustomer(companyId, email, name);
    const setupIntent = await stripeService.createSetupIntent(customer.stripeCustomerId);
    return { clientSecret: setupIntent.client_secret };
  }

  /**
   * Sync a payment method from Stripe to ZeroDB
   * @param {string} companyId
   * @param {string} stripePaymentMethodId
   * @param {boolean} setAsDefault
   * @returns {Object} Payment method
   */
  static async syncPaymentMethodFromStripe(companyId, stripePaymentMethodId, setAsDefault = false) {
    const customer = await databaseAdapter.findOne('StripeCustomer', { companyId });
    if (!customer) {
      throw new Error('Stripe customer not found');
    }

    // Attach to customer in Stripe
    await stripeService.attachPaymentMethod(stripePaymentMethodId, customer.stripeCustomerId);

    if (setAsDefault) {
      await stripeService.setDefaultPaymentMethod(customer.stripeCustomerId, stripePaymentMethodId);
    }

    // Fetch details from Stripe
    const stripePMs = await stripeService.listPaymentMethods(customer.stripeCustomerId);
    const pm = stripePMs.data.find(p => p.id === stripePaymentMethodId);

    if (!pm) {
      throw new Error('Payment method not found in Stripe');
    }

    // Save to ZeroDB
    return await this.addPaymentMethod(companyId, {
      type: pm.type === 'card' ? 'card' : 'bank_account',
      last4: pm.card?.last4 || '0000',
      brand: pm.card?.brand || 'unknown',
      expiryMonth: pm.card?.exp_month,
      expiryYear: pm.card?.exp_year,
      isDefault: setAsDefault,
      stripePaymentMethodId: pm.id,
      billingDetails: pm.billing_details ? {
        name: pm.billing_details.name,
        email: pm.billing_details.email
      } : undefined
    });
  }

  /**
   * Remove a payment method via Stripe
   * @param {string} companyId
   * @param {string} methodId - Local payment method ID
   * @returns {Object} Result
   */
  static async removePaymentMethodViaStripe(companyId, methodId) {
    const method = await databaseAdapter.findOne('PaymentMethod', {
      methodId,
      customerId: companyId
    });

    if (!method) {
      throw new Error('Payment method not found');
    }

    // Detach from Stripe if linked
    if (method.stripePaymentMethodId && stripeService.isConfigured()) {
      await stripeService.detachPaymentMethod(method.stripePaymentMethodId);
    }

    return await this.removePaymentMethod(companyId, methodId);
  }

  /**
   * Set default payment method via Stripe
   * @param {string} companyId
   * @param {string} methodId - Local payment method ID
   * @returns {Object} Result
   */
  static async setDefaultPaymentMethod(companyId, methodId) {
    const method = await databaseAdapter.findOne('PaymentMethod', {
      methodId,
      customerId: companyId
    });

    if (!method) {
      throw new Error('Payment method not found');
    }

    // Set default in Stripe if linked
    if (method.stripePaymentMethodId && stripeService.isConfigured()) {
      const customer = await databaseAdapter.findOne('StripeCustomer', { companyId });
      if (customer) {
        await stripeService.setDefaultPaymentMethod(customer.stripeCustomerId, method.stripePaymentMethodId);
      }
    }

    // Update local records - unset others, set this one
    const allMethods = await databaseAdapter.find('PaymentMethod', {
      customerId: companyId,
      status: 'active'
    });

    for (const m of allMethods) {
      if (m.isDefault && m.methodId !== methodId) {
        await databaseAdapter.findByIdAndUpdate('PaymentMethod', m._id, { isDefault: false });
      }
    }

    await databaseAdapter.findByIdAndUpdate('PaymentMethod', method._id, { isDefault: true });

    return { success: true };
  }

  /**
   * Handle incoming Stripe webhook event
   * @param {Object} event - Verified Stripe event
   * @returns {Object} Processing result
   */
  static async handleWebhookEvent(event) {
    const WebhookEvent = require('../models/WebhookEvent');

    // Idempotency check
    const alreadyProcessed = await WebhookEvent.isProcessed(event.id);
    if (alreadyProcessed) {
      return { status: 'already_processed' };
    }

    // Record the event
    await WebhookEvent.recordEvent(event.id, event.type);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this._handleCheckoutCompleted(event.data.object);
          break;
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this._handleSubscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this._handleSubscriptionDeleted(event.data.object);
          break;
        case 'invoice.paid':
          await this._handleInvoicePaid(event.data.object);
          break;
        case 'invoice.payment_failed':
          await this._handleInvoicePaymentFailed(event.data.object);
          break;
        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
      }

      await WebhookEvent.markProcessed(event.id);
      return { status: 'processed' };
    } catch (error) {
      await WebhookEvent.markFailed(event.id, error.message);
      throw error;
    }
  }

  // ============================================================
  // Private Stripe Sync Helpers
  // ============================================================

  /**
   * Sync a Stripe subscription to ZeroDB
   * @private
   */
  static async _syncSubscriptionFromStripe(companyId, stripeSub) {
    // Map Stripe status to local status
    const statusMap = {
      active: 'active',
      trialing: 'trialing',
      past_due: 'past_due',
      canceled: 'canceled',
      unpaid: 'past_due',
      incomplete: 'trialing',
      incomplete_expired: 'canceled',
      paused: 'paused'
    };

    const status = statusMap[stripeSub.status] || 'active';
    const priceId = stripeSub.items?.data?.[0]?.price?.id;

    // Find plan by Stripe price ID
    let plan = null;
    if (priceId) {
      plan = await databaseAdapter.findOne('SubscriptionPlan', { stripePriceId: priceId });
    }

    // Check if subscription already exists
    const existing = await databaseAdapter.findOne('Subscription', {
      stripeSubscriptionId: stripeSub.id
    });

    const subData = {
      status,
      stripeSubscriptionId: stripeSub.id,
      stripeCustomerId: stripeSub.customer,
      stripePriceId: priceId || null,
      planId: plan?.planId || existing?.planId || 'unknown',
      currentPeriodStart: new Date(stripeSub.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(stripeSub.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: stripeSub.cancel_at_period_end || false
    };

    if (existing) {
      await databaseAdapter.findByIdAndUpdate('Subscription', existing._id, subData);
    } else {
      await databaseAdapter.create('Subscription', {
        subscriptionId: `sub_${uuidv4()}`,
        companyId,
        ...subData,
        history: [{
          action: 'created',
          toStatus: status,
          performedAt: new Date().toISOString()
        }]
      });
    }
  }

  /**
   * Handle checkout.session.completed webhook
   * @private
   */
  static async _handleCheckoutCompleted(session) {
    const companyId = session.metadata?.companyId;
    if (!companyId) return;

    if (session.subscription) {
      const stripeSub = await stripeService.getSubscription(session.subscription);
      await this._syncSubscriptionFromStripe(companyId, stripeSub);
    }
  }

  /**
   * Handle customer.subscription.updated webhook
   * @private
   */
  static async _handleSubscriptionUpdated(stripeSub) {
    // Find company by Stripe customer ID
    const customerMapping = await databaseAdapter.findOne('StripeCustomer', {
      stripeCustomerId: stripeSub.customer
    });

    if (!customerMapping) {
      console.warn(`No company mapping found for Stripe customer: ${stripeSub.customer}`);
      return;
    }

    await this._syncSubscriptionFromStripe(customerMapping.companyId, stripeSub);
  }

  /**
   * Handle customer.subscription.deleted webhook
   * @private
   */
  static async _handleSubscriptionDeleted(stripeSub) {
    const existing = await databaseAdapter.findOne('Subscription', {
      stripeSubscriptionId: stripeSub.id
    });

    if (existing) {
      await databaseAdapter.findByIdAndUpdate('Subscription', existing._id, {
        status: 'canceled',
        canceledAt: new Date().toISOString()
      });
    }
  }

  /**
   * Handle invoice.paid webhook
   * @private
   */
  static async _handleInvoicePaid(stripeInvoice) {
    const customerMapping = await databaseAdapter.findOne('StripeCustomer', {
      stripeCustomerId: stripeInvoice.customer
    });

    if (!customerMapping) return;

    // Check if we already have this invoice
    const existing = await databaseAdapter.findOne('Invoice', {
      stripeInvoiceId: stripeInvoice.id
    });

    if (existing) {
      await databaseAdapter.findByIdAndUpdate('Invoice', existing._id, {
        status: 'paid',
        paidAt: new Date().toISOString(),
        amountPaid: stripeInvoice.amount_paid / 100,
        amountDue: 0,
        hostedInvoiceUrl: stripeInvoice.hosted_invoice_url
      });
    } else {
      // Create new invoice record from Stripe data
      const invoiceId = `INV-${uuidv4().slice(0, 8).toUpperCase()}`;
      const now = new Date();
      const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const count = await databaseAdapter.count('Invoice', {});
      const invoiceNumber = `${yearMonth}-${String(count + 1).padStart(4, '0')}`;

      await databaseAdapter.create('Invoice', {
        invoiceId,
        invoiceNumber,
        companyId: customerMapping.companyId,
        stripeInvoiceId: stripeInvoice.id,
        hostedInvoiceUrl: stripeInvoice.hosted_invoice_url,
        status: 'paid',
        currency: (stripeInvoice.currency || 'usd').toUpperCase(),
        subtotal: (stripeInvoice.subtotal || 0) / 100,
        total: (stripeInvoice.total || 0) / 100,
        amount: (stripeInvoice.amount_paid || 0) / 100,
        amountPaid: (stripeInvoice.amount_paid || 0) / 100,
        amountDue: 0,
        taxAmount: (stripeInvoice.tax || 0) / 100,
        paidAt: new Date().toISOString(),
        issueDate: new Date().toISOString(),
        dueDate: stripeInvoice.due_date
          ? new Date(stripeInvoice.due_date * 1000).toISOString()
          : new Date().toISOString()
      });
    }
  }

  /**
   * Handle invoice.payment_failed webhook
   * @private
   */
  static async _handleInvoicePaymentFailed(stripeInvoice) {
    const customerMapping = await databaseAdapter.findOne('StripeCustomer', {
      stripeCustomerId: stripeInvoice.customer
    });

    if (!customerMapping) return;

    // Update subscription status to past_due
    const subscription = await databaseAdapter.findOne('Subscription', {
      companyId: customerMapping.companyId,
      status: { $in: ['active', 'trialing'] }
    });

    if (subscription) {
      await databaseAdapter.findByIdAndUpdate('Subscription', subscription._id, {
        status: 'past_due'
      });
    }
  }

  /**
   * Calculate due date (30 days from now)
   * @private
   */
  static _calculateDueDate() {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date;
  }
}

module.exports = BillingService;

/**
 * Invoice Model
 * Issue #201: Enhance Billing Dashboard APIs
 *
 * Data model for managing invoices including:
 * - Invoice lifecycle (draft, sent, paid, overdue, void, refunded)
 * - Line items and billing details
 * - Payment tracking
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid invoice statuses
const VALID_STATUSES = ['draft', 'sent', 'paid', 'overdue', 'void', 'refunded'];

// Valid ISO currency codes
const VALID_CURRENCY_CODES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'CHF', 'BRL'];

// Status transition map
const STATUS_TRANSITIONS = {
  draft: ['sent', 'void'],
  sent: ['paid', 'overdue', 'void'],
  overdue: ['paid', 'void'],
  paid: ['refunded'],
  void: [],
  refunded: []
};

// Currency symbols
const CURRENCY_SYMBOLS = {
  'USD': '$',
  'EUR': '\u20AC',
  'GBP': '\u00A3',
  'CAD': 'CA$',
  'AUD': 'A$',
  'JPY': '\u00A5',
  'CNY': '\u00A5',
  'INR': '\u20B9',
  'CHF': 'CHF',
  'BRL': 'R$'
};

// Schema definition for documentation and validation
const invoiceSchema = {
  invoiceId: { type: 'string', required: true, unique: true },
  companyId: { type: 'string', required: true },
  invoiceNumber: { type: 'string', required: true },
  status: { type: 'string', enum: VALID_STATUSES, default: 'draft' },
  currency: { type: 'string', default: 'USD' },
  lineItems: { type: 'array', default: [] },
  subtotal: { type: 'number', required: true },
  taxAmount: { type: 'number', default: 0 },
  discountAmount: { type: 'number', default: 0 },
  total: { type: 'number', required: true },
  amount: { type: 'number', required: true },
  amountPaid: { type: 'number', default: 0 },
  amountDue: { type: 'number', default: 0 },
  billingDetails: {
    type: 'object',
    default: {
      name: null,
      email: null,
      company: null,
      phone: null,
      address: {
        line1: null,
        line2: null,
        city: null,
        state: null,
        postalCode: null,
        country: null
      }
    }
  },
  issueDate: { type: 'date', default: null },
  dueDate: { type: 'date', default: null },
  paidAt: { type: 'date', default: null },
  paymentId: { type: 'string', default: null },
  paymentMethod: { type: 'string', default: null },
  subscriptionId: { type: 'string', default: null },
  stripeInvoiceId: { type: 'string', default: null },
  hostedInvoiceUrl: { type: 'string', default: null },
  notes: { type: 'string', default: '' },
  metadata: { type: 'object', default: {} },
  createdBy: { type: 'string', default: null },
  updatedBy: { type: 'string', default: null },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('invoices', invoiceSchema);

// Extended Invoice model with business logic
const Invoice = {
  ...baseModel,
  tableName: 'invoices',
  schema: invoiceSchema,

  // Export constants
  VALID_STATUSES,
  VALID_CURRENCY_CODES,
  STATUS_TRANSITIONS,
  CURRENCY_SYMBOLS,

  /**
   * Create a new invoice with defaults
   * @param {Object} data - Invoice data
   * @returns {Object} Created invoice
   */
  async create(data) {
    if (!data.invoiceId) {
      data.invoiceId = `inv_${uuidv4()}`;
    }

    if (!data.status) {
      data.status = 'draft';
    }

    if (!data.currency) {
      data.currency = 'USD';
    } else {
      data.currency = data.currency.toUpperCase();
      if (!VALID_CURRENCY_CODES.includes(data.currency)) {
        throw new Error(`${data.currency} is not a valid ISO currency code`);
      }
    }

    if (!data.issueDate) {
      data.issueDate = new Date().toISOString();
    }

    if (!data.dueDate) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      data.dueDate = dueDate.toISOString();
    }

    if (data.amountDue === undefined || data.amountDue === null) {
      data.amountDue = data.total || data.amount || 0;
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find invoice by invoiceId
   * @param {string} invoiceId - Invoice ID
   * @returns {Object|null} Invoice or null
   */
  async findByInvoiceId(invoiceId) {
    return baseModel.findOne.call(baseModel, { invoiceId });
  },

  /**
   * Find invoice by Stripe Invoice ID
   * @param {string} stripeInvoiceId - Stripe Invoice ID
   * @returns {Object|null} Invoice or null
   */
  async findByStripeInvoiceId(stripeInvoiceId) {
    return baseModel.findOne.call(baseModel, { stripeInvoiceId });
  },

  /**
   * Find invoices by company
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Array} Invoices for company
   */
  async findByCompany(companyId, options = {}) {
    const query = { companyId };
    if (options.status) {
      query.status = options.status;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Check if invoice is overdue
   * @param {Object} invoice - Invoice object
   * @returns {boolean} True if overdue
   */
  isOverdue(invoice) {
    if (['paid', 'void', 'refunded'].includes(invoice.status)) {
      return false;
    }
    if (!invoice.dueDate) {
      return false;
    }
    return new Date() > new Date(invoice.dueDate);
  },

  /**
   * Get days until due (negative if overdue)
   * @param {Object} invoice - Invoice object
   * @returns {number|null} Days until due
   */
  getDaysUntilDue(invoice) {
    if (!invoice.dueDate) {
      return null;
    }
    const now = new Date();
    const due = new Date(invoice.dueDate);
    const diff = due - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  },

  /**
   * Mark invoice as paid
   * @param {string} invoiceId - Invoice ID
   * @param {string} paymentId - Payment reference ID
   * @param {string} paymentMethod - Payment method used
   * @returns {Object} Updated invoice
   */
  async markAsPaid(invoiceId, paymentId, paymentMethod) {
    const invoice = await this.findByInvoiceId(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    return baseModel.updateOne.call(baseModel,
      { invoiceId },
      {
        $set: {
          status: 'paid',
          amountPaid: invoice.total || invoice.amount,
          amountDue: 0,
          paymentId,
          paymentMethod,
          paidAt: new Date().toISOString()
        }
      }
    );
  },

  /**
   * Void the invoice
   * @param {string} invoiceId - Invoice ID
   * @param {string} reason - Reason for voiding
   * @returns {Object} Updated invoice
   */
  async voidInvoice(invoiceId, reason) {
    const invoice = await this.findByInvoiceId(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    if (invoice.status === 'paid') {
      throw new Error('Cannot void a paid invoice');
    }

    const metadata = invoice.metadata || {};
    metadata.voidReason = reason;
    metadata.voidedAt = new Date().toISOString();

    return baseModel.updateOne.call(baseModel,
      { invoiceId },
      { $set: { status: 'void', metadata } }
    );
  },

  /**
   * Get formatted amount with currency symbol
   * @param {Object} invoice - Invoice object
   * @returns {string} Formatted amount
   */
  getFormattedAmount(invoice) {
    const symbol = CURRENCY_SYMBOLS[invoice.currency] || '';
    const amount = invoice.total || invoice.amount || 0;
    return `${symbol}${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  },

  /**
   * Get valid status transitions
   * @returns {Object} Status transition map
   */
  getValidStatusTransitions() {
    return STATUS_TRANSITIONS;
  },

  /**
   * Check if status transition is valid
   * @param {string} fromStatus - Current status
   * @param {string} toStatus - Target status
   * @returns {boolean} Whether transition is valid
   */
  isValidStatusTransition(fromStatus, toStatus) {
    const validTransitions = STATUS_TRANSITIONS[fromStatus];
    return validTransitions && validTransitions.includes(toStatus);
  },

  // Expose base model methods
  find: baseModel.find.bind(baseModel),
  findOne: baseModel.findOne.bind(baseModel),
  findById: baseModel.findById.bind(baseModel),
  updateOne: baseModel.updateOne.bind(baseModel),
  updateMany: baseModel.updateMany.bind(baseModel),
  findOneAndUpdate: baseModel.findOneAndUpdate.bind(baseModel),
  findByIdAndUpdate: baseModel.findByIdAndUpdate.bind(baseModel),
  deleteOne: baseModel.deleteOne.bind(baseModel),
  deleteMany: baseModel.deleteMany.bind(baseModel),
  findOneAndDelete: baseModel.findOneAndDelete.bind(baseModel),
  findByIdAndDelete: baseModel.findByIdAndDelete.bind(baseModel),
  countDocuments: baseModel.countDocuments.bind(baseModel),
  exists: baseModel.exists.bind(baseModel),
  distinct: baseModel.distinct.bind(baseModel),
  aggregate: baseModel.aggregate.bind(baseModel)
};

module.exports = Invoice;

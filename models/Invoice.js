/**
 * Invoice Model
 * Issue #201: Enhance Billing Dashboard APIs
 *
 * Data model for managing invoices including:
 * - Invoice lifecycle (draft, sent, paid, overdue, void, refunded)
 * - Line items and billing details
 * - Payment tracking
 */

const mongoose = require('mongoose');

// Valid invoice statuses
const validStatuses = ['draft', 'sent', 'paid', 'overdue', 'void', 'refunded'];

// Valid ISO currency codes
const validCurrencyCodes = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'CHF', 'BRL'];

// Status transition map
const statusTransitions = {
  draft: ['sent', 'void'],
  sent: ['paid', 'overdue', 'void'],
  overdue: ['paid', 'void'],
  paid: ['refunded'],
  void: [],
  refunded: []
};

// Line item schema
const lineItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  taxRate: {
    type: Number,
    default: 0,
    min: 0
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  }
}, { _id: false });

// Billing details schema
const billingDetailsSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String },
  company: { type: String },
  phone: { type: String },
  address: {
    line1: { type: String },
    line2: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    country: { type: String }
  }
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  // Unique identifier for the invoice
  invoiceId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Company this invoice belongs to
  companyId: {
    type: String,
    required: true,
    index: true
  },

  // Invoice number (human-readable)
  invoiceNumber: {
    type: String,
    required: true,
    index: true
  },

  // Invoice status
  status: {
    type: String,
    enum: validStatuses,
    default: 'draft',
    index: true
  },

  // Currency
  currency: {
    type: String,
    uppercase: true,
    default: 'USD',
    validate: {
      validator: function(v) {
        return validCurrencyCodes.includes(v.toUpperCase());
      },
      message: props => `${props.value} is not a valid ISO currency code`
    }
  },

  // Line items
  lineItems: [lineItemSchema],

  // Amounts
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  amountPaid: {
    type: Number,
    default: 0,
    min: 0
  },
  amountDue: {
    type: Number,
    default: function() {
      return this.total || this.amount || 0;
    },
    min: 0
  },

  // Billing details
  billingDetails: billingDetailsSchema,

  // Dates
  issueDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    default: function() {
      const date = new Date();
      date.setDate(date.getDate() + 30); // Default 30 days payment term
      return date;
    }
  },
  paidAt: {
    type: Date
  },

  // Payment details
  paymentId: {
    type: String,
    index: true
  },
  paymentMethod: {
    type: String
  },

  // Subscription reference
  subscriptionId: {
    type: String,
    index: true
  },

  // Notes and metadata
  notes: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Audit fields
  createdBy: {
    type: String
  },
  updatedBy: {
    type: String
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
invoiceSchema.index({ companyId: 1, status: 1 });
invoiceSchema.index({ companyId: 1, createdAt: -1 });
invoiceSchema.index({ dueDate: 1, status: 1 });

// Virtual for checking if invoice is overdue
invoiceSchema.virtual('isOverdue').get(function() {
  if (this.status === 'paid' || this.status === 'void' || this.status === 'refunded') {
    return false;
  }
  if (!this.dueDate) {
    return false;
  }
  return new Date() > new Date(this.dueDate);
});

// Virtual for days until due (negative if overdue)
invoiceSchema.virtual('daysUntilDue').get(function() {
  if (!this.dueDate) {
    return null;
  }
  const now = new Date();
  const due = new Date(this.dueDate);
  const diff = due - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

/**
 * Mark invoice as paid
 * @param {string} paymentId - Payment reference ID
 * @param {string} paymentMethod - Payment method used
 */
invoiceSchema.methods.markAsPaid = function(paymentId, paymentMethod) {
  this.status = 'paid';
  this.amountPaid = this.total || this.amount;
  this.amountDue = 0;
  this.paymentId = paymentId;
  this.paymentMethod = paymentMethod;
  this.paidAt = new Date();
};

/**
 * Void the invoice
 * @param {string} reason - Reason for voiding
 */
invoiceSchema.methods.voidInvoice = function(reason) {
  if (this.status === 'paid') {
    throw new Error('Cannot void a paid invoice');
  }
  this.status = 'void';
  this.metadata = this.metadata || {};
  this.metadata.voidReason = reason;
  this.metadata.voidedAt = new Date();
};

/**
 * Get formatted amount with currency symbol
 * @returns {string} Formatted amount
 */
invoiceSchema.methods.getFormattedAmount = function() {
  const currencySymbols = {
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

  const symbol = currencySymbols[this.currency] || '';
  const amount = this.total || this.amount || 0;
  return `${symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

/**
 * Get valid status transitions
 * @static
 * @returns {Object} Status transition map
 */
invoiceSchema.statics.getValidStatusTransitions = function() {
  return statusTransitions;
};

/**
 * Check if status transition is valid
 * @static
 * @param {string} fromStatus - Current status
 * @param {string} toStatus - Target status
 * @returns {boolean} Whether transition is valid
 */
invoiceSchema.statics.isValidStatusTransition = function(fromStatus, toStatus) {
  const validTransitions = statusTransitions[fromStatus];
  return validTransitions && validTransitions.includes(toStatus);
};

// Ensure virtuals are included in JSON
invoiceSchema.set('toJSON', { virtuals: true });
invoiceSchema.set('toObject', { virtuals: true });

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;

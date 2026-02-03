/**
 * Payment Model
 * Feature: Issue #116 - Integrate Payment Processing
 *
 * Stores payment records for financial transactions
 */

const mongoose = require('mongoose');

// Valid payment statuses
const validPaymentStatuses = ['pending', 'processing', 'succeeded', 'failed', 'refunded'];

// Valid payment methods
const validPaymentMethods = ['card', 'bank_transfer', 'invoice'];

// Valid ISO currency codes
const validCurrencyCodes = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'CHF', 'BRL'];

const paymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  companyId: {
    type: String,
    required: true,
    index: true
  },
  customerId: {
    type: String,
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    validate: {
      validator: function(v) {
        return v > 0;
      },
      message: 'Amount must be a positive number'
    }
  },
  currency: {
    type: String,
    required: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        return validCurrencyCodes.includes(v.toUpperCase());
      },
      message: props => `${props.value} is not a valid ISO currency code`
    }
  },
  status: {
    type: String,
    required: true,
    enum: validPaymentStatuses,
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: validPaymentMethods
  },
  stripePaymentIntentId: {
    type: String,
    default: null,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  description: {
    type: String,
    default: ''
  },
  receiptUrl: {
    type: String,
    default: null
  },
  invoiceId: {
    type: String,
    default: null,
    index: true
  },
  refundedAmount: {
    type: Number,
    default: 0
  },
  failureReason: {
    type: String,
    default: null
  },
  processedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Create compound indexes for frequent query patterns
paymentSchema.index({ companyId: 1, createdAt: -1 });
paymentSchema.index({ customerId: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });

/**
 * Get the net amount after any refunds
 * @returns {Number} Net amount
 */
paymentSchema.methods.getNetAmount = function() {
  return this.amount - (this.refundedAmount || 0);
};

/**
 * Check if payment can be refunded
 * @returns {Boolean} Whether payment can be refunded
 */
paymentSchema.methods.canRefund = function() {
  return this.status === 'succeeded' && this.getNetAmount() > 0;
};

/**
 * Get formatted amount with currency symbol
 * @returns {String} Formatted amount with currency symbol
 */
paymentSchema.methods.getFormattedAmount = function() {
  const currencySymbols = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'CAD': 'CA$',
    'AUD': 'A$',
    'JPY': '¥',
    'CNY': '¥',
    'INR': '₹',
    'CHF': 'CHF',
    'BRL': 'R$'
  };

  const symbol = currencySymbols[this.currency] || '';
  return `${symbol}${this.amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

// Pre-save hook to set processedAt timestamp when status changes to succeeded
paymentSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'succeeded' && !this.processedAt) {
    this.processedAt = new Date();
  }
  next();
});

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;

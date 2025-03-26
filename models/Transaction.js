/**
 * Transaction Model
 * Feature: OCDI-103: Create Transaction data model
 */

const mongoose = require('mongoose');

// Valid ISO currency codes
const validCurrencyCodes = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'CHF', 'BRL'];

// Valid transaction types
const validTransactionTypes = ['payment', 'refund', 'payout', 'deposit', 'withdrawal', 'transfer', 'fee', 'adjustment'];

// Valid transaction statuses
const validTransactionStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'declined'];

// Transaction fees schema
const transactionFeesSchema = new mongoose.Schema({
  processingFee: { type: Number, default: 0 },
  platformFee: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  otherFees: { type: Number, default: 0 }
}, { _id: false });

// Transaction schema
const transactionSchema = new mongoose.Schema({
  transactionId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  userId: { 
    type: String, 
    required: true,
    index: true
  },
  companyId: { 
    type: String,
    index: true
  },
  accountId: { 
    type: String,
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
        return validCurrencyCodes.includes(v);
      },
      message: props => `${props.value} is not a valid ISO currency code`
    }
  },
  type: { 
    type: String, 
    required: true,
    enum: validTransactionTypes
  },
  status: { 
    type: String, 
    required: true,
    enum: validTransactionStatuses
  },
  description: { 
    type: String,
    default: ''
  },
  metadata: { 
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  fees: {
    type: transactionFeesSchema,
    default: () => ({})
  },
  relatedTransactions: [{
    type: String,
    ref: 'Transaction'
  }],
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'bank_transfer', 'wallet', 'cash', 'other'],
    default: 'other'
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
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ companyId: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ type: 1, createdAt: -1 });

/**
 * Get the net amount of the transaction after fees
 * @returns {Number} Net amount
 */
transactionSchema.methods.getNetAmount = function() {
  const totalFees = (this.fees.processingFee || 0) + 
                   (this.fees.platformFee || 0) + 
                   (this.fees.taxAmount || 0) + 
                   (this.fees.otherFees || 0);
  return this.amount - totalFees;
};

/**
 * Get formatted amount with currency symbol
 * @returns {String} Formatted amount with currency symbol
 */
transactionSchema.methods.getFormattedAmount = function() {
  // Currency symbol mapping
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

// Pre-save hook to set processedAt timestamp when status changes to completed
transactionSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'completed' && !this.processedAt) {
    this.processedAt = new Date();
  }
  next();
});

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;

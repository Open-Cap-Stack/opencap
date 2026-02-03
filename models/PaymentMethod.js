/**
 * PaymentMethod Model
 * Feature: Issue #116 - Integrate Payment Processing
 *
 * Stores customer payment methods (cards, bank accounts, etc.)
 */

const mongoose = require('mongoose');

// Valid payment method types
const validMethodTypes = ['card', 'bank_account'];

// Valid payment method statuses
const validStatuses = ['active', 'inactive', 'expired'];

// Valid card brands
const validCardBrands = ['visa', 'mastercard', 'amex', 'discover', 'diners', 'jcb', 'unionpay', 'unknown'];

const paymentMethodSchema = new mongoose.Schema({
  methodId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  customerId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: validMethodTypes
  },
  last4: {
    type: String,
    required: true,
    minlength: 4,
    maxlength: 4
  },
  brand: {
    type: String,
    enum: validCardBrands,
    default: 'unknown'
  },
  expiryMonth: {
    type: Number,
    min: 1,
    max: 12
  },
  expiryYear: {
    type: Number,
    min: 2020
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: validStatuses,
    default: 'active'
  },
  billingDetails: {
    name: { type: String },
    email: { type: String },
    phone: { type: String },
    address: {
      line1: { type: String },
      line2: { type: String },
      city: { type: String },
      state: { type: String },
      postalCode: { type: String },
      country: { type: String }
    }
  },
  stripePaymentMethodId: {
    type: String,
    default: null,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Create compound indexes for frequent query patterns
paymentMethodSchema.index({ customerId: 1, isDefault: -1 });
paymentMethodSchema.index({ customerId: 1, status: 1 });

/**
 * Check if payment method is expired
 * @returns {Boolean} Whether payment method is expired
 */
paymentMethodSchema.methods.isExpired = function() {
  if (this.type !== 'card' || !this.expiryMonth || !this.expiryYear) {
    return false;
  }

  const now = new Date();
  const expiry = new Date(this.expiryYear, this.expiryMonth, 0); // Last day of expiry month

  return now > expiry;
};

/**
 * Get masked card/account number display
 * @returns {String} Masked number
 */
paymentMethodSchema.methods.getMaskedDisplay = function() {
  if (this.type === 'card') {
    return `**** **** **** ${this.last4}`;
  }
  return `****${this.last4}`;
};

/**
 * Get display label for the payment method
 * @returns {String} Display label
 */
paymentMethodSchema.methods.getDisplayLabel = function() {
  if (this.type === 'card') {
    const brandName = this.brand ? this.brand.charAt(0).toUpperCase() + this.brand.slice(1) : 'Card';
    return `${brandName} ending in ${this.last4}`;
  }
  return `Bank account ending in ${this.last4}`;
};

// Pre-save hook to check expiry and update status
paymentMethodSchema.pre('save', function(next) {
  if (this.type === 'card' && this.isExpired()) {
    this.status = 'expired';
  }
  next();
});

const PaymentMethod = mongoose.model('PaymentMethod', paymentMethodSchema);

module.exports = PaymentMethod;

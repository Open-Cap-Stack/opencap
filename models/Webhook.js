/**
 * Webhook Model
 * Issue #118: Build Webhook System
 *
 * Data model for webhook configurations supporting:
 * - Event subscriptions for external integrations
 * - Signature verification for security
 * - Retry configuration for failed deliveries
 */
const mongoose = require('mongoose');

const retryConfigSchema = new mongoose.Schema({
  maxRetries: {
    type: Number,
    default: 3,
    min: 0,
    max: 10
  },
  retryDelay: {
    type: Number,
    default: 60000, // 1 minute in milliseconds
    min: 1000,
    max: 3600000 // Max 1 hour
  }
}, { _id: false });

const webhookSchema = new mongoose.Schema({
  webhookId: {
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

  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },

  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },

  url: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        try {
          const url = new URL(v);
          return url.protocol === 'https:' || url.protocol === 'http:';
        } catch {
          return false;
        }
      },
      message: 'Invalid webhook URL'
    }
  },

  secret: {
    type: String,
    required: true
  },

  events: [{
    type: String,
    enum: [
      // Stakeholder events
      'stakeholder.created',
      'stakeholder.updated',
      'stakeholder.deleted',
      // Share class events
      'share_class.created',
      'share_class.updated',
      'share_class.deleted',
      // Document events
      'document.created',
      'document.updated',
      'document.signed',
      'document.deleted',
      // Equity events
      'equity.granted',
      'equity.vested',
      'equity.exercised',
      'equity.cancelled',
      // Transaction events
      'transaction.created',
      'transaction.completed',
      'transaction.cancelled',
      // Company events
      'company.updated',
      'company.valuation_changed',
      // Compliance events
      'compliance.report_generated',
      'compliance.alert',
      // Test event
      'webhook.test'
    ]
  }],

  status: {
    type: String,
    enum: ['active', 'paused', 'failed'],
    default: 'active',
    index: true
  },

  retryConfig: {
    type: retryConfigSchema,
    default: () => ({
      maxRetries: 3,
      retryDelay: 60000
    })
  },

  headers: {
    type: Map,
    of: String,
    default: {}
  },

  lastTriggeredAt: {
    type: Date,
    default: null
  },

  failureCount: {
    type: Number,
    default: 0,
    min: 0
  },

  // Metadata
  createdBy: {
    type: String
  },

  updatedBy: {
    type: String
  },

  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
webhookSchema.index({ companyId: 1, status: 1 });
webhookSchema.index({ companyId: 1, events: 1 });
webhookSchema.index({ status: 1, lastTriggeredAt: 1 });

// Pre-save hook to ensure events is not empty
webhookSchema.pre('save', function(next) {
  if (!this.events || this.events.length === 0) {
    const error = new Error('At least one event type is required');
    return next(error);
  }
  next();
});

// Virtual for checking if webhook is operational
webhookSchema.virtual('isOperational').get(function() {
  return this.status === 'active' && this.failureCount < 10;
});

// Method to check if webhook is subscribed to an event
webhookSchema.methods.isSubscribedTo = function(eventType) {
  return this.events.includes(eventType);
};

// Method to increment failure count
webhookSchema.methods.incrementFailureCount = function() {
  this.failureCount += 1;
  if (this.failureCount >= 10) {
    this.status = 'failed';
  }
  return this.save();
};

// Method to reset failure count
webhookSchema.methods.resetFailureCount = function() {
  this.failureCount = 0;
  if (this.status === 'failed') {
    this.status = 'active';
  }
  return this.save();
};

// Ensure virtuals are included in JSON
webhookSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    // Remove sensitive data from JSON output
    delete ret.secret;
    return ret;
  }
});
webhookSchema.set('toObject', { virtuals: true });

const Webhook = mongoose.model('Webhook', webhookSchema);

module.exports = Webhook;

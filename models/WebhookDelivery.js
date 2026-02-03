/**
 * WebhookDelivery Model
 * Issue #118: Build Webhook System
 *
 * Data model for tracking webhook delivery attempts including:
 * - Delivery status and response tracking
 * - Retry management with exponential backoff
 * - Delivery history and audit trail
 */
const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  body: {
    type: String,
    default: null
  },
  headers: {
    type: Map,
    of: String,
    default: null
  },
  error: {
    type: String,
    default: null
  }
}, { _id: false });

const webhookDeliverySchema = new mongoose.Schema({
  deliveryId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  webhookId: {
    type: String,
    required: true,
    index: true
  },

  eventType: {
    type: String,
    required: true,
    index: true
  },

  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  response: {
    type: responseSchema,
    default: () => ({
      body: null,
      headers: null,
      error: null
    })
  },

  statusCode: {
    type: Number,
    default: null
  },

  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending',
    index: true
  },

  attempts: {
    type: Number,
    default: 0,
    min: 0
  },

  nextRetryAt: {
    type: Date,
    default: null,
    index: true
  },

  completedAt: {
    type: Date,
    default: null
  },

  // Request details for debugging
  requestHeaders: {
    type: Map,
    of: String
  },

  requestUrl: {
    type: String
  },

  // Duration in milliseconds
  duration: {
    type: Number,
    default: null
  },

  // Metadata for tracking
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
webhookDeliverySchema.index({ webhookId: 1, status: 1 });
webhookDeliverySchema.index({ webhookId: 1, createdAt: -1 });
webhookDeliverySchema.index({ status: 1, nextRetryAt: 1 });
webhookDeliverySchema.index({ eventType: 1, status: 1 });

// Virtual for checking if delivery can be retried
webhookDeliverySchema.virtual('canRetry').get(function() {
  return this.status === 'failed' && this.nextRetryAt !== null;
});

// Virtual for checking if delivery is overdue for retry
webhookDeliverySchema.virtual('isRetryDue').get(function() {
  if (!this.canRetry) return false;
  return new Date() >= this.nextRetryAt;
});

// Method to mark delivery as successful
webhookDeliverySchema.methods.markSuccess = function(statusCode, responseBody, responseHeaders, duration) {
  this.status = 'success';
  this.statusCode = statusCode;
  this.response = {
    body: typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody),
    headers: responseHeaders || null,
    error: null
  };
  this.completedAt = new Date();
  this.nextRetryAt = null;
  this.duration = duration;
  this.attempts += 1;
  return this.save();
};

// Method to mark delivery as failed
webhookDeliverySchema.methods.markFailed = function(error, statusCode, nextRetryAt) {
  this.status = 'failed';
  this.statusCode = statusCode || null;
  this.response = {
    body: null,
    headers: null,
    error: error?.message || error || 'Unknown error'
  };
  this.attempts += 1;
  this.nextRetryAt = nextRetryAt || null;

  if (!nextRetryAt) {
    this.completedAt = new Date();
  }

  return this.save();
};

// Method to calculate next retry time with exponential backoff
webhookDeliverySchema.methods.calculateNextRetry = function(baseDelay, maxRetries) {
  if (this.attempts >= maxRetries) {
    return null;
  }

  // Exponential backoff: baseDelay * 2^attempts
  const backoffDelay = baseDelay * Math.pow(2, this.attempts);
  const maxDelay = 3600000; // Max 1 hour
  const actualDelay = Math.min(backoffDelay, maxDelay);

  return new Date(Date.now() + actualDelay);
};

// Static method to find deliveries due for retry
webhookDeliverySchema.statics.findDueForRetry = function() {
  return this.find({
    status: 'failed',
    nextRetryAt: { $lte: new Date(), $ne: null }
  }).sort({ nextRetryAt: 1 });
};

// Static method to get delivery statistics for a webhook
webhookDeliverySchema.statics.getStatistics = async function(webhookId, startDate, endDate) {
  const match = { webhookId };

  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = startDate;
    if (endDate) match.createdAt.$lte = endDate;
  }

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgDuration: { $avg: '$duration' }
      }
    }
  ]);

  const result = {
    total: 0,
    success: 0,
    failed: 0,
    pending: 0,
    avgDuration: 0
  };

  let totalDuration = 0;
  let durationCount = 0;

  for (const stat of stats) {
    result[stat._id] = stat.count;
    result.total += stat.count;
    if (stat.avgDuration) {
      totalDuration += stat.avgDuration * stat.count;
      durationCount += stat.count;
    }
  }

  result.avgDuration = durationCount > 0 ? totalDuration / durationCount : 0;
  result.successRate = result.total > 0 ? (result.success / result.total) * 100 : 0;

  return result;
};

// Ensure virtuals are included in JSON
webhookDeliverySchema.set('toJSON', { virtuals: true });
webhookDeliverySchema.set('toObject', { virtuals: true });

const WebhookDelivery = mongoose.model('WebhookDelivery', webhookDeliverySchema);

module.exports = WebhookDelivery;

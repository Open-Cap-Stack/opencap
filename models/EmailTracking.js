/**
 * EmailTracking Model
 *
 * Issue #87: Implement Email Delivery Tracking
 *
 * Data model for tracking email delivery status, engagement metrics,
 * and provider webhooks. Supports open/click tracking with pixel
 * and link tracking, bounce handling, and engagement analytics.
 */

const mongoose = require('mongoose');

/**
 * Schema for tracking individual open events
 */
const OpenEventSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  location: {
    country: String,
    region: String,
    city: String
  }
}, { _id: false });

/**
 * Schema for tracking individual click events
 */
const ClickEventSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  url: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  location: {
    country: String,
    region: String,
    city: String
  }
}, { _id: false });

/**
 * Main EmailTracking Schema
 */
const EmailTrackingSchema = new mongoose.Schema({
  // Unique email identifier
  trackingId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // External message ID from email provider
  messageId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Recipient information
  recipientEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },

  // Sender information
  senderEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },

  // Email subject
  subject: {
    type: String,
    required: true
  },

  // Template used (if any)
  templateId: {
    type: String,
    index: true
  },

  // Company association
  companyId: {
    type: String,
    index: true
  },

  // User who triggered the email
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Email provider (sendgrid, mailgun, ses, etc.)
  provider: {
    type: String,
    enum: ['sendgrid', 'mailgun', 'ses', 'postmark', 'sparkpost', 'other'],
    default: 'other'
  },

  // Delivery status
  status: {
    type: String,
    enum: ['queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'spam', 'unsubscribed', 'deferred'],
    default: 'queued',
    index: true
  },

  // Tracking URLs
  trackingPixelUrl: {
    type: String
  },

  // Important timestamps
  queuedAt: {
    type: Date,
    default: Date.now
  },
  sentAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  firstOpenedAt: {
    type: Date
  },
  lastOpenedAt: {
    type: Date
  },
  firstClickedAt: {
    type: Date
  },
  lastClickedAt: {
    type: Date
  },

  // Open tracking
  opens: [OpenEventSchema],
  openCount: {
    type: Number,
    default: 0
  },

  // Click tracking
  clicks: [ClickEventSchema],
  clickCount: {
    type: Number,
    default: 0
  },
  uniqueUrlsClicked: [{
    type: String
  }],

  // Bounce information
  bounceType: {
    type: String,
    enum: ['hard', 'soft', 'undetermined', null],
    default: null
  },
  bounceReason: {
    type: String
  },
  bounceCode: {
    type: String
  },
  bouncedAt: {
    type: Date
  },

  // Spam/complaint information
  spamReportedAt: {
    type: Date
  },
  spamReason: {
    type: String
  },

  // Unsubscribe information
  unsubscribedAt: {
    type: Date
  },
  unsubscribeReason: {
    type: String
  },

  // Failure information
  failureReason: {
    type: String
  },
  failedAt: {
    type: Date
  },

  // Provider-specific data
  providerMetadata: {
    type: mongoose.Schema.Types.Mixed
  },

  // Tags for categorization
  tags: [{
    type: String
  }],

  // Custom metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  collection: 'email_tracking'
});

// Indexes for common queries
EmailTrackingSchema.index({ companyId: 1, createdAt: -1 });
EmailTrackingSchema.index({ recipientEmail: 1, createdAt: -1 });
EmailTrackingSchema.index({ status: 1, createdAt: -1 });
EmailTrackingSchema.index({ templateId: 1, createdAt: -1 });
EmailTrackingSchema.index({ companyId: 1, status: 1 });
EmailTrackingSchema.index({ createdAt: -1 }); // For cleanup jobs

// Pre-save hook to generate trackingId if not provided
EmailTrackingSchema.pre('save', function(next) {
  if (!this.trackingId) {
    this.trackingId = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

// Virtual for calculating engagement score
EmailTrackingSchema.virtual('engagementScore').get(function() {
  let score = 0;
  if (this.status === 'delivered' || this.status === 'opened' || this.status === 'clicked') {
    score += 1;
  }
  if (this.openCount > 0) {
    score += Math.min(this.openCount, 5); // Cap at 5 opens
  }
  if (this.clickCount > 0) {
    score += this.clickCount * 2; // Clicks are more valuable
  }
  return score;
});

// Instance method to check if email was engaged
EmailTrackingSchema.methods.isEngaged = function() {
  return this.openCount > 0 || this.clickCount > 0;
};

// Instance method to get delivery time
EmailTrackingSchema.methods.getDeliveryTime = function() {
  if (this.deliveredAt && this.sentAt) {
    return this.deliveredAt - this.sentAt;
  }
  return null;
};

// Static method to get delivery stats for a company
EmailTrackingSchema.statics.getDeliveryStats = async function(companyId, startDate, endDate) {
  const match = { companyId };
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = startDate;
    if (endDate) match.createdAt.$lte = endDate;
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalOpens: { $sum: '$openCount' },
        totalClicks: { $sum: '$clickCount' }
      }
    }
  ]);
};

module.exports = mongoose.model('EmailTracking', EmailTrackingSchema);

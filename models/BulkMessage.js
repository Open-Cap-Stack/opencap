/**
 * BulkMessage Model
 * Issue #86: Create Bulk Messaging System
 *
 * Data model for bulk messaging with templates, scheduling,
 * recipient management, and delivery tracking.
 */
const mongoose = require('mongoose');

const MESSAGE_TYPES = ['email', 'sms', 'notification', 'in-app'];
const STATUSES = ['draft', 'scheduled', 'processing', 'sent', 'partially_sent', 'failed', 'cancelled'];
const FILTER_TYPES = ['all', 'role', 'company', 'custom'];
const RECIPIENT_STATUSES = ['pending', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked'];

/**
 * Recipient Schema - tracks delivery status for each recipient
 */
const RecipientSchema = new mongoose.Schema({
  stakeholderId: {
    type: String,
    required: true
  },
  name: {
    type: String
  },
  email: {
    type: String
  },
  phone: {
    type: String
  },
  status: {
    type: String,
    enum: RECIPIENT_STATUSES,
    default: 'pending'
  },
  sentAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  openedAt: {
    type: Date
  },
  clickedAt: {
    type: Date
  },
  errorMessage: {
    type: String
  },
  retryCount: {
    type: Number,
    default: 0
  }
}, { _id: false });

/**
 * Recipient Filter Schema - defines how recipients are selected
 */
const RecipientFilterSchema = new mongoose.Schema({
  filterType: {
    type: String,
    enum: FILTER_TYPES,
    required: true
  },
  roles: [{
    type: String
  }],
  companyIds: [{
    type: String
  }],
  stakeholderIds: [{
    type: String
  }],
  customQuery: {
    type: mongoose.Schema.Types.Mixed
  }
}, { _id: false });

/**
 * Rate Limiting Schema - controls batch sending
 */
const RateLimitingSchema = new mongoose.Schema({
  batchSize: {
    type: Number,
    default: 100,
    min: 1,
    max: 1000
  },
  delayBetweenBatches: {
    type: Number,
    default: 500,
    min: 0,
    max: 60000
  }
}, { _id: false });

/**
 * Delivery Stats Schema - aggregated delivery statistics
 */
const DeliveryStatsSchema = new mongoose.Schema({
  totalRecipients: {
    type: Number,
    default: 0
  },
  sent: {
    type: Number,
    default: 0
  },
  delivered: {
    type: Number,
    default: 0
  },
  failed: {
    type: Number,
    default: 0
  },
  bounced: {
    type: Number,
    default: 0
  },
  opened: {
    type: Number,
    default: 0
  },
  clicked: {
    type: Number,
    default: 0
  }
}, { _id: false });

/**
 * BulkMessage Schema
 */
const BulkMessageSchema = new mongoose.Schema({
  bulkMessageId: {
    type: String,
    required: [true, 'bulkMessageId is required'],
    unique: true,
    trim: true
  },
  companyId: {
    type: String,
    required: [true, 'companyId is required'],
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'senderId is required'],
    ref: 'User'
  },
  subject: {
    type: String,
    required: [true, 'subject is required'],
    trim: true,
    maxlength: [500, 'Subject cannot exceed 500 characters']
  },
  content: {
    type: String,
    required: [true, 'content is required'],
    maxlength: [50000, 'Content cannot exceed 50000 characters']
  },
  messageType: {
    type: String,
    required: [true, 'messageType is required'],
    enum: {
      values: MESSAGE_TYPES,
      message: `messageType must be one of: ${MESSAGE_TYPES.join(', ')}`
    }
  },
  recipientFilter: {
    type: RecipientFilterSchema,
    required: [true, 'recipientFilter is required']
  },
  status: {
    type: String,
    enum: {
      values: STATUSES,
      message: `status must be one of: ${STATUSES.join(', ')}`
    },
    default: 'draft',
    index: true
  },
  scheduledAt: {
    type: Date,
    index: true
  },
  sentAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  templateVariables: [{
    type: String
  }],
  recipients: [RecipientSchema],
  deliveryStats: {
    type: DeliveryStatsSchema,
    default: () => ({})
  },
  rateLimiting: {
    type: RateLimitingSchema,
    default: () => ({})
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  tags: [{
    type: String
  }]
}, {
  timestamps: true
});

// Indexes for performance
BulkMessageSchema.index({ bulkMessageId: 1 }, { unique: true });
BulkMessageSchema.index({ companyId: 1, createdAt: -1 });
BulkMessageSchema.index({ status: 1, scheduledAt: 1 });
BulkMessageSchema.index({ senderId: 1, createdAt: -1 });

/**
 * Pre-save middleware to set sentAt when status changes to processing
 */
BulkMessageSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'processing' && !this.sentAt) {
      this.sentAt = new Date();
    }
    if (this.status === 'sent' || this.status === 'partially_sent' || this.status === 'failed') {
      this.completedAt = new Date();
    }
    if (this.status === 'cancelled') {
      this.cancelledAt = new Date();
    }
  }
  next();
});

/**
 * Instance method to update delivery statistics from recipients
 */
BulkMessageSchema.methods.updateDeliveryStats = function() {
  const stats = {
    totalRecipients: this.recipients.length,
    sent: 0,
    delivered: 0,
    failed: 0,
    bounced: 0,
    opened: 0,
    clicked: 0
  };

  this.recipients.forEach(recipient => {
    switch (recipient.status) {
      case 'sent':
        stats.sent++;
        break;
      case 'delivered':
        stats.sent++;
        stats.delivered++;
        break;
      case 'failed':
        stats.failed++;
        break;
      case 'bounced':
        stats.bounced++;
        break;
      case 'opened':
        stats.sent++;
        stats.delivered++;
        stats.opened++;
        break;
      case 'clicked':
        stats.sent++;
        stats.delivered++;
        stats.opened++;
        stats.clicked++;
        break;
    }
  });

  this.deliveryStats = stats;
  return stats;
};

/**
 * Static method to find scheduled messages ready to send
 */
BulkMessageSchema.statics.findScheduledForProcessing = function() {
  return this.find({
    status: 'scheduled',
    scheduledAt: { $lte: new Date() }
  });
};

/**
 * Static method to get message statistics by company
 */
BulkMessageSchema.statics.getStatsByCompany = async function(companyId) {
  return this.aggregate([
    { $match: { companyId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRecipients: { $sum: '$deliveryStats.totalRecipients' },
        totalSent: { $sum: '$deliveryStats.sent' },
        totalDelivered: { $sum: '$deliveryStats.delivered' },
        totalFailed: { $sum: '$deliveryStats.failed' }
      }
    }
  ]);
};

const BulkMessage = mongoose.model('BulkMessage', BulkMessageSchema);

module.exports = BulkMessage;
module.exports.MESSAGE_TYPES = MESSAGE_TYPES;
module.exports.STATUSES = STATUSES;
module.exports.FILTER_TYPES = FILTER_TYPES;
module.exports.RECIPIENT_STATUSES = RECIPIENT_STATUSES;

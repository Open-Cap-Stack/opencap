/**
 * TriggerHistory Model
 *
 * Issue #88: Build Automated Triggered Messages
 *
 * Audit log for trigger executions. Records when triggers fire,
 * what messages were sent, and the outcome of each execution.
 */

const mongoose = require('mongoose');

/**
 * TriggerHistory Schema
 */
const TriggerHistorySchema = new mongoose.Schema({
  historyId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  triggerId: {
    type: String,
    required: true,
    index: true
  },
  triggerName: {
    type: String
  },
  eventType: {
    type: String,
    required: true
  },
  executedAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'partial', 'failed', 'skipped'],
    required: true,
    default: 'pending'
  },
  eventPayload: {
    type: mongoose.Schema.Types.Mixed
  },
  messageGenerated: {
    subject: String,
    body: String,
    channels: [String]
  },
  recipientCount: {
    type: Number,
    default: 0
  },
  recipientIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  deliveryResults: [{
    channel: String,
    recipientId: mongoose.Schema.Types.ObjectId,
    status: {
      type: String,
      enum: ['sent', 'delivered', 'failed', 'bounced', 'pending']
    },
    deliveredAt: Date,
    errorMessage: String
  }],
  ruleEvaluationResult: {
    type: Boolean
  },
  rulesEvaluated: {
    type: mongoose.Schema.Types.Mixed
  },
  errorMessage: {
    type: String
  },
  errorStack: {
    type: String
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    index: true
  },
  executionDurationMs: {
    type: Number
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
TriggerHistorySchema.index({ triggerId: 1, executedAt: -1 });
TriggerHistorySchema.index({ companyId: 1, executedAt: -1 });
TriggerHistorySchema.index({ status: 1, executedAt: -1 });
TriggerHistorySchema.index({ eventType: 1, executedAt: -1 });

/**
 * Static method to get execution stats for a trigger
 * @param {string} triggerId - Trigger ID to get stats for
 * @param {Date} since - Optional start date
 * @returns {Promise<Object>} Execution statistics
 */
TriggerHistorySchema.statics.getStats = async function(triggerId, since = null) {
  const query = { triggerId };
  if (since) {
    query.executedAt = { $gte: since };
  }

  const results = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgDuration: { $avg: '$executionDurationMs' },
        totalRecipients: { $sum: '$recipientCount' }
      }
    }
  ]);

  const stats = {
    total: 0,
    byStatus: {},
    averageDuration: 0,
    totalRecipients: 0
  };

  let totalDuration = 0;
  let durationCount = 0;

  results.forEach(r => {
    stats.total += r.count;
    stats.byStatus[r._id] = r.count;
    stats.totalRecipients += r.totalRecipients;
    if (r.avgDuration) {
      totalDuration += r.avgDuration * r.count;
      durationCount += r.count;
    }
  });

  if (durationCount > 0) {
    stats.averageDuration = totalDuration / durationCount;
  }

  return stats;
};

/**
 * Static method to get recent history for a company
 * @param {string} companyId - Company ID
 * @param {number} limit - Max records to return
 * @returns {Promise<Array>} Recent history entries
 */
TriggerHistorySchema.statics.getRecentByCompany = function(companyId, limit = 50) {
  return this.find({ companyId })
    .sort({ executedAt: -1 })
    .limit(limit)
    .lean();
};

module.exports = mongoose.model('TriggerHistory', TriggerHistorySchema);

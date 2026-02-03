/**
 * ScheduledTrigger Model
 *
 * Issue #88: Build Automated Triggered Messages
 *
 * Stores scheduled and delayed triggers that need to be executed
 * at a future time. Used by the trigger engine to process
 * time-based message dispatches.
 */

const mongoose = require('mongoose');

/**
 * ScheduledTrigger Schema
 */
const ScheduledTriggerSchema = new mongoose.Schema({
  scheduleId: {
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
  triggerType: {
    type: String,
    enum: ['scheduled', 'delayed', 'recurring'],
    required: true
  },
  scheduledAt: {
    type: Date,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed
  },
  recipientIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    index: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  lastAttemptAt: {
    type: Date
  },
  lastError: {
    type: String
  },
  completedAt: {
    type: Date
  },
  historyId: {
    type: String // Reference to TriggerHistory when completed
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Compound index for finding due triggers
ScheduledTriggerSchema.index({ status: 1, scheduledAt: 1 });
ScheduledTriggerSchema.index({ triggerId: 1, status: 1 });

/**
 * Static method to find due scheduled triggers
 * @param {Date} asOf - Reference time (defaults to now)
 * @param {number} limit - Max records to return
 * @returns {Promise<Array>} Due scheduled triggers
 */
ScheduledTriggerSchema.statics.findDue = function(asOf = new Date(), limit = 100) {
  return this.find({
    status: 'pending',
    scheduledAt: { $lte: asOf }
  })
    .sort({ scheduledAt: 1 })
    .limit(limit);
};

/**
 * Static method to mark a scheduled trigger as processing
 * @param {string} scheduleId - Schedule ID to mark
 * @returns {Promise<Object>} Updated document
 */
ScheduledTriggerSchema.statics.markProcessing = function(scheduleId) {
  return this.findOneAndUpdate(
    { scheduleId, status: 'pending' },
    { status: 'processing', lastAttemptAt: new Date() },
    { new: true }
  );
};

/**
 * Static method to mark a scheduled trigger as completed
 * @param {string} scheduleId - Schedule ID to mark
 * @param {string} historyId - Associated history record ID
 * @returns {Promise<Object>} Updated document
 */
ScheduledTriggerSchema.statics.markCompleted = function(scheduleId, historyId = null) {
  return this.findOneAndUpdate(
    { scheduleId },
    {
      status: 'completed',
      completedAt: new Date(),
      historyId
    },
    { new: true }
  );
};

/**
 * Static method to mark a scheduled trigger as failed
 * @param {string} scheduleId - Schedule ID to mark
 * @param {string} error - Error message
 * @returns {Promise<Object>} Updated document
 */
ScheduledTriggerSchema.statics.markFailed = function(scheduleId, error) {
  return this.findOneAndUpdate(
    { scheduleId },
    {
      $set: {
        lastError: error,
        lastAttemptAt: new Date()
      },
      $inc: { attempts: 1 }
    },
    { new: true }
  ).then(doc => {
    if (doc && doc.attempts >= doc.maxAttempts) {
      return this.findOneAndUpdate(
        { scheduleId },
        { status: 'failed' },
        { new: true }
      );
    }
    return doc;
  });
};

/**
 * Static method to cancel a scheduled trigger
 * @param {string} scheduleId - Schedule ID to cancel
 * @returns {Promise<Object>} Updated document
 */
ScheduledTriggerSchema.statics.cancel = function(scheduleId) {
  return this.findOneAndUpdate(
    { scheduleId, status: 'pending' },
    { status: 'cancelled' },
    { new: true }
  );
};

module.exports = mongoose.model('ScheduledTrigger', ScheduledTriggerSchema);

/**
 * BulkMessage Model
 * Issue #86: Create Bulk Messaging System
 *
 * Data model for bulk messaging with templates, scheduling,
 * recipient management, and delivery tracking.
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

const MESSAGE_TYPES = ['email', 'sms', 'notification', 'in-app'];
const STATUSES = ['draft', 'scheduled', 'processing', 'sent', 'partially_sent', 'failed', 'cancelled'];
const FILTER_TYPES = ['all', 'role', 'company', 'custom'];
const RECIPIENT_STATUSES = ['pending', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked'];

// Schema definition for documentation and validation
const bulkMessageSchema = {
  bulkMessageId: { type: 'string', required: true, unique: true },
  companyId: { type: 'string', required: true },
  senderId: { type: 'string', required: true },
  subject: { type: 'string', required: true },
  content: { type: 'string', required: true },
  messageType: { type: 'string', required: true, enum: MESSAGE_TYPES },
  recipientFilter: {
    type: 'object',
    required: true,
    default: {
      filterType: 'all',
      roles: [],
      companyIds: [],
      stakeholderIds: [],
      customQuery: null
    }
  },
  status: { type: 'string', enum: STATUSES, default: 'draft' },
  scheduledAt: { type: 'date', default: null },
  sentAt: { type: 'date', default: null },
  completedAt: { type: 'date', default: null },
  cancelledAt: { type: 'date', default: null },
  templateVariables: { type: 'array', default: [] },
  recipients: { type: 'array', default: [] },
  deliveryStats: {
    type: 'object',
    default: {
      totalRecipients: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      bounced: 0,
      opened: 0,
      clicked: 0
    }
  },
  rateLimiting: {
    type: 'object',
    default: {
      batchSize: 100,
      delayBetweenBatches: 500
    }
  },
  metadata: { type: 'object', default: {} },
  tags: { type: 'array', default: [] },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('bulk_messages', bulkMessageSchema);

// Extended BulkMessage model with business logic
const BulkMessage = {
  ...baseModel,
  tableName: 'bulk_messages',
  schema: bulkMessageSchema,

  // Export constants
  MESSAGE_TYPES,
  STATUSES,
  FILTER_TYPES,
  RECIPIENT_STATUSES,

  /**
   * Create a new bulk message with defaults
   * @param {Object} data - Bulk message data
   * @returns {Object} Created bulk message
   */
  async create(data) {
    if (!data.bulkMessageId) {
      data.bulkMessageId = `msg_${uuidv4()}`;
    }

    if (!data.status) {
      data.status = 'draft';
    }

    if (!data.deliveryStats) {
      data.deliveryStats = {
        totalRecipients: 0,
        sent: 0,
        delivered: 0,
        failed: 0,
        bounced: 0,
        opened: 0,
        clicked: 0
      };
    }

    if (!data.rateLimiting) {
      data.rateLimiting = {
        batchSize: 100,
        delayBetweenBatches: 500
      };
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find bulk message by bulkMessageId
   * @param {string} bulkMessageId - Bulk message ID
   * @returns {Object|null} Bulk message or null
   */
  async findByBulkMessageId(bulkMessageId) {
    return baseModel.findOne.call(baseModel, { bulkMessageId });
  },

  /**
   * Find bulk messages by company
   * @param {string} companyId - Company ID
   * @returns {Array} Bulk messages for company
   */
  async findByCompany(companyId) {
    return baseModel.find.call(baseModel, { companyId });
  },

  /**
   * Find scheduled messages ready to send
   * @returns {Array} Scheduled messages ready for processing
   */
  async findScheduledForProcessing() {
    const now = new Date().toISOString();
    const all = await baseModel.find.call(baseModel, { status: 'scheduled' });
    return all.filter(msg => msg.scheduledAt && msg.scheduledAt <= now);
  },

  /**
   * Update delivery statistics from recipients
   * @param {Object} message - Bulk message object
   * @returns {Object} Updated stats
   */
  updateDeliveryStats(message) {
    const stats = {
      totalRecipients: message.recipients?.length || 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      bounced: 0,
      opened: 0,
      clicked: 0
    };

    if (message.recipients) {
      message.recipients.forEach(recipient => {
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
    }

    return stats;
  },

  /**
   * Get message statistics by company
   * @param {string} companyId - Company ID
   * @returns {Array} Aggregated statistics
   */
  async getStatsByCompany(companyId) {
    const messages = await baseModel.find.call(baseModel, { companyId });
    const statsByStatus = {};

    messages.forEach(msg => {
      const status = msg.status;
      if (!statsByStatus[status]) {
        statsByStatus[status] = {
          _id: status,
          count: 0,
          totalRecipients: 0,
          totalSent: 0,
          totalDelivered: 0,
          totalFailed: 0
        };
      }
      statsByStatus[status].count++;
      statsByStatus[status].totalRecipients += msg.deliveryStats?.totalRecipients || 0;
      statsByStatus[status].totalSent += msg.deliveryStats?.sent || 0;
      statsByStatus[status].totalDelivered += msg.deliveryStats?.delivered || 0;
      statsByStatus[status].totalFailed += msg.deliveryStats?.failed || 0;
    });

    return Object.values(statsByStatus);
  },

  // Expose base model methods
  find: baseModel.find.bind(baseModel),
  findOne: baseModel.findOne.bind(baseModel),
  findById: baseModel.findById.bind(baseModel),
  updateOne: baseModel.updateOne.bind(baseModel),
  updateMany: baseModel.updateMany.bind(baseModel),
  findOneAndUpdate: baseModel.findOneAndUpdate.bind(baseModel),
  findByIdAndUpdate: baseModel.findByIdAndUpdate.bind(baseModel),
  deleteOne: baseModel.deleteOne.bind(baseModel),
  deleteMany: baseModel.deleteMany.bind(baseModel),
  findOneAndDelete: baseModel.findOneAndDelete.bind(baseModel),
  findByIdAndDelete: baseModel.findByIdAndDelete.bind(baseModel),
  countDocuments: baseModel.countDocuments.bind(baseModel),
  exists: baseModel.exists.bind(baseModel),
  distinct: baseModel.distinct.bind(baseModel),
  aggregate: baseModel.aggregate.bind(baseModel)
};

module.exports = BulkMessage;
module.exports.MESSAGE_TYPES = MESSAGE_TYPES;
module.exports.STATUSES = STATUSES;
module.exports.FILTER_TYPES = FILTER_TYPES;
module.exports.RECIPIENT_STATUSES = RECIPIENT_STATUSES;

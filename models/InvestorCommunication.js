/**
 * InvestorCommunication Model
 * Issue #91: Build Investor Communication System
 *
 * Manages investor-specific communications including:
 * - Message templates
 * - Investor segmentation
 * - Quarterly update distribution
 * - Document sharing notifications
 * - Portal announcements
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid communication types
const COMMUNICATION_TYPES = [
  'quarterly_update',
  'annual_report',
  'document_notification',
  'portal_announcement',
  'funding_update',
  'general'
];

// Valid status types
const STATUS_TYPES = [
  'draft',
  'scheduled',
  'sent',
  'delivered',
  'failed'
];

// Valid delivery channels
const DELIVERY_CHANNELS = [
  'email',
  'portal',
  'sms',
  'all'
];

// Valid delivery statuses
const DELIVERY_STATUSES = ['pending', 'sent', 'delivered', 'opened', 'clicked', 'failed'];

// Valid investor types
const INVESTOR_TYPES = ['Angel', 'Venture Capital', 'Private Equity', 'Family Office', 'Individual', 'Institutional'];

// Schema definition for documentation and validation
const investorCommunicationSchema = {
  communicationId: { type: 'string', required: true, unique: true },
  companyId: { type: 'string', required: true },
  communicationType: { type: 'string', required: true, enum: COMMUNICATION_TYPES },
  subject: { type: 'string', required: true },
  content: { type: 'string', required: true },
  htmlContent: { type: 'string', default: null },
  status: { type: 'string', enum: STATUS_TYPES, default: 'draft' },
  deliveryChannel: { type: 'string', enum: DELIVERY_CHANNELS, default: 'email' },
  segmentation: {
    type: 'object',
    default: {
      investorTypes: [],
      minInvestmentAmount: null,
      maxInvestmentAmount: null,
      investmentDateFrom: null,
      investmentDateTo: null,
      investorIds: [],
      excludeInvestorIds: [],
      fundraisingRoundIds: []
    }
  },
  attachments: { type: 'array', default: [] },
  deliveryTracking: { type: 'array', default: [] },
  templateId: { type: 'string', default: null },
  scheduledFor: { type: 'date', default: null },
  sentAt: { type: 'date', default: null },
  createdBy: { type: 'string', required: true },
  updatedBy: { type: 'string', default: null },
  metadata: { type: 'object', default: {} },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('investor_communications', investorCommunicationSchema);

// Extended InvestorCommunication model with business logic
const InvestorCommunication = {
  ...baseModel,
  tableName: 'investor_communications',
  schema: investorCommunicationSchema,

  // Export constants
  COMMUNICATION_TYPES,
  STATUS_TYPES,
  DELIVERY_CHANNELS,
  DELIVERY_STATUSES,
  INVESTOR_TYPES,

  /**
   * Create a new investor communication with defaults
   * @param {Object} data - Communication data
   * @returns {Object} Created communication
   */
  async create(data) {
    if (!data.communicationId) {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 8);
      data.communicationId = `INVCOM-${timestamp}-${random}`.toUpperCase();
    }

    // Validate communication type
    if (!COMMUNICATION_TYPES.includes(data.communicationType)) {
      throw new Error(`communicationType must be one of: ${COMMUNICATION_TYPES.join(', ')}`);
    }

    if (!data.status) {
      data.status = 'draft';
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find communication by communicationId
   * @param {string} communicationId - Communication ID
   * @returns {Object|null} Communication or null
   */
  async findByCommunicationId(communicationId) {
    return baseModel.findOne.call(baseModel, { communicationId });
  },

  /**
   * Find communications by company
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Array} Communications for company
   */
  async findByCompany(companyId, options = {}) {
    const query = { companyId };
    if (options.status) {
      query.status = options.status;
    }
    if (options.communicationType) {
      query.communicationType = options.communicationType;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Get recipient count
   * @param {Object} communication - Communication object
   * @returns {number} Recipient count
   */
  getRecipientCount(communication) {
    return communication.deliveryTracking ? communication.deliveryTracking.length : 0;
  },

  /**
   * Get delivery statistics
   * @param {Object} communication - Communication object
   * @returns {Object} Delivery stats
   */
  getDeliveryStats(communication) {
    if (!communication.deliveryTracking || communication.deliveryTracking.length === 0) {
      return { total: 0, sent: 0, delivered: 0, failed: 0 };
    }

    const stats = {
      total: communication.deliveryTracking.length,
      pending: 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      failed: 0
    };

    communication.deliveryTracking.forEach(tracking => {
      if (stats.hasOwnProperty(tracking.status)) {
        stats[tracking.status]++;
      }
    });

    return stats;
  },

  /**
   * Add delivery tracking entry
   * @param {string} communicationId - Communication ID
   * @param {Object} trackingEntry - Tracking entry
   * @returns {Object} Updated communication
   */
  async addDeliveryTracking(communicationId, trackingEntry) {
    const communication = await this.findByCommunicationId(communicationId);
    if (!communication) {
      throw new Error('Communication not found');
    }

    const deliveryTracking = communication.deliveryTracking || [];
    deliveryTracking.push({
      investorId: trackingEntry.investorId,
      status: trackingEntry.status || 'pending',
      channel: trackingEntry.channel,
      sentAt: trackingEntry.sentAt,
      deliveredAt: trackingEntry.deliveredAt,
      openedAt: trackingEntry.openedAt,
      clickedAt: trackingEntry.clickedAt,
      error: trackingEntry.error
    });

    return baseModel.updateOne.call(baseModel,
      { communicationId },
      { $set: { deliveryTracking } }
    );
  },

  /**
   * Mark as sent
   * @param {string} communicationId - Communication ID
   * @returns {Object} Updated communication
   */
  async markSent(communicationId) {
    return baseModel.updateOne.call(baseModel,
      { communicationId },
      { $set: { status: 'sent', sentAt: new Date().toISOString() } }
    );
  },

  /**
   * Schedule communication
   * @param {string} communicationId - Communication ID
   * @param {Date} scheduledFor - Scheduled date
   * @returns {Object} Updated communication
   */
  async schedule(communicationId, scheduledFor) {
    return baseModel.updateOne.call(baseModel,
      { communicationId },
      { $set: { status: 'scheduled', scheduledFor: new Date(scheduledFor).toISOString() } }
    );
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

module.exports = InvestorCommunication;

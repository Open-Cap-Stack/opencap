/**
 * Webhook Model
 * Issue #118: Build Webhook System
 *
 * Data model for webhook configurations supporting:
 * - Event subscriptions for external integrations
 * - Signature verification for security
 * - Retry configuration for failed deliveries
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid event types
const EVENT_TYPES = [
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
];

// Valid statuses
const VALID_STATUSES = ['active', 'paused', 'failed'];

// Schema definition for documentation and validation
const webhookSchema = {
  webhookId: { type: 'string', required: true, unique: true },
  companyId: { type: 'string', required: true },
  name: { type: 'string', required: true },
  description: { type: 'string', default: '' },
  url: { type: 'string', required: true },
  secret: { type: 'string', required: true },
  events: { type: 'array', required: true },
  status: { type: 'string', enum: VALID_STATUSES, default: 'active' },
  retryConfig: {
    type: 'object',
    default: {
      maxRetries: 3,
      retryDelay: 60000
    }
  },
  headers: { type: 'object', default: {} },
  lastTriggeredAt: { type: 'date', default: null },
  failureCount: { type: 'number', default: 0 },
  createdBy: { type: 'string', default: null },
  updatedBy: { type: 'string', default: null },
  metadata: { type: 'object', default: {} },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('webhooks', webhookSchema);

// Extended Webhook model with business logic
const Webhook = {
  ...baseModel,
  tableName: 'webhooks',
  schema: webhookSchema,

  // Export constants
  EVENT_TYPES,
  VALID_STATUSES,

  /**
   * Create a new webhook with defaults
   * @param {Object} data - Webhook data
   * @returns {Object} Created webhook
   */
  async create(data) {
    if (!data.webhookId) {
      data.webhookId = `wh_${uuidv4()}`;
    }

    // Validate URL
    try {
      const url = new URL(data.url);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        throw new Error('Invalid webhook URL protocol');
      }
    } catch {
      throw new Error('Invalid webhook URL');
    }

    // Validate events
    if (!data.events || data.events.length === 0) {
      throw new Error('At least one event type is required');
    }

    const invalidEvents = data.events.filter(e => !EVENT_TYPES.includes(e));
    if (invalidEvents.length > 0) {
      throw new Error(`Invalid event types: ${invalidEvents.join(', ')}`);
    }

    if (!data.retryConfig) {
      data.retryConfig = {
        maxRetries: 3,
        retryDelay: 60000
      };
    }

    if (!data.status) {
      data.status = 'active';
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find webhook by webhookId
   * @param {string} webhookId - Webhook ID
   * @returns {Object|null} Webhook or null
   */
  async findByWebhookId(webhookId) {
    return baseModel.findOne.call(baseModel, { webhookId });
  },

  /**
   * Find webhooks by company
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Array} Webhooks for company
   */
  async findByCompany(companyId, options = {}) {
    const query = { companyId };
    if (options.status) {
      query.status = options.status;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Find webhooks subscribed to an event
   * @param {string} companyId - Company ID
   * @param {string} eventType - Event type
   * @returns {Array} Matching webhooks
   */
  async findByEvent(companyId, eventType) {
    const webhooks = await baseModel.find.call(baseModel, { companyId, status: 'active' });
    return webhooks.filter(wh => wh.events && wh.events.includes(eventType));
  },

  /**
   * Check if webhook is operational
   * @param {Object} webhook - Webhook object
   * @returns {boolean} True if operational
   */
  isOperational(webhook) {
    return webhook.status === 'active' && (webhook.failureCount || 0) < 10;
  },

  /**
   * Check if webhook is subscribed to an event
   * @param {Object} webhook - Webhook object
   * @param {string} eventType - Event type
   * @returns {boolean} True if subscribed
   */
  isSubscribedTo(webhook, eventType) {
    return webhook.events && webhook.events.includes(eventType);
  },

  /**
   * Increment failure count
   * @param {string} webhookId - Webhook ID
   * @returns {Object} Updated webhook
   */
  async incrementFailureCount(webhookId) {
    const webhook = await this.findByWebhookId(webhookId);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const newFailureCount = (webhook.failureCount || 0) + 1;
    const updateData = { failureCount: newFailureCount };

    if (newFailureCount >= 10) {
      updateData.status = 'failed';
    }

    return baseModel.updateOne.call(baseModel,
      { webhookId },
      { $set: updateData }
    );
  },

  /**
   * Reset failure count
   * @param {string} webhookId - Webhook ID
   * @returns {Object} Updated webhook
   */
  async resetFailureCount(webhookId) {
    const webhook = await this.findByWebhookId(webhookId);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const updateData = { failureCount: 0 };
    if (webhook.status === 'failed') {
      updateData.status = 'active';
    }

    return baseModel.updateOne.call(baseModel,
      { webhookId },
      { $set: updateData }
    );
  },

  /**
   * Update last triggered timestamp
   * @param {string} webhookId - Webhook ID
   * @returns {Object} Updated webhook
   */
  async updateLastTriggered(webhookId) {
    return baseModel.updateOne.call(baseModel,
      { webhookId },
      { $set: { lastTriggeredAt: new Date().toISOString() } }
    );
  },

  /**
   * Transform webhook object for JSON output (hide sensitive fields)
   * @param {Object} webhook - Webhook object
   * @returns {Object} Sanitized webhook object
   */
  toJSON(webhook) {
    if (!webhook) return null;
    const sanitized = { ...webhook };
    delete sanitized.secret;
    return sanitized;
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

module.exports = Webhook;

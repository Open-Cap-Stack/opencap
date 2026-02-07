/**
 * WebhookDelivery Model
 * Issue #118: Build Webhook System
 *
 * Data model for tracking webhook delivery attempts including:
 * - Delivery status and response tracking
 * - Retry management with exponential backoff
 * - Delivery history and audit trail
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid statuses
const VALID_STATUSES = ['pending', 'success', 'failed'];

// Schema definition for documentation and validation
const webhookDeliverySchema = {
  deliveryId: { type: 'string', required: true, unique: true },
  webhookId: { type: 'string', required: true },
  eventType: { type: 'string', required: true },
  payload: { type: 'object', required: true },
  response: {
    type: 'object',
    default: {
      body: null,
      headers: null,
      error: null
    }
  },
  statusCode: { type: 'number', default: null },
  status: { type: 'string', enum: VALID_STATUSES, default: 'pending' },
  attempts: { type: 'number', default: 0 },
  nextRetryAt: { type: 'date', default: null },
  completedAt: { type: 'date', default: null },
  requestHeaders: { type: 'object', default: {} },
  requestUrl: { type: 'string', default: null },
  duration: { type: 'number', default: null },
  metadata: { type: 'object', default: {} },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('webhook_deliveries', webhookDeliverySchema);

// Extended WebhookDelivery model with business logic
const WebhookDelivery = {
  ...baseModel,
  tableName: 'webhook_deliveries',
  schema: webhookDeliverySchema,

  // Export constants
  VALID_STATUSES,

  /**
   * Create a new delivery with defaults
   * @param {Object} data - Delivery data
   * @returns {Object} Created delivery
   */
  async create(data) {
    if (!data.deliveryId) {
      data.deliveryId = `del_${uuidv4()}`;
    }

    if (!data.status) {
      data.status = 'pending';
    }

    if (!data.attempts) {
      data.attempts = 0;
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find delivery by deliveryId
   * @param {string} deliveryId - Delivery ID
   * @returns {Object|null} Delivery or null
   */
  async findByDeliveryId(deliveryId) {
    return baseModel.findOne.call(baseModel, { deliveryId });
  },

  /**
   * Find deliveries by webhook
   * @param {string} webhookId - Webhook ID
   * @param {Object} options - Query options
   * @returns {Array} Deliveries for webhook
   */
  async findByWebhook(webhookId, options = {}) {
    const query = { webhookId };
    if (options.status) {
      query.status = options.status;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Find deliveries by event type
   * @param {string} eventType - Event type
   * @param {Object} options - Query options
   * @returns {Array} Deliveries for event type
   */
  async findByEventType(eventType, options = {}) {
    const query = { eventType };
    if (options.status) {
      query.status = options.status;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Check if delivery can be retried
   * @param {Object} delivery - Delivery object
   * @returns {boolean} True if can retry
   */
  canRetry(delivery) {
    return delivery.status === 'failed' && delivery.nextRetryAt !== null;
  },

  /**
   * Check if delivery is overdue for retry
   * @param {Object} delivery - Delivery object
   * @returns {boolean} True if retry is due
   */
  isRetryDue(delivery) {
    if (!this.canRetry(delivery)) return false;
    return new Date() >= new Date(delivery.nextRetryAt);
  },

  /**
   * Calculate next retry time with exponential backoff
   * @param {Object} delivery - Delivery object
   * @param {number} baseDelay - Base delay in ms
   * @param {number} maxRetries - Maximum retries
   * @returns {Date|null} Next retry time or null
   */
  calculateNextRetry(delivery, baseDelay = 60000, maxRetries = 3) {
    if ((delivery.attempts || 0) >= maxRetries) {
      return null;
    }

    // Exponential backoff: baseDelay * 2^attempts
    const backoffDelay = baseDelay * Math.pow(2, delivery.attempts || 0);
    const maxDelay = 3600000; // Max 1 hour
    const actualDelay = Math.min(backoffDelay, maxDelay);

    return new Date(Date.now() + actualDelay);
  },

  /**
   * Mark delivery as successful
   * @param {string} deliveryId - Delivery ID
   * @param {number} statusCode - HTTP status code
   * @param {string} responseBody - Response body
   * @param {Object} responseHeaders - Response headers
   * @param {number} duration - Request duration in ms
   * @returns {Object} Updated delivery
   */
  async markSuccess(deliveryId, statusCode, responseBody, responseHeaders, duration) {
    const delivery = await this.findByDeliveryId(deliveryId);
    if (!delivery) {
      throw new Error('Delivery not found');
    }

    return baseModel.updateOne.call(baseModel,
      { deliveryId },
      {
        $set: {
          status: 'success',
          statusCode,
          response: {
            body: typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody),
            headers: responseHeaders || null,
            error: null
          },
          completedAt: new Date().toISOString(),
          nextRetryAt: null,
          duration,
          attempts: (delivery.attempts || 0) + 1
        }
      }
    );
  },

  /**
   * Mark delivery as failed
   * @param {string} deliveryId - Delivery ID
   * @param {string} error - Error message
   * @param {number} statusCode - HTTP status code
   * @param {Date} nextRetryAt - Next retry time
   * @returns {Object} Updated delivery
   */
  async markFailed(deliveryId, error, statusCode, nextRetryAt) {
    const delivery = await this.findByDeliveryId(deliveryId);
    if (!delivery) {
      throw new Error('Delivery not found');
    }

    const updateData = {
      status: 'failed',
      statusCode: statusCode || null,
      response: {
        body: null,
        headers: null,
        error: error?.message || error || 'Unknown error'
      },
      attempts: (delivery.attempts || 0) + 1,
      nextRetryAt: nextRetryAt ? nextRetryAt.toISOString() : null
    };

    if (!nextRetryAt) {
      updateData.completedAt = new Date().toISOString();
    }

    return baseModel.updateOne.call(baseModel,
      { deliveryId },
      { $set: updateData }
    );
  },

  /**
   * Find deliveries due for retry
   * @returns {Array} Deliveries due for retry
   */
  async findDueForRetry() {
    const failed = await baseModel.find.call(baseModel, { status: 'failed' });
    const now = new Date();
    return failed.filter(d => d.nextRetryAt && new Date(d.nextRetryAt) <= now);
  },

  /**
   * Get statistics for a webhook
   * @param {string} webhookId - Webhook ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} Statistics
   */
  async getStatistics(webhookId, startDate, endDate) {
    let deliveries = await baseModel.find.call(baseModel, { webhookId });

    // Filter by date range if provided
    if (startDate || endDate) {
      deliveries = deliveries.filter(d => {
        const createdAt = new Date(d.createdAt);
        if (startDate && createdAt < startDate) return false;
        if (endDate && createdAt > endDate) return false;
        return true;
      });
    }

    const result = {
      total: deliveries.length,
      success: 0,
      failed: 0,
      pending: 0,
      avgDuration: 0
    };

    let totalDuration = 0;
    let durationCount = 0;

    for (const delivery of deliveries) {
      if (delivery.status === 'success') result.success++;
      else if (delivery.status === 'failed') result.failed++;
      else if (delivery.status === 'pending') result.pending++;

      if (delivery.duration) {
        totalDuration += delivery.duration;
        durationCount++;
      }
    }

    result.avgDuration = durationCount > 0 ? totalDuration / durationCount : 0;
    result.successRate = result.total > 0 ? (result.success / result.total) * 100 : 0;

    return result;
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

module.exports = WebhookDelivery;

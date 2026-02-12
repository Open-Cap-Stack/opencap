/**
 * WebhookEvent Model
 * Tracks processed Stripe webhook events for idempotency
 *
 * Prevents duplicate processing of webhook events by storing
 * the Stripe event ID and processing status.
 *
 * Uses ZeroDB as data store.
 */

const { createModel } = require('./base/ZeroDBModel');

const VALID_STATUSES = ['pending', 'processed', 'failed'];

const webhookEventSchema = {
  eventId: { type: 'string', required: true, unique: true },
  type: { type: 'string', required: true },
  processedAt: { type: 'date', default: null },
  status: { type: 'string', enum: VALID_STATUSES, default: 'pending' },
  error: { type: 'string', default: null },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

const baseModel = createModel('webhook_events', webhookEventSchema);

const WebhookEvent = {
  ...baseModel,
  tableName: 'webhook_events',
  schema: webhookEventSchema,
  VALID_STATUSES,

  /**
   * Check if an event has already been processed
   * @param {string} eventId - Stripe event ID
   * @returns {boolean}
   */
  async isProcessed(eventId) {
    const event = await baseModel.findOne.call(baseModel, { eventId });
    return event?.status === 'processed';
  },

  /**
   * Record a new event as pending
   * @param {string} eventId - Stripe event ID
   * @param {string} type - Event type
   * @returns {Object} Created event record
   */
  async recordEvent(eventId, type) {
    return baseModel.create.call(baseModel, {
      eventId,
      type,
      status: 'pending'
    });
  },

  /**
   * Mark an event as processed
   * @param {string} eventId - Stripe event ID
   * @returns {Object} Update result
   */
  async markProcessed(eventId) {
    return baseModel.updateOne.call(baseModel,
      { eventId },
      { $set: { status: 'processed', processedAt: new Date().toISOString() } }
    );
  },

  /**
   * Mark an event as failed
   * @param {string} eventId - Stripe event ID
   * @param {string} error - Error message
   * @returns {Object} Update result
   */
  async markFailed(eventId, error) {
    return baseModel.updateOne.call(baseModel,
      { eventId },
      { $set: { status: 'failed', error, processedAt: new Date().toISOString() } }
    );
  },

  // Expose base model methods
  find: baseModel.find.bind(baseModel),
  findOne: baseModel.findOne.bind(baseModel),
  findById: baseModel.findById.bind(baseModel),
  updateOne: baseModel.updateOne.bind(baseModel),
  deleteOne: baseModel.deleteOne.bind(baseModel),
  countDocuments: baseModel.countDocuments.bind(baseModel)
};

module.exports = WebhookEvent;

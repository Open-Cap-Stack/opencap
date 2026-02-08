/**
 * Webhook Service
 * Issue #118: Build Webhook System
 *
 * Business logic for webhook management including:
 * - Webhook registration and configuration
 * - Event triggering with signature verification
 * - Retry logic with exponential backoff
 * - Delivery history tracking
 */
const crypto = require('crypto');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const databaseAdapter = require('./databaseAdapter');
const { validateWebhookUrl } = require('../utils/urlValidator');

class WebhookService {
  /**
   * Register a new webhook
   * @param {Object} webhookData - Webhook configuration data
   * @returns {Object} Created webhook with secret
   */
  async registerWebhook(webhookData) {
    // Validate URL with SSRF protection
    const validatedUrl = validateWebhookUrl(webhookData.url);
    webhookData.url = validatedUrl;

    // Validate events
    if (!webhookData.events || webhookData.events.length === 0) {
      throw new Error('At least one event type is required');
    }

    // Generate unique ID and secret
    const webhookId = `WH-${uuidv4().slice(0, 8).toUpperCase()}`;
    const secret = this._generateSecret();

    // Set default retry config if not provided
    const retryConfig = webhookData.retryConfig || {
      maxRetries: 3,
      retryDelay: 60000
    };

    const webhookPayload = {
      webhookId,
      companyId: webhookData.companyId,
      name: webhookData.name,
      description: webhookData.description || '',
      url: webhookData.url,
      secret,
      events: webhookData.events,
      status: 'active',
      retryConfig,
      headers: webhookData.headers || {},
      failureCount: 0,
      lastTriggeredAt: null,
      createdBy: webhookData.createdBy,
      metadata: webhookData.metadata
    };

    const savedWebhook = await databaseAdapter.create('Webhook', webhookPayload);

    // Return webhook with secret visible (only on creation)
    return {
      ...savedWebhook,
      secret
    };
  }

  /**
   * Trigger webhooks for a specific event
   * @param {string} eventType - Type of event being triggered
   * @param {Object} eventData - Data to send with the webhook
   * @param {string} companyId - Company ID to filter webhooks
   * @returns {Object} Trigger results
   */
  async triggerWebhook(eventType, eventData, companyId) {
    // Find all active webhooks for this company subscribed to this event
    const webhooks = await databaseAdapter.find('Webhook', {
      companyId,
      status: 'active'
    });

    const results = {
      triggered: 0,
      succeeded: 0,
      failed: 0,
      deliveries: []
    };

    for (const webhook of webhooks) {
      // Skip if webhook is not subscribed to this event
      if (!webhook.events || !webhook.events.includes(eventType)) {
        continue;
      }

      const deliveryResult = await this._sendWebhookRequest(webhook, eventType, eventData);
      results.triggered += 1;

      if (deliveryResult.success) {
        results.succeeded += 1;
      } else {
        results.failed += 1;
      }

      results.deliveries.push(deliveryResult);
    }

    return results;
  }

  /**
   * Send a webhook request and record the delivery
   * @private
   */
  async _sendWebhookRequest(webhook, eventType, eventData) {
    const deliveryId = `DEL-${uuidv4().slice(0, 8).toUpperCase()}`;
    const timestamp = new Date().toISOString();

    const payload = {
      event: eventType,
      timestamp,
      webhookId: webhook.webhookId,
      data: eventData
    };

    const payloadString = JSON.stringify(payload);
    const signature = this.generateSignature(payloadString, webhook.secret);

    // Build headers
    const headers = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Event': eventType,
      'X-Webhook-Timestamp': timestamp,
      'X-Webhook-Delivery-Id': deliveryId,
      ...(webhook.headers instanceof Map ? Object.fromEntries(webhook.headers) : webhook.headers || {})
    };

    const startTime = Date.now();
    let deliveryRecord;

    try {
      const response = await axios.post(webhook.url, payload, {
        headers,
        timeout: 30000, // 30 second timeout
        validateStatus: () => true // Accept any status code
      });

      const duration = Date.now() - startTime;
      const isSuccess = response.status >= 200 && response.status < 300;

      // Create delivery record
      deliveryRecord = await databaseAdapter.create('WebhookDelivery', {
        deliveryId,
        webhookId: webhook.webhookId,
        eventType,
        payload,
        response: {
          body: typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
          headers: response.headers,
          error: isSuccess ? null : `HTTP ${response.status}`
        },
        statusCode: response.status,
        status: isSuccess ? 'success' : 'failed',
        attempts: 1,
        nextRetryAt: isSuccess ? null : this._calculateNextRetry(1, webhook.retryConfig),
        requestHeaders: headers,
        requestUrl: webhook.url,
        duration,
        completedAt: isSuccess ? new Date() : null
      });

      // Update webhook
      if (isSuccess) {
        await databaseAdapter.findByIdAndUpdate(
          'Webhook',
          webhook._id,
          {
            lastTriggeredAt: new Date(),
            failureCount: 0
          },
          { new: true }
        );
      } else {
        await databaseAdapter.findByIdAndUpdate(
          'Webhook',
          webhook._id,
          {
            lastTriggeredAt: new Date(),
            $inc: { failureCount: 1 }
          },
          { new: true }
        );
      }

      return {
        deliveryId,
        webhookId: webhook.webhookId,
        success: isSuccess,
        statusCode: response.status,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      // Create failed delivery record
      deliveryRecord = await databaseAdapter.create('WebhookDelivery', {
        deliveryId,
        webhookId: webhook.webhookId,
        eventType,
        payload,
        response: {
          body: null,
          headers: null,
          error: error.message
        },
        statusCode: null,
        status: 'failed',
        attempts: 1,
        nextRetryAt: this._calculateNextRetry(1, webhook.retryConfig),
        requestHeaders: headers,
        requestUrl: webhook.url,
        duration
      });

      // Update webhook failure count
      await databaseAdapter.findByIdAndUpdate(
        'Webhook',
        webhook._id,
        {
          lastTriggeredAt: new Date(),
          $inc: { failureCount: 1 }
        },
        { new: true }
      );

      return {
        deliveryId,
        webhookId: webhook.webhookId,
        success: false,
        error: error.message,
        duration
      };
    }
  }

  /**
   * Generate HMAC SHA256 signature for payload
   * @param {string} payload - JSON string payload
   * @param {string} secret - Webhook secret
   * @returns {string} Hex signature
   */
  generateSignature(payload, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Verify webhook signature
   * @param {string} payload - JSON string payload
   * @param {string} signature - Provided signature
   * @param {string} secret - Webhook secret
   * @returns {boolean} Whether signature is valid
   */
  verifyWebhookSignature(payload, signature, secret) {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Retry failed deliveries that are due
   * @returns {Object} Retry results
   */
  async retryFailedDeliveries() {
    // Find failed deliveries that are due for retry
    const failedDeliveries = await databaseAdapter.find('WebhookDelivery', {
      status: 'failed',
      nextRetryAt: { $lte: new Date(), $ne: null }
    });

    const results = {
      retried: 0,
      succeeded: 0,
      failed: 0,
      permanentlyFailed: 0
    };

    for (const delivery of failedDeliveries) {
      // Find the webhook
      const webhooks = await databaseAdapter.find('Webhook', {
        webhookId: delivery.webhookId
      });

      if (!webhooks || webhooks.length === 0) {
        continue;
      }

      const webhook = webhooks[0];

      // Skip if webhook is paused or failed
      if (webhook.status !== 'active') {
        continue;
      }

      results.retried += 1;

      // Attempt to resend
      const retryResult = await this._retryDelivery(delivery, webhook);

      if (retryResult.success) {
        results.succeeded += 1;
      } else if (retryResult.permanentlyFailed) {
        results.permanentlyFailed += 1;
      } else {
        results.failed += 1;
      }
    }

    return results;
  }

  /**
   * Retry a single delivery
   * @private
   */
  async _retryDelivery(delivery, webhook) {
    const newAttempts = delivery.attempts + 1;
    const maxRetries = webhook.retryConfig?.maxRetries || 3;

    const payloadString = JSON.stringify(delivery.payload);
    const signature = this.generateSignature(payloadString, webhook.secret);

    const headers = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Event': delivery.eventType,
      'X-Webhook-Timestamp': new Date().toISOString(),
      'X-Webhook-Delivery-Id': delivery.deliveryId,
      'X-Webhook-Retry-Attempt': newAttempts.toString(),
      ...(webhook.headers instanceof Map ? Object.fromEntries(webhook.headers) : webhook.headers || {})
    };

    const startTime = Date.now();

    try {
      const response = await axios.post(webhook.url, delivery.payload, {
        headers,
        timeout: 30000,
        validateStatus: () => true
      });

      const duration = Date.now() - startTime;
      const isSuccess = response.status >= 200 && response.status < 300;

      if (isSuccess) {
        // Mark as successful
        await databaseAdapter.findByIdAndUpdate(
          'WebhookDelivery',
          delivery._id,
          {
            status: 'success',
            statusCode: response.status,
            response: {
              body: typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
              headers: response.headers,
              error: null
            },
            attempts: newAttempts,
            nextRetryAt: null,
            completedAt: new Date(),
            duration
          },
          { new: true }
        );

        return { success: true };
      } else {
        // Still failing
        const nextRetryAt = newAttempts >= maxRetries ? null : this._calculateNextRetry(newAttempts, webhook.retryConfig);

        await databaseAdapter.findByIdAndUpdate(
          'WebhookDelivery',
          delivery._id,
          {
            status: 'failed',
            statusCode: response.status,
            response: {
              body: typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
              headers: response.headers,
              error: `HTTP ${response.status}`
            },
            attempts: newAttempts,
            nextRetryAt,
            completedAt: nextRetryAt ? null : new Date(),
            duration
          },
          { new: true }
        );

        return {
          success: false,
          permanentlyFailed: nextRetryAt === null
        };
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      const nextRetryAt = newAttempts >= maxRetries ? null : this._calculateNextRetry(newAttempts, webhook.retryConfig);

      await databaseAdapter.findByIdAndUpdate(
        'WebhookDelivery',
        delivery._id,
        {
          status: 'failed',
          statusCode: null,
          response: {
            body: null,
            headers: null,
            error: error.message
          },
          attempts: newAttempts,
          nextRetryAt,
          completedAt: nextRetryAt ? null : new Date(),
          duration
        },
        { new: true }
      );

      return {
        success: false,
        permanentlyFailed: nextRetryAt === null
      };
    }
  }

  /**
   * Calculate next retry time with exponential backoff
   * @private
   */
  _calculateNextRetry(attempts, retryConfig) {
    const baseDelay = retryConfig?.retryDelay || 60000;
    const maxRetries = retryConfig?.maxRetries || 3;

    if (attempts >= maxRetries) {
      return null;
    }

    // Exponential backoff: baseDelay * 2^(attempts-1)
    const backoffDelay = baseDelay * Math.pow(2, attempts - 1);
    const maxDelay = 3600000; // Max 1 hour
    const actualDelay = Math.min(backoffDelay, maxDelay);

    return new Date(Date.now() + actualDelay);
  }

  /**
   * Get delivery history for a webhook
   * @param {string} webhookId - Webhook ID
   * @param {Object} options - Query options
   * @returns {Array} Delivery records
   */
  async getDeliveryHistory(webhookId, options = {}) {
    const query = { webhookId };

    if (options.status) {
      query.status = options.status;
    }

    if (options.startDate || options.endDate) {
      query.createdAt = {};
      if (options.startDate) {
        query.createdAt.$gte = options.startDate;
      }
      if (options.endDate) {
        query.createdAt.$lte = options.endDate;
      }
    }

    const queryOptions = {
      sort: { createdAt: -1 },
      limit: options.limit || 50,
      skip: options.offset || 0
    };

    return await databaseAdapter.find('WebhookDelivery', query, queryOptions);
  }

  /**
   * Update webhook configuration
   * @param {string} webhookId - Webhook document ID
   * @param {Object} updates - Fields to update
   * @returns {Object} Updated webhook
   */
  async updateWebhook(webhookId, updates) {
    // Prevent direct secret updates
    if (updates.secret) {
      throw new Error('Cannot update secret directly');
    }

    // Validate URL if being updated (with SSRF protection)
    if (updates.url) {
      updates.url = validateWebhookUrl(updates.url);
    }

    return await databaseAdapter.findByIdAndUpdate(
      'Webhook',
      webhookId,
      updates,
      { new: true }
    );
  }

  /**
   * Regenerate webhook secret
   * @param {string} webhookId - Webhook document ID
   * @returns {Object} Updated webhook with new secret
   */
  async regenerateSecret(webhookId) {
    const newSecret = this._generateSecret();

    const updated = await databaseAdapter.findByIdAndUpdate(
      'Webhook',
      webhookId,
      { secret: newSecret },
      { new: true }
    );

    if (updated) {
      // Return with visible secret (since it was just regenerated)
      return {
        ...updated,
        secret: newSecret
      };
    }

    return null;
  }

  /**
   * Pause a webhook
   * @param {string} webhookId - Webhook document ID
   * @returns {Object} Updated webhook
   */
  async pauseWebhook(webhookId) {
    return await databaseAdapter.findByIdAndUpdate(
      'Webhook',
      webhookId,
      { status: 'paused' },
      { new: true }
    );
  }

  /**
   * Resume a paused webhook
   * @param {string} webhookId - Webhook document ID
   * @returns {Object} Updated webhook
   */
  async resumeWebhook(webhookId) {
    return await databaseAdapter.findByIdAndUpdate(
      'Webhook',
      webhookId,
      { status: 'active', failureCount: 0 },
      { new: true }
    );
  }

  /**
   * Delete a webhook and its delivery history
   * @param {string} webhookId - Webhook document ID
   * @returns {Object} Deleted webhook
   */
  async deleteWebhook(webhookId) {
    const webhook = await databaseAdapter.findByIdAndDelete('Webhook', webhookId);

    if (webhook) {
      // Also delete delivery history
      await databaseAdapter.delete('WebhookDelivery', {
        webhookId: webhook.webhookId
      });
    }

    return webhook;
  }

  /**
   * Generate a secure random secret
   * @private
   */
  _generateSecret() {
    return crypto.randomBytes(32).toString('hex');
  }

}

module.exports = new WebhookService();

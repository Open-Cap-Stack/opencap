/**
 * Event Streaming Service
 *
 * Provides real-time event streaming functionality for OpenCap
 * using ZeroDB for event publishing, subscriptions, webhooks,
 * and audit logging.
 *
 * Issue #28: Implement event streaming for real-time updates
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const zerodbService = require('./zerodbService');
const websocketService = require('./websocketService');

class EventStreamingService {
  constructor() {
    this.topics = {
      USER_CREATED: 'user.created',
      USER_UPDATED: 'user.updated',
      USER_DELETED: 'user.deleted',
      COMPANY_CREATED: 'company.created',
      COMPANY_UPDATED: 'company.updated',
      TRANSACTION_CREATED: 'transaction.created',
      TRANSACTION_COMPLETED: 'transaction.completed',
      DOCUMENT_UPLOADED: 'document.uploaded',
      DOCUMENT_SIGNED: 'document.signed'
    };

    this.validTopics = new Set(Object.values(this.topics));

    this.config = {
      webhookRetryAttempts: 3,
      webhookRetryDelay: 1000,
      notificationBatchSize: 100,
      webhookTimeout: 30000
    };

    this.httpClient = null;
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  validateEventSchema(event) {
    const errors = [];

    if (!event || typeof event !== 'object') {
      return { valid: false, errors: ['event must be an object'] };
    }

    if (!event.topic) {
      errors.push('topic is required');
    } else if (!this.validTopics.has(event.topic)) {
      errors.push('invalid topic format');
    }

    if (!event.payload) {
      errors.push('payload is required');
    }

    return { valid: errors.length === 0, errors };
  }

  async publishEvent(event) {
    const validation = this.validateEventSchema(event);
    if (!validation.valid) {
      throw new Error(`Invalid event: ${validation.errors.join(', ')}`);
    }

    const eventId = `evt_${uuidv4()}`;
    const timestamp = new Date().toISOString();

    const eventPayload = {
      eventId,
      timestamp,
      ...event.payload
    };

    const result = await zerodbService.publishEvent(event.topic, eventPayload);

    await this.logAuditEntry({
      eventId,
      topic: event.topic,
      actorId: event.metadata?.actorId || 'system',
      action: 'publish',
      metadata: event.metadata
    });

    if (event.notifyUsers && Array.isArray(event.notifyUsers)) {
      for (const userId of event.notifyUsers) {
        try {
          websocketService.sendToUser(userId, {
            type: 'event',
            topic: event.topic,
            payload: eventPayload
          });
        } catch (error) {
          console.error(`Failed to notify user ${userId}:`, error.message);
        }
      }
    }

    return { event_id: eventId, topic: event.topic, published_at: timestamp, ...result };
  }

  async publishUserEvent(action, userData) {
    const validActions = ['created', 'updated', 'deleted'];
    if (!validActions.includes(action)) {
      throw new Error(`Invalid user action: ${action}`);
    }
    return this.publishEvent({ topic: `user.${action}`, payload: { ...userData, action } });
  }

  async publishCompanyEvent(action, companyData) {
    const validActions = ['created', 'updated'];
    if (!validActions.includes(action)) {
      throw new Error(`Invalid company action: ${action}`);
    }
    return this.publishEvent({ topic: `company.${action}`, payload: { ...companyData, action } });
  }

  async publishTransactionEvent(action, transactionData) {
    const validActions = ['created', 'completed'];
    if (!validActions.includes(action)) {
      throw new Error(`Invalid transaction action: ${action}`);
    }
    return this.publishEvent({ topic: `transaction.${action}`, payload: { ...transactionData, action } });
  }

  async publishDocumentEvent(action, documentData) {
    const validActions = ['uploaded', 'signed'];
    if (!validActions.includes(action)) {
      throw new Error(`Invalid document action: ${action}`);
    }
    return this.publishEvent({ topic: `document.${action}`, payload: { ...documentData, action } });
  }

  async createSubscription(subscription) {
    if (!subscription.userId) throw new Error('userId is required');
    if (!subscription.topics || subscription.topics.length === 0) throw new Error('At least one topic is required');

    for (const topic of subscription.topics) {
      if (!this.validTopics.has(topic)) throw new Error(`Invalid topic: ${topic}`);
    }

    const subscriptionId = `sub_${uuidv4()}`;
    const subscriptionData = {
      subscription_id: subscriptionId,
      user_id: subscription.userId,
      topics: subscription.topics,
      filters: subscription.filters || {},
      created_at: new Date().toISOString()
    };

    await zerodbService.insertRows('event_subscriptions', [subscriptionData]);

    return { subscriptionId, topics: subscription.topics, filters: subscription.filters || {}, createdAt: subscriptionData.created_at };
  }

  async getSubscriptions(userId) {
    return await zerodbService.queryTable('event_subscriptions', { filter: { user_id: userId } }) || [];
  }

  async deleteSubscription(subscriptionId, userId) {
    const subscriptions = await zerodbService.queryTable('event_subscriptions', {
      filter: { subscription_id: subscriptionId, user_id: userId }
    });

    if (!subscriptions || subscriptions.length === 0) throw new Error('Subscription not found');

    const subscription = subscriptions.find(s => s.subscription_id === subscriptionId && s.user_id === userId);
    if (!subscription) throw new Error('Subscription not found');

    await zerodbService.deleteRows('event_subscriptions', { filter: { subscription_id: subscriptionId, user_id: userId } });
  }

  async matchSubscriptions(event) {
    const allSubscriptions = await zerodbService.queryTable('event_subscriptions', {});
    if (!allSubscriptions || allSubscriptions.length === 0) return [];

    return allSubscriptions.filter(sub => {
      if (!sub.topics || !sub.topics.includes(event.topic)) return false;
      if (sub.filters && Object.keys(sub.filters).length > 0) {
        for (const [key, value] of Object.entries(sub.filters)) {
          if (event.payload[key] !== value) return false;
        }
      }
      return true;
    });
  }

  async registerWebhook(webhook) {
    try {
      const url = new URL(webhook.url);
      if (url.protocol !== 'https:') throw new Error('Webhook URL must use HTTPS');
    } catch (error) {
      if (error.message === 'Webhook URL must use HTTPS') throw error;
      throw new Error('Invalid webhook URL');
    }

    if (!webhook.topics || webhook.topics.length === 0) throw new Error('At least one topic is required');
    for (const topic of webhook.topics) {
      if (!this.validTopics.has(topic)) throw new Error(`Invalid topic: ${topic}`);
    }

    const webhookId = `wh_${uuidv4()}`;
    const secretHash = webhook.secret ? crypto.createHash('sha256').update(webhook.secret).digest('hex') : null;

    const webhookData = {
      webhook_id: webhookId,
      user_id: webhook.userId,
      url: webhook.url,
      topics: webhook.topics,
      secret_hash: secretHash,
      active: true,
      created_at: new Date().toISOString()
    };

    await zerodbService.insertRows('event_webhooks', [webhookData]);

    return { webhookId, url: webhook.url, topics: webhook.topics, active: true, createdAt: webhookData.created_at };
  }

  async getWebhooks(userId) {
    const webhooks = await zerodbService.queryTable('event_webhooks', { filter: { user_id: userId } });
    if (!webhooks) return [];
    return webhooks.map(({ secret_hash, ...webhook }) => webhook);
  }

  async deleteWebhook(webhookId, userId) {
    const webhooks = await zerodbService.queryTable('event_webhooks', { filter: { webhook_id: webhookId, user_id: userId } });
    if (!webhooks || webhooks.length === 0) throw new Error('Webhook not found');
    await zerodbService.deleteRows('event_webhooks', { filter: { webhook_id: webhookId, user_id: userId } });
  }

  async triggerWebhooks(event) {
    const webhooks = await zerodbService.queryTable('event_webhooks', { filter: { active: true } });
    if (!webhooks || webhooks.length === 0) return;

    const matchingWebhooks = webhooks.filter(wh => wh.topics && wh.topics.includes(event.topic));
    for (const webhook of matchingWebhooks) {
      await this.deliverWebhook(webhook, event);
    }
  }

  async deliverWebhook(webhook, event) {
    const timestamp = new Date().toISOString();
    const payload = { event: { topic: event.topic, payload: event.payload, timestamp } };
    const signature = this.generateWebhookSignature(JSON.stringify(payload), webhook.secret_hash);

    try {
      if (this.httpClient && this.httpClient.post) {
        await this.httpClient.post(webhook.url, payload, {
          headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': signature, 'X-Webhook-Timestamp': timestamp },
          timeout: this.config.webhookTimeout
        });
        await this.logWebhookDelivery(webhook.webhook_id, event, 'success');
      }
    } catch (error) {
      await this.logWebhookDelivery(webhook.webhook_id, event, 'failed', error.message);
    }
  }

  generateWebhookSignature(payload, secretHash) {
    if (!secretHash) return '';
    return crypto.createHmac('sha256', secretHash).update(payload).digest('hex');
  }

  async logWebhookDelivery(webhookId, event, status, error = null) {
    await zerodbService.insertRows('webhook_delivery_log', [{
      log_id: `whl_${uuidv4()}`,
      webhook_id: webhookId,
      topic: event.topic,
      status,
      error,
      timestamp: new Date().toISOString()
    }]);
  }

  async notifySubscribers(event) {
    try {
      const matches = await this.matchSubscriptions(event);
      for (const subscription of matches) {
        try {
          websocketService.sendToUser(subscription.user_id, {
            type: 'event',
            topic: event.topic,
            payload: event.payload,
            subscriptionId: subscription.subscription_id
          });
        } catch (error) {
          console.error(`Failed to notify subscriber ${subscription.user_id}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Error notifying subscribers:', error.message);
    }
  }

  async broadcastEvent(event) {
    websocketService.broadcastToAll({
      type: 'broadcast',
      topic: event.topic,
      payload: event.payload,
      timestamp: new Date().toISOString()
    });
  }

  async filterEvents(criteria) {
    const { topic, startDate, endDate, payloadFilter, limit = 100, offset = 0 } = criteria;
    let events = await zerodbService.listEvents(topic, offset, limit);
    if (!events) return [];

    if (topic) events = events.filter(event => event.topic === topic);

    if (startDate || endDate) {
      events = events.filter(event => {
        const eventDate = new Date(event.published_at);
        if (startDate && eventDate < new Date(startDate)) return false;
        if (endDate && eventDate > new Date(endDate)) return false;
        return true;
      });
    }

    if (payloadFilter && Object.keys(payloadFilter).length > 0) {
      events = events.filter(event => {
        for (const [key, value] of Object.entries(payloadFilter)) {
          if (event.event_payload?.[key] !== value) return false;
        }
        return true;
      });
    }

    return events;
  }

  async getAuditLog(criteria = {}) {
    const { actorId, topic, startDate, endDate, limit = 100, offset = 0 } = criteria;
    const filter = {};

    if (actorId) filter.actor_id = actorId;
    if (topic) filter.topic = topic;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = startDate;
      if (endDate) filter.timestamp.$lte = endDate;
    }

    return await zerodbService.queryTable('event_audit_log', { filter, limit, skip: offset, sort: { timestamp: -1 } }) || [];
  }

  async logAuditEntry(entry) {
    await zerodbService.insertRows('event_audit_log', [{
      log_id: `aud_${uuidv4()}`,
      event_id: entry.eventId,
      topic: entry.topic,
      actor_id: entry.actorId,
      action: entry.action,
      metadata: entry.metadata || {},
      timestamp: new Date().toISOString()
    }]);
  }

  async replayEvents(options) {
    const { topic, callback, limit = 1000, offset = 0 } = options;
    const events = await zerodbService.listEvents(topic, offset, limit);
    if (!events) return;

    events.sort((a, b) => new Date(a.published_at) - new Date(b.published_at));
    for (const event of events) await callback(event);
  }

  async getEventStats(options = {}) {
    const { startDate, endDate } = options;
    const filter = {};
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = startDate;
      if (endDate) filter.timestamp.$lte = endDate;
    }

    const stats = await zerodbService.queryTable('event_audit_log', { filter });
    if (!stats || stats.length === 0) return { totalEvents: 0, eventsByTopic: {} };

    const eventsByTopic = {};
    for (const entry of stats) {
      eventsByTopic[entry.topic] = (eventsByTopic[entry.topic] || 0) + (entry.count || 1);
    }

    return { totalEvents: Object.values(eventsByTopic).reduce((sum, count) => sum + count, 0), eventsByTopic };
  }
}

module.exports = EventStreamingService;

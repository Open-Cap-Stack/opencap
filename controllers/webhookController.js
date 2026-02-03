/**
 * Webhook Controller
 * Issue #118: Build Webhook System
 *
 * API controller for webhook management including:
 * - CRUD operations for webhooks
 * - Webhook triggering and testing
 * - Delivery history and retry management
 */
const databaseAdapter = require('../services/databaseAdapter');
const webhookService = require('../services/webhookService');

/**
 * Create a new webhook
 */
exports.createWebhook = async (req, res) => {
  try {
    const webhookData = {
      companyId: req.body.companyId,
      name: req.body.name,
      description: req.body.description,
      url: req.body.url,
      events: req.body.events,
      retryConfig: req.body.retryConfig,
      headers: req.body.headers,
      createdBy: req.body.createdBy || req.user?.id,
      metadata: req.body.metadata
    };

    const webhook = await webhookService.registerWebhook(webhookData);

    res.status(201).json(webhook);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get all webhooks with optional filters
 */
exports.getWebhooks = async (req, res) => {
  try {
    const { companyId, status } = req.query;
    const query = {};

    if (companyId) query.companyId = companyId;
    if (status) query.status = status;

    const webhooks = await databaseAdapter.find('Webhook', query);

    // Remove secrets from response
    const sanitizedWebhooks = webhooks.map(webhook => {
      const { secret, ...rest } = webhook;
      return rest;
    });

    res.status(200).json(sanitizedWebhooks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get webhook by ID
 */
exports.getWebhookById = async (req, res) => {
  try {
    const webhook = await databaseAdapter.findById('Webhook', req.params.id);

    if (!webhook) {
      return res.status(404).json({ message: 'Webhook not found' });
    }

    // Remove secret from response
    const { secret, ...sanitizedWebhook } = webhook;

    res.status(200).json(sanitizedWebhook);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update webhook
 */
exports.updateWebhook = async (req, res) => {
  try {
    const webhook = await webhookService.updateWebhook(req.params.id, req.body);

    if (!webhook) {
      return res.status(404).json({ message: 'Webhook not found' });
    }

    // Remove secret from response
    const { secret, ...sanitizedWebhook } = webhook;

    res.status(200).json(sanitizedWebhook);
  } catch (error) {
    if (error.message === 'Cannot update secret directly') {
      return res.status(400).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
};

/**
 * Delete webhook
 */
exports.deleteWebhook = async (req, res) => {
  try {
    const webhook = await webhookService.deleteWebhook(req.params.id);

    if (!webhook) {
      return res.status(404).json({ message: 'Webhook not found' });
    }

    res.status(200).json({ message: 'Webhook deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Manually trigger a webhook
 */
exports.triggerWebhook = async (req, res) => {
  try {
    const { eventType, data } = req.body;

    if (!eventType) {
      return res.status(400).json({ error: 'eventType is required' });
    }

    const webhook = await databaseAdapter.findById('Webhook', req.params.id);

    if (!webhook) {
      return res.status(404).json({ message: 'Webhook not found' });
    }

    if (webhook.status === 'paused') {
      return res.status(400).json({ message: 'Webhook is paused' });
    }

    if (webhook.status === 'failed') {
      return res.status(400).json({ message: 'Webhook has failed and needs to be resumed' });
    }

    const result = await webhookService.triggerWebhook(
      eventType,
      data || {},
      webhook.companyId
    );

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get delivery history for a webhook
 */
exports.getDeliveryHistory = async (req, res) => {
  try {
    const webhook = await databaseAdapter.findById('Webhook', req.params.id);

    if (!webhook) {
      return res.status(404).json({ message: 'Webhook not found' });
    }

    const options = {
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 50,
      offset: req.query.offset ? parseInt(req.query.offset, 10) : 0
    };

    if (req.query.status) {
      options.status = req.query.status;
    }

    if (req.query.startDate) {
      options.startDate = new Date(req.query.startDate);
    }

    if (req.query.endDate) {
      options.endDate = new Date(req.query.endDate);
    }

    const deliveries = await webhookService.getDeliveryHistory(webhook.webhookId, options);

    res.status(200).json(deliveries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Retry all failed deliveries
 */
exports.retryFailedDeliveries = async (req, res) => {
  try {
    const result = await webhookService.retryFailedDeliveries();

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Pause a webhook
 */
exports.pauseWebhook = async (req, res) => {
  try {
    const webhook = await webhookService.pauseWebhook(req.params.id);

    if (!webhook) {
      return res.status(404).json({ message: 'Webhook not found' });
    }

    // Remove secret from response
    const { secret, ...sanitizedWebhook } = webhook;

    res.status(200).json(sanitizedWebhook);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Resume a paused webhook
 */
exports.resumeWebhook = async (req, res) => {
  try {
    const webhook = await webhookService.resumeWebhook(req.params.id);

    if (!webhook) {
      return res.status(404).json({ message: 'Webhook not found' });
    }

    // Remove secret from response
    const { secret, ...sanitizedWebhook } = webhook;

    res.status(200).json(sanitizedWebhook);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Regenerate webhook secret
 */
exports.regenerateSecret = async (req, res) => {
  try {
    const webhook = await webhookService.regenerateSecret(req.params.id);

    if (!webhook) {
      return res.status(404).json({ message: 'Webhook not found' });
    }

    // Return webhook with new secret visible
    res.status(200).json(webhook);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Verify a webhook signature
 */
exports.verifySignature = async (req, res) => {
  try {
    const { payload, signature, secret } = req.body;

    if (!payload || !signature || !secret) {
      return res.status(400).json({ error: 'payload, signature, and secret are required' });
    }

    const isValid = webhookService.verifyWebhookSignature(payload, signature, secret);

    res.status(200).json({ valid: isValid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Test a webhook with a test payload
 */
exports.testWebhook = async (req, res) => {
  try {
    const webhook = await databaseAdapter.findById('Webhook', req.params.id);

    if (!webhook) {
      return res.status(404).json({ message: 'Webhook not found' });
    }

    // Send test event
    const testPayload = {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'This is a test webhook delivery from OpenCap Stack'
    };

    const result = await webhookService.triggerWebhook(
      'webhook.test',
      testPayload,
      webhook.companyId
    );

    res.status(200).json({
      message: 'Test webhook sent',
      ...result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get webhook statistics
 */
exports.getWebhookStatistics = async (req, res) => {
  try {
    const webhook = await databaseAdapter.findById('Webhook', req.params.id);

    if (!webhook) {
      return res.status(404).json({ message: 'Webhook not found' });
    }

    // Get delivery statistics
    const deliveries = await databaseAdapter.find('WebhookDelivery', {
      webhookId: webhook.webhookId
    });

    const stats = {
      webhookId: webhook.webhookId,
      status: webhook.status,
      failureCount: webhook.failureCount,
      lastTriggeredAt: webhook.lastTriggeredAt,
      totalDeliveries: deliveries.length,
      successfulDeliveries: deliveries.filter(d => d.status === 'success').length,
      failedDeliveries: deliveries.filter(d => d.status === 'failed').length,
      pendingDeliveries: deliveries.filter(d => d.status === 'pending').length
    };

    stats.successRate = stats.totalDeliveries > 0
      ? ((stats.successfulDeliveries / stats.totalDeliveries) * 100).toFixed(2)
      : 0;

    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

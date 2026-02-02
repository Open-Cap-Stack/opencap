/**
 * Event Streaming Controller
 *
 * Handles HTTP requests for event streaming operations.
 * Issue #28: Implement event streaming for real-time updates
 */

const EventStreamingService = require('../services/eventStreamingService');
const eventStreamingService = new EventStreamingService();

exports.publishEvent = async (req, res) => {
  try {
    const { topic, payload, metadata, notifyUsers } = req.body;

    if (!topic) return res.status(400).json({ success: false, error: 'topic is required' });
    if (!payload) return res.status(400).json({ success: false, error: 'payload is required' });

    const eventMetadata = { ...metadata, actorId: req.user?.userId || 'anonymous', source: 'api' };
    const result = await eventStreamingService.publishEvent({ topic, payload, metadata: eventMetadata, notifyUsers });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Error publishing event:', error);
    if (error.message.includes('Invalid event')) return res.status(400).json({ success: false, error: error.message });
    res.status(500).json({ success: false, error: 'Failed to publish event', message: error.message });
  }
};

exports.getEvents = async (req, res) => {
  try {
    const { topic, startDate, endDate, limit = 100, offset = 0 } = req.query;
    let payloadFilter = {};
    if (req.query.filter) {
      try { payloadFilter = JSON.parse(req.query.filter); }
      catch (e) { return res.status(400).json({ success: false, error: 'Invalid filter format. Must be valid JSON.' }); }
    }

    const events = await eventStreamingService.filterEvents({ topic, startDate, endDate, payloadFilter, limit: parseInt(limit, 10), offset: parseInt(offset, 10) });
    res.status(200).json({ success: true, data: events, pagination: { limit: parseInt(limit, 10), offset: parseInt(offset, 10), count: events.length } });
  } catch (error) {
    console.error('Error getting events:', error);
    res.status(500).json({ success: false, error: 'Failed to get events', message: error.message });
  }
};

exports.publishUserEvent = async (req, res) => {
  try {
    const { action, userData } = req.body;
    if (!action) return res.status(400).json({ success: false, error: 'action is required' });
    if (!userData) return res.status(400).json({ success: false, error: 'userData is required' });

    const result = await eventStreamingService.publishUserEvent(action, userData);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Error publishing user event:', error);
    if (error.message.includes('Invalid user action')) return res.status(400).json({ success: false, error: error.message });
    res.status(500).json({ success: false, error: 'Failed to publish user event', message: error.message });
  }
};

exports.publishCompanyEvent = async (req, res) => {
  try {
    const { action, companyData } = req.body;
    if (!action) return res.status(400).json({ success: false, error: 'action is required' });
    if (!companyData) return res.status(400).json({ success: false, error: 'companyData is required' });

    const result = await eventStreamingService.publishCompanyEvent(action, companyData);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Error publishing company event:', error);
    if (error.message.includes('Invalid company action')) return res.status(400).json({ success: false, error: error.message });
    res.status(500).json({ success: false, error: 'Failed to publish company event', message: error.message });
  }
};

exports.publishTransactionEvent = async (req, res) => {
  try {
    const { action, transactionData } = req.body;
    if (!action) return res.status(400).json({ success: false, error: 'action is required' });
    if (!transactionData) return res.status(400).json({ success: false, error: 'transactionData is required' });

    const result = await eventStreamingService.publishTransactionEvent(action, transactionData);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Error publishing transaction event:', error);
    if (error.message.includes('Invalid transaction action')) return res.status(400).json({ success: false, error: error.message });
    res.status(500).json({ success: false, error: 'Failed to publish transaction event', message: error.message });
  }
};

exports.publishDocumentEvent = async (req, res) => {
  try {
    const { action, documentData } = req.body;
    if (!action) return res.status(400).json({ success: false, error: 'action is required' });
    if (!documentData) return res.status(400).json({ success: false, error: 'documentData is required' });

    const result = await eventStreamingService.publishDocumentEvent(action, documentData);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Error publishing document event:', error);
    if (error.message.includes('Invalid document action')) return res.status(400).json({ success: false, error: error.message });
    res.status(500).json({ success: false, error: 'Failed to publish document event', message: error.message });
  }
};

exports.createSubscription = async (req, res) => {
  try {
    const { topics, filters } = req.body;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });
    if (!topics || !Array.isArray(topics)) return res.status(400).json({ success: false, error: 'topics must be an array' });

    const result = await eventStreamingService.createSubscription({ topics, filters, userId });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Error creating subscription:', error);
    if (error.message.includes('Invalid topic') || error.message.includes('required')) return res.status(400).json({ success: false, error: error.message });
    res.status(500).json({ success: false, error: 'Failed to create subscription', message: error.message });
  }
};

exports.getSubscriptions = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const subscriptions = await eventStreamingService.getSubscriptions(userId);
    res.status(200).json({ success: true, data: subscriptions });
  } catch (error) {
    console.error('Error getting subscriptions:', error);
    res.status(500).json({ success: false, error: 'Failed to get subscriptions', message: error.message });
  }
};

exports.deleteSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    await eventStreamingService.deleteSubscription(id, userId);
    res.status(200).json({ success: true, message: 'Subscription deleted successfully' });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    if (error.message === 'Subscription not found') return res.status(404).json({ success: false, error: error.message });
    res.status(500).json({ success: false, error: 'Failed to delete subscription', message: error.message });
  }
};

exports.registerWebhook = async (req, res) => {
  try {
    const { url, topics, secret } = req.body;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });
    if (!url) return res.status(400).json({ success: false, error: 'url is required' });
    if (!topics || !Array.isArray(topics)) return res.status(400).json({ success: false, error: 'topics must be an array' });

    const result = await eventStreamingService.registerWebhook({ url, topics, secret, userId });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Error registering webhook:', error);
    if (error.message.includes('Invalid') || error.message.includes('HTTPS')) return res.status(400).json({ success: false, error: error.message });
    res.status(500).json({ success: false, error: 'Failed to register webhook', message: error.message });
  }
};

exports.getWebhooks = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const webhooks = await eventStreamingService.getWebhooks(userId);
    res.status(200).json({ success: true, data: webhooks });
  } catch (error) {
    console.error('Error getting webhooks:', error);
    res.status(500).json({ success: false, error: 'Failed to get webhooks', message: error.message });
  }
};

exports.deleteWebhook = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    await eventStreamingService.deleteWebhook(id, userId);
    res.status(200).json({ success: true, message: 'Webhook deleted successfully' });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    if (error.message === 'Webhook not found') return res.status(404).json({ success: false, error: error.message });
    res.status(500).json({ success: false, error: 'Failed to delete webhook', message: error.message });
  }
};

exports.getAuditLog = async (req, res) => {
  try {
    const { actorId, topic, startDate, endDate, limit = 100, offset = 0 } = req.query;
    const auditLog = await eventStreamingService.getAuditLog({ actorId, topic, startDate, endDate, limit: parseInt(limit, 10), offset: parseInt(offset, 10) });
    res.status(200).json({ success: true, data: auditLog, pagination: { limit: parseInt(limit, 10), offset: parseInt(offset, 10), count: auditLog.length } });
  } catch (error) {
    console.error('Error getting audit log:', error);
    res.status(500).json({ success: false, error: 'Failed to get audit log', message: error.message });
  }
};

exports.getEventStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const stats = await eventStreamingService.getEventStats({ startDate, endDate });
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error('Error getting event stats:', error);
    res.status(500).json({ success: false, error: 'Failed to get event statistics', message: error.message });
  }
};

exports.getTopics = async (req, res) => {
  try {
    const topics = Object.entries(eventStreamingService.topics).map(([key, value]) => ({ key, topic: value, description: `Event topic for ${value.replace('.', ' ')}` }));
    res.status(200).json({ success: true, data: topics });
  } catch (error) {
    console.error('Error getting topics:', error);
    res.status(500).json({ success: false, error: 'Failed to get topics', message: error.message });
  }
};

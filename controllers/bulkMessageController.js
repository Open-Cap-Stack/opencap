/**
 * BulkMessage Controller
 * Issue #86: Create Bulk Messaging System
 *
 * API controller for bulk messaging operations including
 * CRUD, sending, scheduling, and delivery tracking.
 */
const databaseAdapter = require('../services/databaseAdapter');
const bulkMessageService = require('../services/bulkMessageService');

const VALID_MESSAGE_TYPES = ['email', 'sms', 'notification', 'in-app'];
const VALID_STATUSES = ['draft', 'scheduled', 'processing', 'sent', 'partially_sent', 'failed', 'cancelled'];

/**
 * Build query filter from request query parameters
 * @param {Object} query - Request query parameters
 * @returns {Object} MongoDB-style query filter
 */
const buildBulkMessageFilter = (query) => {
  const filter = {};

  if (query.companyId) {
    filter.companyId = query.companyId;
  }

  if (query.status) {
    const statuses = query.status.split(',').map(s => s.trim());
    if (statuses.length === 1) {
      filter.status = statuses[0];
    } else {
      filter.status = { $in: statuses };
    }
  }

  if (query.messageType) {
    filter.messageType = query.messageType;
  }

  if (query.senderId) {
    filter.senderId = query.senderId;
  }

  return filter;
};

/**
 * Create a new bulk message
 * POST /api/v1/bulk-messages
 */
exports.createBulkMessage = async (req, res) => {
  try {
    const {
      bulkMessageId,
      companyId,
      senderId,
      subject,
      content,
      messageType,
      recipientFilter,
      templateVariables,
      rateLimiting,
      metadata,
      tags
    } = req.body;

    // Validate required fields
    if (!bulkMessageId || !companyId || !senderId || !subject || !content || !messageType || !recipientFilter) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate messageType
    if (!VALID_MESSAGE_TYPES.includes(messageType)) {
      return res.status(400).json({
        message: `Invalid messageType. Must be one of: ${VALID_MESSAGE_TYPES.join(', ')}`
      });
    }

    const bulkMessageData = {
      bulkMessageId,
      companyId,
      senderId,
      subject,
      content,
      messageType,
      recipientFilter,
      templateVariables,
      rateLimiting,
      metadata,
      tags,
      status: 'draft'
    };

    const savedMessage = await databaseAdapter.create('BulkMessage', bulkMessageData);
    res.status(201).json({ bulkMessage: savedMessage });
  } catch (error) {
    console.error('Error creating bulk message:', error);
    res.status(500).json({ message: 'Failed to create bulk message', error: error.message });
  }
};

/**
 * Get all bulk messages with optional filtering and pagination
 * GET /api/v1/bulk-messages
 */
exports.getBulkMessages = async (req, res) => {
  try {
    const filter = buildBulkMessageFilter(req.query);
    const limit = Math.max(parseInt(req.query.limit) || 50, 1);
    const skip = Math.max(parseInt(req.query.offset) || 0, 0);

    const bulkMessages = await databaseAdapter.find('BulkMessage', filter, {
      skip,
      limit,
      sort: { createdAt: -1 }
    });

    let total = 0;
    if (databaseAdapter.count) {
      total = await databaseAdapter.count('BulkMessage', filter);
    } else {
      total = bulkMessages.length;
    }

    const hasMore = skip + bulkMessages.length < total;

    res.status(200).json({
      bulkMessages,
      total,
      hasMore
    });
  } catch (error) {
    console.error('Error retrieving bulk messages:', error);
    res.status(500).json({ message: 'Failed to retrieve bulk messages', error: error.message });
  }
};

/**
 * Get a bulk message by ID
 * GET /api/v1/bulk-messages/:id
 */
exports.getBulkMessageById = async (req, res) => {
  try {
    const bulkMessage = await databaseAdapter.findById('BulkMessage', req.params.id);

    if (!bulkMessage) {
      return res.status(404).json({ message: 'Bulk message not found' });
    }

    res.status(200).json({ bulkMessage });
  } catch (error) {
    console.error('Error retrieving bulk message:', error);
    res.status(500).json({ message: 'Failed to retrieve bulk message', error: error.message });
  }
};

/**
 * Update a bulk message (only draft messages can be updated)
 * PUT /api/v1/bulk-messages/:id
 */
exports.updateBulkMessage = async (req, res) => {
  try {
    const existingMessage = await databaseAdapter.findById('BulkMessage', req.params.id);

    if (!existingMessage) {
      return res.status(404).json({ message: 'Bulk message not found' });
    }

    // Only allow updates to draft messages
    if (existingMessage.status !== 'draft' && existingMessage.status !== 'scheduled') {
      return res.status(400).json({ message: 'Cannot update a sent message' });
    }

    const allowedUpdates = [
      'subject', 'content', 'messageType', 'recipientFilter',
      'templateVariables', 'rateLimiting', 'metadata', 'tags'
    ];

    const updateData = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const updatedMessage = await databaseAdapter.findByIdAndUpdate(
      'BulkMessage',
      req.params.id,
      updateData,
      { new: true }
    );

    res.status(200).json({ bulkMessage: updatedMessage });
  } catch (error) {
    console.error('Error updating bulk message:', error);
    res.status(500).json({ message: 'Failed to update bulk message', error: error.message });
  }
};

/**
 * Delete a bulk message
 * DELETE /api/v1/bulk-messages/:id
 */
exports.deleteBulkMessage = async (req, res) => {
  try {
    const deletedMessage = await databaseAdapter.findByIdAndDelete('BulkMessage', req.params.id);

    if (!deletedMessage) {
      return res.status(404).json({ message: 'Bulk message not found' });
    }

    res.status(200).json({ message: 'Bulk message deleted' });
  } catch (error) {
    console.error('Error deleting bulk message:', error);
    res.status(500).json({ message: 'Failed to delete bulk message', error: error.message });
  }
};

/**
 * Send a bulk message immediately
 * POST /api/v1/bulk-messages/:id/send
 */
exports.sendBulkMessage = async (req, res) => {
  try {
    const message = await databaseAdapter.findById('BulkMessage', req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Bulk message not found' });
    }

    // Check if message has already been sent
    if (message.status === 'sent' || message.status === 'partially_sent') {
      return res.status(400).json({ message: 'Message has already been sent' });
    }

    if (message.status === 'processing') {
      return res.status(400).json({ message: 'Message is currently being processed' });
    }

    // Send the message
    const result = await bulkMessageService.sendBulkMessage(message);

    res.status(200).json({
      success: result.success,
      totalRecipients: result.totalRecipients,
      sent: result.sent,
      failed: result.failed
    });
  } catch (error) {
    console.error('Error sending bulk message:', error);
    res.status(500).json({ message: 'Failed to send bulk message', error: error.message });
  }
};

/**
 * Schedule a bulk message for future delivery
 * POST /api/v1/bulk-messages/:id/schedule
 */
exports.scheduleBulkMessage = async (req, res) => {
  try {
    const { scheduledAt } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({ message: 'scheduledAt is required' });
    }

    const scheduledTime = new Date(scheduledAt);

    // Validate scheduled time is in the future
    if (scheduledTime <= new Date()) {
      return res.status(400).json({ message: 'Scheduled time must be in the future' });
    }

    const message = await databaseAdapter.findById('BulkMessage', req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Bulk message not found' });
    }

    // Only draft messages can be scheduled
    if (message.status !== 'draft') {
      return res.status(400).json({ message: 'Only draft messages can be scheduled' });
    }

    const updatedMessage = await databaseAdapter.findByIdAndUpdate(
      'BulkMessage',
      req.params.id,
      {
        status: 'scheduled',
        scheduledAt: scheduledTime
      },
      { new: true }
    );

    res.status(200).json({
      message: 'Message scheduled successfully',
      bulkMessage: updatedMessage
    });
  } catch (error) {
    console.error('Error scheduling bulk message:', error);
    res.status(500).json({ message: 'Failed to schedule bulk message', error: error.message });
  }
};

/**
 * Cancel a scheduled message
 * POST /api/v1/bulk-messages/:id/cancel
 */
exports.cancelScheduledMessage = async (req, res) => {
  try {
    const message = await databaseAdapter.findById('BulkMessage', req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Bulk message not found' });
    }

    if (message.status !== 'scheduled') {
      return res.status(400).json({ message: 'Only scheduled messages can be cancelled' });
    }

    const updatedMessage = await databaseAdapter.findByIdAndUpdate(
      'BulkMessage',
      req.params.id,
      {
        status: 'cancelled',
        cancelledAt: new Date()
      },
      { new: true }
    );

    res.status(200).json({
      message: 'Scheduled message cancelled',
      bulkMessage: updatedMessage
    });
  } catch (error) {
    console.error('Error cancelling scheduled message:', error);
    res.status(500).json({ message: 'Failed to cancel scheduled message', error: error.message });
  }
};

/**
 * Preview recipients for a bulk message
 * GET /api/v1/bulk-messages/:id/recipients
 */
exports.previewRecipients = async (req, res) => {
  try {
    const message = await databaseAdapter.findById('BulkMessage', req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Bulk message not found' });
    }

    const recipients = await bulkMessageService.getRecipientsByFilter(message.recipientFilter);

    res.status(200).json({
      recipients,
      totalCount: recipients.length
    });
  } catch (error) {
    console.error('Error previewing recipients:', error);
    res.status(500).json({ message: 'Failed to preview recipients', error: error.message });
  }
};

/**
 * Get delivery status for a bulk message
 * GET /api/v1/bulk-messages/:id/status
 */
exports.getDeliveryStatus = async (req, res) => {
  try {
    const message = await databaseAdapter.findById('BulkMessage', req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Bulk message not found' });
    }

    const failedRecipients = (message.recipients || []).filter(r => r.status === 'failed');

    res.status(200).json({
      status: message.status,
      deliveryStats: message.deliveryStats || {},
      sentAt: message.sentAt,
      completedAt: message.completedAt,
      failedRecipients
    });
  } catch (error) {
    console.error('Error getting delivery status:', error);
    res.status(500).json({ message: 'Failed to get delivery status', error: error.message });
  }
};

/**
 * Retry sending to failed recipients
 * POST /api/v1/bulk-messages/:id/retry
 */
exports.retryFailedRecipients = async (req, res) => {
  try {
    const message = await databaseAdapter.findById('BulkMessage', req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Bulk message not found' });
    }

    const failedRecipients = (message.recipients || []).filter(r => r.status === 'failed');

    if (failedRecipients.length === 0) {
      return res.status(400).json({ message: 'No failed recipients to retry' });
    }

    const result = await bulkMessageService.retryFailedRecipients(message);

    res.status(200).json({
      success: result.success,
      retried: result.retried,
      succeeded: result.succeeded,
      stillFailed: result.stillFailed
    });
  } catch (error) {
    console.error('Error retrying failed recipients:', error);
    res.status(500).json({ message: 'Failed to retry failed recipients', error: error.message });
  }
};

/**
 * Get message history for a company
 * GET /api/v1/bulk-messages/history
 */
exports.getMessageHistory = async (req, res) => {
  try {
    const { companyId, limit = 50, offset = 0 } = req.query;

    if (!companyId) {
      return res.status(400).json({ message: 'companyId is required' });
    }

    const messages = await databaseAdapter.find('BulkMessage', { companyId }, {
      skip: parseInt(offset),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    });

    let total = 0;
    if (databaseAdapter.count) {
      total = await databaseAdapter.count('BulkMessage', { companyId });
    } else {
      total = messages.length;
    }

    res.status(200).json({
      messages,
      total,
      hasMore: parseInt(offset) + messages.length < total
    });
  } catch (error) {
    console.error('Error getting message history:', error);
    res.status(500).json({ message: 'Failed to get message history', error: error.message });
  }
};

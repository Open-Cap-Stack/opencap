/**
 * BulkMessage Service
 * Issue #86: Create Bulk Messaging System
 *
 * Handles bulk message sending with batching, rate limiting,
 * template processing, and delivery tracking.
 */
const databaseAdapter = require('./databaseAdapter');

/**
 * Get recipients based on filter criteria
 * @param {Object} filter - Recipient filter configuration
 * @returns {Promise<Array>} List of recipients
 */
async function getRecipientsByFilter(filter) {
  if (!filter || !filter.filterType) {
    return [];
  }

  let query = {};

  switch (filter.filterType) {
    case 'all':
      // No filter - get all stakeholders
      query = {};
      break;

    case 'role':
      if (filter.roles && filter.roles.length > 0) {
        query = { role: { $in: filter.roles } };
      }
      break;

    case 'company':
      if (filter.companyIds && filter.companyIds.length > 0) {
        query = { projectId: { $in: filter.companyIds } };
      }
      break;

    case 'custom':
      if (filter.stakeholderIds && filter.stakeholderIds.length > 0) {
        query = { stakeholderId: { $in: filter.stakeholderIds } };
      } else if (filter.customQuery) {
        query = filter.customQuery;
      }
      break;

    default:
      return [];
  }

  try {
    const stakeholders = await databaseAdapter.find('Stakeholder', query, {
      limit: 10000 // Max recipients per message
    });
    return stakeholders || [];
  } catch (error) {
    console.error('Error fetching recipients:', error);
    return [];
  }
}

/**
 * Apply template variables to message content
 * @param {string} template - Message template with {{variable}} placeholders
 * @param {Object} data - Data to replace variables with
 * @returns {string} Processed message
 */
function applyTemplate(template, data) {
  if (!template) return '';
  if (!data) return template;

  return template.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
    const value = data[variable];
    return value !== undefined ? String(value) : '';
  });
}

/**
 * Simulate sending a single message
 * In production, this would integrate with email/SMS services
 * @param {Object} message - Message configuration
 * @param {Object} recipient - Recipient data
 * @returns {Promise<Object>} Send result
 */
async function sendSingleMessage(message, recipient) {
  // Simulate message sending (replace with actual service integration)
  const success = Math.random() > 0.05; // 95% success rate simulation

  return {
    success,
    recipientId: recipient.stakeholderId,
    sentAt: new Date(),
    error: success ? null : 'Simulated delivery failure'
  };
}

/**
 * Send bulk message to all recipients with rate limiting
 * @param {Object} message - Bulk message document
 * @returns {Promise<Object>} Sending results
 */
async function sendBulkMessage(message) {
  const { rateLimiting = { batchSize: 100, delayBetweenBatches: 500 } } = message;

  // Get recipients
  const recipients = await getRecipientsByFilter(message.recipientFilter);

  if (recipients.length === 0) {
    return {
      success: true,
      totalRecipients: 0,
      sent: 0,
      failed: 0,
      recipients: []
    };
  }

  // Update status to processing
  await databaseAdapter.findByIdAndUpdate('BulkMessage', message._id, {
    status: 'processing',
    sentAt: new Date()
  }, { new: true });

  const results = {
    totalRecipients: recipients.length,
    sent: 0,
    failed: 0,
    recipients: []
  };

  // Process recipients in batches
  const batches = [];
  for (let i = 0; i < recipients.length; i += rateLimiting.batchSize) {
    batches.push(recipients.slice(i, i + rateLimiting.batchSize));
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];

    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(async (recipient) => {
        const personalizedContent = applyTemplate(message.content, recipient);
        const personalizedSubject = applyTemplate(message.subject, recipient);

        const sendResult = await sendSingleMessage({
          ...message,
          content: personalizedContent,
          subject: personalizedSubject
        }, recipient);

        const recipientStatus = {
          stakeholderId: recipient.stakeholderId,
          name: recipient.name,
          email: recipient.email,
          phone: recipient.phone,
          status: sendResult.success ? 'sent' : 'failed',
          sentAt: sendResult.sentAt,
          errorMessage: sendResult.error
        };

        if (sendResult.success) {
          results.sent++;
        } else {
          results.failed++;
        }

        return recipientStatus;
      })
    );

    results.recipients.push(...batchResults);

    // Apply rate limiting delay between batches (except for last batch)
    if (batchIndex < batches.length - 1 && rateLimiting.delayBetweenBatches > 0) {
      await new Promise(resolve => setTimeout(resolve, rateLimiting.delayBetweenBatches));
    }
  }

  // Determine final status
  const finalStatus = results.failed === 0 ? 'sent' :
    results.sent === 0 ? 'failed' : 'partially_sent';

  // Update message with results
  await databaseAdapter.findByIdAndUpdate('BulkMessage', message._id, {
    status: finalStatus,
    completedAt: new Date(),
    recipients: results.recipients,
    deliveryStats: {
      totalRecipients: results.totalRecipients,
      sent: results.sent,
      delivered: results.sent, // Initially assume all sent are delivered
      failed: results.failed,
      bounced: 0,
      opened: 0,
      clicked: 0
    }
  }, { new: true });

  // Generate audit log
  await generateAuditLog(message, finalStatus);

  return {
    success: true,
    ...results
  };
}

/**
 * Process scheduled messages that are due
 * @returns {Promise<Object>} Processing results
 */
async function processScheduledMessages() {
  const now = new Date();

  // Find messages scheduled for now or earlier
  const scheduledMessages = await databaseAdapter.find('BulkMessage', {
    status: 'scheduled',
    scheduledAt: { $lte: now }
  }, {
    limit: 10 // Process max 10 messages at a time
  });

  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0
  };

  for (const message of scheduledMessages) {
    try {
      // Update status to processing
      await databaseAdapter.findByIdAndUpdate('BulkMessage', message._id, {
        status: 'processing'
      }, { new: true });

      // Send the message
      await sendBulkMessage(message);
      results.succeeded++;
    } catch (error) {
      console.error(`Failed to process scheduled message ${message._id}:`, error);
      await databaseAdapter.findByIdAndUpdate('BulkMessage', message._id, {
        status: 'failed',
        errorMessage: error.message
      }, { new: true });
      results.failed++;
    }
    results.processed++;
  }

  return results;
}

/**
 * Cancel a scheduled message
 * @param {string} messageId - Message ID to cancel
 * @returns {Promise<Object>} Cancelled message
 */
async function cancelScheduledMessage(messageId) {
  return databaseAdapter.findByIdAndUpdate('BulkMessage', messageId, {
    status: 'cancelled',
    cancelledAt: new Date()
  }, { new: true });
}

/**
 * Retry sending to failed recipients
 * @param {Object} message - Bulk message with failed recipients
 * @returns {Promise<Object>} Retry results
 */
async function retryFailedRecipients(message) {
  const failedRecipients = (message.recipients || []).filter(r => r.status === 'failed');

  if (failedRecipients.length === 0) {
    return {
      success: true,
      retried: 0,
      succeeded: 0,
      stillFailed: 0
    };
  }

  const { rateLimiting = { batchSize: 100, delayBetweenBatches: 500 } } = message;

  const results = {
    retried: failedRecipients.length,
    succeeded: 0,
    stillFailed: 0
  };

  // Retry in batches
  const batches = [];
  for (let i = 0; i < failedRecipients.length; i += rateLimiting.batchSize) {
    batches.push(failedRecipients.slice(i, i + rateLimiting.batchSize));
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];

    const batchResults = await Promise.all(
      batch.map(async (recipient) => {
        const sendResult = await sendSingleMessage(message, recipient);

        if (sendResult.success) {
          results.succeeded++;
          return {
            ...recipient,
            status: 'sent',
            sentAt: sendResult.sentAt,
            retryCount: (recipient.retryCount || 0) + 1,
            errorMessage: null
          };
        } else {
          results.stillFailed++;
          return {
            ...recipient,
            retryCount: (recipient.retryCount || 0) + 1,
            errorMessage: sendResult.error
          };
        }
      })
    );

    // Update recipients in the message
    const updatedRecipients = message.recipients.map(r => {
      const retried = batchResults.find(br => br.stakeholderId === r.stakeholderId);
      return retried || r;
    });

    const currentSent = message.deliveryStats?.sent || 0;
    const currentFailed = message.deliveryStats?.failed || 0;
    await databaseAdapter.findByIdAndUpdate('BulkMessage', message._id, {
      recipients: updatedRecipients,
      'deliveryStats.sent': currentSent + results.succeeded,
      'deliveryStats.failed': Math.max(0, currentFailed - results.succeeded)
    }, { new: true });

    // Apply delay between batches
    if (batchIndex < batches.length - 1 && rateLimiting.delayBetweenBatches > 0) {
      await new Promise(resolve => setTimeout(resolve, rateLimiting.delayBetweenBatches));
    }
  }

  return {
    success: true,
    ...results
  };
}

/**
 * Generate audit log entry for bulk message action
 * @param {Object} message - Bulk message document
 * @param {string} action - Action performed (sent, cancelled, etc.)
 * @returns {Promise<Object>} Created audit log entry
 */
async function generateAuditLog(message, action) {
  const activityData = {
    activityId: `ACT-BM-${message.bulkMessageId}-${Date.now()}`,
    activityType: `bulk_message_${action}`,
    companyId: message.companyId,
    userId: message.senderId,
    description: `Bulk message "${message.subject}" ${action}`,
    details: {
      bulkMessageId: message.bulkMessageId,
      messageType: message.messageType,
      totalRecipients: message.deliveryStats?.totalRecipients || 0,
      sent: message.deliveryStats?.sent || 0,
      failed: message.deliveryStats?.failed || 0
    },
    timestamp: new Date()
  };

  try {
    return await databaseAdapter.create('Activity', activityData);
  } catch (error) {
    console.error('Failed to create audit log:', error);
    return null;
  }
}

module.exports = {
  getRecipientsByFilter,
  sendBulkMessage,
  processScheduledMessages,
  cancelScheduledMessage,
  retryFailedRecipients,
  applyTemplate,
  generateAuditLog
};

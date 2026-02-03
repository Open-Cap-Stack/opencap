/**
 * MessageTrigger Controller
 *
 * Issue #88: Build Automated Triggered Messages
 *
 * Handles API endpoints for message trigger management including
 * CRUD operations, trigger testing, and manual firing.
 */

const databaseAdapter = require('../services/databaseAdapter');
const TriggerEngineService = require('../services/triggerEngineService');

// Initialize trigger engine
const triggerEngine = new TriggerEngineService();

/**
 * Supported event types for validation
 */
const VALID_EVENT_TYPES = [
  'vesting',
  'document_signing',
  'compliance_deadline',
  'equity_grant',
  'share_transfer',
  'company_update',
  'custom'
];

/**
 * Supported trigger types for validation
 */
const VALID_TRIGGER_TYPES = [
  'immediate',
  'scheduled',
  'delayed',
  'recurring'
];

/**
 * Build filter query from request parameters
 * @param {Object} query - Request query parameters
 * @returns {Object} Database filter
 */
const buildTriggerFilter = (query) => {
  const filter = {};

  if (query.eventType) {
    filter.eventType = query.eventType;
  }

  if (query.companyId) {
    filter.companyId = query.companyId;
  }

  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === 'true';
  }

  if (query.triggerType) {
    filter.triggerType = query.triggerType;
  }

  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { triggerId: { $regex: query.search, $options: 'i' } }
    ];
  }

  return filter;
};

/**
 * Validate required fields for trigger creation
 * @param {Object} data - Request body
 * @returns {Object} Validation result
 */
const validateTriggerData = (data) => {
  const errors = [];

  if (!data.triggerId) {
    errors.push('triggerId is required');
  }

  if (!data.name) {
    errors.push('name is required');
  }

  if (!data.eventType) {
    errors.push('eventType is required');
  } else if (!VALID_EVENT_TYPES.includes(data.eventType)) {
    errors.push(`Invalid eventType. Must be one of: ${VALID_EVENT_TYPES.join(', ')}`);
  }

  if (!data.triggerType) {
    errors.push('triggerType is required');
  } else if (!VALID_TRIGGER_TYPES.includes(data.triggerType)) {
    errors.push(`Invalid triggerType. Must be one of: ${VALID_TRIGGER_TYPES.join(', ')}`);
  }

  if (!data.messageTemplate) {
    errors.push('messageTemplate is required');
  } else {
    if (!data.messageTemplate.subject) {
      errors.push('messageTemplate.subject is required');
    }
    if (!data.messageTemplate.body) {
      errors.push('messageTemplate.body is required');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Create a new message trigger
 * POST /api/v1/message-triggers
 */
exports.createTrigger = async (req, res) => {
  try {
    const validation = validateTriggerData(req.body);

    if (!validation.valid) {
      return res.status(400).json({
        message: `Validation failed: ${validation.errors.join(', ')}`
      });
    }

    const triggerData = {
      triggerId: req.body.triggerId,
      name: req.body.name,
      description: req.body.description,
      eventType: req.body.eventType,
      triggerType: req.body.triggerType,
      messageTemplate: req.body.messageTemplate,
      triggerRules: req.body.triggerRules,
      schedule: req.body.schedule,
      recipients: req.body.recipients,
      deliveryChannels: req.body.deliveryChannels || ['in_app'],
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      companyId: req.body.companyId,
      priority: req.body.priority || 'normal',
      metadata: req.body.metadata,
      createdBy: req.user?._id
    };

    const savedTrigger = await databaseAdapter.create('MessageTrigger', triggerData);
    res.status(201).json(savedTrigger);

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'A trigger with this triggerId already exists'
      });
    }
    res.status(500).json({
      message: 'Failed to create trigger',
      error: error.message
    });
  }
};

/**
 * Get all triggers with optional filtering
 * GET /api/v1/message-triggers
 */
exports.getTriggers = async (req, res) => {
  try {
    const filter = buildTriggerFilter(req.query);

    // Pagination
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const options = {
      skip,
      limit,
      sort: { createdAt: -1 }
    };

    const [triggers, total] = await Promise.all([
      databaseAdapter.find('MessageTrigger', filter, options),
      databaseAdapter.count ? databaseAdapter.count('MessageTrigger', filter) : 0
    ]);

    res.status(200).json({
      triggers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + triggers.length < total
      }
    });

  } catch (error) {
    res.status(500).json({
      message: 'Failed to retrieve triggers',
      error: error.message
    });
  }
};

/**
 * Get a trigger by ID
 * GET /api/v1/message-triggers/:id
 */
exports.getTriggerById = async (req, res) => {
  try {
    const trigger = await databaseAdapter.findById('MessageTrigger', req.params.id);

    if (!trigger) {
      return res.status(404).json({ message: 'Trigger not found' });
    }

    res.status(200).json({ trigger });

  } catch (error) {
    res.status(500).json({
      message: 'Failed to retrieve trigger',
      error: error.message
    });
  }
};

/**
 * Update a trigger
 * PUT /api/v1/message-triggers/:id
 */
exports.updateTrigger = async (req, res) => {
  try {
    // Prevent updating triggerId
    const updateData = { ...req.body };
    delete updateData.triggerId;
    delete updateData._id;

    // Validate eventType if provided
    if (updateData.eventType && !VALID_EVENT_TYPES.includes(updateData.eventType)) {
      return res.status(400).json({
        message: `Invalid eventType. Must be one of: ${VALID_EVENT_TYPES.join(', ')}`
      });
    }

    // Validate triggerType if provided
    if (updateData.triggerType && !VALID_TRIGGER_TYPES.includes(updateData.triggerType)) {
      return res.status(400).json({
        message: `Invalid triggerType. Must be one of: ${VALID_TRIGGER_TYPES.join(', ')}`
      });
    }

    const updatedTrigger = await databaseAdapter.findByIdAndUpdate(
      'MessageTrigger',
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedTrigger) {
      return res.status(404).json({ message: 'Trigger not found' });
    }

    res.status(200).json({ trigger: updatedTrigger });

  } catch (error) {
    res.status(500).json({
      message: 'Failed to update trigger',
      error: error.message
    });
  }
};

/**
 * Delete a trigger
 * DELETE /api/v1/message-triggers/:id
 */
exports.deleteTrigger = async (req, res) => {
  try {
    const deletedTrigger = await databaseAdapter.findByIdAndDelete(
      'MessageTrigger',
      req.params.id
    );

    if (!deletedTrigger) {
      return res.status(404).json({ message: 'Trigger not found' });
    }

    res.status(200).json({ message: 'Trigger deleted successfully' });

  } catch (error) {
    res.status(500).json({
      message: 'Failed to delete trigger',
      error: error.message
    });
  }
};

/**
 * Activate a trigger
 * POST /api/v1/message-triggers/:id/activate
 */
exports.activateTrigger = async (req, res) => {
  try {
    const updatedTrigger = await databaseAdapter.findByIdAndUpdate(
      'MessageTrigger',
      req.params.id,
      { isActive: true },
      { new: true }
    );

    if (!updatedTrigger) {
      return res.status(404).json({ message: 'Trigger not found' });
    }

    res.status(200).json({
      message: 'Trigger activated',
      trigger: updatedTrigger
    });

  } catch (error) {
    res.status(500).json({
      message: 'Failed to activate trigger',
      error: error.message
    });
  }
};

/**
 * Deactivate a trigger
 * POST /api/v1/message-triggers/:id/deactivate
 */
exports.deactivateTrigger = async (req, res) => {
  try {
    const updatedTrigger = await databaseAdapter.findByIdAndUpdate(
      'MessageTrigger',
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!updatedTrigger) {
      return res.status(404).json({ message: 'Trigger not found' });
    }

    res.status(200).json({
      message: 'Trigger deactivated',
      trigger: updatedTrigger
    });

  } catch (error) {
    res.status(500).json({
      message: 'Failed to deactivate trigger',
      error: error.message
    });
  }
};

/**
 * Test a trigger with sample payload
 * POST /api/v1/message-triggers/:id/test
 */
exports.testTrigger = async (req, res) => {
  try {
    const trigger = await databaseAdapter.findById('MessageTrigger', req.params.id);

    if (!trigger) {
      return res.status(404).json({ message: 'Trigger not found' });
    }

    const testPayload = req.body.testPayload || {};

    // Evaluate rules
    const rulesPassed = triggerEngine.evaluateRules(trigger.triggerRules, testPayload);

    // Generate preview message
    const preview = {
      subject: triggerEngine.substituteVariables(
        trigger.messageTemplate.subject,
        testPayload
      ),
      body: triggerEngine.substituteVariables(
        trigger.messageTemplate.body,
        testPayload
      ),
      channels: trigger.deliveryChannels || ['in_app']
    };

    res.status(200).json({
      triggerId: trigger.triggerId,
      rulesPassed,
      preview,
      missingVariables: findMissingVariables(trigger.messageTemplate, testPayload)
    });

  } catch (error) {
    res.status(500).json({
      message: 'Failed to test trigger',
      error: error.message
    });
  }
};

/**
 * Get trigger execution history
 * GET /api/v1/message-triggers/:id/history
 */
exports.getTriggerHistory = async (req, res) => {
  try {
    const trigger = await databaseAdapter.findById('MessageTrigger', req.params.id);

    if (!trigger) {
      return res.status(404).json({ message: 'Trigger not found' });
    }

    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip = parseInt(req.query.offset) || 0;

    const history = await databaseAdapter.find(
      'TriggerHistory',
      { triggerId: trigger.triggerId },
      {
        limit,
        skip,
        sort: { executedAt: -1 }
      }
    );

    res.status(200).json({
      triggerId: trigger.triggerId,
      history,
      stats: {
        totalExecutions: trigger.fireCount || 0,
        lastFiredAt: trigger.lastFiredAt
      }
    });

  } catch (error) {
    res.status(500).json({
      message: 'Failed to retrieve trigger history',
      error: error.message
    });
  }
};

/**
 * Manually fire a trigger
 * POST /api/v1/message-triggers/:id/fire
 */
exports.fireManualTrigger = async (req, res) => {
  try {
    const trigger = await databaseAdapter.findById('MessageTrigger', req.params.id);

    if (!trigger) {
      return res.status(404).json({ message: 'Trigger not found' });
    }

    const payload = req.body.payload || {};
    const recipientIds = req.body.recipientIds;

    // Generate message
    const message = await triggerEngine.generateMessage(trigger, payload);

    // Get recipients
    let recipients = [];
    if (recipientIds && recipientIds.length > 0) {
      recipients = await databaseAdapter.find(
        'User',
        { _id: { $in: recipientIds } },
        {}
      );
    } else if (trigger.recipients) {
      recipients = await triggerEngine.resolveRecipients(trigger.recipients, payload);
    }

    // Dispatch message
    await triggerEngine.dispatchMessage(message, recipients, trigger);

    // Log execution
    await triggerEngine.logTriggerExecution(trigger, message, recipients, 'success');

    // Update trigger stats
    await databaseAdapter.findByIdAndUpdate(
      'MessageTrigger',
      trigger._id,
      {
        lastFiredAt: new Date(),
        $inc: { fireCount: 1 }
      },
      { new: true }
    );

    res.status(200).json({
      message: 'Trigger fired successfully',
      triggerId: trigger.triggerId,
      recipientCount: recipients.length
    });

  } catch (error) {
    res.status(500).json({
      message: 'Failed to fire trigger',
      error: error.message
    });
  }
};

/**
 * Get supported event types
 * GET /api/v1/message-triggers/event-types
 */
exports.getEventTypes = async (req, res) => {
  res.status(200).json({
    eventTypes: VALID_EVENT_TYPES,
    descriptions: {
      vesting: 'Equity vesting events',
      document_signing: 'Document signature requests and completions',
      compliance_deadline: 'Compliance and regulatory deadlines',
      equity_grant: 'New equity grants',
      share_transfer: 'Share transfer events',
      company_update: 'Company-wide updates and announcements',
      custom: 'Custom event types'
    }
  });
};

/**
 * Get supported trigger types
 * GET /api/v1/message-triggers/trigger-types
 */
exports.getTriggerTypes = async (req, res) => {
  res.status(200).json({
    triggerTypes: VALID_TRIGGER_TYPES,
    descriptions: {
      immediate: 'Fire immediately when event occurs',
      scheduled: 'Fire at a specific scheduled time',
      delayed: 'Fire after a delay from the event',
      recurring: 'Fire on a recurring schedule (cron)'
    }
  });
};

/**
 * Helper: Find missing variables in template
 * @param {Object} template - Message template
 * @param {Object} payload - Test payload
 * @returns {Array} List of missing variables
 */
function findMissingVariables(template, payload) {
  const missing = [];
  const variablePattern = /\{\{(\w+(?:\.\w+)*)\}\}/g;

  const checkTemplate = (text) => {
    if (!text) return;
    let match;
    while ((match = variablePattern.exec(text)) !== null) {
      const varName = match[1];
      const value = getNestedValue(payload, varName);
      if (value === undefined) {
        if (!missing.includes(varName)) {
          missing.push(varName);
        }
      }
    }
  };

  checkTemplate(template.subject);
  checkTemplate(template.body);
  checkTemplate(template.htmlBody);

  return missing;
}

/**
 * Helper: Get nested object value
 */
function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  const keys = path.split('.');
  let value = obj;
  for (const key of keys) {
    if (value === undefined || value === null) return undefined;
    value = value[key];
  }
  return value;
}

/**
 * Trigger Engine Service
 *
 * Issue #88: Build Automated Triggered Messages
 *
 * Core engine for processing automated message triggers.
 * Handles event matching, rule evaluation, variable substitution,
 * message generation, and dispatch to appropriate channels.
 */

const { v4: uuidv4 } = require('uuid');
const databaseAdapter = require('./databaseAdapter');

class TriggerEngineService {
  constructor() {
    this.supportedEventTypes = [
      'vesting',
      'document_signing',
      'compliance_deadline',
      'equity_grant',
      'share_transfer',
      'company_update',
      'custom'
    ];

    this.supportedTriggerTypes = [
      'immediate',
      'scheduled',
      'delayed',
      'recurring'
    ];

    this.supportedOperators = [
      'eq', 'ne', 'gt', 'gte', 'lt', 'lte',
      'contains', 'notContains', 'in', 'notIn',
      'exists', 'regex'
    ];

    this.eventStreamingService = null;
  }

  /**
   * Get list of supported event types
   * @returns {Array<string>} Supported event types
   */
  getSupportedEventTypes() {
    return [...this.supportedEventTypes];
  }

  /**
   * Get list of supported trigger types
   * @returns {Array<string>} Supported trigger types
   */
  getSupportedTriggerTypes() {
    return [...this.supportedTriggerTypes];
  }

  /**
   * Validate that an event type is supported
   * @param {string} eventType - Event type to validate
   * @throws {Error} If event type is invalid
   */
  validateEventType(eventType) {
    if (!this.supportedEventTypes.includes(eventType)) {
      throw new Error(`Invalid event type: ${eventType}`);
    }
  }

  /**
   * Find triggers that match an event
   * @param {Object} event - Event object with type, payload, companyId
   * @returns {Promise<Array>} Matching triggers
   */
  async findMatchingTriggers(event) {
    const query = {
      eventType: event.type,
      isActive: true,
      $or: [
        { companyId: event.companyId },
        { companyId: null }
      ]
    };

    const triggers = await databaseAdapter.find('MessageTrigger', query, {
      sort: { priority: -1, createdAt: 1 }
    });

    // Filter by rule evaluation
    return triggers.filter(trigger => {
      if (!trigger.isActive) return false;
      return this.evaluateRules(trigger.triggerRules, event.payload);
    });
  }

  /**
   * Evaluate trigger rules against a payload
   * @param {Object} rules - Trigger rules configuration
   * @param {Object} payload - Event payload
   * @returns {boolean} Whether rules match
   */
  evaluateRules(rules, payload) {
    if (!rules || !rules.conditions || rules.conditions.length === 0) {
      return true;
    }

    const results = rules.conditions.map(condition =>
      this.evaluateCondition(condition, payload)
    );

    if (rules.logic === 'OR') {
      return results.some(r => r === true);
    }

    // Default to AND logic
    return results.every(r => r === true);
  }

  /**
   * Evaluate a single condition against payload
   * @param {Object} condition - Condition to evaluate
   * @param {Object} payload - Event payload
   * @returns {boolean} Condition result
   */
  evaluateCondition(condition, payload) {
    const fieldValue = this.getNestedValue(payload, condition.field);
    const { operator, value } = condition;

    switch (operator) {
      case 'eq':
        return fieldValue === value;
      case 'ne':
        return fieldValue !== value;
      case 'gt':
        return fieldValue > value;
      case 'gte':
        return fieldValue >= value;
      case 'lt':
        return fieldValue < value;
      case 'lte':
        return fieldValue <= value;
      case 'contains':
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(value);
        }
        return String(fieldValue).includes(value);
      case 'notContains':
        if (Array.isArray(fieldValue)) {
          return !fieldValue.includes(value);
        }
        return !String(fieldValue).includes(value);
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'notIn':
        return !Array.isArray(value) || !value.includes(fieldValue);
      case 'exists':
        return (fieldValue !== undefined && fieldValue !== null) === value;
      case 'regex':
        try {
          return new RegExp(value).test(String(fieldValue));
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  /**
   * Get nested object value by dot notation path
   * @param {Object} obj - Object to traverse
   * @param {string} path - Dot notation path
   * @returns {*} Value at path
   */
  getNestedValue(obj, path) {
    if (!obj || !path) return undefined;
    const keys = path.split('.');
    let value = obj;
    for (const key of keys) {
      if (value === undefined || value === null) return undefined;
      value = value[key];
    }
    return value;
  }

  /**
   * Substitute variables in a template string
   * @param {string} template - Template with {{variable}} placeholders
   * @param {Object} variables - Variable values
   * @param {Object} options - Formatting options
   * @returns {string} Rendered string
   */
  substituteVariables(template, variables, options = {}) {
    if (!template) return template;

    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, key) => {
      let value = this.getNestedValue(variables, key);

      if (value === undefined) return match;

      // Handle date formatting
      if (options.formatDates && value instanceof Date) {
        value = value.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }

      // Handle currency formatting
      if (options.formatCurrency &&
          options.currencyFields &&
          options.currencyFields.includes(key) &&
          typeof value === 'number') {
        value = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: options.currency || 'USD'
        }).format(value);
      }

      return String(value);
    });
  }

  /**
   * Generate a message from trigger and payload
   * @param {Object} trigger - Trigger configuration
   * @param {Object} payload - Event payload
   * @returns {Promise<Object>} Generated message
   */
  async generateMessage(trigger, payload) {
    const template = trigger.messageTemplate;

    if (!template) {
      throw new Error('Trigger has no message template');
    }

    const message = {
      subject: this.substituteVariables(template.subject, payload),
      body: this.substituteVariables(template.body, payload),
      htmlBody: template.htmlBody ? this.substituteVariables(template.htmlBody, payload) : null,
      channels: trigger.deliveryChannels || ['in_app'],
      metadata: {
        triggerId: trigger.triggerId,
        triggerName: trigger.name,
        eventType: trigger.eventType,
        generatedAt: new Date().toISOString()
      }
    };

    return message;
  }

  /**
   * Process an event and dispatch matching trigger messages
   * @param {Object} event - Event to process
   * @returns {Promise<Object>} Processing result
   */
  async processEvent(event) {
    const startTime = Date.now();
    const result = {
      processed: false,
      triggersMatched: 0,
      messagesDispatched: 0,
      scheduledMessages: 0,
      errors: []
    };

    try {
      // Find matching triggers
      const triggers = await this.findMatchingTriggers(event);

      for (const trigger of triggers) {
        try {
          // Check if rules pass (already filtered, but double-check)
          const rulesPassed = this.evaluateRules(trigger.triggerRules, event.payload);
          if (!rulesPassed) continue;

          result.triggersMatched++;

          // Handle based on trigger type
          if (trigger.triggerType === 'scheduled') {
            await this.queueScheduledTrigger(trigger, event.payload);
            result.scheduledMessages++;
          } else if (trigger.triggerType === 'delayed') {
            await this.queueDelayedTrigger(trigger, event.payload);
            result.scheduledMessages++;
          } else {
            // Immediate trigger
            await this.executeTrigger(trigger, event.payload);
            result.messagesDispatched++;
          }
        } catch (error) {
          result.errors.push({
            triggerId: trigger.triggerId,
            error: error.message
          });
          await this.logTriggerExecution(trigger, null, [], 'failed', error);
        }
      }

      result.processed = true;
      result.executionTimeMs = Date.now() - startTime;

    } catch (error) {
      throw error;
    }

    return result;
  }

  /**
   * Execute an immediate trigger
   * @param {Object} trigger - Trigger to execute
   * @param {Object} payload - Event payload
   * @returns {Promise<void>}
   */
  async executeTrigger(trigger, payload) {
    const startTime = Date.now();

    try {
      // Generate message
      const message = await this.generateMessage(trigger, payload);

      // Resolve recipients
      const recipients = await this.resolveRecipients(trigger.recipients || {}, payload);

      // Dispatch message to channels
      await this.dispatchMessage(message, recipients, trigger);

      // Log successful execution
      await this.logTriggerExecution(trigger, message, recipients, 'success');

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

    } catch (error) {
      await this.logTriggerExecution(trigger, null, [], 'failed', error);
      throw error;
    }
  }

  /**
   * Queue a scheduled trigger for future execution
   * @param {Object} trigger - Trigger to schedule
   * @param {Object} payload - Event payload
   * @returns {Promise<Object>} Created schedule record
   */
  async queueScheduledTrigger(trigger, payload) {
    const scheduleId = `sched_${uuidv4()}`;
    const scheduledAt = trigger.schedule?.scheduledAt || new Date();

    const scheduleData = {
      scheduleId,
      triggerId: trigger.triggerId,
      triggerType: 'scheduled',
      scheduledAt,
      status: 'pending',
      payload,
      companyId: trigger.companyId,
      metadata: {
        triggerName: trigger.name
      }
    };

    return await databaseAdapter.create('ScheduledTrigger', scheduleData);
  }

  /**
   * Queue a delayed trigger for future execution
   * @param {Object} trigger - Trigger to delay
   * @param {Object} payload - Event payload
   * @returns {Promise<Object>} Created schedule record
   */
  async queueDelayedTrigger(trigger, payload) {
    const scheduleId = `delay_${uuidv4()}`;
    const delayMinutes = trigger.schedule?.delayMinutes || 0;
    const scheduledAt = new Date(Date.now() + delayMinutes * 60 * 1000);

    const scheduleData = {
      scheduleId,
      triggerId: trigger.triggerId,
      triggerType: 'delayed',
      scheduledAt,
      status: 'pending',
      payload,
      companyId: trigger.companyId,
      metadata: {
        triggerName: trigger.name,
        delayMinutes
      }
    };

    return await databaseAdapter.create('ScheduledTrigger', scheduleData);
  }

  /**
   * Process due scheduled triggers
   * @returns {Promise<Object>} Processing result
   */
  async processDueScheduledTriggers() {
    const result = {
      processed: 0,
      failed: 0,
      errors: []
    };

    try {
      // Find due scheduled triggers
      const dueScheduled = await databaseAdapter.find(
        'ScheduledTrigger',
        {
          status: 'pending',
          scheduledAt: { $lte: new Date() }
        },
        { limit: 100, sort: { scheduledAt: 1 } }
      );

      for (const scheduled of dueScheduled) {
        try {
          // Mark as processing
          await databaseAdapter.findByIdAndUpdate(
            'ScheduledTrigger',
            scheduled._id,
            { status: 'processing' },
            { new: true }
          );

          // Find the trigger
          const triggers = await databaseAdapter.find(
            'MessageTrigger',
            { triggerId: scheduled.triggerId, isActive: true },
            { limit: 1 }
          );

          if (triggers.length > 0) {
            await this.executeTrigger(triggers[0], scheduled.payload);
          }

          // Mark as completed
          await databaseAdapter.findByIdAndUpdate(
            'ScheduledTrigger',
            scheduled._id,
            { status: 'completed', completedAt: new Date() },
            { new: true }
          );

          result.processed++;

        } catch (error) {
          result.failed++;
          result.errors.push({
            scheduleId: scheduled.scheduleId,
            error: error.message
          });

          await databaseAdapter.findByIdAndUpdate(
            'ScheduledTrigger',
            scheduled._id,
            {
              status: 'failed',
              lastError: error.message,
              $inc: { attempts: 1 }
            },
            { new: true }
          );
        }
      }

    } catch (error) {
      throw error;
    }

    return result;
  }

  /**
   * Resolve recipients from configuration and payload
   * @param {Object} recipientConfig - Recipient configuration
   * @param {Object} payload - Event payload
   * @returns {Promise<Array>} Resolved recipients
   */
  async resolveRecipients(recipientConfig, payload) {
    const recipients = [];

    // Resolve from roles
    if (recipientConfig.roles && recipientConfig.roles.length > 0) {
      const roleUsers = await databaseAdapter.find(
        'User',
        {
          role: { $in: recipientConfig.roles },
          companyId: recipientConfig.companyId
        },
        {}
      );
      recipients.push(...roleUsers);
    }

    // Resolve specific users
    if (recipientConfig.specificUsers && recipientConfig.specificUsers.length > 0) {
      const specificUsers = await databaseAdapter.find(
        'User',
        { _id: { $in: recipientConfig.specificUsers } },
        {}
      );
      recipients.push(...specificUsers);
    }

    // Resolve dynamic recipient from payload
    if (recipientConfig.dynamicRecipient) {
      const recipientId = this.getNestedValue(payload, recipientConfig.dynamicRecipient);
      if (recipientId) {
        const dynamicUser = await databaseAdapter.findById('User', recipientId);
        if (dynamicUser) {
          recipients.push(dynamicUser);
        }
      }
    }

    // Deduplicate recipients by ID
    const seen = new Set();
    return recipients.filter(r => {
      const id = r._id?.toString();
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  /**
   * Dispatch message to recipients via configured channels
   * @param {Object} message - Message to dispatch
   * @param {Array} recipients - Recipients list
   * @param {Object} trigger - Source trigger
   * @returns {Promise<void>}
   */
  async dispatchMessage(message, recipients, trigger) {
    // For each channel, dispatch the message
    for (const channel of message.channels) {
      switch (channel) {
        case 'in_app':
          await this.dispatchInAppNotification(message, recipients, trigger);
          break;
        case 'email':
          await this.dispatchEmail(message, recipients, trigger);
          break;
        case 'webhook':
          await this.dispatchWebhook(message, recipients, trigger);
          break;
        // Additional channels can be added here
      }
    }
  }

  /**
   * Dispatch in-app notification
   * @param {Object} message - Message to dispatch
   * @param {Array} recipients - Recipients
   * @param {Object} trigger - Source trigger
   */
  async dispatchInAppNotification(message, recipients, trigger) {
    for (const recipient of recipients) {
      await databaseAdapter.create('Notification', {
        notificationId: `notif_${uuidv4()}`,
        notificationType: 'system',
        title: message.subject,
        message: message.body,
        recipient: recipient._id?.toString(),
        Timestamp: new Date(),
        RelatedObjects: JSON.stringify({ triggerId: trigger.triggerId }),
        UserInvolved: recipient._id,
        isRead: false
      });
    }
  }

  /**
   * Dispatch email notification (placeholder)
   * @param {Object} message - Message to dispatch
   * @param {Array} recipients - Recipients
   * @param {Object} trigger - Source trigger
   */
  async dispatchEmail(message, recipients, trigger) {
    // TODO: Integrate with email service
    // This is a placeholder for email dispatch functionality
    console.log(`[TriggerEngine] Email dispatch: ${message.subject} to ${recipients.length} recipients`);
  }

  /**
   * Dispatch webhook notification
   * @param {Object} message - Message to dispatch
   * @param {Array} recipients - Recipients
   * @param {Object} trigger - Source trigger
   */
  async dispatchWebhook(message, recipients, trigger) {
    if (this.eventStreamingService) {
      await this.eventStreamingService.publishEvent({
        topic: `trigger.${trigger.eventType}`,
        payload: {
          triggerId: trigger.triggerId,
          message,
          recipientCount: recipients.length,
          firedAt: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Log trigger execution to history
   * @param {Object} trigger - Executed trigger
   * @param {Object} message - Generated message
   * @param {Array} recipients - Recipients
   * @param {string} status - Execution status
   * @param {Error} error - Optional error
   */
  async logTriggerExecution(trigger, message, recipients, status, error = null) {
    const historyEntry = {
      historyId: `hist_${uuidv4()}`,
      triggerId: trigger.triggerId,
      triggerName: trigger.name,
      eventType: trigger.eventType,
      executedAt: new Date(),
      status,
      messageGenerated: message ? {
        subject: message.subject,
        body: message.body,
        channels: message.channels
      } : null,
      recipientCount: recipients?.length || 0,
      recipientIds: recipients?.map(r => r._id) || [],
      errorMessage: error?.message,
      errorStack: error?.stack,
      companyId: trigger.companyId
    };

    try {
      await databaseAdapter.create('TriggerHistory', historyEntry);
    } catch (err) {
      console.error('[TriggerEngine] Failed to log trigger execution:', err);
    }
  }
}

module.exports = TriggerEngineService;

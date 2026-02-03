/**
 * MessageTrigger Model
 *
 * Issue #88: Build Automated Triggered Messages
 *
 * Data model for automated message triggers that respond to system events.
 * Supports event-based triggering, message templates with variable substitution,
 * trigger rules engine, and scheduling configurations.
 */

const mongoose = require('mongoose');

/**
 * Schema for trigger rule conditions
 */
const ConditionSchema = new mongoose.Schema({
  field: {
    type: String,
    required: true
  },
  operator: {
    type: String,
    enum: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'notContains', 'in', 'notIn', 'exists', 'regex'],
    required: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  }
}, { _id: false });

/**
 * Schema for trigger rules
 */
const TriggerRulesSchema = new mongoose.Schema({
  conditions: [ConditionSchema],
  logic: {
    type: String,
    enum: ['AND', 'OR'],
    default: 'AND'
  }
}, { _id: false });

/**
 * Schema for message templates
 */
const MessageTemplateSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  variables: [{
    type: String
  }],
  htmlBody: {
    type: String
  }
}, { _id: false });

/**
 * Schema for schedule configuration
 */
const ScheduleSchema = new mongoose.Schema({
  scheduledAt: {
    type: Date
  },
  cronExpression: {
    type: String
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  delayMinutes: {
    type: Number
  },
  endDate: {
    type: Date
  }
}, { _id: false });

/**
 * Schema for recipient configuration
 */
const RecipientsSchema = new mongoose.Schema({
  roles: [{
    type: String
  }],
  specificUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  dynamicRecipient: {
    type: String // Field name in payload to get recipient ID
  }
}, { _id: false });

/**
 * Main MessageTrigger Schema
 */
const MessageTriggerSchema = new mongoose.Schema({
  triggerId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  eventType: {
    type: String,
    required: true,
    enum: [
      'vesting',
      'document_signing',
      'compliance_deadline',
      'equity_grant',
      'share_transfer',
      'company_update',
      'custom'
    ],
    index: true
  },
  triggerType: {
    type: String,
    required: true,
    enum: ['immediate', 'scheduled', 'delayed', 'recurring'],
    default: 'immediate'
  },
  messageTemplate: {
    type: MessageTemplateSchema,
    required: true
  },
  triggerRules: {
    type: TriggerRulesSchema
  },
  schedule: {
    type: ScheduleSchema
  },
  recipients: {
    type: RecipientsSchema
  },
  deliveryChannels: [{
    type: String,
    enum: ['email', 'in_app', 'sms', 'webhook', 'push'],
    default: ['in_app']
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastFiredAt: {
    type: Date
  },
  fireCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
MessageTriggerSchema.index({ eventType: 1, isActive: 1 });
MessageTriggerSchema.index({ companyId: 1, eventType: 1 });
MessageTriggerSchema.index({ triggerType: 1, isActive: 1 });

/**
 * Instance method to check if trigger rules match a payload
 * @param {Object} payload - Event payload to evaluate
 * @returns {boolean} Whether rules match
 */
MessageTriggerSchema.methods.matchesRules = function(payload) {
  if (!this.triggerRules || !this.triggerRules.conditions || this.triggerRules.conditions.length === 0) {
    return true;
  }

  const evaluateCondition = (condition) => {
    const fieldValue = getNestedValue(payload, condition.field);
    const operator = condition.operator;
    const value = condition.value;

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
        return new RegExp(value).test(String(fieldValue));
      default:
        return false;
    }
  };

  const results = this.triggerRules.conditions.map(evaluateCondition);

  if (this.triggerRules.logic === 'OR') {
    return results.some(r => r === true);
  }
  return results.every(r => r === true);
};

/**
 * Instance method to render message with variable substitution
 * @param {Object} variables - Variables to substitute
 * @returns {Object} Rendered message
 */
MessageTriggerSchema.methods.renderMessage = function(variables) {
  const substituteVariables = (template, vars) => {
    if (!template) return template;
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, key) => {
      const value = getNestedValue(vars, key);
      return value !== undefined ? value : match;
    });
  };

  return {
    subject: substituteVariables(this.messageTemplate.subject, variables),
    body: substituteVariables(this.messageTemplate.body, variables),
    htmlBody: substituteVariables(this.messageTemplate.htmlBody, variables)
  };
};

/**
 * Static method to find active triggers for an event type
 * @param {string} eventType - Type of event
 * @param {string} companyId - Optional company ID filter
 * @returns {Promise<Array>} Matching triggers
 */
MessageTriggerSchema.statics.findActiveByEventType = function(eventType, companyId = null) {
  const query = {
    eventType,
    isActive: true
  };

  if (companyId) {
    query.$or = [
      { companyId },
      { companyId: null }
    ];
  }

  return this.find(query).sort({ priority: -1, createdAt: 1 });
};

/**
 * Helper function to get nested object value by dot notation path
 * @param {Object} obj - Object to traverse
 * @param {string} path - Dot notation path (e.g., 'user.name')
 * @returns {*} Value at path or undefined
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

module.exports = mongoose.model('MessageTrigger', MessageTriggerSchema);

/**
 * MessageTrigger Model
 *
 * Issue #88: Build Automated Triggered Messages
 *
 * Data model for automated message triggers that respond to system events.
 * Supports event-based triggering, message templates with variable substitution,
 * trigger rules engine, and scheduling configurations.
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid event types
const EVENT_TYPES = [
  'vesting',
  'document_signing',
  'compliance_deadline',
  'equity_grant',
  'share_transfer',
  'company_update',
  'custom'
];

// Valid trigger types
const TRIGGER_TYPES = ['immediate', 'scheduled', 'delayed', 'recurring'];

// Valid delivery channels
const DELIVERY_CHANNELS = ['email', 'in_app', 'sms', 'webhook', 'push'];

// Valid priorities
const PRIORITY_LEVELS = ['low', 'normal', 'high', 'urgent'];

// Valid operators for rule conditions
const CONDITION_OPERATORS = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'notContains', 'in', 'notIn', 'exists', 'regex'];

// Valid logic types
const LOGIC_TYPES = ['AND', 'OR'];

// Schema definition for documentation and validation
const messageTriggerSchema = {
  triggerId: { type: 'string', required: true, unique: true },
  name: { type: 'string', required: true },
  description: { type: 'string', default: '' },
  eventType: { type: 'string', required: true, enum: EVENT_TYPES },
  triggerType: { type: 'string', required: true, enum: TRIGGER_TYPES, default: 'immediate' },
  messageTemplate: {
    type: 'object',
    required: true,
    default: {
      subject: '',
      body: '',
      variables: [],
      htmlBody: null
    }
  },
  triggerRules: {
    type: 'object',
    default: {
      conditions: [],
      logic: 'AND'
    }
  },
  schedule: {
    type: 'object',
    default: {
      scheduledAt: null,
      cronExpression: null,
      timezone: 'UTC',
      delayMinutes: null,
      endDate: null
    }
  },
  recipients: {
    type: 'object',
    default: {
      roles: [],
      specificUsers: [],
      dynamicRecipient: null
    }
  },
  deliveryChannels: { type: 'array', default: ['in_app'] },
  isActive: { type: 'boolean', default: true },
  companyId: { type: 'string', default: null },
  priority: { type: 'string', enum: PRIORITY_LEVELS, default: 'normal' },
  metadata: { type: 'object', default: {} },
  createdBy: { type: 'string', default: null },
  lastFiredAt: { type: 'date', default: null },
  fireCount: { type: 'number', default: 0 },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('message_triggers', messageTriggerSchema);

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

// Extended MessageTrigger model with business logic
const MessageTrigger = {
  ...baseModel,
  tableName: 'message_triggers',
  schema: messageTriggerSchema,

  // Export constants
  EVENT_TYPES,
  TRIGGER_TYPES,
  DELIVERY_CHANNELS,
  PRIORITY_LEVELS,
  CONDITION_OPERATORS,
  LOGIC_TYPES,

  /**
   * Create a new message trigger with defaults
   * @param {Object} data - Trigger data
   * @returns {Object} Created trigger
   */
  async create(data) {
    if (!data.triggerId) {
      data.triggerId = `trg_${uuidv4()}`;
    }

    // Validate event type
    if (!EVENT_TYPES.includes(data.eventType)) {
      throw new Error(`eventType must be one of: ${EVENT_TYPES.join(', ')}`);
    }

    // Validate trigger type
    if (data.triggerType && !TRIGGER_TYPES.includes(data.triggerType)) {
      throw new Error(`triggerType must be one of: ${TRIGGER_TYPES.join(', ')}`);
    }

    if (data.isActive === undefined) {
      data.isActive = true;
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find trigger by triggerId
   * @param {string} triggerId - Trigger ID
   * @returns {Object|null} Trigger or null
   */
  async findByTriggerId(triggerId) {
    return baseModel.findOne.call(baseModel, { triggerId });
  },

  /**
   * Find active triggers by event type
   * @param {string} eventType - Event type
   * @param {string} companyId - Optional company ID filter
   * @returns {Array} Matching triggers
   */
  async findActiveByEventType(eventType, companyId = null) {
    const triggers = await baseModel.find.call(baseModel, { eventType, isActive: true });

    if (companyId) {
      return triggers.filter(t => t.companyId === companyId || t.companyId === null);
    }

    return triggers.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
      return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
    });
  },

  /**
   * Find triggers by company
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Array} Triggers for company
   */
  async findByCompany(companyId, options = {}) {
    const query = { companyId };
    if (options.isActive !== undefined) {
      query.isActive = options.isActive;
    }
    if (options.eventType) {
      query.eventType = options.eventType;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Check if trigger rules match a payload
   * @param {Object} trigger - Trigger object
   * @param {Object} payload - Event payload to evaluate
   * @returns {boolean} Whether rules match
   */
  matchesRules(trigger, payload) {
    if (!trigger.triggerRules || !trigger.triggerRules.conditions || trigger.triggerRules.conditions.length === 0) {
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

    const results = trigger.triggerRules.conditions.map(evaluateCondition);

    if (trigger.triggerRules.logic === 'OR') {
      return results.some(r => r === true);
    }
    return results.every(r => r === true);
  },

  /**
   * Render message with variable substitution
   * @param {Object} trigger - Trigger object
   * @param {Object} variables - Variables to substitute
   * @returns {Object} Rendered message
   */
  renderMessage(trigger, variables) {
    const substituteVariables = (template, vars) => {
      if (!template) return template;
      return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, key) => {
        const value = getNestedValue(vars, key);
        return value !== undefined ? value : match;
      });
    };

    return {
      subject: substituteVariables(trigger.messageTemplate.subject, variables),
      body: substituteVariables(trigger.messageTemplate.body, variables),
      htmlBody: substituteVariables(trigger.messageTemplate.htmlBody, variables)
    };
  },

  /**
   * Record trigger fired
   * @param {string} triggerId - Trigger ID
   * @returns {Object} Updated trigger
   */
  async recordFired(triggerId) {
    const trigger = await this.findByTriggerId(triggerId);
    if (!trigger) {
      throw new Error('Trigger not found');
    }

    return baseModel.updateOne.call(baseModel,
      { triggerId },
      {
        $set: {
          lastFiredAt: new Date().toISOString(),
          fireCount: (trigger.fireCount || 0) + 1
        }
      }
    );
  },

  /**
   * Activate trigger
   * @param {string} triggerId - Trigger ID
   * @returns {Object} Updated trigger
   */
  async activate(triggerId) {
    return baseModel.updateOne.call(baseModel,
      { triggerId },
      { $set: { isActive: true } }
    );
  },

  /**
   * Deactivate trigger
   * @param {string} triggerId - Trigger ID
   * @returns {Object} Updated trigger
   */
  async deactivate(triggerId) {
    return baseModel.updateOne.call(baseModel,
      { triggerId },
      { $set: { isActive: false } }
    );
  },

  // Expose base model methods
  find: baseModel.find.bind(baseModel),
  findOne: baseModel.findOne.bind(baseModel),
  findById: baseModel.findById.bind(baseModel),
  updateOne: baseModel.updateOne.bind(baseModel),
  updateMany: baseModel.updateMany.bind(baseModel),
  findOneAndUpdate: baseModel.findOneAndUpdate.bind(baseModel),
  findByIdAndUpdate: baseModel.findByIdAndUpdate.bind(baseModel),
  deleteOne: baseModel.deleteOne.bind(baseModel),
  deleteMany: baseModel.deleteMany.bind(baseModel),
  findOneAndDelete: baseModel.findOneAndDelete.bind(baseModel),
  findByIdAndDelete: baseModel.findByIdAndDelete.bind(baseModel),
  countDocuments: baseModel.countDocuments.bind(baseModel),
  exists: baseModel.exists.bind(baseModel),
  distinct: baseModel.distinct.bind(baseModel),
  aggregate: baseModel.aggregate.bind(baseModel)
};

module.exports = MessageTrigger;

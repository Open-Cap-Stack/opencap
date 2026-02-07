/**
 * InvestorCommunicationTemplate Model
 * Issue #91: Build Investor Communication System
 *
 * Stores reusable templates for investor communications.
 * Supports variable substitution using {{variable}} syntax.
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid communication types
const COMMUNICATION_TYPES = [
  'quarterly_update',
  'annual_report',
  'document_notification',
  'portal_announcement',
  'funding_update',
  'general'
];

// Schema definition for documentation and validation
const investorCommunicationTemplateSchema = {
  templateId: { type: 'string', required: true, unique: true },
  companyId: { type: 'string', required: true },
  name: { type: 'string', required: true },
  description: { type: 'string', default: '' },
  communicationType: { type: 'string', required: true, enum: COMMUNICATION_TYPES },
  subject: { type: 'string', required: true },
  content: { type: 'string', required: true },
  htmlContent: { type: 'string', default: null },
  variables: { type: 'array', default: [] },
  isActive: { type: 'boolean', default: true },
  isDefault: { type: 'boolean', default: false },
  createdBy: { type: 'string', required: true },
  updatedBy: { type: 'string', default: null },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('investor_communication_templates', investorCommunicationTemplateSchema);

// Extended InvestorCommunicationTemplate model with business logic
const InvestorCommunicationTemplate = {
  ...baseModel,
  tableName: 'investor_communication_templates',
  schema: investorCommunicationTemplateSchema,

  // Export constants
  COMMUNICATION_TYPES,

  /**
   * Create a new template with defaults
   * @param {Object} data - Template data
   * @returns {Object} Created template
   */
  async create(data) {
    if (!data.templateId) {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 8);
      data.templateId = `TPL-${timestamp}-${random}`.toUpperCase();
    }

    // Validate communication type
    if (!COMMUNICATION_TYPES.includes(data.communicationType)) {
      throw new Error(`communicationType must be one of: ${COMMUNICATION_TYPES.join(', ')}`);
    }

    if (data.isActive === undefined) {
      data.isActive = true;
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find template by templateId
   * @param {string} templateId - Template ID
   * @returns {Object|null} Template or null
   */
  async findByTemplateId(templateId) {
    return baseModel.findOne.call(baseModel, { templateId });
  },

  /**
   * Find templates by company
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Array} Templates for company
   */
  async findByCompany(companyId, options = {}) {
    const query = { companyId };
    if (options.isActive !== undefined) {
      query.isActive = options.isActive;
    }
    if (options.communicationType) {
      query.communicationType = options.communicationType;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Find default template for communication type
   * @param {string} companyId - Company ID
   * @param {string} communicationType - Communication type
   * @returns {Object|null} Default template or null
   */
  async findDefault(companyId, communicationType) {
    return baseModel.findOne.call(baseModel, {
      companyId,
      communicationType,
      isDefault: true,
      isActive: true
    });
  },

  /**
   * Extract variables from template content
   * @param {Object} template - Template object
   * @returns {Array} Variable names
   */
  extractVariables(template) {
    const regex = /\{\{([^}]+)\}\}/g;
    const variables = new Set();
    let match;

    while ((match = regex.exec(template.subject)) !== null) {
      variables.add(match[1].trim());
    }

    const contentCopy = template.content;
    while ((match = regex.exec(contentCopy)) !== null) {
      variables.add(match[1].trim());
    }

    if (template.htmlContent) {
      const htmlCopy = template.htmlContent;
      while ((match = regex.exec(htmlCopy)) !== null) {
        variables.add(match[1].trim());
      }
    }

    return Array.from(variables);
  },

  /**
   * Process template with variable substitution
   * @param {Object} template - Template object
   * @param {Object} variables - Variables to substitute
   * @returns {Object} Processed template
   */
  processTemplate(template, variables) {
    const processText = (text) => {
      if (!text) return text;
      return text.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
        const trimmedName = varName.trim();
        // Support nested object access (e.g., quarter.number)
        const parts = trimmedName.split('.');
        let value = variables;
        for (const part of parts) {
          if (value && typeof value === 'object' && part in value) {
            value = value[part];
          } else {
            // Check variable definitions for default value
            const varDef = template.variables?.find(v => v.name === trimmedName);
            return varDef && varDef.defaultValue ? varDef.defaultValue : match;
          }
        }
        return value !== undefined ? String(value) : match;
      });
    };

    return {
      subject: processText(template.subject),
      content: processText(template.content),
      htmlContent: processText(template.htmlContent)
    };
  },

  /**
   * Activate template
   * @param {string} templateId - Template ID
   * @returns {Object} Updated template
   */
  async activate(templateId) {
    return baseModel.updateOne.call(baseModel,
      { templateId },
      { $set: { isActive: true } }
    );
  },

  /**
   * Deactivate template
   * @param {string} templateId - Template ID
   * @returns {Object} Updated template
   */
  async deactivate(templateId) {
    return baseModel.updateOne.call(baseModel,
      { templateId },
      { $set: { isActive: false } }
    );
  },

  /**
   * Set as default template
   * @param {string} companyId - Company ID
   * @param {string} templateId - Template ID
   * @param {string} communicationType - Communication type
   * @returns {Object} Updated template
   */
  async setDefault(companyId, templateId, communicationType) {
    // First, unset any existing default
    await baseModel.updateMany.call(baseModel,
      { companyId, communicationType, isDefault: true },
      { $set: { isDefault: false } }
    );

    // Set the new default
    return baseModel.updateOne.call(baseModel,
      { templateId },
      { $set: { isDefault: true } }
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

module.exports = InvestorCommunicationTemplate;

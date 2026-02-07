/**
 * DocumentTemplate Model
 * Issue #193: Implement Document Template System
 *
 * Stores reusable document templates with variable placeholders.
 * Supports variable substitution using {{variable}} syntax.
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

const TEMPLATE_CATEGORIES = [
  'Legal',
  'Financial',
  'HR',
  'Corporate',
  'Compliance',
  'Investment',
  'General'
];

const VARIABLE_TYPES = [
  'text',
  'number',
  'currency',
  'date',
  'boolean',
  'email',
  'phone',
  'address',
  'percentage',
  'signature'
];

// Schema definition for documentation and validation
const documentTemplateSchema = {
  templateId: { type: 'string', required: true, unique: true },
  companyId: { type: 'string', required: true },
  name: { type: 'string', required: true },
  description: { type: 'string', default: '' },
  category: { type: 'string', required: true, enum: TEMPLATE_CATEGORIES },
  content: { type: 'string', required: true },
  htmlContent: { type: 'string', default: null },
  variables: { type: 'array', default: [] },
  tags: { type: 'array', default: [] },
  version: { type: 'number', default: 1 },
  isActive: { type: 'boolean', default: true },
  metadata: { type: 'object', default: {} },
  createdBy: { type: 'string', required: true },
  updatedBy: { type: 'string', default: null },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('document_templates', documentTemplateSchema);

// Extended DocumentTemplate model with business logic
const DocumentTemplate = {
  ...baseModel,
  tableName: 'document_templates',
  schema: documentTemplateSchema,

  // Export constants
  TEMPLATE_CATEGORIES,
  VARIABLE_TYPES,

  /**
   * Create a new template with defaults
   * @param {Object} data - Template data
   * @returns {Object} Created template
   */
  async create(data) {
    if (!data.templateId) {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 8);
      data.templateId = `TMPL-${timestamp}-${random}`.toUpperCase();
    }

    // Validate category
    if (!TEMPLATE_CATEGORIES.includes(data.category)) {
      throw new Error(`category must be one of: ${TEMPLATE_CATEGORIES.join(', ')}`);
    }

    if (!data.version) {
      data.version = 1;
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
    if (options.category) {
      query.category = options.category;
    }
    if (options.isActive !== undefined) {
      query.isActive = options.isActive;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Find templates by tags
   * @param {Array} tags - Tags to search for
   * @returns {Array} Matching templates
   */
  async findByTags(tags) {
    const all = await baseModel.find.call(baseModel, { isActive: true });
    return all.filter(template =>
      template.tags && template.tags.some(tag => tags.includes(tag))
    );
  },

  /**
   * Extract all variable placeholders from content
   * @param {Object} template - Template object
   * @returns {Array<string>} Array of unique variable names
   */
  extractVariables(template) {
    const regex = /\{\{([^}]+)\}\}/g;
    const variables = new Set();
    let match;

    // Extract from content
    if (template.content) {
      while ((match = regex.exec(template.content)) !== null) {
        variables.add(match[1].trim());
      }
      regex.lastIndex = 0;
    }

    // Extract from htmlContent if present
    if (template.htmlContent) {
      while ((match = regex.exec(template.htmlContent)) !== null) {
        variables.add(match[1].trim());
      }
    }

    return Array.from(variables);
  },

  /**
   * Generate document with variable substitution
   * @param {Object} template - Template object
   * @param {Object} variables - Object with variable values
   * @returns {Object} Generated content and htmlContent
   */
  generate(template, variables) {
    const processText = (text) => {
      if (!text) return text;
      return text.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
        const trimmedName = varName.trim();
        // Support nested object access (e.g., company.name)
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
      content: processText(template.content),
      htmlContent: processText(template.htmlContent)
    };
  },

  /**
   * Validate that all required variables are provided
   * @param {Object} template - Template object
   * @param {Object} variables - Object with variable values
   * @returns {Object} Validation result with isValid and missingVariables
   */
  validateVariables(template, variables) {
    const missingVariables = [];

    if (template.variables) {
      for (const varDef of template.variables) {
        if (varDef.required) {
          const value = variables[varDef.name];
          if (value === undefined || value === null || value === '') {
            missingVariables.push(varDef.name);
          }
        }
      }
    }

    return {
      isValid: missingVariables.length === 0,
      missingVariables
    };
  },

  /**
   * Generate a preview with sample values
   * @param {Object} template - Template object
   * @returns {Object} Preview content with sample values
   */
  preview(template) {
    const sampleVariables = {};

    // Build sample variables object from variable definitions
    if (template.variables) {
      for (const varDef of template.variables) {
        if (varDef.sampleValue) {
          sampleVariables[varDef.name] = varDef.sampleValue;
        } else if (varDef.defaultValue) {
          sampleVariables[varDef.name] = varDef.defaultValue;
        } else {
          // Generate placeholder based on type
          switch (varDef.type) {
            case 'currency':
              sampleVariables[varDef.name] = '$0.00';
              break;
            case 'number':
              sampleVariables[varDef.name] = '0';
              break;
            case 'date':
              sampleVariables[varDef.name] = new Date().toISOString().split('T')[0];
              break;
            case 'percentage':
              sampleVariables[varDef.name] = '0%';
              break;
            case 'boolean':
              sampleVariables[varDef.name] = 'false';
              break;
            case 'email':
              sampleVariables[varDef.name] = 'example@email.com';
              break;
            case 'phone':
              sampleVariables[varDef.name] = '(000) 000-0000';
              break;
            default:
              sampleVariables[varDef.name] = `[${varDef.name}]`;
          }
        }
      }
    }

    return this.generate(template, sampleVariables);
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

module.exports = DocumentTemplate;
module.exports.TEMPLATE_CATEGORIES = TEMPLATE_CATEGORIES;
module.exports.VARIABLE_TYPES = VARIABLE_TYPES;

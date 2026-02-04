/**
 * Document Template Service
 * Issue #193: Implement Document Template System
 *
 * Provides template management functionality including:
 * - CRUD operations for templates
 * - Variable extraction and substitution
 * - Template generation with variable values
 * - Category management
 */

const { v4: uuidv4 } = require('uuid');
const databaseAdapter = require('./databaseAdapter');
const { TEMPLATE_CATEGORIES } = require('../models/DocumentTemplate');

class DocumentTemplateService {
  /**
   * Generate a unique template ID
   * @returns {string} Template ID
   */
  _generateTemplateId() {
    const timestamp = Date.now().toString(36);
    const random = uuidv4().slice(0, 8);
    return `TMPL-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Create a new document template
   * @param {Object} templateData - Template data
   * @returns {Promise<Object>} Created template
   */
  async createTemplate(templateData) {
    const {
      companyId,
      name,
      description,
      category,
      content,
      htmlContent,
      variables,
      tags,
      metadata,
      createdBy
    } = templateData;

    // Validate required fields
    if (!companyId) {
      throw new Error('companyId is required');
    }
    if (!name) {
      throw new Error('name is required');
    }
    if (!category) {
      throw new Error('category is required');
    }
    if (!content) {
      throw new Error('content is required');
    }
    if (!createdBy) {
      throw new Error('createdBy is required');
    }

    const templateRecord = {
      templateId: templateData.templateId || this._generateTemplateId(),
      companyId,
      name,
      description,
      category,
      content,
      htmlContent,
      variables: variables || [],
      tags: tags || [],
      version: 1,
      isActive: true,
      metadata: metadata || {},
      createdBy
    };

    return await databaseAdapter.create('DocumentTemplate', templateRecord);
  }

  /**
   * Get templates with filtering and pagination
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Templates list with metadata
   */
  async getTemplates(options = {}) {
    const {
      companyId,
      category,
      tags,
      isActive,
      skip = 0,
      limit = 50,
      sort = { createdAt: -1 }
    } = options;

    const query = {};

    if (companyId) {
      query.companyId = companyId;
    }

    if (category) {
      query.category = category;
    }

    if (tags && tags.length > 0) {
      query.tags = { $in: tags };
    }

    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    const templates = await databaseAdapter.find('DocumentTemplate', query, {
      skip,
      limit,
      sort
    });

    return {
      templates,
      count: templates.length,
      skip,
      limit
    };
  }

  /**
   * Get a template by its ID
   * @param {string} templateId - The template ID
   * @returns {Promise<Object|null>} Template or null
   */
  async getTemplateById(templateId) {
    return await databaseAdapter.findById('DocumentTemplate', templateId);
  }

  /**
   * Update a template
   * @param {string} templateId - The template ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated template
   */
  async updateTemplate(templateId, updateData) {
    const { name, description, category, content, htmlContent, variables, tags, metadata, updatedBy } = updateData;

    const updateFields = {};

    if (name !== undefined) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (category !== undefined) updateFields.category = category;
    if (content !== undefined) updateFields.content = content;
    if (htmlContent !== undefined) updateFields.htmlContent = htmlContent;
    if (variables !== undefined) updateFields.variables = variables;
    if (tags !== undefined) updateFields.tags = tags;
    if (metadata !== undefined) updateFields.metadata = metadata;
    if (updatedBy !== undefined) updateFields.updatedBy = updatedBy;

    // Increment version on content changes
    updateFields.$inc = { version: 1 };

    const result = await databaseAdapter.findByIdAndUpdate(
      'DocumentTemplate',
      templateId,
      updateFields,
      { new: true }
    );

    if (!result) {
      throw new Error('Template not found');
    }

    return result;
  }

  /**
   * Delete a template (soft or hard delete)
   * @param {string} templateId - The template ID
   * @param {Object} options - Delete options
   * @returns {Promise<Object>} Deleted template or delete result
   */
  async deleteTemplate(templateId, options = {}) {
    const { hard = false } = options;

    if (hard) {
      const result = await databaseAdapter.findByIdAndDelete('DocumentTemplate', templateId);
      if (!result) {
        throw new Error('Template not found');
      }
      return result;
    }

    // Soft delete - set isActive to false
    const result = await databaseAdapter.findByIdAndUpdate(
      'DocumentTemplate',
      templateId,
      { isActive: false },
      { new: true }
    );

    if (!result) {
      throw new Error('Template not found');
    }

    return result;
  }

  /**
   * Generate a document from a template with variable substitution
   * @param {string} templateId - The template ID
   * @param {Object} variables - Variables to substitute
   * @returns {Promise<Object>} Generated document content
   */
  async generateDocument(templateId, variables) {
    const template = await databaseAdapter.findById('DocumentTemplate', templateId);

    if (!template) {
      throw new Error('Template not found');
    }

    // Validate required variables
    if (template.validateVariables) {
      const validation = template.validateVariables(variables);
      if (!validation.isValid) {
        throw new Error(`Missing required variables: ${validation.missingVariables.join(', ')}`);
      }
    }

    // Generate the document with variable substitution
    if (template.generate) {
      return template.generate(variables);
    }

    // Fallback if method is not available (for plain objects)
    return this._processTemplate(template, variables);
  }

  /**
   * Process template content with variable substitution (fallback method)
   * @param {Object} template - The template object
   * @param {Object} variables - Variables to substitute
   * @returns {Object} Processed content
   */
  _processTemplate(template, variables) {
    const processText = (text) => {
      if (!text) return text;
      return text.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
        const trimmedName = varName.trim();
        const parts = trimmedName.split('.');
        let value = variables;
        for (const part of parts) {
          if (value && typeof value === 'object' && part in value) {
            value = value[part];
          } else {
            const varDef = (template.variables || []).find(v => v.name === trimmedName);
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
  }

  /**
   * Get all available template categories
   * @returns {Promise<Array<string>>} List of categories
   */
  async getCategories() {
    return TEMPLATE_CATEGORIES;
  }

  /**
   * Get categories with template counts for a company
   * @param {string} companyId - The company ID
   * @returns {Promise<Array<Object>>} Categories with counts
   */
  async getCategoriesWithCounts(companyId) {
    const templates = await databaseAdapter.find('DocumentTemplate', {
      companyId,
      isActive: true
    });

    const counts = {};
    for (const template of templates) {
      const category = template.category;
      counts[category] = (counts[category] || 0) + 1;
    }

    return Object.entries(counts).map(([category, count]) => ({
      category,
      count
    }));
  }

  /**
   * Generate a preview with sample values
   * @param {string} templateId - The template ID
   * @returns {Promise<Object>} Preview content
   */
  async previewTemplate(templateId) {
    const template = await databaseAdapter.findById('DocumentTemplate', templateId);

    if (!template) {
      throw new Error('Template not found');
    }

    if (template.preview) {
      return template.preview();
    }

    // Fallback: build sample values from variable definitions
    const sampleVariables = {};
    for (const varDef of (template.variables || [])) {
      sampleVariables[varDef.name] = varDef.sampleValue || varDef.defaultValue || `[${varDef.name}]`;
    }

    return this._processTemplate(template, sampleVariables);
  }

  /**
   * Clone an existing template
   * @param {string} sourceTemplateId - Source template ID
   * @param {Object} options - Clone options
   * @returns {Promise<Object>} Cloned template
   */
  async cloneTemplate(sourceTemplateId, options) {
    const { name, createdBy } = options;

    const sourceTemplate = await databaseAdapter.findById('DocumentTemplate', sourceTemplateId);

    if (!sourceTemplate) {
      throw new Error('Source template not found');
    }

    const cloneData = {
      templateId: this._generateTemplateId(),
      companyId: sourceTemplate.companyId,
      name: name || `Copy of ${sourceTemplate.name}`,
      description: sourceTemplate.description,
      category: sourceTemplate.category,
      content: sourceTemplate.content,
      htmlContent: sourceTemplate.htmlContent,
      variables: sourceTemplate.variables || [],
      tags: sourceTemplate.tags || [],
      version: 1,
      isActive: true,
      metadata: { clonedFrom: sourceTemplateId },
      createdBy
    };

    return await databaseAdapter.create('DocumentTemplate', cloneData);
  }

  /**
   * Search templates by name and description
   * @param {string} companyId - The company ID
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async searchTemplates(companyId, searchTerm, options = {}) {
    const { skip = 0, limit = 50 } = options;

    const searchRegex = new RegExp(searchTerm, 'i');

    const query = {
      companyId,
      isActive: true,
      $or: [
        { name: searchRegex },
        { description: searchRegex },
        { tags: searchRegex }
      ]
    };

    const templates = await databaseAdapter.find('DocumentTemplate', query, {
      skip,
      limit,
      sort: { name: 1 }
    });

    return {
      templates,
      count: templates.length,
      searchTerm
    };
  }
}

module.exports = new DocumentTemplateService();

/**
 * DocumentTemplate Controller
 * Issue #193: Implement Document Template System
 *
 * API controller for managing document templates including:
 * - CRUD operations for templates
 * - Template generation with variable substitution
 * - Category management
 * - Template preview and clone functionality
 */

const documentTemplateService = require('../services/documentTemplateService');

/**
 * Create a new document template
 */
exports.createTemplate = async (req, res) => {
  try {
    const templateData = {
      ...req.body,
      createdBy: req.user._id || req.body.createdBy
    };

    const template = await documentTemplateService.createTemplate(templateData);
    res.status(201).json(template);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get templates with filtering and pagination
 */
exports.getTemplates = async (req, res) => {
  try {
    const options = {
      companyId: req.query.companyId,
      category: req.query.category,
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
      tags: req.query.tags ? (Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags]) : undefined,
      skip: req.query.skip ? parseInt(req.query.skip, 10) : 0,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 50
    };

    const result = await documentTemplateService.getTemplates(options);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get a template by ID
 */
exports.getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await documentTemplateService.getTemplateById(id);

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.status(200).json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update a template
 */
exports.updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      updatedBy: req.user._id || req.body.updatedBy
    };

    const template = await documentTemplateService.updateTemplate(id, updateData);
    res.status(200).json(template);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete a template (soft or hard)
 */
exports.deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const hard = req.query.hard === 'true';

    const result = await documentTemplateService.deleteTemplate(id, { hard });

    res.status(200).json({
      message: hard ? 'Template permanently deleted' : 'Template deactivated',
      ...result
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Generate a document from a template with variable substitution
 */
exports.generateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { variables } = req.body;

    const generatedDoc = await documentTemplateService.generateDocument(id, variables || {});
    res.status(200).json(generatedDoc);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Missing required variables')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get template categories
 */
exports.getCategories = async (req, res) => {
  try {
    const { companyId } = req.query;

    if (companyId) {
      // Return categories with counts for the company
      const categoriesWithCounts = await documentTemplateService.getCategoriesWithCounts(companyId);
      return res.status(200).json({ categories: categoriesWithCounts });
    }

    // Return all available categories
    const categories = await documentTemplateService.getCategories();
    res.status(200).json({ categories });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Generate a preview of a template with sample values
 */
exports.previewTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const preview = await documentTemplateService.previewTemplate(id);
    res.status(200).json(preview);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Clone an existing template
 */
exports.cloneTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const clonedTemplate = await documentTemplateService.cloneTemplate(id, {
      name,
      createdBy: req.user._id || req.body.createdBy
    });

    res.status(201).json(clonedTemplate);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Search templates
 */
exports.searchTemplates = async (req, res) => {
  try {
    const { companyId, q: searchTerm, skip, limit } = req.query;

    if (!searchTerm) {
      return res.status(400).json({ error: 'Search term (q) is required' });
    }

    const options = {
      skip: skip ? parseInt(skip, 10) : 0,
      limit: limit ? parseInt(limit, 10) : 50
    };

    const results = await documentTemplateService.searchTemplates(companyId, searchTerm, options);
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

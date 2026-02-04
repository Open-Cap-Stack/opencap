/**
 * Report Library Controller
 * Issue #199: Add Report Library Categorization
 *
 * REST API controller for managing report library including:
 * - Category management endpoints
 * - Template management endpoints
 * - Library listing endpoints
 * - Report sharing endpoints
 */

const ReportLibraryService = require('../services/reportLibraryService');

// ============================================================================
// Category Endpoints
// ============================================================================

/**
 * Get all report categories
 * GET /api/v1/reports/categories
 */
const getCategories = async (req, res) => {
  try {
    const filters = {};
    if (req.query.status) {
      filters.status = req.query.status;
    }

    const categories = await ReportLibraryService.getCategories(filters);

    res.status(200).json({
      success: true,
      data: categories,
      count: categories.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Create a new category
 * POST /api/v1/reports/categories
 */
const createCategory = async (req, res) => {
  try {
    const category = await ReportLibraryService.createCategory(req.body);

    res.status(201).json({
      success: true,
      data: category,
      message: 'Category created successfully'
    });
  } catch (error) {
    const statusCode = error.message.includes('Missing required') ||
                      error.message.includes('already exists')
      ? 400
      : 500;

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Update a category
 * PUT /api/v1/reports/categories/:categoryId
 */
const updateCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const category = await ReportLibraryService.updateCategory(categoryId, req.body);

    res.status(200).json({
      success: true,
      data: category,
      message: 'Category updated successfully'
    });
  } catch (error) {
    const statusCode = error.message === 'Category not found' ? 404 : 400;

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Delete a category
 * DELETE /api/v1/reports/categories/:categoryId
 */
const deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    await ReportLibraryService.deleteCategory(categoryId);

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    let statusCode = 500;
    if (error.message === 'Category not found') {
      statusCode = 404;
    } else if (error.message.includes('Cannot delete')) {
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================================================
// Template Endpoints
// ============================================================================

/**
 * Get all templates
 * GET /api/v1/reports/templates
 */
const getTemplates = async (req, res) => {
  try {
    const filters = {};
    if (req.query.categoryId) {
      filters.categoryId = req.query.categoryId;
    }
    if (req.query.status) {
      filters.status = req.query.status;
    }

    const options = {
      page: req.query.page ? parseInt(req.query.page, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 50
    };

    const templates = await ReportLibraryService.getTemplates(filters, options);

    res.status(200).json({
      success: true,
      data: templates,
      count: templates.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Create a new template
 * POST /api/v1/reports/templates
 */
const createTemplate = async (req, res) => {
  try {
    const template = await ReportLibraryService.createTemplate(req.body);

    res.status(201).json({
      success: true,
      data: template,
      message: 'Template created successfully'
    });
  } catch (error) {
    let statusCode = 400;
    if (error.message === 'Category not found') {
      statusCode = 404;
    }

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get a template by ID
 * GET /api/v1/reports/templates/:templateId
 */
const getTemplateById = async (req, res) => {
  try {
    const { templateId } = req.params;
    const template = await ReportLibraryService.getTemplateById(templateId);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.status(200).json({
      success: true,
      data: template
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Update a template
 * PUT /api/v1/reports/templates/:templateId
 */
const updateTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const template = await ReportLibraryService.updateTemplate(templateId, req.body);

    res.status(200).json({
      success: true,
      data: template,
      message: 'Template updated successfully'
    });
  } catch (error) {
    const statusCode = error.message === 'Template not found' ? 404 : 400;

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Delete a template
 * DELETE /api/v1/reports/templates/:templateId
 */
const deleteTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    await ReportLibraryService.deleteTemplate(templateId);

    res.status(200).json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    const statusCode = error.message === 'Template not found' ? 404 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================================================
// Library Endpoints
// ============================================================================

/**
 * Get report library with categories and reports
 * GET /api/v1/reports/library
 */
const getLibrary = async (req, res) => {
  try {
    const filters = {};
    if (req.query.search) {
      filters.search = req.query.search;
    }
    if (req.query.categoryId) {
      filters.categoryId = req.query.categoryId;
    }

    const library = await ReportLibraryService.getLibrary(filters);

    res.status(200).json({
      success: true,
      data: library
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================================================
// Share Endpoints
// ============================================================================

/**
 * Share a report with recipients
 * POST /api/v1/reports/:reportId/share
 */
const shareReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const shareData = {
      ...req.body,
      sharedBy: req.user?.userId
    };

    const share = await ReportLibraryService.shareReport(reportId, shareData);

    res.status(201).json({
      success: true,
      data: share,
      message: 'Report shared successfully'
    });
  } catch (error) {
    let statusCode = 400;
    if (error.message === 'Report not found') {
      statusCode = 404;
    }

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get all shares for a report
 * GET /api/v1/reports/:reportId/shares
 */
const getShares = async (req, res) => {
  try {
    const { reportId } = req.params;
    const shares = await ReportLibraryService.getShares(reportId);

    res.status(200).json({
      success: true,
      data: shares,
      count: shares.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Revoke a share
 * DELETE /api/v1/reports/shares/:shareId
 */
const revokeShare = async (req, res) => {
  try {
    const { shareId } = req.params;
    await ReportLibraryService.revokeShare(shareId);

    res.status(200).json({
      success: true,
      message: 'Share revoked successfully'
    });
  } catch (error) {
    const statusCode = error.message === 'Share not found' ? 404 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Validate share access
 * GET /api/v1/reports/shares/:shareId/validate
 */
const validateShareAccess = async (req, res) => {
  try {
    const { shareId } = req.params;
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const valid = await ReportLibraryService.validateShareAccess(shareId, email);

    res.status(200).json({
      success: true,
      valid
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  // Category endpoints
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,

  // Template endpoints
  getTemplates,
  createTemplate,
  getTemplateById,
  updateTemplate,
  deleteTemplate,

  // Library endpoints
  getLibrary,

  // Share endpoints
  shareReport,
  getShares,
  revokeShare,
  validateShareAccess
};

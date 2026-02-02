/**
 * Semantic Search Controller
 *
 * [Feature] OCAE-23: Semantic Document Search
 * Handles HTTP requests for semantic document search functionality
 */

const mongoose = require('mongoose');
const SemanticSearchService = require('../services/semanticSearchService');

/**
 * Configuration constants
 */
const CONFIG = {
  MIN_QUERY_LENGTH: 2,
  MAX_QUERY_LENGTH: 1000,
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100
};

/**
 * Validate MongoDB ObjectId format
 * @param {string} id - The ID to validate
 * @returns {boolean} - Whether the ID is valid
 */
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Sanitize and normalize query string
 * @param {string} query - The raw query string
 * @returns {string} - Sanitized query
 */
const sanitizeQuery = (query) => {
  if (!query || typeof query !== 'string') return '';
  return query.trim().replace(/\s+/g, ' ');
};

/**
 * Search documents using semantic search
 * POST /api/v1/documents/search
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const searchDocuments = async (req, res) => {
  try {
    const { query, filters, page, pageSize, minRelevance, highlight, includeContent } = req.body;

    // Validate query
    const validationError = validateSearchQuery(query);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    // Validate pagination
    const paginationError = validatePagination(page, pageSize);
    if (paginationError) {
      return res.status(400).json({ error: paginationError });
    }

    // Validate filters
    const filterError = validateFilters(filters);
    if (filterError) {
      return res.status(400).json({ error: filterError });
    }

    // Sanitize query
    const sanitizedQuery = sanitizeQuery(query);

    // Build search options
    const searchOptions = {
      pagination: {
        page: page || CONFIG.DEFAULT_PAGE,
        pageSize: Math.min(pageSize || CONFIG.DEFAULT_PAGE_SIZE, CONFIG.MAX_PAGE_SIZE)
      },
      filters: filters || {},
      userId: req.user?.id,
      minRelevance: minRelevance || 0,
      highlight: highlight || false,
      includeContent: includeContent || false
    };

    // Perform search
    const results = await SemanticSearchService.search(sanitizedQuery, searchOptions);

    // Set response headers
    res.set('X-Total-Count', results.totalCount.toString());
    res.set('X-Search-Time-Ms', results.searchTimeMs.toString());

    return res.status(200).json(results);
  } catch (error) {
    console.error('Search documents error:', error);

    // Don't expose internal error details in production
    const errorMessage = process.env.NODE_ENV === 'production'
      ? 'An error occurred while processing your search request'
      : error.message;

    return res.status(500).json({
      error: `Failed to search documents: ${errorMessage}`
    });
  }
};

/**
 * Get search suggestions for autocomplete
 * GET /api/v1/documents/search/suggestions
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSuggestions = async (req, res) => {
  try {
    const { q, limit, companyId } = req.query;

    // Validate query parameter
    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    // Validate companyId if provided
    if (companyId && !isValidObjectId(companyId)) {
      return res.status(400).json({ error: 'Invalid companyId format' });
    }

    const options = {
      limit: parseInt(limit, 10) || 10,
      companyId
    };

    const suggestions = await SemanticSearchService.getSuggestions(q, options);

    return res.status(200).json({ suggestions });
  } catch (error) {
    console.error('Get suggestions error:', error);

    return res.status(500).json({
      error: 'Failed to get search suggestions'
    });
  }
};

/**
 * Get search analytics
 * GET /api/v1/documents/search/analytics
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSearchAnalytics = async (req, res) => {
  try {
    const { companyId, startDate, endDate } = req.query;

    // Validate companyId if provided
    if (companyId && !isValidObjectId(companyId)) {
      return res.status(400).json({ error: 'Invalid companyId format' });
    }

    const options = {};

    if (companyId) {
      options.companyId = companyId;
    }

    if (startDate && endDate) {
      options.dateRange = {
        start: startDate,
        end: endDate
      };
    }

    const analytics = await SemanticSearchService.getSearchAnalytics(options);

    return res.status(200).json(analytics);
  } catch (error) {
    console.error('Get search analytics error:', error);

    return res.status(500).json({
      error: 'Failed to get search analytics'
    });
  }
};

/**
 * Validate search query
 * @param {string} query - The search query
 * @returns {string|null} - Error message or null if valid
 */
const validateSearchQuery = (query) => {
  if (!query) {
    return 'Search query is required';
  }

  if (typeof query !== 'string') {
    return 'Search query must be a string';
  }

  const trimmedQuery = query.trim();

  if (trimmedQuery.length === 0) {
    return 'Search query cannot be empty';
  }

  if (trimmedQuery.length < CONFIG.MIN_QUERY_LENGTH) {
    return `Search query must be at least ${CONFIG.MIN_QUERY_LENGTH} characters (minimum length)`;
  }

  if (trimmedQuery.length > CONFIG.MAX_QUERY_LENGTH) {
    return `Search query cannot exceed ${CONFIG.MAX_QUERY_LENGTH} characters (maximum length)`;
  }

  return null;
};

/**
 * Validate pagination parameters
 * @param {number} page - Page number
 * @param {number} pageSize - Page size
 * @returns {string|null} - Error message or null if valid
 */
const validatePagination = (page, pageSize) => {
  if (page !== undefined) {
    if (typeof page !== 'number' || !Number.isInteger(page) || page < 1) {
      return 'page must be a positive integer';
    }
  }

  if (pageSize !== undefined) {
    if (typeof pageSize !== 'number' || !Number.isInteger(pageSize) || pageSize < 1) {
      return 'pageSize must be a positive integer';
    }
  }

  return null;
};

/**
 * Validate filter parameters
 * @param {Object} filters - Filter object
 * @returns {string|null} - Error message or null if valid
 */
const validateFilters = (filters) => {
  if (!filters) return null;

  // Validate companyId
  if (filters.companyId) {
    if (!isValidObjectId(filters.companyId)) {
      return 'Invalid companyId format';
    }
  }

  // Validate category
  if (filters.category !== undefined && typeof filters.category !== 'string') {
    return 'category must be a string';
  }

  // Validate categories array
  if (filters.categories !== undefined) {
    if (!Array.isArray(filters.categories)) {
      return 'categories must be an array';
    }
    if (!filters.categories.every(c => typeof c === 'string')) {
      return 'All categories must be strings';
    }
  }

  // Validate date range
  if (filters.dateRange) {
    const { start, end } = filters.dateRange;

    if (!start || !end) {
      return 'dateRange must include both start and end dates';
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return 'Invalid date format in dateRange';
    }

    if (startDate > endDate) {
      return 'dateRange start date must be before end date';
    }
  }

  // Validate tags
  if (filters.tags !== undefined) {
    if (!Array.isArray(filters.tags)) {
      return 'tags must be an array';
    }
    if (!filters.tags.every(t => typeof t === 'string')) {
      return 'All tags must be strings';
    }
  }

  // Validate status
  if (filters.status !== undefined && typeof filters.status !== 'string') {
    return 'status must be a string';
  }

  return null;
};

module.exports = {
  searchDocuments,
  getSuggestions,
  getSearchAnalytics
};

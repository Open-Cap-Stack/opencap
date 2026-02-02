/**
 * Semantic Search Routes
 *
 * [Feature] OCAE-23: Semantic Document Search
 * API routes for semantic document search functionality
 */

const express = require('express');
const router = express.Router();
const semanticSearchController = require('../../controllers/semanticSearchController');

/**
 * POST /api/v1/documents/search
 * Search documents using semantic search
 */
router.post('/', semanticSearchController.searchDocuments);

/**
 * GET /api/v1/documents/search/suggestions
 * Get search suggestions for autocomplete
 */
router.get('/suggestions', semanticSearchController.getSuggestions);

/**
 * GET /api/v1/documents/search/analytics
 * Get search analytics data
 */
router.get('/analytics', semanticSearchController.getSearchAnalytics);

module.exports = router;

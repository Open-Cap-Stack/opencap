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
 * @swagger
 * /api/v1/documents/search:
 *   post:
 *     summary: Search documents using semantic search
 *     description: Performs natural language search across indexed documents using vector similarity
 *     tags: [Semantic Search]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: Natural language search query
 *                 minLength: 2
 *                 maxLength: 1000
 *                 example: "stock options vesting schedule"
 *               filters:
 *                 type: object
 *                 properties:
 *                   companyId:
 *                     type: string
 *                     description: Filter by company ID
 *                   category:
 *                     type: string
 *                     description: Filter by document category
 *                   categories:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: Filter by multiple categories
 *                   dateRange:
 *                     type: object
 *                     properties:
 *                       start:
 *                         type: string
 *                         format: date
 *                       end:
 *                         type: string
 *                         format: date
 *                   status:
 *                     type: string
 *                     enum: [draft, active, archived, deleted]
 *                   tags:
 *                     type: array
 *                     items:
 *                       type: string
 *               page:
 *                 type: integer
 *                 minimum: 1
 *                 default: 1
 *                 description: Page number for pagination
 *               pageSize:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 default: 10
 *                 description: Number of results per page
 *               minRelevance:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *                 default: 0
 *                 description: Minimum relevance score threshold
 *               highlight:
 *                 type: boolean
 *                 default: false
 *                 description: Include highlighted excerpts in results
 *               includeContent:
 *                 type: boolean
 *                 default: false
 *                 description: Include full document content in results
 *     responses:
 *       200:
 *         description: Search results
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Search service error
 */
router.post('/', semanticSearchController.searchDocuments);

/**
 * @swagger
 * /api/v1/documents/search/suggestions:
 *   get:
 *     summary: Get search suggestions
 *     description: Returns autocomplete suggestions based on partial query
 *     tags: [Semantic Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Partial search query
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of suggestions
 *     responses:
 *       200:
 *         description: Search suggestions
 *       400:
 *         description: Missing query parameter
 *       500:
 *         description: Service error
 */
router.get('/suggestions', semanticSearchController.getSuggestions);

/**
 * @swagger
 * /api/v1/documents/search/analytics:
 *   get:
 *     summary: Get search analytics
 *     description: Returns analytics about search usage
 *     tags: [Semantic Search]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *         description: Filter analytics by company
 *     responses:
 *       200:
 *         description: Search analytics data
 *       500:
 *         description: Service error
 */
router.get('/analytics', semanticSearchController.getSearchAnalytics);

module.exports = router;

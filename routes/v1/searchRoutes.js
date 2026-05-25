/**
 * Global Search Routes
 *
 * Issue #190 - Add Global Multi-Entity Search Endpoint
 * API routes for global multi-entity search functionality
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const searchController = require('../../controllers/searchController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/v1/search:
 *   get:
 *     summary: Global multi-entity search
 *     description: |
 *       Search across multiple entity types including stakeholders, documents, tasks,
 *       companies, share classes, 409A valuations, and messages. Returns unified results
 *       with relevance scores for each entity type.
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *           maxLength: 500
 *         description: Search query (2-500 characters)
 *         example: "john doe investment"
 *       - in: query
 *         name: types
 *         required: false
 *         schema:
 *           type: string
 *         description: |
 *           Comma-separated list of entity types to search.
 *           If not specified, searches all types.
 *           Valid types: stakeholders, documents, tasks, companies, share_classes, valuations, messages
 *         example: "stakeholders,documents"
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Maximum number of results per entity type
 *         example: 10
 *       - in: query
 *         name: offset
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Pagination offset for results
 *         example: 0
 *     responses:
 *       200:
 *         description: Search results successfully retrieved
 *         headers:
 *           X-Search-Time-Ms:
 *             description: Search execution time in milliseconds
 *             schema:
 *               type: integer
 *           X-Total-Count:
 *             description: Total number of results across all entity types
 *             schema:
 *               type: integer
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 query:
 *                   type: string
 *                   example: "john doe investment"
 *                 results:
 *                   type: object
 *                   properties:
 *                     stakeholders:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           email:
 *                             type: string
 *                           role:
 *                             type: string
 *                           relevance:
 *                             type: number
 *                             minimum: 0
 *                             maximum: 1
 *                           entityType:
 *                             type: string
 *                             enum: [stakeholder]
 *                     documents:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           title:
 *                             type: string
 *                           type:
 *                             type: string
 *                           relevance:
 *                             type: number
 *                             minimum: 0
 *                             maximum: 1
 *                           entityType:
 *                             type: string
 *                             enum: [document]
 *                     tasks:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           description:
 *                             type: string
 *                           status:
 *                             type: string
 *                           assignee:
 *                             type: string
 *                           relevance:
 *                             type: number
 *                             minimum: 0
 *                             maximum: 1
 *                           entityType:
 *                             type: string
 *                             enum: [task]
 *                     companies:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           type:
 *                             type: string
 *                           relevance:
 *                             type: number
 *                             minimum: 0
 *                             maximum: 1
 *                           entityType:
 *                             type: string
 *                             enum: [company]
 *                     share_classes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           relevance:
 *                             type: number
 *                             minimum: 0
 *                             maximum: 1
 *                           entityType:
 *                             type: string
 *                             enum: [share_class]
 *                     valuations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           valuationId:
 *                             type: string
 *                           firm:
 *                             type: string
 *                           status:
 *                             type: string
 *                           fairMarketValue:
 *                             type: number
 *                           effectiveDate:
 *                             type: string
 *                             format: date
 *                           relevance:
 *                             type: number
 *                             minimum: 0
 *                             maximum: 1
 *                           entityType:
 *                             type: string
 *                             enum: [valuation]
 *                     messages:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           content:
 *                             type: string
 *                           sender:
 *                             type: string
 *                           recipient:
 *                             type: string
 *                           type:
 *                             type: string
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           relevance:
 *                             type: number
 *                             minimum: 0
 *                             maximum: 1
 *                           entityType:
 *                             type: string
 *                             enum: [message]
 *                 totalResults:
 *                   type: integer
 *                   example: 45
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     offset:
 *                       type: integer
 *                       example: 0
 *                     searchTimeMs:
 *                       type: integer
 *                       example: 127
 *                     timedOut:
 *                       type: boolean
 *                       example: false
 *             examples:
 *               allTypes:
 *                 summary: Search all entity types
 *                 value:
 *                   success: true
 *                   query: "john doe"
 *                   results:
 *                     stakeholders:
 *                       - id: "123"
 *                         name: "John Doe"
 *                         email: "john@example.com"
 *                         role: "investor"
 *                         relevance: 0.95
 *                         entityType: "stakeholder"
 *                     documents:
 *                       - id: "456"
 *                         name: "Investment Agreement - John Doe"
 *                         title: "Investment Agreement"
 *                         type: "contract"
 *                         relevance: 0.87
 *                         entityType: "document"
 *                     tasks:
 *                       - id: "789"
 *                         title: "Follow up with John Doe"
 *                         description: "Schedule meeting"
 *                         status: "pending"
 *                         assignee: "user456"
 *                         relevance: 0.75
 *                         entityType: "task"
 *                   totalResults: 3
 *                   metadata:
 *                     limit: 10
 *                     offset: 0
 *                     searchTimeMs: 127
 *                     timedOut: false
 *               filteredTypes:
 *                 summary: Search specific entity types
 *                 value:
 *                   success: true
 *                   query: "acme corp"
 *                   results:
 *                     companies:
 *                       - id: "comp123"
 *                         name: "Acme Corporation"
 *                         type: "startup"
 *                         relevance: 0.92
 *                         entityType: "company"
 *                   totalResults: 1
 *                   metadata:
 *                     limit: 10
 *                     offset: 0
 *                     searchTimeMs: 45
 *                     timedOut: false
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *             examples:
 *               missingQuery:
 *                 summary: Missing query parameter
 *                 value:
 *                   success: false
 *                   error: 'Query parameter "q" is required'
 *               invalidType:
 *                 summary: Invalid entity type
 *                 value:
 *                   success: false
 *                   error: 'Invalid entity type: invalid_type. Valid types are: stakeholders, documents, tasks, companies, share_classes, valuations, messages'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "An error occurred while processing your search request"
 */
router.get('/', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), searchController.globalSearch);

/**
 * @swagger
 * /api/v1/search/suggestions:
 *   get:
 *     summary: Get search suggestions for autocomplete
 *     description: |
 *       Returns search suggestions based on partial query input.
 *       Useful for implementing autocomplete functionality in search interfaces.
 *       Limits results to 10 suggestions across all entity types.
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *         description: Partial search query
 *         example: "john"
 *     responses:
 *       200:
 *         description: Search suggestions successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 suggestions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       text:
 *                         type: string
 *                         description: Suggestion text to display
 *                       type:
 *                         type: string
 *                         description: Type of entity for UI display
 *                       entityType:
 *                         type: string
 *                         description: Entity type for routing
 *                       id:
 *                         type: string
 *                         description: Entity ID for direct navigation
 *             example:
 *               success: true
 *               suggestions:
 *                 - text: "John Doe"
 *                   type: "stakeholder"
 *                   entityType: "stakeholder"
 *                   id: "123"
 *                 - text: "Johnson Corporation"
 *                   type: "company"
 *                   entityType: "company"
 *                   id: "456"
 *       400:
 *         description: Missing query parameter
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: 'Query parameter "q" is required'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Failed to get search suggestions"
 */
router.get('/suggestions', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), searchController.getSearchSuggestions);

module.exports = router;

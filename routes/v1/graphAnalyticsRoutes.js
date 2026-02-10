/**
 * Graph Analytics Routes
 *
 * [Feature] Issue #49: Complete Graph Database (Neo4j) Integration
 * REST API routes for graph database operations and analytics
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const graphAnalyticsController = require('../../controllers/graphAnalyticsController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// ==================== Node Operations ====================

/**
 * @route POST /api/v1/graph/nodes
 * @desc Create a new node
 * @access Private
 */
router.post('/nodes', graphAnalyticsController.createNode);

/**
 * @route GET /api/v1/graph/nodes
 * @desc Find nodes with filters
 * @access Private
 */
router.get('/nodes', graphAnalyticsController.findNodes);

/**
 * @route POST /api/v1/graph/nodes/batch
 * @desc Batch create nodes
 * @access Private
 */
router.post('/nodes/batch', graphAnalyticsController.batchCreateNodes);

/**
 * @route GET /api/v1/graph/nodes/:label/:id
 * @desc Get a node by label and ID
 * @access Private
 */
router.get('/nodes/:label/:id', graphAnalyticsController.getNode);

/**
 * @route DELETE /api/v1/graph/nodes/:label/:id
 * @desc Delete a node
 * @access Private
 */
router.delete('/nodes/:label/:id', graphAnalyticsController.deleteNode);

/**
 * @route GET /api/v1/graph/nodes/:label/:id/related
 * @desc Get related nodes
 * @access Private
 */
router.get('/nodes/:label/:id/related', graphAnalyticsController.getRelatedNodes);

// ==================== Relationship Operations ====================

/**
 * @route POST /api/v1/graph/relationships
 * @desc Create a relationship
 * @access Private
 */
router.post('/relationships', graphAnalyticsController.createRelationship);

/**
 * @route POST /api/v1/graph/relationships/batch
 * @desc Batch create relationships
 * @access Private
 */
router.post('/relationships/batch', graphAnalyticsController.batchCreateRelationships);

/**
 * @route GET /api/v1/graph/relationships/:id
 * @desc Get a relationship by ID
 * @access Private
 */
router.get('/relationships/:id', graphAnalyticsController.getRelationship);

/**
 * @route DELETE /api/v1/graph/relationships/:id
 * @desc Delete a relationship
 * @access Private
 */
router.delete('/relationships/:id', graphAnalyticsController.deleteRelationship);

// ==================== Path Finding ====================

/**
 * @route POST /api/v1/graph/paths/shortest
 * @desc Find shortest path between nodes
 * @access Private
 */
router.post('/paths/shortest', graphAnalyticsController.findShortestPath);

/**
 * @route POST /api/v1/graph/paths/all
 * @desc Find all paths between nodes
 * @access Private
 */
router.post('/paths/all', graphAnalyticsController.findAllPaths);

// ==================== Cypher Query ====================

/**
 * @route POST /api/v1/graph/query
 * @desc Execute a Cypher query
 * @access Private
 */
router.post('/query', graphAnalyticsController.runCypherQuery);

// ==================== Graph Statistics ====================

/**
 * @route GET /api/v1/graph/stats
 * @desc Get graph statistics
 * @access Private
 */
router.get('/stats', graphAnalyticsController.getGraphStats);

// ==================== Compliance Graph ====================

/**
 * @route POST /api/v1/graph/compliance/trail
 * @desc Track compliance trail
 * @access Private
 */
router.post('/compliance/trail', graphAnalyticsController.trackComplianceTrail);

/**
 * @route GET /api/v1/graph/compliance/trail/:documentId
 * @desc Get compliance trail for a document
 * @access Private
 */
router.get('/compliance/trail/:documentId', graphAnalyticsController.getComplianceTrail);

/**
 * @route GET /api/v1/graph/compliance/audit/:documentId
 * @desc Get audit path for a document
 * @access Private
 */
router.get('/compliance/audit/:documentId', graphAnalyticsController.getAuditPath);

/**
 * @route GET /api/v1/graph/compliance/gaps/:documentId
 * @desc Find compliance gaps for a document
 * @access Private
 */
router.get('/compliance/gaps/:documentId', graphAnalyticsController.findComplianceGaps);

/**
 * @route GET /api/v1/graph/compliance/report/:companyId
 * @desc Generate compliance report for a company
 * @access Private
 */
router.get('/compliance/report/:companyId', graphAnalyticsController.generateComplianceReport);

// ==================== Network Analysis ====================

/**
 * @route POST /api/v1/graph/analysis/centrality
 * @desc Calculate centrality metrics
 * @access Private
 */
router.post('/analysis/centrality', graphAnalyticsController.calculateCentrality);

/**
 * @route POST /api/v1/graph/analysis/communities
 * @desc Detect communities in the graph
 * @access Private
 */
router.post('/analysis/communities', graphAnalyticsController.detectCommunities);

/**
 * @route POST /api/v1/graph/analysis/influence
 * @desc Analyze node influence
 * @access Private
 */
router.post('/analysis/influence', graphAnalyticsController.analyzeInfluence);

/**
 * @route GET /api/v1/graph/analysis/stats
 * @desc Get network statistics
 * @access Private
 */
router.get('/analysis/stats', graphAnalyticsController.getNetworkStats);

/**
 * @route GET /api/v1/graph/analysis/visualization
 * @desc Get data formatted for visualization
 * @access Private
 */
router.get('/analysis/visualization', graphAnalyticsController.getVisualizationData);

/**
 * @route GET /api/v1/graph/analysis/nodes/:label/:id/centrality
 * @desc Get centrality for a specific node
 * @access Private
 */
router.get('/analysis/nodes/:label/:id/centrality', graphAnalyticsController.getNodeCentrality);

/**
 * @route GET /api/v1/graph/analysis/nodes/:label/:id/influence
 * @desc Get influence score for a specific node
 * @access Private
 */
router.get('/analysis/nodes/:label/:id/influence', graphAnalyticsController.getInfluenceScore);

/**
 * @route GET /api/v1/graph/analysis/nodes/:label/:id/community
 * @desc Get community for a specific node
 * @access Private
 */
router.get('/analysis/nodes/:label/:id/community', graphAnalyticsController.getNodeCommunity);

module.exports = router;

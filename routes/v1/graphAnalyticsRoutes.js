/**
 * Graph Analytics Routes
 *
 * [Feature] Issue #49: Complete Graph Database (Neo4j) Integration
 * REST API routes for graph database operations and analytics
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const graphAnalyticsController = require('../../controllers/graphAnalyticsController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// ==================== Node Operations ====================

/**
 * @route POST /api/v1/graph/nodes
 * @desc Create a new node
 * @access Private
 */
router.post('/nodes', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), graphAnalyticsController.createNode);

/**
 * @route GET /api/v1/graph/nodes
 * @desc Find nodes with filters
 * @access Private
 */
router.get('/nodes', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), graphAnalyticsController.findNodes);

/**
 * @route POST /api/v1/graph/nodes/batch
 * @desc Batch create nodes
 * @access Private
 */
router.post('/nodes/batch', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), graphAnalyticsController.batchCreateNodes);

/**
 * @route GET /api/v1/graph/nodes/:label/:id
 * @desc Get a node by label and ID
 * @access Private
 */
router.get('/nodes/:label/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), graphAnalyticsController.getNode);

/**
 * @route DELETE /api/v1/graph/nodes/:label/:id
 * @desc Delete a node
 * @access Private
 */
router.delete('/nodes/:label/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), graphAnalyticsController.deleteNode);

/**
 * @route GET /api/v1/graph/nodes/:label/:id/related
 * @desc Get related nodes
 * @access Private
 */
router.get('/nodes/:label/:id/related', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), graphAnalyticsController.getRelatedNodes);

// ==================== Relationship Operations ====================

/**
 * @route POST /api/v1/graph/relationships
 * @desc Create a relationship
 * @access Private
 */
router.post('/relationships', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), graphAnalyticsController.createRelationship);

/**
 * @route POST /api/v1/graph/relationships/batch
 * @desc Batch create relationships
 * @access Private
 */
router.post('/relationships/batch', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), graphAnalyticsController.batchCreateRelationships);

/**
 * @route GET /api/v1/graph/relationships/:id
 * @desc Get a relationship by ID
 * @access Private
 */
router.get('/relationships/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), graphAnalyticsController.getRelationship);

/**
 * @route DELETE /api/v1/graph/relationships/:id
 * @desc Delete a relationship
 * @access Private
 */
router.delete('/relationships/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), graphAnalyticsController.deleteRelationship);

// ==================== Path Finding ====================

/**
 * @route POST /api/v1/graph/paths/shortest
 * @desc Find shortest path between nodes
 * @access Private
 */
router.post('/paths/shortest', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), graphAnalyticsController.findShortestPath);

/**
 * @route POST /api/v1/graph/paths/all
 * @desc Find all paths between nodes
 * @access Private
 */
router.post('/paths/all', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), graphAnalyticsController.findAllPaths);

// ==================== Cypher Query ====================

/**
 * @route POST /api/v1/graph/query
 * @desc Execute a Cypher query
 * @access Private
 */
router.post('/query', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), graphAnalyticsController.runCypherQuery);

// ==================== Graph Statistics ====================

/**
 * @route GET /api/v1/graph/stats
 * @desc Get graph statistics
 * @access Private
 */
router.get('/stats', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), graphAnalyticsController.getGraphStats);

// ==================== Compliance Graph ====================

/**
 * @route POST /api/v1/graph/compliance/trail
 * @desc Track compliance trail
 * @access Private
 */
router.post('/compliance/trail', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), graphAnalyticsController.trackComplianceTrail);

/**
 * @route GET /api/v1/graph/compliance/trail/:documentId
 * @desc Get compliance trail for a document
 * @access Private
 */
router.get('/compliance/trail/:documentId', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), graphAnalyticsController.getComplianceTrail);

/**
 * @route GET /api/v1/graph/compliance/audit/:documentId
 * @desc Get audit path for a document
 * @access Private
 */
router.get('/compliance/audit/:documentId', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), graphAnalyticsController.getAuditPath);

/**
 * @route GET /api/v1/graph/compliance/gaps/:documentId
 * @desc Find compliance gaps for a document
 * @access Private
 */
router.get('/compliance/gaps/:documentId', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), graphAnalyticsController.findComplianceGaps);

/**
 * @route GET /api/v1/graph/compliance/report/:companyId
 * @desc Generate compliance report for a company
 * @access Private
 */
router.get('/compliance/report/:companyId', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), graphAnalyticsController.generateComplianceReport);

// ==================== Network Analysis ====================

/**
 * @route POST /api/v1/graph/analysis/centrality
 * @desc Calculate centrality metrics
 * @access Private
 */
router.post('/analysis/centrality', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), graphAnalyticsController.calculateCentrality);

/**
 * @route POST /api/v1/graph/analysis/communities
 * @desc Detect communities in the graph
 * @access Private
 */
router.post('/analysis/communities', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), graphAnalyticsController.detectCommunities);

/**
 * @route POST /api/v1/graph/analysis/influence
 * @desc Analyze node influence
 * @access Private
 */
router.post('/analysis/influence', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), graphAnalyticsController.analyzeInfluence);

/**
 * @route GET /api/v1/graph/analysis/stats
 * @desc Get network statistics
 * @access Private
 */
router.get('/analysis/stats', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), graphAnalyticsController.getNetworkStats);

/**
 * @route GET /api/v1/graph/analysis/visualization
 * @desc Get data formatted for visualization
 * @access Private
 */
router.get('/analysis/visualization', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), graphAnalyticsController.getVisualizationData);

/**
 * @route GET /api/v1/graph/analysis/nodes/:label/:id/centrality
 * @desc Get centrality for a specific node
 * @access Private
 */
router.get('/analysis/nodes/:label/:id/centrality', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), graphAnalyticsController.getNodeCentrality);

/**
 * @route GET /api/v1/graph/analysis/nodes/:label/:id/influence
 * @desc Get influence score for a specific node
 * @access Private
 */
router.get('/analysis/nodes/:label/:id/influence', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), graphAnalyticsController.getInfluenceScore);

/**
 * @route GET /api/v1/graph/analysis/nodes/:label/:id/community
 * @desc Get community for a specific node
 * @access Private
 */
router.get('/analysis/nodes/:label/:id/community', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), graphAnalyticsController.getNodeCommunity);

module.exports = router;

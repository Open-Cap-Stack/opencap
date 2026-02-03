/**
 * Graph Analytics Controller
 *
 * [Feature] Issue #49: Complete Graph Database (Neo4j) Integration
 * REST API endpoints for graph database operations and analytics
 */

const graphDatabaseService = require('../services/graphDatabaseService');
const complianceGraphService = require('../services/complianceGraphService');
const networkAnalysisService = require('../services/networkAnalysisService');

// ==================== Node Operations ====================

/**
 * Create a new node
 * POST /api/v1/graph/nodes
 */
const createNode = async (req, res) => {
  try {
    const { label, properties } = req.body;

    if (!label) {
      return res.status(400).json({ error: 'Label is required' });
    }

    if (!properties || typeof properties !== 'object') {
      return res.status(400).json({ error: 'Properties must be an object' });
    }

    const result = await graphDatabaseService.createNode(label, properties);

    res.status(201).json(result);
  } catch (error) {
    console.error('Create node error:', error);
    res.status(500).json({
      error: 'Failed to create node',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get a node by label and ID
 * GET /api/v1/graph/nodes/:label/:id
 */
const getNode = async (req, res) => {
  try {
    const { label, id } = req.params;

    const result = await graphDatabaseService.getNode(label, id);

    if (!result) {
      return res.status(404).json({ error: 'Node not found' });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Get node error:', error);
    res.status(500).json({
      error: 'Failed to get node',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete a node
 * DELETE /api/v1/graph/nodes/:label/:id
 */
const deleteNode = async (req, res) => {
  try {
    const { label, id } = req.params;
    const { detach } = req.query;

    const result = await graphDatabaseService.deleteNode(label, id, {
      detach: detach === 'true'
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Delete node error:', error);
    res.status(500).json({
      error: 'Failed to delete node',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Find nodes with filters
 * GET /api/v1/graph/nodes
 */
const findNodes = async (req, res) => {
  try {
    const { label, limit, skip, orderBy, order, ...criteria } = req.query;

    if (!label) {
      return res.status(400).json({ error: 'Label query parameter is required' });
    }

    const options = {};
    if (limit) options.limit = parseInt(limit);
    if (skip) options.skip = parseInt(skip);
    if (orderBy) options.orderBy = orderBy;
    if (order) options.order = order;

    const result = await graphDatabaseService.findNodes(label, criteria, options);

    res.status(200).json(result);
  } catch (error) {
    console.error('Find nodes error:', error);
    res.status(500).json({
      error: 'Failed to find nodes',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ==================== Relationship Operations ====================

/**
 * Create a relationship
 * POST /api/v1/graph/relationships
 */
const createRelationship = async (req, res) => {
  try {
    const { from, to, type, properties } = req.body;

    if (!from || !from.label || !from.id) {
      return res.status(400).json({ error: 'From node with label and id is required' });
    }

    if (!to || !to.label || !to.id) {
      return res.status(400).json({ error: 'To node with label and id is required' });
    }

    if (!type) {
      return res.status(400).json({ error: 'Relationship type is required' });
    }

    const result = await graphDatabaseService.createRelationship(from, to, type, properties || {});

    res.status(201).json(result);
  } catch (error) {
    console.error('Create relationship error:', error);
    res.status(500).json({
      error: 'Failed to create relationship',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get a relationship by ID
 * GET /api/v1/graph/relationships/:id
 */
const getRelationship = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await graphDatabaseService.getRelationship(parseInt(id));

    if (!result) {
      return res.status(404).json({ error: 'Relationship not found' });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Get relationship error:', error);
    res.status(500).json({
      error: 'Failed to get relationship',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete a relationship
 * DELETE /api/v1/graph/relationships/:id
 */
const deleteRelationship = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await graphDatabaseService.deleteRelationship(parseInt(id));

    res.status(200).json(result);
  } catch (error) {
    console.error('Delete relationship error:', error);
    res.status(500).json({
      error: 'Failed to delete relationship',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ==================== Path Finding ====================

/**
 * Find shortest path between nodes
 * POST /api/v1/graph/paths/shortest
 */
const findShortestPath = async (req, res) => {
  try {
    const { from, to, maxDepth, relationshipTypes } = req.body;

    if (!from || !from.label || !from.id) {
      return res.status(400).json({ error: 'From node with label and id is required' });
    }

    if (!to || !to.label || !to.id) {
      return res.status(400).json({ error: 'To node with label and id is required' });
    }

    const result = await graphDatabaseService.findShortestPath(from, to, {
      maxDepth,
      relationshipTypes
    });

    if (!result) {
      return res.status(404).json({ error: 'No path found between the specified nodes' });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Find shortest path error:', error);
    res.status(500).json({
      error: 'Failed to find shortest path',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Find all paths between nodes
 * POST /api/v1/graph/paths/all
 */
const findAllPaths = async (req, res) => {
  try {
    const { from, to, maxDepth, relationshipTypes } = req.body;

    if (!from || !to) {
      return res.status(400).json({ error: 'Both from and to nodes are required' });
    }

    const result = await graphDatabaseService.findAllPaths(from, to, {
      maxDepth,
      relationshipTypes
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Find all paths error:', error);
    res.status(500).json({
      error: 'Failed to find paths',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get related nodes
 * GET /api/v1/graph/nodes/:label/:id/related
 */
const getRelatedNodes = async (req, res) => {
  try {
    const { label, id } = req.params;
    const { relationshipType, direction, relatedLabel, depth } = req.query;

    const result = await graphDatabaseService.getRelatedNodes(
      { label, id },
      {
        relationshipType,
        direction,
        relatedLabel,
        depth: depth ? parseInt(depth) : undefined
      }
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('Get related nodes error:', error);
    res.status(500).json({
      error: 'Failed to get related nodes',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ==================== Cypher Query ====================

/**
 * Execute a Cypher query
 * POST /api/v1/graph/query
 */
const runCypherQuery = async (req, res) => {
  try {
    const { query, params } = req.body;

    if (!query || query.trim() === '') {
      return res.status(400).json({ error: 'Query is required' });
    }

    const result = await graphDatabaseService.runCypherQuery(query, params || {});

    res.status(200).json({
      records: result.records.map(r => r.toObject ? r.toObject() : r),
      executionTime: result.executionTime
    });
  } catch (error) {
    console.error('Cypher query error:', error);
    res.status(500).json({
      error: 'Failed to execute query',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ==================== Compliance Graph ====================

/**
 * Track compliance trail
 * POST /api/v1/graph/compliance/trail
 */
const trackComplianceTrail = async (req, res) => {
  try {
    const { documentId, action, actorId, actorRole, timestamp, companyId, previousActionId } = req.body;

    if (!documentId) {
      return res.status(400).json({ error: 'Document ID is required' });
    }

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    if (!actorId) {
      return res.status(400).json({ error: 'Actor ID is required' });
    }

    const result = await complianceGraphService.trackComplianceTrail({
      documentId,
      action,
      actorId,
      actorRole,
      timestamp: timestamp ? new Date(timestamp) : undefined,
      companyId,
      previousActionId
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Track compliance trail error:', error);
    res.status(500).json({
      error: 'Failed to track compliance trail',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get compliance trail
 * GET /api/v1/graph/compliance/trail/:documentId
 */
const getComplianceTrail = async (req, res) => {
  try {
    const { documentId } = req.params;

    const result = await complianceGraphService.getComplianceTrail(documentId);

    res.status(200).json(result);
  } catch (error) {
    console.error('Get compliance trail error:', error);
    res.status(500).json({
      error: 'Failed to get compliance trail',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get audit path
 * GET /api/v1/graph/compliance/audit/:documentId
 */
const getAuditPath = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { fromAction, toAction, maxDepth } = req.query;

    const result = await complianceGraphService.getAuditPath(documentId, {
      fromAction,
      toAction,
      maxDepth: maxDepth ? parseInt(maxDepth) : undefined
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Get audit path error:', error);
    res.status(500).json({
      error: 'Failed to get audit path',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Find compliance gaps
 * GET /api/v1/graph/compliance/gaps/:documentId
 */
const findComplianceGaps = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { requiredApprovals, requiredSignatories, checkExpiration, expirationDays, documentType } = req.query;

    const options = {};
    if (requiredApprovals) {
      options.requiredApprovals = requiredApprovals.split(',');
    }
    if (requiredSignatories) {
      options.requiredSignatories = requiredSignatories.split(',');
    }
    if (checkExpiration) {
      options.checkExpiration = checkExpiration === 'true';
    }
    if (expirationDays) {
      options.expirationDays = parseInt(expirationDays);
    }
    if (documentType) {
      options.documentType = documentType;
    }

    const result = await complianceGraphService.findComplianceGaps(documentId, options);

    res.status(200).json(result);
  } catch (error) {
    console.error('Find compliance gaps error:', error);
    res.status(500).json({
      error: 'Failed to find compliance gaps',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Generate compliance report
 * GET /api/v1/graph/compliance/report/:companyId
 */
const generateComplianceReport = async (req, res) => {
  try {
    const { companyId } = req.params;
    const {
      startDate,
      endDate,
      documentType,
      includeTimeline,
      includeRiskAssessment,
      includeApprovalAnalysis
    } = req.query;

    const options = {};
    if (startDate) options.startDate = new Date(startDate);
    if (endDate) options.endDate = new Date(endDate);
    if (documentType) options.documentType = documentType;
    if (includeTimeline) options.includeTimeline = includeTimeline === 'true';
    if (includeRiskAssessment) options.includeRiskAssessment = includeRiskAssessment === 'true';
    if (includeApprovalAnalysis) options.includeApprovalAnalysis = includeApprovalAnalysis === 'true';

    const result = await complianceGraphService.generateComplianceReport(companyId, options);

    res.status(200).json(result);
  } catch (error) {
    console.error('Generate compliance report error:', error);
    res.status(500).json({
      error: 'Failed to generate compliance report',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ==================== Network Analysis ====================

/**
 * Calculate centrality
 * POST /api/v1/graph/analysis/centrality
 */
const calculateCentrality = async (req, res) => {
  try {
    const { type, label, relationshipType, limit, dampingFactor } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'Centrality type is required' });
    }

    const result = await networkAnalysisService.calculateCentrality({
      type,
      label,
      relationshipType,
      limit,
      dampingFactor
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Calculate centrality error:', error);
    const statusCode = error.message.includes('Invalid centrality type') ? 400 : 500;
    res.status(statusCode).json({
      error: 'Failed to calculate centrality',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Detect communities
 * POST /api/v1/graph/analysis/communities
 */
const detectCommunities = async (req, res) => {
  try {
    const { algorithm, nodeLabel, relationshipType, calculateModularity } = req.body;

    const result = await networkAnalysisService.detectCommunities({
      algorithm: algorithm || 'louvain',
      nodeLabel,
      relationshipType,
      calculateModularity
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Detect communities error:', error);
    res.status(500).json({
      error: 'Failed to detect communities',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Analyze influence
 * POST /api/v1/graph/analysis/influence
 */
const analyzeInfluence = async (req, res) => {
  try {
    const {
      label,
      relationshipType,
      metrics,
      includeInfluencePaths,
      sourceNode,
      calculateDecay,
      decayFactor,
      limit
    } = req.body;

    const result = await networkAnalysisService.analyzeInfluence({
      label,
      relationshipType,
      metrics,
      includeInfluencePaths,
      sourceNode,
      calculateDecay,
      decayFactor,
      limit
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Analyze influence error:', error);
    res.status(500).json({
      error: 'Failed to analyze influence',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get network statistics
 * GET /api/v1/graph/analysis/stats
 */
const getNetworkStats = async (req, res) => {
  try {
    const {
      includeDegreeDistribution,
      includeClusteringCoefficient,
      calculateDiameter,
      includeRelationshipTypes,
      byLabel
    } = req.query;

    const result = await networkAnalysisService.getNetworkStats({
      includeDegreeDistribution: includeDegreeDistribution === 'true',
      includeClusteringCoefficient: includeClusteringCoefficient === 'true',
      calculateDiameter: calculateDiameter === 'true',
      includeRelationshipTypes: includeRelationshipTypes === 'true',
      byLabel: byLabel === 'true'
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Get network stats error:', error);
    res.status(500).json({
      error: 'Failed to get network statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get node centrality
 * GET /api/v1/graph/analysis/nodes/:label/:id/centrality
 */
const getNodeCentrality = async (req, res) => {
  try {
    const { label, id } = req.params;

    const result = await networkAnalysisService.getNodeCentrality(label, id);

    if (!result) {
      return res.status(404).json({ error: 'Node not found' });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Get node centrality error:', error);
    res.status(500).json({
      error: 'Failed to get node centrality',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get node influence score
 * GET /api/v1/graph/analysis/nodes/:label/:id/influence
 */
const getInfluenceScore = async (req, res) => {
  try {
    const { label, id } = req.params;

    const result = await networkAnalysisService.getInfluenceScore(label, id);

    if (!result) {
      return res.status(404).json({ error: 'Node not found' });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Get influence score error:', error);
    res.status(500).json({
      error: 'Failed to get influence score',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get node community
 * GET /api/v1/graph/analysis/nodes/:label/:id/community
 */
const getNodeCommunity = async (req, res) => {
  try {
    const { label, id } = req.params;

    const result = await networkAnalysisService.getNodeCommunity(label, id);

    res.status(200).json(result);
  } catch (error) {
    console.error('Get node community error:', error);
    res.status(500).json({
      error: 'Failed to get node community',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get visualization data
 * GET /api/v1/graph/analysis/visualization
 */
const getVisualizationData = async (req, res) => {
  try {
    const { label, relationshipType, limit } = req.query;

    const result = await networkAnalysisService.getVisualizationData({
      label,
      relationshipType,
      limit: limit ? parseInt(limit) : undefined
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Get visualization data error:', error);
    res.status(500).json({
      error: 'Failed to get visualization data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ==================== Batch Operations ====================

/**
 * Batch create nodes
 * POST /api/v1/graph/nodes/batch
 */
const batchCreateNodes = async (req, res) => {
  try {
    const { label, nodes } = req.body;

    if (!label) {
      return res.status(400).json({ error: 'Label is required' });
    }

    if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
      return res.status(400).json({ error: 'Nodes array is required and cannot be empty' });
    }

    const result = await graphDatabaseService.batchCreateNodes(label, nodes);

    res.status(201).json(result);
  } catch (error) {
    console.error('Batch create nodes error:', error);
    res.status(500).json({
      error: 'Failed to batch create nodes',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Batch create relationships
 * POST /api/v1/graph/relationships/batch
 */
const batchCreateRelationships = async (req, res) => {
  try {
    const { relationships } = req.body;

    if (!relationships || !Array.isArray(relationships) || relationships.length === 0) {
      return res.status(400).json({ error: 'Relationships array is required and cannot be empty' });
    }

    const result = await graphDatabaseService.batchCreateRelationships(relationships);

    res.status(201).json(result);
  } catch (error) {
    console.error('Batch create relationships error:', error);
    res.status(500).json({
      error: 'Failed to batch create relationships',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ==================== Graph Statistics ====================

/**
 * Get graph statistics
 * GET /api/v1/graph/stats
 */
const getGraphStats = async (req, res) => {
  try {
    const result = await graphDatabaseService.getGraphStats();

    res.status(200).json(result);
  } catch (error) {
    console.error('Get graph stats error:', error);
    res.status(500).json({
      error: 'Failed to get graph statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  // Node operations
  createNode,
  getNode,
  deleteNode,
  findNodes,
  // Relationship operations
  createRelationship,
  getRelationship,
  deleteRelationship,
  // Path finding
  findShortestPath,
  findAllPaths,
  getRelatedNodes,
  // Cypher query
  runCypherQuery,
  // Compliance graph
  trackComplianceTrail,
  getComplianceTrail,
  getAuditPath,
  findComplianceGaps,
  generateComplianceReport,
  // Network analysis
  calculateCentrality,
  detectCommunities,
  analyzeInfluence,
  getNetworkStats,
  getNodeCentrality,
  getInfluenceScore,
  getNodeCommunity,
  getVisualizationData,
  // Batch operations
  batchCreateNodes,
  batchCreateRelationships,
  // Graph statistics
  getGraphStats
};

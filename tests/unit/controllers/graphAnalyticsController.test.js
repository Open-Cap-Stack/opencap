/**
 * Graph Analytics Controller Test Suite
 *
 * [Feature] Issue #49: Complete Graph Database (Neo4j) Integration
 * Comprehensive test coverage for graph analytics REST API endpoints
 */

// Mock neo4j-driver before any requires that trigger graphDatabaseService loading
// virtual: true since the package was removed from dependencies
jest.mock('neo4j-driver', () => ({
  driver: jest.fn(() => ({
    session: jest.fn(() => ({
      run: jest.fn(),
      close: jest.fn()
    })),
    close: jest.fn(),
    verifyConnectivity: jest.fn()
  })),
  auth: { basic: jest.fn() },
  int: jest.fn(v => v)
}), { virtual: true });

const graphAnalyticsController = require('../../../controllers/graphAnalyticsController');
const graphDatabaseService = require('../../../services/graphDatabaseService');
const complianceGraphService = require('../../../services/complianceGraphService');
const networkAnalysisService = require('../../../services/networkAnalysisService');

// Mock the services
jest.mock('../../../services/graphDatabaseService');
jest.mock('../../../services/complianceGraphService');
jest.mock('../../../services/networkAnalysisService');

describe('Graph Analytics Controller', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      params: {},
      query: {},
      user: { id: 'USER001' }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  // ==================== Node Operations ====================

  describe('Node Operations', () => {
    describe('POST /api/v1/graph/nodes', () => {
      it('should create a new node', async () => {
        mockReq.body = {
          label: 'Company',
          properties: { id: 'COMP001', name: 'TechCorp' }
        };

        graphDatabaseService.createNode.mockResolvedValue({
          id: 1,
          labels: ['Company'],
          properties: { id: 'COMP001', name: 'TechCorp' }
        });

        await graphAnalyticsController.createNode(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            labels: ['Company'],
            properties: expect.objectContaining({ id: 'COMP001' })
          })
        );
      });

      it('should return 400 for missing label', async () => {
        mockReq.body = { properties: { name: 'Test' } };

        await graphAnalyticsController.createNode(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ error: 'Label is required' })
        );
      });

      it('should return 500 on service error', async () => {
        mockReq.body = { label: 'Company', properties: { id: 'TEST' } };
        graphDatabaseService.createNode.mockRejectedValue(new Error('Database error'));

        await graphAnalyticsController.createNode(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
      });
    });

    describe('GET /api/v1/graph/nodes/:label/:id', () => {
      it('should get a node by label and ID', async () => {
        mockReq.params = { label: 'Company', id: 'COMP001' };

        graphDatabaseService.getNode.mockResolvedValue({
          id: 1,
          labels: ['Company'],
          properties: { id: 'COMP001', name: 'TechCorp' }
        });

        await graphAnalyticsController.getNode(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            properties: expect.objectContaining({ id: 'COMP001' })
          })
        );
      });

      it('should return 404 for non-existent node', async () => {
        mockReq.params = { label: 'Company', id: 'NONEXISTENT' };
        graphDatabaseService.getNode.mockResolvedValue(null);

        await graphAnalyticsController.getNode(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
      });
    });

    describe('DELETE /api/v1/graph/nodes/:label/:id', () => {
      it('should delete a node', async () => {
        mockReq.params = { label: 'Company', id: 'COMP001' };
        mockReq.query = { detach: 'true' };

        graphDatabaseService.deleteNode.mockResolvedValue({ deleted: true });

        await graphAnalyticsController.deleteNode(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ deleted: true })
        );
      });
    });

    describe('GET /api/v1/graph/nodes', () => {
      it('should find nodes with filters', async () => {
        mockReq.query = { label: 'Company', industry: 'Tech', limit: '10' };

        graphDatabaseService.findNodes.mockResolvedValue([
          { id: 1, properties: { id: 'COMP001' } },
          { id: 2, properties: { id: 'COMP002' } }
        ]);

        await graphAnalyticsController.findNodes(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(expect.any(Array));
      });
    });
  });

  // ==================== Relationship Operations ====================

  describe('Relationship Operations', () => {
    describe('POST /api/v1/graph/relationships', () => {
      it('should create a relationship', async () => {
        mockReq.body = {
          from: { label: 'Investor', id: 'INV001' },
          to: { label: 'Company', id: 'COMP001' },
          type: 'INVESTED_IN',
          properties: { amount: 1000000 }
        };

        graphDatabaseService.createRelationship.mockResolvedValue({
          id: 100,
          type: 'INVESTED_IN',
          properties: { amount: 1000000 }
        });

        await graphAnalyticsController.createRelationship(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'INVESTED_IN' })
        );
      });

      it('should return 400 for missing from node', async () => {
        mockReq.body = {
          to: { label: 'Company', id: 'COMP001' },
          type: 'INVESTED_IN'
        };

        await graphAnalyticsController.createRelationship(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });
    });

    describe('GET /api/v1/graph/relationships/:id', () => {
      it('should get a relationship by ID', async () => {
        mockReq.params = { id: '100' };

        graphDatabaseService.getRelationship.mockResolvedValue({
          id: 100,
          type: 'INVESTED_IN',
          properties: { amount: 1000000 }
        });

        await graphAnalyticsController.getRelationship(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
      });

      it('should return 404 for non-existent relationship', async () => {
        mockReq.params = { id: '999' };
        graphDatabaseService.getRelationship.mockResolvedValue(null);

        await graphAnalyticsController.getRelationship(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
      });
    });
  });

  // ==================== Path Finding ====================

  describe('Path Finding', () => {
    describe('POST /api/v1/graph/paths/shortest', () => {
      it('should find shortest path', async () => {
        mockReq.body = {
          from: { label: 'Stakeholder', id: 'SH001' },
          to: { label: 'Document', id: 'DOC001' },
          maxDepth: 5
        };

        graphDatabaseService.findShortestPath.mockResolvedValue({
          start: { properties: { id: 'SH001' } },
          end: { properties: { id: 'DOC001' } },
          length: 3,
          segments: []
        });

        await graphAnalyticsController.findShortestPath(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ length: 3 })
        );
      });

      it('should return 404 when no path exists', async () => {
        mockReq.body = {
          from: { label: 'Stakeholder', id: 'SH001' },
          to: { label: 'Document', id: 'DOC999' }
        };

        graphDatabaseService.findShortestPath.mockResolvedValue(null);

        await graphAnalyticsController.findShortestPath(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
      });
    });

    describe('POST /api/v1/graph/paths/all', () => {
      it('should find all paths', async () => {
        mockReq.body = {
          from: { label: 'Stakeholder', id: 'SH001' },
          to: { label: 'Document', id: 'DOC001' }
        };

        graphDatabaseService.findAllPaths.mockResolvedValue([
          { length: 2 },
          { length: 3 }
        ]);

        await graphAnalyticsController.findAllPaths(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(expect.any(Array));
      });
    });

    describe('GET /api/v1/graph/nodes/:label/:id/related', () => {
      it('should get related nodes', async () => {
        mockReq.params = { label: 'Investor', id: 'INV001' };
        mockReq.query = { relationshipType: 'INVESTED_IN', depth: '2' };

        graphDatabaseService.getRelatedNodes.mockResolvedValue([
          { node: { properties: { id: 'COMP001' } }, relationship: { type: 'INVESTED_IN' } }
        ]);

        await graphAnalyticsController.getRelatedNodes(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
      });
    });
  });

  // ==================== Cypher Query ====================

  describe('Cypher Query Execution', () => {
    describe('POST /api/v1/graph/query', () => {
      it('should execute a Cypher query', async () => {
        mockReq.body = {
          query: 'MATCH (n:Company) RETURN n LIMIT 10',
          params: {}
        };

        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [{ get: () => ({ id: 'COMP001' }) }],
          executionTime: 15
        });

        await graphAnalyticsController.runCypherQuery(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
      });

      it('should return 400 for empty query', async () => {
        mockReq.body = { query: '' };

        await graphAnalyticsController.runCypherQuery(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });
    });
  });

  // ==================== Compliance Graph ====================

  describe('Compliance Graph Operations', () => {
    describe('POST /api/v1/graph/compliance/trail', () => {
      it('should track compliance trail', async () => {
        mockReq.body = {
          documentId: 'DOC001',
          action: 'APPROVED',
          actorId: 'USER001',
          actorRole: 'CFO'
        };

        complianceGraphService.trackComplianceTrail.mockResolvedValue({
          success: true,
          trailId: 'TRAIL001'
        });

        await graphAnalyticsController.trackComplianceTrail(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(201);
      });

      it('should return 400 for missing document ID', async () => {
        mockReq.body = { action: 'APPROVED' };

        await graphAnalyticsController.trackComplianceTrail(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });
    });

    describe('GET /api/v1/graph/compliance/trail/:documentId', () => {
      it('should get compliance trail', async () => {
        mockReq.params = { documentId: 'DOC001' };

        complianceGraphService.getComplianceTrail.mockResolvedValue({
          documentId: 'DOC001',
          trail: [{ action: 'CREATED' }, { action: 'APPROVED' }]
        });

        await graphAnalyticsController.getComplianceTrail(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
      });
    });

    describe('GET /api/v1/graph/compliance/audit/:documentId', () => {
      it('should get audit path', async () => {
        mockReq.params = { documentId: 'DOC001' };

        complianceGraphService.getAuditPath.mockResolvedValue({
          documentId: 'DOC001',
          path: { length: 3 },
          complete: true
        });

        await graphAnalyticsController.getAuditPath(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
      });
    });

    describe('GET /api/v1/graph/compliance/gaps/:documentId', () => {
      it('should find compliance gaps', async () => {
        mockReq.params = { documentId: 'DOC001' };
        mockReq.query = { requiredApprovals: 'LEGAL_REVIEW,CFO_APPROVAL' };

        complianceGraphService.findComplianceGaps.mockResolvedValue({
          documentId: 'DOC001',
          gaps: [],
          compliant: true
        });

        await graphAnalyticsController.findComplianceGaps(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
      });
    });

    describe('GET /api/v1/graph/compliance/report/:companyId', () => {
      it('should generate compliance report', async () => {
        mockReq.params = { companyId: 'COMP001' };
        mockReq.query = { startDate: '2024-01-01', endDate: '2024-12-31' };

        complianceGraphService.generateComplianceReport.mockResolvedValue({
          companyId: 'COMP001',
          statistics: { totalDocuments: 100 }
        });

        await graphAnalyticsController.generateComplianceReport(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
      });
    });
  });

  // ==================== Network Analysis ====================

  describe('Network Analysis Operations', () => {
    describe('POST /api/v1/graph/analysis/centrality', () => {
      it('should calculate centrality', async () => {
        mockReq.body = {
          type: 'degree',
          label: 'Investor',
          limit: 10
        };

        networkAnalysisService.calculateCentrality.mockResolvedValue({
          type: 'degree',
          nodes: [{ node: { id: 'INV001' }, centrality: 0.85 }]
        });

        await graphAnalyticsController.calculateCentrality(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
      });

      it('should return 400 for invalid centrality type', async () => {
        mockReq.body = { type: 'invalid' };

        networkAnalysisService.calculateCentrality.mockRejectedValue(
          new Error('Invalid centrality type')
        );

        await graphAnalyticsController.calculateCentrality(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });
    });

    describe('POST /api/v1/graph/analysis/communities', () => {
      it('should detect communities', async () => {
        mockReq.body = { algorithm: 'louvain' };

        networkAnalysisService.detectCommunities.mockResolvedValue({
          algorithm: 'louvain',
          communities: [{ communityId: 1, size: 10 }]
        });

        await graphAnalyticsController.detectCommunities(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
      });
    });

    describe('POST /api/v1/graph/analysis/influence', () => {
      it('should analyze influence', async () => {
        mockReq.body = { label: 'Investor' };

        networkAnalysisService.analyzeInfluence.mockResolvedValue({
          influentialNodes: [{ node: { id: 'INV001' }, influenceScore: 0.92 }]
        });

        await graphAnalyticsController.analyzeInfluence(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
      });
    });

    describe('GET /api/v1/graph/analysis/stats', () => {
      it('should get network statistics', async () => {
        mockReq.query = { includeDegreeDistribution: 'true' };

        networkAnalysisService.getNetworkStats.mockResolvedValue({
          nodeCount: 500,
          relationshipCount: 1200,
          density: 0.0048
        });

        await graphAnalyticsController.getNetworkStats(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
      });
    });

    describe('GET /api/v1/graph/analysis/nodes/:label/:id/centrality', () => {
      it('should get node centrality', async () => {
        mockReq.params = { label: 'Investor', id: 'INV001' };

        networkAnalysisService.getNodeCentrality.mockResolvedValue({
          nodeId: 'INV001',
          degree: 15,
          inDegree: 8,
          outDegree: 7
        });

        await graphAnalyticsController.getNodeCentrality(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
      });

      it('should return 404 for non-existent node', async () => {
        mockReq.params = { label: 'Investor', id: 'NONEXISTENT' };

        networkAnalysisService.getNodeCentrality.mockResolvedValue(null);

        await graphAnalyticsController.getNodeCentrality(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
      });
    });

    describe('GET /api/v1/graph/analysis/nodes/:label/:id/influence', () => {
      it('should get node influence score', async () => {
        mockReq.params = { label: 'Investor', id: 'INV001' };

        networkAnalysisService.getInfluenceScore.mockResolvedValue({
          nodeId: 'INV001',
          score: 0.85,
          rank: 3
        });

        await graphAnalyticsController.getInfluenceScore(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
      });
    });

    describe('GET /api/v1/graph/analysis/nodes/:label/:id/community', () => {
      it('should get node community', async () => {
        mockReq.params = { label: 'Company', id: 'COMP001' };

        networkAnalysisService.getNodeCommunity.mockResolvedValue({
          nodeId: 'COMP001',
          communityId: 5,
          communitySize: 12
        });

        await graphAnalyticsController.getNodeCommunity(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
      });
    });

    describe('GET /api/v1/graph/analysis/visualization', () => {
      it('should get visualization data', async () => {
        mockReq.query = { label: 'Company', limit: '100' };

        networkAnalysisService.getVisualizationData.mockResolvedValue({
          nodes: [{ id: 'COMP001' }],
          edges: [{ source: 'COMP001', target: 'INV001' }]
        });

        await graphAnalyticsController.getVisualizationData(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
      });
    });
  });

  // ==================== Batch Operations ====================

  describe('Batch Operations', () => {
    describe('POST /api/v1/graph/nodes/batch', () => {
      it('should batch create nodes', async () => {
        mockReq.body = {
          label: 'Company',
          nodes: [
            { id: 'COMP001', name: 'Company 1' },
            { id: 'COMP002', name: 'Company 2' }
          ]
        };

        graphDatabaseService.batchCreateNodes.mockResolvedValue([
          { id: 1, properties: { id: 'COMP001' } },
          { id: 2, properties: { id: 'COMP002' } }
        ]);

        await graphAnalyticsController.batchCreateNodes(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(201);
      });
    });

    describe('POST /api/v1/graph/relationships/batch', () => {
      it('should batch create relationships', async () => {
        mockReq.body = {
          relationships: [
            { from: { label: 'Investor', id: 'INV001' }, to: { label: 'Company', id: 'COMP001' }, type: 'INVESTED_IN' }
          ]
        };

        graphDatabaseService.batchCreateRelationships.mockResolvedValue([
          { id: 100, type: 'INVESTED_IN' }
        ]);

        await graphAnalyticsController.batchCreateRelationships(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(201);
      });
    });
  });

  // ==================== Graph Statistics ====================

  describe('Graph Statistics', () => {
    describe('GET /api/v1/graph/stats', () => {
      it('should get graph statistics', async () => {
        graphDatabaseService.getGraphStats.mockResolvedValue({
          nodeCount: 500,
          relationshipCount: 1200,
          labelCounts: { Company: 100, Investor: 150 }
        });

        await graphAnalyticsController.getGraphStats(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ nodeCount: 500 })
        );
      });
    });
  });

  // ==================== Error Handling ====================

  describe('Error Handling', () => {
    it('should handle service errors with 500 status', async () => {
      mockReq.params = { documentId: 'DOC001' };

      complianceGraphService.getComplianceTrail.mockRejectedValue(
        new Error('Database connection failed')
      );

      await graphAnalyticsController.getComplianceTrail(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });

    it('should include error details in development mode', async () => {
      process.env.NODE_ENV = 'development';
      mockReq.params = { label: 'Company', id: 'TEST' };

      graphDatabaseService.getNode.mockRejectedValue(new Error('Test error'));

      await graphAnalyticsController.getNode(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ details: 'Test error' })
      );

      process.env.NODE_ENV = 'test';
    });
  });

  // ==================== Input Validation ====================

  describe('Input Validation', () => {
    it('should validate required fields for node creation', async () => {
      mockReq.body = {};

      await graphAnalyticsController.createNode(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should validate required fields for relationship creation', async () => {
      mockReq.body = { from: { label: 'Test' } };

      await graphAnalyticsController.createRelationship(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should validate required fields for path finding', async () => {
      mockReq.body = { from: { label: 'Test' } };

      await graphAnalyticsController.findShortestPath(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should validate compliance trail data', async () => {
      mockReq.body = { documentId: 'DOC001' };

      await graphAnalyticsController.trackComplianceTrail(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});

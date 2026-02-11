/**
 * Graph Database Service Test Suite
 *
 * [Feature] Issue #49: Complete Graph Database (Neo4j) Integration
 * Comprehensive test coverage for graph database operations including:
 * - Node creation and management
 * - Relationship creation and management
 * - Path finding algorithms
 * - Cypher query execution
 */

const graphDatabaseService = require('../../../services/graphDatabaseService');
const neo4j = require('neo4j-driver');

// Mock neo4j-driver (virtual: true since the package was removed from dependencies)
jest.mock('neo4j-driver', () => {
  const mockSession = {
    run: jest.fn(),
    close: jest.fn()
  };

  const mockDriver = {
    session: jest.fn(() => mockSession),
    close: jest.fn(),
    verifyConnectivity: jest.fn()
  };

  return {
    driver: jest.fn(() => mockDriver),
    auth: {
      basic: jest.fn()
    },
    int: jest.fn((val) => ({ toNumber: () => val, low: val, high: 0 })),
    isInt: jest.fn((val) => val && typeof val.toNumber === 'function')
  };
}, { virtual: true });

describe('Graph Database Service', () => {
  let mockDriver;
  let mockSession;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get the mocked driver and session
    mockDriver = neo4j.driver();
    mockSession = mockDriver.session();

    // Reset service state for each test
    graphDatabaseService._driver = null;
    graphDatabaseService._initialized = false;
  });

  afterEach(async () => {
    // Clean up after each test
    if (graphDatabaseService._driver) {
      await graphDatabaseService.close();
    }
  });

  describe('Connection Management', () => {
    describe('initialize', () => {
      it('should initialize connection with default configuration', async () => {
        mockDriver.verifyConnectivity.mockResolvedValue();

        await graphDatabaseService.initialize();

        expect(neo4j.driver).toHaveBeenCalled();
        expect(mockDriver.verifyConnectivity).toHaveBeenCalled();
      });

      it('should initialize connection with custom configuration', async () => {
        mockDriver.verifyConnectivity.mockResolvedValue();

        const config = {
          uri: 'bolt://custom-host:7687',
          username: 'custom-user',
          password: 'custom-password'
        };

        await graphDatabaseService.initialize(config);

        expect(neo4j.driver).toHaveBeenCalledWith(
          config.uri,
          neo4j.auth.basic(config.username, config.password),
          expect.any(Object)
        );
      });

      it('should throw error if connection fails', async () => {
        mockDriver.verifyConnectivity.mockRejectedValue(new Error('Connection failed'));

        await expect(graphDatabaseService.initialize())
          .rejects.toThrow('Failed to initialize Neo4j connection');
      });

      it('should not reinitialize if already initialized', async () => {
        mockDriver.verifyConnectivity.mockResolvedValue();

        // Clear mocks after setup to track only initialize calls
        jest.clearAllMocks();

        await graphDatabaseService.initialize();
        await graphDatabaseService.initialize();

        // Driver should only be created once despite calling initialize twice
        expect(neo4j.driver).toHaveBeenCalledTimes(1);
      });
    });

    describe('close', () => {
      it('should close the driver connection', async () => {
        mockDriver.verifyConnectivity.mockResolvedValue();
        mockDriver.close.mockResolvedValue();

        await graphDatabaseService.initialize();
        await graphDatabaseService.close();

        expect(mockDriver.close).toHaveBeenCalled();
      });

      it('should handle close when not initialized', async () => {
        await expect(graphDatabaseService.close()).resolves.not.toThrow();
      });
    });

    describe('getSession', () => {
      it('should return a new session', async () => {
        mockDriver.verifyConnectivity.mockResolvedValue();
        await graphDatabaseService.initialize();

        const session = graphDatabaseService.getSession();

        expect(mockDriver.session).toHaveBeenCalled();
        expect(session).toBeDefined();
      });

      it('should throw error if not initialized', () => {
        expect(() => graphDatabaseService.getSession())
          .toThrow('Graph database not initialized');
      });
    });
  });

  describe('Node Operations', () => {
    beforeEach(async () => {
      mockDriver.verifyConnectivity.mockResolvedValue();
      await graphDatabaseService.initialize();
    });

    describe('createNode', () => {
      it('should create a node with label and properties', async () => {
        const mockNode = {
          identity: { toNumber: () => 1 },
          labels: ['Company'],
          properties: { id: 'COMP001', name: 'TechCorp' }
        };

        mockSession.run.mockResolvedValue({
          records: [{
            get: jest.fn(() => mockNode)
          }]
        });

        const result = await graphDatabaseService.createNode('Company', {
          id: 'COMP001',
          name: 'TechCorp'
        });

        expect(mockSession.run).toHaveBeenCalledWith(
          expect.stringContaining('CREATE (n:Company'),
          expect.objectContaining({ properties: { id: 'COMP001', name: 'TechCorp' } })
        );
        expect(result).toBeDefined();
        expect(result.labels).toContain('Company');
        expect(result.properties.id).toBe('COMP001');
      });

      it('should create a node with multiple labels', async () => {
        const mockNode = {
          identity: { toNumber: () => 2 },
          labels: ['Person', 'Employee'],
          properties: { id: 'EMP001', name: 'John Doe' }
        };

        mockSession.run.mockResolvedValue({
          records: [{
            get: jest.fn(() => mockNode)
          }]
        });

        const result = await graphDatabaseService.createNode(['Person', 'Employee'], {
          id: 'EMP001',
          name: 'John Doe'
        });

        expect(mockSession.run).toHaveBeenCalledWith(
          expect.stringContaining('CREATE (n:Person:Employee'),
          expect.any(Object)
        );
        expect(result.labels).toContain('Person');
        expect(result.labels).toContain('Employee');
      });

      it('should throw error for invalid label', async () => {
        await expect(graphDatabaseService.createNode(null, { name: 'Test' }))
          .rejects.toThrow('Label is required');
      });

      it('should throw error for invalid properties', async () => {
        await expect(graphDatabaseService.createNode('Company', null))
          .rejects.toThrow('Properties must be an object');
      });

      it('should handle database errors gracefully', async () => {
        mockSession.run.mockRejectedValue(new Error('Database error'));

        await expect(graphDatabaseService.createNode('Company', { id: 'TEST' }))
          .rejects.toThrow('Failed to create node');
      });
    });

    describe('getNode', () => {
      it('should retrieve a node by label and ID', async () => {
        const mockNode = {
          identity: { toNumber: () => 1 },
          labels: ['Company'],
          properties: { id: 'COMP001', name: 'TechCorp' }
        };

        mockSession.run.mockResolvedValue({
          records: [{
            get: jest.fn(() => mockNode)
          }]
        });

        const result = await graphDatabaseService.getNode('Company', 'COMP001');

        expect(mockSession.run).toHaveBeenCalledWith(
          expect.stringContaining('MATCH (n:Company'),
          expect.objectContaining({ id: 'COMP001' })
        );
        expect(result).toBeDefined();
        expect(result.properties.id).toBe('COMP001');
      });

      it('should return null for non-existent node', async () => {
        mockSession.run.mockResolvedValue({ records: [] });

        const result = await graphDatabaseService.getNode('Company', 'NONEXISTENT');

        expect(result).toBeNull();
      });
    });

    describe('updateNode', () => {
      it('should update node properties', async () => {
        const mockNode = {
          identity: { toNumber: () => 1 },
          labels: ['Company'],
          properties: { id: 'COMP001', name: 'UpdatedCorp', revenue: 1000000 }
        };

        mockSession.run.mockResolvedValue({
          records: [{
            get: jest.fn(() => mockNode)
          }]
        });

        const result = await graphDatabaseService.updateNode('Company', 'COMP001', {
          name: 'UpdatedCorp',
          revenue: 1000000
        });

        expect(mockSession.run).toHaveBeenCalledWith(
          expect.stringContaining('SET'),
          expect.any(Object)
        );
        expect(result.properties.name).toBe('UpdatedCorp');
      });

      it('should throw error for non-existent node', async () => {
        mockSession.run.mockResolvedValue({ records: [] });

        await expect(graphDatabaseService.updateNode('Company', 'NONEXISTENT', { name: 'Test' }))
          .rejects.toThrow('Node not found');
      });
    });

    describe('deleteNode', () => {
      it('should delete a node by label and ID', async () => {
        mockSession.run.mockResolvedValue({
          summary: { counters: { nodesDeleted: () => 1 } }
        });

        const result = await graphDatabaseService.deleteNode('Company', 'COMP001');

        expect(mockSession.run).toHaveBeenCalledWith(
          expect.stringContaining('DELETE'),
          expect.objectContaining({ id: 'COMP001' })
        );
        expect(result.deleted).toBe(true);
      });

      it('should handle delete with relationships option', async () => {
        mockSession.run.mockResolvedValue({
          summary: { counters: { nodesDeleted: () => 1, relationshipsDeleted: () => 3 } }
        });

        const result = await graphDatabaseService.deleteNode('Company', 'COMP001', { detach: true });

        expect(mockSession.run).toHaveBeenCalledWith(
          expect.stringContaining('DETACH DELETE'),
          expect.any(Object)
        );
        expect(result.deleted).toBe(true);
      });
    });

    describe('findNodes', () => {
      it('should find nodes matching criteria', async () => {
        const mockNodes = [
          { identity: { toNumber: () => 1 }, labels: ['Company'], properties: { id: 'COMP001', industry: 'Tech' } },
          { identity: { toNumber: () => 2 }, labels: ['Company'], properties: { id: 'COMP002', industry: 'Tech' } }
        ];

        mockSession.run.mockResolvedValue({
          records: mockNodes.map(node => ({
            get: jest.fn(() => node)
          }))
        });

        const result = await graphDatabaseService.findNodes('Company', { industry: 'Tech' });

        expect(result).toHaveLength(2);
        expect(result[0].properties.industry).toBe('Tech');
      });

      it('should support pagination', async () => {
        mockSession.run.mockResolvedValue({ records: [] });

        await graphDatabaseService.findNodes('Company', {}, { skip: 10, limit: 5 });

        expect(mockSession.run).toHaveBeenCalledWith(
          expect.stringContaining('SKIP'),
          expect.any(Object)
        );
        expect(mockSession.run).toHaveBeenCalledWith(
          expect.stringContaining('LIMIT'),
          expect.any(Object)
        );
      });

      it('should support sorting', async () => {
        mockSession.run.mockResolvedValue({ records: [] });

        await graphDatabaseService.findNodes('Company', {}, { orderBy: 'name', order: 'DESC' });

        expect(mockSession.run).toHaveBeenCalledWith(
          expect.stringContaining('ORDER BY'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Relationship Operations', () => {
    beforeEach(async () => {
      mockDriver.verifyConnectivity.mockResolvedValue();
      await graphDatabaseService.initialize();
    });

    describe('createRelationship', () => {
      it('should create a relationship between two nodes', async () => {
        const mockRelationship = {
          identity: { toNumber: () => 100 },
          type: 'INVESTED_IN',
          properties: { amount: 1000000, date: '2023-01-15' },
          start: { toNumber: () => 1 },
          end: { toNumber: () => 2 }
        };

        mockSession.run.mockResolvedValue({
          records: [{
            get: jest.fn(() => mockRelationship)
          }]
        });

        const result = await graphDatabaseService.createRelationship(
          { label: 'Investor', id: 'INV001' },
          { label: 'Company', id: 'COMP001' },
          'INVESTED_IN',
          { amount: 1000000, date: '2023-01-15' }
        );

        expect(mockSession.run).toHaveBeenCalledWith(
          expect.stringContaining('CREATE (a)-[r:INVESTED_IN'),
          expect.any(Object)
        );
        expect(result.type).toBe('INVESTED_IN');
        expect(result.properties.amount).toBe(1000000);
      });

      it('should create a relationship without properties', async () => {
        const mockRelationship = {
          identity: { toNumber: () => 101 },
          type: 'OWNS',
          properties: {},
          start: { toNumber: () => 1 },
          end: { toNumber: () => 3 }
        };

        mockSession.run.mockResolvedValue({
          records: [{
            get: jest.fn(() => mockRelationship)
          }]
        });

        const result = await graphDatabaseService.createRelationship(
          { label: 'Stakeholder', id: 'SH001' },
          { label: 'Share', id: 'SHARE001' },
          'OWNS'
        );

        expect(result.type).toBe('OWNS');
      });

      it('should throw error for missing from node', async () => {
        await expect(graphDatabaseService.createRelationship(
          null,
          { label: 'Company', id: 'COMP001' },
          'INVESTED_IN'
        )).rejects.toThrow('Both from and to nodes are required');
      });

      it('should throw error for missing relationship type', async () => {
        await expect(graphDatabaseService.createRelationship(
          { label: 'Investor', id: 'INV001' },
          { label: 'Company', id: 'COMP001' },
          null
        )).rejects.toThrow('Relationship type is required');
      });

      it('should handle database errors', async () => {
        mockSession.run.mockRejectedValue(new Error('Database error'));

        await expect(graphDatabaseService.createRelationship(
          { label: 'Investor', id: 'INV001' },
          { label: 'Company', id: 'COMP001' },
          'INVESTED_IN'
        )).rejects.toThrow('Failed to create relationship');
      });
    });

    describe('getRelationship', () => {
      it('should retrieve a relationship by ID', async () => {
        const mockRelationship = {
          identity: { toNumber: () => 100 },
          type: 'INVESTED_IN',
          properties: { amount: 1000000 }
        };

        mockSession.run.mockResolvedValue({
          records: [{
            get: jest.fn(() => mockRelationship)
          }]
        });

        const result = await graphDatabaseService.getRelationship(100);

        expect(result).toBeDefined();
        expect(result.type).toBe('INVESTED_IN');
      });

      it('should return null for non-existent relationship', async () => {
        mockSession.run.mockResolvedValue({ records: [] });

        const result = await graphDatabaseService.getRelationship(999);

        expect(result).toBeNull();
      });
    });

    describe('deleteRelationship', () => {
      it('should delete a relationship by ID', async () => {
        mockSession.run.mockResolvedValue({
          summary: { counters: { relationshipsDeleted: () => 1 } }
        });

        const result = await graphDatabaseService.deleteRelationship(100);

        expect(result.deleted).toBe(true);
      });
    });

    describe('findRelationships', () => {
      it('should find relationships between nodes', async () => {
        const mockRelationships = [
          { identity: { toNumber: () => 100 }, type: 'INVESTED_IN', properties: { amount: 1000000 } },
          { identity: { toNumber: () => 101 }, type: 'INVESTED_IN', properties: { amount: 2000000 } }
        ];

        mockSession.run.mockResolvedValue({
          records: mockRelationships.map(rel => ({
            get: jest.fn(() => rel)
          }))
        });

        const result = await graphDatabaseService.findRelationships(
          { label: 'Investor' },
          { label: 'Company' },
          'INVESTED_IN'
        );

        expect(result).toHaveLength(2);
      });
    });
  });

  describe('Path Finding', () => {
    beforeEach(async () => {
      mockDriver.verifyConnectivity.mockResolvedValue();
      await graphDatabaseService.initialize();
    });

    describe('findShortestPath', () => {
      it('should find shortest path between two nodes', async () => {
        const mockPath = {
          start: { identity: { toNumber: () => 1 }, labels: ['Stakeholder'], properties: { id: 'SH001' } },
          end: { identity: { toNumber: () => 5 }, labels: ['Document'], properties: { id: 'DOC001' } },
          segments: [
            {
              start: { identity: { toNumber: () => 1 } },
              relationship: { type: 'OWNS' },
              end: { identity: { toNumber: () => 2 } }
            },
            {
              start: { identity: { toNumber: () => 2 } },
              relationship: { type: 'RELATED_TO' },
              end: { identity: { toNumber: () => 5 } }
            }
          ],
          length: 2
        };

        mockSession.run.mockResolvedValue({
          records: [{
            get: jest.fn(() => mockPath)
          }]
        });

        const result = await graphDatabaseService.findShortestPath(
          { label: 'Stakeholder', id: 'SH001' },
          { label: 'Document', id: 'DOC001' }
        );

        expect(mockSession.run).toHaveBeenCalledWith(
          expect.stringContaining('shortestPath'),
          expect.any(Object)
        );
        expect(result).toBeDefined();
        expect(result.length).toBe(2);
      });

      it('should return null when no path exists', async () => {
        mockSession.run.mockResolvedValue({ records: [] });

        const result = await graphDatabaseService.findShortestPath(
          { label: 'Stakeholder', id: 'SH001' },
          { label: 'Document', id: 'DOC999' }
        );

        expect(result).toBeNull();
      });

      it('should support max depth parameter', async () => {
        mockSession.run.mockResolvedValue({ records: [] });

        await graphDatabaseService.findShortestPath(
          { label: 'Stakeholder', id: 'SH001' },
          { label: 'Document', id: 'DOC001' },
          { maxDepth: 5 }
        );

        expect(mockSession.run).toHaveBeenCalledWith(
          expect.stringContaining('*..5'),
          expect.any(Object)
        );
      });

      it('should support relationship type filter', async () => {
        mockSession.run.mockResolvedValue({ records: [] });

        await graphDatabaseService.findShortestPath(
          { label: 'Stakeholder', id: 'SH001' },
          { label: 'Document', id: 'DOC001' },
          { relationshipTypes: ['OWNS', 'APPROVED'] }
        );

        expect(mockSession.run).toHaveBeenCalledWith(
          expect.stringContaining('OWNS|APPROVED'),
          expect.any(Object)
        );
      });
    });

    describe('findAllPaths', () => {
      it('should find all paths between two nodes', async () => {
        const mockPaths = [
          { length: 2, segments: [] },
          { length: 3, segments: [] }
        ];

        mockSession.run.mockResolvedValue({
          records: mockPaths.map(path => ({
            get: jest.fn(() => path)
          }))
        });

        const result = await graphDatabaseService.findAllPaths(
          { label: 'Stakeholder', id: 'SH001' },
          { label: 'Document', id: 'DOC001' },
          { maxDepth: 5 }
        );

        expect(mockSession.run).toHaveBeenCalledWith(
          expect.stringContaining('allShortestPaths'),
          expect.any(Object)
        );
        expect(result).toHaveLength(2);
      });
    });
  });

  describe('Related Nodes', () => {
    beforeEach(async () => {
      mockDriver.verifyConnectivity.mockResolvedValue();
      await graphDatabaseService.initialize();
    });

    describe('getRelatedNodes', () => {
      it('should get all related nodes', async () => {
        const mockNodes = [
          { identity: { toNumber: () => 2 }, labels: ['Company'], properties: { id: 'COMP001' } },
          { identity: { toNumber: () => 3 }, labels: ['Company'], properties: { id: 'COMP002' } }
        ];

        mockSession.run.mockResolvedValue({
          records: mockNodes.map(node => ({
            get: jest.fn().mockImplementation((key) => {
              if (key === 'related') return node;
              if (key === 'rel') return { type: 'INVESTED_IN', properties: {} };
            })
          }))
        });

        const result = await graphDatabaseService.getRelatedNodes(
          { label: 'Investor', id: 'INV001' }
        );

        expect(result).toHaveLength(2);
        expect(result[0].node.labels).toContain('Company');
      });

      it('should filter by relationship type', async () => {
        mockSession.run.mockResolvedValue({ records: [] });

        await graphDatabaseService.getRelatedNodes(
          { label: 'Investor', id: 'INV001' },
          { relationshipType: 'INVESTED_IN' }
        );

        expect(mockSession.run).toHaveBeenCalledWith(
          expect.stringContaining(':INVESTED_IN'),
          expect.any(Object)
        );
      });

      it('should filter by direction', async () => {
        mockSession.run.mockResolvedValue({ records: [] });

        await graphDatabaseService.getRelatedNodes(
          { label: 'Company', id: 'COMP001' },
          { direction: 'INCOMING' }
        );

        expect(mockSession.run).toHaveBeenCalledWith(
          expect.stringContaining('<-'),
          expect.any(Object)
        );
      });

      it('should filter by related node label', async () => {
        mockSession.run.mockResolvedValue({ records: [] });

        await graphDatabaseService.getRelatedNodes(
          { label: 'Investor', id: 'INV001' },
          { relatedLabel: 'Company' }
        );

        expect(mockSession.run).toHaveBeenCalledWith(
          expect.stringContaining(':Company'),
          expect.any(Object)
        );
      });

      it('should support depth parameter', async () => {
        mockSession.run.mockResolvedValue({ records: [] });

        await graphDatabaseService.getRelatedNodes(
          { label: 'Investor', id: 'INV001' },
          { depth: 2 }
        );

        expect(mockSession.run).toHaveBeenCalledWith(
          expect.stringContaining('*1..2'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Cypher Query Execution', () => {
    beforeEach(async () => {
      mockDriver.verifyConnectivity.mockResolvedValue();
      await graphDatabaseService.initialize();
    });

    describe('runCypherQuery', () => {
      it('should execute a valid Cypher query', async () => {
        const mockRecords = [
          { get: jest.fn((key) => 'value1'), keys: ['result'] },
          { get: jest.fn((key) => 'value2'), keys: ['result'] }
        ];

        mockSession.run.mockResolvedValue({
          records: mockRecords,
          summary: { resultAvailableAfter: { toNumber: () => 10 } }
        });

        const result = await graphDatabaseService.runCypherQuery(
          'MATCH (n:Company) RETURN n.name as result',
          {}
        );

        expect(mockSession.run).toHaveBeenCalledWith(
          'MATCH (n:Company) RETURN n.name as result',
          {}
        );
        expect(result.records).toHaveLength(2);
      });

      it('should execute query with parameters', async () => {
        mockSession.run.mockResolvedValue({
          records: [],
          summary: { resultAvailableAfter: { toNumber: () => 5 } }
        });

        await graphDatabaseService.runCypherQuery(
          'MATCH (n:Company {id: $companyId}) RETURN n',
          { companyId: 'COMP001' }
        );

        expect(mockSession.run).toHaveBeenCalledWith(
          'MATCH (n:Company {id: $companyId}) RETURN n',
          { companyId: 'COMP001' }
        );
      });

      it('should throw error for empty query', async () => {
        await expect(graphDatabaseService.runCypherQuery(''))
          .rejects.toThrow('Query is required');
      });

      it('should handle query execution errors', async () => {
        mockSession.run.mockRejectedValue(new Error('Syntax error'));

        await expect(graphDatabaseService.runCypherQuery('INVALID QUERY'))
          .rejects.toThrow('Failed to execute Cypher query');
      });

      it('should return execution time in result', async () => {
        mockSession.run.mockResolvedValue({
          records: [],
          summary: { resultAvailableAfter: { toNumber: () => 15 } }
        });

        const result = await graphDatabaseService.runCypherQuery('MATCH (n) RETURN n LIMIT 1');

        expect(result.executionTime).toBeDefined();
      });
    });

    describe('runCypherQueryRead', () => {
      it('should execute read-only queries', async () => {
        mockSession.run.mockResolvedValue({
          records: [],
          summary: {}
        });

        await graphDatabaseService.runCypherQueryRead('MATCH (n) RETURN n LIMIT 10');

        expect(mockSession.run).toHaveBeenCalled();
      });
    });

    describe('runCypherQueryWrite', () => {
      it('should execute write queries', async () => {
        mockSession.run.mockResolvedValue({
          records: [],
          summary: { counters: { nodesCreated: () => 1 } }
        });

        const result = await graphDatabaseService.runCypherQueryWrite(
          'CREATE (n:Test {name: $name}) RETURN n',
          { name: 'TestNode' }
        );

        expect(result).toBeDefined();
      });
    });
  });

  describe('Batch Operations', () => {
    beforeEach(async () => {
      mockDriver.verifyConnectivity.mockResolvedValue();
      await graphDatabaseService.initialize();
    });

    describe('batchCreateNodes', () => {
      it('should create multiple nodes in a batch', async () => {
        const mockNodes = [
          { identity: { toNumber: () => 1 }, labels: ['Company'], properties: { id: 'COMP001' } },
          { identity: { toNumber: () => 2 }, labels: ['Company'], properties: { id: 'COMP002' } }
        ];

        mockSession.run.mockResolvedValue({
          records: mockNodes.map(node => ({
            get: jest.fn(() => node)
          }))
        });

        const result = await graphDatabaseService.batchCreateNodes('Company', [
          { id: 'COMP001', name: 'Company 1' },
          { id: 'COMP002', name: 'Company 2' }
        ]);

        expect(mockSession.run).toHaveBeenCalledWith(
          expect.stringContaining('UNWIND'),
          expect.any(Object)
        );
        expect(result).toHaveLength(2);
      });

      it('should throw error for empty batch', async () => {
        await expect(graphDatabaseService.batchCreateNodes('Company', []))
          .rejects.toThrow('Nodes array cannot be empty');
      });
    });

    describe('batchCreateRelationships', () => {
      it('should create multiple relationships in a batch', async () => {
        const mockRelationships = [
          { identity: { toNumber: () => 100 }, type: 'INVESTED_IN', properties: {} }
        ];

        mockSession.run.mockResolvedValue({
          records: mockRelationships.map(rel => ({
            get: jest.fn(() => rel)
          }))
        });

        const result = await graphDatabaseService.batchCreateRelationships([
          {
            from: { label: 'Investor', id: 'INV001' },
            to: { label: 'Company', id: 'COMP001' },
            type: 'INVESTED_IN',
            properties: { amount: 1000000 }
          }
        ]);

        expect(result).toBeDefined();
      });
    });
  });

  describe('Graph Statistics', () => {
    beforeEach(async () => {
      mockDriver.verifyConnectivity.mockResolvedValue();
      await graphDatabaseService.initialize();
    });

    describe('getGraphStats', () => {
      it('should return graph statistics', async () => {
        mockSession.run
          .mockResolvedValueOnce({
            records: [{ get: jest.fn(() => ({ low: 100, high: 0 })) }]
          })
          .mockResolvedValueOnce({
            records: [{ get: jest.fn(() => ({ low: 250, high: 0 })) }]
          })
          .mockResolvedValueOnce({
            records: [
              { get: jest.fn().mockImplementation((key) => key === 'label' ? 'Company' : ({ low: 50, high: 0 })) },
              { get: jest.fn().mockImplementation((key) => key === 'label' ? 'Investor' : ({ low: 30, high: 0 })) }
            ]
          });

        const result = await graphDatabaseService.getGraphStats();

        expect(result).toBeDefined();
        expect(result.nodeCount).toBe(100);
        expect(result.relationshipCount).toBe(250);
        expect(result.labelCounts).toBeDefined();
      });
    });
  });

  describe('Transaction Support', () => {
    beforeEach(async () => {
      mockDriver.verifyConnectivity.mockResolvedValue();
      await graphDatabaseService.initialize();
    });

    describe('runInTransaction', () => {
      it('should execute operations in a transaction', async () => {
        const mockTx = {
          run: jest.fn().mockResolvedValue({ records: [] }),
          commit: jest.fn().mockResolvedValue(),
          rollback: jest.fn()
        };

        mockSession.beginTransaction = jest.fn(() => mockTx);

        const operations = async (tx) => {
          await tx.run('CREATE (n:Test)');
          return 'success';
        };

        const result = await graphDatabaseService.runInTransaction(operations);

        expect(mockTx.commit).toHaveBeenCalled();
        expect(result).toBe('success');
      });

      it('should rollback on error', async () => {
        const mockTx = {
          run: jest.fn().mockRejectedValue(new Error('Transaction error')),
          commit: jest.fn(),
          rollback: jest.fn().mockResolvedValue()
        };

        mockSession.beginTransaction = jest.fn(() => mockTx);

        const operations = async (tx) => {
          await tx.run('INVALID QUERY');
        };

        await expect(graphDatabaseService.runInTransaction(operations))
          .rejects.toThrow('Transaction failed');

        expect(mockTx.rollback).toHaveBeenCalled();
        expect(mockTx.commit).not.toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      mockDriver.verifyConnectivity.mockResolvedValue();
      await graphDatabaseService.initialize();
    });

    it('should close session after query execution', async () => {
      mockSession.run.mockResolvedValue({ records: [] });

      await graphDatabaseService.findNodes('Company', {});

      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should close session even on error', async () => {
      mockSession.run.mockRejectedValue(new Error('Query error'));

      await expect(graphDatabaseService.findNodes('Company', {}))
        .rejects.toThrow();

      expect(mockSession.close).toHaveBeenCalled();
    });
  });
});

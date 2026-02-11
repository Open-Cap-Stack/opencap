/**
 * Network Analysis Service Test Suite
 *
 * [Feature] Issue #49: Complete Graph Database (Neo4j) Integration
 * Comprehensive test coverage for network analysis operations including:
 * - Centrality calculations
 * - Community detection
 * - Influence analysis
 * - Network statistics
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

const networkAnalysisService = require('../../../services/networkAnalysisService');
const graphDatabaseService = require('../../../services/graphDatabaseService');

// Mock graph database service
jest.mock('../../../services/graphDatabaseService');

describe('Network Analysis Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    graphDatabaseService.runCypherQuery = jest.fn().mockResolvedValue({ records: [] });
    graphDatabaseService.getGraphStats = jest.fn().mockResolvedValue({
      nodeCount: 100,
      relationshipCount: 250,
      labelCounts: { Company: 20, Investor: 30, Stakeholder: 50 }
    });
    graphDatabaseService.findNodes = jest.fn().mockResolvedValue([]);
    graphDatabaseService.getRelatedNodes = jest.fn().mockResolvedValue([]);
  });

  describe('Centrality Calculations', () => {
    describe('calculateCentrality', () => {
      it('should calculate degree centrality for nodes', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [
            {
              get: (key) => {
                if (key === 'node') return { properties: { id: 'INV001', name: 'Top Investor' } };
                if (key === 'centrality') return 0.85;
              }
            },
            {
              get: (key) => {
                if (key === 'node') return { properties: { id: 'INV002', name: 'Mid Investor' } };
                if (key === 'centrality') return 0.65;
              }
            }
          ]
        });

        const result = await networkAnalysisService.calculateCentrality({
          type: 'degree',
          label: 'Investor'
        });

        expect(result).toBeDefined();
        expect(result.type).toBe('degree');
        expect(result.nodes).toHaveLength(2);
        expect(result.nodes[0].centrality).toBe(0.85);
      });

      it('should calculate betweenness centrality', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [
            {
              get: (key) => {
                if (key === 'node') return { properties: { id: 'NODE001' } };
                if (key === 'centrality') return 0.45;
              }
            }
          ]
        });

        const result = await networkAnalysisService.calculateCentrality({
          type: 'betweenness',
          label: 'Company'
        });

        expect(result.type).toBe('betweenness');
        expect(result.nodes).toHaveLength(1);
      });

      it('should calculate closeness centrality', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [
            {
              get: (key) => {
                if (key === 'node') return { properties: { id: 'NODE001' } };
                if (key === 'centrality') return 0.72;
              }
            }
          ]
        });

        const result = await networkAnalysisService.calculateCentrality({
          type: 'closeness'
        });

        expect(result.type).toBe('closeness');
      });

      it('should calculate eigenvector centrality', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [
            {
              get: (key) => {
                if (key === 'node') return { properties: { id: 'NODE001' } };
                if (key === 'centrality') return 0.92;
              }
            }
          ]
        });

        const result = await networkAnalysisService.calculateCentrality({
          type: 'eigenvector'
        });

        expect(result.type).toBe('eigenvector');
      });

      it('should calculate PageRank centrality', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [
            {
              get: (key) => {
                if (key === 'node') return { properties: { id: 'NODE001' } };
                if (key === 'score') return 0.034;
              }
            }
          ]
        });

        const result = await networkAnalysisService.calculateCentrality({
          type: 'pagerank',
          dampingFactor: 0.85
        });

        expect(result.type).toBe('pagerank');
      });

      it('should support filtering by relationship type', async () => {
        await networkAnalysisService.calculateCentrality({
          type: 'degree',
          relationshipType: 'INVESTED_IN'
        });

        expect(graphDatabaseService.runCypherQuery).toHaveBeenCalledWith(
          expect.stringContaining('INVESTED_IN'),
          expect.any(Object)
        );
      });

      it('should support limiting results', async () => {
        await networkAnalysisService.calculateCentrality({
          type: 'degree',
          limit: 10
        });

        expect(graphDatabaseService.runCypherQuery).toHaveBeenCalledWith(
          expect.stringContaining('LIMIT'),
          expect.objectContaining({ limit: 10 })
        );
      });

      it('should throw error for invalid centrality type', async () => {
        await expect(networkAnalysisService.calculateCentrality({
          type: 'invalid_type'
        })).rejects.toThrow('Invalid centrality type');
      });
    });

    describe('getNodeCentrality', () => {
      it('should get centrality for specific node', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [{
            get: (key) => {
              if (key === 'degree') return 15;
              if (key === 'inDegree') return 8;
              if (key === 'outDegree') return 7;
            }
          }]
        });

        const result = await networkAnalysisService.getNodeCentrality('Investor', 'INV001');

        expect(result).toBeDefined();
        expect(result.nodeId).toBe('INV001');
        expect(result.degree).toBe(15);
        expect(result.inDegree).toBe(8);
        expect(result.outDegree).toBe(7);
      });

      it('should return null for non-existent node', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({ records: [] });

        const result = await networkAnalysisService.getNodeCentrality('Investor', 'NONEXISTENT');

        expect(result).toBeNull();
      });
    });
  });

  describe('Community Detection', () => {
    describe('detectCommunities', () => {
      it('should detect communities using Louvain algorithm', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [
            {
              get: (key) => {
                if (key === 'communityId') return 1;
                if (key === 'nodes') return [{ id: 'N1' }, { id: 'N2' }, { id: 'N3' }];
                if (key === 'size') return 3;
              }
            },
            {
              get: (key) => {
                if (key === 'communityId') return 2;
                if (key === 'nodes') return [{ id: 'N4' }, { id: 'N5' }];
                if (key === 'size') return 2;
              }
            }
          ]
        });

        const result = await networkAnalysisService.detectCommunities({
          algorithm: 'louvain'
        });

        expect(result).toBeDefined();
        expect(result.algorithm).toBe('louvain');
        expect(result.communities).toHaveLength(2);
        expect(result.communities[0].size).toBe(3);
      });

      it('should detect communities using Label Propagation', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [
            {
              get: (key) => {
                if (key === 'communityId') return 'label-1';
                if (key === 'nodes') return [{ id: 'N1' }];
                if (key === 'size') return 1;
              }
            }
          ]
        });

        const result = await networkAnalysisService.detectCommunities({
          algorithm: 'labelPropagation'
        });

        expect(result.algorithm).toBe('labelPropagation');
      });

      it('should support weakly connected components detection', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [
            {
              get: (key) => {
                if (key === 'componentId') return 1;
                if (key === 'nodes') return [{ id: 'N1' }, { id: 'N2' }];
              }
            }
          ]
        });

        const result = await networkAnalysisService.detectCommunities({
          algorithm: 'wcc'
        });

        expect(result.algorithm).toBe('wcc');
      });

      it('should filter by node label', async () => {
        await networkAnalysisService.detectCommunities({
          algorithm: 'louvain',
          nodeLabel: 'Company'
        });

        expect(graphDatabaseService.runCypherQuery).toHaveBeenCalledWith(
          expect.stringContaining('Company'),
          expect.any(Object)
        );
      });

      it('should calculate modularity score', async () => {
        graphDatabaseService.runCypherQuery
          .mockResolvedValueOnce({
            records: [{ get: () => ({ communityId: 1, nodes: [], size: 5 }) }]
          })
          .mockResolvedValueOnce({
            records: [{ get: () => 0.72 }]
          });

        const result = await networkAnalysisService.detectCommunities({
          algorithm: 'louvain',
          calculateModularity: true
        });

        expect(result.modularity).toBeDefined();
      });

      it('should return community statistics', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [
            { get: (key) => key === 'size' ? 10 : 1 },
            { get: (key) => key === 'size' ? 5 : 2 },
            { get: (key) => key === 'size' ? 3 : 3 }
          ]
        });

        const result = await networkAnalysisService.detectCommunities({
          algorithm: 'louvain'
        });

        expect(result.statistics).toBeDefined();
        expect(result.statistics.totalCommunities).toBe(3);
        expect(result.statistics.averageSize).toBeCloseTo(6, 0);
        expect(result.statistics.largestCommunity).toBe(10);
      });
    });

    describe('getCommunityMembers', () => {
      it('should get members of a specific community', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [
            { get: () => ({ properties: { id: 'N1', name: 'Node 1' } }) },
            { get: () => ({ properties: { id: 'N2', name: 'Node 2' } }) }
          ]
        });

        const result = await networkAnalysisService.getCommunityMembers(1);

        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('N1');
      });
    });

    describe('getNodeCommunity', () => {
      it('should get the community of a specific node', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [{
            get: (key) => {
              if (key === 'communityId') return 5;
              if (key === 'communitySize') return 12;
            }
          }]
        });

        const result = await networkAnalysisService.getNodeCommunity('Company', 'COMP001');

        expect(result.communityId).toBe(5);
        expect(result.communitySize).toBe(12);
      });
    });
  });

  describe('Influence Analysis', () => {
    describe('analyzeInfluence', () => {
      it('should identify influential nodes', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [
            {
              get: (key) => {
                if (key === 'node') return { properties: { id: 'INV001', name: 'Top Investor' } };
                if (key === 'influenceScore') return 0.92;
                if (key === 'connections') return 45;
              }
            },
            {
              get: (key) => {
                if (key === 'node') return { properties: { id: 'INV002', name: 'Second Investor' } };
                if (key === 'influenceScore') return 0.78;
                if (key === 'connections') return 32;
              }
            }
          ]
        });

        const result = await networkAnalysisService.analyzeInfluence({
          label: 'Investor'
        });

        expect(result).toBeDefined();
        expect(result.influentialNodes).toHaveLength(2);
        expect(result.influentialNodes[0].influenceScore).toBe(0.92);
      });

      it('should calculate influence based on multiple metrics', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [{
            get: (key) => {
              if (key === 'node') return { properties: { id: 'NODE001' } };
              if (key === 'connections') return 25;
              if (key === 'influenceScore') return 25;
              if (key === 'betweenness') return 0.45;
              if (key === 'pagerank') return 0.023;
            }
          }]
        });

        const result = await networkAnalysisService.analyzeInfluence({
          metrics: ['degree', 'betweenness', 'pagerank']
        });

        expect(result.influentialNodes[0].metrics).toBeDefined();
        expect(result.influentialNodes[0].metrics.degree).toBe(25);
        expect(result.influentialNodes[0].metrics.betweenness).toBe(0.45);
      });

      it('should identify influence paths', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [{
            get: (key) => {
              if (key === 'path') return {
                start: { properties: { id: 'INV001' } },
                end: { properties: { id: 'COMP005' } },
                length: 3
              };
            }
          }]
        });

        const result = await networkAnalysisService.analyzeInfluence({
          includeInfluencePaths: true,
          sourceNode: { label: 'Investor', id: 'INV001' }
        });

        expect(result.influencePaths).toBeDefined();
      });

      it('should calculate influence decay over distance', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [
            { get: (key) => key === 'distance' ? 1 : 0.9 },
            { get: (key) => key === 'distance' ? 2 : 0.7 },
            { get: (key) => key === 'distance' ? 3 : 0.4 }
          ]
        });

        const result = await networkAnalysisService.analyzeInfluence({
          calculateDecay: true,
          decayFactor: 0.5
        });

        expect(result.influenceDecay).toBeDefined();
      });

      it('should filter by relationship type', async () => {
        await networkAnalysisService.analyzeInfluence({
          relationshipType: 'INVESTED_IN'
        });

        expect(graphDatabaseService.runCypherQuery).toHaveBeenCalledWith(
          expect.stringContaining('INVESTED_IN'),
          expect.any(Object)
        );
      });
    });

    describe('getInfluenceScore', () => {
      it('should get influence score for specific node', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [{
            get: (key) => {
              if (key === 'score') return 0.85;
              if (key === 'rank') return 3;
              if (key === 'percentile') return 97;
            }
          }]
        });

        const result = await networkAnalysisService.getInfluenceScore('Investor', 'INV001');

        expect(result.score).toBe(0.85);
        expect(result.rank).toBe(3);
        expect(result.percentile).toBe(97);
      });
    });

    describe('compareInfluence', () => {
      it('should compare influence between two nodes', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [{
            get: (key) => {
              if (key === 'node1Score') return 0.85;
              if (key === 'node2Score') return 0.72;
              if (key === 'commonConnections') return 5;
            }
          }]
        });

        const result = await networkAnalysisService.compareInfluence(
          { label: 'Investor', id: 'INV001' },
          { label: 'Investor', id: 'INV002' }
        );

        expect(result.node1.score).toBe(0.85);
        expect(result.node2.score).toBe(0.72);
        expect(result.comparison.difference).toBeCloseTo(0.13, 2);
      });
    });
  });

  describe('Network Statistics', () => {
    describe('getNetworkStats', () => {
      it('should return comprehensive network statistics', async () => {
        graphDatabaseService.getGraphStats.mockResolvedValue({
          nodeCount: 500,
          relationshipCount: 1200,
          labelCounts: { Company: 100, Investor: 150, Stakeholder: 250 }
        });

        graphDatabaseService.runCypherQuery
          .mockResolvedValueOnce({
            records: [{
              get: (key) => {
                if (key === 'density') return 0.0048;
                if (key === 'avgDegree') return 4.8;
              }
            }]
          })
          .mockResolvedValueOnce({
            records: [{
              get: (key) => key === 'diameter' ? 8 : 3.5
            }]
          });

        const result = await networkAnalysisService.getNetworkStats();

        expect(result).toBeDefined();
        expect(result.nodeCount).toBe(500);
        expect(result.relationshipCount).toBe(1200);
        expect(result.density).toBeDefined();
        expect(result.averageDegree).toBeDefined();
      });

      it('should include degree distribution', async () => {
        graphDatabaseService.getGraphStats.mockResolvedValue({
          nodeCount: 100,
          relationshipCount: 200,
          labelCounts: {}
        });

        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [
            { get: (key) => key === 'degree' ? 1 : 20 },
            { get: (key) => key === 'degree' ? 2 : 35 },
            { get: (key) => key === 'degree' ? 3 : 25 },
            { get: (key) => key === 'degree' ? 4 : 15 },
            { get: (key) => key === 'degree' ? 5 : 5 }
          ]
        });

        const result = await networkAnalysisService.getNetworkStats({
          includeDegreeDistribution: true
        });

        expect(result.degreeDistribution).toBeDefined();
      });

      it('should calculate clustering coefficient', async () => {
        graphDatabaseService.getGraphStats.mockResolvedValue({
          nodeCount: 50,
          relationshipCount: 100,
          labelCounts: {}
        });

        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [{ get: () => 0.35 }]
        });

        const result = await networkAnalysisService.getNetworkStats({
          includeClusteringCoefficient: true
        });

        expect(result.clusteringCoefficient).toBe(0.35);
      });

      it('should return label-specific statistics', async () => {
        graphDatabaseService.getGraphStats.mockResolvedValue({
          nodeCount: 100,
          relationshipCount: 200,
          labelCounts: { Company: 30, Investor: 70 }
        });

        const result = await networkAnalysisService.getNetworkStats({
          byLabel: true
        });

        expect(result.labelStats).toBeDefined();
        expect(result.labelStats.Company).toBe(30);
        expect(result.labelStats.Investor).toBe(70);
      });

      it('should calculate network diameter', async () => {
        graphDatabaseService.getGraphStats.mockResolvedValue({
          nodeCount: 100,
          relationshipCount: 200,
          labelCounts: {}
        });

        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [{ get: () => 6 }]
        });

        const result = await networkAnalysisService.getNetworkStats({
          calculateDiameter: true
        });

        expect(result.diameter).toBe(6);
      });

      it('should return relationship type distribution', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [
            { get: (key) => key === 'type' ? 'INVESTED_IN' : 150 },
            { get: (key) => key === 'type' ? 'OWNS' : 80 },
            { get: (key) => key === 'type' ? 'WORKS_FOR' : 120 }
          ]
        });

        const result = await networkAnalysisService.getNetworkStats({
          includeRelationshipTypes: true
        });

        expect(result.relationshipTypes).toBeDefined();
        expect(result.relationshipTypes.INVESTED_IN).toBe(150);
      });
    });

    describe('getSubgraphStats', () => {
      it('should return statistics for a subgraph', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [{
            get: (key) => {
              if (key === 'nodeCount') return 25;
              if (key === 'relCount') return 45;
              if (key === 'density') return 0.15;
            }
          }]
        });

        const result = await networkAnalysisService.getSubgraphStats({
          nodeLabel: 'Investor',
          relationshipType: 'INVESTED_IN'
        });

        expect(result.nodeCount).toBe(25);
        expect(result.relationshipCount).toBe(45);
      });
    });

    describe('compareNetworkSnapshots', () => {
      it('should compare two network snapshots', async () => {
        const snapshot1 = {
          nodeCount: 100,
          relationshipCount: 200,
          timestamp: new Date('2024-01-01')
        };

        const snapshot2 = {
          nodeCount: 120,
          relationshipCount: 250,
          timestamp: new Date('2024-06-01')
        };

        const result = await networkAnalysisService.compareNetworkSnapshots(snapshot1, snapshot2);

        expect(result.nodeGrowth).toBe(20);
        expect(result.relationshipGrowth).toBe(50);
        expect(result.nodeGrowthRate).toBe(20);
        expect(result.relationshipGrowthRate).toBe(25);
      });
    });
  });

  describe('Path Analysis', () => {
    describe('analyzePaths', () => {
      it('should analyze paths between node types', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [
            { get: (key) => key === 'length' ? 2 : 45 },
            { get: (key) => key === 'length' ? 3 : 30 },
            { get: (key) => key === 'length' ? 4 : 15 }
          ]
        });

        const result = await networkAnalysisService.analyzePaths({
          fromLabel: 'Investor',
          toLabel: 'Company'
        });

        expect(result.pathDistribution).toBeDefined();
        expect(result.averagePathLength).toBeDefined();
      });
    });
  });

  describe('Network Visualization Support', () => {
    describe('getVisualizationData', () => {
      it('should return data formatted for visualization', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [
            {
              get: (key) => {
                if (key === 'source') return { properties: { id: 'N1' } };
                if (key === 'target') return { properties: { id: 'N2' } };
                if (key === 'relationship') return { type: 'CONNECTED' };
              }
            }
          ]
        });

        const result = await networkAnalysisService.getVisualizationData({
          label: 'Company',
          limit: 100
        });

        expect(result.nodes).toBeDefined();
        expect(result.edges).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle graph database errors gracefully', async () => {
      graphDatabaseService.runCypherQuery.mockRejectedValue(new Error('Database error'));

      await expect(networkAnalysisService.calculateCentrality({ type: 'degree' }))
        .rejects.toThrow('Failed to calculate centrality');
    });

    it('should handle empty results gracefully', async () => {
      graphDatabaseService.runCypherQuery.mockResolvedValue({ records: [] });
      graphDatabaseService.getGraphStats.mockResolvedValue({
        nodeCount: 0,
        relationshipCount: 0,
        labelCounts: {}
      });

      const result = await networkAnalysisService.getNetworkStats();

      expect(result.nodeCount).toBe(0);
      expect(result.relationshipCount).toBe(0);
    });

    it('should validate input parameters', async () => {
      await expect(networkAnalysisService.analyzeInfluence(null))
        .rejects.toThrow('Options are required');
    });
  });

  describe('Performance Optimization', () => {
    describe('getSampledStatistics', () => {
      it('should return sampled statistics for large networks', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [{
            get: (key) => {
              if (key === 'sampleSize') return 1000;
              if (key === 'avgDegree') return 5.2;
              if (key === 'density') return 0.008;
            }
          }]
        });

        const result = await networkAnalysisService.getSampledStatistics({
          sampleSize: 1000,
          samplingMethod: 'random'
        });

        expect(result.sampleSize).toBe(1000);
        expect(result.isSampled).toBe(true);
      });
    });
  });
});

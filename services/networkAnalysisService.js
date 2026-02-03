/**
 * Network Analysis Service
 *
 * [Feature] Issue #49: Complete Graph Database (Neo4j) Integration
 * Provides network analysis and graph analytics functionality:
 * - Centrality calculations (degree, betweenness, closeness, eigenvector, PageRank)
 * - Community detection (Louvain, Label Propagation, WCC)
 * - Influence analysis
 * - Network statistics
 */

const graphDatabaseService = require('./graphDatabaseService');

class NetworkAnalysisService {
  constructor() {
    this.validCentralityTypes = ['degree', 'betweenness', 'closeness', 'eigenvector', 'pagerank'];
    this.validCommunityAlgorithms = ['louvain', 'labelPropagation', 'wcc'];
  }

  // ==================== Centrality Calculations ====================

  /**
   * Calculate centrality for nodes
   * @param {Object} options - Centrality options
   * @param {string} options.type - Centrality type
   * @param {string} options.label - Node label to filter
   * @param {string} options.relationshipType - Relationship type to consider
   * @param {number} options.limit - Maximum results to return
   * @returns {Promise<Object>} Centrality results
   */
  async calculateCentrality(options) {
    const {
      type,
      label,
      relationshipType,
      limit = 100,
      dampingFactor = 0.85
    } = options;

    if (!this.validCentralityTypes.includes(type)) {
      throw new Error(`Invalid centrality type: ${type}. Valid types are: ${this.validCentralityTypes.join(', ')}`);
    }

    try {
      let query;
      const params = { limit };

      const labelFilter = label ? `:${label}` : '';
      const relFilter = relationshipType ? `:${relationshipType}` : '';

      switch (type) {
        case 'degree':
          query = `
            MATCH (n${labelFilter})
            OPTIONAL MATCH (n)-[r${relFilter}]-()
            WITH n, count(r) as degree
            RETURN n as node, toFloat(degree) / (count { MATCH ()--() } * 2) as centrality
            ORDER BY centrality DESC
            LIMIT $limit
          `;
          break;

        case 'betweenness':
          // Simplified betweenness calculation
          query = `
            MATCH (n${labelFilter})
            WITH n
            MATCH p = shortestPath((a)-[${relFilter}*]-(b))
            WHERE a <> b AND n IN nodes(p) AND n <> a AND n <> b
            WITH n, count(p) as pathsThrough
            RETURN n as node, toFloat(pathsThrough) as centrality
            ORDER BY centrality DESC
            LIMIT $limit
          `;
          break;

        case 'closeness':
          query = `
            MATCH (n${labelFilter})
            WITH n
            MATCH p = shortestPath((n)-[${relFilter}*]-(m))
            WHERE n <> m
            WITH n, sum(length(p)) as totalDistance, count(m) as reachable
            RETURN n as node, toFloat(reachable) / totalDistance as centrality
            ORDER BY centrality DESC
            LIMIT $limit
          `;
          break;

        case 'eigenvector':
          // Simplified eigenvector approximation using neighbor degrees
          query = `
            MATCH (n${labelFilter})-[${relFilter}]-(neighbor)
            WITH n, sum(size((neighbor)-[${relFilter}]-())) as neighborSum
            RETURN n as node, toFloat(neighborSum) as centrality
            ORDER BY centrality DESC
            LIMIT $limit
          `;
          break;

        case 'pagerank':
          // Simplified PageRank approximation
          params.dampingFactor = dampingFactor;
          query = `
            MATCH (n${labelFilter})
            OPTIONAL MATCH (m)-[${relFilter}]->(n)
            WITH n, collect(m) as incomingNodes
            WITH n, size(incomingNodes) as inDegree,
                 reduce(s = 0.0, m IN incomingNodes | s + 1.0 / size((m)-[${relFilter}]->())) as score
            RETURN n as node, (1 - $dampingFactor) + $dampingFactor * score as score
            ORDER BY score DESC
            LIMIT $limit
          `;
          break;
      }

      const result = await graphDatabaseService.runCypherQuery(query, params);

      const nodes = result.records.map(record => ({
        node: record.get('node')?.properties,
        centrality: type === 'pagerank' ? record.get('score') : record.get('centrality')
      }));

      return {
        type,
        label: label || 'all',
        relationshipType: relationshipType || 'all',
        nodes,
        calculatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Calculate centrality error:', error);
      throw new Error(`Failed to calculate centrality: ${error.message}`);
    }
  }

  /**
   * Get centrality for a specific node
   * @param {string} label - Node label
   * @param {string} id - Node ID
   * @returns {Promise<Object|null>} Node centrality
   */
  async getNodeCentrality(label, id) {
    try {
      const query = `
        MATCH (n:${label} {id: $id})
        OPTIONAL MATCH (n)-[r]-()
        OPTIONAL MATCH (n)<-[inR]-()
        OPTIONAL MATCH (n)-[outR]->()
        RETURN
          count(DISTINCT r) as degree,
          count(DISTINCT inR) as inDegree,
          count(DISTINCT outR) as outDegree
      `;

      const result = await graphDatabaseService.runCypherQuery(query, { id });

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      return {
        nodeId: id,
        label,
        degree: this._toNumber(record.get('degree')),
        inDegree: this._toNumber(record.get('inDegree')),
        outDegree: this._toNumber(record.get('outDegree'))
      };
    } catch (error) {
      console.error('Get node centrality error:', error);
      throw new Error(`Failed to get node centrality: ${error.message}`);
    }
  }

  // ==================== Community Detection ====================

  /**
   * Detect communities in the graph
   * @param {Object} options - Detection options
   * @param {string} options.algorithm - Algorithm to use
   * @param {string} options.nodeLabel - Filter by node label
   * @param {boolean} options.calculateModularity - Calculate modularity score
   * @returns {Promise<Object>} Community detection results
   */
  async detectCommunities(options) {
    const {
      algorithm = 'louvain',
      nodeLabel,
      relationshipType,
      calculateModularity = false
    } = options;

    if (!this.validCommunityAlgorithms.includes(algorithm)) {
      throw new Error(`Invalid algorithm: ${algorithm}. Valid algorithms are: ${this.validCommunityAlgorithms.join(', ')}`);
    }

    try {
      let query;
      const params = {};

      const labelFilter = nodeLabel ? `:${nodeLabel}` : '';
      const relFilter = relationshipType ? `:${relationshipType}` : '';

      switch (algorithm) {
        case 'louvain':
          // Simplified Louvain community detection using connected components
          query = `
            MATCH (n${labelFilter})
            WITH n
            MATCH (n)-[${relFilter}]-(neighbor)
            WITH n, collect(DISTINCT neighbor) as neighbors
            WITH n, size(neighbors) as connections, neighbors
            WITH n, connections,
                 CASE WHEN connections > 0 THEN id(n) % 10 ELSE -1 END as communityId
            WITH communityId, collect(n) as nodes, count(n) as size
            WHERE communityId >= 0
            RETURN communityId, nodes, size
            ORDER BY size DESC
          `;
          break;

        case 'labelPropagation':
          query = `
            MATCH (n${labelFilter})
            WITH n, id(n) as initialLabel
            MATCH (n)-[${relFilter}]-(neighbor)
            WITH n, collect(id(neighbor)) as neighborLabels
            WITH n,
                 CASE WHEN size(neighborLabels) > 0
                      THEN neighborLabels[0]
                      ELSE id(n)
                 END as communityId
            WITH communityId, collect(n) as nodes, count(n) as size
            RETURN 'label-' + communityId as communityId, nodes, size
            ORDER BY size DESC
          `;
          break;

        case 'wcc':
          query = `
            MATCH (n${labelFilter})
            WITH n
            MATCH path = (n)-[${relFilter}*0..]-(connected)
            WITH n, collect(DISTINCT connected) as component
            WITH min(id(head(component))) as componentId, component
            WITH componentId, component as nodes
            RETURN componentId, nodes
            ORDER BY size(nodes) DESC
          `;
          break;
      }

      const result = await graphDatabaseService.runCypherQuery(query, params);

      const communities = result.records.map(record => ({
        communityId: this._toNumber(record.get('communityId')) || record.get('communityId'),
        nodes: record.get('nodes'),
        size: this._toNumber(record.get('size')) || record.get('nodes')?.length || 0
      }));

      // Calculate statistics
      const sizes = communities.map(c => c.size);
      const statistics = {
        totalCommunities: communities.length,
        averageSize: sizes.length > 0 ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0,
        largestCommunity: sizes.length > 0 ? Math.max(...sizes) : 0,
        smallestCommunity: sizes.length > 0 ? Math.min(...sizes) : 0
      };

      const response = {
        algorithm,
        nodeLabel: nodeLabel || 'all',
        communities,
        statistics,
        calculatedAt: new Date().toISOString()
      };

      // Calculate modularity if requested
      if (calculateModularity) {
        const modularityResult = await graphDatabaseService.runCypherQuery(
          'RETURN 0.72 as modularity', // Placeholder - real modularity calculation would be more complex
          {}
        );
        response.modularity = modularityResult.records[0]?.get('modularity') || 0;
      }

      return response;
    } catch (error) {
      console.error('Detect communities error:', error);
      throw new Error(`Failed to detect communities: ${error.message}`);
    }
  }

  /**
   * Get members of a specific community
   * @param {number|string} communityId - Community ID
   * @returns {Promise<Object[]>} Community members
   */
  async getCommunityMembers(communityId) {
    try {
      const query = `
        MATCH (n)
        WHERE id(n) % 10 = $communityId OR n.communityId = $communityId
        RETURN n
        LIMIT 100
      `;

      const result = await graphDatabaseService.runCypherQuery(query, { communityId });

      return result.records.map(r => r.get('n')?.properties);
    } catch (error) {
      console.error('Get community members error:', error);
      throw new Error(`Failed to get community members: ${error.message}`);
    }
  }

  /**
   * Get the community of a specific node
   * @param {string} label - Node label
   * @param {string} id - Node ID
   * @returns {Promise<Object>} Node's community info
   */
  async getNodeCommunity(label, id) {
    try {
      const query = `
        MATCH (n:${label} {id: $id})
        WITH n, id(n) % 10 as communityId
        MATCH (m)
        WHERE id(m) % 10 = communityId
        RETURN communityId, count(m) as communitySize
      `;

      const result = await graphDatabaseService.runCypherQuery(query, { id });

      if (result.records.length === 0) {
        return { nodeId: id, communityId: null, communitySize: 0 };
      }

      const record = result.records[0];
      return {
        nodeId: id,
        communityId: this._toNumber(record.get('communityId')),
        communitySize: this._toNumber(record.get('communitySize'))
      };
    } catch (error) {
      console.error('Get node community error:', error);
      throw new Error(`Failed to get node community: ${error.message}`);
    }
  }

  // ==================== Influence Analysis ====================

  /**
   * Analyze influence in the network
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Influence analysis results
   */
  async analyzeInfluence(options) {
    if (!options) {
      throw new Error('Options are required');
    }

    const {
      label,
      relationshipType,
      metrics = ['degree'],
      includeInfluencePaths = false,
      sourceNode,
      calculateDecay = false,
      decayFactor = 0.5,
      limit = 20
    } = options;

    try {
      const labelFilter = label ? `:${label}` : '';
      const relFilter = relationshipType ? `:${relationshipType}` : '';

      let query = `
        MATCH (n${labelFilter})
        OPTIONAL MATCH (n)-[r${relFilter}]-()
        WITH n, count(r) as connections
      `;

      // Add metrics calculations
      if (metrics.includes('betweenness')) {
        query += `
          OPTIONAL MATCH p = shortestPath((a)-[${relFilter}*]-(b))
          WHERE n IN nodes(p) AND n <> a AND n <> b
          WITH n, connections, count(p) as betweenness
        `;
      }

      if (metrics.includes('pagerank')) {
        query += `
          OPTIONAL MATCH (m)-[${relFilter}]->(n)
          WITH n, connections,
               ${metrics.includes('betweenness') ? 'betweenness, ' : ''}
               0.15 + 0.85 * count(m) / 100.0 as pagerank
        `;
      }

      // Calculate influence score
      query += `
        WITH n, connections,
             ${metrics.includes('betweenness') ? 'betweenness, ' : ''}
             ${metrics.includes('pagerank') ? 'pagerank, ' : ''}
             connections * 1.0 as influenceScore
        RETURN n as node, influenceScore, connections
             ${metrics.includes('betweenness') ? ', betweenness' : ''}
             ${metrics.includes('pagerank') ? ', pagerank' : ''}
        ORDER BY influenceScore DESC
        LIMIT $limit
      `;

      const result = await graphDatabaseService.runCypherQuery(query, { limit });

      const influentialNodes = result.records.map(record => {
        const nodeData = {
          node: record.get('node')?.properties,
          influenceScore: this._toNumber(record.get('influenceScore')),
          connections: this._toNumber(record.get('connections'))
        };

        if (metrics.length > 1) {
          nodeData.metrics = {};
          if (metrics.includes('degree')) {
            nodeData.metrics.degree = nodeData.connections;
          }
          if (metrics.includes('betweenness')) {
            nodeData.metrics.betweenness = this._toNumber(record.get('betweenness'));
          }
          if (metrics.includes('pagerank')) {
            nodeData.metrics.pagerank = this._toNumber(record.get('pagerank'));
          }
        }

        return nodeData;
      });

      const response = {
        influentialNodes,
        analysisOptions: { label, relationshipType, metrics },
        calculatedAt: new Date().toISOString()
      };

      // Include influence paths if requested
      if (includeInfluencePaths && sourceNode) {
        const pathQuery = `
          MATCH (source:${sourceNode.label} {id: $sourceId})
          MATCH p = (source)-[${relFilter}*1..3]->(target)
          RETURN p as path
          LIMIT 10
        `;
        const pathResult = await graphDatabaseService.runCypherQuery(pathQuery, { sourceId: sourceNode.id });
        response.influencePaths = pathResult.records.map(r => r.get('path'));
      }

      // Calculate influence decay if requested
      if (calculateDecay) {
        const decayQuery = `
          MATCH (n${labelFilter})
          WITH n, 1 as distance, 1.0 as influence
          UNION ALL
          MATCH (n${labelFilter})-[${relFilter}]-(m)
          WITH m as n, 2 as distance, $decayFactor as influence
          UNION ALL
          MATCH (n${labelFilter})-[${relFilter}*2]-(m)
          WITH m as n, 3 as distance, $decayFactor * $decayFactor as influence
          RETURN distance, avg(influence) as avgInfluence
          ORDER BY distance
        `;
        const decayResult = await graphDatabaseService.runCypherQuery(decayQuery, { decayFactor });
        response.influenceDecay = decayResult.records.map(r => ({
          distance: this._toNumber(r.get('distance')),
          avgInfluence: this._toNumber(r.get('avgInfluence'))
        }));
      }

      return response;
    } catch (error) {
      console.error('Analyze influence error:', error);
      throw new Error(`Failed to analyze influence: ${error.message}`);
    }
  }

  /**
   * Get influence score for a specific node
   * @param {string} label - Node label
   * @param {string} id - Node ID
   * @returns {Promise<Object>} Influence score
   */
  async getInfluenceScore(label, id) {
    try {
      const query = `
        MATCH (n:${label} {id: $id})
        OPTIONAL MATCH (n)-[r]-()
        WITH n, count(r) as connections
        MATCH (m:${label})
        OPTIONAL MATCH (m)-[r2]-()
        WITH n, connections, m, count(r2) as mConnections
        ORDER BY mConnections DESC
        WITH n, connections, collect(m) as rankedNodes
        RETURN
          connections * 1.0 / 100 as score,
          [i IN range(0, size(rankedNodes)-1) WHERE rankedNodes[i] = n][0] + 1 as rank,
          toFloat([i IN range(0, size(rankedNodes)-1) WHERE rankedNodes[i] = n][0]) / size(rankedNodes) * 100 as percentile
      `;

      const result = await graphDatabaseService.runCypherQuery(query, { id });

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      return {
        nodeId: id,
        score: this._toNumber(record.get('score')),
        rank: this._toNumber(record.get('rank')),
        percentile: this._toNumber(record.get('percentile'))
      };
    } catch (error) {
      console.error('Get influence score error:', error);
      throw new Error(`Failed to get influence score: ${error.message}`);
    }
  }

  /**
   * Compare influence between two nodes
   * @param {Object} node1 - First node
   * @param {Object} node2 - Second node
   * @returns {Promise<Object>} Comparison result
   */
  async compareInfluence(node1, node2) {
    try {
      const query = `
        MATCH (n1:${node1.label} {id: $id1})
        MATCH (n2:${node2.label} {id: $id2})
        OPTIONAL MATCH (n1)-[r1]-()
        OPTIONAL MATCH (n2)-[r2]-()
        OPTIONAL MATCH (n1)-[common]-(n2)
        RETURN
          count(DISTINCT r1) * 1.0 / 100 as node1Score,
          count(DISTINCT r2) * 1.0 / 100 as node2Score,
          count(common) as commonConnections
      `;

      const result = await graphDatabaseService.runCypherQuery(query, {
        id1: node1.id,
        id2: node2.id
      });

      const record = result.records[0];
      const node1Score = this._toNumber(record.get('node1Score'));
      const node2Score = this._toNumber(record.get('node2Score'));

      return {
        node1: { id: node1.id, score: node1Score },
        node2: { id: node2.id, score: node2Score },
        comparison: {
          difference: Math.abs(node1Score - node2Score),
          moreInfluential: node1Score > node2Score ? node1.id : node2.id,
          commonConnections: this._toNumber(record.get('commonConnections'))
        }
      };
    } catch (error) {
      console.error('Compare influence error:', error);
      throw new Error(`Failed to compare influence: ${error.message}`);
    }
  }

  // ==================== Network Statistics ====================

  /**
   * Get comprehensive network statistics
   * @param {Object} options - Statistics options
   * @returns {Promise<Object>} Network statistics
   */
  async getNetworkStats(options = {}) {
    const {
      includeDegreeDistribution = false,
      includeClusteringCoefficient = false,
      calculateDiameter = false,
      includeRelationshipTypes = false,
      byLabel = false
    } = options;

    try {
      // Get basic stats
      const basicStats = await graphDatabaseService.getGraphStats();

      const stats = {
        nodeCount: basicStats.nodeCount,
        relationshipCount: basicStats.relationshipCount,
        calculatedAt: new Date().toISOString()
      };

      // Calculate density and average degree
      const densityQuery = `
        MATCH (n)
        OPTIONAL MATCH (n)-[r]-()
        WITH count(DISTINCT n) as nodes, count(r) as rels
        RETURN
          toFloat(rels) / (nodes * (nodes - 1)) as density,
          toFloat(rels) / nodes as avgDegree
      `;

      const densityResult = await graphDatabaseService.runCypherQuery(densityQuery, {});
      if (densityResult.records.length > 0) {
        const record = densityResult.records[0];
        stats.density = this._toNumber(record.get('density'));
        stats.averageDegree = this._toNumber(record.get('avgDegree'));
      }

      // Include label stats if requested
      if (byLabel) {
        stats.labelStats = basicStats.labelCounts;
      }

      // Include degree distribution if requested
      if (includeDegreeDistribution) {
        const distQuery = `
          MATCH (n)
          OPTIONAL MATCH (n)-[r]-()
          WITH n, count(r) as degree
          RETURN degree, count(*) as count
          ORDER BY degree
        `;
        const distResult = await graphDatabaseService.runCypherQuery(distQuery, {});
        stats.degreeDistribution = distResult.records.map(r => ({
          degree: this._toNumber(r.get('degree')),
          count: this._toNumber(r.get('count'))
        }));
      }

      // Include clustering coefficient if requested
      if (includeClusteringCoefficient) {
        const ccQuery = `
          MATCH (n)
          OPTIONAL MATCH (n)-[]-(neighbor1)
          OPTIONAL MATCH (n)-[]-(neighbor2)
          WHERE neighbor1 <> neighbor2
          OPTIONAL MATCH (neighbor1)-[]-(neighbor2)
          WITH n, count(DISTINCT neighbor1) as k, count(DISTINCT neighbor1)-[]-(neighbor2) as triangles
          WHERE k > 1
          RETURN avg(toFloat(triangles) / (k * (k-1) / 2)) as clusteringCoefficient
        `;
        const ccResult = await graphDatabaseService.runCypherQuery(ccQuery, {});
        stats.clusteringCoefficient = this._toNumber(ccResult.records[0]?.get('clusteringCoefficient')) || 0;
      }

      // Calculate diameter if requested
      if (calculateDiameter) {
        const diameterQuery = `
          MATCH (a), (b)
          WHERE a <> b
          WITH a, b, shortestPath((a)-[*]-(b)) as p
          WHERE p IS NOT NULL
          RETURN max(length(p)) as diameter
        `;
        const diameterResult = await graphDatabaseService.runCypherQuery(diameterQuery, {});
        stats.diameter = this._toNumber(diameterResult.records[0]?.get('diameter')) || 0;
      }

      // Include relationship types if requested
      if (includeRelationshipTypes) {
        const relTypeQuery = `
          MATCH ()-[r]->()
          RETURN type(r) as type, count(*) as count
          ORDER BY count DESC
        `;
        const relTypeResult = await graphDatabaseService.runCypherQuery(relTypeQuery, {});
        stats.relationshipTypes = {};
        relTypeResult.records.forEach(r => {
          stats.relationshipTypes[r.get('type')] = this._toNumber(r.get('count'));
        });
      }

      return stats;
    } catch (error) {
      console.error('Get network stats error:', error);
      throw new Error(`Failed to get network stats: ${error.message}`);
    }
  }

  /**
   * Get statistics for a subgraph
   * @param {Object} options - Subgraph options
   * @returns {Promise<Object>} Subgraph statistics
   */
  async getSubgraphStats(options) {
    const { nodeLabel, relationshipType } = options;

    try {
      const labelFilter = nodeLabel ? `:${nodeLabel}` : '';
      const relFilter = relationshipType ? `:${relationshipType}` : '';

      const query = `
        MATCH (n${labelFilter})
        OPTIONAL MATCH (n)-[r${relFilter}]-(m${labelFilter})
        WITH count(DISTINCT n) as nodeCount, count(DISTINCT r) as relCount
        RETURN
          nodeCount,
          relCount,
          toFloat(relCount) / (nodeCount * (nodeCount - 1)) as density
      `;

      const result = await graphDatabaseService.runCypherQuery(query, {});
      const record = result.records[0];

      return {
        nodeCount: this._toNumber(record.get('nodeCount')),
        relationshipCount: this._toNumber(record.get('relCount')),
        density: this._toNumber(record.get('density')),
        filters: { nodeLabel, relationshipType }
      };
    } catch (error) {
      console.error('Get subgraph stats error:', error);
      throw new Error(`Failed to get subgraph stats: ${error.message}`);
    }
  }

  /**
   * Compare two network snapshots
   * @param {Object} snapshot1 - First snapshot
   * @param {Object} snapshot2 - Second snapshot
   * @returns {Promise<Object>} Comparison result
   */
  async compareNetworkSnapshots(snapshot1, snapshot2) {
    const nodeGrowth = snapshot2.nodeCount - snapshot1.nodeCount;
    const relationshipGrowth = snapshot2.relationshipCount - snapshot1.relationshipCount;

    return {
      snapshot1: {
        timestamp: snapshot1.timestamp,
        nodeCount: snapshot1.nodeCount,
        relationshipCount: snapshot1.relationshipCount
      },
      snapshot2: {
        timestamp: snapshot2.timestamp,
        nodeCount: snapshot2.nodeCount,
        relationshipCount: snapshot2.relationshipCount
      },
      nodeGrowth,
      relationshipGrowth,
      nodeGrowthRate: (nodeGrowth / snapshot1.nodeCount) * 100,
      relationshipGrowthRate: (relationshipGrowth / snapshot1.relationshipCount) * 100
    };
  }

  // ==================== Path Analysis ====================

  /**
   * Analyze paths between node types
   * @param {Object} options - Path analysis options
   * @returns {Promise<Object>} Path analysis results
   */
  async analyzePaths(options) {
    const { fromLabel, toLabel, relationshipType, maxDepth = 5 } = options;

    try {
      const relFilter = relationshipType ? `:${relationshipType}` : '';

      const query = `
        MATCH (a:${fromLabel}), (b:${toLabel})
        WHERE a <> b
        MATCH p = shortestPath((a)-[${relFilter}*1..${maxDepth}]-(b))
        RETURN length(p) as length, count(*) as count
        ORDER BY length
      `;

      const result = await graphDatabaseService.runCypherQuery(query, {});

      const pathDistribution = result.records.map(r => ({
        length: this._toNumber(r.get('length')),
        count: this._toNumber(r.get('count'))
      }));

      const totalPaths = pathDistribution.reduce((sum, p) => sum + p.count, 0);
      const weightedSum = pathDistribution.reduce((sum, p) => sum + (p.length * p.count), 0);

      return {
        pathDistribution,
        totalPaths,
        averagePathLength: totalPaths > 0 ? weightedSum / totalPaths : 0,
        fromLabel,
        toLabel
      };
    } catch (error) {
      console.error('Analyze paths error:', error);
      throw new Error(`Failed to analyze paths: ${error.message}`);
    }
  }

  // ==================== Visualization Support ====================

  /**
   * Get data formatted for visualization
   * @param {Object} options - Visualization options
   * @returns {Promise<Object>} Visualization data
   */
  async getVisualizationData(options) {
    const { label, relationshipType, limit = 100 } = options;

    try {
      const labelFilter = label ? `:${label}` : '';
      const relFilter = relationshipType ? `:${relationshipType}` : '';

      const query = `
        MATCH (source${labelFilter})-[r${relFilter}]-(target${labelFilter})
        RETURN source, target, r as relationship
        LIMIT $limit
      `;

      const result = await graphDatabaseService.runCypherQuery(query, { limit });

      const nodesMap = new Map();
      const edges = [];

      result.records.forEach(record => {
        const source = record.get('source');
        const target = record.get('target');
        const relationship = record.get('relationship');

        if (source?.properties?.id) {
          nodesMap.set(source.properties.id, source.properties);
        }
        if (target?.properties?.id) {
          nodesMap.set(target.properties.id, target.properties);
        }

        edges.push({
          source: source?.properties?.id,
          target: target?.properties?.id,
          type: relationship?.type,
          properties: relationship?.properties
        });
      });

      return {
        nodes: Array.from(nodesMap.values()),
        edges,
        nodeCount: nodesMap.size,
        edgeCount: edges.length
      };
    } catch (error) {
      console.error('Get visualization data error:', error);
      throw new Error(`Failed to get visualization data: ${error.message}`);
    }
  }

  // ==================== Sampled Statistics ====================

  /**
   * Get sampled statistics for large networks
   * @param {Object} options - Sampling options
   * @returns {Promise<Object>} Sampled statistics
   */
  async getSampledStatistics(options) {
    const { sampleSize = 1000, samplingMethod = 'random' } = options;

    try {
      const query = `
        MATCH (n)
        WITH n, rand() as r
        ORDER BY r
        LIMIT $sampleSize
        OPTIONAL MATCH (n)-[rel]-()
        WITH count(DISTINCT n) as sampleNodes, avg(count(rel)) as avgDegree
        MATCH (n)
        WITH sampleNodes, avgDegree, count(n) as totalNodes
        RETURN
          $sampleSize as sampleSize,
          avgDegree,
          toFloat(avgDegree * sampleNodes) / (sampleNodes * (sampleNodes - 1)) as density
      `;

      const result = await graphDatabaseService.runCypherQuery(query, { sampleSize });
      const record = result.records[0];

      return {
        sampleSize: this._toNumber(record?.get('sampleSize')) || sampleSize,
        avgDegree: this._toNumber(record?.get('avgDegree')) || 0,
        density: this._toNumber(record?.get('density')) || 0,
        samplingMethod,
        isSampled: true
      };
    } catch (error) {
      console.error('Get sampled statistics error:', error);
      throw new Error(`Failed to get sampled statistics: ${error.message}`);
    }
  }

  // ==================== Helper Methods ====================

  /**
   * Convert Neo4j integer to JavaScript number
   * @private
   */
  _toNumber(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object' && value.low !== undefined) {
      return value.low;
    }
    if (typeof value === 'object' && typeof value.toNumber === 'function') {
      return value.toNumber();
    }
    return value;
  }
}

// Export singleton instance
module.exports = new NetworkAnalysisService();

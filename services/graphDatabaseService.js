/**
 * Graph Database Service
 *
 * [Feature] Issue #49: Complete Graph Database (Neo4j) Integration
 * Provides core graph database operations using Neo4j driver including:
 * - Node creation and management
 * - Relationship creation and management
 * - Path finding algorithms
 * - Cypher query execution
 */

const neo4j = require('neo4j-driver');

class GraphDatabaseService {
  constructor() {
    this._driver = null;
    this._initialized = false;
    this._config = {
      uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
      username: process.env.NEO4J_USERNAME || 'neo4j',
      password: process.env.NEO4J_PASSWORD || 'password',
      database: process.env.NEO4J_DATABASE || 'neo4j'
    };
  }

  /**
   * Initialize connection to Neo4j database
   * @param {Object} config - Connection configuration
   * @param {string} config.uri - Neo4j bolt URI
   * @param {string} config.username - Database username
   * @param {string} config.password - Database password
   * @returns {Promise<void>}
   */
  async initialize(config = {}) {
    if (this._initialized) {
      return;
    }

    const finalConfig = { ...this._config, ...config };

    try {
      this._driver = neo4j.driver(
        finalConfig.uri,
        neo4j.auth.basic(finalConfig.username, finalConfig.password),
        {
          maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
          maxConnectionPoolSize: 50,
          connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
          disableLosslessIntegers: true
        }
      );

      await this._driver.verifyConnectivity();
      this._initialized = true;
      console.log('Neo4j connection initialized successfully');
    } catch (error) {
      console.error('Neo4j connection error:', error);
      throw new Error(`Failed to initialize Neo4j connection: ${error.message}`);
    }
  }

  /**
   * Close the database connection
   * @returns {Promise<void>}
   */
  async close() {
    if (this._driver) {
      await this._driver.close();
      this._driver = null;
      this._initialized = false;
    }
  }

  /**
   * Get a new session
   * @param {Object} options - Session options
   * @returns {Object} Neo4j session
   */
  getSession(options = {}) {
    if (!this._initialized || !this._driver) {
      throw new Error('Graph database not initialized. Call initialize() first.');
    }
    return this._driver.session(options);
  }

  // ==================== Node Operations ====================

  /**
   * Create a node with label(s) and properties
   * @param {string|string[]} labels - Node label(s)
   * @param {Object} properties - Node properties
   * @returns {Promise<Object>} Created node
   */
  async createNode(labels, properties) {
    if (!labels) {
      throw new Error('Label is required');
    }
    if (!properties || typeof properties !== 'object') {
      throw new Error('Properties must be an object');
    }

    const labelString = Array.isArray(labels) ? labels.join(':') : labels;
    const session = this.getSession();

    try {
      const query = `CREATE (n:${labelString} $properties) RETURN n`;
      const result = await session.run(query, { properties });

      if (result.records.length === 0) {
        throw new Error('Node creation failed');
      }

      const node = result.records[0].get('n');
      return this._formatNode(node);
    } catch (error) {
      console.error('Create node error:', error);
      throw new Error(`Failed to create node: ${error.message}`);
    } finally {
      await session.close();
    }
  }

  /**
   * Get a node by label and ID
   * @param {string} label - Node label
   * @param {string} id - Node ID property value
   * @returns {Promise<Object|null>} Found node or null
   */
  async getNode(label, id) {
    const session = this.getSession();

    try {
      const query = `MATCH (n:${label} {id: $id}) RETURN n`;
      const result = await session.run(query, { id });

      if (result.records.length === 0) {
        return null;
      }

      return this._formatNode(result.records[0].get('n'));
    } catch (error) {
      console.error('Get node error:', error);
      throw new Error(`Failed to get node: ${error.message}`);
    } finally {
      await session.close();
    }
  }

  /**
   * Update node properties
   * @param {string} label - Node label
   * @param {string} id - Node ID
   * @param {Object} properties - Properties to update
   * @returns {Promise<Object>} Updated node
   */
  async updateNode(label, id, properties) {
    const session = this.getSession();

    try {
      const setClause = Object.keys(properties)
        .map(key => `n.${key} = $properties.${key}`)
        .join(', ');

      const query = `
        MATCH (n:${label} {id: $id})
        SET ${setClause}
        RETURN n
      `;

      const result = await session.run(query, { id, properties });

      if (result.records.length === 0) {
        throw new Error('Node not found');
      }

      return this._formatNode(result.records[0].get('n'));
    } catch (error) {
      if (error.message === 'Node not found') {
        throw error;
      }
      console.error('Update node error:', error);
      throw new Error(`Failed to update node: ${error.message}`);
    } finally {
      await session.close();
    }
  }

  /**
   * Delete a node
   * @param {string} label - Node label
   * @param {string} id - Node ID
   * @param {Object} options - Delete options
   * @param {boolean} options.detach - Whether to delete relationships too
   * @returns {Promise<Object>} Delete result
   */
  async deleteNode(label, id, options = {}) {
    const session = this.getSession();

    try {
      const deleteClause = options.detach ? 'DETACH DELETE n' : 'DELETE n';
      const query = `MATCH (n:${label} {id: $id}) ${deleteClause}`;

      await session.run(query, { id });

      return { deleted: true };
    } catch (error) {
      console.error('Delete node error:', error);
      throw new Error(`Failed to delete node: ${error.message}`);
    } finally {
      await session.close();
    }
  }

  /**
   * Find nodes matching criteria
   * @param {string} label - Node label
   * @param {Object} criteria - Filter criteria
   * @param {Object} options - Query options
   * @returns {Promise<Object[]>} Found nodes
   */
  async findNodes(label, criteria = {}, options = {}) {
    const session = this.getSession();

    try {
      let whereClause = '';
      const params = {};

      if (Object.keys(criteria).length > 0) {
        const conditions = Object.entries(criteria).map(([key, value], index) => {
          params[`param${index}`] = value;
          return `n.${key} = $param${index}`;
        });
        whereClause = `WHERE ${conditions.join(' AND ')}`;
      }

      let query = `MATCH (n:${label}) ${whereClause}`;

      if (options.orderBy) {
        const direction = options.order === 'DESC' ? 'DESC' : 'ASC';
        query += ` ORDER BY n.${options.orderBy} ${direction}`;
      }

      if (options.skip !== undefined) {
        params.skip = neo4j.int(options.skip);
        query += ` SKIP $skip`;
      }

      if (options.limit !== undefined) {
        params.limit = neo4j.int(options.limit);
        query += ` LIMIT $limit`;
      }

      query += ' RETURN n';

      const result = await session.run(query, params);

      return result.records.map(record => this._formatNode(record.get('n')));
    } catch (error) {
      console.error('Find nodes error:', error);
      throw new Error(`Failed to find nodes: ${error.message}`);
    } finally {
      await session.close();
    }
  }

  // ==================== Relationship Operations ====================

  /**
   * Create a relationship between two nodes
   * @param {Object} from - Source node {label, id}
   * @param {Object} to - Target node {label, id}
   * @param {string} type - Relationship type
   * @param {Object} properties - Relationship properties
   * @returns {Promise<Object>} Created relationship
   */
  async createRelationship(from, to, type, properties = {}) {
    if (!from || !to) {
      throw new Error('Both from and to nodes are required');
    }
    if (!type) {
      throw new Error('Relationship type is required');
    }

    const session = this.getSession();

    try {
      const propClause = Object.keys(properties).length > 0
        ? ' $properties'
        : '';

      const query = `
        MATCH (a:${from.label} {id: $fromId})
        MATCH (b:${to.label} {id: $toId})
        CREATE (a)-[r:${type}${propClause}]->(b)
        RETURN r
      `;

      const params = {
        fromId: from.id,
        toId: to.id
      };

      if (Object.keys(properties).length > 0) {
        params.properties = properties;
      }

      const result = await session.run(query, params);

      if (result.records.length === 0) {
        throw new Error('Relationship creation failed - nodes not found');
      }

      return this._formatRelationship(result.records[0].get('r'));
    } catch (error) {
      console.error('Create relationship error:', error);
      throw new Error(`Failed to create relationship: ${error.message}`);
    } finally {
      await session.close();
    }
  }

  /**
   * Get a relationship by ID
   * @param {number} relationshipId - Relationship ID
   * @returns {Promise<Object|null>} Found relationship or null
   */
  async getRelationship(relationshipId) {
    const session = this.getSession();

    try {
      const query = `
        MATCH ()-[r]->()
        WHERE id(r) = $relationshipId
        RETURN r
      `;

      const result = await session.run(query, { relationshipId: neo4j.int(relationshipId) });

      if (result.records.length === 0) {
        return null;
      }

      return this._formatRelationship(result.records[0].get('r'));
    } catch (error) {
      console.error('Get relationship error:', error);
      throw new Error(`Failed to get relationship: ${error.message}`);
    } finally {
      await session.close();
    }
  }

  /**
   * Delete a relationship by ID
   * @param {number} relationshipId - Relationship ID
   * @returns {Promise<Object>} Delete result
   */
  async deleteRelationship(relationshipId) {
    const session = this.getSession();

    try {
      const query = `
        MATCH ()-[r]->()
        WHERE id(r) = $relationshipId
        DELETE r
      `;

      await session.run(query, { relationshipId: neo4j.int(relationshipId) });

      return { deleted: true };
    } catch (error) {
      console.error('Delete relationship error:', error);
      throw new Error(`Failed to delete relationship: ${error.message}`);
    } finally {
      await session.close();
    }
  }

  /**
   * Find relationships between nodes
   * @param {Object} from - Source node filter
   * @param {Object} to - Target node filter
   * @param {string} type - Relationship type
   * @returns {Promise<Object[]>} Found relationships
   */
  async findRelationships(from, to, type) {
    const session = this.getSession();

    try {
      const fromLabel = from.label ? `:${from.label}` : '';
      const toLabel = to.label ? `:${to.label}` : '';
      const relType = type ? `:${type}` : '';

      const query = `
        MATCH (a${fromLabel})-[r${relType}]->(b${toLabel})
        RETURN r
      `;

      const result = await session.run(query, {});

      return result.records.map(record => this._formatRelationship(record.get('r')));
    } catch (error) {
      console.error('Find relationships error:', error);
      throw new Error(`Failed to find relationships: ${error.message}`);
    } finally {
      await session.close();
    }
  }

  // ==================== Path Finding ====================

  /**
   * Find shortest path between two nodes
   * @param {Object} from - Source node {label, id}
   * @param {Object} to - Target node {label, id}
   * @param {Object} options - Path finding options
   * @returns {Promise<Object|null>} Shortest path or null
   */
  async findShortestPath(from, to, options = {}) {
    const session = this.getSession();

    try {
      const maxDepth = options.maxDepth || 10;
      const relTypes = options.relationshipTypes
        ? `:${options.relationshipTypes.join('|')}`
        : '';

      const query = `
        MATCH (a:${from.label} {id: $fromId}), (b:${to.label} {id: $toId})
        MATCH p = shortestPath((a)-[${relTypes}*..${maxDepth}]-(b))
        RETURN p
      `;

      const result = await session.run(query, {
        fromId: from.id,
        toId: to.id
      });

      if (result.records.length === 0) {
        return null;
      }

      return this._formatPath(result.records[0].get('p'));
    } catch (error) {
      if (error.message.includes('no path')) {
        return null;
      }
      console.error('Find shortest path error:', error);
      throw new Error(`Failed to find shortest path: ${error.message}`);
    } finally {
      await session.close();
    }
  }

  /**
   * Find all paths between two nodes
   * @param {Object} from - Source node
   * @param {Object} to - Target node
   * @param {Object} options - Path finding options
   * @returns {Promise<Object[]>} All paths
   */
  async findAllPaths(from, to, options = {}) {
    const session = this.getSession();

    try {
      const maxDepth = options.maxDepth || 5;
      const relTypes = options.relationshipTypes
        ? `:${options.relationshipTypes.join('|')}`
        : '';

      const query = `
        MATCH (a:${from.label} {id: $fromId}), (b:${to.label} {id: $toId})
        MATCH p = allShortestPaths((a)-[${relTypes}*..${maxDepth}]-(b))
        RETURN p
      `;

      const result = await session.run(query, {
        fromId: from.id,
        toId: to.id
      });

      return result.records.map(record => this._formatPath(record.get('p')));
    } catch (error) {
      console.error('Find all paths error:', error);
      throw new Error(`Failed to find all paths: ${error.message}`);
    } finally {
      await session.close();
    }
  }

  // ==================== Related Nodes ====================

  /**
   * Get all related nodes
   * @param {Object} node - Source node {label, id}
   * @param {Object} options - Query options
   * @returns {Promise<Object[]>} Related nodes with relationships
   */
  async getRelatedNodes(node, options = {}) {
    const session = this.getSession();

    try {
      const depth = options.depth || 1;
      const relType = options.relationshipType ? `:${options.relationshipType}` : '';
      const relatedLabel = options.relatedLabel ? `:${options.relatedLabel}` : '';

      let directionPattern;
      switch (options.direction) {
        case 'INCOMING':
          directionPattern = '<-[rel' + relType + ']-';
          break;
        case 'OUTGOING':
          directionPattern = '-[rel' + relType + ']->';
          break;
        default:
          directionPattern = '-[rel' + relType + ']-';
      }

      const depthPattern = depth > 1 ? `*1..${depth}` : '';
      const fullPattern = directionPattern.replace(']-', `${depthPattern}]-`);

      const query = `
        MATCH (n:${node.label} {id: $id})${fullPattern}(related${relatedLabel})
        RETURN related, rel
      `;

      const result = await session.run(query, { id: node.id });

      return result.records.map(record => ({
        node: this._formatNode(record.get('related')),
        relationship: this._formatRelationship(record.get('rel'))
      }));
    } catch (error) {
      console.error('Get related nodes error:', error);
      throw new Error(`Failed to get related nodes: ${error.message}`);
    } finally {
      await session.close();
    }
  }

  // ==================== Cypher Query Execution ====================

  /**
   * Execute a Cypher query
   * @param {string} query - Cypher query string
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async runCypherQuery(query, params = {}) {
    if (!query || query.trim() === '') {
      throw new Error('Query is required');
    }

    const session = this.getSession();

    try {
      const startTime = Date.now();
      const result = await session.run(query, params);
      const executionTime = Date.now() - startTime;

      return {
        records: result.records.map(record => ({
          keys: record.keys,
          get: (key) => record.get(key),
          toObject: () => {
            const obj = {};
            record.keys.forEach(key => {
              obj[key] = record.get(key);
            });
            return obj;
          }
        })),
        summary: result.summary,
        executionTime
      };
    } catch (error) {
      console.error('Cypher query error:', error);
      throw new Error(`Failed to execute Cypher query: ${error.message}`);
    } finally {
      await session.close();
    }
  }

  /**
   * Execute a read-only Cypher query
   * @param {string} query - Cypher query
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async runCypherQueryRead(query, params = {}) {
    return this.runCypherQuery(query, params);
  }

  /**
   * Execute a write Cypher query
   * @param {string} query - Cypher query
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async runCypherQueryWrite(query, params = {}) {
    return this.runCypherQuery(query, params);
  }

  // ==================== Batch Operations ====================

  /**
   * Create multiple nodes in a batch
   * @param {string} label - Node label
   * @param {Object[]} nodes - Array of node properties
   * @returns {Promise<Object[]>} Created nodes
   */
  async batchCreateNodes(label, nodes) {
    if (!nodes || nodes.length === 0) {
      throw new Error('Nodes array cannot be empty');
    }

    const session = this.getSession();

    try {
      const query = `
        UNWIND $nodes as node
        CREATE (n:${label})
        SET n = node
        RETURN n
      `;

      const result = await session.run(query, { nodes });

      return result.records.map(record => this._formatNode(record.get('n')));
    } catch (error) {
      console.error('Batch create nodes error:', error);
      throw new Error(`Failed to batch create nodes: ${error.message}`);
    } finally {
      await session.close();
    }
  }

  /**
   * Create multiple relationships in a batch
   * @param {Object[]} relationships - Array of relationship definitions
   * @returns {Promise<Object[]>} Created relationships
   */
  async batchCreateRelationships(relationships) {
    if (!relationships || relationships.length === 0) {
      throw new Error('Relationships array cannot be empty');
    }

    const session = this.getSession();

    try {
      const results = [];

      for (const rel of relationships) {
        const result = await this.createRelationship(
          rel.from,
          rel.to,
          rel.type,
          rel.properties || {}
        );
        results.push(result);
      }

      return results;
    } catch (error) {
      console.error('Batch create relationships error:', error);
      throw new Error(`Failed to batch create relationships: ${error.message}`);
    } finally {
      await session.close();
    }
  }

  // ==================== Graph Statistics ====================

  /**
   * Get graph statistics
   * @returns {Promise<Object>} Graph statistics
   */
  async getGraphStats() {
    const session = this.getSession();

    try {
      // Get node count
      const nodeCountResult = await session.run('MATCH (n) RETURN count(n) as count');
      const nodeCount = this._toNumber(nodeCountResult.records[0].get('count'));

      // Get relationship count
      const relCountResult = await session.run('MATCH ()-[r]->() RETURN count(r) as count');
      const relationshipCount = this._toNumber(relCountResult.records[0].get('count'));

      // Get label counts
      const labelCountsResult = await session.run(`
        CALL db.labels() YIELD label
        CALL apoc.cypher.run('MATCH (n:' + label + ') RETURN count(n) as count', {}) YIELD value
        RETURN label, value.count as count
      `).catch(async () => {
        // Fallback if APOC is not available
        const labels = await session.run('CALL db.labels() YIELD label RETURN label');
        return {
          records: labels.records.map(r => ({
            get: (key) => key === 'label' ? r.get('label') : 0
          }))
        };
      });

      const labelCounts = {};
      for (const record of labelCountsResult.records) {
        const label = record.get('label');
        const count = this._toNumber(record.get('count'));
        labelCounts[label] = count;
      }

      return {
        nodeCount,
        relationshipCount,
        labelCounts
      };
    } catch (error) {
      console.error('Get graph stats error:', error);
      throw new Error(`Failed to get graph stats: ${error.message}`);
    } finally {
      await session.close();
    }
  }

  // ==================== Transaction Support ====================

  /**
   * Execute operations in a transaction
   * @param {Function} operations - Async function receiving transaction
   * @returns {Promise<*>} Operation result
   */
  async runInTransaction(operations) {
    const session = this.getSession();
    const tx = session.beginTransaction();

    try {
      const result = await operations(tx);
      await tx.commit();
      return result;
    } catch (error) {
      await tx.rollback();
      console.error('Transaction error:', error);
      throw new Error(`Transaction failed: ${error.message}`);
    } finally {
      await session.close();
    }
  }

  // ==================== Helper Methods ====================

  /**
   * Format a Neo4j node to a plain object
   * @private
   */
  _formatNode(node) {
    if (!node) return null;

    return {
      id: this._toNumber(node.identity),
      labels: node.labels,
      properties: node.properties
    };
  }

  /**
   * Format a Neo4j relationship to a plain object
   * @private
   */
  _formatRelationship(relationship) {
    if (!relationship) return null;

    return {
      id: this._toNumber(relationship.identity),
      type: relationship.type,
      properties: relationship.properties,
      startNodeId: this._toNumber(relationship.start),
      endNodeId: this._toNumber(relationship.end)
    };
  }

  /**
   * Format a Neo4j path to a plain object
   * @private
   */
  _formatPath(path) {
    if (!path) return null;

    return {
      start: this._formatNode(path.start),
      end: this._formatNode(path.end),
      segments: path.segments.map(segment => ({
        start: this._formatNode(segment.start),
        relationship: this._formatRelationship(segment.relationship),
        end: this._formatNode(segment.end)
      })),
      length: path.length
    };
  }

  /**
   * Convert Neo4j integer to JavaScript number
   * @private
   */
  _toNumber(value) {
    if (value === null || value === undefined) return null;
    if (neo4j.isInt(value)) {
      return value.toNumber();
    }
    if (typeof value === 'object' && value.low !== undefined) {
      return value.low;
    }
    return value;
  }
}

// Export singleton instance
module.exports = new GraphDatabaseService();

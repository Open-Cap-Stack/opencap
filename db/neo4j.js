/**
 * Neo4j Database Connection and Configuration
 * 
 * [Feature] OCAE-402: Graph Database Implementation
 * Handles Neo4j connections, queries, and relationship management
 * for compliance tracking and network analysis
 */

const neo4j = require('neo4j-driver');
const dotenv = require('dotenv');
dotenv.config();

class Neo4jConnection {
  constructor() {
    this.driver = null;
    this.session = null;
    this.isConnected = false;
  }

  /**
   * Initialize Neo4j connection
   */
  async connect() {
    try {
      const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
      const username = process.env.NEO4J_USERNAME || 'neo4j';
      const password = process.env.NEO4J_PASSWORD || 'password';

      this.driver = neo4j.driver(
        uri,
        neo4j.auth.basic(username, password),
        {
          maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
          maxConnectionPoolSize: 50,
          connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
          disableLosslessIntegers: true
        }
      );

      // Test connection
      await this.verifyConnection();
      this.isConnected = true;
      
      console.log('Neo4j connected successfully');
      return this.driver;
    } catch (error) {
      console.error('Neo4j connection failed:', error);
      throw error;
    }
  }

  /**
   * Verify Neo4j connection
   */
  async verifyConnection() {
    const session = this.driver.session();
    try {
      await session.run('RETURN 1');
      console.log('Neo4j connection verified');
    } catch (error) {
      console.error('Neo4j connection verification failed:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Get a new session
   */
  getSession(database = 'neo4j') {
    if (!this.driver) {
      throw new Error('Neo4j driver not initialized. Call connect() first.');
    }
    return this.driver.session({ database });
  }

  /**
   * Close the connection
   */
  async close() {
    if (this.driver) {
      await this.driver.close();
      this.isConnected = false;
      console.log('Neo4j connection closed');
    }
  }

  /**
   * Execute a read query
   */
  async executeRead(query, parameters = {}) {
    const session = this.getSession();
    try {
      const result = await session.executeRead(tx => tx.run(query, parameters));
      return result.records.map(record => record.toObject());
    } catch (error) {
      console.error('Neo4j read query failed:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Execute a write query
   */
  async executeWrite(query, parameters = {}) {
    const session = this.getSession();
    try {
      const result = await session.executeWrite(tx => tx.run(query, parameters));
      return result.records.map(record => record.toObject());
    } catch (error) {
      console.error('Neo4j write query failed:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Execute multiple queries in a transaction
   */
  async executeTransaction(queries) {
    const session = this.getSession();
    try {
      const results = await session.executeWrite(async tx => {
        const queryResults = [];
        for (const { query, parameters } of queries) {
          const result = await tx.run(query, parameters);
          queryResults.push(result.records.map(record => record.toObject()));
        }
        return queryResults;
      });
      return results;
    } catch (error) {
      console.error('Neo4j transaction failed:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Initialize database schema and constraints
   */
  async initializeSchema() {
    const constraints = [
      // Company constraints
      'CREATE CONSTRAINT company_id IF NOT EXISTS FOR (c:Company) REQUIRE c.id IS UNIQUE',
      'CREATE CONSTRAINT company_name IF NOT EXISTS FOR (c:Company) REQUIRE c.name IS NOT NULL',
      
      // User constraints
      'CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE',
      'CREATE CONSTRAINT user_email IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE',
      
      // Document constraints
      'CREATE CONSTRAINT document_id IF NOT EXISTS FOR (d:Document) REQUIRE d.id IS UNIQUE',
      
      // Compliance constraints
      'CREATE CONSTRAINT compliance_id IF NOT EXISTS FOR (c:Compliance) REQUIRE c.id IS UNIQUE',
      
      // Transaction constraints
      'CREATE CONSTRAINT transaction_id IF NOT EXISTS FOR (t:Transaction) REQUIRE t.id IS UNIQUE'
    ];

    const indexes = [
      // Performance indexes
      'CREATE INDEX company_industry IF NOT EXISTS FOR (c:Company) ON (c.industry)',
      'CREATE INDEX document_type IF NOT EXISTS FOR (d:Document) ON (d.documentType)',
      'CREATE INDEX compliance_status IF NOT EXISTS FOR (c:Compliance) ON (c.status)',
      'CREATE INDEX transaction_date IF NOT EXISTS FOR (t:Transaction) ON (t.date)',
      'CREATE INDEX user_role IF NOT EXISTS FOR (u:User) ON (u.role)'
    ];

    try {
      // Create constraints
      for (const constraint of constraints) {
        await this.executeWrite(constraint);
      }
      
      // Create indexes
      for (const index of indexes) {
        await this.executeWrite(index);
      }
      
      console.log('Neo4j schema initialized successfully');
    } catch (error) {
      console.error('Neo4j schema initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create or update a node
   */
  async createOrUpdateNode(label, properties, uniqueKey = 'id') {
    const query = `
      MERGE (n:${label} {${uniqueKey}: $${uniqueKey}})
      SET n += $properties
      RETURN n
    `;
    
    const parameters = {
      [uniqueKey]: properties[uniqueKey],
      properties
    };
    
    return await this.executeWrite(query, parameters);
  }

  /**
   * Create a relationship between two nodes
   */
  async createRelationship(fromLabel, fromId, toLabel, toId, relationshipType, properties = {}) {
    const query = `
      MATCH (from:${fromLabel} {id: $fromId})
      MATCH (to:${toLabel} {id: $toId})
      MERGE (from)-[r:${relationshipType}]->(to)
      SET r += $properties
      RETURN r
    `;
    
    const parameters = {
      fromId,
      toId,
      properties
    };
    
    return await this.executeWrite(query, parameters);
  }

  /**
   * Find nodes by label and properties
   */
  async findNodes(label, properties = {}, limit = 100) {
    const whereClause = Object.keys(properties).length > 0 
      ? `WHERE ${Object.keys(properties).map(key => `n.${key} = $${key}`).join(' AND ')}`
      : '';
    
    const query = `
      MATCH (n:${label})
      ${whereClause}
      RETURN n
      LIMIT $limit
    `;
    
    const parameters = {
      ...properties,
      limit
    };
    
    return await this.executeRead(query, parameters);
  }

  /**
   * Find relationships
   */
  async findRelationships(fromLabel, toLabel, relationshipType, properties = {}) {
    const whereClause = Object.keys(properties).length > 0 
      ? `WHERE ${Object.keys(properties).map(key => `r.${key} = $${key}`).join(' AND ')}`
      : '';
    
    const query = `
      MATCH (from:${fromLabel})-[r:${relationshipType}]->(to:${toLabel})
      ${whereClause}
      RETURN from, r, to
    `;
    
    return await this.executeRead(query, properties);
  }

  /**
   * Get node neighbors
   */
  async getNeighbors(nodeLabel, nodeId, relationshipType = null, depth = 1) {
    const relationshipClause = relationshipType ? `[r:${relationshipType}]` : '[r]';
    const depthClause = depth > 1 ? `*1..${depth}` : '';
    
    const query = `
      MATCH (n:${nodeLabel} {id: $nodeId})-${relationshipClause}${depthClause}-(neighbor)
      RETURN DISTINCT neighbor, r
    `;
    
    const parameters = { nodeId };
    
    return await this.executeRead(query, parameters);
  }

  /**
   * Calculate shortest path between two nodes
   */
  async shortestPath(fromLabel, fromId, toLabel, toId, relationshipType = null) {
    const relationshipClause = relationshipType ? `[r:${relationshipType}]` : '[r]';
    
    const query = `
      MATCH (from:${fromLabel} {id: $fromId}), (to:${toLabel} {id: $toId})
      MATCH path = shortestPath((from)-${relationshipClause}*-(to))
      RETURN path
    `;
    
    const parameters = { fromId, toId };
    
    return await this.executeRead(query, parameters);
  }

  /**
   * Get node degree (number of connections)
   */
  async getNodeDegree(nodeLabel, nodeId) {
    const query = `
      MATCH (n:${nodeLabel} {id: $nodeId})
      RETURN 
        size((n)--()) as totalDegree,
        size((n)-->()) as outDegree,
        size((n)<--()) as inDegree
    `;
    
    const parameters = { nodeId };
    
    return await this.executeRead(query, parameters);
  }

  /**
   * Detect communities using simple clustering
   */
  async detectCommunities(nodeLabel, relationshipType = null) {
    const relationshipClause = relationshipType ? `[r:${relationshipType}]` : '[r]';
    
    const query = `
      MATCH (n:${nodeLabel})-${relationshipClause}-(connected:${nodeLabel})
      WITH n, collect(connected) as neighbors
      RETURN n, neighbors, size(neighbors) as degree
      ORDER BY degree DESC
    `;
    
    return await this.executeRead(query);
  }

  /**
   * Delete a node and all its relationships
   */
  async deleteNode(nodeLabel, nodeId) {
    const query = `
      MATCH (n:${nodeLabel} {id: $nodeId})
      DETACH DELETE n
    `;
    
    const parameters = { nodeId };
    
    return await this.executeWrite(query, parameters);
  }

  /**
   * Delete a relationship
   */
  async deleteRelationship(fromLabel, fromId, toLabel, toId, relationshipType) {
    const query = `
      MATCH (from:${fromLabel} {id: $fromId})-[r:${relationshipType}]->(to:${toLabel} {id: $toId})
      DELETE r
    `;
    
    const parameters = { fromId, toId };
    
    return await this.executeWrite(query, parameters);
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    const queries = [
      'MATCH (n) RETURN count(n) as nodeCount',
      'MATCH ()-[r]->() RETURN count(r) as relationshipCount',
      'CALL db.labels() YIELD label RETURN collect(label) as labels',
      'CALL db.relationshipTypes() YIELD relationshipType RETURN collect(relationshipType) as relationshipTypes'
    ];
    
    const results = {};
    
    for (const query of queries) {
      const result = await this.executeRead(query);
      if (query.includes('nodeCount')) results.nodeCount = result[0].nodeCount;
      else if (query.includes('relationshipCount')) results.relationshipCount = result[0].relationshipCount;
      else if (query.includes('labels')) results.labels = result[0].labels;
      else if (query.includes('relationshipTypes')) results.relationshipTypes = result[0].relationshipTypes;
    }
    
    return results;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      await this.executeRead('RETURN 1 as health');
      return { status: 'healthy', connected: this.isConnected };
    } catch (error) {
      return { status: 'unhealthy', error: error.message, connected: false };
    }
  }
}

// Create singleton instance
const neo4jConnection = new Neo4jConnection();

// Auto-connect if environment variables are set
if (process.env.NEO4J_URI && process.env.NEO4J_USERNAME && process.env.NEO4J_PASSWORD) {
  neo4jConnection.connect().catch(console.error);
}

module.exports = neo4jConnection;
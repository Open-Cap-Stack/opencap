/**
 * ZeroDB Service Layer
 * 
 * Provides integration with ZeroDB API for lakehouse functionality
 * including vector search, real-time streaming, and memory management
 */

const axios = require('axios');
const config = require('../config');

class ZeroDBService {
  constructor() {
    this.baseURL = 'https://api.ainative.studio/api/v1';
    this.projectId = null;
    this.token = null;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Add request interceptor for authentication
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('ZeroDB API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }
  
  /**
   * Initialize ZeroDB service with authentication
   * @param {string} token - JWT token for authentication
   */
  async initialize(token) {
    this.token = token;
    
    try {
      // Create or get OpenCap project
      const project = await this.initializeProject();
      this.projectId = project.id;
      
      // Check database status
      const dbStatus = await this.getDatabaseStatus();
      console.log('ZeroDB initialized successfully:', {
        projectId: this.projectId,
        databaseStatus: dbStatus
      });
      
      return {
        projectId: this.projectId,
        databaseStatus: dbStatus
      };
    } catch (error) {
      console.error('Failed to initialize ZeroDB:', error);
      throw error;
    }
  }
  
  /**
   * Initialize OpenCap project in ZeroDB
   * @returns {Object} Project details
   */
  async initializeProject() {
    try {
      // Check if OpenCap project already exists
      const projects = await this.client.get('/projects/');
      const existingProject = projects.data.find(p => p.name === 'OpenCap');
      
      if (existingProject) {
        return existingProject;
      }
      
      // Create new OpenCap project
      const response = await this.client.post('/projects/', {
        name: 'OpenCap',
        description: 'OpenCap Financial Management System with Lakehouse Analytics'
      });
      
      return response.data;
    } catch (error) {
      console.error('Error initializing project:', error);
      throw error;
    }
  }
  
  /**
   * Get database status for the project
   * @returns {Object} Database status
   */
  async getDatabaseStatus() {
    try {
      const response = await this.client.get(`/projects/${this.projectId}/database/status`);
      return response.data;
    } catch (error) {
      console.error('Error getting database status:', error);
      throw error;
    }
  }
  
  /**
   * Create a table in ZeroDB
   * @param {string} tableName - Name of the table
   * @param {Object} schemaDefinition - Table schema
   * @returns {Object} Created table details
   */
  async createTable(tableName, schemaDefinition) {
    try {
      const response = await this.client.post(`/projects/${this.projectId}/database/tables`, {
        table_name: tableName,
        schema_definition: schemaDefinition
      });
      return response.data;
    } catch (error) {
      console.error('Error creating table:', error);
      throw error;
    }
  }
  
  /**
   * List all tables in the project
   * @returns {Array} List of tables
   */
  async listTables() {
    try {
      const response = await this.client.get(`/projects/${this.projectId}/database/tables`);
      return response.data;
    } catch (error) {
      console.error('Error listing tables:', error);
      throw error;
    }
  }

  /**
   * Insert rows into a table
   * @param {string} tableName - Name of the table
   * @param {Array} rows - Array of row objects to insert
   * @returns {Array} Inserted rows
   */
  async insertRows(tableName, rows) {
    try {
      const response = await this.client.post(
        `/projects/${this.projectId}/database/tables/${tableName}/rows`,
        { rows }
      );
      return response.data;
    } catch (error) {
      console.error('Error inserting rows:', error);
      throw error;
    }
  }

  /**
   * Query a table with filters, pagination, and sorting
   * @param {string} tableName - Name of the table
   * @param {Object} options - Query options
   * @param {Object} options.filter - Filter conditions (MongoDB-style)
   * @param {number} options.skip - Number of records to skip
   * @param {number} options.limit - Maximum records to return
   * @param {Object} options.sort - Sort specification
   * @param {Object} options.projection - Field projection
   * @returns {Array} Query results
   */
  async queryTable(tableName, options = {}) {
    try {
      const { filter = {}, skip = 0, limit = 100, sort = {}, projection = {} } = options;
      const response = await this.client.post(
        `/projects/${this.projectId}/database/tables/${tableName}/query`,
        { filter, skip, limit, sort, projection }
      );
      return response.data;
    } catch (error) {
      console.error('Error querying table:', error);
      throw error;
    }
  }

  /**
   * Update rows in a table
   * @param {string} tableName - Name of the table
   * @param {Object} options - Update options
   * @param {Object} options.filter - Filter conditions
   * @param {Object} options.update - Update operations
   * @returns {Object} Update result
   */
  async updateRows(tableName, options) {
    try {
      const { filter, update } = options;
      const response = await this.client.put(
        `/projects/${this.projectId}/database/tables/${tableName}/rows`,
        { filter, update }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating rows:', error);
      throw error;
    }
  }

  /**
   * Delete rows from a table
   * @param {string} tableName - Name of the table
   * @param {Object} options - Delete options
   * @param {Object} options.filter - Filter conditions
   * @returns {Object} Delete result
   */
  async deleteRows(tableName, options) {
    try {
      const { filter } = options;
      const response = await this.client.delete(
        `/projects/${this.projectId}/database/tables/${tableName}/rows`,
        { data: { filter } }
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting rows:', error);
      throw error;
    }
  }

  /**
   * Count rows in a table
   * @param {string} tableName - Name of the table
   * @param {Object} filter - Filter conditions
   * @returns {number} Count of matching rows
   */
  async countRows(tableName, filter = {}) {
    try {
      const response = await this.client.post(
        `/projects/${this.projectId}/database/tables/${tableName}/count`,
        { filter }
      );
      return response.data.count;
    } catch (error) {
      console.error('Error counting rows:', error);
      throw error;
    }
  }
  
  /**
   * Upsert a vector embedding
   * @param {Array} vectorEmbedding - Vector embedding array
   * @param {string} namespace - Vector namespace
   * @param {Object} metadata - Vector metadata
   * @param {string} document - Associated document text
   * @param {string} source - Vector source
   * @returns {Object} Vector details
   */
  async upsertVector(vectorEmbedding, namespace = 'default', metadata = {}, document = '', source = '') {
    try {
      const response = await this.client.post(`/projects/${this.projectId}/database/vectors/upsert`, {
        vector_embedding: vectorEmbedding,
        namespace,
        vector_metadata: metadata,
        document,
        source
      });
      return response.data;
    } catch (error) {
      console.error('Error upserting vector:', error);
      throw error;
    }
  }
  
  /**
   * Search vectors by similarity
   * @param {Array} queryVector - Query vector for similarity search
   * @param {number} limit - Maximum number of results
   * @param {string} namespace - Search namespace
   * @returns {Object} Search results
   */
  async searchVectors(queryVector, limit = 10, namespace = 'default') {
    try {
      const response = await this.client.post(`/projects/${this.projectId}/database/vectors/search`, {
        query_vector: queryVector,
        limit,
        namespace
      });
      return response.data;
    } catch (error) {
      console.error('Error searching vectors:', error);
      throw error;
    }
  }
  
  /**
   * List vectors
   * @param {string} namespace - Filter by namespace
   * @param {number} skip - Number of records to skip
   * @param {number} limit - Maximum records to return
   * @returns {Array} List of vectors
   */
  async listVectors(namespace = 'default', skip = 0, limit = 100) {
    try {
      const response = await this.client.get(`/projects/${this.projectId}/database/vectors`, {
        params: { namespace, skip, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error listing vectors:', error);
      throw error;
    }
  }
  
  /**
   * Store memory record
   * @param {string} agentId - Agent identifier
   * @param {string} sessionId - Session identifier
   * @param {string} role - Role (user/assistant/system)
   * @param {string} content - Memory content
   * @param {Object} metadata - Memory metadata
   * @returns {Object} Memory record
   */
  async storeMemory(agentId, sessionId, role, content, metadata = {}) {
    try {
      const response = await this.client.post(`/projects/${this.projectId}/database/memory/store`, {
        agent_id: agentId,
        session_id: sessionId,
        role,
        content,
        memory_metadata: metadata
      });
      return response.data;
    } catch (error) {
      console.error('Error storing memory:', error);
      throw error;
    }
  }
  
  /**
   * List memory records
   * @param {string} agentId - Filter by agent
   * @param {string} sessionId - Filter by session
   * @param {string} role - Filter by role
   * @param {number} skip - Number of records to skip
   * @param {number} limit - Maximum records to return
   * @returns {Array} List of memory records
   */
  async listMemory(agentId, sessionId, role, skip = 0, limit = 100) {
    try {
      const params = { skip, limit };
      if (agentId) params.agent_id = agentId;
      if (sessionId) params.session_id = sessionId;
      if (role) params.role = role;
      
      const response = await this.client.get(`/projects/${this.projectId}/database/memory`, {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error listing memory:', error);
      throw error;
    }
  }
  
  /**
   * Publish event
   * @param {string} topic - Event topic
   * @param {Object} eventPayload - Event data
   * @returns {Object} Published event
   */
  async publishEvent(topic, eventPayload) {
    try {
      const response = await this.client.post(`/projects/${this.projectId}/database/events/publish`, {
        topic,
        event_payload: eventPayload
      });
      return response.data;
    } catch (error) {
      console.error('Error publishing event:', error);
      throw error;
    }
  }
  
  /**
   * List events
   * @param {string} topic - Filter by topic
   * @param {number} skip - Number of records to skip
   * @param {number} limit - Maximum records to return
   * @returns {Array} List of events
   */
  async listEvents(topic, skip = 0, limit = 100) {
    try {
      const params = { skip, limit };
      if (topic) params.topic = topic;
      
      const response = await this.client.get(`/projects/${this.projectId}/database/events`, {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error listing events:', error);
      throw error;
    }
  }
  
  /**
   * Upload file metadata
   * @param {string} fileKey - File storage key
   * @param {string} fileName - Original filename
   * @param {string} contentType - MIME type
   * @param {number} sizeBytes - File size
   * @param {Object} metadata - File metadata
   * @returns {Object} File record
   */
  async uploadFileMetadata(fileKey, fileName, contentType, sizeBytes, metadata = {}) {
    try {
      const response = await this.client.post(`/projects/${this.projectId}/database/files/upload`, {
        file_key: fileKey,
        file_name: fileName,
        content_type: contentType,
        size_bytes: sizeBytes,
        file_metadata: metadata
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading file metadata:', error);
      throw error;
    }
  }
  
  /**
   * List files
   * @param {number} skip - Number of records to skip
   * @param {number} limit - Maximum records to return
   * @returns {Array} List of files
   */
  async listFiles(skip = 0, limit = 100) {
    try {
      const response = await this.client.get(`/projects/${this.projectId}/database/files`, {
        params: { skip, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }
  
  /**
   * Log RLHF dataset
   * @param {string} inputPrompt - Input prompt
   * @param {string} modelOutput - Model output
   * @param {string} sessionId - Session identifier
   * @param {number} rewardScore - Reward score
   * @param {string} notes - Feedback notes
   * @returns {Object} RLHF dataset record
   */
  async logRLHF(inputPrompt, modelOutput, sessionId, rewardScore, notes = '') {
    try {
      const response = await this.client.post(`/projects/${this.projectId}/database/rlhf/log`, {
        input_prompt: inputPrompt,
        model_output: modelOutput,
        session_id: sessionId,
        reward_score: rewardScore,
        notes
      });
      return response.data;
    } catch (error) {
      console.error('Error logging RLHF:', error);
      throw error;
    }
  }

  /**
   * Store agent log
   * @param {string} agentId - Agent identifier
   * @param {string} sessionId - Session identifier
   * @param {string} logLevel - Log level
   * @param {string} logMessage - Log message
   * @param {Object} rawPayload - Additional log data
   * @returns {Object} Agent log record
   */
  async storeAgentLog(agentId, sessionId, logLevel, logMessage, rawPayload = {}) {
    try {
      const response = await this.client.post(`/projects/${this.projectId}/database/agent/log`, {
        agent_id: agentId,
        session_id: sessionId,
        log_level: logLevel,
        log_message: logMessage,
        raw_payload: rawPayload
      });
      return response.data;
    } catch (error) {
      console.error('Error storing agent log:', error);
      throw error;
    }
  }

  /**
   * List agent logs
   * @param {string} agentId - Filter by agent
   * @param {string} sessionId - Filter by session
   * @param {string} logLevel - Filter by log level
   * @param {number} skip - Number of records to skip
   * @param {number} limit - Maximum records to return
   * @returns {Array} List of agent logs
   */
  async listAgentLogs(agentId, sessionId, logLevel, skip = 0, limit = 100) {
    try {
      const params = { skip, limit };
      if (agentId) params.agent_id = agentId;
      if (sessionId) params.session_id = sessionId;
      if (logLevel) params.log_level = logLevel;

      const response = await this.client.get(`/projects/${this.projectId}/database/agent/logs`, {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error listing agent logs:', error);
      throw error;
    }
  }

  /**
   * Insert row(s) into a table
   * @param {string} tableName - Name of the table
   * @param {Object|Array} rowData - Row data (single object or array of objects)
   * @returns {Object} Insert result with created row IDs
   */
  async insertRow(tableName, rowData) {
    try {
      const response = await this.client.post(
        `/projects/${this.projectId}/database/tables/${tableName}/rows`,
        { rows: Array.isArray(rowData) ? rowData : [rowData] }
      );
      return response.data;
    } catch (error) {
      console.error('Error inserting row:', error);
      throw error;
    }
  }

  /**
   * Query rows from a table
   * @param {string} tableName - Name of the table
   * @param {Object} query - Query filter (MongoDB-style query object)
   * @param {Object} options - Query options (skip, limit, sort)
   * @returns {Array} Query results
   */
  async queryRows(tableName, query = {}, options = {}) {
    try {
      const params = { ...options };
      if (Object.keys(query).length > 0) {
        params.filter = JSON.stringify(query);
      }
      const response = await this.client.get(
        `/projects/${this.projectId}/database/tables/${tableName}/rows`,
        { params }
      );
      return response.data;
    } catch (error) {
      console.error('Error querying rows:', error);
      throw error;
    }
  }

  /**
   * Update rows in a table
   * @param {string} tableName - Name of the table
   * @param {Object} query - Query filter to match rows
   * @param {Object} update - Update operations (MongoDB-style update object)
   * @returns {Object} Update result with count of modified rows
   */
  async updateRows(tableName, query, update) {
    try {
      const response = await this.client.put(
        `/projects/${this.projectId}/database/tables/${tableName}/rows`,
        { filter: query, update }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating rows:', error);
      throw error;
    }
  }

  /**
   * Delete rows from a table
   * @param {string} tableName - Name of the table
   * @param {Object} query - Query filter to match rows
   * @returns {Object} Delete result with count of deleted rows
   */
  async deleteRows(tableName, query) {
    try {
      const response = await this.client.delete(
        `/projects/${this.projectId}/database/tables/${tableName}/rows`,
        { data: { filter: query } }
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting rows:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new ZeroDBService();
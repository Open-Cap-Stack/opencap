/**
 * ZeroDB Service Layer
 *
 * Provides integration with ZeroDB API for lakehouse functionality
 * including vector search, real-time streaming, and memory management.
 * Falls back to in-memory store when remote API is unreachable.
 */

const axios = require('axios');
const config = require('../config');
const { v4: uuidv4 } = require('uuid');

class ZeroDBService {
  constructor() {
    const baseHost = process.env.ZERODB_BASE_URL || 'api.ainative.studio';
    this.baseURL = baseHost.startsWith('http') ? baseHost : `https://${baseHost}`;
    this.projectId = null;
    this.token = process.env.AINATIVE_API_TOKEN || null;
    this.useLocalFallback = false;
    this._localStore = {};  // tableName -> [{ row_id, row_data }]
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
        if (!this.useLocalFallback) {
          // Suppress noisy logs for expected errors (table already exists)
          const detail = error.response?.data?.detail || '';
          if (!detail.includes('UniqueViolation') && !detail.includes('already exists')) {
            console.error('ZeroDB API Error:', error.response?.data || error.message);
          }
        }
        return Promise.reject(error);
      }
    );
  }
  
  /**
   * Retry a ZeroDB API call on transient 502/503/timeout errors.
   * @param {Function} fn - async function to call
   * @param {number} maxAttempts
   * @returns {*} result of fn
   */
  async _withRetry(fn, maxAttempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        const status = err.response?.status;
        const isTransient = status === 502 || status === 503 || status === 504 ||
          err.code === 'ECONNRESET' || err.code === 'ECONNABORTED' ||
          (err.message && err.message.includes('timeout'));
        if (!isTransient || attempt === maxAttempts) throw err;
        lastError = err;
        const delay = 500 * attempt;
        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw lastError;
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
      // Fall back to in-memory store for local development
      if (process.env.NODE_ENV !== 'production') {
        console.warn('⚠️  ZeroDB remote API unreachable, using in-memory fallback');
        console.warn(`   Reason: ${error.message}`);
        this.useLocalFallback = true;
        this.projectId = process.env.ZERODB_PROJECT_ID || 'local-dev';
        return {
          projectId: this.projectId,
          databaseStatus: { status: 'local-fallback' }
        };
      }
      console.error('Failed to initialize ZeroDB:', error.message);
      throw error;
    }
  }
  
  /**
   * Initialize OpenCap project in ZeroDB
   * @returns {Object} Project details
   */
  async initializeProject() {
    try {
      // Use project ID from environment if available
      const envProjectId = process.env.ZERODB_PROJECT_ID;
      if (envProjectId) {
        console.log('Using project ID from environment:', envProjectId);
        const response = await this.client.get(`/api/v1/projects/${envProjectId}`);
        return response.data;
      }

      // Check if OpenCap project already exists
      const projects = await this.client.get('/api/v1/projects');
      const projectList = projects.data.items || projects.data || [];
      const existingProject = projectList.find(p => p.name === 'OpenCap');

      if (existingProject) {
        return existingProject;
      }

      // Create new OpenCap project
      const response = await this.client.post('/api/v1/projects', {
        name: 'OpenCap',
        description: 'OpenCap Financial Management System with Lakehouse Analytics',
        database_enabled: true
      });

      return response.data;
    } catch (error) {
      console.error('Error initializing project:', error.message);
      throw error;
    }
  }
  
  /**
   * Get database status for the project
   * @returns {Object} Database status
   */
  async getDatabaseStatus() {
    try {
      const response = await this.client.get(`/api/v1/projects/${this.projectId}/usage`);
      return response.data;
    } catch (error) {
      console.error('Error getting database status:', error.message);
      // Return a default status if the endpoint doesn't exist
      return { status: 'active' };
    }
  }
  
  /**
   * Create a table in ZeroDB
   * @param {string} tableName - Name of the table
   * @param {Object} schemaDefinition - Table schema
   * @returns {Object} Created table details
   */
  async createTable(tableName, schemaDefinition) {
    if (this.useLocalFallback) {
      if (!this._localStore[tableName]) this._localStore[tableName] = [];
      return { table_name: tableName, schema: schemaDefinition };
    }
    try {
      const response = await this.client.post(`/api/v1/projects/${this.projectId}/database/tables`, {
        table_name: tableName,
        schema: schemaDefinition
      });
      return response.data;
    } catch (error) {
      // Suppress noise for tables that already exist (UniqueViolation)
      const detail = error.response?.data?.detail || error.message || '';
      if (detail.includes('UniqueViolation') || detail.includes('already exists') || error.response?.status === 409) {
        // Table exists — not an error
        return { table_name: tableName, exists: true };
      }
      console.error('Error creating table:', error.message);
      throw error;
    }
  }

  /**
   * Delete a table from ZeroDB
   * @param {string} tableName - Name of the table to delete
   * @returns {Object} Deletion result
   */
  async deleteTable(tableName) {
    try {
      const response = await this.client.delete(`/api/v1/projects/${this.projectId}/database/tables/${tableName}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting table:', error.message);
      throw error;
    }
  }

  /**
   * List all tables in the project
   * @returns {Array} List of tables
   */
  async listTables() {
    if (this.useLocalFallback) {
      return Object.keys(this._localStore).map(name => ({ table_name: name }));
    }
    try {
      const response = await this.client.get(`/api/v1/projects/${this.projectId}/database/tables`);
      return response.data.tables || response.data || [];
    } catch (error) {
      console.error('Error listing tables:', error.message);
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
    if (this.useLocalFallback) {
      if (!this._localStore[tableName]) this._localStore[tableName] = [];
      const results = rows.map(row => {
        const rowId = uuidv4();
        const entry = { row_id: rowId, row_data: { ...row, _id: row._id || rowId } };
        this._localStore[tableName].push(entry);
        return entry;
      });
      return { data: results };
    }
    try {
      // Insert each row individually using row_data format
      const results = [];
      for (const row of rows) {
        const response = await this._withRetry(() => this.client.post(
          `/api/v1/projects/${this.projectId}/database/tables/${tableName}/rows`,
          { row_data: row }
        ));
        results.push(response.data);
      }
      return { data: results };
    } catch (error) {
      console.error('Error inserting rows:', error.message);
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
    if (this.useLocalFallback) {
      return this._localQuery(tableName, options);
    }
    try {
      const { filter = {}, skip = 0, limit = 100, sort = {}, projection = {} } = options;

      // Convert boolean values to strings for ZeroDB JSON field comparisons
      const normalizedFilter = this._normalizeFilterForZeroDB(filter);

      // ZeroDB requires limit >= 1; skip must be omitted or >= 0 (send only when > 0)
      const safeLimit = Math.max(1, parseInt(limit) || 100);
      const body = { filter: normalizedFilter, limit: safeLimit, sort, projection };
      if (skip > 0) body.skip = skip;

      const response = await this._withRetry(() => this.client.post(
        `/api/v1/projects/${this.projectId}/database/tables/${tableName}/query`,
        body
      ));
      return response.data;
    } catch (error) {
      // Handle table not found gracefully - return empty array
      if (error.response?.status === 404 ||
          error.response?.data?.detail?.includes('not found') ||
          error.message?.includes('not found')) {
        console.warn(`Table '${tableName}' not found, returning empty results`);
        return [];
      }
      console.error('Error querying table:', error.message);
      throw error;
    }
  }

  /**
   * Normalize filter values for ZeroDB JSON comparisons
   * Converts boolean values to strings since ZeroDB stores JSON as text
   * @param {Object} filter - Filter object
   * @returns {Object} Normalized filter
   */
  _normalizeFilterForZeroDB(filter) {
    if (!filter || typeof filter !== 'object') return filter;

    const normalized = {};
    for (const [key, value] of Object.entries(filter)) {
      if (typeof value === 'boolean') {
        // Convert boolean to string for JSON text comparison
        normalized[key] = value.toString();
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Recursively normalize nested objects (e.g., $in, $gt operators)
        normalized[key] = this._normalizeFilterForZeroDB(value);
      } else {
        normalized[key] = value;
      }
    }
    return normalized;
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
    if (this.useLocalFallback) {
      return this._localUpdate(tableName, options);
    }
    try {
      const { filter, update } = options;

      // First, find matching rows to get their row_ids
      const queryResult = await this.queryTable(tableName, { filter });
      let rows = queryResult.data || queryResult || [];

      // ZeroDB does substring matching on JSON fields. ALWAYS post-filter
      // for exact match to prevent updating unrelated rows.
      if (filter && typeof filter === 'object') {
        const beforeCount = rows.length;
        rows = rows.filter(row => {
          const data = row.row_data || row;
          return Object.entries(filter).every(([key, val]) => {
            if (val === null || val === undefined) return true;
            if (val && typeof val === 'object') return true; // skip $operators
            // Check both row_data fields AND top-level row fields (row_id is top-level)
            const rowVal = data[key] !== undefined ? data[key] : row[key];
            return String(rowVal) === String(val);
          });
        });
        if (rows.length !== beforeCount) {
          console.warn(`[ZeroDB] updateRows post-filter: ${beforeCount} -> ${rows.length} rows for table ${tableName}`);
        }
      }

      if (rows.length === 0) {
        return { modified_count: 0, matched_count: 0 };
      }

      // Update each matching row by row_id
      let modifiedCount = 0;
      for (const row of rows) {
        const rowId = row.row_id;
        if (rowId) {
          // Merge existing row_data with updates
          const updateData = update.$set || update;
          const newRowData = { ...row.row_data, ...updateData };

          await this._withRetry(() => this.client.put(
            `/api/v1/projects/${this.projectId}/database/tables/${tableName}/rows/${rowId}`,
            { row_data: newRowData }
          ));
          modifiedCount++;
        }
      }

      return { modified_count: modifiedCount, matched_count: rows.length };
    } catch (error) {
      console.error('Error updating rows:', error.message);
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
    if (this.useLocalFallback) {
      return this._localDelete(tableName, options);
    }
    try {
      const { filter } = options;

      // Fast path: if filtering by row_id directly, skip query and delete immediately
      // row_id is a top-level ZeroDB column, not inside row_data, so queryTable won't find it
      if (filter && filter.row_id && Object.keys(filter).length === 1) {
        await this.client.delete(
          `/api/v1/projects/${this.projectId}/database/tables/${tableName}/rows/${filter.row_id}`
        );
        return { deleted_count: 1 };
      }

      // First, find matching rows to get their row_ids
      const queryResult = await this.queryTable(tableName, { filter });
      let rows = queryResult.data || queryResult || [];

      // ALWAYS post-filter for exact match to prevent deleting unrelated rows
      // ZeroDB does substring matching on JSON fields, so we must verify exact equality
      if (filter && typeof filter === 'object') {
        const beforeCount = rows.length;
        rows = rows.filter(row => {
          const data = row.row_data || row;
          return Object.entries(filter).every(([key, val]) => {
            if (val === null || val === undefined) return true;
            if (val && typeof val === 'object') return true; // skip $operators
            // Check both row_data fields AND top-level row fields (row_id, _id are top-level)
            const rowVal = data[key] !== undefined ? data[key] : row[key];
            return String(rowVal) === String(val);
          });
        });
        if (rows.length !== beforeCount) {
          console.warn(`[ZeroDB] deleteRows post-filter: ${beforeCount} -> ${rows.length} rows for table ${tableName}`);
        }
      }

      if (rows.length === 0) {
        return { deleted_count: 0 };
      }

      // Delete each matching row by row_id
      let deletedCount = 0;
      for (const row of rows) {
        const rowId = row.row_id;
        if (rowId) {
          await this.client.delete(
            `/api/v1/projects/${this.projectId}/database/tables/${tableName}/rows/${rowId}`
          );
          deletedCount++;
        }
      }

      return { deleted_count: deletedCount };
    } catch (error) {
      console.error('Error deleting rows:', error.message);
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
    if (this.useLocalFallback) {
      const results = this._localQuery(tableName, { filter });
      const data = results.data || results || [];
      return data.length;
    }
    try {
      const response = await this.client.post(
        `/api/v1/projects/${this.projectId}/database/tables/${tableName}/query`,
        { filter }
      );
      return response.data.count;
    } catch (error) {
      console.error('Error counting rows:', error.message);
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
      const response = await this.client.post(`/api/v1/projects/${this.projectId}/database/vectors/upsert`, {
        vector_embedding: vectorEmbedding,
        namespace,
        vector_metadata: metadata,
        document,
        source
      });
      return response.data;
    } catch (error) {
      console.error('Error upserting vector:', error.message);
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
      const response = await this.client.post(`/api/v1/projects/${this.projectId}/database/vectors/search`, {
        query_vector: queryVector,
        limit,
        namespace
      });
      return response.data;
    } catch (error) {
      console.error('Error searching vectors:', error.message);
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
      const response = await this.client.get(`/api/v1/projects/${this.projectId}/database/vectors`, {
        params: { namespace, skip, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error listing vectors:', error.message);
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
      const response = await this.client.post(`/api/v1/projects/${this.projectId}/database/memory`, {
        agent_id: agentId,
        session_id: sessionId,
        role,
        content,
        memory_metadata: metadata
      });
      return response.data;
    } catch (error) {
      console.error('Error storing memory:', error.message);
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
      
      const response = await this.client.get(`/api/v1/projects/${this.projectId}/database/memory`, {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error listing memory:', error.message);
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
      const response = await this.client.post(`/api/v1/projects/${this.projectId}/database/events`, {
        topic,
        event_payload: eventPayload
      });
      return response.data;
    } catch (error) {
      console.error('Error publishing event:', error.message);
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
      
      const response = await this.client.get(`/api/v1/projects/${this.projectId}/database/events`, {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error listing events:', error.message);
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
      const response = await this.client.post(`/api/v1/projects/${this.projectId}/database/files`, {
        file_key: fileKey,
        file_name: fileName,
        content_type: contentType,
        size_bytes: sizeBytes,
        file_metadata: metadata
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading file metadata:', error.message);
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
      const response = await this.client.get(`/api/v1/projects/${this.projectId}/database/files`, {
        params: { skip, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error listing files:', error.message);
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
      const response = await this.client.post(`/api/v1/projects/${this.projectId}/database/rlhf/log`, {
        input_prompt: inputPrompt,
        model_output: modelOutput,
        session_id: sessionId,
        reward_score: rewardScore,
        notes
      });
      return response.data;
    } catch (error) {
      console.error('Error logging RLHF:', error.message);
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
      const response = await this.client.post(`/api/v1/projects/${this.projectId}/database/agent/log`, {
        agent_id: agentId,
        session_id: sessionId,
        log_level: logLevel,
        log_message: logMessage,
        raw_payload: rawPayload
      });
      return response.data;
    } catch (error) {
      console.error('Error storing agent log:', error.message);
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

      const response = await this.client.get(`/api/v1/projects/${this.projectId}/database/agent/logs`, {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error listing agent logs:', error.message);
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
    if (this.useLocalFallback) {
      const rows = Array.isArray(rowData) ? rowData : [rowData];
      return this.insertRows(tableName, rows);
    }
    try {
      // If array, insert each row individually
      if (Array.isArray(rowData)) {
        const results = [];
        for (const row of rowData) {
          const response = await this.client.post(
            `/api/v1/projects/${this.projectId}/database/tables/${tableName}/rows`,
            { row_data: row }
          );
          results.push(response.data);
        }
        return { data: results };
      }

      // Single row insert
      const response = await this._withRetry(() => this.client.post(
        `/api/v1/projects/${this.projectId}/database/tables/${tableName}/rows`,
        { row_data: rowData }
      ));
      return { data: [response.data] };
    } catch (error) {
      console.error('Error inserting row:', error.message);
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
        `/api/v1/projects/${this.projectId}/database/tables/${tableName}/rows`,
        { params }
      );
      return response.data;
    } catch (error) {
      console.error('Error querying rows:', error.message);
      throw error;
    }
  }

  /**
   * Update rows in a table (alternate signature)
   * @param {string} tableName - Name of the table
   * @param {Object} query - Query filter to match rows
   * @param {Object} update - Update operations (MongoDB-style update object)
   * @returns {Object} Update result with count of modified rows
   */
  async updateRowsByQuery(tableName, query, update) {
    // Delegate to the main updateRows method
    return this.updateRows(tableName, { filter: query, update });
  }

  /**
   * Delete rows from a table (alternate signature)
   * @param {string} tableName - Name of the table
   * @param {Object} query - Query filter to match rows
   * @returns {Object} Delete result with count of deleted rows
   */
  async deleteRowsByQuery(tableName, query) {
    // Delegate to the main deleteRows method
    return this.deleteRows(tableName, { filter: query });
  }

  /**
   * Delete a specific row by its row_id directly
   * @param {string} tableName - Name of the table
   * @param {string} rowId - The row_id to delete
   * @returns {Object} Delete result
   */
  async deleteRowById(tableName, rowId) {
    if (this.useLocalFallback) {
      const table = this._localStore[tableName] || [];
      const idx = table.findIndex(r => r.row_id === rowId);
      if (idx === -1) return { deleted_count: 0 };
      table.splice(idx, 1);
      return { deleted_count: 1 };
    }
    try {
      await this.client.delete(
        `/api/v1/projects/${this.projectId}/database/tables/${tableName}/rows/${rowId}`
      );
      return { deleted_count: 1 };
    } catch (error) {
      if (error.response?.status === 404) {
        return { deleted_count: 0 };
      }
      console.error('Error deleting row by ID:', error.message);
      throw error;
    }
  }

  // =========================================================================
  // In-memory fallback implementations (used when remote ZeroDB is unreachable)
  // =========================================================================

  _localMatchesFilter(item, filter) {
    if (!filter || Object.keys(filter).length === 0) return true;
    return Object.entries(filter).every(([key, value]) => {
      const actual = item[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (value.$in) return value.$in.includes(actual);
        if (value.$ne) return actual !== value.$ne;
        if (value.$gt) return actual > value.$gt;
        if (value.$gte) return actual >= value.$gte;
        if (value.$lt) return actual < value.$lt;
        if (value.$lte) return actual <= value.$lte;
        if (value.$regex) return new RegExp(value.$regex, value.$options || '').test(actual);
      }
      return actual === value;
    });
  }

  _localQuery(tableName, options = {}) {
    const { filter = {}, skip = 0, limit = 100, sort = {} } = options;
    const table = this._localStore[tableName] || [];

    let results = table.filter(entry =>
      this._localMatchesFilter(entry.row_data, filter)
    );

    // Sort
    const sortKeys = Object.entries(sort);
    if (sortKeys.length > 0) {
      results.sort((a, b) => {
        for (const [key, dir] of sortKeys) {
          const av = a.row_data[key], bv = b.row_data[key];
          if (av < bv) return dir === -1 ? 1 : -1;
          if (av > bv) return dir === -1 ? -1 : 1;
        }
        return 0;
      });
    }

    const total = results.length;
    if (limit > 0) {
      results = results.slice(skip, skip + limit);
    } else {
      results = [];
    }
    return { data: results, total };
  }

  _localUpdate(tableName, options) {
    const { filter, update } = options;
    const table = this._localStore[tableName] || [];
    const updateData = update.$set || update;
    let modifiedCount = 0;

    for (const entry of table) {
      if (this._localMatchesFilter(entry.row_data, filter)) {
        Object.assign(entry.row_data, updateData);
        modifiedCount++;
      }
    }
    return { modified_count: modifiedCount, matched_count: modifiedCount };
  }

  _localDelete(tableName, options) {
    const { filter } = options;
    if (!this._localStore[tableName]) return { deleted_count: 0 };
    const before = this._localStore[tableName].length;
    this._localStore[tableName] = this._localStore[tableName].filter(
      entry => !this._localMatchesFilter(entry.row_data, filter)
    );
    return { deleted_count: before - this._localStore[tableName].length };
  }
}

// Export singleton instance
module.exports = new ZeroDBService();
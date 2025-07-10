/**
 * Memory Service Layer
 * 
 * Provides session and workflow memory management for OpenCap
 * using ZeroDB for user sessions, workflow states, and context tracking
 */

const zerodbService = require('./zerodbService');
const { v4: uuidv4 } = require('uuid');

class MemoryService {
  constructor() {
    this.sessionTimeoutMs = 30 * 60 * 1000; // 30 minutes
    this.maxMemoryPerSession = 1000;
    this.contextTypes = {
      USER_SESSION: 'user_session',
      WORKFLOW_STATE: 'workflow_state',
      FORM_DATA: 'form_data',
      NAVIGATION: 'navigation',
      PREFERENCES: 'preferences',
      CACHE: 'cache'
    };
  }
  
  /**
   * Initialize memory service
   * @param {string} token - JWT token for authentication
   */
  async initialize(token) {
    try {
      await zerodbService.initialize(token);
      console.log('Memory service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize memory service:', error);
      throw error;
    }
  }
  
  /**
   * Create a new session
   * @param {string} userId - User ID
   * @param {Object} context - Session context
   * @returns {string} Session ID
   */
  async createSession(userId, context = {}) {
    try {
      const sessionId = uuidv4();
      
      const sessionData = {
        session_id: sessionId,
        user_id: userId,
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        context: {
          user_agent: context.userAgent,
          ip_address: context.ipAddress,
          device_type: context.deviceType,
          browser: context.browser
        }
      };
      
      await zerodbService.storeMemory(
        `session:${sessionId}`,
        sessionId,
        'system',
        JSON.stringify(sessionData),
        {
          type: this.contextTypes.USER_SESSION,
          user_id: userId,
          expires_at: new Date(Date.now() + this.sessionTimeoutMs).toISOString()
        }
      );
      
      console.log(`Session created: ${sessionId} for user ${userId}`);
      return sessionId;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }
  
  /**
   * Get session data
   * @param {string} sessionId - Session ID
   * @returns {Object} Session data
   */
  async getSession(sessionId) {
    try {
      const memories = await zerodbService.listMemory(
        `session:${sessionId}`,
        sessionId,
        'system',
        0,
        1
      );
      
      if (memories.length === 0) {
        return null;
      }
      
      const sessionMemory = memories[0];
      const sessionData = JSON.parse(sessionMemory.content);
      
      // Check if session is expired
      const expiresAt = new Date(sessionMemory.memory_metadata.expires_at);
      if (expiresAt < new Date()) {
        await this.expireSession(sessionId);
        return null;
      }
      
      return sessionData;
    } catch (error) {
      console.error('Error getting session:', error);
      throw error;
    }
  }
  
  /**
   * Update session activity
   * @param {string} sessionId - Session ID
   * @param {Object} activity - Activity data
   */
  async updateSessionActivity(sessionId, activity = {}) {
    try {
      const sessionData = await this.getSession(sessionId);
      if (!sessionData) {
        throw new Error('Session not found or expired');
      }
      
      sessionData.last_activity = new Date().toISOString();
      sessionData.activity_count = (sessionData.activity_count || 0) + 1;
      
      if (activity.page) {
        sessionData.current_page = activity.page;
      }
      
      if (activity.feature) {
        sessionData.last_feature = activity.feature;
      }
      
      await zerodbService.storeMemory(
        `session:${sessionId}`,
        sessionId,
        'system',
        JSON.stringify(sessionData),
        {
          type: this.contextTypes.USER_SESSION,
          user_id: sessionData.user_id,
          expires_at: new Date(Date.now() + this.sessionTimeoutMs).toISOString()
        }
      );
    } catch (error) {
      console.error('Error updating session activity:', error);
      throw error;
    }
  }
  
  /**
   * Store workflow state
   * @param {string} workflowId - Workflow ID
   * @param {string} sessionId - Session ID
   * @param {string} currentState - Current workflow state
   * @param {Object} stateData - State data
   * @param {Object} context - Additional context
   */
  async storeWorkflowState(workflowId, sessionId, currentState, stateData, context = {}) {
    try {
      const workflowStateData = {
        workflow_id: workflowId,
        session_id: sessionId,
        current_state: currentState,
        state_data: stateData,
        timestamp: new Date().toISOString(),
        context
      };
      
      await zerodbService.storeMemory(
        `workflow:${workflowId}`,
        sessionId,
        'system',
        JSON.stringify(workflowStateData),
        {
          type: this.contextTypes.WORKFLOW_STATE,
          workflow_id: workflowId,
          current_state: currentState,
          user_id: context.userId
        }
      );
      
      console.log(`Workflow state stored: ${workflowId} - ${currentState}`);
    } catch (error) {
      console.error('Error storing workflow state:', error);
      throw error;
    }
  }
  
  /**
   * Get workflow state
   * @param {string} workflowId - Workflow ID
   * @param {string} sessionId - Session ID
   * @returns {Object} Workflow state data
   */
  async getWorkflowState(workflowId, sessionId) {
    try {
      const memories = await zerodbService.listMemory(
        `workflow:${workflowId}`,
        sessionId,
        'system',
        0,
        1
      );
      
      if (memories.length === 0) {
        return null;
      }
      
      const workflowMemory = memories[0];
      return JSON.parse(workflowMemory.content);
    } catch (error) {
      console.error('Error getting workflow state:', error);
      throw error;
    }
  }
  
  /**
   * Store form data
   * @param {string} formId - Form ID
   * @param {string} sessionId - Session ID
   * @param {Object} formData - Form data
   * @param {Object} metadata - Form metadata
   */
  async storeFormData(formId, sessionId, formData, metadata = {}) {
    try {
      const formDataRecord = {
        form_id: formId,
        session_id: sessionId,
        form_data: formData,
        saved_at: new Date().toISOString(),
        metadata
      };
      
      await zerodbService.storeMemory(
        `form:${formId}`,
        sessionId,
        'user',
        JSON.stringify(formDataRecord),
        {
          type: this.contextTypes.FORM_DATA,
          form_id: formId,
          field_count: Object.keys(formData).length
        }
      );
      
      console.log(`Form data stored: ${formId}`);
    } catch (error) {
      console.error('Error storing form data:', error);
      throw error;
    }
  }
  
  /**
   * Get form data
   * @param {string} formId - Form ID
   * @param {string} sessionId - Session ID
   * @returns {Object} Form data
   */
  async getFormData(formId, sessionId) {
    try {
      const memories = await zerodbService.listMemory(
        `form:${formId}`,
        sessionId,
        'user',
        0,
        1
      );
      
      if (memories.length === 0) {
        return null;
      }
      
      const formMemory = memories[0];
      return JSON.parse(formMemory.content);
    } catch (error) {
      console.error('Error getting form data:', error);
      throw error;
    }
  }
  
  /**
   * Store user preferences
   * @param {string} userId - User ID
   * @param {Object} preferences - User preferences
   */
  async storeUserPreferences(userId, preferences) {
    try {
      const preferencesData = {
        user_id: userId,
        preferences,
        updated_at: new Date().toISOString()
      };
      
      await zerodbService.storeMemory(
        `preferences:${userId}`,
        uuidv4(),
        'system',
        JSON.stringify(preferencesData),
        {
          type: this.contextTypes.PREFERENCES,
          user_id: userId,
          preference_count: Object.keys(preferences).length
        }
      );
      
      console.log(`User preferences stored: ${userId}`);
    } catch (error) {
      console.error('Error storing user preferences:', error);
      throw error;
    }
  }
  
  /**
   * Get user preferences
   * @param {string} userId - User ID
   * @returns {Object} User preferences
   */
  async getUserPreferences(userId) {
    try {
      const memories = await zerodbService.listMemory(
        `preferences:${userId}`,
        null,
        'system',
        0,
        1
      );
      
      if (memories.length === 0) {
        return {};
      }
      
      const preferencesMemory = memories[0];
      const preferencesData = JSON.parse(preferencesMemory.content);
      return preferencesData.preferences || {};
    } catch (error) {
      console.error('Error getting user preferences:', error);
      throw error;
    }
  }
  
  /**
   * Store navigation history
   * @param {string} sessionId - Session ID
   * @param {string} fromPage - Previous page
   * @param {string} toPage - Current page
   * @param {Object} context - Navigation context
   */
  async storeNavigationHistory(sessionId, fromPage, toPage, context = {}) {
    try {
      const navigationData = {
        session_id: sessionId,
        from_page: fromPage,
        to_page: toPage,
        timestamp: new Date().toISOString(),
        context
      };
      
      await zerodbService.storeMemory(
        `navigation:${sessionId}`,
        sessionId,
        'system',
        JSON.stringify(navigationData),
        {
          type: this.contextTypes.NAVIGATION,
          from_page: fromPage,
          to_page: toPage
        }
      );
    } catch (error) {
      console.error('Error storing navigation history:', error);
      throw error;
    }
  }
  
  /**
   * Get navigation history
   * @param {string} sessionId - Session ID
   * @param {number} limit - Maximum records to return
   * @returns {Array} Navigation history
   */
  async getNavigationHistory(sessionId, limit = 50) {
    try {
      const memories = await zerodbService.listMemory(
        `navigation:${sessionId}`,
        sessionId,
        'system',
        0,
        limit
      );
      
      return memories.map(memory => JSON.parse(memory.content));
    } catch (error) {
      console.error('Error getting navigation history:', error);
      throw error;
    }
  }
  
  /**
   * Cache data
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttlMs - Time to live in milliseconds
   */
  async cacheData(key, data, ttlMs = 5 * 60 * 1000) {
    try {
      const cacheData = {
        key,
        data,
        cached_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + ttlMs).toISOString()
      };
      
      await zerodbService.storeMemory(
        `cache:${key}`,
        uuidv4(),
        'system',
        JSON.stringify(cacheData),
        {
          type: this.contextTypes.CACHE,
          cache_key: key,
          expires_at: cacheData.expires_at
        }
      );
    } catch (error) {
      console.error('Error caching data:', error);
      throw error;
    }
  }
  
  /**
   * Get cached data
   * @param {string} key - Cache key
   * @returns {any} Cached data or null if not found/expired
   */
  async getCachedData(key) {
    try {
      const memories = await zerodbService.listMemory(
        `cache:${key}`,
        null,
        'system',
        0,
        1
      );
      
      if (memories.length === 0) {
        return null;
      }
      
      const cacheMemory = memories[0];
      const cacheData = JSON.parse(cacheMemory.content);
      
      // Check if cache is expired
      if (new Date(cacheData.expires_at) < new Date()) {
        return null;
      }
      
      return cacheData.data;
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  }
  
  /**
   * Expire session
   * @param {string} sessionId - Session ID
   */
  async expireSession(sessionId) {
    try {
      // Note: ZeroDB doesn't have delete functionality in the documented API
      // This would need to be implemented when delete functionality is available
      console.log(`Session expired: ${sessionId}`);
    } catch (error) {
      console.error('Error expiring session:', error);
      throw error;
    }
  }
  
  /**
   * Get memory analytics
   * @param {string} type - Memory type to analyze
   * @returns {Object} Memory analytics
   */
  async getMemoryAnalytics(type) {
    try {
      // This would need to be implemented with proper filtering
      // when ZeroDB provides better query capabilities
      const memories = await zerodbService.listMemory(null, null, null, 0, 1000);
      
      const filteredMemories = memories.filter(memory => 
        memory.memory_metadata?.type === type
      );
      
      return {
        type,
        total_records: filteredMemories.length,
        memory_usage: filteredMemories.reduce((sum, memory) => 
          sum + (memory.content ? memory.content.length : 0), 0
        ),
        oldest_record: filteredMemories.length > 0 ? 
          filteredMemories[filteredMemories.length - 1].created_at : null,
        newest_record: filteredMemories.length > 0 ? 
          filteredMemories[0].created_at : null
      };
    } catch (error) {
      console.error('Error getting memory analytics:', error);
      throw error;
    }
  }
  
  /**
   * Cleanup expired memories
   */
  async cleanupExpiredMemories() {
    try {
      // This would need to be implemented when ZeroDB provides delete functionality
      console.log('Memory cleanup not implemented - waiting for ZeroDB delete API');
    } catch (error) {
      console.error('Error cleaning up expired memories:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new MemoryService();
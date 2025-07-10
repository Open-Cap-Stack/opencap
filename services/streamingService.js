/**
 * Streaming Service Layer
 * 
 * Provides real-time event streaming functionality for OpenCap
 * using ZeroDB for financial transactions, user activities, and workflows
 */

const zerodbService = require('./zerodbService');
const { EventEmitter } = require('events');

class StreamingService extends EventEmitter {
  constructor() {
    super();
    this.topics = {
      FINANCIAL_TRANSACTION: 'financial_transaction',
      USER_ACTIVITY: 'user_activity', 
      DOCUMENT_ACTIVITY: 'document_activity',
      COMPLIANCE_EVENT: 'compliance_event',
      WORKFLOW_STATE: 'workflow_state',
      SYSTEM_ALERT: 'system_alert',
      SPV_ACTIVITY: 'spv_activity',
      NOTIFICATION: 'notification'
    };
    
    this.eventBuffer = [];
    this.maxBufferSize = 1000;
    this.batchSize = 10;
    this.flushInterval = 5000; // 5 seconds
    
    // Start batch processing
    this.startBatchProcessing();
  }
  
  /**
   * Initialize streaming service
   * @param {string} token - JWT token for authentication
   */
  async initialize(token) {
    try {
      await zerodbService.initialize(token);
      console.log('Streaming service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize streaming service:', error);
      throw error;
    }
  }
  
  /**
   * Publish financial transaction event
   * @param {Object} transaction - Transaction data
   * @param {string} userId - User ID
   * @returns {Object} Published event
   */
  async publishFinancialTransaction(transaction, userId) {
    const eventPayload = {
      transaction_id: transaction.id,
      user_id: userId,
      type: transaction.type,
      amount: transaction.amount,
      currency: transaction.currency,
      timestamp: new Date().toISOString(),
      metadata: {
        company_id: transaction.companyId,
        category: transaction.category,
        status: transaction.status
      }
    };
    
    return this.publishEvent(this.topics.FINANCIAL_TRANSACTION, eventPayload);
  }
  
  /**
   * Publish user activity event
   * @param {string} userId - User ID
   * @param {string} action - Action performed
   * @param {Object} context - Activity context
   * @returns {Object} Published event
   */
  async publishUserActivity(userId, action, context = {}) {
    const eventPayload = {
      user_id: userId,
      action,
      timestamp: new Date().toISOString(),
      session_id: context.sessionId,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      metadata: {
        page: context.page,
        feature: context.feature,
        duration_ms: context.duration,
        success: context.success !== false
      }
    };
    
    return this.publishEvent(this.topics.USER_ACTIVITY, eventPayload);
  }
  
  /**
   * Publish document activity event
   * @param {string} documentId - Document ID
   * @param {string} userId - User ID
   * @param {string} action - Action performed (view, edit, delete, share)
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Published event
   */
  async publishDocumentActivity(documentId, userId, action, metadata = {}) {
    const eventPayload = {
      document_id: documentId,
      user_id: userId,
      action,
      timestamp: new Date().toISOString(),
      metadata: {
        document_type: metadata.documentType,
        file_size: metadata.fileSize,
        access_level: metadata.accessLevel,
        ...metadata
      }
    };
    
    return this.publishEvent(this.topics.DOCUMENT_ACTIVITY, eventPayload);
  }
  
  /**
   * Publish compliance event
   * @param {string} complianceId - Compliance check ID
   * @param {string} status - Compliance status (passed, failed, warning)
   * @param {Object} details - Compliance details
   * @returns {Object} Published event
   */
  async publishComplianceEvent(complianceId, status, details = {}) {
    const eventPayload = {
      compliance_id: complianceId,
      status,
      timestamp: new Date().toISOString(),
      severity: details.severity || 'medium',
      rule_id: details.ruleId,
      entity_type: details.entityType,
      entity_id: details.entityId,
      metadata: {
        score: details.score,
        violations: details.violations,
        recommendations: details.recommendations
      }
    };
    
    return this.publishEvent(this.topics.COMPLIANCE_EVENT, eventPayload);
  }
  
  /**
   * Publish workflow state change event
   * @param {string} workflowId - Workflow ID
   * @param {string} fromState - Previous state
   * @param {string} toState - New state
   * @param {string} userId - User who triggered the change
   * @param {Object} context - Additional context
   * @returns {Object} Published event
   */
  async publishWorkflowStateChange(workflowId, fromState, toState, userId, context = {}) {
    const eventPayload = {
      workflow_id: workflowId,
      from_state: fromState,
      to_state: toState,
      user_id: userId,
      timestamp: new Date().toISOString(),
      metadata: {
        workflow_type: context.workflowType,
        entity_id: context.entityId,
        reason: context.reason,
        automatic: context.automatic || false
      }
    };
    
    return this.publishEvent(this.topics.WORKFLOW_STATE, eventPayload);
  }
  
  /**
   * Publish SPV activity event
   * @param {string} spvId - SPV ID
   * @param {string} activity - Activity type
   * @param {string} userId - User ID
   * @param {Object} details - Activity details
   * @returns {Object} Published event
   */
  async publishSPVActivity(spvId, activity, userId, details = {}) {
    const eventPayload = {
      spv_id: spvId,
      activity,
      user_id: userId,
      timestamp: new Date().toISOString(),
      metadata: {
        amount: details.amount,
        currency: details.currency,
        investor_count: details.investorCount,
        status: details.status,
        ...details
      }
    };
    
    return this.publishEvent(this.topics.SPV_ACTIVITY, eventPayload);
  }
  
  /**
   * Publish system alert
   * @param {string} alertType - Alert type
   * @param {string} severity - Alert severity (low, medium, high, critical)
   * @param {string} message - Alert message
   * @param {Object} context - Alert context
   * @returns {Object} Published event
   */
  async publishSystemAlert(alertType, severity, message, context = {}) {
    const eventPayload = {
      alert_type: alertType,
      severity,
      message,
      timestamp: new Date().toISOString(),
      metadata: {
        component: context.component,
        error_code: context.errorCode,
        affected_users: context.affectedUsers,
        resolution_steps: context.resolutionSteps
      }
    };
    
    return this.publishEvent(this.topics.SYSTEM_ALERT, eventPayload);
  }
  
  /**
   * Publish notification event
   * @param {string} userId - Target user ID
   * @param {string} type - Notification type
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Published event
   */
  async publishNotification(userId, type, title, message, metadata = {}) {
    const eventPayload = {
      user_id: userId,
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      metadata: {
        priority: metadata.priority || 'normal',
        category: metadata.category,
        action_url: metadata.actionUrl,
        expires_at: metadata.expiresAt
      }
    };
    
    return this.publishEvent(this.topics.NOTIFICATION, eventPayload);
  }
  
  /**
   * Publish event to ZeroDB
   * @param {string} topic - Event topic
   * @param {Object} eventPayload - Event data
   * @param {boolean} batch - Whether to batch the event
   * @returns {Object} Published event
   */
  async publishEvent(topic, eventPayload, batch = true) {
    try {
      if (batch) {
        // Add to buffer for batch processing
        this.eventBuffer.push({ topic, eventPayload, timestamp: Date.now() });
        
        // Trim buffer if it exceeds max size
        if (this.eventBuffer.length > this.maxBufferSize) {
          this.eventBuffer = this.eventBuffer.slice(-this.maxBufferSize);
        }
        
        // Emit local event for immediate processing
        this.emit('event', { topic, eventPayload });
        
        return { status: 'buffered', topic, timestamp: eventPayload.timestamp };
      } else {
        // Publish immediately
        const result = await zerodbService.publishEvent(topic, eventPayload);
        
        // Emit local event
        this.emit('event', { topic, eventPayload, published: true });
        
        return result;
      }
    } catch (error) {
      console.error('Error publishing event:', error);
      
      // Emit error event
      this.emit('error', { error, topic, eventPayload });
      
      throw error;
    }
  }
  
  /**
   * Start batch processing of events
   */
  startBatchProcessing() {
    setInterval(async () => {
      await this.flushEventBuffer();
    }, this.flushInterval);
  }
  
  /**
   * Flush event buffer to ZeroDB
   */
  async flushEventBuffer() {
    if (this.eventBuffer.length === 0) {
      return;
    }
    
    const eventsToFlush = this.eventBuffer.splice(0, this.batchSize);
    
    try {
      const publishPromises = eventsToFlush.map(event =>
        zerodbService.publishEvent(event.topic, event.eventPayload)
      );
      
      const results = await Promise.allSettled(publishPromises);
      
      let successCount = 0;
      let failureCount = 0;
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successCount++;
          this.emit('event', {
            ...eventsToFlush[index],
            published: true,
            result: result.value
          });
        } else {
          failureCount++;
          // Put failed events back in buffer for retry
          this.eventBuffer.unshift(eventsToFlush[index]);
          
          this.emit('error', {
            error: result.reason,
            event: eventsToFlush[index]
          });
        }
      });
      
      if (successCount > 0) {
        console.log(`Flushed ${successCount} events successfully`);
      }
      
      if (failureCount > 0) {
        console.warn(`Failed to flush ${failureCount} events, retrying later`);
      }
    } catch (error) {
      console.error('Error flushing event buffer:', error);
      
      // Put events back in buffer for retry
      this.eventBuffer.unshift(...eventsToFlush);
    }
  }
  
  /**
   * Get events by topic
   * @param {string} topic - Event topic
   * @param {number} limit - Maximum events to return
   * @param {number} skip - Number of events to skip
   * @returns {Array} List of events
   */
  async getEvents(topic, limit = 100, skip = 0) {
    try {
      return await zerodbService.listEvents(topic, skip, limit);
    } catch (error) {
      console.error('Error getting events:', error);
      throw error;
    }
  }
  
  /**
   * Get real-time analytics
   * @param {string} topic - Topic to analyze
   * @param {string} timeRange - Time range (1h, 24h, 7d, 30d)
   * @returns {Object} Analytics data
   */
  async getAnalytics(topic, timeRange = '24h') {
    try {
      const events = await this.getEvents(topic, 1000);
      
      const now = new Date();
      const timeRanges = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      };
      
      const cutoff = new Date(now.getTime() - timeRanges[timeRange]);
      
      const filteredEvents = events.filter(event => 
        new Date(event.published_at) >= cutoff
      );
      
      return {
        topic,
        time_range: timeRange,
        total_events: filteredEvents.length,
        events_per_hour: this.calculateEventsPerHour(filteredEvents),
        top_users: this.getTopUsers(filteredEvents),
        event_distribution: this.getEventDistribution(filteredEvents)
      };
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw error;
    }
  }
  
  /**
   * Calculate events per hour
   * @param {Array} events - Events to analyze
   * @returns {Object} Events per hour data
   */
  calculateEventsPerHour(events) {
    const hourlyData = {};
    
    events.forEach(event => {
      const hour = new Date(event.published_at).toISOString().substring(0, 13);
      hourlyData[hour] = (hourlyData[hour] || 0) + 1;
    });
    
    return hourlyData;
  }
  
  /**
   * Get top users by event count
   * @param {Array} events - Events to analyze
   * @returns {Array} Top users
   */
  getTopUsers(events) {
    const userCounts = {};
    
    events.forEach(event => {
      const userId = event.event_payload?.user_id;
      if (userId) {
        userCounts[userId] = (userCounts[userId] || 0) + 1;
      }
    });
    
    return Object.entries(userCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([userId, count]) => ({ user_id: userId, event_count: count }));
  }
  
  /**
   * Get event distribution by type/action
   * @param {Array} events - Events to analyze
   * @returns {Object} Event distribution
   */
  getEventDistribution(events) {
    const distribution = {};
    
    events.forEach(event => {
      const action = event.event_payload?.action || event.event_payload?.type || 'unknown';
      distribution[action] = (distribution[action] || 0) + 1;
    });
    
    return distribution;
  }
  
  /**
   * Force flush all buffered events
   */
  async forceFlush() {
    while (this.eventBuffer.length > 0) {
      await this.flushEventBuffer();
    }
  }
  
  /**
   * Get buffer status
   * @returns {Object} Buffer status
   */
  getBufferStatus() {
    return {
      buffered_events: this.eventBuffer.length,
      max_buffer_size: this.maxBufferSize,
      batch_size: this.batchSize,
      flush_interval_ms: this.flushInterval
    };
  }
}

// Export singleton instance
module.exports = new StreamingService();
/**
 * RLHF Service Layer
 *
 * Provides Reinforcement Learning from Human Feedback (RLHF) data collection
 * functionality for AI features in OpenCap. Stores feedback, interactions,
 * and usage data in ZeroDB for model improvement.
 *
 * [Feature] Issue #29: Implement RLHF data collection
 */

const zerodbService = require('./zerodbService');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// Constants
const VALID_FEEDBACK_TYPES = ['thumbs_up', 'thumbs_down', 'rating', 'comment'];
const VALID_CORRECTION_TYPES = ['factual_error', 'formatting', 'incomplete', 'outdated_info', 'tone', 'other'];
const VALID_EXPORT_FORMATS = ['json', 'jsonl', 'csv'];

// Table names
const TABLES = {
  FEEDBACK: 'rlhf_feedback',
  INTERACTIONS: 'rlhf_interactions',
  USAGE: 'rlhf_usage',
  CORRECTIONS: 'rlhf_corrections',
  CONSENT: 'rlhf_consent'
};

class RLHFService {
  constructor() {
    this.defaultConsent = {
      collectInteractions: true,
      collectFeedback: true,
      allowAnalytics: true,
      allowDataExport: true
    };
  }

  // =====================
  // Feedback Capture
  // =====================

  /**
   * Capture user feedback on an AI response
   * @param {Object} feedback - Feedback data
   * @returns {Object} Result with feedback ID
   */
  async captureFeedback(feedback) {
    // Validate required fields
    if (!feedback.interactionId) {
      throw new Error('Interaction ID is required');
    }
    if (!feedback.userId) {
      throw new Error('User ID is required');
    }
    if (!feedback.feedbackType || !VALID_FEEDBACK_TYPES.includes(feedback.feedbackType)) {
      throw new Error('Invalid feedback type');
    }

    // Validate rating if provided
    if (feedback.feedbackType === 'rating') {
      if (feedback.rating === undefined || feedback.rating < 1 || feedback.rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }
    }

    const feedbackId = uuidv4();
    const timestamp = new Date().toISOString();

    // Calculate reward score
    const rewardScore = this.calculateRewardScore(feedback);

    const feedbackRecord = {
      feedbackId,
      interactionId: feedback.interactionId,
      userId: feedback.userId,
      sessionId: feedback.sessionId,
      feedbackType: feedback.feedbackType,
      rating: feedback.rating || null,
      comment: feedback.comment || null,
      rewardScore,
      context: feedback.context || {},
      timestamp,
      createdAt: timestamp
    };

    // Store in ZeroDB
    try {
      await zerodbService.logRLHF(
        feedbackRecord.interactionId,
        JSON.stringify(feedbackRecord),
        feedbackRecord.sessionId,
        rewardScore,
        feedback.comment || ''
      );

      // Also store in table for analytics
      await zerodbService.insertRows(TABLES.FEEDBACK, [feedbackRecord]);
    } catch (error) {
      console.error('Error storing feedback:', error);
      throw error;
    }

    return {
      success: true,
      feedbackId,
      timestamp,
      rewardScore
    };
  }

  // =====================
  // AI Interaction Recording
  // =====================

  /**
   * Store an AI interaction (prompt/response pair)
   * @param {Object} interaction - Interaction data
   * @returns {Object} Result with interaction ID
   */
  async storeInteraction(interaction) {
    // Validate required fields
    if (!interaction.userId) {
      throw new Error('User ID is required');
    }
    if (!interaction.prompt) {
      throw new Error('Prompt is required');
    }
    if (!interaction.response && !interaction.error) {
      throw new Error('Response is required');
    }

    const interactionId = uuidv4();
    const timestamp = new Date().toISOString();

    const interactionRecord = {
      interactionId,
      userId: interaction.userId,
      sessionId: interaction.sessionId,
      conversationId: interaction.conversationId || null,
      parentInteractionId: interaction.parentInteractionId || null,
      prompt: interaction.prompt,
      response: interaction.response || null,
      model: interaction.model || 'unknown',
      feature: interaction.feature || 'general',
      tokenCounts: interaction.tokenCounts || null,
      latencyMs: interaction.latencyMs || null,
      error: interaction.error || null,
      hasError: !!interaction.error,
      metadata: interaction.metadata || {},
      timestamp,
      createdAt: timestamp
    };

    // Store in ZeroDB
    try {
      await zerodbService.logRLHF(
        interaction.prompt,
        interaction.response || 'ERROR: ' + (interaction.error?.message || 'Unknown error'),
        interaction.sessionId,
        0, // Neutral score until feedback received
        JSON.stringify({ model: interaction.model, feature: interaction.feature })
      );

      await zerodbService.insertRows(TABLES.INTERACTIONS, [interactionRecord]);
    } catch (error) {
      console.error('Error storing interaction:', error);
      throw error;
    }

    return {
      success: true,
      interactionId,
      conversationId: interaction.conversationId || interactionId,
      hasError: !!interaction.error,
      timestamp
    };
  }

  // =====================
  // Feature Usage Tracking
  // =====================

  /**
   * Record AI feature usage event
   * @param {Object} usage - Usage data
   * @returns {Object} Result
   */
  async recordFeatureUsage(usage) {
    if (!usage.feature) {
      throw new Error('Feature name is required');
    }
    if (!usage.action) {
      throw new Error('Action is required');
    }

    const usageId = uuidv4();
    const timestamp = new Date().toISOString();

    const usageRecord = {
      usageId,
      userId: usage.userId || 'anonymous',
      sessionId: usage.sessionId,
      feature: usage.feature,
      action: usage.action,
      durationMs: usage.durationMs || null,
      metadata: usage.metadata || {},
      timestamp,
      createdAt: timestamp
    };

    try {
      await zerodbService.insertRows(TABLES.USAGE, [usageRecord]);

      // Publish event for real-time analytics
      await zerodbService.publishEvent('rlhf:feature_usage', {
        feature: usage.feature,
        action: usage.action,
        userId: usage.userId,
        timestamp
      });
    } catch (error) {
      console.error('Error recording feature usage:', error);
      throw error;
    }

    return {
      success: true,
      usageId,
      timestamp
    };
  }

  /**
   * Get feature usage statistics for a user
   * @param {string} userId - User ID
   * @returns {Object} Usage statistics
   */
  async getFeatureUsageByUser(userId) {
    try {
      const usageData = await zerodbService.queryTable(TABLES.USAGE, {
        filter: { userId }
      });

      // Aggregate by feature
      const featureCounts = {};
      usageData.forEach(record => {
        if (!featureCounts[record.feature]) {
          featureCounts[record.feature] = 0;
        }
        featureCounts[record.feature]++;
      });

      const features = Object.entries(featureCounts).map(([feature, count]) => ({
        feature,
        count
      }));

      return {
        userId,
        features,
        totalUsage: usageData.length
      };
    } catch (error) {
      console.error('Error getting feature usage:', error);
      throw error;
    }
  }

  // =====================
  // Correction Recording
  // =====================

  /**
   * Record a user correction to AI output
   * @param {Object} correction - Correction data
   * @returns {Object} Result with correction ID
   */
  async recordCorrection(correction) {
    if (!correction.interactionId) {
      throw new Error('Interaction ID is required');
    }
    if (!correction.correctedResponse) {
      throw new Error('Corrected response is required');
    }
    if (correction.correctionType && !VALID_CORRECTION_TYPES.includes(correction.correctionType)) {
      throw new Error('Invalid correction type');
    }

    const correctionId = uuidv4();
    const timestamp = new Date().toISOString();

    const correctionRecord = {
      correctionId,
      interactionId: correction.interactionId,
      userId: correction.userId || 'anonymous',
      originalResponse: correction.originalResponse || null,
      correctedResponse: correction.correctedResponse,
      correctionType: correction.correctionType || 'other',
      explanation: correction.explanation || null,
      timestamp,
      createdAt: timestamp
    };

    try {
      await zerodbService.insertRows(TABLES.CORRECTIONS, [correctionRecord]);

      // Update interaction to flag it has correction
      await zerodbService.updateRows(TABLES.INTERACTIONS, {
        filter: { interactionId: correction.interactionId },
        update: { hasCorrection: true }
      });
    } catch (error) {
      console.error('Error recording correction:', error);
      throw error;
    }

    return {
      success: true,
      correctionId,
      timestamp
    };
  }

  // =====================
  // Privacy Controls
  // =====================

  /**
   * Update user consent settings
   * @param {Object} consent - Consent settings
   * @returns {Object} Result
   */
  async updateConsentSettings(consent) {
    if (!consent.userId) {
      throw new Error('User ID is required');
    }

    const consentRecord = {
      userId: consent.userId,
      collectInteractions: consent.collectInteractions !== undefined ? consent.collectInteractions : this.defaultConsent.collectInteractions,
      collectFeedback: consent.collectFeedback !== undefined ? consent.collectFeedback : this.defaultConsent.collectFeedback,
      allowAnalytics: consent.allowAnalytics !== undefined ? consent.allowAnalytics : this.defaultConsent.allowAnalytics,
      allowDataExport: consent.allowDataExport !== undefined ? consent.allowDataExport : this.defaultConsent.allowDataExport,
      updatedAt: new Date().toISOString()
    };

    try {
      // Try to update existing, or insert new
      const existing = await zerodbService.queryTable(TABLES.CONSENT, {
        filter: { userId: consent.userId }
      });

      if (existing.length > 0) {
        await zerodbService.updateRows(TABLES.CONSENT, {
          filter: { userId: consent.userId },
          update: consentRecord
        });
      } else {
        consentRecord.createdAt = consentRecord.updatedAt;
        await zerodbService.insertRows(TABLES.CONSENT, [consentRecord]);
      }
    } catch (error) {
      console.error('Error updating consent settings:', error);
      throw error;
    }

    return {
      success: true,
      consent: consentRecord
    };
  }

  /**
   * Get user consent settings
   * @param {string} userId - User ID
   * @returns {Object} Consent settings
   */
  async getConsentSettings(userId) {
    try {
      const results = await zerodbService.queryTable(TABLES.CONSENT, {
        filter: { userId }
      });

      if (results.length === 0) {
        // Return default consent for new users
        return {
          userId,
          ...this.defaultConsent
        };
      }

      return results[0];
    } catch (error) {
      console.error('Error getting consent settings:', error);
      throw error;
    }
  }

  /**
   * Check if user has consented to a specific type of data collection
   * @param {string} userId - User ID
   * @param {string} consentType - Type of consent to check
   * @returns {boolean} Whether user has consented
   */
  async checkConsent(userId, consentType) {
    const consent = await this.getConsentSettings(userId);
    return consent[consentType] === true;
  }

  /**
   * Delete all RLHF data for a user
   * @param {string} userId - User ID
   * @returns {Object} Result
   */
  async deleteUserData(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    let deletedCount = 0;

    try {
      // Delete from all RLHF tables
      const tables = [TABLES.FEEDBACK, TABLES.INTERACTIONS, TABLES.USAGE, TABLES.CORRECTIONS];

      for (const table of tables) {
        try {
          const result = await zerodbService.deleteRows(table, {
            filter: { userId }
          });
          deletedCount += result?.deleted || 0;
        } catch (e) {
          // Table may not exist or no data
          console.log(`No data to delete from ${table} for user ${userId}`);
        }
      }
    } catch (error) {
      console.error('Error deleting user data:', error);
      throw error;
    }

    return {
      success: true,
      deletedCount
    };
  }

  /**
   * Anonymize user data while preserving patterns
   * @param {string} userId - User ID
   * @returns {Object} Result
   */
  async anonymizeData(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const anonymizedUserId = this.hashUserId(userId);
    let anonymizedCount = 0;

    try {
      const tables = [TABLES.FEEDBACK, TABLES.INTERACTIONS, TABLES.USAGE, TABLES.CORRECTIONS];

      for (const table of tables) {
        try {
          const result = await zerodbService.updateRows(table, {
            filter: { userId },
            update: { userId: anonymizedUserId, anonymized: true }
          });
          anonymizedCount += result?.updated || 0;
        } catch (e) {
          console.log(`No data to anonymize in ${table} for user ${userId}`);
        }
      }
    } catch (error) {
      console.error('Error anonymizing data:', error);
      throw error;
    }

    return {
      success: true,
      anonymizedCount
    };
  }

  /**
   * Hash user ID for anonymization
   * @param {string} userId - User ID
   * @returns {string} Hashed ID
   */
  hashUserId(userId) {
    return crypto.createHash('sha256').update(userId).digest('hex').substring(0, 16);
  }

  // =====================
  // Analytics
  // =====================

  /**
   * Get feedback analytics
   * @param {Object} options - Filter options
   * @returns {Object} Analytics data
   */
  async getFeedbackAnalytics(options = {}) {
    try {
      const filter = {};

      if (options.startDate) {
        filter.timestamp = filter.timestamp || {};
        filter.timestamp.$gte = options.startDate;
      }
      if (options.endDate) {
        filter.timestamp = filter.timestamp || {};
        filter.timestamp.$lte = options.endDate;
      }
      if (options.feature) {
        filter.feature = options.feature;
      }

      const feedbackData = await zerodbService.queryTable(TABLES.FEEDBACK, { filter });
      const totalFeedback = await zerodbService.countRows(TABLES.FEEDBACK, filter);

      // Calculate metrics
      let thumbsUp = 0;
      let thumbsDown = 0;
      let ratingSum = 0;
      let ratingCount = 0;

      feedbackData.forEach(fb => {
        if (fb.feedbackType === 'thumbs_up') thumbsUp++;
        if (fb.feedbackType === 'thumbs_down') thumbsDown++;
        if (fb.feedbackType === 'rating' && fb.rating) {
          ratingSum += fb.rating;
          ratingCount++;
        }
      });

      const positiveRate = thumbsUp + thumbsDown > 0 ?
        thumbsUp / (thumbsUp + thumbsDown) : 0;
      const avgRating = ratingCount > 0 ? ratingSum / ratingCount : 0;

      return {
        totalFeedback,
        positiveRate,
        avgRating,
        byType: {
          thumbs_up: thumbsUp,
          thumbs_down: thumbsDown,
          rating: ratingCount
        }
      };
    } catch (error) {
      console.error('Error getting feedback analytics:', error);
      throw error;
    }
  }

  /**
   * Get analytics by model
   * @returns {Object} Analytics by model
   */
  async getAnalyticsByModel() {
    try {
      const interactionData = await zerodbService.queryTable(TABLES.INTERACTIONS, {});

      // Group by model
      const modelStats = {};
      interactionData.forEach(int => {
        const model = int.model || 'unknown';
        if (!modelStats[model]) {
          modelStats[model] = { count: 0, ratings: [] };
        }
        modelStats[model].count++;
      });

      const feedbackData = await zerodbService.queryTable(TABLES.FEEDBACK, {
        filter: { feedbackType: 'rating' }
      });

      const models = Object.entries(modelStats).map(([model, stats]) => ({
        model,
        count: stats.count,
        avgRating: stats.ratings.length > 0 ?
          stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length : 0
      }));

      return {
        models
      };
    } catch (error) {
      console.error('Error getting analytics by model:', error);
      throw error;
    }
  }

  /**
   * Get interaction analytics
   * @returns {Object} Interaction analytics
   */
  async getInteractionAnalytics() {
    try {
      const totalInteractions = await zerodbService.countRows(TABLES.INTERACTIONS, {});
      const errorCount = await zerodbService.countRows(TABLES.INTERACTIONS, { hasError: true });

      const interactionData = await zerodbService.queryTable(TABLES.INTERACTIONS, {
        limit: 1000
      });

      // Calculate averages
      let totalTokens = 0;
      let tokenCount = 0;
      let totalLatency = 0;
      let latencyCount = 0;

      interactionData.forEach(int => {
        if (int.tokenCounts?.totalTokens) {
          totalTokens += int.tokenCounts.totalTokens;
          tokenCount++;
        }
        if (int.latencyMs) {
          totalLatency += int.latencyMs;
          latencyCount++;
        }
      });

      const avgTokens = tokenCount > 0 ? totalTokens / tokenCount : 0;
      const avgLatency = latencyCount > 0 ? totalLatency / latencyCount : 0;
      const errorRate = totalInteractions > 0 ? errorCount / totalInteractions : 0;

      return {
        totalInteractions,
        avgTokens,
        avgLatency,
        errorRate,
        errorCount
      };
    } catch (error) {
      console.error('Error getting interaction analytics:', error);
      throw error;
    }
  }

  /**
   * Get correction analytics
   * @returns {Object} Correction analytics
   */
  async getCorrectionAnalytics() {
    try {
      const totalCorrections = await zerodbService.countRows(TABLES.CORRECTIONS, {});
      const correctionData = await zerodbService.queryTable(TABLES.CORRECTIONS, {});

      // Group by type
      const byType = {};
      VALID_CORRECTION_TYPES.forEach(type => {
        byType[type] = 0;
      });

      correctionData.forEach(corr => {
        if (byType[corr.correctionType] !== undefined) {
          byType[corr.correctionType]++;
        }
      });

      return {
        totalCorrections,
        byType
      };
    } catch (error) {
      console.error('Error getting correction analytics:', error);
      throw error;
    }
  }

  /**
   * Get aggregated dashboard metrics
   * @returns {Object} Dashboard metrics
   */
  async getDashboardMetrics() {
    try {
      const [totalInteractions, totalFeedback, totalCorrections, errorCount] = await Promise.all([
        zerodbService.countRows(TABLES.INTERACTIONS, {}),
        zerodbService.countRows(TABLES.FEEDBACK, {}),
        zerodbService.countRows(TABLES.CORRECTIONS, {}),
        zerodbService.countRows(TABLES.INTERACTIONS, { hasError: true })
      ]);

      const feedbackData = await zerodbService.queryTable(TABLES.FEEDBACK, {
        filter: { feedbackType: 'rating' }
      });

      let ratingSum = 0;
      feedbackData.forEach(fb => {
        if (fb.rating) ratingSum += fb.rating;
      });
      const averageRating = feedbackData.length > 0 ? ratingSum / feedbackData.length : 0;

      const thumbsData = await zerodbService.queryTable(TABLES.FEEDBACK, {
        filter: { feedbackType: { $in: ['thumbs_up', 'thumbs_down'] } }
      });

      const thumbsUp = thumbsData.filter(fb => fb.feedbackType === 'thumbs_up').length;
      const positiveRate = thumbsData.length > 0 ? thumbsUp / thumbsData.length : 0;

      return {
        totalInteractions,
        totalFeedback,
        totalCorrections,
        averageRating,
        positiveRate,
        errorRate: totalInteractions > 0 ? errorCount / totalInteractions : 0
      };
    } catch (error) {
      console.error('Error getting dashboard metrics:', error);
      throw error;
    }
  }

  // =====================
  // Data Export
  // =====================

  /**
   * Export RLHF data for training
   * @param {Object} options - Export options
   * @returns {Object} Exported data
   */
  async exportData(options = {}) {
    const format = options.format || 'json';

    if (!VALID_EXPORT_FORMATS.includes(format)) {
      throw new Error('Unsupported export format');
    }

    try {
      const filter = {};

      if (options.startDate) {
        filter.timestamp = filter.timestamp || {};
        filter.timestamp.$gte = options.startDate;
      }
      if (options.endDate) {
        filter.timestamp = filter.timestamp || {};
        filter.timestamp.$lte = options.endDate;
      }
      if (options.minRating) {
        filter.rating = { $gte: options.minRating };
      }

      // Get interactions
      let data = [];
      if (options.includeInteractions !== false) {
        const interactions = await zerodbService.queryTable(TABLES.INTERACTIONS, { filter });
        data = data.concat(interactions);
      }

      // Get feedback if requested
      if (options.includeFeedback) {
        const feedback = await zerodbService.queryTable(TABLES.FEEDBACK, { filter });
        // Merge feedback with interactions
        const feedbackMap = {};
        feedback.forEach(fb => {
          feedbackMap[fb.interactionId] = fb;
        });

        data = data.map(d => ({
          ...d,
          feedback: feedbackMap[d.interactionId] || null
        }));
      }

      // Get corrections if requested
      if (options.includeCorrections) {
        const corrections = await zerodbService.queryTable(TABLES.CORRECTIONS, { filter });
        const correctionMap = {};
        corrections.forEach(c => {
          correctionMap[c.interactionId] = c;
        });

        data = data.map(d => ({
          ...d,
          correction: correctionMap[d.interactionId] || null
        }));
      }

      // Anonymize if requested
      if (options.anonymize) {
        data = data.map(d => ({
          ...d,
          userId: this.hashUserId(d.userId || 'anonymous')
        }));
      }

      // Format output
      let output;
      if (format === 'json') {
        output = data;
      } else if (format === 'jsonl') {
        output = data.map(d => JSON.stringify(d)).join('\n');
      } else if (format === 'csv') {
        output = this.convertToCSV(data);
      }

      return {
        format,
        data: output,
        count: data.length,
        includesCorrections: !!options.includeCorrections,
        anonymized: !!options.anonymize
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  /**
   * Export all data for a specific user
   * @param {string} userId - User ID
   * @returns {Object} User's data
   */
  async exportForUser(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const [interactions, feedback, corrections, usage] = await Promise.all([
        zerodbService.queryTable(TABLES.INTERACTIONS, { filter: { userId } }),
        zerodbService.queryTable(TABLES.FEEDBACK, { filter: { userId } }),
        zerodbService.queryTable(TABLES.CORRECTIONS, { filter: { userId } }),
        zerodbService.queryTable(TABLES.USAGE, { filter: { userId } })
      ]);

      return {
        userId,
        data: {
          interactions,
          feedback,
          corrections,
          usage
        },
        counts: {
          interactions: interactions.length,
          feedback: feedback.length,
          corrections: corrections.length,
          usage: usage.length
        },
        exportedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw error;
    }
  }

  /**
   * Convert data to CSV format
   * @param {Array} data - Data to convert
   * @returns {string} CSV string
   */
  convertToCSV(data) {
    if (!data || data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    data.forEach(row => {
      const values = headers.map(header => {
        const val = row[header];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return JSON.stringify(val).replace(/,/g, ';');
        return String(val).replace(/,/g, ';');
      });
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  }

  // =====================
  // Reward Scoring
  // =====================

  /**
   * Calculate reward score from feedback
   * @param {Object} feedback - Feedback data
   * @returns {number} Reward score (-1 to 1)
   */
  calculateRewardScore(feedback) {
    let score = 0;

    if (feedback.feedbackType === 'thumbs_up') {
      score = 1;
    } else if (feedback.feedbackType === 'thumbs_down') {
      score = -1;
    } else if (feedback.feedbackType === 'rating' && feedback.rating) {
      // Normalize rating from 1-5 to -1 to 1
      // 1 -> -1, 2 -> -0.5, 3 -> 0, 4 -> 0.5, 5 -> 1
      score = (feedback.rating - 3) / 2;
    }

    // Apply correction penalty
    if (feedback.hasCorrection) {
      score = score - 0.25;
      // Clamp to -1 to 1
      score = Math.max(-1, Math.min(1, score));
    }

    return score;
  }

  // =====================
  // Batch Operations
  // =====================

  /**
   * Store multiple feedback entries
   * @param {Array} feedbackList - List of feedback items
   * @returns {Object} Result
   */
  async batchStoreFeedback(feedbackList) {
    let storedCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const feedback of feedbackList) {
      try {
        await this.captureFeedback(feedback);
        storedCount++;
      } catch (error) {
        failedCount++;
        errors.push({ feedback, error: error.message });
      }
    }

    return {
      success: failedCount === 0,
      storedCount,
      failedCount,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Store multiple interactions
   * @param {Array} interactions - List of interactions
   * @returns {Object} Result
   */
  async batchStoreInteractions(interactions) {
    let storedCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const interaction of interactions) {
      try {
        await this.storeInteraction(interaction);
        storedCount++;
      } catch (error) {
        failedCount++;
        errors.push({ interaction, error: error.message });
      }
    }

    return {
      success: failedCount === 0,
      storedCount,
      failedCount,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

// Export singleton instance
module.exports = new RLHFService();

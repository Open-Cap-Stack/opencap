/**
 * RLHF Controller
 *
 * API endpoints for Reinforcement Learning from Human Feedback (RLHF)
 * data collection operations.
 *
 * [Feature] Issue #29: Implement RLHF data collection
 */

const rlhfService = require('../services/rlhfService');

/**
 * Submit feedback on an AI interaction
 * POST /api/rlhf/feedback
 */
exports.submitFeedback = async (req, res) => {
  try {
    const { interactionId, feedbackType, rating, comment, sessionId, context } = req.body;

    if (!interactionId) {
      return res.status(400).json({
        error: 'Interaction ID is required'
      });
    }

    if (!feedbackType) {
      return res.status(400).json({
        error: 'Feedback type is required'
      });
    }

    const feedback = {
      interactionId,
      userId: req.user?.userId || req.body.userId,
      feedbackType,
      rating,
      comment,
      sessionId,
      context
    };

    const result = await rlhfService.captureFeedback(feedback);

    res.status(201).json(result);
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({
      error: 'Error submitting feedback',
      message: error.message
    });
  }
};

/**
 * Record an AI interaction (prompt/response)
 * POST /api/rlhf/interaction
 */
exports.recordInteraction = async (req, res) => {
  try {
    const {
      sessionId,
      prompt,
      response,
      model,
      feature,
      tokenCounts,
      latencyMs,
      conversationId,
      parentInteractionId,
      error: interactionError,
      metadata
    } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: 'Prompt is required'
      });
    }

    if (!response && !interactionError) {
      return res.status(400).json({
        error: 'Response is required'
      });
    }

    const interaction = {
      userId: req.user?.userId || req.body.userId,
      sessionId,
      prompt,
      response,
      model,
      feature,
      tokenCounts,
      latencyMs,
      conversationId,
      parentInteractionId,
      error: interactionError,
      metadata
    };

    const result = await rlhfService.storeInteraction(interaction);

    res.status(201).json(result);
  } catch (error) {
    console.error('Error recording interaction:', error);
    res.status(500).json({
      error: 'Error recording interaction',
      message: error.message
    });
  }
};

/**
 * Track feature usage
 * POST /api/rlhf/usage
 */
exports.trackUsage = async (req, res) => {
  try {
    const { sessionId, feature, action, durationMs, metadata } = req.body;

    if (!feature) {
      return res.status(400).json({
        error: 'Feature name is required'
      });
    }

    if (!action) {
      return res.status(400).json({
        error: 'Action is required'
      });
    }

    const usage = {
      userId: req.user?.userId || req.body.userId,
      sessionId,
      feature,
      action,
      durationMs,
      metadata
    };

    const result = await rlhfService.recordFeatureUsage(usage);

    res.status(201).json(result);
  } catch (error) {
    console.error('Error tracking usage:', error);
    res.status(500).json({
      error: 'Error tracking usage',
      message: error.message
    });
  }
};

/**
 * Submit a correction to an AI response
 * POST /api/rlhf/correction
 */
exports.submitCorrection = async (req, res) => {
  try {
    const {
      interactionId,
      originalResponse,
      correctedResponse,
      correctionType,
      explanation
    } = req.body;

    if (!interactionId) {
      return res.status(400).json({
        error: 'Interaction ID is required'
      });
    }

    if (!correctedResponse) {
      return res.status(400).json({
        error: 'Corrected response is required'
      });
    }

    const correction = {
      interactionId,
      userId: req.user?.userId || req.body.userId,
      originalResponse,
      correctedResponse,
      correctionType,
      explanation
    };

    const result = await rlhfService.recordCorrection(correction);

    res.status(201).json(result);
  } catch (error) {
    console.error('Error submitting correction:', error);
    res.status(500).json({
      error: 'Error submitting correction',
      message: error.message
    });
  }
};

/**
 * Get aggregated RLHF analytics
 * GET /api/rlhf/analytics
 */
exports.getAnalytics = async (req, res) => {
  try {
    const result = await rlhfService.getDashboardMetrics();

    res.status(200).json(result);
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({
      error: 'Error getting analytics',
      message: error.message
    });
  }
};

/**
 * Get feedback-specific analytics
 * GET /api/rlhf/analytics/feedback
 */
exports.getFeedbackAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, feature } = req.query;

    const options = {};
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    if (feature) options.feature = feature;

    const result = await rlhfService.getFeedbackAnalytics(options);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error getting feedback analytics:', error);
    res.status(500).json({
      error: 'Error getting feedback analytics',
      message: error.message
    });
  }
};

/**
 * Get interaction-specific analytics
 * GET /api/rlhf/analytics/interactions
 */
exports.getInteractionAnalytics = async (req, res) => {
  try {
    const result = await rlhfService.getInteractionAnalytics();

    res.status(200).json(result);
  } catch (error) {
    console.error('Error getting interaction analytics:', error);
    res.status(500).json({
      error: 'Error getting interaction analytics',
      message: error.message
    });
  }
};

/**
 * Get correction-specific analytics
 * GET /api/rlhf/analytics/corrections
 */
exports.getCorrectionAnalytics = async (req, res) => {
  try {
    const result = await rlhfService.getCorrectionAnalytics();

    res.status(200).json(result);
  } catch (error) {
    console.error('Error getting correction analytics:', error);
    res.status(500).json({
      error: 'Error getting correction analytics',
      message: error.message
    });
  }
};

/**
 * Export RLHF data
 * GET /api/rlhf/export
 */
exports.exportData = async (req, res) => {
  try {
    const {
      format = 'json',
      startDate,
      endDate,
      minRating,
      includeInteractions,
      includeFeedback,
      includeCorrections,
      anonymize
    } = req.query;

    const options = {
      format,
      startDate,
      endDate,
      minRating: minRating ? parseInt(minRating) : undefined,
      includeInteractions: includeInteractions !== 'false',
      includeFeedback: includeFeedback === 'true',
      includeCorrections: includeCorrections === 'true',
      anonymize: anonymize === 'true'
    };

    const result = await rlhfService.exportData(options);

    res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Unsupported export format') {
      return res.status(400).json({
        error: error.message
      });
    }

    console.error('Error exporting data:', error);
    res.status(500).json({
      error: 'Error exporting data',
      message: error.message
    });
  }
};

/**
 * Update user consent settings
 * PUT /api/rlhf/consent
 */
exports.updateConsent = async (req, res) => {
  try {
    const {
      collectInteractions,
      collectFeedback,
      allowAnalytics,
      allowDataExport
    } = req.body;

    const consent = {
      userId: req.user?.userId || req.body.userId,
      collectInteractions,
      collectFeedback,
      allowAnalytics,
      allowDataExport
    };

    const result = await rlhfService.updateConsentSettings(consent);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error updating consent:', error);
    res.status(500).json({
      error: 'Error updating consent',
      message: error.message
    });
  }
};

/**
 * Get user consent settings
 * GET /api/rlhf/consent
 */
exports.getConsent = async (req, res) => {
  try {
    const userId = req.user?.userId || req.query.userId;

    const result = await rlhfService.getConsentSettings(userId);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error getting consent:', error);
    res.status(500).json({
      error: 'Error getting consent',
      message: error.message
    });
  }
};

/**
 * Delete user's RLHF data
 * DELETE /api/rlhf/user-data
 */
exports.deleteUserData = async (req, res) => {
  try {
    const userId = req.user?.userId;

    const result = await rlhfService.deleteUserData(userId);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error deleting user data:', error);
    res.status(500).json({
      error: 'Error deleting user data',
      message: error.message
    });
  }
};

/**
 * Export user's own RLHF data
 * GET /api/rlhf/user-export
 */
exports.exportUserData = async (req, res) => {
  try {
    const userId = req.user?.userId;

    const result = await rlhfService.exportForUser(userId);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error exporting user data:', error);
    res.status(500).json({
      error: 'Error exporting user data',
      message: error.message
    });
  }
};

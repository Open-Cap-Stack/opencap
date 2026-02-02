/**
 * RLHF Routes
 *
 * API routes for Reinforcement Learning from Human Feedback (RLHF)
 * data collection operations.
 *
 * [Feature] Issue #29: Implement RLHF data collection
 */

const express = require('express');
const rlhfController = require('../../controllers/rlhfController');
const { authenticateToken } = require('../../middleware/authMiddleware');

const router = express.Router();

// =====================
// Feedback Endpoints
// =====================

/**
 * POST /api/rlhf/feedback
 * Submit feedback on an AI interaction (thumbs up/down, rating, comment)
 */
router.post('/feedback',
  authenticateToken,
  rlhfController.submitFeedback
);

// =====================
// Interaction Endpoints
// =====================

/**
 * POST /api/rlhf/interaction
 * Record an AI interaction (prompt/response pair)
 */
router.post('/interaction',
  authenticateToken,
  rlhfController.recordInteraction
);

// =====================
// Usage Tracking Endpoints
// =====================

/**
 * POST /api/rlhf/usage
 * Track AI feature usage event
 */
router.post('/usage',
  authenticateToken,
  rlhfController.trackUsage
);

// =====================
// Correction Endpoints
// =====================

/**
 * POST /api/rlhf/correction
 * Submit a correction to an AI response
 */
router.post('/correction',
  authenticateToken,
  rlhfController.submitCorrection
);

// =====================
// Analytics Endpoints
// =====================

/**
 * GET /api/rlhf/analytics
 * Get aggregated RLHF dashboard metrics
 */
router.get('/analytics',
  authenticateToken,
  rlhfController.getAnalytics
);

/**
 * GET /api/rlhf/analytics/feedback
 * Get feedback-specific analytics
 */
router.get('/analytics/feedback',
  authenticateToken,
  rlhfController.getFeedbackAnalytics
);

/**
 * GET /api/rlhf/analytics/interactions
 * Get interaction-specific analytics
 */
router.get('/analytics/interactions',
  authenticateToken,
  rlhfController.getInteractionAnalytics
);

/**
 * GET /api/rlhf/analytics/corrections
 * Get correction-specific analytics
 */
router.get('/analytics/corrections',
  authenticateToken,
  rlhfController.getCorrectionAnalytics
);

// =====================
// Data Export Endpoints
// =====================

/**
 * GET /api/rlhf/export
 * Export RLHF data for training (JSON, JSONL, CSV)
 */
router.get('/export',
  authenticateToken,
  rlhfController.exportData
);

/**
 * GET /api/rlhf/user-export
 * Export current user's RLHF data
 */
router.get('/user-export',
  authenticateToken,
  rlhfController.exportUserData
);

// =====================
// Privacy & Consent Endpoints
// =====================

/**
 * GET /api/rlhf/consent
 * Get user's consent settings
 */
router.get('/consent',
  authenticateToken,
  rlhfController.getConsent
);

/**
 * PUT /api/rlhf/consent
 * Update user's consent settings for RLHF data collection
 */
router.put('/consent',
  authenticateToken,
  rlhfController.updateConsent
);

/**
 * DELETE /api/rlhf/user-data
 * Delete current user's RLHF data (right to be forgotten)
 */
router.delete('/user-data',
  authenticateToken,
  rlhfController.deleteUserData
);

module.exports = router;

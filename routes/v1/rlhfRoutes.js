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
const { hasRole } = require('../../middleware/rbacMiddleware');

const router = express.Router();

// =====================
// Feedback Endpoints
// =====================

/**
 * POST /api/rlhf/feedback
 * Submit feedback on an AI interaction (thumbs up/down, rating, comment)
 */
router.post('/feedback', authenticateToken, hasRole(['super_admin', 'admin']), rlhfController.submitFeedback
);

// =====================
// Interaction Endpoints
// =====================

/**
 * POST /api/rlhf/interaction
 * Record an AI interaction (prompt/response pair)
 */
router.post('/interaction', authenticateToken, hasRole(['super_admin', 'admin']), rlhfController.recordInteraction
);

// =====================
// Usage Tracking Endpoints
// =====================

/**
 * POST /api/rlhf/usage
 * Track AI feature usage event
 */
router.post('/usage', authenticateToken, hasRole(['super_admin', 'admin']), rlhfController.trackUsage
);

// =====================
// Correction Endpoints
// =====================

/**
 * POST /api/rlhf/correction
 * Submit a correction to an AI response
 */
router.post('/correction', authenticateToken, hasRole(['super_admin', 'admin']), rlhfController.submitCorrection
);

// =====================
// Analytics Endpoints
// =====================

/**
 * GET /api/rlhf/analytics
 * Get aggregated RLHF dashboard metrics
 */
router.get('/analytics', authenticateToken, hasRole(['super_admin', 'admin']), rlhfController.getAnalytics
);

/**
 * GET /api/rlhf/analytics/feedback
 * Get feedback-specific analytics
 */
router.get('/analytics/feedback', authenticateToken, hasRole(['super_admin', 'admin']), rlhfController.getFeedbackAnalytics
);

/**
 * GET /api/rlhf/analytics/interactions
 * Get interaction-specific analytics
 */
router.get('/analytics/interactions', authenticateToken, hasRole(['super_admin', 'admin']), rlhfController.getInteractionAnalytics
);

/**
 * GET /api/rlhf/analytics/corrections
 * Get correction-specific analytics
 */
router.get('/analytics/corrections', authenticateToken, hasRole(['super_admin', 'admin']), rlhfController.getCorrectionAnalytics
);

// =====================
// Data Export Endpoints
// =====================

/**
 * GET /api/rlhf/export
 * Export RLHF data for training (JSON, JSONL, CSV)
 */
router.get('/export', authenticateToken, hasRole(['super_admin', 'admin']), rlhfController.exportData
);

/**
 * GET /api/rlhf/user-export
 * Export current user's RLHF data
 */
router.get('/user-export', authenticateToken, hasRole(['super_admin', 'admin']), rlhfController.exportUserData
);

// =====================
// Privacy & Consent Endpoints
// =====================

/**
 * GET /api/rlhf/consent
 * Get user's consent settings
 */
router.get('/consent', authenticateToken, hasRole(['super_admin', 'admin']), rlhfController.getConsent
);

/**
 * PUT /api/rlhf/consent
 * Update user's consent settings for RLHF data collection
 */
router.put('/consent', authenticateToken, hasRole(['super_admin', 'admin']), rlhfController.updateConsent
);

/**
 * DELETE /api/rlhf/user-data
 * Delete current user's RLHF data (right to be forgotten)
 */
router.delete('/user-data', authenticateToken, hasRole(['super_admin', 'admin']), rlhfController.deleteUserData
);

module.exports = router;

/**
 * Risk Assessment Routes
 *
 * [Feature] Issue #44: Implement Enhanced Financial Services
 * REST API routes for risk assessment features
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const riskAssessmentController = require('../../controllers/riskAssessmentController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route GET /api/v1/risk-assessment/score/:companyId
 * @desc Get risk score for a company
 * @access Private
 */
router.get('/score/:companyId', riskAssessmentController.getRiskScore);

/**
 * @route POST /api/v1/risk-assessment/score
 * @desc Calculate risk score with custom options
 * @access Private
 */
router.post('/score', riskAssessmentController.calculateRiskScore);

/**
 * @route GET /api/v1/risk-assessment/anomalies/:companyId
 * @desc Get detected anomalies for a company
 * @access Private
 */
router.get('/anomalies/:companyId', riskAssessmentController.getAnomalies);

/**
 * @route POST /api/v1/risk-assessment/anomalies
 * @desc Detect anomalies with custom options
 * @access Private
 */
router.post('/anomalies', riskAssessmentController.detectAnomalies);

/**
 * @route POST /api/v1/risk-assessment/alerts
 * @desc Create a new risk alert
 * @access Private
 */
router.post('/alerts', riskAssessmentController.createAlert);

/**
 * @route GET /api/v1/risk-assessment/alerts/:companyId
 * @desc Get alerts for a company
 * @access Private
 */
router.get('/alerts/:companyId', riskAssessmentController.getAlerts);

/**
 * @route PUT /api/v1/risk-assessment/alerts/:alertId/resolve
 * @desc Resolve an alert
 * @access Private
 */
router.put('/alerts/:alertId/resolve', riskAssessmentController.resolveAlert);

/**
 * @route GET /api/v1/risk-assessment/summary/:companyId
 * @desc Get comprehensive risk summary for a company
 * @access Private
 */
router.get('/summary/:companyId', riskAssessmentController.getRiskSummary);

module.exports = router;

/**
 * Risk Assessment Controller
 *
 * [Feature] Issue #44: Implement Enhanced Financial Services
 * REST API endpoints for risk assessment features
 */

const riskAssessmentService = require('../services/riskAssessmentService');

/**
 * Calculate risk score for a company
 * GET /api/v1/risk-assessment/score/:companyId
 */
const getRiskScore = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const result = await riskAssessmentService.calculateRiskScore(companyId);

    res.status(200).json(result);
  } catch (error) {
    console.error('Risk score error:', error);

    if (error.message === 'Financial data not found') {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to calculate risk score',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Calculate risk score with options
 * POST /api/v1/risk-assessment/score
 */
const calculateRiskScore = async (req, res) => {
  try {
    const { companyId, options } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const result = await riskAssessmentService.calculateRiskScore(companyId, options || {});

    res.status(200).json(result);
  } catch (error) {
    console.error('Calculate risk score error:', error);

    if (error.message === 'Financial data not found') {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to calculate risk score',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Detect anomalies in transactions
 * GET /api/v1/risk-assessment/anomalies/:companyId
 */
const getAnomalies = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { period, detectionType } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const options = {
      period,
      detectionType: detectionType || 'all'
    };

    const result = await riskAssessmentService.detectAnomalies(companyId, options);

    res.status(200).json(result);
  } catch (error) {
    console.error('Detect anomalies error:', error);
    res.status(500).json({
      error: 'Failed to detect anomalies',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Detect anomalies with custom options
 * POST /api/v1/risk-assessment/anomalies
 */
const detectAnomalies = async (req, res) => {
  try {
    const { companyId, period, detectionType, thresholds } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const options = {
      period,
      detectionType: detectionType || 'all',
      thresholds
    };

    const result = await riskAssessmentService.detectAnomalies(companyId, options);

    res.status(200).json(result);
  } catch (error) {
    console.error('Detect anomalies error:', error);
    res.status(500).json({
      error: 'Failed to detect anomalies',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create a risk alert
 * POST /api/v1/risk-assessment/alerts
 */
const createAlert = async (req, res) => {
  try {
    const { companyId, type, threshold, currentValue, message, severity } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    if (!type) {
      return res.status(400).json({ error: 'Alert type is required' });
    }

    const alertData = {
      type,
      threshold,
      currentValue,
      message,
      severity
    };

    const result = await riskAssessmentService.createAlert(companyId, alertData);

    if (result.duplicate) {
      return res.status(409).json({
        message: 'Active alert of this type already exists',
        existingAlertId: result.existingAlertId
      });
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({
      error: 'Failed to create alert',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get alerts for a company
 * GET /api/v1/risk-assessment/alerts/:companyId
 */
const getAlerts = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { status, severity, type } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const options = {
      status: status || 'active',
      severity,
      type
    };

    const result = await riskAssessmentService.getAlerts(companyId, options);

    res.status(200).json(result);
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({
      error: 'Failed to get alerts',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Resolve an alert
 * PUT /api/v1/risk-assessment/alerts/:alertId/resolve
 */
const resolveAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const { resolvedBy, notes } = req.body;

    if (!alertId) {
      return res.status(400).json({ error: 'Alert ID is required' });
    }

    const resolution = {
      resolvedBy: resolvedBy || req.user?.userId,
      notes
    };

    const result = await riskAssessmentService.resolveAlert(alertId, resolution);

    res.status(200).json(result);
  } catch (error) {
    console.error('Resolve alert error:', error);

    if (error.message === 'Alert not found') {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to resolve alert',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get comprehensive risk summary
 * GET /api/v1/risk-assessment/summary/:companyId
 */
const getRiskSummary = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const result = await riskAssessmentService.getRiskSummary(companyId);

    res.status(200).json(result);
  } catch (error) {
    console.error('Risk summary error:', error);
    res.status(500).json({
      error: 'Failed to get risk summary',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getRiskScore,
  calculateRiskScore,
  getAnomalies,
  detectAnomalies,
  createAlert,
  getAlerts,
  resolveAlert,
  getRiskSummary
};

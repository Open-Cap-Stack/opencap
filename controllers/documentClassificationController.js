/**
 * Document Classification Controller
 *
 * [Feature] OCAE-45: AI/ML Services for Document Processing
 * Handles HTTP requests for document classification functionality
 */

const documentClassificationService = require('../services/documentClassificationService');

/**
 * Classify a document
 * POST /api/v1/ai/classify
 */
const classifyDocument = async (req, res) => {
  try {
    const { text, options } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const result = await documentClassificationService.classifyDocument(text, options || {});

    return res.status(200).json(result);
  } catch (error) {
    console.error('Classify document error:', error);

    if (error.message.includes('null or undefined')) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({
      error: 'Failed to classify document'
    });
  }
};

/**
 * Get classification confidence for a specific type
 * POST /api/v1/ai/classify/confidence
 */
const getClassificationConfidence = async (req, res) => {
  try {
    const { text, type } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const result = await documentClassificationService.getClassificationConfidence(text, type);

    return res.status(200).json({ confidence: result });
  } catch (error) {
    console.error('Get classification confidence error:', error);

    if (error.message.includes('Invalid classification type')) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({
      error: 'Failed to get classification confidence'
    });
  }
};

/**
 * Train classifier with new examples
 * POST /api/v1/ai/classify/train
 */
const trainClassifier = async (req, res) => {
  try {
    const { trainingData, options } = req.body;

    if (!trainingData || !Array.isArray(trainingData)) {
      return res.status(400).json({ error: 'Training data array is required' });
    }

    const result = await documentClassificationService.trainClassifier(trainingData, options || {});

    return res.status(200).json(result);
  } catch (error) {
    console.error('Train classifier error:', error);

    if (error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({
      error: 'Failed to train classifier'
    });
  }
};

/**
 * Get classification statistics
 * GET /api/v1/ai/classify/stats
 */
const getClassificationStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const options = {};
    if (startDate && endDate) {
      options.startDate = new Date(startDate);
      options.endDate = new Date(endDate);
    }

    const stats = await documentClassificationService.getClassificationStats(options);

    return res.status(200).json(stats);
  } catch (error) {
    console.error('Get classification stats error:', error);
    return res.status(500).json({
      error: 'Failed to get classification statistics'
    });
  }
};

/**
 * Classify documents in batch
 * POST /api/v1/ai/classify/batch
 */
const classifyBatch = async (req, res) => {
  try {
    const { documents, options } = req.body;

    if (!documents || !Array.isArray(documents)) {
      return res.status(400).json({ error: 'Documents array is required' });
    }

    const result = await documentClassificationService.classifyBatch(documents, options || {});

    return res.status(200).json(result);
  } catch (error) {
    console.error('Batch classify error:', error);
    return res.status(500).json({
      error: 'Failed to classify documents in batch'
    });
  }
};

/**
 * Submit feedback for a classification
 * POST /api/v1/ai/classify/feedback
 */
const submitFeedback = async (req, res) => {
  try {
    const { classificationId, feedback } = req.body;

    if (!classificationId) {
      return res.status(400).json({ error: 'Classification ID is required' });
    }

    if (!feedback) {
      return res.status(400).json({ error: 'Feedback is required' });
    }

    const result = await documentClassificationService.submitFeedback(classificationId, feedback);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Submit feedback error:', error);
    return res.status(500).json({
      error: 'Failed to submit feedback'
    });
  }
};

/**
 * Get supported classification types
 * GET /api/v1/ai/classify/types
 */
const getSupportedTypes = async (req, res) => {
  try {
    const types = documentClassificationService.getSupportedTypes();
    return res.status(200).json({ types });
  } catch (error) {
    console.error('Get supported types error:', error);
    return res.status(500).json({
      error: 'Failed to get supported types'
    });
  }
};

/**
 * Get training history
 * GET /api/v1/ai/classify/training-history
 */
const getTrainingHistory = async (req, res) => {
  try {
    const history = await documentClassificationService.getTrainingHistory();
    return res.status(200).json({ history });
  } catch (error) {
    console.error('Get training history error:', error);
    return res.status(500).json({
      error: 'Failed to get training history'
    });
  }
};

module.exports = {
  classifyDocument,
  getClassificationConfidence,
  trainClassifier,
  getClassificationStats,
  classifyBatch,
  submitFeedback,
  getSupportedTypes,
  getTrainingHistory
};

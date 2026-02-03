/**
 * Document Analysis Controller
 *
 * [Feature] OCAE-45: AI/ML Services for Document Processing
 * Handles HTTP requests for document analysis functionality
 */

const documentAnalysisService = require('../services/documentAnalysisService');

/**
 * Analyze document sentiment
 * POST /api/v1/ai/analyze/sentiment
 */
const analyzeSentiment = async (req, res) => {
  try {
    const { text, options } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const result = await documentAnalysisService.analyzeSentiment(text, options || {});

    return res.status(200).json(result);
  } catch (error) {
    console.error('Analyze sentiment error:', error);

    if (error.message.includes('null or undefined')) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({
      error: 'Failed to analyze sentiment'
    });
  }
};

/**
 * Detect risks in document
 * POST /api/v1/ai/analyze/risks
 */
const detectRisks = async (req, res) => {
  try {
    const { text, options } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const result = await documentAnalysisService.detectRisks(text, options || {});

    return res.status(200).json(result);
  } catch (error) {
    console.error('Detect risks error:', error);
    return res.status(500).json({
      error: 'Failed to detect risks'
    });
  }
};

/**
 * Extract financial data from document
 * POST /api/v1/ai/analyze/financial
 */
const extractFinancialData = async (req, res) => {
  try {
    const { text, options } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const result = await documentAnalysisService.extractFinancialData(text, options || {});

    return res.status(200).json(result);
  } catch (error) {
    console.error('Extract financial data error:', error);
    return res.status(500).json({
      error: 'Failed to extract financial data'
    });
  }
};

/**
 * Generate insights from document
 * POST /api/v1/ai/analyze/insights
 */
const generateInsights = async (req, res) => {
  try {
    const { text, options } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const result = await documentAnalysisService.generateInsights(text, options || {});

    return res.status(200).json(result);
  } catch (error) {
    console.error('Generate insights error:', error);
    return res.status(500).json({
      error: 'Failed to generate insights'
    });
  }
};

/**
 * Perform comprehensive document analysis
 * POST /api/v1/ai/analyze
 */
const analyzeDocument = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const result = await documentAnalysisService.analyzeDocument(text);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Analyze document error:', error);
    return res.status(500).json({
      error: 'Failed to analyze document'
    });
  }
};

/**
 * Analyze documents in batch
 * POST /api/v1/ai/analyze/batch
 */
const analyzeBatch = async (req, res) => {
  try {
    const { documents, options } = req.body;

    if (!documents || !Array.isArray(documents)) {
      return res.status(400).json({ error: 'Documents array is required' });
    }

    const result = await documentAnalysisService.analyzeBatch(documents, options || {});

    return res.status(200).json(result);
  } catch (error) {
    console.error('Batch analyze error:', error);
    return res.status(500).json({
      error: 'Failed to analyze documents in batch'
    });
  }
};

module.exports = {
  analyzeSentiment,
  detectRisks,
  extractFinancialData,
  generateInsights,
  analyzeDocument,
  analyzeBatch
};

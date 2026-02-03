/**
 * Document Summary Controller
 *
 * [Feature] OCAE-45: AI/ML Services for Document Processing
 * Handles HTTP requests for document summarization functionality
 */

const documentSummaryService = require('../services/documentSummaryService');

/**
 * Generate document summary
 * POST /api/v1/ai/summarize
 */
const generateSummary = async (req, res) => {
  try {
    const { text, options } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const result = await documentSummaryService.generateSummary(text, options || {});

    return res.status(200).json(result);
  } catch (error) {
    console.error('Generate summary error:', error);

    if (error.message.includes('null or undefined')) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({
      error: 'Failed to generate summary'
    });
  }
};

/**
 * Extract key points from document
 * POST /api/v1/ai/summarize/key-points
 */
const extractKeyPoints = async (req, res) => {
  try {
    const { text, options } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const result = await documentSummaryService.extractKeyPoints(text, options || {});

    return res.status(200).json(result);
  } catch (error) {
    console.error('Extract key points error:', error);
    return res.status(500).json({
      error: 'Failed to extract key points'
    });
  }
};

/**
 * Generate executive summary
 * POST /api/v1/ai/summarize/executive
 */
const generateExecutiveSummary = async (req, res) => {
  try {
    const { text, options } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const result = await documentSummaryService.generateExecutiveSummary(text, options || {});

    return res.status(200).json(result);
  } catch (error) {
    console.error('Generate executive summary error:', error);
    return res.status(500).json({
      error: 'Failed to generate executive summary'
    });
  }
};

/**
 * Summarize multiple documents
 * POST /api/v1/ai/summarize/multiple
 */
const summarizeMultiple = async (req, res) => {
  try {
    const { documents, options } = req.body;

    if (!documents || !Array.isArray(documents)) {
      return res.status(400).json({ error: 'Documents array is required' });
    }

    const result = await documentSummaryService.summarizeMultiple(documents, options || {});

    return res.status(200).json(result);
  } catch (error) {
    console.error('Summarize multiple error:', error);
    return res.status(500).json({
      error: 'Failed to summarize multiple documents'
    });
  }
};

/**
 * Summarize documents in batch
 * POST /api/v1/ai/summarize/batch
 */
const summarizeBatch = async (req, res) => {
  try {
    const { documents, options } = req.body;

    if (!documents || !Array.isArray(documents)) {
      return res.status(400).json({ error: 'Documents array is required' });
    }

    const result = await documentSummaryService.summarizeBatch(documents, options || {});

    return res.status(200).json(result);
  } catch (error) {
    console.error('Batch summarize error:', error);
    return res.status(500).json({
      error: 'Failed to summarize documents in batch'
    });
  }
};

module.exports = {
  generateSummary,
  extractKeyPoints,
  generateExecutiveSummary,
  summarizeMultiple,
  summarizeBatch
};

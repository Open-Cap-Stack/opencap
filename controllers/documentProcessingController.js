/**
 * Document Processing Controller
 *
 * [Feature] OCAE-45: AI/ML Services for Document Processing
 * Handles HTTP requests for document processing functionality
 */

const documentProcessingService = require('../services/documentProcessingService');

/**
 * Extract text from document content
 * POST /api/v1/ai/documents/extract
 */
const extractText = async (req, res) => {
  try {
    const { content, mimeType } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    if (!mimeType) {
      return res.status(400).json({ error: 'MIME type is required' });
    }

    if (!documentProcessingService.isSupportedMimeType(mimeType)) {
      return res.status(400).json({
        error: `Unsupported MIME type: ${mimeType}`,
        supportedTypes: documentProcessingService.getSupportedMimeTypes()
      });
    }

    const result = await documentProcessingService.extractText(content, mimeType);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Extract text error:', error);
    return res.status(500).json({
      error: 'Failed to extract text from document'
    });
  }
};

/**
 * Preprocess text
 * POST /api/v1/ai/documents/preprocess
 */
const preprocessText = async (req, res) => {
  try {
    const { text, options } = req.body;

    if (text === undefined) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const result = await documentProcessingService.preprocessText(text, options || {});

    return res.status(200).json(result);
  } catch (error) {
    console.error('Preprocess text error:', error);
    return res.status(500).json({
      error: 'Failed to preprocess text'
    });
  }
};

/**
 * Detect language of text
 * POST /api/v1/ai/documents/detect-language
 */
const detectLanguage = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const result = await documentProcessingService.detectLanguage(text);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Detect language error:', error);
    return res.status(500).json({
      error: 'Failed to detect language'
    });
  }
};

/**
 * Extract entities from text
 * POST /api/v1/ai/documents/extract-entities
 */
const extractEntities = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const result = await documentProcessingService.extractEntities(text);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Extract entities error:', error);
    return res.status(500).json({
      error: 'Failed to extract entities'
    });
  }
};

/**
 * Process documents in batch
 * POST /api/v1/ai/documents/batch
 */
const processBatch = async (req, res) => {
  try {
    const { documents } = req.body;

    if (!documents || !Array.isArray(documents)) {
      return res.status(400).json({ error: 'Documents array is required' });
    }

    const result = await documentProcessingService.processBatch(documents);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Batch process error:', error);
    return res.status(500).json({
      error: 'Failed to process documents in batch'
    });
  }
};

/**
 * Get supported MIME types
 * GET /api/v1/ai/documents/supported-types
 */
const getSupportedTypes = async (req, res) => {
  try {
    const types = documentProcessingService.getSupportedMimeTypes();
    return res.status(200).json({ supportedTypes: types });
  } catch (error) {
    console.error('Get supported types error:', error);
    return res.status(500).json({
      error: 'Failed to get supported types'
    });
  }
};

module.exports = {
  extractText,
  preprocessText,
  detectLanguage,
  extractEntities,
  processBatch,
  getSupportedTypes
};

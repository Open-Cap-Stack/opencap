/**
 * AI Document Processing Routes
 *
 * [Feature] OCAE-45: AI/ML Services for Document Processing
 * API routes for document processing, classification, summarization, and analysis
 */

const express = require('express');
const router = express.Router();

const documentProcessingController = require('../../controllers/documentProcessingController');
const documentClassificationController = require('../../controllers/documentClassificationController');
const documentSummaryController = require('../../controllers/documentSummaryController');
const documentAnalysisController = require('../../controllers/documentAnalysisController');

// ==========================================
// Document Processing Routes
// ==========================================

/**
 * @swagger
 * /api/v1/ai/documents/extract:
 *   post:
 *     summary: Extract text from document content
 *     description: Extracts text from various document formats (PDF, DOCX, images, etc.)
 *     tags: [AI Document Processing]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *               - mimeType
 *             properties:
 *               content:
 *                 type: string
 *                 description: Document content (base64 for binary files)
 *               mimeType:
 *                 type: string
 *                 description: MIME type of the document
 *     responses:
 *       200:
 *         description: Extracted text with metadata
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/documents/extract', documentProcessingController.extractText);

/**
 * @swagger
 * /api/v1/ai/documents/preprocess:
 *   post:
 *     summary: Preprocess text
 *     description: Clean and normalize text for further processing
 *     tags: [AI Document Processing]
 */
router.post('/documents/preprocess', documentProcessingController.preprocessText);

/**
 * @swagger
 * /api/v1/ai/documents/detect-language:
 *   post:
 *     summary: Detect document language
 *     description: Detect the language of document text
 *     tags: [AI Document Processing]
 */
router.post('/documents/detect-language', documentProcessingController.detectLanguage);

/**
 * @swagger
 * /api/v1/ai/documents/extract-entities:
 *   post:
 *     summary: Extract named entities
 *     description: Extract companies, people, dates, money, and other entities
 *     tags: [AI Document Processing]
 */
router.post('/documents/extract-entities', documentProcessingController.extractEntities);

/**
 * @swagger
 * /api/v1/ai/documents/batch:
 *   post:
 *     summary: Process documents in batch
 *     description: Process multiple documents at once
 *     tags: [AI Document Processing]
 */
router.post('/documents/batch', documentProcessingController.processBatch);

/**
 * @swagger
 * /api/v1/ai/documents/supported-types:
 *   get:
 *     summary: Get supported MIME types
 *     description: Returns list of supported document MIME types
 *     tags: [AI Document Processing]
 */
router.get('/documents/supported-types', documentProcessingController.getSupportedTypes);

// ==========================================
// Document Classification Routes
// ==========================================

/**
 * @swagger
 * /api/v1/ai/classify:
 *   post:
 *     summary: Classify document
 *     description: Classify document type (contract, financial, legal, etc.)
 *     tags: [AI Document Classification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: Document text to classify
 *               options:
 *                 type: object
 *                 properties:
 *                   topN:
 *                     type: integer
 *                     description: Number of top classifications to return
 *     responses:
 *       200:
 *         description: Classification result
 */
router.post('/classify', documentClassificationController.classifyDocument);

/**
 * @swagger
 * /api/v1/ai/classify/confidence:
 *   post:
 *     summary: Get classification confidence
 *     description: Get confidence score for a specific classification type
 *     tags: [AI Document Classification]
 */
router.post('/classify/confidence', documentClassificationController.getClassificationConfidence);

/**
 * @swagger
 * /api/v1/ai/classify/train:
 *   post:
 *     summary: Train classifier
 *     description: Train/update classifier with new examples
 *     tags: [AI Document Classification]
 */
router.post('/classify/train', documentClassificationController.trainClassifier);

/**
 * @swagger
 * /api/v1/ai/classify/stats:
 *   get:
 *     summary: Get classification statistics
 *     description: Get accuracy and usage statistics
 *     tags: [AI Document Classification]
 */
router.get('/classify/stats', documentClassificationController.getClassificationStats);

/**
 * @swagger
 * /api/v1/ai/classify/batch:
 *   post:
 *     summary: Classify documents in batch
 *     description: Classify multiple documents at once
 *     tags: [AI Document Classification]
 */
router.post('/classify/batch', documentClassificationController.classifyBatch);

/**
 * @swagger
 * /api/v1/ai/classify/feedback:
 *   post:
 *     summary: Submit classification feedback
 *     description: Submit correction for a classification
 *     tags: [AI Document Classification]
 */
router.post('/classify/feedback', documentClassificationController.submitFeedback);

/**
 * @swagger
 * /api/v1/ai/classify/types:
 *   get:
 *     summary: Get supported classification types
 *     description: Returns list of supported document types
 *     tags: [AI Document Classification]
 */
router.get('/classify/types', documentClassificationController.getSupportedTypes);

/**
 * @swagger
 * /api/v1/ai/classify/training-history:
 *   get:
 *     summary: Get training history
 *     description: Returns history of classifier training
 *     tags: [AI Document Classification]
 */
router.get('/classify/training-history', documentClassificationController.getTrainingHistory);

// ==========================================
// Document Summarization Routes
// ==========================================

/**
 * @swagger
 * /api/v1/ai/summarize:
 *   post:
 *     summary: Generate document summary
 *     description: Generate a summary from document text
 *     tags: [AI Document Summarization]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: Document text to summarize
 *               options:
 *                 type: object
 *                 properties:
 *                   maxLength:
 *                     type: integer
 *                     description: Maximum summary length
 *                   style:
 *                     type: string
 *                     enum: [extractive, abstractive]
 *     responses:
 *       200:
 *         description: Summary result
 */
router.post('/summarize', documentSummaryController.generateSummary);

/**
 * @swagger
 * /api/v1/ai/summarize/key-points:
 *   post:
 *     summary: Extract key points
 *     description: Extract key points from document
 *     tags: [AI Document Summarization]
 */
router.post('/summarize/key-points', documentSummaryController.extractKeyPoints);

/**
 * @swagger
 * /api/v1/ai/summarize/executive:
 *   post:
 *     summary: Generate executive summary
 *     description: Generate a short executive summary
 *     tags: [AI Document Summarization]
 */
router.post('/summarize/executive', documentSummaryController.generateExecutiveSummary);

/**
 * @swagger
 * /api/v1/ai/summarize/multiple:
 *   post:
 *     summary: Summarize multiple documents
 *     description: Create unified summary from multiple documents
 *     tags: [AI Document Summarization]
 */
router.post('/summarize/multiple', documentSummaryController.summarizeMultiple);

/**
 * @swagger
 * /api/v1/ai/summarize/batch:
 *   post:
 *     summary: Summarize documents in batch
 *     description: Summarize multiple documents individually
 *     tags: [AI Document Summarization]
 */
router.post('/summarize/batch', documentSummaryController.summarizeBatch);

// ==========================================
// Document Analysis Routes
// ==========================================

/**
 * @swagger
 * /api/v1/ai/analyze:
 *   post:
 *     summary: Comprehensive document analysis
 *     description: Perform full analysis including sentiment, risks, and financial data
 *     tags: [AI Document Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: Document text to analyze
 *     responses:
 *       200:
 *         description: Analysis result
 */
router.post('/analyze', documentAnalysisController.analyzeDocument);

/**
 * @swagger
 * /api/v1/ai/analyze/sentiment:
 *   post:
 *     summary: Analyze sentiment
 *     description: Analyze document sentiment (positive, negative, neutral)
 *     tags: [AI Document Analysis]
 */
router.post('/analyze/sentiment', documentAnalysisController.analyzeSentiment);

/**
 * @swagger
 * /api/v1/ai/analyze/risks:
 *   post:
 *     summary: Detect risks
 *     description: Identify risk indicators in document
 *     tags: [AI Document Analysis]
 */
router.post('/analyze/risks', documentAnalysisController.detectRisks);

/**
 * @swagger
 * /api/v1/ai/analyze/financial:
 *   post:
 *     summary: Extract financial data
 *     description: Extract revenue, profit, expenses, and other financial figures
 *     tags: [AI Document Analysis]
 */
router.post('/analyze/financial', documentAnalysisController.extractFinancialData);

/**
 * @swagger
 * /api/v1/ai/analyze/insights:
 *   post:
 *     summary: Generate insights
 *     description: Generate AI-powered insights from document
 *     tags: [AI Document Analysis]
 */
router.post('/analyze/insights', documentAnalysisController.generateInsights);

/**
 * @swagger
 * /api/v1/ai/analyze/batch:
 *   post:
 *     summary: Analyze documents in batch
 *     description: Analyze multiple documents at once
 *     tags: [AI Document Analysis]
 */
router.post('/analyze/batch', documentAnalysisController.analyzeBatch);

module.exports = router;

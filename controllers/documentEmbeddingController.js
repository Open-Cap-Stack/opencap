/**
 * Document Processing Pipeline Controller - ZeroDB Migration
 *
 * [Feature] OCAE-404: Advanced Document Processing
 * Implements document text extraction, OCR, classification, and summarization
 * with AI-powered analysis and automated processing workflows
 *
 * Migrated from MongoDB/Mongoose to ZeroDB for Issue #19
 */

const zerodbService = require('../services/zerodbService');
const vectorService = require('../services/vectorService');
const streamingService = require('../services/streamingService');
const memoryService = require('../services/memoryService');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { PDFExtract } = require('pdf.js-extract');
const tesseract = require('tesseract.js');
const sharp = require('sharp');
const mammoth = require('mammoth');
const { OpenAI } = require('openai');

const DOCUMENTS_TABLE = 'documents';
const EMBEDDINGS_TABLE = 'document_embeddings';

// Configure OpenAI for text processing (updated for openai v4+)
// Allow instantiation without API key for test environments
let openai = null;
try {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'test-key-for-loading',
  });
} catch (error) {
  console.warn('OpenAI client initialization skipped:', error.message);
}

// Configure multer for file uploads (use /tmp for Railway compatibility)
const upload = multer({
  dest: process.env.NODE_ENV === 'production' ? '/tmp/uploads/processing/' : 'uploads/processing/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/tiff'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'), false);
    }
  }
});

/**
 * Document Text Extraction
 * Extracts text from various document formats including PDFs, Word docs, and images
 */
const extractDocumentText = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { ocrLanguage = 'eng' } = req.body;

    // Get document from ZeroDB
    const docResult = await zerodbService.queryTable(DOCUMENTS_TABLE, {
      filter: { id: documentId },
      limit: 1
    });
    const documents = docResult.rows || docResult;
    const document = documents[0];

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if document already has extracted text
    const embResult = await zerodbService.queryTable(EMBEDDINGS_TABLE, {
      filter: { documentId },
      limit: 1
    });
    const embeddings = embResult.rows || embResult;
    const existingExtraction = embeddings[0];

    if (existingExtraction && existingExtraction.extractedText) {
      return res.status(200).json({
        documentId,
        extractedText: existingExtraction.extractedText,
        extractionMethod: existingExtraction.extractionMethod,
        cached: true
      });
    }

    let extractedText = '';
    let extractionMethod = 'unknown';

    // Determine extraction method based on file type
    const fileExtension = path.extname(document.filename || document.name || '').toLowerCase();

    switch (fileExtension) {
      case '.pdf':
        extractedText = await extractPDFText(document.filePath || document.path);
        extractionMethod = 'pdf_extraction';
        break;
      case '.docx':
      case '.doc':
        extractedText = await extractWordText(document.filePath || document.path);
        extractionMethod = 'word_extraction';
        break;
      case '.txt':
        extractedText = await extractPlainText(document.filePath || document.path);
        extractionMethod = 'plain_text';
        break;
      case '.jpg':
      case '.jpeg':
      case '.png':
      case '.tiff':
        extractedText = await extractImageText(document.filePath || document.path, ocrLanguage);
        extractionMethod = 'ocr';
        break;
      default:
        return res.status(400).json({ error: 'Unsupported file type for text extraction' });
    }

    const now = new Date().toISOString();
    const wordCount = extractedText.split(/\s+/).length;
    const characterCount = extractedText.length;

    // Store extracted text using upsert logic
    let embedding;
    if (existingExtraction) {
      await zerodbService.updateRows(EMBEDDINGS_TABLE,
        { documentId },
        {
          $set: {
            extractedText,
            extractionMethod,
            extractionDate: now,
            wordCount,
            characterCount,
            updatedAt: now
          }
        }
      );
      const updated = await zerodbService.queryTable(EMBEDDINGS_TABLE, {
        filter: { documentId },
        limit: 1
      });
      embedding = (updated.rows || updated)[0];
    } else {
      const insertResult = await zerodbService.insertRow(EMBEDDINGS_TABLE, {
        documentId,
        extractedText,
        extractionMethod,
        extractionDate: now,
        wordCount,
        characterCount,
        createdAt: now,
        updatedAt: now
      });
      embedding = insertResult.rows ? insertResult.rows[0] : insertResult;
    }

    // Publish text extraction event
    await streamingService.publishEvent('document.text.extracted', {
      documentId,
      extractionMethod,
      wordCount: embedding.wordCount,
      timestamp: new Date()
    });

    res.status(200).json({
      documentId,
      extractedText,
      extractionMethod,
      wordCount: embedding.wordCount,
      characterCount: embedding.characterCount,
      extractionDate: embedding.extractionDate
    });

  } catch (error) {
    console.error('Text extraction error:', error);
    res.status(500).json({
      error: 'Failed to extract text from document',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * OCR Processing
 * Performs OCR on image files and scanned documents
 */
const performOCR = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { language = 'eng', preprocessImage = true } = req.body;

    // Get document from ZeroDB
    const docResult = await zerodbService.queryTable(DOCUMENTS_TABLE, {
      filter: { id: documentId },
      limit: 1
    });
    const documents = docResult.rows || docResult;
    const document = documents[0];

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if file is an image
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.tiff', '.bmp'];
    const fileExtension = path.extname(document.filename || document.name || '').toLowerCase();

    if (!imageExtensions.includes(fileExtension)) {
      return res.status(400).json({ error: 'OCR is only supported for image files' });
    }

    let imagePath = document.filePath || document.path;

    // Preprocess image if requested
    if (preprocessImage) {
      imagePath = await preprocessImageForOCR(imagePath);
    }

    // Perform OCR
    const { data: { text, confidence } } = await tesseract.recognize(imagePath, language, {
      logger: m => console.log(`OCR Progress: ${m.progress}%`)
    });

    const now = new Date().toISOString();
    const wordCount = text.split(/\s+/).length;
    const characterCount = text.length;

    // Check for existing embedding
    const embResult = await zerodbService.queryTable(EMBEDDINGS_TABLE, {
      filter: { documentId },
      limit: 1
    });
    const existingEmbedding = (embResult.rows || embResult)[0];

    let embedding;
    if (existingEmbedding) {
      await zerodbService.updateRows(EMBEDDINGS_TABLE,
        { documentId },
        {
          $set: {
            extractedText: text,
            extractionMethod: 'ocr',
            ocrConfidence: confidence,
            ocrLanguage: language,
            extractionDate: now,
            wordCount,
            characterCount,
            updatedAt: now
          }
        }
      );
      const updated = await zerodbService.queryTable(EMBEDDINGS_TABLE, {
        filter: { documentId },
        limit: 1
      });
      embedding = (updated.rows || updated)[0];
    } else {
      const insertResult = await zerodbService.insertRow(EMBEDDINGS_TABLE, {
        documentId,
        extractedText: text,
        extractionMethod: 'ocr',
        ocrConfidence: confidence,
        ocrLanguage: language,
        extractionDate: now,
        wordCount,
        characterCount,
        createdAt: now,
        updatedAt: now
      });
      embedding = insertResult.rows ? insertResult.rows[0] : insertResult;
    }

    // Clean up preprocessed image if created
    if (preprocessImage && imagePath !== (document.filePath || document.path)) {
      await fs.unlink(imagePath).catch(console.error);
    }

    // Publish OCR completion event
    await streamingService.publishEvent('document.ocr.completed', {
      documentId,
      confidence,
      language,
      wordCount: embedding.wordCount,
      timestamp: new Date()
    });

    res.status(200).json({
      documentId,
      extractedText: text,
      confidence,
      language,
      wordCount: embedding.wordCount,
      characterCount: embedding.characterCount,
      extractionDate: embedding.extractionDate
    });

  } catch (error) {
    console.error('OCR processing error:', error);
    res.status(500).json({
      error: 'Failed to perform OCR on document',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Automated Document Classification
 * Classifies documents using AI-powered analysis
 */
const classifyDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { reclassify = false } = req.body;

    // Get document from ZeroDB
    const docResult = await zerodbService.queryTable(DOCUMENTS_TABLE, {
      filter: { id: documentId },
      limit: 1
    });
    const documents = docResult.rows || docResult;
    const document = documents[0];

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Get or extract text first
    const embResult = await zerodbService.queryTable(EMBEDDINGS_TABLE, {
      filter: { documentId },
      limit: 1
    });
    let embedding = (embResult.rows || embResult)[0];

    if (!embedding || !embedding.extractedText) {
      return res.status(400).json({
        error: 'Document text must be extracted before classification'
      });
    }

    // Skip if already classified (unless reclassify is true)
    if (embedding.classification && !reclassify) {
      return res.status(200).json({
        documentId,
        classification: embedding.classification,
        confidence: embedding.classificationConfidence,
        cached: true
      });
    }

    // Classify document using AI
    const classification = await classifyDocumentText(embedding.extractedText, document.title);

    const now = new Date().toISOString();

    // Update embedding with classification
    await zerodbService.updateRows(EMBEDDINGS_TABLE,
      { documentId },
      {
        $set: {
          classification: classification.category,
          classificationConfidence: classification.confidence,
          classificationTags: classification.tags,
          classificationDate: now,
          updatedAt: now
        }
      }
    );

    const updated = await zerodbService.queryTable(EMBEDDINGS_TABLE, {
      filter: { documentId },
      limit: 1
    });
    embedding = (updated.rows || updated)[0];

    // Update document with classification
    await zerodbService.updateRows(DOCUMENTS_TABLE,
      { id: documentId },
      {
        $set: {
          documentType: classification.category,
          tags: classification.tags,
          updatedAt: now
        }
      }
    );

    // Publish classification event
    await streamingService.publishEvent('document.classified', {
      documentId,
      classification: classification.category,
      confidence: classification.confidence,
      tags: classification.tags,
      timestamp: new Date()
    });

    res.status(200).json({
      documentId,
      classification: classification.category,
      confidence: classification.confidence,
      tags: classification.tags,
      classificationDate: embedding.classificationDate
    });

  } catch (error) {
    console.error('Document classification error:', error);
    res.status(500).json({
      error: 'Failed to classify document',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Document Summarization
 * Generates AI-powered summaries of document content
 */
const generateDocumentSummary = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { summaryType = 'extractive', maxLength = 200 } = req.body;

    // Get document from ZeroDB
    const docResult = await zerodbService.queryTable(DOCUMENTS_TABLE, {
      filter: { id: documentId },
      limit: 1
    });
    const documents = docResult.rows || docResult;
    const document = documents[0];

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Get extracted text
    const embResult = await zerodbService.queryTable(EMBEDDINGS_TABLE, {
      filter: { documentId },
      limit: 1
    });
    const embedding = (embResult.rows || embResult)[0];

    if (!embedding || !embedding.extractedText) {
      return res.status(400).json({
        error: 'Document text must be extracted before summarization'
      });
    }

    // Skip if already summarized
    if (embedding.summary && embedding.summaryType === summaryType) {
      return res.status(200).json({
        documentId,
        summary: embedding.summary,
        summaryType: embedding.summaryType,
        cached: true
      });
    }

    // Generate summary using AI
    const summary = await generateAISummary(embedding.extractedText, summaryType, maxLength);

    const now = new Date().toISOString();

    // Update embedding with summary
    await zerodbService.updateRows(EMBEDDINGS_TABLE,
      { documentId },
      {
        $set: {
          summary,
          summaryType,
          summaryDate: now,
          updatedAt: now
        }
      }
    );

    // Publish summarization event
    await streamingService.publishEvent('document.summarized', {
      documentId,
      summaryType,
      summaryLength: summary.length,
      timestamp: new Date()
    });

    res.status(200).json({
      documentId,
      summary,
      summaryType,
      summaryDate: new Date()
    });

  } catch (error) {
    console.error('Document summarization error:', error);
    res.status(500).json({
      error: 'Failed to generate document summary',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Batch Document Processing
 * Processes multiple documents in a batch operation
 */
const batchProcessDocuments = async (req, res) => {
  try {
    const { documentIds, operations = ['extract', 'classify', 'summarize'] } = req.body;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ error: 'Document IDs array is required' });
    }

    const results = [];
    const errors = [];

    for (const documentId of documentIds) {
      try {
        const result = { documentId, operations: {} };

        // Extract text
        if (operations.includes('extract')) {
          const extractResult = await extractDocumentTextInternal(documentId);
          result.operations.extract = extractResult;
        }

        // Classify document
        if (operations.includes('classify')) {
          const classifyResult = await classifyDocumentInternal(documentId);
          result.operations.classify = classifyResult;
        }

        // Generate summary
        if (operations.includes('summarize')) {
          const summaryResult = await generateDocumentSummaryInternal(documentId);
          result.operations.summarize = summaryResult;
        }

        results.push(result);

      } catch (error) {
        errors.push({ documentId, error: error.message });
      }
    }

    // Publish batch processing event
    await streamingService.publishEvent('document.batch.processed', {
      totalDocuments: documentIds.length,
      successCount: results.length,
      errorCount: errors.length,
      operations,
      timestamp: new Date()
    });

    res.status(200).json({
      totalDocuments: documentIds.length,
      successCount: results.length,
      errorCount: errors.length,
      results,
      errors
    });

  } catch (error) {
    console.error('Batch processing error:', error);
    res.status(500).json({
      error: 'Failed to process documents in batch',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper Functions

/**
 * Extract text from PDF files
 */
async function extractPDFText(filePath) {
  const pdfExtract = new PDFExtract();
  const options = {};

  return new Promise((resolve, reject) => {
    pdfExtract.extract(filePath, options, (err, data) => {
      if (err) {
        reject(err);
        return;
      }

      const text = data.pages
        .map(page => page.content.map(item => item.str).join(' '))
        .join('\n');

      resolve(text);
    });
  });
}

/**
 * Extract text from Word documents
 */
async function extractWordText(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

/**
 * Extract text from plain text files
 */
async function extractPlainText(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return content;
}

/**
 * Extract text from images using OCR
 */
async function extractImageText(filePath, language = 'eng') {
  const { data: { text } } = await tesseract.recognize(filePath, language);
  return text;
}

/**
 * Preprocess image for better OCR results
 */
async function preprocessImageForOCR(originalPath) {
  const preprocessedPath = originalPath.replace(/\.(jpg|jpeg|png|tiff)$/i, '_preprocessed.png');

  await sharp(originalPath)
    .grayscale()
    .normalize()
    .sharpen()
    .png()
    .toFile(preprocessedPath);

  return preprocessedPath;
}

/**
 * Classify document text using AI
 */
async function classifyDocumentText(text, title) {
  const prompt = `Classify this document based on its content and title.

Title: ${title}
Content: ${text.substring(0, 2000)}...

Classify into one of these categories:
- Financial Report
- Legal Document
- Contract
- Compliance Document
- Technical Document
- Meeting Notes
- Email
- Invoice
- Other

Return a JSON object with:
- category: the main category
- confidence: confidence score (0-1)
- tags: array of relevant tags

JSON:`;

  try {
    const response = await openai.createCompletion({
      model: 'gpt-3.5-turbo-instruct',
      prompt,
      max_tokens: 200,
      temperature: 0.3
    });

    const result = JSON.parse(response.data.choices[0].text.trim());
    return result;
  } catch (error) {
    console.error('AI classification error:', error);
    // Fallback to rule-based classification
    return classifyDocumentRuleBased(text, title);
  }
}

/**
 * Generate AI-powered summary
 */
async function generateAISummary(text, summaryType, maxLength) {
  const prompt = `Summarize this document in ${maxLength} words or less:

${text.substring(0, 3000)}...

Summary:`;

  try {
    const response = await openai.createCompletion({
      model: 'gpt-3.5-turbo-instruct',
      prompt,
      max_tokens: Math.min(maxLength * 2, 500),
      temperature: 0.3
    });

    return response.data.choices[0].text.trim();
  } catch (error) {
    console.error('AI summarization error:', error);
    // Fallback to extractive summary
    return generateExtractiveSummary(text, maxLength);
  }
}

/**
 * Rule-based classification fallback
 */
function classifyDocumentRuleBased(text, title) {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('financial') || lowerText.includes('revenue') || lowerText.includes('profit')) {
    return { category: 'Financial Report', confidence: 0.7, tags: ['financial', 'report'] };
  }

  if (lowerText.includes('contract') || lowerText.includes('agreement') || lowerText.includes('terms')) {
    return { category: 'Contract', confidence: 0.7, tags: ['contract', 'legal'] };
  }

  if (lowerText.includes('compliance') || lowerText.includes('audit') || lowerText.includes('regulation')) {
    return { category: 'Compliance Document', confidence: 0.7, tags: ['compliance', 'audit'] };
  }

  return { category: 'Other', confidence: 0.5, tags: ['uncategorized'] };
}

/**
 * Generate extractive summary
 */
function generateExtractiveSummary(text, maxLength) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);

  // Simple ranking by sentence length and position
  const rankedSentences = sentences
    .map((sentence, index) => ({
      text: sentence.trim(),
      score: sentence.length * (sentences.length - index) / sentences.length
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.text);

  return rankedSentences.join('. ') + '.';
}

// Internal processing functions for batch operations

async function extractDocumentTextInternal(documentId) {
  const docResult = await zerodbService.queryTable(DOCUMENTS_TABLE, {
    filter: { id: documentId },
    limit: 1
  });
  const documents = docResult.rows || docResult;
  const document = documents[0];

  if (!document) throw new Error('Document not found');

  const fileExtension = path.extname(document.filename || document.name || '').toLowerCase();
  let extractedText = '';
  const filePath = document.filePath || document.path;

  switch (fileExtension) {
    case '.pdf':
      extractedText = await extractPDFText(filePath);
      break;
    case '.docx':
    case '.doc':
      extractedText = await extractWordText(filePath);
      break;
    case '.txt':
      extractedText = await extractPlainText(filePath);
      break;
    default:
      throw new Error('Unsupported file type');
  }

  const now = new Date().toISOString();

  // Check for existing embedding
  const embResult = await zerodbService.queryTable(EMBEDDINGS_TABLE, {
    filter: { documentId },
    limit: 1
  });
  const existingEmbedding = (embResult.rows || embResult)[0];

  if (existingEmbedding) {
    await zerodbService.updateRows(EMBEDDINGS_TABLE,
      { documentId },
      {
        $set: {
          extractedText,
          extractionMethod: 'auto',
          extractionDate: now,
          updatedAt: now
        }
      }
    );
  } else {
    await zerodbService.insertRow(EMBEDDINGS_TABLE, {
      documentId,
      extractedText,
      extractionMethod: 'auto',
      extractionDate: now,
      createdAt: now,
      updatedAt: now
    });
  }

  return { success: true, wordCount: extractedText.split(/\s+/).length };
}

async function classifyDocumentInternal(documentId) {
  const embResult = await zerodbService.queryTable(EMBEDDINGS_TABLE, {
    filter: { documentId },
    limit: 1
  });
  const embedding = (embResult.rows || embResult)[0];

  if (!embedding || !embedding.extractedText) {
    throw new Error('Text extraction required first');
  }

  const docResult = await zerodbService.queryTable(DOCUMENTS_TABLE, {
    filter: { id: documentId },
    limit: 1
  });
  const document = (docResult.rows || docResult)[0];

  const classification = await classifyDocumentText(embedding.extractedText, document?.title || '');

  const now = new Date().toISOString();

  await zerodbService.updateRows(EMBEDDINGS_TABLE,
    { documentId },
    {
      $set: {
        classification: classification.category,
        classificationConfidence: classification.confidence,
        classificationTags: classification.tags,
        classificationDate: now,
        updatedAt: now
      }
    }
  );

  return { success: true, classification: classification.category };
}

async function generateDocumentSummaryInternal(documentId) {
  const embResult = await zerodbService.queryTable(EMBEDDINGS_TABLE, {
    filter: { documentId },
    limit: 1
  });
  const embedding = (embResult.rows || embResult)[0];

  if (!embedding || !embedding.extractedText) {
    throw new Error('Text extraction required first');
  }

  const summary = await generateAISummary(embedding.extractedText, 'extractive', 200);

  const now = new Date().toISOString();

  await zerodbService.updateRows(EMBEDDINGS_TABLE,
    { documentId },
    {
      $set: {
        summary,
        summaryType: 'extractive',
        summaryDate: now,
        updatedAt: now
      }
    }
  );

  return { success: true, summaryLength: summary.length };
}

// Legacy functions migrated to ZeroDB
const createDocumentEmbedding = async (req, res) => {
  try {
    const embeddingData = {
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await zerodbService.insertRow(EMBEDDINGS_TABLE, embeddingData);
    const savedEmbedding = result.rows ? result.rows[0] : result;

    res.status(201).json(savedEmbedding);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getDocumentEmbeddings = async (req, res) => {
  try {
    const result = await zerodbService.queryTable(EMBEDDINGS_TABLE, {});
    const embeddings = result.rows || result;

    res.status(200).json(embeddings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getDocumentEmbeddingById = async (req, res) => {
  try {
    const result = await zerodbService.queryTable(EMBEDDINGS_TABLE, {
      filter: { id: req.params.id },
      limit: 1
    });

    const embeddings = result.rows || result;
    const embedding = embeddings[0];

    if (!embedding) {
      return res.status(404).json({ message: 'Document embedding not found' });
    }

    res.status(200).json(embedding);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Stub functions for routes that aren't implemented yet
const updateDocumentEmbedding = async (req, res) => {
  res.status(501).json({ error: 'Update document embedding not implemented yet' });
};

const deleteDocumentEmbedding = async (req, res) => {
  res.status(501).json({ error: 'Delete document embedding not implemented yet' });
};

// Export all functions
module.exports = {
  // Legacy functions
  createDocumentEmbedding,
  getDocumentEmbeddings,
  getDocumentEmbeddingById,
  updateDocumentEmbedding,
  deleteDocumentEmbedding,

  // New advanced functions
  extractDocumentText,
  performOCR,
  classifyDocument,
  generateDocumentSummary,
  batchProcessDocuments,

  // File upload middleware
  upload
};

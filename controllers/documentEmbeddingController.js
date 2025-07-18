/**
 * Document Processing Pipeline Controller
 * 
 * [Feature] OCAE-404: Advanced Document Processing
 * Implements document text extraction, OCR, classification, and summarization
 * with AI-powered analysis and automated processing workflows
 */

const DocumentEmbedding = require('../models/DocumentEmbeddingModel');
const Document = require('../models/Document');
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
const { Configuration, OpenAIApi } = require('openai');

// Configure OpenAI for text processing
const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
}));

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/processing/',
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
    
    // Get document from database
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Check if document already has extracted text
    const existingExtraction = await DocumentEmbedding.findOne({ documentId });
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
    const fileExtension = path.extname(document.filename).toLowerCase();
    
    switch (fileExtension) {
      case '.pdf':
        extractedText = await extractPDFText(document.filePath);
        extractionMethod = 'pdf_extraction';
        break;
      case '.docx':
      case '.doc':
        extractedText = await extractWordText(document.filePath);
        extractionMethod = 'word_extraction';
        break;
      case '.txt':
        extractedText = await extractPlainText(document.filePath);
        extractionMethod = 'plain_text';
        break;
      case '.jpg':
      case '.jpeg':
      case '.png':
      case '.tiff':
        extractedText = await extractImageText(document.filePath, ocrLanguage);
        extractionMethod = 'ocr';
        break;
      default:
        return res.status(400).json({ error: 'Unsupported file type for text extraction' });
    }
    
    // Store extracted text
    const embedding = await DocumentEmbedding.findOneAndUpdate(
      { documentId },
      {
        extractedText,
        extractionMethod,
        extractionDate: new Date(),
        wordCount: extractedText.split(/\s+/).length,
        characterCount: extractedText.length
      },
      { upsert: true, new: true }
    );
    
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
    
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Check if file is an image
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.tiff', '.bmp'];
    const fileExtension = path.extname(document.filename).toLowerCase();
    
    if (!imageExtensions.includes(fileExtension)) {
      return res.status(400).json({ error: 'OCR is only supported for image files' });
    }
    
    let imagePath = document.filePath;
    
    // Preprocess image if requested
    if (preprocessImage) {
      imagePath = await preprocessImageForOCR(document.filePath);
    }
    
    // Perform OCR
    const { data: { text, confidence } } = await tesseract.recognize(imagePath, language, {
      logger: m => console.log(`OCR Progress: ${m.progress}%`)
    });
    
    // Store OCR results
    const embedding = await DocumentEmbedding.findOneAndUpdate(
      { documentId },
      {
        extractedText: text,
        extractionMethod: 'ocr',
        ocrConfidence: confidence,
        ocrLanguage: language,
        extractionDate: new Date(),
        wordCount: text.split(/\s+/).length,
        characterCount: text.length
      },
      { upsert: true, new: true }
    );
    
    // Clean up preprocessed image if created
    if (preprocessImage && imagePath !== document.filePath) {
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
    
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Get or extract text first
    let embedding = await DocumentEmbedding.findOne({ documentId });
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
    
    // Update embedding with classification
    embedding = await DocumentEmbedding.findOneAndUpdate(
      { documentId },
      {
        classification: classification.category,
        classificationConfidence: classification.confidence,
        classificationTags: classification.tags,
        classificationDate: new Date()
      },
      { new: true }
    );
    
    // Update document with classification
    await Document.findByIdAndUpdate(documentId, {
      documentType: classification.category,
      tags: classification.tags
    });
    
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
    
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Get extracted text
    const embedding = await DocumentEmbedding.findOne({ documentId });
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
    
    // Update embedding with summary
    await DocumentEmbedding.findOneAndUpdate(
      { documentId },
      {
        summary,
        summaryType,
        summaryDate: new Date()
      },
      { new: true }
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
  const document = await Document.findById(documentId);
  if (!document) throw new Error('Document not found');
  
  const fileExtension = path.extname(document.filename).toLowerCase();
  let extractedText = '';
  
  switch (fileExtension) {
    case '.pdf':
      extractedText = await extractPDFText(document.filePath);
      break;
    case '.docx':
    case '.doc':
      extractedText = await extractWordText(document.filePath);
      break;
    case '.txt':
      extractedText = await extractPlainText(document.filePath);
      break;
    default:
      throw new Error('Unsupported file type');
  }
  
  await DocumentEmbedding.findOneAndUpdate(
    { documentId },
    {
      extractedText,
      extractionMethod: 'auto',
      extractionDate: new Date()
    },
    { upsert: true }
  );
  
  return { success: true, wordCount: extractedText.split(/\s+/).length };
}

async function classifyDocumentInternal(documentId) {
  const embedding = await DocumentEmbedding.findOne({ documentId });
  if (!embedding || !embedding.extractedText) {
    throw new Error('Text extraction required first');
  }
  
  const document = await Document.findById(documentId);
  const classification = await classifyDocumentText(embedding.extractedText, document.title);
  
  await DocumentEmbedding.findOneAndUpdate(
    { documentId },
    {
      classification: classification.category,
      classificationConfidence: classification.confidence,
      classificationTags: classification.tags,
      classificationDate: new Date()
    }
  );
  
  return { success: true, classification: classification.category };
}

async function generateDocumentSummaryInternal(documentId) {
  const embedding = await DocumentEmbedding.findOne({ documentId });
  if (!embedding || !embedding.extractedText) {
    throw new Error('Text extraction required first');
  }
  
  const summary = await generateAISummary(embedding.extractedText, 'extractive', 200);
  
  await DocumentEmbedding.findOneAndUpdate(
    { documentId },
    {
      summary,
      summaryType: 'extractive',
      summaryDate: new Date()
    }
  );
  
  return { success: true, summaryLength: summary.length };
}

// Legacy functions for backward compatibility
const createDocumentEmbedding = async (req, res) => {
  try {
    const newEmbedding = new DocumentEmbedding(req.body);
    const savedEmbedding = await newEmbedding.save();
    res.status(201).json(savedEmbedding);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getDocumentEmbeddings = async (req, res) => {
  try {
    const embeddings = await DocumentEmbedding.find();
    res.status(200).json(embeddings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getDocumentEmbeddingById = async (req, res) => {
  try {
    const embedding = await DocumentEmbedding.findById(req.params.id);
    if (!embedding) {
      return res.status(404).json({ message: 'Document embedding not found' });
    }
    res.status(200).json(embedding);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Export all functions
module.exports = {
  // Legacy functions
  createDocumentEmbedding,
  getDocumentEmbeddings,
  getDocumentEmbeddingById,
  
  // New advanced functions
  extractDocumentText,
  performOCR,
  classifyDocument,
  generateDocumentSummary,
  batchProcessDocuments,
  
  // File upload middleware
  upload
};
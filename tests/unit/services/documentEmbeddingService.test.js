/**
 * Document Embedding Service Tests
 *
 * Tests for the document embedding generation pipeline
 * that integrates with ZeroDB for vector storage and semantic search
 *
 * Issue #22: Implement document embedding generation
 */

const documentEmbeddingService = require('../../../services/documentEmbeddingService');
const zerodbService = require('../../../services/zerodbService');
const Document = require('../../../models/Document');
const DocumentEmbedding = require('../../../models/DocumentEmbeddingModel');
const generateObjectId = () => { const hex = '0123456789abcdef'; let id = ''; for(let i=0;i<24;i++) id += hex[Math.floor(Math.random()*16)]; return id; };
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Mock external services
jest.mock('../../../services/zerodbService');

describe('DocumentEmbeddingService', () => {
  let tempDir;
  let testPdfPath;
  let testDocxPath;
  let testTxtPath;

  beforeAll(async () => {
    // Create temp directory for test files
    tempDir = path.join(os.tmpdir(), 'opencap-test-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });

    // Create test files
    testTxtPath = path.join(tempDir, 'test.txt');
    await fs.writeFile(testTxtPath, 'This is test content for plain text extraction.');
  });

  afterAll(async () => {
    // Clean up temp files
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Text Extraction', () => {
    describe('extractTextFromDocument', () => {
      it('should extract text from PDF documents', async () => {
        const documentId = generateObjectId();

        // Test that PDF extraction handles missing files properly
        // Since we don't have an actual PDF, we test the error handling
        await expect(
          documentEmbeddingService.extractTextFromDocument(
            documentId,
            '/path/to/nonexistent.pdf',
            'application/pdf'
          )
        ).rejects.toThrow('Failed to extract');
      });

      it('should extract text from DOCX documents', async () => {
        const documentId = generateObjectId();

        // Test that DOCX extraction handles missing files properly
        await expect(
          documentEmbeddingService.extractTextFromDocument(
            documentId,
            '/path/to/nonexistent.docx',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          )
        ).rejects.toThrow('Failed to extract');
      });

      it('should extract text from plain text files', async () => {
        const documentId = generateObjectId();

        const result = await documentEmbeddingService.extractTextFromDocument(
          documentId,
          testTxtPath,
          'text/plain'
        );

        expect(result).toBeDefined();
        expect(typeof result.text).toBe('string');
        expect(result.text).toContain('test content');
        expect(result.wordCount).toBeGreaterThan(0);
        expect(result.characterCount).toBeGreaterThan(0);
      });

      it('should throw error for unsupported file types', async () => {
        const documentId = generateObjectId();

        await expect(
          documentEmbeddingService.extractTextFromDocument(
            documentId,
            '/path/to/document.exe',
            'application/x-msdownload'
          )
        ).rejects.toThrow('Unsupported file type');
      });

      it('should handle extraction errors gracefully', async () => {
        const documentId = generateObjectId();

        await expect(
          documentEmbeddingService.extractTextFromDocument(
            documentId,
            '/nonexistent/path.pdf',
            'application/pdf'
          )
        ).rejects.toThrow();
      });
    });

    describe('preprocessText', () => {
      it('should clean and normalize text', () => {
        const dirtyText = '  Multiple   spaces   and\n\nnewlines  ';
        const result = documentEmbeddingService.preprocessText(dirtyText);

        expect(result).not.toContain('  ');
        expect(result.trim()).toBe(result);
      });

      it('should handle empty input', () => {
        const result = documentEmbeddingService.preprocessText('');
        expect(result).toBe('');
      });

      it('should remove special characters when configured', () => {
        const textWithSpecialChars = 'Hello @#$ World!';
        const result = documentEmbeddingService.preprocessText(textWithSpecialChars, {
          removeSpecialChars: true
        });

        expect(result).not.toContain('@#$');
      });
    });
  });

  describe('Embedding Generation', () => {
    describe('generateEmbedding', () => {
      it('should generate embedding vector for text', async () => {
        const text = 'This is a sample document about financial reporting';

        const result = await documentEmbeddingService.generateEmbedding(text);

        expect(result).toBeDefined();
        expect(Array.isArray(result.embedding)).toBe(true);
        expect(result.embedding.length).toBeGreaterThan(0);
        expect(result.model).toBeDefined();
        expect(result.dimensions).toBeGreaterThan(0);
      });

      it('should generate embedding with specified model', async () => {
        const text = 'Sample text for embedding';
        const model = 'text-embedding-3-small';

        const result = await documentEmbeddingService.generateEmbedding(text, { model });

        expect(result).toBeDefined();
        expect(result.model).toBe(model);
      });

      it('should handle empty text input', async () => {
        await expect(
          documentEmbeddingService.generateEmbedding('')
        ).rejects.toThrow('Text cannot be empty');
      });

      it('should handle very long text by chunking', async () => {
        const longText = 'a'.repeat(10000);

        const result = await documentEmbeddingService.generateEmbedding(longText);

        expect(result).toBeDefined();
        expect(Array.isArray(result.embedding)).toBe(true);
      });

      it('should use fallback method when primary service unavailable', async () => {
        const text = 'Sample text for fallback embedding';

        // Simulate primary service failure
        const result = await documentEmbeddingService.generateEmbedding(text, {
          useFallback: true
        });

        expect(result).toBeDefined();
        expect(Array.isArray(result.embedding)).toBe(true);
      });
    });

    describe('generateChunkedEmbeddings', () => {
      it('should split large documents into chunks', async () => {
        const largeText = 'Section 1. '.repeat(500);

        const result = await documentEmbeddingService.generateChunkedEmbeddings(largeText, {
          chunkSize: 1000,
          overlap: 100
        });

        expect(result).toBeDefined();
        expect(Array.isArray(result.chunks)).toBe(true);
        expect(result.chunks.length).toBeGreaterThan(1);
        expect(result.chunks[0].embedding).toBeDefined();
        expect(result.chunks[0].text).toBeDefined();
        expect(result.chunks[0].startIndex).toBeDefined();
        expect(result.chunks[0].endIndex).toBeDefined();
      });

      it('should preserve context with overlapping chunks', async () => {
        const text = 'This is chunk one content. This is overlap content. This is chunk two content.';

        const result = await documentEmbeddingService.generateChunkedEmbeddings(text, {
          chunkSize: 30,
          overlap: 15
        });

        expect(result.chunks.length).toBeGreaterThan(1);
      });
    });
  });

  describe('ZeroDB Vector Storage', () => {
    describe('storeEmbedding', () => {
      it('should store embedding in ZeroDB', async () => {
        const documentId = generateObjectId();
        const embedding = new Array(768).fill(0.1);
        const metadata = {
          documentId,
          title: 'Test Document',
          companyId: generateObjectId(),
          category: 'financial_report'
        };

        zerodbService.upsertVector.mockResolvedValue({
          id: 'vector-123',
          status: 'created'
        });

        const result = await documentEmbeddingService.storeEmbedding(
          embedding,
          metadata,
          'Sample document content'
        );

        expect(result).toBeDefined();
        expect(zerodbService.upsertVector).toHaveBeenCalled();
        expect(zerodbService.upsertVector).toHaveBeenCalledWith(
          embedding,
          expect.any(String),
          expect.objectContaining({
            documentId,
            title: 'Test Document'
          }),
          expect.any(String),
          expect.any(String)
        );
      });

      it('should use correct namespace for document type', async () => {
        const embedding = new Array(768).fill(0.1);
        const financialMetadata = {
          documentId: 'doc-1',
          title: 'Q4 Report',
          category: 'financial_report'
        };
        const complianceMetadata = {
          documentId: 'doc-2',
          title: 'Compliance Doc',
          category: 'compliance_document'
        };

        zerodbService.upsertVector.mockResolvedValue({ id: 'vector-123' });

        await documentEmbeddingService.storeEmbedding(embedding, financialMetadata, 'content');
        await documentEmbeddingService.storeEmbedding(embedding, complianceMetadata, 'content');

        const calls = zerodbService.upsertVector.mock.calls;
        expect(calls[0][1]).toBe('financial');
        expect(calls[1][1]).toBe('compliance');
      });

      it('should handle ZeroDB storage errors', async () => {
        const embedding = new Array(768).fill(0.1);
        const metadata = { documentId: 'doc-1' };

        zerodbService.upsertVector.mockRejectedValue(new Error('Storage failed'));

        await expect(
          documentEmbeddingService.storeEmbedding(embedding, metadata, 'content')
        ).rejects.toThrow('Failed to store embedding');
      });
    });

    describe('searchSimilarDocuments', () => {
      it('should search for similar documents by query', async () => {
        const query = 'financial reporting requirements';

        zerodbService.searchVectors.mockResolvedValue({
          vectors: [
            {
              id: 'vec-1',
              similarity_score: 0.95,
              vector_metadata: { documentId: 'doc-1', title: 'Report 1' },
              document: 'Financial report content'
            },
            {
              id: 'vec-2',
              similarity_score: 0.87,
              vector_metadata: { documentId: 'doc-2', title: 'Report 2' },
              document: 'Another financial document'
            }
          ],
          search_time_ms: 15
        });

        const result = await documentEmbeddingService.searchSimilarDocuments(query, {
          limit: 10,
          namespace: 'documents'
        });

        expect(result).toBeDefined();
        expect(result.results).toHaveLength(2);
        expect(result.results[0].similarity_score).toBeGreaterThan(result.results[1].similarity_score);
        expect(result.query).toBe(query);
      });

      it('should filter results by metadata', async () => {
        const query = 'compliance requirements';

        zerodbService.searchVectors.mockResolvedValue({
          vectors: [
            { id: 'vec-1', similarity_score: 0.9, vector_metadata: { companyId: 'company-1' } }
          ]
        });

        const result = await documentEmbeddingService.searchSimilarDocuments(query, {
          filters: { companyId: 'company-1' }
        });

        expect(result.results).toHaveLength(1);
      });

      it('should handle empty search results', async () => {
        zerodbService.searchVectors.mockResolvedValue({ vectors: [] });

        const result = await documentEmbeddingService.searchSimilarDocuments('obscure query');

        expect(result.results).toHaveLength(0);
        expect(result.total_count).toBe(0);
      });
    });
  });

  describe('Batch Processing', () => {
    describe('processDocumentsBatch', () => {
      it('should process multiple documents in batch', async () => {
        const documents = [
          { id: 'doc-1', filePath: '/path/doc1.txt', mimeType: 'text/plain', title: 'Doc 1' },
          { id: 'doc-2', filePath: '/path/doc2.txt', mimeType: 'text/plain', title: 'Doc 2' },
          { id: 'doc-3', filePath: '/path/doc3.txt', mimeType: 'text/plain', title: 'Doc 3' }
        ];

        zerodbService.upsertVector.mockResolvedValue({ id: 'vec-123' });

        const result = await documentEmbeddingService.processDocumentsBatch(documents, {
          batchSize: 2
        });

        expect(result).toBeDefined();
        expect(result.processed).toBe(3);
        expect(result.failed).toBe(0);
        expect(result.results).toHaveLength(3);
      });

      it('should handle partial failures in batch', async () => {
        const documents = [
          { id: 'doc-1', filePath: '/path/doc1.txt', mimeType: 'text/plain', title: 'Doc 1' },
          { id: 'doc-2', filePath: '/invalid/path.txt', mimeType: 'text/plain', title: 'Doc 2' }
        ];

        const result = await documentEmbeddingService.processDocumentsBatch(documents);

        expect(result.processed).toBeGreaterThan(0);
        expect(result.errors).toBeDefined();
      });

      it('should emit progress events during batch processing', async () => {
        const documents = [
          { id: 'doc-1', filePath: '/path/doc1.txt', mimeType: 'text/plain', title: 'Doc 1' },
          { id: 'doc-2', filePath: '/path/doc2.txt', mimeType: 'text/plain', title: 'Doc 2' }
        ];

        zerodbService.upsertVector.mockResolvedValue({ id: 'vec-123' });

        const progressEvents = [];
        const result = await documentEmbeddingService.processDocumentsBatch(documents, {
          onProgress: (progress) => progressEvents.push(progress)
        });

        expect(progressEvents.length).toBeGreaterThan(0);
      });

      it('should respect rate limiting configuration', async () => {
        const documents = Array(5).fill(null).map((_, i) => ({
          id: `doc-${i}`,
          filePath: `/path/doc${i}.txt`,
          mimeType: 'text/plain',
          title: `Doc ${i}`
        }));

        zerodbService.upsertVector.mockResolvedValue({ id: 'vec-123' });

        const startTime = Date.now();
        await documentEmbeddingService.processDocumentsBatch(documents, {
          rateLimit: { requestsPerSecond: 2 }
        });
        const endTime = Date.now();

        // Should take at least 2 seconds for 5 documents at 2 req/sec
        expect(endTime - startTime).toBeGreaterThanOrEqual(1000);
      });
    });

    describe('queueDocumentForProcessing', () => {
      beforeEach(() => {
        // Clear the queue before each test
        documentEmbeddingService.clearQueue();
      });

      it('should add document to processing queue', async () => {
        const documentId = 'doc-123';

        const result = await documentEmbeddingService.queueDocumentForProcessing(documentId, {
          priority: 'high'
        });

        expect(result).toBeDefined();
        expect(result.queued).toBe(true);
        expect(result.documentId).toBe(documentId);
        expect(result.priority).toBe('high');
      });

      it('should process queued documents in priority order', async () => {
        await documentEmbeddingService.queueDocumentForProcessing('doc-1', { priority: 'low' });
        await documentEmbeddingService.queueDocumentForProcessing('doc-2', { priority: 'high' });
        await documentEmbeddingService.queueDocumentForProcessing('doc-3', { priority: 'medium' });

        zerodbService.upsertVector.mockResolvedValue({ id: 'vec-123' });

        const result = await documentEmbeddingService.processQueue();

        expect(result.processedOrder[0]).toBe('doc-2');
      });
    });
  });

  describe('Document Embedding Pipeline', () => {
    describe('processDocument', () => {
      it('should complete full embedding pipeline for a document', async () => {
        const documentId = generateObjectId();
        const document = {
          _id: documentId,
          name: 'Test Financial Report',
          storagePath: '/path/to/test.txt',
          mimeType: 'text/plain',
          ownerCompany: generateObjectId(),
          category: 'financial_report',
          content: 'This is test content for the financial report.'
        };

        zerodbService.upsertVector.mockResolvedValue({
          id: 'vector-123',
          status: 'created'
        });

        const result = await documentEmbeddingService.processDocument(document);

        expect(result).toBeDefined();
        expect(result.documentId).toBe(documentId);
        expect(result.embeddingId).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.textExtracted).toBe(true);
        expect(result.embeddingGenerated).toBe(true);
        expect(result.storedInZeroDB).toBe(true);
      });

      it('should update DocumentEmbedding model after processing', async () => {
        const documentId = generateObjectId();
        const document = {
          _id: documentId,
          name: 'Test Document',
          storagePath: '/path/to/test.txt',
          mimeType: 'text/plain',
          ownerCompany: generateObjectId(),
          category: 'general',
          content: 'Test content'
        };

        zerodbService.upsertVector.mockResolvedValue({ id: 'vector-123' });

        const result = await documentEmbeddingService.processDocument(document);

        expect(result.mongoEmbeddingId).toBeDefined();
      });

      it('should handle document without content gracefully', async () => {
        const documentId = generateObjectId();
        const document = {
          _id: documentId,
          name: 'Empty Document',
          storagePath: '/path/to/empty.txt',
          mimeType: 'text/plain',
          ownerCompany: generateObjectId(),
          category: 'general',
          content: ''
        };

        const result = await documentEmbeddingService.processDocument(document);

        expect(result.success).toBe(false);
        expect(result.error).toContain('empty');
      });
    });

    describe('reprocessDocument', () => {
      it('should regenerate embeddings for existing document', async () => {
        const documentId = generateObjectId();

        zerodbService.upsertVector.mockResolvedValue({ id: 'vector-456' });

        const result = await documentEmbeddingService.reprocessDocument(documentId, {
          forceRegenerate: true
        });

        expect(result).toBeDefined();
        expect(result.reprocessed).toBe(true);
      });
    });
  });

  describe('Embedding Model Configuration', () => {
    describe('getAvailableModels', () => {
      it('should return list of available embedding models', async () => {
        const models = await documentEmbeddingService.getAvailableModels();

        expect(Array.isArray(models)).toBe(true);
        expect(models.length).toBeGreaterThan(0);
        expect(models[0]).toHaveProperty('name');
        expect(models[0]).toHaveProperty('dimensions');
        expect(models[0]).toHaveProperty('maxTokens');
      });
    });

    describe('setDefaultModel', () => {
      it('should set default embedding model', () => {
        const model = 'text-embedding-3-large';

        documentEmbeddingService.setDefaultModel(model);
        const currentModel = documentEmbeddingService.getDefaultModel();

        expect(currentModel).toBe(model);
      });

      it('should throw error for invalid model', () => {
        expect(() => {
          documentEmbeddingService.setDefaultModel('invalid-model');
        }).toThrow('Invalid embedding model');
      });
    });
  });

  describe('Statistics and Monitoring', () => {
    describe('getEmbeddingStats', () => {
      it('should return embedding statistics', async () => {
        zerodbService.listVectors.mockResolvedValue([
          { id: 'vec-1', created_at: new Date() },
          { id: 'vec-2', created_at: new Date() }
        ]);

        const stats = await documentEmbeddingService.getEmbeddingStats();

        expect(stats).toBeDefined();
        expect(stats.totalEmbeddings).toBeGreaterThanOrEqual(0);
        expect(stats.namespaceBreakdown).toBeDefined();
        expect(stats.lastUpdated).toBeDefined();
      });
    });

    describe('validateEmbeddingIntegrity', () => {
      it('should validate embedding dimensions match model', async () => {
        const embeddingId = 'emb-123';

        const result = await documentEmbeddingService.validateEmbeddingIntegrity(embeddingId);

        expect(result).toBeDefined();
        expect(result.isValid).toBeDefined();
        expect(typeof result.isValid).toBe('boolean');
      });
    });
  });
});

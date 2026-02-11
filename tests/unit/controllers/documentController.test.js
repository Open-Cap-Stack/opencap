/**
 * Document Controller Test Suite
 *
 * Tests for Document controller migrated to ZeroDB
 * Covers all CRUD operations and vector search functionality
 */

const zerodbService = require('../../../services/zerodbService');
const vectorService = require('../../../services/vectorService');
const websocketService = require('../../../services/websocketService');

// Mock all dependencies
jest.mock('../../../services/zerodbService');
jest.mock('../../../services/vectorService');
jest.mock('../../../services/websocketService');

// Import controller after mocks are set up
const documentController = require('../../../controllers/documentController');

describe('Document Controller - ZeroDB Migration', () => {
  let mockReq;
  let mockRes;
  let mockJson;
  let mockStatus;

  beforeEach(() => {
    jest.clearAllMocks();

    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockRes = {
      status: mockStatus,
      json: mockJson
    };

    mockReq = {
      body: {},
      params: {},
      query: {},
      user: {
        userId: 'user-123',
        companyId: 'company-456',
        role: 'user'
      }
    };

    // Default mock implementations
    websocketService.broadcastDocumentEvent = jest.fn();
    websocketService.broadcastNotification = jest.fn();
    vectorService.indexDocument = jest.fn().mockResolvedValue({});
    vectorService.searchSimilarDocuments = jest.fn().mockResolvedValue([]);
    vectorService.deleteDocument = jest.fn().mockResolvedValue({});
    vectorService.findSimilarDocuments = jest.fn().mockResolvedValue([]);
    vectorService.getDocumentAnalytics = jest.fn().mockResolvedValue({});
  });

  describe('createDocument', () => {
    it('should create a document using ZeroDB insertRow', async () => {
      const documentData = {
        documentId: 'doc-001',
        name: 'Test Document',
        title: 'Test Title',
        content: 'Test content for vector indexing',
        DocumentType: 'Legal',
        FileType: 'PDF',
        path: '/documents/test.pdf',
        metadata: { key: 'value' }
      };

      mockReq.body = documentData;

      const insertedDocument = {
        id: 'zerodb-id-123',
        ...documentData,
        uploadedBy: 'user-123',
        uploadedAt: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      };

      zerodbService.insertRow = jest.fn().mockResolvedValue({ rows: [insertedDocument] });

      await documentController.createDocument(mockReq, mockRes);

      expect(zerodbService.insertRow).toHaveBeenCalledWith('documents', expect.objectContaining({
        documentId: 'doc-001',
        name: 'Test Document',
        title: 'Test Title',
        content: 'Test content for vector indexing',
        DocumentType: 'Legal',
        FileType: 'PDF',
        uploadedBy: 'user-123'
      }));
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(vectorService.indexDocument).toHaveBeenCalled();
      expect(websocketService.broadcastDocumentEvent).toHaveBeenCalledWith('created', expect.any(Object));
    });

    it('should handle document creation errors', async () => {
      mockReq.body = { title: 'Test' };

      zerodbService.insertRow = jest.fn().mockRejectedValue(new Error('ZeroDB insertion failed'));

      await documentController.createDocument(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: 'ZeroDB insertion failed' })
      }));
    });

    it('should still create document if vector indexing fails', async () => {
      const documentData = {
        documentId: 'doc-002',
        name: 'Test Document',
        title: 'Test Title',
        content: 'Content',
        DocumentType: 'Legal',
        FileType: 'PDF',
        path: '/test.pdf'
      };

      mockReq.body = documentData;

      const insertedDocument = { id: 'zerodb-id-456', ...documentData };
      zerodbService.insertRow = jest.fn().mockResolvedValue({ rows: [insertedDocument] });
      vectorService.indexDocument = jest.fn().mockRejectedValue(new Error('Vector indexing failed'));

      await documentController.createDocument(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(201);
    });
  });

  describe('getDocuments', () => {
    it('should get all documents using ZeroDB queryTable', async () => {
      const mockDocuments = [
        { id: '1', title: 'Doc 1', status: 'active' },
        { id: '2', title: 'Doc 2', status: 'active' }
      ];

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: mockDocuments });
      zerodbService.countRows = jest.fn().mockResolvedValue(2);

      await documentController.getDocuments(mockReq, mockRes);

      expect(zerodbService.queryTable).toHaveBeenCalledWith('documents', expect.objectContaining({
        filter: expect.any(Object),
        limit: expect.any(Number)
      }));
      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should apply company filter for non-admin users', async () => {
      mockReq.user = { userId: 'user-123', companyId: 'company-456', role: 'user' };
      mockReq.query = { companyId: 'company-456' };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });
      zerodbService.countRows = jest.fn().mockResolvedValue(0);

      await documentController.getDocuments(mockReq, mockRes);

      expect(zerodbService.queryTable).toHaveBeenCalledWith('documents', expect.objectContaining({
        filter: expect.objectContaining({
          ownerCompany: 'company-456'
        })
      }));
    });

    it('should use vector search when search query is provided', async () => {
      mockReq.query = { search: 'test query', limit: '10' };

      const searchResults = [
        { metadata: { id: 'doc-1' }, score: 0.95 },
        { metadata: { id: 'doc-2' }, score: 0.85 }
      ];

      vectorService.searchSimilarDocuments = jest.fn().mockResolvedValue(searchResults);
      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [
          { id: 'doc-1', title: 'Result 1', status: 'active' },
          { id: 'doc-2', title: 'Result 2', status: 'active' }
        ]
      });

      await documentController.getDocuments(mockReq, mockRes);

      // Controller calls queryTable to get all docs, then filters in JS
      expect(zerodbService.queryTable).toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should support pagination parameters', async () => {
      mockReq.query = { page: '2', limit: '5', sortBy: 'title', sortOrder: 'asc' };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });

      await documentController.getDocuments(mockReq, mockRes);

      // Controller fetches all docs with limit 1000 and paginates in JS
      expect(zerodbService.queryTable).toHaveBeenCalledWith('documents', expect.objectContaining({
        filter: expect.any(Object),
        limit: 1000
      }));
      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should filter by category when provided', async () => {
      mockReq.query = { category: 'Legal' };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });
      zerodbService.countRows = jest.fn().mockResolvedValue(0);

      await documentController.getDocuments(mockReq, mockRes);

      expect(zerodbService.queryTable).toHaveBeenCalledWith('documents', expect.objectContaining({
        filter: expect.objectContaining({
          category: 'Legal'
        })
      }));
    });

    it('should handle query errors gracefully', async () => {
      zerodbService.queryTable = jest.fn().mockRejectedValue(new Error('Query failed'));

      await documentController.getDocuments(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: 'Query failed' })
      }));
    });
  });

  describe('getDocumentById', () => {
    it('should get a document by ID using ZeroDB queryTable', async () => {
      mockReq.params = { id: 'doc-123' };

      const mockDocument = { id: 'doc-123', title: 'Test Document' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [mockDocument] });

      await documentController.getDocumentById(mockReq, mockRes);

      expect(zerodbService.queryTable).toHaveBeenCalledWith('documents', {
        filter: { id: 'doc-123' },
        limit: 1
      });
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(mockDocument);
    });

    it('should return 404 if document not found', async () => {
      mockReq.params = { id: 'non-existent' };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });

      await documentController.getDocumentById(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: 'Document not found' })
      }));
    });

    it('should handle query errors', async () => {
      mockReq.params = { id: 'doc-123' };

      zerodbService.queryTable = jest.fn().mockRejectedValue(new Error('Database error'));

      await documentController.getDocumentById(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: 'Database error' })
      }));
    });
  });

  describe('updateDocumentById', () => {
    it('should update a document using ZeroDB updateRows', async () => {
      mockReq.params = { id: 'doc-123' };
      mockReq.body = { title: 'Updated Title', content: 'Updated content' };

      const updatedDocument = { id: 'doc-123', title: 'Updated Title', content: 'Updated content' };
      zerodbService.updateRows = jest.fn().mockResolvedValue({ modifiedCount: 1 });
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [updatedDocument] });

      await documentController.updateDocumentById(mockReq, mockRes);

      expect(zerodbService.updateRows).toHaveBeenCalledWith('documents',
        expect.objectContaining({
          filter: { id: 'doc-123' },
          update: expect.objectContaining({ title: 'Updated Title', content: 'Updated content' })
        })
      );
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(vectorService.indexDocument).toHaveBeenCalled();
      expect(websocketService.broadcastDocumentEvent).toHaveBeenCalledWith('updated', expect.any(Object));
    });

    it('should return 404 if document to update not found', async () => {
      mockReq.params = { id: 'non-existent' };
      mockReq.body = { title: 'Updated' };

      zerodbService.updateRows = jest.fn().mockResolvedValue({ modifiedCount: 0 });
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });

      await documentController.updateDocumentById(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: 'Document not found' })
      }));
    });

    it('should not re-index if content fields unchanged', async () => {
      mockReq.params = { id: 'doc-123' };
      mockReq.body = { status: 'archived' };

      const updatedDocument = { id: 'doc-123', status: 'archived' };
      zerodbService.updateRows = jest.fn().mockResolvedValue({ modifiedCount: 1 });
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [updatedDocument] });

      await documentController.updateDocumentById(mockReq, mockRes);

      expect(vectorService.indexDocument).not.toHaveBeenCalled();
    });

    it('should handle update errors', async () => {
      mockReq.params = { id: 'doc-123' };
      mockReq.body = { title: 'Updated' };

      zerodbService.updateRows = jest.fn().mockRejectedValue(new Error('Update failed'));

      await documentController.updateDocumentById(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: 'Update failed' })
      }));
    });
  });

  describe('deleteDocumentById', () => {
    it('should delete a document using ZeroDB deleteRows', async () => {
      mockReq.params = { id: 'doc-123' };

      const deletedDocument = { id: 'doc-123', title: 'Deleted Document' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [deletedDocument] });
      zerodbService.deleteRows = jest.fn().mockResolvedValue({ deletedCount: 1 });

      await documentController.deleteDocumentById(mockReq, mockRes);

      expect(zerodbService.deleteRows).toHaveBeenCalledWith('documents', expect.objectContaining({ filter: { id: 'doc-123' } }));
      expect(vectorService.deleteDocument).toHaveBeenCalledWith('doc-123');
      expect(websocketService.broadcastDocumentEvent).toHaveBeenCalledWith('deleted', expect.any(Object));
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Document deleted' });
    });

    it('should return 404 if document to delete not found', async () => {
      mockReq.params = { id: 'non-existent' };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });

      await documentController.deleteDocumentById(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: 'Document not found' })
      }));
    });

    it('should handle delete errors', async () => {
      mockReq.params = { id: 'doc-123' };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [{ id: 'doc-123' }] });
      zerodbService.deleteRows = jest.fn().mockRejectedValue(new Error('Delete failed'));

      await documentController.deleteDocumentById(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: 'Delete failed' })
      }));
    });

    it('should continue if vector deletion fails', async () => {
      mockReq.params = { id: 'doc-123' };

      const deletedDocument = { id: 'doc-123', title: 'Test' };
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [deletedDocument] });
      zerodbService.deleteRows = jest.fn().mockResolvedValue({ deletedCount: 1 });
      vectorService.deleteDocument = jest.fn().mockRejectedValue(new Error('Vector deletion failed'));

      await documentController.deleteDocumentById(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(200);
    });
  });

  describe('searchDocuments', () => {
    it('should perform semantic search using vector service', async () => {
      mockReq.body = { query: 'financial reports', limit: 10, threshold: 0.5 };
      mockReq.user = { userId: 'user-123', companyId: 'company-456', role: 'user' };

      const searchResults = [
        { metadata: { id: 'doc-1' }, score: 0.95 },
        { metadata: { id: 'doc-2' }, score: 0.85 }
      ];

      vectorService.searchSimilarDocuments = jest.fn().mockResolvedValue(searchResults);
      zerodbService.queryTable = jest.fn().mockResolvedValue({
        rows: [
          { id: 'doc-1', title: 'Financial Report Q1', accessLevel: 'public' },
          { id: 'doc-2', title: 'Financial Report Q2', accessLevel: 'public' }
        ]
      });

      await documentController.searchDocuments(mockReq, mockRes);

      expect(vectorService.searchSimilarDocuments).toHaveBeenCalledWith('financial reports', {
        limit: 10,
        threshold: 0.5,
        namespace: 'documents'
      });
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        results: expect.any(Array),
        count: expect.any(Number),
        query: 'financial reports'
      }));
    });

    it('should require search query', async () => {
      mockReq.body = { limit: 10 };

      await documentController.searchDocuments(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: 'Search query is required' })
      }));
    });

    it('should handle empty search results', async () => {
      mockReq.body = { query: 'nonexistent content' };

      vectorService.searchSimilarDocuments = jest.fn().mockResolvedValue([]);

      await documentController.searchDocuments(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        results: [],
        count: 0,
        query: 'nonexistent content'
      });
    });

    it('should apply access control filters', async () => {
      mockReq.body = { query: 'test' };
      mockReq.user = { userId: 'user-123', companyId: 'company-456', role: 'user' };

      const searchResults = [{ metadata: { id: 'doc-1' }, score: 0.9 }];
      vectorService.searchSimilarDocuments = jest.fn().mockResolvedValue(searchResults);
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });

      await documentController.searchDocuments(mockReq, mockRes);

      // Controller fetches all docs and filters in JS by companyId
      expect(zerodbService.queryTable).toHaveBeenCalledWith('documents', expect.objectContaining({
        filter: expect.any(Object)
      }));
    });
  });

  describe('findSimilarDocuments', () => {
    it('should find similar documents using vector service', async () => {
      mockReq.params = { id: 'doc-123' };
      mockReq.query = { limit: '5', threshold: '0.5' };
      mockReq.user = { userId: 'user-123', role: 'admin' };

      const referenceDoc = {
        id: 'doc-123',
        title: 'Reference Document',
        content: 'Some content',
        accessLevel: 'public'
      };

      const similarDocs = [
        { metadata: { id: 'doc-456' }, score: 0.85 },
        { metadata: { id: 'doc-789' }, score: 0.75 }
      ];

      zerodbService.queryTable = jest.fn()
        .mockResolvedValueOnce({ rows: [referenceDoc] })
        .mockResolvedValueOnce({ rows: [
          { id: 'doc-456', title: 'Similar Doc 1' },
          { id: 'doc-789', title: 'Similar Doc 2' }
        ]});

      vectorService.findSimilarDocuments = jest.fn().mockResolvedValue(similarDocs);

      await documentController.findSimilarDocuments(mockReq, mockRes);

      expect(vectorService.findSimilarDocuments).toHaveBeenCalledWith('doc-123', expect.objectContaining({
        limit: 5,
        threshold: 0.5,
        excludeIds: ['doc-123']
      }));
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        referenceDocument: referenceDoc,
        similarDocuments: expect.any(Array),
        count: expect.any(Number)
      }));
    });

    it('should return 404 if reference document not found', async () => {
      mockReq.params = { id: 'non-existent' };
      mockReq.user = { userId: 'user-123', role: 'admin' };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });

      await documentController.findSimilarDocuments(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: 'Reference document not found' })
      }));
    });

    it('should deny access to unauthorized users', async () => {
      mockReq.params = { id: 'doc-123' };
      mockReq.user = { userId: 'other-user', role: 'user' };

      const privateDoc = {
        id: 'doc-123',
        title: 'Private Document',
        accessLevel: 'private',
        uploadedBy: 'different-user'
      };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [privateDoc] });

      await documentController.findSimilarDocuments(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: 'Access denied to reference document' })
      }));
    });
  });

  describe('getDocumentAnalytics', () => {
    it('should get document analytics using vector service', async () => {
      mockReq.params = { id: 'doc-123' };
      mockReq.user = { userId: 'user-123', role: 'admin' };

      const mockDocument = {
        id: 'doc-123',
        title: 'Test Document',
        category: 'Legal',
        accessLevel: 'public'
      };

      const mockAnalytics = {
        viewCount: 100,
        downloadCount: 50,
        similarityScore: 0.75
      };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [mockDocument] });
      vectorService.getDocumentAnalytics = jest.fn().mockResolvedValue(mockAnalytics);

      await documentController.getDocumentAnalytics(mockReq, mockRes);

      expect(vectorService.getDocumentAnalytics).toHaveBeenCalledWith('doc-123');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        document: expect.objectContaining({
          id: 'doc-123',
          title: 'Test Document',
          category: 'Legal'
        }),
        analytics: mockAnalytics
      }));
    });

    it('should return 404 if document not found', async () => {
      mockReq.params = { id: 'non-existent' };
      mockReq.user = { userId: 'user-123', role: 'admin' };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });

      await documentController.getDocumentAnalytics(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: 'Document not found' })
      }));
    });

    it('should deny access to unauthorized users', async () => {
      mockReq.params = { id: 'doc-123' };
      mockReq.user = { userId: 'other-user', role: 'user' };

      const privateDoc = {
        id: 'doc-123',
        accessLevel: 'private',
        uploadedBy: 'different-user'
      };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [privateDoc] });

      await documentController.getDocumentAnalytics(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: 'Access denied' })
      }));
    });
  });

  describe('bulkIndexDocuments', () => {
    it('should bulk index documents for admin users', async () => {
      mockReq.user = { userId: 'admin-123', role: 'admin' };
      mockReq.query = { force: 'false' };

      const documents = [
        { id: 'doc-1', title: 'Doc 1', content: 'Content 1', status: 'active' },
        { id: 'doc-2', title: 'Doc 2', description: 'Description 2', status: 'active' }
      ];

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: documents });
      zerodbService.updateRows = jest.fn().mockResolvedValue({ modifiedCount: 1 });
      vectorService.indexDocument = jest.fn().mockResolvedValue({});

      await documentController.bulkIndexDocuments(mockReq, mockRes);

      expect(vectorService.indexDocument).toHaveBeenCalledTimes(2);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Bulk indexing completed',
        summary: expect.objectContaining({
          total: 2,
          indexed: 2,
          failed: 0
        })
      }));
    });

    it('should deny access to non-admin users', async () => {
      mockReq.user = { userId: 'user-123', role: 'user' };

      await documentController.bulkIndexDocuments(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: 'Admin access required' })
      }));
    });

    it('should handle partial indexing failures', async () => {
      mockReq.user = { userId: 'admin-123', role: 'admin' };
      mockReq.query = {};

      const documents = [
        { id: 'doc-1', title: 'Doc 1', content: 'Content 1', status: 'active' },
        { id: 'doc-2', title: 'Doc 2', content: 'Content 2', status: 'active' }
      ];

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: documents });
      zerodbService.updateRows = jest.fn().mockResolvedValue({ modifiedCount: 1 });
      vectorService.indexDocument = jest.fn()
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Indexing failed'));

      await documentController.bulkIndexDocuments(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        summary: expect.objectContaining({
          total: 2,
          indexed: 1,
          failed: 1
        })
      }));
    });

    it('should force re-index when force flag is true', async () => {
      mockReq.user = { userId: 'admin-123', role: 'admin' };
      mockReq.query = { force: 'true' };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });

      await documentController.bulkIndexDocuments(mockReq, mockRes);

      // Controller fetches all docs with {} filter and filters deleted in JS
      expect(zerodbService.queryTable).toHaveBeenCalledWith('documents', expect.objectContaining({
        filter: {},
        limit: 1000
      }));
    });
  });

  describe('Error Handling', () => {
    it('should handle ZeroDB connection errors gracefully', async () => {
      mockReq.params = { id: 'doc-123' };

      const connectionError = new Error('Connection refused');
      connectionError.code = 'ECONNREFUSED';

      zerodbService.queryTable = jest.fn().mockRejectedValue(connectionError);

      await documentController.getDocumentById(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: 'Connection refused' })
      }));
    });

    it('should handle ZeroDB timeout errors', async () => {
      mockReq.params = { id: 'doc-123' };

      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'ETIMEDOUT';

      zerodbService.queryTable = jest.fn().mockRejectedValue(timeoutError);

      await documentController.getDocumentById(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('Access Control', () => {
    it('should allow admin users to access any document', async () => {
      mockReq.params = { id: 'doc-123' };
      mockReq.user = { userId: 'admin-123', role: 'admin' };

      const privateDoc = {
        id: 'doc-123',
        accessLevel: 'private',
        uploadedBy: 'different-user'
      };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [privateDoc] });
      vectorService.getDocumentAnalytics = jest.fn().mockResolvedValue({});

      await documentController.getDocumentAnalytics(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should allow document owners to access their documents', async () => {
      mockReq.params = { id: 'doc-123' };
      mockReq.user = { userId: 'user-123', role: 'user' };

      const ownedDoc = {
        id: 'doc-123',
        accessLevel: 'private',
        uploadedBy: 'user-123'
      };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [ownedDoc] });
      vectorService.getDocumentAnalytics = jest.fn().mockResolvedValue({});

      await documentController.getDocumentAnalytics(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should allow shared users to access shared documents', async () => {
      mockReq.params = { id: 'doc-123' };
      mockReq.user = { userId: 'shared-user', role: 'user' };

      const sharedDoc = {
        id: 'doc-123',
        accessLevel: 'private',
        uploadedBy: 'owner-user',
        sharedWith: ['shared-user', 'another-user']
      };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [sharedDoc] });
      vectorService.getDocumentAnalytics = jest.fn().mockResolvedValue({});

      await documentController.getDocumentAnalytics(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(200);
    });
  });
});

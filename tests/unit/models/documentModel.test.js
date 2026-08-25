/**
 * documentModel.js - Comprehensive Unit Tests
 *
 * Tests for the documentModel (not Document.js) which has a different schema:
 * documentId, name, title, content, DocumentType, FileType, etc.
 */

jest.mock('../../../services/zerodbService', () => ({
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  deleteRowById: jest.fn(),
  initialize: jest.fn(),
  projectId: 'mock-project-id',
  client: { put: jest.fn().mockResolvedValue({}) }
}));

const zerodbService = require('../../../services/zerodbService');
const DocumentModel = require('../../../models/documentModel');

describe('documentModel', () => {
  const validDocData = () => ({
    documentId: 'doc_001',
    name: 'Incorporation Agreement',
    uploadedBy: 'user_001',
    path: '/docs/incorporation.pdf',
    title: 'Articles of Incorporation',
    content: 'Full text content of the document...',
    DocumentType: 'Legal',
    FileType: 'PDF'
  });

  const makeInsertResponse = (overrides = {}) => ({
    data: [{
      row_id: 'row-1',
      row_data: {
        _id: 'uuid-1',
        ...validDocData(),
        ...overrides
      }
    }]
  });

  const makeQueryResponse = (items = []) => ({
    data: items.map((item, i) => ({
      row_id: `row-${i}`,
      row_data: item
    }))
  });

  beforeEach(() => {
    jest.clearAllMocks();
    zerodbService.insertRow.mockResolvedValue(makeInsertResponse());
    zerodbService.queryTable.mockResolvedValue({ data: [] });
    zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });
    zerodbService.client.put.mockResolvedValue({});
  });

  // =========================================================================
  // Schema
  // =========================================================================
  describe('Schema Definition', () => {
    it('should have schema defined', () => {
      expect(DocumentModel.schema).toBeDefined();
    });

    it('should have required fields', () => {
      const requiredFields = ['_id', 'documentId', 'name', 'uploadedBy', 'path', 'title', 'content', 'DocumentType', 'FileType'];
      requiredFields.forEach(field => {
        expect(DocumentModel.schema[field]).toBeDefined();
      });
    });

    it('should have DocumentType enum', () => {
      expect(DocumentModel.schema.DocumentType.enum).toEqual(['Legal', 'Financial', 'Other']);
    });

    it('should have FileType enum', () => {
      expect(DocumentModel.schema.FileType.enum).toEqual(['PDF', 'DOCX', 'TXT']);
    });

    it('should have optional fields', () => {
      expect(DocumentModel.schema.metadata).toBeDefined();
      expect(DocumentModel.schema.Versioning).toBeDefined();
      expect(DocumentModel.schema.AccessControl).toBeDefined();
      expect(DocumentModel.schema.LegalSignificance).toBeDefined();
    });
  });

  describe('Table Configuration', () => {
    it('should use documents table name', () => {
      expect(DocumentModel.tableName).toBe('documents');
    });
  });

  // =========================================================================
  // isValidDocumentType()
  // =========================================================================
  describe('isValidDocumentType()', () => {
    it('should return true for Legal', () => {
      expect(DocumentModel.isValidDocumentType('Legal')).toBe(true);
    });

    it('should return true for Financial', () => {
      expect(DocumentModel.isValidDocumentType('Financial')).toBe(true);
    });

    it('should return true for Other', () => {
      expect(DocumentModel.isValidDocumentType('Other')).toBe(true);
    });

    it('should return false for invalid type', () => {
      expect(DocumentModel.isValidDocumentType('Invalid')).toBe(false);
    });

    it('should return false for lowercase', () => {
      expect(DocumentModel.isValidDocumentType('legal')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(DocumentModel.isValidDocumentType('')).toBe(false);
    });

    it('should return false for null', () => {
      expect(DocumentModel.isValidDocumentType(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(DocumentModel.isValidDocumentType(undefined)).toBe(false);
    });
  });

  // =========================================================================
  // isValidFileType()
  // =========================================================================
  describe('isValidFileType()', () => {
    it('should return true for PDF', () => {
      expect(DocumentModel.isValidFileType('PDF')).toBe(true);
    });

    it('should return true for DOCX', () => {
      expect(DocumentModel.isValidFileType('DOCX')).toBe(true);
    });

    it('should return true for TXT', () => {
      expect(DocumentModel.isValidFileType('TXT')).toBe(true);
    });

    it('should return false for invalid type', () => {
      expect(DocumentModel.isValidFileType('XLSX')).toBe(false);
    });

    it('should return false for lowercase', () => {
      expect(DocumentModel.isValidFileType('pdf')).toBe(false);
    });

    it('should return false for null', () => {
      expect(DocumentModel.isValidFileType(null)).toBe(false);
    });
  });

  // =========================================================================
  // create()
  // =========================================================================
  describe('create()', () => {
    it('should throw when documentId is missing', async () => {
      const data = validDocData();
      delete data.documentId;
      await expect(DocumentModel.create(data)).rejects.toThrow('documentId is required');
    });

    it('should throw when name is missing', async () => {
      const data = validDocData();
      delete data.name;
      await expect(DocumentModel.create(data)).rejects.toThrow('name is required');
    });

    it('should throw when uploadedBy is missing', async () => {
      const data = validDocData();
      delete data.uploadedBy;
      await expect(DocumentModel.create(data)).rejects.toThrow('uploadedBy is required');
    });

    it('should throw when path is missing', async () => {
      const data = validDocData();
      delete data.path;
      await expect(DocumentModel.create(data)).rejects.toThrow('path is required');
    });

    it('should throw when title is missing', async () => {
      const data = validDocData();
      delete data.title;
      await expect(DocumentModel.create(data)).rejects.toThrow('title is required');
    });

    it('should throw when content is missing', async () => {
      const data = validDocData();
      delete data.content;
      await expect(DocumentModel.create(data)).rejects.toThrow('content is required');
    });

    it('should throw when DocumentType is missing', async () => {
      const data = validDocData();
      delete data.DocumentType;
      await expect(DocumentModel.create(data)).rejects.toThrow('DocumentType is required');
    });

    it('should throw when DocumentType is invalid', async () => {
      const data = { ...validDocData(), DocumentType: 'Invalid' };
      await expect(DocumentModel.create(data)).rejects.toThrow('DocumentType must be one of');
    });

    it('should throw when FileType is missing', async () => {
      const data = validDocData();
      delete data.FileType;
      await expect(DocumentModel.create(data)).rejects.toThrow('FileType is required');
    });

    it('should throw when FileType is invalid', async () => {
      const data = { ...validDocData(), FileType: 'XLS' };
      await expect(DocumentModel.create(data)).rejects.toThrow('FileType must be one of');
    });

    it('should throw when documentId is duplicate', async () => {
      // First findOne returns an existing doc
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{ documentId: 'doc_001' }])
      );
      await expect(DocumentModel.create(validDocData())).rejects.toThrow('documentId must be unique');
    });

    it('should create document when all fields are valid and no duplicate', async () => {
      // findOne returns no existing doc
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await DocumentModel.create(validDocData());
      expect(result).toBeDefined();
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'documents',
        expect.objectContaining({ documentId: 'doc_001' })
      );
    });

    it('should accept all valid DocumentType values', async () => {
      for (const docType of ['Legal', 'Financial', 'Other']) {
        jest.clearAllMocks();
        zerodbService.queryTable.mockResolvedValue({ data: [] });
        zerodbService.insertRow.mockResolvedValue(makeInsertResponse({ DocumentType: docType }));
        await DocumentModel.create({ ...validDocData(), DocumentType: docType });
        expect(zerodbService.insertRow).toHaveBeenCalled();
      }
    });

    it('should accept all valid FileType values', async () => {
      for (const fileType of ['PDF', 'DOCX', 'TXT']) {
        jest.clearAllMocks();
        zerodbService.queryTable.mockResolvedValue({ data: [] });
        zerodbService.insertRow.mockResolvedValue(makeInsertResponse({ FileType: fileType }));
        await DocumentModel.create({ ...validDocData(), FileType: fileType });
        expect(zerodbService.insertRow).toHaveBeenCalled();
      }
    });
  });

  // =========================================================================
  // findByUploader()
  // =========================================================================
  describe('findByUploader()', () => {
    it('should query by uploadedBy field', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{ documentId: 'doc_001', uploadedBy: 'user_001' }])
      );
      const results = await DocumentModel.findByUploader('user_001');
      expect(results).toHaveLength(1);
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'documents',
        expect.objectContaining({ filter: { uploadedBy: 'user_001' } })
      );
    });

    it('should return empty array when no documents found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const results = await DocumentModel.findByUploader('nonexistent');
      expect(results).toEqual([]);
    });
  });

  // =========================================================================
  // findByType()
  // =========================================================================
  describe('findByType()', () => {
    it('should query by DocumentType field', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{ documentId: 'doc_001', DocumentType: 'Legal' }])
      );
      const results = await DocumentModel.findByType('Legal');
      expect(results).toHaveLength(1);
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'documents',
        expect.objectContaining({ filter: { DocumentType: 'Legal' } })
      );
    });
  });

  // =========================================================================
  // findByFileType()
  // =========================================================================
  describe('findByFileType()', () => {
    it('should query by FileType field', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{ documentId: 'doc_001', FileType: 'PDF' }])
      );
      const results = await DocumentModel.findByFileType('PDF');
      expect(results).toHaveLength(1);
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'documents',
        expect.objectContaining({ filter: { FileType: 'PDF' } })
      );
    });
  });

  // =========================================================================
  // searchByTitle()
  // =========================================================================
  describe('searchByTitle()', () => {
    it('should return documents matching title (case-insensitive)', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([
          { documentId: 'doc_001', title: 'Articles of Incorporation' },
          { documentId: 'doc_002', title: 'Invoice 2025' }
        ])
      );
      const results = await DocumentModel.searchByTitle('articles');
      expect(results).toHaveLength(1);
      expect(results[0].documentId).toBe('doc_001');
    });

    it('should return empty array when no match', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{ documentId: 'doc_001', title: 'Test Doc' }])
      );
      const results = await DocumentModel.searchByTitle('nonexistent');
      expect(results).toEqual([]);
    });

    it('should handle documents with no title', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([
          { documentId: 'doc_001', title: null },
          { documentId: 'doc_002', title: 'Valid Title' }
        ])
      );
      const results = await DocumentModel.searchByTitle('valid');
      expect(results).toHaveLength(1);
    });

    it('should be case-insensitive', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{ documentId: 'doc_001', title: 'LEGAL DOCUMENT' }])
      );
      const results = await DocumentModel.searchByTitle('legal');
      expect(results).toHaveLength(1);
    });
  });

  // =========================================================================
  // searchByContent()
  // =========================================================================
  describe('searchByContent()', () => {
    it('should return documents matching content (case-insensitive)', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([
          { documentId: 'doc_001', content: 'This agreement governs...' },
          { documentId: 'doc_002', content: 'Financial report for Q4' }
        ])
      );
      const results = await DocumentModel.searchByContent('agreement');
      expect(results).toHaveLength(1);
      expect(results[0].documentId).toBe('doc_001');
    });

    it('should return empty array when no match', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{ documentId: 'doc_001', content: 'Some text' }])
      );
      const results = await DocumentModel.searchByContent('nonexistent');
      expect(results).toEqual([]);
    });

    it('should handle documents with no content', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([
          { documentId: 'doc_001', content: null },
          { documentId: 'doc_002', content: 'Has content' }
        ])
      );
      const results = await DocumentModel.searchByContent('content');
      expect(results).toHaveLength(1);
    });
  });

  // =========================================================================
  // updateMetadata()
  // =========================================================================
  describe('updateMetadata()', () => {
    it('should call findOneAndUpdate with metadata', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{ documentId: 'doc_001' }])
      );
      zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });
      await DocumentModel.updateMetadata('doc_001', { tags: ['important'] });
      expect(zerodbService.queryTable).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // updateContent()
  // =========================================================================
  describe('updateContent()', () => {
    it('should update content without version', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{ documentId: 'doc_001', content: 'old' }])
      );
      zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });
      await DocumentModel.updateContent('doc_001', 'new content');
      expect(zerodbService.queryTable).toHaveBeenCalled();
    });

    it('should update content with version', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{ documentId: 'doc_001', content: 'old' }])
      );
      zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });
      await DocumentModel.updateContent('doc_001', 'new content', 'v2.0');
      expect(zerodbService.queryTable).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // updateAccessControl()
  // =========================================================================
  describe('updateAccessControl()', () => {
    it('should update access control settings', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{ documentId: 'doc_001' }])
      );
      zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });
      const acl = { read: ['user_001'], write: ['admin_001'] };
      await DocumentModel.updateAccessControl('doc_001', acl);
      expect(zerodbService.queryTable).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // paginate()
  // =========================================================================
  describe('paginate()', () => {
    it('should return paginated results with defaults', async () => {
      zerodbService.queryTable
        .mockResolvedValueOnce(makeQueryResponse([{ documentId: 'doc_001' }]))
        .mockResolvedValueOnce({ total: 1, count: 1 });

      const result = await DocumentModel.paginate();
      expect(result.documents).toBeDefined();
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });

    it('should handle custom page and limit', async () => {
      zerodbService.queryTable
        .mockResolvedValueOnce(makeQueryResponse([]))
        .mockResolvedValueOnce({ total: 25, count: 25 });

      const result = await DocumentModel.paginate(3, 5);
      expect(result.pagination.page).toBe(3);
      expect(result.pagination.limit).toBe(5);
      expect(result.pagination.total).toBe(25);
      expect(result.pagination.pages).toBe(5);
    });

    it('should apply filter', async () => {
      zerodbService.queryTable
        .mockResolvedValueOnce(makeQueryResponse([]))
        .mockResolvedValueOnce({ total: 0 });

      await DocumentModel.paginate(1, 10, { DocumentType: 'Legal' });
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'documents',
        expect.objectContaining({ filter: { DocumentType: 'Legal' } })
      );
    });

    it('should calculate pages correctly', async () => {
      zerodbService.queryTable
        .mockResolvedValueOnce(makeQueryResponse([]))
        .mockResolvedValueOnce({ total: 23 });

      const result = await DocumentModel.paginate(1, 10);
      expect(result.pagination.pages).toBe(3); // ceil(23/10) = 3
    });
  });

  // =========================================================================
  // getRecent()
  // =========================================================================
  describe('getRecent()', () => {
    it('should call find with limit and sort', async () => {
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([]));
      await DocumentModel.getRecent(5);
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'documents',
        expect.objectContaining({
          limit: 5,
          sort: { createdAt: -1 }
        })
      );
    });

    it('should default limit to 10', async () => {
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([]));
      await DocumentModel.getRecent();
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'documents',
        expect.objectContaining({ limit: 10 })
      );
    });
  });

  // =========================================================================
  // findByLegalSignificance()
  // =========================================================================
  describe('findByLegalSignificance()', () => {
    it('should query by LegalSignificance field', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{ documentId: 'doc_001', LegalSignificance: 'High' }])
      );
      const results = await DocumentModel.findByLegalSignificance('High');
      expect(results).toHaveLength(1);
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'documents',
        expect.objectContaining({ filter: { LegalSignificance: 'High' } })
      );
    });
  });

  // =========================================================================
  // deleteByDocumentId()
  // =========================================================================
  describe('deleteByDocumentId()', () => {
    it('should delete document and return it', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{ documentId: 'doc_001', name: 'Test' }])
      );
      zerodbService.deleteRows.mockResolvedValue({ deletedCount: 1 });
      const result = await DocumentModel.deleteByDocumentId('doc_001');
      expect(result).toBeDefined();
      expect(result.documentId).toBe('doc_001');
    });

    it('should return null when document not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await DocumentModel.deleteByDocumentId('nonexistent');
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // Base model methods - existence and delegation
  // =========================================================================
  describe('Base Model Methods', () => {
    const methods = [
      'find', 'findOne', 'findById', 'findOneAndUpdate', 'findByIdAndUpdate',
      'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'findOneAndDelete',
      'findByIdAndDelete', 'countDocuments', 'exists', 'distinct', 'aggregate',
      'insertMany'
    ];

    methods.forEach(method => {
      it(`should have ${method} method`, () => {
        expect(typeof DocumentModel[method]).toBe('function');
      });
    });

    // Actually call the delegated methods to get function coverage on lines 54-69
    it('should delegate find to baseModel', async () => {
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([]));
      const result = await DocumentModel.find({ DocumentType: 'Legal' });
      expect(Array.isArray(result)).toBe(true);
    });

    it('should delegate findOne to baseModel', async () => {
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([{ documentId: 'doc_001' }]));
      const result = await DocumentModel.findOne({ documentId: 'doc_001' });
      expect(result).toBeDefined();
    });

    it('should delegate findById to baseModel', async () => {
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([{ _id: 'id-1' }]));
      const result = await DocumentModel.findById('id-1');
      expect(result).toBeDefined();
    });

    it('should delegate findOneAndUpdate to baseModel', async () => {
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([{ documentId: 'doc_001' }]));
      const result = await DocumentModel.findOneAndUpdate(
        { documentId: 'doc_001' },
        { $set: { name: 'Updated' } }
      );
      expect(result).toBeDefined();
    });

    it('should delegate findByIdAndUpdate to baseModel', async () => {
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([{ _id: 'id-1' }]));
      const result = await DocumentModel.findByIdAndUpdate('id-1', { $set: { name: 'Updated' } });
      expect(result).toBeDefined();
    });

    it('should delegate updateOne to baseModel', async () => {
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([{ documentId: 'doc_001' }]));
      const result = await DocumentModel.updateOne({ documentId: 'doc_001' }, { $set: { name: 'Updated' } });
      expect(result.acknowledged).toBe(true);
    });

    it('should delegate updateMany to baseModel', async () => {
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([{ _id: 'id-1' }]));
      const result = await DocumentModel.updateMany({ DocumentType: 'Legal' }, { $set: { name: 'Bulk' } });
      expect(result.acknowledged).toBe(true);
    });

    it('should delegate deleteOne to baseModel', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await DocumentModel.deleteOne({ documentId: 'doc_001' });
      expect(result.acknowledged).toBe(true);
    });

    it('should delegate deleteMany to baseModel', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await DocumentModel.deleteMany({ DocumentType: 'Other' });
      expect(result.acknowledged).toBe(true);
    });

    it('should delegate findOneAndDelete to baseModel', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await DocumentModel.findOneAndDelete({ documentId: 'doc_001' });
      expect(result).toBeNull();
    });

    it('should delegate findByIdAndDelete to baseModel', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await DocumentModel.findByIdAndDelete('id-1');
      expect(result).toBeNull();
    });

    it('should delegate countDocuments to baseModel', async () => {
      zerodbService.queryTable.mockResolvedValue({ total: 5 });
      const result = await DocumentModel.countDocuments({ DocumentType: 'Legal' });
      expect(typeof result).toBe('number');
    });

    it('should delegate exists to baseModel', async () => {
      zerodbService.queryTable.mockResolvedValue({ total: 1 });
      const result = await DocumentModel.exists({ documentId: 'doc_001' });
      expect(typeof result).toBe('boolean');
    });

    it('should delegate distinct to baseModel', async () => {
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([
        { DocumentType: 'Legal' },
        { DocumentType: 'Financial' }
      ]));
      const result = await DocumentModel.distinct('DocumentType');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should delegate aggregate to baseModel', async () => {
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([]));
      const result = await DocumentModel.aggregate([{ $match: {} }]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should delegate insertMany to baseModel', async () => {
      const mockInsertRows = jest.fn().mockResolvedValue({ data: [] });
      const origInsertRows = zerodbService.insertRows;
      zerodbService.insertRows = mockInsertRows;
      try {
        await DocumentModel.insertMany([validDocData()]);
        expect(mockInsertRows).toHaveBeenCalled();
      } finally {
        zerodbService.insertRows = origInsertRows;
      }
    });
  });
});

/**
 * Tax Document Controller Tests
 * Issue #246: Implement Tax Document Download Endpoint
 *
 * Test-Driven Development approach with BDD-style descriptions
 * Target: 85%+ test coverage
 */

const fileStorageService = require('../../../services/fileStorageService');
const databaseAdapter = require('../../../services/databaseAdapter');

// Mock dependencies
jest.mock('../../../services/fileStorageService');
jest.mock('../../../services/databaseAdapter');

// Import controller after mocking
const {
  getTaxDocument,
  downloadTaxDocument,
  listTaxDocuments,
} = require('../../../controllers/taxDocumentController');

describe('Tax Document Controller', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: {},
      query: {},
      user: {
        userId: 'user123',
        companyId: 'company123',
        role: 'user'
      }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      send: jest.fn()
    };
  });

  describe('Given a user wants to download a tax document', () => {
    describe('When the document exists and user is authenticated', () => {
      it('should successfully download the tax document with proper headers', async () => {
        // Arrange
        req.params.id = 'tax-doc-123';

        const mockDocument = {
          _id: 'tax-doc-123',
          id: 'tax-doc-123',
          name: '2023-1099.pdf',
          fileName: '2023-1099.pdf',
          type: '1099',
          status: 'Ready',
          fileId: 'file-123',
          companyId: 'company123',
          stakeholderId: 'user123',
          taxYear: 2023,
          contentType: 'application/pdf',
          size: 102400
        };

        const mockFileData = {
          data: Buffer.from('PDF content here'),
          contentType: 'application/pdf',
          size: 102400
        };

        databaseAdapter.findById.mockResolvedValue(mockDocument);
        fileStorageService.downloadFile.mockResolvedValue(mockFileData);

        // Act
        await downloadTaxDocument(req, res);

        // Assert
        expect(databaseAdapter.findById).toHaveBeenCalledWith('TaxDocument', 'tax-doc-123');
        expect(fileStorageService.downloadFile).toHaveBeenCalledWith('file-123');
        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
        expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="2023-1099.pdf"');
        expect(res.setHeader).toHaveBeenCalledWith('Content-Length', 102400);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(mockFileData.data);
      });

      it('should sanitize filename to prevent path traversal attacks', async () => {
        // Arrange
        req.params.id = 'tax-doc-456';

        const mockDocument = {
          _id: 'tax-doc-456',
          id: 'tax-doc-456',
          name: '../../malicious.pdf',
          fileName: '../../malicious.pdf',
          type: '1099',
          fileId: 'file-456',
          companyId: 'company123',
          stakeholderId: 'user123',
          contentType: 'application/pdf',
          size: 1024
        };

        const mockFileData = {
          data: Buffer.from('PDF content'),
          contentType: 'application/pdf',
          size: 1024
        };

        databaseAdapter.findById.mockResolvedValue(mockDocument);
        fileStorageService.downloadFile.mockResolvedValue(mockFileData);

        // Act
        await downloadTaxDocument(req, res);

        // Assert
        expect(res.setHeader).toHaveBeenCalledWith(
          'Content-Disposition',
          expect.stringMatching(/filename="[^/\\]+\.pdf"/)
        );
      });

      it('should use default content type if not specified', async () => {
        // Arrange
        req.params.id = 'tax-doc-789';

        const mockDocument = {
          _id: 'tax-doc-789',
          id: 'tax-doc-789',
          name: 'tax-summary.pdf',
          fileName: 'tax-summary.pdf',
          fileId: 'file-789',
          companyId: 'company123',
          stakeholderId: 'user123'
        };

        const mockFileData = {
          data: Buffer.from('PDF content'),
          contentType: 'application/pdf',
          size: 2048
        };

        databaseAdapter.findById.mockResolvedValue(mockDocument);
        fileStorageService.downloadFile.mockResolvedValue(mockFileData);

        // Act
        await downloadTaxDocument(req, res);

        // Assert
        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      });
    });

    describe('When the document does not exist', () => {
      it('should return 404 when tax document is not found', async () => {
        // Arrange
        req.params.id = 'non-existent-doc';
        databaseAdapter.findById.mockResolvedValue(null);

        // Act
        await downloadTaxDocument(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          message: 'Tax document not found'
        });
        expect(fileStorageService.downloadFile).not.toHaveBeenCalled();
      });
    });

    describe('When the file storage fails', () => {
      it('should return 404 when file is not found in storage', async () => {
        // Arrange
        req.params.id = 'tax-doc-missing-file';

        const mockDocument = {
          _id: 'tax-doc-missing-file',
          id: 'tax-doc-missing-file',
          name: 'missing.pdf',
          fileName: 'missing.pdf',
          fileId: 'file-missing',
          companyId: 'company123',
          stakeholderId: 'user123'
        };

        databaseAdapter.findById.mockResolvedValue(mockDocument);
        const fileNotFoundError = new Error('File not found in storage');
        fileNotFoundError.statusCode = 404;
        fileStorageService.downloadFile.mockRejectedValue(fileNotFoundError);

        // Act
        await downloadTaxDocument(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          message: 'File not found in storage'
        });
      });

      it('should return 500 on file storage service error', async () => {
        // Arrange
        req.params.id = 'tax-doc-error';

        const mockDocument = {
          _id: 'tax-doc-error',
          id: 'tax-doc-error',
          name: 'error.pdf',
          fileName: 'error.pdf',
          fileId: 'file-error',
          companyId: 'company123',
          stakeholderId: 'user123'
        };

        databaseAdapter.findById.mockResolvedValue(mockDocument);
        fileStorageService.downloadFile.mockRejectedValue(new Error('Storage service error'));

        // Act
        await downloadTaxDocument(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          message: 'Failed to download tax document'
        });
      });
    });

    describe('When document ID is invalid', () => {
      it('should return 400 for invalid document ID format', async () => {
        // Arrange
        req.params.id = '';

        // Act
        await downloadTaxDocument(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          message: 'Invalid document ID'
        });
        expect(databaseAdapter.findById).not.toHaveBeenCalled();
      });
    });

    describe('When database error occurs', () => {
      it('should return 500 on database adapter error', async () => {
        // Arrange
        req.params.id = 'tax-doc-db-error';
        databaseAdapter.findById.mockRejectedValue(new Error('Database connection failed'));

        // Act
        await downloadTaxDocument(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          message: 'Failed to download tax document'
        });
      });
    });
  });

  describe('Given a user wants to get tax document metadata', () => {
    describe('When the document exists', () => {
      it('should return tax document metadata', async () => {
        // Arrange
        req.params.id = 'tax-doc-metadata';

        const mockDocument = {
          _id: 'tax-doc-metadata',
          id: 'tax-doc-metadata',
          name: '2023-W2.pdf',
          fileName: '2023-W2.pdf',
          type: 'W-2',
          status: 'Ready',
          taxYear: 2023,
          companyId: 'company123',
          stakeholderId: 'user123',
          fileId: 'file-w2',
          contentType: 'application/pdf',
          size: 51200,
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-15T10:00:00Z'
        };

        databaseAdapter.findById.mockResolvedValue(mockDocument);

        // Act
        await getTaxDocument(req, res);

        // Assert
        expect(databaseAdapter.findById).toHaveBeenCalledWith('TaxDocument', 'tax-doc-metadata');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ taxDocument: mockDocument });
      });
    });

    describe('When the document does not exist', () => {
      it('should return 404 when document not found', async () => {
        // Arrange
        req.params.id = 'non-existent';
        databaseAdapter.findById.mockResolvedValue(null);

        // Act
        await getTaxDocument(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          message: 'Tax document not found'
        });
      });
    });
  });

  describe('Given a user wants to list their tax documents', () => {
    describe('When documents exist for the user', () => {
      it('should return all tax documents for the authenticated user', async () => {
        // Arrange
        const mockDocuments = [
          {
            _id: 'doc1',
            id: 'doc1',
            name: '2023-1099.pdf',
            type: '1099',
            status: 'Ready',
            taxYear: 2023,
            stakeholderId: 'user123'
          },
          {
            _id: 'doc2',
            id: 'doc2',
            name: '2023-W2.pdf',
            type: 'W-2',
            status: 'Ready',
            taxYear: 2023,
            stakeholderId: 'user123'
          }
        ];

        databaseAdapter.find.mockResolvedValue(mockDocuments);

        // Act
        await listTaxDocuments(req, res);

        // Assert
        expect(databaseAdapter.find).toHaveBeenCalledWith('TaxDocument', {
          stakeholderId: 'user123'
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          taxDocuments: mockDocuments,
          count: 2
        });
      });

      it('should filter documents by tax year when provided', async () => {
        // Arrange
        req.query.taxYear = '2023';

        const mockDocuments = [
          {
            _id: 'doc1',
            name: '2023-1099.pdf',
            taxYear: 2023,
            stakeholderId: 'user123'
          }
        ];

        databaseAdapter.find.mockResolvedValue(mockDocuments);

        // Act
        await listTaxDocuments(req, res);

        // Assert
        expect(databaseAdapter.find).toHaveBeenCalledWith('TaxDocument', {
          stakeholderId: 'user123',
          taxYear: 2023
        });
      });

      it('should filter documents by type when provided', async () => {
        // Arrange
        req.query.type = '1099';

        const mockDocuments = [
          {
            _id: 'doc1',
            name: '2023-1099.pdf',
            type: '1099',
            stakeholderId: 'user123'
          }
        ];

        databaseAdapter.find.mockResolvedValue(mockDocuments);

        // Act
        await listTaxDocuments(req, res);

        // Assert
        expect(databaseAdapter.find).toHaveBeenCalledWith('TaxDocument', {
          stakeholderId: 'user123',
          type: '1099'
        });
      });
    });

    describe('When no documents exist', () => {
      it('should return empty array when no documents found', async () => {
        // Arrange
        databaseAdapter.find.mockResolvedValue([]);

        // Act
        await listTaxDocuments(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          taxDocuments: [],
          count: 0
        });
      });
    });
  });

  describe('Given authorization checks', () => {
    it('should prevent unauthorized access to other users documents', async () => {
      // Arrange
      req.params.id = 'other-user-doc';

      const mockDocument = {
        _id: 'other-user-doc',
        id: 'other-user-doc',
        name: 'private.pdf',
        stakeholderId: 'other-user',
        companyId: 'company123',
        fileId: 'file-123'
      };

      databaseAdapter.findById.mockResolvedValue(mockDocument);

      // Act
      await downloadTaxDocument(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access denied'
      });
      expect(fileStorageService.downloadFile).not.toHaveBeenCalled();
    });

    it('should allow admin users to access any document', async () => {
      // Arrange
      req.user.role = 'admin';
      req.params.id = 'any-doc';

      const mockDocument = {
        _id: 'any-doc',
        id: 'any-doc',
        name: 'admin-accessible.pdf',
        fileName: 'admin-accessible.pdf',
        stakeholderId: 'other-user',
        companyId: 'company123',
        fileId: 'file-admin',
        contentType: 'application/pdf',
        size: 1024
      };

      const mockFileData = {
        data: Buffer.from('PDF content'),
        contentType: 'application/pdf',
        size: 1024
      };

      databaseAdapter.findById.mockResolvedValue(mockDocument);
      fileStorageService.downloadFile.mockResolvedValue(mockFileData);

      // Act
      await downloadTaxDocument(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(fileStorageService.downloadFile).toHaveBeenCalled();
    });

    it('should allow access to documents within same company', async () => {
      // Arrange
      req.user.role = 'accountant';
      req.params.id = 'company-doc';

      const mockDocument = {
        _id: 'company-doc',
        id: 'company-doc',
        name: 'company-tax.pdf',
        fileName: 'company-tax.pdf',
        stakeholderId: 'other-user',
        companyId: 'company123',
        fileId: 'file-company',
        contentType: 'application/pdf',
        size: 2048
      };

      const mockFileData = {
        data: Buffer.from('PDF content'),
        contentType: 'application/pdf',
        size: 2048
      };

      databaseAdapter.findById.mockResolvedValue(mockDocument);
      fileStorageService.downloadFile.mockResolvedValue(mockFileData);

      // Act
      await downloadTaxDocument(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(fileStorageService.downloadFile).toHaveBeenCalled();
    });
  });

  describe('Given document is not ready for download', () => {
    it('should return 404 when document has no fileId', async () => {
      // Arrange
      req.params.id = 'pending-doc';

      const mockDocument = {
        _id: 'pending-doc',
        id: 'pending-doc',
        name: 'pending.pdf',
        fileName: 'pending.pdf',
        stakeholderId: 'user123',
        companyId: 'company123',
        status: 'Pending'
        // No fileId
      };

      databaseAdapter.findById.mockResolvedValue(mockDocument);

      // Act
      await downloadTaxDocument(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Document file not available',
        status: 'Pending'
      });
      expect(fileStorageService.downloadFile).not.toHaveBeenCalled();
    });
  });
});

// Import additional controller methods for comprehensive testing
const {
  createTaxDocument,
  updateTaxDocument,
  deleteTaxDocument,
} = require('../../../controllers/taxDocumentController');

describe('Tax Document Controller - Administrative Operations', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: {},
      query: {},
      body: {},
      user: {
        userId: 'admin123',
        companyId: 'company123',
        role: 'admin'
      }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      send: jest.fn()
    };
  });

  describe('Given admin wants to create a tax document', () => {
    it('should successfully create a tax document', async () => {
      // Arrange
      req.body = {
        name: '2024-1099.pdf',
        fileName: '2024-1099.pdf',
        type: '1099',
        taxYear: 2024,
        stakeholderId: 'stakeholder123',
        companyId: 'company123',
        fileId: 'file-new',
        contentType: 'application/pdf',
        size: 50000,
        metadata: { generatedBy: 'system' }
      };

      const mockCreatedDocument = {
        _id: 'new-doc-id',
        ...req.body,
        status: 'Ready',
        createdAt: '2024-01-15T10:00:00Z'
      };

      databaseAdapter.create.mockResolvedValue(mockCreatedDocument);

      // Act
      await createTaxDocument(req, res);

      // Assert
      expect(databaseAdapter.create).toHaveBeenCalledWith('TaxDocument', expect.objectContaining({
        name: '2024-1099.pdf',
        fileName: '2024-1099.pdf',
        type: '1099',
        taxYear: 2024,
        status: 'Ready'
      }));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        taxDocument: mockCreatedDocument,
        message: 'Tax document created successfully'
      });
    });

    it('should set status to Pending when no fileId provided', async () => {
      // Arrange
      req.body = {
        name: '2024-W2.pdf',
        fileName: '2024-W2.pdf',
        type: 'W-2',
        taxYear: 2024,
        stakeholderId: 'stakeholder123',
        companyId: 'company123'
        // No fileId
      };

      const mockCreatedDocument = {
        _id: 'pending-doc',
        ...req.body,
        status: 'Pending',
        createdAt: '2024-01-15T10:00:00Z'
      };

      databaseAdapter.create.mockResolvedValue(mockCreatedDocument);

      // Act
      await createTaxDocument(req, res);

      // Assert
      expect(databaseAdapter.create).toHaveBeenCalledWith('TaxDocument', expect.objectContaining({
        status: 'Pending'
      }));
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 when required fields are missing', async () => {
      // Arrange
      req.body = {
        name: '2024-1099.pdf'
        // Missing other required fields
      };

      // Act
      await createTaxDocument(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: expect.stringContaining('Missing required fields')
      });
      expect(databaseAdapter.create).not.toHaveBeenCalled();
    });

    it('should return 400 on validation error', async () => {
      // Arrange
      req.body = {
        name: '2024-1099.pdf',
        fileName: '2024-1099.pdf',
        type: '1099',
        taxYear: 2024,
        stakeholderId: 'stakeholder123',
        companyId: 'company123'
      };

      const validationError = new Error('Invalid tax year');
      validationError.name = 'ValidationError';
      databaseAdapter.create.mockRejectedValue(validationError);

      // Act
      await createTaxDocument(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Validation error',
        errors: 'Invalid tax year'
      });
    });

    it('should return 500 on database error', async () => {
      // Arrange
      req.body = {
        name: '2024-1099.pdf',
        fileName: '2024-1099.pdf',
        type: '1099',
        taxYear: 2024,
        stakeholderId: 'stakeholder123',
        companyId: 'company123'
      };

      databaseAdapter.create.mockRejectedValue(new Error('Database error'));

      // Act
      await createTaxDocument(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to create tax document'
      });
    });
  });

  describe('Given admin wants to update a tax document', () => {
    it('should successfully update tax document', async () => {
      // Arrange
      req.params.id = 'doc-to-update';
      req.body = {
        status: 'Ready',
        fileId: 'file-updated',
        size: 75000
      };

      const existingDocument = {
        _id: 'doc-to-update',
        name: '2024-1099.pdf',
        status: 'Pending'
      };

      const updatedDocument = {
        ...existingDocument,
        ...req.body,
        updatedAt: '2024-01-16T10:00:00Z'
      };

      databaseAdapter.findById.mockResolvedValue(existingDocument);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(updatedDocument);

      // Act
      await updateTaxDocument(req, res);

      // Assert
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'TaxDocument',
        'doc-to-update',
        expect.objectContaining({
          status: 'Ready',
          fileId: 'file-updated',
          size: 75000,
          updatedAt: expect.any(String)
        }),
        { new: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        taxDocument: updatedDocument,
        message: 'Tax document updated successfully'
      });
    });

    it('should return 400 for invalid document ID', async () => {
      // Arrange
      req.params.id = '';
      req.body = { status: 'Ready' };

      // Act
      await updateTaxDocument(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid document ID'
      });
      expect(databaseAdapter.findById).not.toHaveBeenCalled();
    });

    it('should return 404 when document not found', async () => {
      // Arrange
      req.params.id = 'non-existent';
      req.body = { status: 'Ready' };

      databaseAdapter.findById.mockResolvedValue(null);

      // Act
      await updateTaxDocument(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Tax document not found'
      });
      expect(databaseAdapter.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should return 500 on database error', async () => {
      // Arrange
      req.params.id = 'doc-error';
      req.body = { status: 'Ready' };

      databaseAdapter.findById.mockResolvedValue({ _id: 'doc-error' });
      databaseAdapter.findByIdAndUpdate.mockRejectedValue(new Error('Database error'));

      // Act
      await updateTaxDocument(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to update tax document'
      });
    });
  });

  describe('Given admin wants to delete a tax document', () => {
    it('should successfully delete tax document and its file', async () => {
      // Arrange
      req.params.id = 'doc-to-delete';

      const mockDocument = {
        _id: 'doc-to-delete',
        name: 'old-doc.pdf',
        fileId: 'file-to-delete',
        stakeholderId: 'user123',
        companyId: 'company123'
      };

      databaseAdapter.findById.mockResolvedValue(mockDocument);
      fileStorageService.deleteFile.mockResolvedValue(true);
      databaseAdapter.findByIdAndDelete.mockResolvedValue(mockDocument);

      // Act
      await deleteTaxDocument(req, res);

      // Assert
      expect(fileStorageService.deleteFile).toHaveBeenCalledWith('file-to-delete');
      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('TaxDocument', 'doc-to-delete');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Tax document deleted successfully'
      });
    });

    it('should delete document even if file deletion fails', async () => {
      // Arrange
      req.params.id = 'doc-with-missing-file';

      const mockDocument = {
        _id: 'doc-with-missing-file',
        name: 'doc.pdf',
        fileId: 'missing-file',
        stakeholderId: 'user123',
        companyId: 'company123'
      };

      databaseAdapter.findById.mockResolvedValue(mockDocument);
      fileStorageService.deleteFile.mockRejectedValue(new Error('File not found'));
      databaseAdapter.findByIdAndDelete.mockResolvedValue(mockDocument);

      // Act
      await deleteTaxDocument(req, res);

      // Assert
      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('TaxDocument', 'doc-with-missing-file');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for invalid document ID', async () => {
      // Arrange
      req.params.id = '';

      // Act
      await deleteTaxDocument(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid document ID'
      });
      expect(databaseAdapter.findById).not.toHaveBeenCalled();
    });

    it('should return 404 when document not found', async () => {
      // Arrange
      req.params.id = 'non-existent';

      databaseAdapter.findById.mockResolvedValue(null);

      // Act
      await deleteTaxDocument(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Tax document not found'
      });
      expect(databaseAdapter.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it('should return 500 on database error', async () => {
      // Arrange
      req.params.id = 'doc-error';

      const mockDocument = {
        _id: 'doc-error',
        name: 'doc.pdf',
        stakeholderId: 'user123',
        companyId: 'company123'
      };

      databaseAdapter.findById.mockResolvedValue(mockDocument);
      databaseAdapter.findByIdAndDelete.mockRejectedValue(new Error('Database error'));

      // Act
      await deleteTaxDocument(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to delete tax document'
      });
    });
  });
});

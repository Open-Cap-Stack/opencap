/**
 * DocumentFolder Model Test Suite
 *
 * Tests for DocumentFolder model migrated to ZeroDB
 * Covers folder CRUD operations, hierarchy validation, and path generation
 *
 * Issue #188: Add Document Folder Management Endpoints
 */

const DocumentFolder = require('../../../models/DocumentFolder');
const zerodbService = require('../../../services/zerodbService');

// Mock ZeroDB service
jest.mock('../../../services/zerodbService');

describe('DocumentFolder Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema Definition', () => {
    it('should have correct tableName', () => {
      expect(DocumentFolder.tableName).toBe('document_folders');
    });

    it('should have required schema fields', () => {
      const schema = DocumentFolder.schema;
      expect(schema).toHaveProperty('folderId');
      expect(schema).toHaveProperty('name');
      expect(schema).toHaveProperty('parentId');
      expect(schema).toHaveProperty('path');
      expect(schema).toHaveProperty('ownerCompany');
      expect(schema).toHaveProperty('createdBy');
      expect(schema).toHaveProperty('createdAt');
      expect(schema).toHaveProperty('updatedAt');
    });

    it('should have correct field types', () => {
      const schema = DocumentFolder.schema;
      expect(schema.folderId.type).toBe('string');
      expect(schema.name.type).toBe('string');
      expect(schema.name.required).toBe(true);
      expect(schema.parentId.type).toBe('string');
      expect(schema.path.type).toBe('string');
    });
  });

  describe('create', () => {
    it('should create a folder with auto-generated folderId', async () => {
      const folderData = {
        name: 'Legal Documents',
        ownerCompany: 'company-123',
        createdBy: 'user-456'
      };

      const mockCreatedFolder = {
        _id: 'zerodb-id-1',
        folderId: expect.any(String),
        ...folderData,
        path: '/Legal Documents',
        level: 0,
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      };

      zerodbService.insertRow = jest.fn().mockResolvedValue({ rows: [mockCreatedFolder] });

      const result = await DocumentFolder.create(folderData);

      expect(result).toMatchObject({
        name: 'Legal Documents',
        ownerCompany: 'company-123',
        createdBy: 'user-456'
      });
      expect(result.folderId).toBeDefined();
      expect(result.path).toBe('/Legal Documents');
      expect(zerodbService.insertRow).toHaveBeenCalledWith('document_folders', expect.any(Object));
    });

    it('should create a nested folder with parent reference', async () => {
      const parentFolder = {
        folderId: 'parent-folder-123',
        name: 'Legal',
        path: '/Legal',
        level: 0
      };

      const folderData = {
        name: 'Q1 2026',
        parentId: 'parent-folder-123',
        ownerCompany: 'company-123',
        createdBy: 'user-456'
      };

      // Mock parent lookup
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [parentFolder] });

      const mockCreatedFolder = {
        _id: 'zerodb-id-2',
        folderId: expect.any(String),
        ...folderData,
        path: '/Legal/Q1 2026',
        level: 1,
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      };

      zerodbService.insertRow = jest.fn().mockResolvedValue({ rows: [mockCreatedFolder] });

      const result = await DocumentFolder.create(folderData);

      expect(result.path).toBe('/Legal/Q1 2026');
      expect(result.level).toBe(1);
      expect(result.parentId).toBe('parent-folder-123');
    });

    it('should reject folder with name exceeding max length', async () => {
      const folderData = {
        name: 'a'.repeat(256), // Exceeds max length of 255
        ownerCompany: 'company-123',
        createdBy: 'user-456'
      };

      await expect(DocumentFolder.create(folderData)).rejects.toThrow('Folder name must be between 1 and 255 characters');
    });

    it('should reject folder with empty name', async () => {
      const folderData = {
        name: '',
        ownerCompany: 'company-123',
        createdBy: 'user-456'
      };

      await expect(DocumentFolder.create(folderData)).rejects.toThrow('Folder name is required');
    });

    it('should reject folder with invalid characters in name', async () => {
      const folderData = {
        name: 'Legal/Documents',
        ownerCompany: 'company-123',
        createdBy: 'user-456'
      };

      await expect(DocumentFolder.create(folderData)).rejects.toThrow('Folder name cannot contain special characters: / \\ : * ? " < > |');
    });
  });

  describe('findByFolderId', () => {
    it('should find folder by folderId', async () => {
      const mockFolder = {
        _id: 'zerodb-id-1',
        folderId: 'folder-123',
        name: 'Legal Documents',
        path: '/Legal Documents'
      };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [mockFolder] });

      const result = await DocumentFolder.findByFolderId('folder-123');

      expect(result).toEqual(mockFolder);
      expect(zerodbService.queryTable).toHaveBeenCalledWith('document_folders', {
        filter: { folderId: 'folder-123' },
        limit: 1
      });
    });

    it('should return null if folder not found', async () => {
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });

      const result = await DocumentFolder.findByFolderId('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByParentId', () => {
    it('should find all child folders of a parent', async () => {
      const mockFolders = [
        { folderId: 'child-1', name: 'Q1 2026', parentId: 'parent-123' },
        { folderId: 'child-2', name: 'Q2 2026', parentId: 'parent-123' }
      ];

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: mockFolders });

      const result = await DocumentFolder.findByParentId('parent-123');

      expect(result).toEqual(mockFolders);
      expect(result).toHaveLength(2);
      expect(zerodbService.queryTable).toHaveBeenCalledWith('document_folders', {
        filter: { parentId: 'parent-123' }
      });
    });

    it('should return empty array if no children found', async () => {
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });

      const result = await DocumentFolder.findByParentId('folder-without-children');

      expect(result).toEqual([]);
    });
  });

  describe('hasChildren', () => {
    it('should return true if folder has children', async () => {
      zerodbService.countRows = jest.fn().mockResolvedValue(2);

      const result = await DocumentFolder.hasChildren('folder-123');

      expect(result).toBe(true);
      expect(zerodbService.countRows).toHaveBeenCalledWith('document_folders', { parentId: 'folder-123' });
    });

    it('should return false if folder has no children', async () => {
      zerodbService.countRows = jest.fn().mockResolvedValue(0);

      const result = await DocumentFolder.hasChildren('folder-123');

      expect(result).toBe(false);
    });
  });

  describe('hasDocuments', () => {
    it('should return true if folder contains documents', async () => {
      zerodbService.countRows = jest.fn().mockResolvedValue(5);

      const result = await DocumentFolder.hasDocuments('folder-123');

      expect(result).toBe(true);
      expect(zerodbService.countRows).toHaveBeenCalledWith('documents', { folderId: 'folder-123' });
    });

    it('should return false if folder has no documents', async () => {
      zerodbService.countRows = jest.fn().mockResolvedValue(0);

      const result = await DocumentFolder.hasDocuments('folder-123');

      expect(result).toBe(false);
    });
  });

  describe('getFullPath', () => {
    it('should return correct path for root folder', () => {
      const folder = {
        name: 'Legal',
        path: '/Legal',
        level: 0
      };

      const result = DocumentFolder.getFullPath(folder);

      expect(result).toBe('/Legal');
    });

    it('should return correct path for nested folder', () => {
      const folder = {
        name: 'Q1 2026',
        path: '/Legal/Q1 2026',
        level: 1
      };

      const result = DocumentFolder.getFullPath(folder);

      expect(result).toBe('/Legal/Q1 2026');
    });
  });

  describe('getBreadcrumbs', () => {
    it('should generate breadcrumbs for root folder', async () => {
      const folder = {
        folderId: 'folder-123',
        name: 'Legal',
        path: '/Legal',
        parentId: null,
        level: 0
      };

      const breadcrumbs = await DocumentFolder.getBreadcrumbs(folder);

      expect(breadcrumbs).toEqual([
        { folderId: 'folder-123', name: 'Legal', path: '/Legal' }
      ]);
    });

    it('should generate breadcrumbs for nested folder', async () => {
      const parentFolder = {
        folderId: 'parent-123',
        name: 'Legal',
        path: '/Legal',
        parentId: null,
        level: 0
      };

      const folder = {
        folderId: 'folder-456',
        name: 'Q1 2026',
        path: '/Legal/Q1 2026',
        parentId: 'parent-123',
        level: 1
      };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [parentFolder] });

      const breadcrumbs = await DocumentFolder.getBreadcrumbs(folder);

      expect(breadcrumbs).toEqual([
        { folderId: 'parent-123', name: 'Legal', path: '/Legal' },
        { folderId: 'folder-456', name: 'Q1 2026', path: '/Legal/Q1 2026' }
      ]);
    });
  });

  describe('validateHierarchy', () => {
    it('should detect circular reference - direct parent', async () => {
      const folder = { folderId: 'folder-123' };
      const parentId = 'folder-123';

      const isValid = await DocumentFolder.validateHierarchy(parentId, folder.folderId);

      expect(isValid).toBe(false);
    });

    it('should detect circular reference - indirect parent', async () => {
      const folder = { folderId: 'folder-123' };
      const parentFolder = { folderId: 'parent-456', parentId: 'folder-123' };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [parentFolder] });

      const isValid = await DocumentFolder.validateHierarchy('parent-456', 'folder-123');

      expect(isValid).toBe(false);
    });

    it('should allow valid hierarchy', async () => {
      const parentFolder = { folderId: 'parent-456', parentId: null };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [parentFolder] });

      const isValid = await DocumentFolder.validateHierarchy('parent-456', 'folder-123');

      expect(isValid).toBe(true);
    });
  });

  describe('delete validation', () => {
    it('should prevent deletion of folder with children', async () => {
      zerodbService.countRows = jest.fn()
        .mockResolvedValueOnce(2) // Has children
        .mockResolvedValueOnce(0); // No documents

      await expect(DocumentFolder.validateDelete('folder-123')).rejects.toThrow('Cannot delete folder with subfolders');
    });

    it('should prevent deletion of folder with documents', async () => {
      zerodbService.countRows = jest.fn()
        .mockResolvedValueOnce(0) // No children
        .mockResolvedValueOnce(5); // Has documents

      await expect(DocumentFolder.validateDelete('folder-123')).rejects.toThrow('Cannot delete folder containing documents');
    });

    it('should allow deletion of empty folder', async () => {
      zerodbService.countRows = jest.fn()
        .mockResolvedValueOnce(0) // No children
        .mockResolvedValueOnce(0); // No documents

      await expect(DocumentFolder.validateDelete('folder-123')).resolves.toBeUndefined();
    });
  });
});

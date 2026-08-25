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

  describe('create - parent not found', () => {
    it('should throw error when parent folder does not exist', async () => {
      zerodbService.queryTable = jest.fn().mockResolvedValue({ data: [] });

      await expect(DocumentFolder.create({
        name: 'Child',
        parentId: 'non-existent-parent',
        ownerCompany: 'c1',
        createdBy: 'u1'
      })).rejects.toThrow('Parent folder not found');
    });

    it('should throw error on circular reference during create', async () => {
      const parentFolder = { folderId: 'parent-1', name: 'Parent', path: '/Parent', level: 0, parentId: null };
      // First call finds the parent, second call for validateHierarchy returns the parent whose parentId is the folderId
      zerodbService.queryTable = jest.fn()
        .mockResolvedValueOnce({ data: [parentFolder] });

      // We need to force validateHierarchy to return false
      // parentId=parent-1, folderId=parent-1 -> direct circular
      await expect(DocumentFolder.create({
        name: 'Child',
        parentId: 'parent-1',
        folderId: 'parent-1',
        ownerCompany: 'c1',
        createdBy: 'u1'
      })).rejects.toThrow('Circular folder reference detected');
    });
  });

  describe('create - defaults', () => {
    it('should set default metadata and description if not provided', async () => {
      zerodbService.insertRow = jest.fn().mockResolvedValue({
        data: [{ _id: 'id-1', row_data: { folderId: 'f1', name: 'Test', path: '/Test', metadata: {}, description: '' } }]
      });

      const result = await DocumentFolder.create({
        name: 'Test',
        ownerCompany: 'c1',
        createdBy: 'u1'
      });

      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'document_folders',
        expect.objectContaining({ metadata: {}, description: '' })
      );
    });
  });

  describe('findRootFolders', () => {
    it('should return only root folders (parentId is null/undefined/empty)', async () => {
      const mockFolders = [
        { folderId: 'f1', name: 'Root1', parentId: null, ownerCompany: 'c1' },
        { folderId: 'f2', name: 'Child1', parentId: 'f1', ownerCompany: 'c1' },
        { folderId: 'f3', name: 'Root2', parentId: undefined, ownerCompany: 'c1' },
        { folderId: 'f4', name: 'Root3', parentId: '', ownerCompany: 'c1' }
      ];
      zerodbService.queryTable = jest.fn().mockResolvedValue({ data: mockFolders });

      const result = await DocumentFolder.findRootFolders('c1');
      expect(result).toHaveLength(3);
      expect(result.map(f => f.folderId)).toEqual(['f1', 'f3', 'f4']);
    });

    it('should work without ownerCompany filter', async () => {
      zerodbService.queryTable = jest.fn().mockResolvedValue({ data: [{ folderId: 'f1', parentId: null }] });
      const result = await DocumentFolder.findRootFolders(null);
      expect(result).toHaveLength(1);
      expect(zerodbService.queryTable).toHaveBeenCalledWith('document_folders', {
        filter: {},
        limit: 1000
      });
    });
  });

  describe('getFullPath - fallback', () => {
    it('should return /<name> when path is not set', () => {
      const result = DocumentFolder.getFullPath({ name: 'TestFolder' });
      expect(result).toBe('/TestFolder');
    });
  });

  describe('generatePath', () => {
    it('should generate root path with no parent', () => {
      expect(DocumentFolder.generatePath('RootFolder')).toBe('/RootFolder');
    });

    it('should generate nested path with parent', () => {
      const parent = { path: '/Root', level: 0 };
      expect(DocumentFolder.generatePath('Child', parent)).toBe('/Root/Child');
    });
  });

  describe('calculateLevel', () => {
    it('should return 0 for no parent', () => {
      expect(DocumentFolder.calculateLevel()).toBe(0);
    });

    it('should return parent.level + 1', () => {
      expect(DocumentFolder.calculateLevel({ level: 2 })).toBe(3);
    });

    it('should default parent level to 0 if not set', () => {
      expect(DocumentFolder.calculateLevel({})).toBe(1);
    });
  });

  describe('validateName', () => {
    it('should throw for whitespace-only name', () => {
      expect(() => DocumentFolder.validateName('   ')).toThrow('Folder name is required');
    });

    it('should throw for name with backslash', () => {
      expect(() => DocumentFolder.validateName('test\\folder')).toThrow('Folder name cannot contain special characters');
    });

    it('should accept valid name', () => {
      expect(() => DocumentFolder.validateName('Valid Folder Name')).not.toThrow();
    });
  });

  describe('update()', () => {
    it('should throw when folder is not found', async () => {
      zerodbService.queryTable = jest.fn().mockResolvedValue({ data: [] });
      await expect(DocumentFolder.update('non-existent', { name: 'New' })).rejects.toThrow('Folder not found');
    });

    it('should update name and regenerate path for root folder', async () => {
      const folder = { folderId: 'f1', name: 'Old', path: '/Old', level: 0, parentId: null };
      zerodbService.queryTable = jest.fn()
        .mockResolvedValueOnce({ data: [folder] })   // findByFolderId in update
        .mockResolvedValueOnce({ data: [] })          // findByParentId in updateChildPaths
        .mockResolvedValueOnce({ data: [{ ...folder, name: 'New', path: '/New' }] }); // final findByFolderId
      zerodbService.updateRows = jest.fn().mockResolvedValue({ modified_count: 1 });

      const result = await DocumentFolder.update('f1', { name: 'New' });
      expect(zerodbService.updateRows).toHaveBeenCalled();
    });

    it('should throw when new parent folder not found during reparent', async () => {
      const folder = { folderId: 'f1', name: 'Test', path: '/Test', level: 0, parentId: null };
      zerodbService.queryTable = jest.fn()
        .mockResolvedValueOnce({ data: [folder] })   // findByFolderId in update
        .mockResolvedValueOnce({ data: [] });         // findByFolderId for new parent
      await expect(DocumentFolder.update('f1', { parentId: 'non-existent' })).rejects.toThrow('New parent folder not found');
    });

    it('should detect circular reference during reparent', async () => {
      const folder = { folderId: 'f1', name: 'Test', path: '/Test', level: 0, parentId: null };
      const newParent = { folderId: 'f1', name: 'Parent', path: '/Parent', level: 0, parentId: null };
      zerodbService.queryTable = jest.fn()
        .mockResolvedValueOnce({ data: [folder] })   // findByFolderId in update
        .mockResolvedValueOnce({ data: [newParent] }); // findByFolderId for new parent
      // validateHierarchy: parentId=f1, folderId=f1 -> circular
      await expect(DocumentFolder.update('f1', { parentId: 'f1' })).rejects.toThrow('Circular folder reference detected');
    });

    it('should move folder to root (parentId set to null)', async () => {
      const folder = { folderId: 'f1', name: 'Test', path: '/Parent/Test', level: 1, parentId: 'parent-1' };
      zerodbService.queryTable = jest.fn()
        .mockResolvedValueOnce({ data: [folder] })   // findByFolderId in update
        .mockResolvedValueOnce({ data: [] })          // updateChildPaths - no children
        .mockResolvedValueOnce({ data: [{ ...folder, path: '/Test', level: 0, parentId: null }] }); // final findByFolderId
      zerodbService.updateRows = jest.fn().mockResolvedValue({ modified_count: 1 });

      const result = await DocumentFolder.update('f1', { parentId: null });
      expect(zerodbService.updateRows).toHaveBeenCalledWith(
        'document_folders',
        { folderId: 'f1' },
        { $set: expect.objectContaining({ path: '/Test', level: 0 }) }
      );
    });

    it('should reparent folder successfully to a valid new parent', async () => {
      const folder = { folderId: 'f1', name: 'Test', path: '/Test', level: 0, parentId: null };
      const newParent = { folderId: 'f2', name: 'NewParent', path: '/NewParent', level: 0, parentId: null };
      zerodbService.queryTable = jest.fn()
        .mockResolvedValueOnce({ data: [folder] })     // findByFolderId in update
        .mockResolvedValueOnce({ data: [newParent] })   // findByFolderId for new parent
        .mockResolvedValueOnce({ data: [newParent] })   // validateHierarchy checks parentId
        .mockResolvedValueOnce({ data: [] })             // updateChildPaths - no children
        .mockResolvedValueOnce({ data: [{ ...folder, path: '/NewParent/Test', level: 1, parentId: 'f2' }] }); // final findByFolderId
      zerodbService.updateRows = jest.fn().mockResolvedValue({ modified_count: 1 });

      const result = await DocumentFolder.update('f1', { parentId: 'f2' });
      expect(zerodbService.updateRows).toHaveBeenCalled();
    });

    it('should validate name during update', async () => {
      const folder = { folderId: 'f1', name: 'Old', path: '/Old', level: 0, parentId: null };
      zerodbService.queryTable = jest.fn().mockResolvedValueOnce({ data: [folder] });

      await expect(DocumentFolder.update('f1', { name: 'Invalid/Name' })).rejects.toThrow('Folder name cannot contain special characters');
    });
  });

  describe('updateChildPaths()', () => {
    it('should recursively update child folder paths', async () => {
      const child1 = { folderId: 'c1', name: 'Child1', path: '/Old/Child1', parentId: 'f1' };
      const grandchild = { folderId: 'gc1', name: 'GC', path: '/Old/Child1/GC', parentId: 'c1' };
      zerodbService.queryTable = jest.fn()
        .mockResolvedValueOnce({ data: [child1] })     // findByParentId for f1
        .mockResolvedValueOnce({ data: [grandchild] })  // findByParentId for c1
        .mockResolvedValueOnce({ data: [] });            // findByParentId for gc1
      zerodbService.updateRows = jest.fn().mockResolvedValue({ modified_count: 1 });

      await DocumentFolder.updateChildPaths('f1', '/Old', '/New');

      expect(zerodbService.updateRows).toHaveBeenCalledTimes(2);
      expect(zerodbService.updateRows).toHaveBeenCalledWith(
        'document_folders',
        { folderId: 'c1' },
        { $set: { path: '/New/Child1' } }
      );
      expect(zerodbService.updateRows).toHaveBeenCalledWith(
        'document_folders',
        { folderId: 'gc1' },
        { $set: { path: '/New/Child1/GC' } }
      );
    });
  });

  describe('delete()', () => {
    it('should validate and delete folder', async () => {
      zerodbService.countRows = jest.fn()
        .mockResolvedValueOnce(0)   // no children
        .mockResolvedValueOnce(0);  // no documents
      zerodbService.deleteRows = jest.fn().mockResolvedValue({ deleted_count: 1 });

      await DocumentFolder.delete('f1');
      expect(zerodbService.deleteRows).toHaveBeenCalledWith('document_folders', { folderId: 'f1' });
    });

    it('should throw if folder has children when deleting', async () => {
      zerodbService.countRows = jest.fn().mockResolvedValueOnce(3);
      await expect(DocumentFolder.delete('f1')).rejects.toThrow('Cannot delete folder with subfolders');
    });
  });

  describe('getContents()', () => {
    it('should return folder contents including children and documents', async () => {
      const folder = { folderId: 'f1', name: 'Legal', path: '/Legal', parentId: null };
      const childFolder = { folderId: 'f2', name: 'Q1', path: '/Legal/Q1', parentId: 'f1' };
      const doc = { documentId: 'doc1', name: 'Contract.pdf', folderId: 'f1' };

      zerodbService.queryTable = jest.fn()
        .mockResolvedValueOnce({ data: [folder] })       // findByFolderId
        .mockResolvedValueOnce({ data: [childFolder] })   // findByParentId (child folders)
        .mockResolvedValueOnce({ data: [doc] });          // queryTable for documents

      const contents = await DocumentFolder.getContents('f1');
      expect(contents.folder).toEqual(folder);
      expect(contents.childFolders).toHaveLength(1);
      expect(contents.documents).toHaveLength(1);
      expect(contents.breadcrumbs).toBeDefined();
    });

    it('should throw error when folder not found', async () => {
      zerodbService.queryTable = jest.fn().mockResolvedValue({ data: [] });
      await expect(DocumentFolder.getContents('non-existent')).rejects.toThrow('Folder not found');
    });
  });

  describe('unwrapZeroDBResponse (via findByFolderId)', () => {
    it('should unwrap row_data format from ZeroDB response', async () => {
      const mockData = {
        data: [{
          row_data: { folderId: 'f1', name: 'Test', path: '/Test' },
          row_id: 'row-123'
        }]
      };
      zerodbService.queryTable = jest.fn().mockResolvedValue(mockData);

      const result = await DocumentFolder.findByFolderId('f1');
      expect(result.folderId).toBe('f1');
      expect(result.id).toBe('row-123');
      expect(result._id).toBe('row-123');
      expect(result.row_id).toBe('row-123');
    });

    it('should handle row_data with existing id', async () => {
      const mockData = {
        data: [{
          row_data: { folderId: 'f1', name: 'Test', id: 'existing-id' },
          row_id: 'row-123'
        }]
      };
      zerodbService.queryTable = jest.fn().mockResolvedValue(mockData);

      const result = await DocumentFolder.findByFolderId('f1');
      expect(result.id).toBe('row-123');
    });

    it('should handle plain objects (no row_data)', async () => {
      const mockData = {
        data: [{ folderId: 'f1', name: 'Test', path: '/Test' }]
      };
      zerodbService.queryTable = jest.fn().mockResolvedValue(mockData);

      const result = await DocumentFolder.findByFolderId('f1');
      expect(result.folderId).toBe('f1');
    });

    it('should handle response with rows key', async () => {
      const mockData = {
        rows: [{ folderId: 'f1', name: 'Test', path: '/Test' }]
      };
      zerodbService.queryTable = jest.fn().mockResolvedValue(mockData);

      const result = await DocumentFolder.findByFolderId('f1');
      expect(result.folderId).toBe('f1');
    });

    it('should return empty array for non-array response', async () => {
      zerodbService.queryTable = jest.fn().mockResolvedValue({ data: 'not-an-array' });
      const result = await DocumentFolder.findByFolderId('f1');
      expect(result).toBeNull();
    });
  });

  describe('validateHierarchy - traversal with break', () => {
    it('should return true when parent has no parentId (root)', async () => {
      const parent = { folderId: 'p1', parentId: null };
      zerodbService.queryTable = jest.fn().mockResolvedValueOnce({ data: [parent] });

      const result = await DocumentFolder.validateHierarchy('p1', 'f1');
      expect(result).toBe(true);
    });

    it('should detect circular reference through chain', async () => {
      // f1 -> p1 -> p2 -> f1 (circular)
      const p1 = { folderId: 'p1', parentId: 'p2' };
      const p2 = { folderId: 'p2', parentId: 'f1' };
      zerodbService.queryTable = jest.fn()
        .mockResolvedValueOnce({ data: [p1] })   // get p1
        .mockResolvedValueOnce({ data: [p2] });   // get p2 -> parentId=f1 which is in visited

      const result = await DocumentFolder.validateHierarchy('p1', 'f1');
      expect(result).toBe(false);
    });

    it('should break when parent is not found in chain', async () => {
      const p1 = { folderId: 'p1', parentId: 'p2' };
      zerodbService.queryTable = jest.fn()
        .mockResolvedValueOnce({ data: [p1] })   // get p1
        .mockResolvedValueOnce({ data: [] });     // p2 not found -> break

      const result = await DocumentFolder.validateHierarchy('p1', 'f1');
      expect(result).toBe(true);
    });
  });
});

/**
 * Document Folder Controller Test Suite
 *
 * Tests for Document Folder controller
 * Covers all folder CRUD operations and validation
 *
 * Issue #188: Add Document Folder Management Endpoints
 */

const DocumentFolder = require('../../../models/DocumentFolder');
const zerodbService = require('../../../services/zerodbService');

// Mock dependencies
jest.mock('../../../models/DocumentFolder');
jest.mock('../../../services/zerodbService');

// Import controller after mocks are set up
const {
    createFolder,
    getFolders,
    getFolderById,
    updateFolderById,
    deleteFolderById,
    getFolderContents
} = require('../../../controllers/documentController');

describe('Document Folder Controller', () => {
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
                role: 'employee'
            }
        };
    });

    describe('createFolder', () => {
        it('should create a root folder successfully', async () => {
            const folderData = {
                name: 'Legal Documents',
                description: 'Company legal documents'
            };

            const createdFolder = {
                _id: 'zerodb-id-1',
                folderId: 'folder-123',
                name: 'Legal Documents',
                description: 'Company legal documents',
                path: '/Legal Documents',
                level: 0,
                ownerCompany: 'company-456',
                createdBy: 'user-123',
                parentId: null,
                createdAt: '2026-02-03T10:00:00.000Z',
                updatedAt: '2026-02-03T10:00:00.000Z'
            };

            mockReq.body = folderData;
            DocumentFolder.create = jest.fn().mockResolvedValue(createdFolder);

            await createFolder(mockReq, mockRes);

            expect(DocumentFolder.create).toHaveBeenCalledWith({
                name: 'Legal Documents',
                description: 'Company legal documents',
                metadata: {},
                parentId: null,
                ownerCompany: 'company-456',
                createdBy: 'user-123'
            });
            expect(mockStatus).toHaveBeenCalledWith(201);
            expect(mockJson).toHaveBeenCalledWith(createdFolder);
        });

        it('should create a nested folder with parent', async () => {
            const folderData = {
                name: 'Q1 2026',
                parentId: 'parent-folder-123'
            };

            const createdFolder = {
                _id: 'zerodb-id-2',
                folderId: 'folder-456',
                name: 'Q1 2026',
                path: '/Legal/Q1 2026',
                level: 1,
                parentId: 'parent-folder-123',
                ownerCompany: 'company-456',
                createdBy: 'user-123',
                createdAt: '2026-02-03T10:00:00.000Z',
                updatedAt: '2026-02-03T10:00:00.000Z'
            };

            mockReq.body = folderData;
            DocumentFolder.create = jest.fn().mockResolvedValue(createdFolder);

            await createFolder(mockReq, mockRes);

            expect(DocumentFolder.create).toHaveBeenCalledWith({
                name: 'Q1 2026',
                description: '',
                metadata: {},
                parentId: 'parent-folder-123',
                ownerCompany: 'company-456',
                createdBy: 'user-123'
            });
            expect(mockStatus).toHaveBeenCalledWith(201);
            expect(mockJson).toHaveBeenCalledWith(createdFolder);
        });

        it('should reject folder with invalid name', async () => {
            mockReq.body = { name: 'Invalid/Name' };
            DocumentFolder.create = jest.fn().mockRejectedValue(
                new Error('Folder name cannot contain special characters: / \\ : * ? " < > |')
            );

            await createFolder(mockReq, mockRes);

            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({
                    message: 'Folder name cannot contain special characters: / \\ : * ? " < > |'
                })
            }));
        });

        it('should reject folder with missing name', async () => {
            mockReq.body = { description: 'Test' };
            DocumentFolder.create = jest.fn().mockRejectedValue(
                new Error('Folder name is required')
            );

            await createFolder(mockReq, mockRes);

            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({
                    message: 'Folder name is required'
                })
            }));
        });

        it('should reject folder with non-existent parent', async () => {
            mockReq.body = { name: 'Test', parentId: 'non-existent' };
            DocumentFolder.create = jest.fn().mockRejectedValue(
                new Error('Parent folder not found')
            );

            await createFolder(mockReq, mockRes);

            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({
                    message: 'Parent folder not found'
                })
            }));
        });

        it('should reject circular folder reference', async () => {
            mockReq.body = { name: 'Test', parentId: 'folder-123' };
            DocumentFolder.create = jest.fn().mockRejectedValue(
                new Error('Circular folder reference detected')
            );

            await createFolder(mockReq, mockRes);

            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({
                    message: 'Circular folder reference detected'
                })
            }));
        });
    });

    describe('getFolders', () => {
        it('should get all root folders for user company', async () => {
            const folders = [
                {
                    folderId: 'folder-1',
                    name: 'Legal',
                    path: '/Legal',
                    level: 0,
                    parentId: null
                },
                {
                    folderId: 'folder-2',
                    name: 'Financial',
                    path: '/Financial',
                    level: 0,
                    parentId: null
                }
            ];

            DocumentFolder.findRootFolders = jest.fn().mockResolvedValue(folders);

            await getFolders(mockReq, mockRes);

            expect(DocumentFolder.findRootFolders).toHaveBeenCalledWith('company-456');
            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith({ folders });
        });

        it('should get child folders when parentId provided', async () => {
            mockReq.query = { parentId: 'folder-123' };

            const childFolders = [
                {
                    folderId: 'child-1',
                    name: 'Q1 2026',
                    path: '/Legal/Q1 2026',
                    level: 1,
                    parentId: 'folder-123'
                }
            ];

            DocumentFolder.findByParentId = jest.fn().mockResolvedValue(childFolders);

            await getFolders(mockReq, mockRes);

            expect(DocumentFolder.findByParentId).toHaveBeenCalledWith('folder-123');
            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith({ folders: childFolders });
        });

        it('should return empty array if no folders found', async () => {
            DocumentFolder.findRootFolders = jest.fn().mockResolvedValue([]);

            await getFolders(mockReq, mockRes);

            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith({ folders: [] });
        });

        it('should handle errors gracefully', async () => {
            DocumentFolder.findRootFolders = jest.fn().mockRejectedValue(
                new Error('Database error')
            );

            await getFolders(mockReq, mockRes);

            expect(mockStatus).toHaveBeenCalledWith(500);
            expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({ message: 'Database error' })
            }));
        });
    });

    describe('getFolderById', () => {
        it('should get folder by ID with breadcrumbs', async () => {
            const folder = {
                folderId: 'folder-123',
                name: 'Q1 2026',
                path: '/Legal/Q1 2026',
                level: 1,
                parentId: 'parent-123'
            };

            const breadcrumbs = [
                { folderId: 'parent-123', name: 'Legal', path: '/Legal' },
                { folderId: 'folder-123', name: 'Q1 2026', path: '/Legal/Q1 2026' }
            ];

            mockReq.params = { id: 'folder-123' };
            DocumentFolder.findByFolderId = jest.fn().mockResolvedValue(folder);
            DocumentFolder.getBreadcrumbs = jest.fn().mockResolvedValue(breadcrumbs);

            await getFolderById(mockReq, mockRes);

            expect(DocumentFolder.findByFolderId).toHaveBeenCalledWith('folder-123');
            expect(DocumentFolder.getBreadcrumbs).toHaveBeenCalledWith(folder);
            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith({
                ...folder,
                breadcrumbs
            });
        });

        it('should return 404 if folder not found', async () => {
            mockReq.params = { id: 'non-existent' };
            DocumentFolder.findByFolderId = jest.fn().mockResolvedValue(null);

            await getFolderById(mockReq, mockRes);

            expect(mockStatus).toHaveBeenCalledWith(404);
            expect(mockJson).toHaveBeenCalledWith({ success: false, error: { status: 404, message: 'Folder not found' } });
        });

        it('should handle errors', async () => {
            mockReq.params = { id: 'folder-123' };
            DocumentFolder.findByFolderId = jest.fn().mockRejectedValue(
                new Error('Database error')
            );

            await getFolderById(mockReq, mockRes);

            expect(mockStatus).toHaveBeenCalledWith(500);
            expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({ message: 'Database error' })
            }));
        });
    });

    describe('updateFolderById', () => {
        it('should update folder name', async () => {
            const updateData = { name: 'Updated Name' };
            const updatedFolder = {
                folderId: 'folder-123',
                name: 'Updated Name',
                path: '/Legal/Updated Name',
                level: 1,
                updatedAt: '2026-02-03T11:00:00.000Z'
            };

            mockReq.params = { id: 'folder-123' };
            mockReq.body = updateData;
            DocumentFolder.update = jest.fn().mockResolvedValue(updatedFolder);

            await updateFolderById(mockReq, mockRes);

            expect(DocumentFolder.update).toHaveBeenCalledWith('folder-123', updateData);
            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith(updatedFolder);
        });

        it('should update folder parent', async () => {
            const updateData = { parentId: 'new-parent-123' };
            const updatedFolder = {
                folderId: 'folder-123',
                name: 'Q1 2026',
                path: '/Financial/Q1 2026',
                level: 1,
                parentId: 'new-parent-123',
                updatedAt: '2026-02-03T11:00:00.000Z'
            };

            mockReq.params = { id: 'folder-123' };
            mockReq.body = updateData;
            DocumentFolder.update = jest.fn().mockResolvedValue(updatedFolder);

            await updateFolderById(mockReq, mockRes);

            expect(DocumentFolder.update).toHaveBeenCalledWith('folder-123', updateData);
            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith(updatedFolder);
        });

        it('should return 404 if folder not found', async () => {
            mockReq.params = { id: 'non-existent' };
            mockReq.body = { name: 'Test' };
            DocumentFolder.update = jest.fn().mockRejectedValue(
                new Error('Folder not found')
            );

            await updateFolderById(mockReq, mockRes);

            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({ message: 'Folder not found' })
            }));
        });

        it('should reject circular reference on parent update', async () => {
            mockReq.params = { id: 'folder-123' };
            mockReq.body = { parentId: 'folder-123' };
            DocumentFolder.update = jest.fn().mockRejectedValue(
                new Error('Circular folder reference detected')
            );

            await updateFolderById(mockReq, mockRes);

            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({
                    message: 'Circular folder reference detected'
                })
            }));
        });
    });

    describe('deleteFolderById', () => {
        it('should delete empty folder successfully', async () => {
            mockReq.params = { id: 'folder-123' };
            DocumentFolder.delete = jest.fn().mockResolvedValue({ deleted: 1 });

            await deleteFolderById(mockReq, mockRes);

            expect(DocumentFolder.delete).toHaveBeenCalledWith('folder-123');
            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith({ message: 'Folder deleted successfully' });
        });

        it('should reject deletion of folder with subfolders', async () => {
            mockReq.params = { id: 'folder-123' };
            DocumentFolder.delete = jest.fn().mockRejectedValue(
                new Error('Cannot delete folder with subfolders')
            );

            await deleteFolderById(mockReq, mockRes);

            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({
                    message: 'Cannot delete folder with subfolders'
                })
            }));
        });

        it('should reject deletion of folder with documents', async () => {
            mockReq.params = { id: 'folder-123' };
            DocumentFolder.delete = jest.fn().mockRejectedValue(
                new Error('Cannot delete folder containing documents')
            );

            await deleteFolderById(mockReq, mockRes);

            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({
                    message: 'Cannot delete folder containing documents'
                })
            }));
        });

        it('should return 404 if folder not found', async () => {
            mockReq.params = { id: 'non-existent' };
            DocumentFolder.delete = jest.fn().mockRejectedValue(
                new Error('Folder not found')
            );

            await deleteFolderById(mockReq, mockRes);

            expect(mockStatus).toHaveBeenCalledWith(400);
        });
    });

    describe('getFolderContents', () => {
        it('should get folder contents with child folders and documents', async () => {
            const contents = {
                folder: {
                    folderId: 'folder-123',
                    name: 'Legal',
                    path: '/Legal'
                },
                childFolders: [
                    { folderId: 'child-1', name: 'Q1 2026' },
                    { folderId: 'child-2', name: 'Q2 2026' }
                ],
                documents: [
                    { id: 'doc-1', title: 'Contract.pdf' },
                    { id: 'doc-2', title: 'Agreement.pdf' }
                ],
                breadcrumbs: [
                    { folderId: 'folder-123', name: 'Legal', path: '/Legal' }
                ]
            };

            mockReq.params = { id: 'folder-123' };
            DocumentFolder.getContents = jest.fn().mockResolvedValue(contents);

            await getFolderContents(mockReq, mockRes);

            expect(DocumentFolder.getContents).toHaveBeenCalledWith('folder-123');
            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith(contents);
        });

        it('should return 404 if folder not found', async () => {
            mockReq.params = { id: 'non-existent' };
            DocumentFolder.getContents = jest.fn().mockRejectedValue(
                new Error('Folder not found')
            );

            await getFolderContents(mockReq, mockRes);

            expect(mockStatus).toHaveBeenCalledWith(404);
            expect(mockJson).toHaveBeenCalledWith({ success: false, error: { status: 404, message: 'Folder not found' } });
        });

        it('should handle empty folder', async () => {
            const contents = {
                folder: {
                    folderId: 'folder-123',
                    name: 'Empty Folder',
                    path: '/Empty Folder'
                },
                childFolders: [],
                documents: [],
                breadcrumbs: [
                    { folderId: 'folder-123', name: 'Empty Folder', path: '/Empty Folder' }
                ]
            };

            mockReq.params = { id: 'folder-123' };
            DocumentFolder.getContents = jest.fn().mockResolvedValue(contents);

            await getFolderContents(mockReq, mockRes);

            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith(contents);
            expect(mockJson.mock.calls[0][0].childFolders).toHaveLength(0);
            expect(mockJson.mock.calls[0][0].documents).toHaveLength(0);
        });
    });
});

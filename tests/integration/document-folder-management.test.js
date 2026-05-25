/**
 * Document Folder Management Integration Tests
 *
 * Integration tests for folder CRUD operations
 * Tests full request/response flow with route validation
 *
 * Issue #188: Add Document Folder Management Endpoints
 */

const request = require('supertest');
const express = require('express');
const documentRoutes = require('../../routes/v1/documentRoutes');
const DocumentFolder = require('../../models/DocumentFolder');
const zerodbService = require('../../services/zerodbService');

// Mock dependencies
jest.mock('../../models/DocumentFolder');
jest.mock('../../services/zerodbService');
jest.mock('../../services/vectorService');
jest.mock('../../services/websocketService');
jest.mock('../../services/fileStorageService');
jest.mock('../../services/eventStreamingService');

// Setup Express app for testing
const app = express();
app.use(express.json());

// Mock authentication middleware
app.use((req, res, next) => {
    req.user = {
        userId: 'test-user-123',
        companyId: 'test-company-456',
        role: 'employee'
    };
    next();
});

app.use('/api/v1/documents', documentRoutes);

describe('Document Folder Management API - Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/v1/documents/folders', () => {
        it('should create a new root folder', async () => {
            const folderData = {
                name: 'Legal Documents',
                description: 'Company legal files'
            };

            const createdFolder = {
                _id: 'zerodb-id-1',
                folderId: 'folder-123',
                name: 'Legal Documents',
                description: 'Company legal files',
                path: '/Legal Documents',
                level: 0,
                parentId: null,
                ownerCompany: 'test-company-456',
                createdBy: 'test-user-123',
                createdAt: '2026-02-03T10:00:00.000Z',
                updatedAt: '2026-02-03T10:00:00.000Z'
            };

            DocumentFolder.create = jest.fn().mockResolvedValue(createdFolder);

            const response = await request(app)
                .post('/api/v1/documents/folders')
                .send(folderData)
                .expect(201);

            expect(response.body).toMatchObject({
                folderId: 'folder-123',
                name: 'Legal Documents',
                path: '/Legal Documents',
                level: 0
            });
        });

        it('should create a nested folder', async () => {
            const folderData = {
                name: 'Q1 2026',
                parentId: 'parent-folder-123'
            };

            const createdFolder = {
                folderId: 'folder-456',
                name: 'Q1 2026',
                path: '/Legal/Q1 2026',
                level: 1,
                parentId: 'parent-folder-123',
                ownerCompany: 'test-company-456',
                createdBy: 'test-user-123'
            };

            DocumentFolder.create = jest.fn().mockResolvedValue(createdFolder);

            const response = await request(app)
                .post('/api/v1/documents/folders')
                .send(folderData)
                .expect(201);

            expect(response.body.parentId).toBe('parent-folder-123');
            expect(response.body.level).toBe(1);
        });

        it('should reject folder with invalid name', async () => {
            const folderData = {
                name: 'Invalid/Name'
            };

            DocumentFolder.create = jest.fn().mockRejectedValue(
                new Error('Folder name cannot contain special characters: / \\ : * ? " < > |')
            );

            const response = await request(app)
                .post('/api/v1/documents/folders')
                .send(folderData)
                .expect(400);

            expect(response.body.message).toContain('special characters');
        });

        it('should reject circular folder reference', async () => {
            const folderData = {
                name: 'Test',
                parentId: 'folder-123'
            };

            DocumentFolder.create = jest.fn().mockRejectedValue(
                new Error('Circular folder reference detected')
            );

            const response = await request(app)
                .post('/api/v1/documents/folders')
                .send(folderData)
                .expect(400);

            expect(response.body.message).toBe('Circular folder reference detected');
        });
    });

    describe('GET /api/v1/documents/folders', () => {
        it('should list all root folders for user company', async () => {
            const folders = [
                {
                    folderId: 'folder-1',
                    name: 'Legal',
                    path: '/Legal',
                    level: 0
                },
                {
                    folderId: 'folder-2',
                    name: 'Financial',
                    path: '/Financial',
                    level: 0
                }
            ];

            DocumentFolder.findRootFolders = jest.fn().mockResolvedValue(folders);

            const response = await request(app)
                .get('/api/v1/documents/folders')
                .expect(200);

            expect(response.body.folders).toHaveLength(2);
            expect(response.body.folders[0].name).toBe('Legal');
            expect(DocumentFolder.findRootFolders).toHaveBeenCalledWith('test-company-456');
        });

        it('should list child folders when parentId provided', async () => {
            const childFolders = [
                {
                    folderId: 'child-1',
                    name: 'Q1 2026',
                    parentId: 'parent-123'
                },
                {
                    folderId: 'child-2',
                    name: 'Q2 2026',
                    parentId: 'parent-123'
                }
            ];

            DocumentFolder.findByParentId = jest.fn().mockResolvedValue(childFolders);

            const response = await request(app)
                .get('/api/v1/documents/folders?parentId=parent-123')
                .expect(200);

            expect(response.body.folders).toHaveLength(2);
            expect(DocumentFolder.findByParentId).toHaveBeenCalledWith('parent-123');
        });

        it('should return empty array when no folders exist', async () => {
            DocumentFolder.findRootFolders = jest.fn().mockResolvedValue([]);

            const response = await request(app)
                .get('/api/v1/documents/folders')
                .expect(200);

            expect(response.body.folders).toEqual([]);
        });
    });

    describe('GET /api/v1/documents/folders/:id', () => {
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

            DocumentFolder.findByFolderId = jest.fn().mockResolvedValue(folder);
            DocumentFolder.getBreadcrumbs = jest.fn().mockResolvedValue(breadcrumbs);

            const response = await request(app)
                .get('/api/v1/documents/folders/folder-123')
                .expect(200);

            expect(response.body.folderId).toBe('folder-123');
            expect(response.body.breadcrumbs).toHaveLength(2);
            expect(response.body.breadcrumbs[0].name).toBe('Legal');
        });

        it('should return 404 if folder not found', async () => {
            DocumentFolder.findByFolderId = jest.fn().mockResolvedValue(null);

            const response = await request(app)
                .get('/api/v1/documents/folders/non-existent')
                .expect(404);

            expect(response.body.message).toBe('Folder not found');
        });
    });

    describe('PUT /api/v1/documents/folders/:id', () => {
        it('should update folder name', async () => {
            const updateData = {
                name: 'Updated Name'
            };

            const updatedFolder = {
                folderId: 'folder-123',
                name: 'Updated Name',
                path: '/Legal/Updated Name',
                level: 1,
                updatedAt: '2026-02-03T11:00:00.000Z'
            };

            DocumentFolder.update = jest.fn().mockResolvedValue(updatedFolder);

            const response = await request(app)
                .put('/api/v1/documents/folders/folder-123')
                .send(updateData)
                .expect(200);

            expect(response.body.name).toBe('Updated Name');
            expect(DocumentFolder.update).toHaveBeenCalledWith('folder-123', { name: 'Updated Name' });
        });

        it('should update folder parent', async () => {
            const updateData = {
                parentId: 'new-parent-123'
            };

            const updatedFolder = {
                folderId: 'folder-123',
                name: 'Q1 2026',
                path: '/Financial/Q1 2026',
                parentId: 'new-parent-123'
            };

            DocumentFolder.update = jest.fn().mockResolvedValue(updatedFolder);

            const response = await request(app)
                .put('/api/v1/documents/folders/folder-123')
                .send(updateData)
                .expect(200);

            expect(response.body.parentId).toBe('new-parent-123');
        });

        it('should reject circular reference', async () => {
            const updateData = {
                parentId: 'folder-123'
            };

            DocumentFolder.update = jest.fn().mockRejectedValue(
                new Error('Circular folder reference detected')
            );

            const response = await request(app)
                .put('/api/v1/documents/folders/folder-123')
                .send(updateData)
                .expect(400);

            expect(response.body.message).toBe('Circular folder reference detected');
        });
    });

    describe('DELETE /api/v1/documents/folders/:id', () => {
        it('should delete empty folder', async () => {
            DocumentFolder.delete = jest.fn().mockResolvedValue({ deleted: 1 });

            const response = await request(app)
                .delete('/api/v1/documents/folders/folder-123')
                .expect(200);

            expect(response.body.message).toBe('Folder deleted successfully');
            expect(DocumentFolder.delete).toHaveBeenCalledWith('folder-123');
        });

        it('should reject deletion of folder with subfolders', async () => {
            DocumentFolder.delete = jest.fn().mockRejectedValue(
                new Error('Cannot delete folder with subfolders')
            );

            const response = await request(app)
                .delete('/api/v1/documents/folders/folder-123')
                .expect(400);

            expect(response.body.message).toBe('Cannot delete folder with subfolders');
        });

        it('should reject deletion of folder with documents', async () => {
            DocumentFolder.delete = jest.fn().mockRejectedValue(
                new Error('Cannot delete folder containing documents')
            );

            const response = await request(app)
                .delete('/api/v1/documents/folders/folder-123')
                .expect(400);

            expect(response.body.message).toBe('Cannot delete folder containing documents');
        });
    });

    describe('GET /api/v1/documents/folders/:id/contents', () => {
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

            DocumentFolder.getContents = jest.fn().mockResolvedValue(contents);

            const response = await request(app)
                .get('/api/v1/documents/folders/folder-123/contents')
                .expect(200);

            expect(response.body.folder.folderId).toBe('folder-123');
            expect(response.body.childFolders).toHaveLength(2);
            expect(response.body.documents).toHaveLength(2);
            expect(response.body.breadcrumbs).toHaveLength(1);
        });

        it('should handle empty folder', async () => {
            const contents = {
                folder: {
                    folderId: 'folder-123',
                    name: 'Empty Folder'
                },
                childFolders: [],
                documents: [],
                breadcrumbs: [
                    { folderId: 'folder-123', name: 'Empty Folder', path: '/Empty Folder' }
                ]
            };

            DocumentFolder.getContents = jest.fn().mockResolvedValue(contents);

            const response = await request(app)
                .get('/api/v1/documents/folders/folder-123/contents')
                .expect(200);

            expect(response.body.childFolders).toHaveLength(0);
            expect(response.body.documents).toHaveLength(0);
        });

        it('should return 404 if folder not found', async () => {
            DocumentFolder.getContents = jest.fn().mockRejectedValue(
                new Error('Folder not found')
            );

            const response = await request(app)
                .get('/api/v1/documents/folders/non-existent/contents')
                .expect(404);

            expect(response.body.message).toBe('Folder not found');
        });
    });

    describe('Folder Hierarchy Tests', () => {
        it('should create multi-level nested folders', async () => {
            // Create root folder
            const rootFolder = {
                folderId: 'root-1',
                name: 'Legal',
                path: '/Legal',
                level: 0
            };

            DocumentFolder.create = jest.fn().mockResolvedValue(rootFolder);

            const rootResponse = await request(app)
                .post('/api/v1/documents/folders')
                .send({ name: 'Legal' })
                .expect(201);

            expect(rootResponse.body.level).toBe(0);

            // Create level 1 folder
            const level1Folder = {
                folderId: 'level1-1',
                name: 'Contracts',
                path: '/Legal/Contracts',
                level: 1,
                parentId: 'root-1'
            };

            DocumentFolder.create = jest.fn().mockResolvedValue(level1Folder);

            const level1Response = await request(app)
                .post('/api/v1/documents/folders')
                .send({ name: 'Contracts', parentId: 'root-1' })
                .expect(201);

            expect(level1Response.body.level).toBe(1);

            // Create level 2 folder
            const level2Folder = {
                folderId: 'level2-1',
                name: '2026',
                path: '/Legal/Contracts/2026',
                level: 2,
                parentId: 'level1-1'
            };

            DocumentFolder.create = jest.fn().mockResolvedValue(level2Folder);

            const level2Response = await request(app)
                .post('/api/v1/documents/folders')
                .send({ name: '2026', parentId: 'level1-1' })
                .expect(201);

            expect(level2Response.body.level).toBe(2);
        });

        it('should generate correct breadcrumbs for deeply nested folder', async () => {
            const folder = {
                folderId: 'level2-1',
                name: '2026',
                path: '/Legal/Contracts/2026',
                level: 2
            };

            const breadcrumbs = [
                { folderId: 'root-1', name: 'Legal', path: '/Legal' },
                { folderId: 'level1-1', name: 'Contracts', path: '/Legal/Contracts' },
                { folderId: 'level2-1', name: '2026', path: '/Legal/Contracts/2026' }
            ];

            DocumentFolder.findByFolderId = jest.fn().mockResolvedValue(folder);
            DocumentFolder.getBreadcrumbs = jest.fn().mockResolvedValue(breadcrumbs);

            const response = await request(app)
                .get('/api/v1/documents/folders/level2-1')
                .expect(200);

            expect(response.body.breadcrumbs).toHaveLength(3);
            expect(response.body.breadcrumbs[0].name).toBe('Legal');
            expect(response.body.breadcrumbs[2].name).toBe('2026');
        });
    });
});

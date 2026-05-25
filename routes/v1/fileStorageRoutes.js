/**
 * File Storage Routes
 *
 * API routes for file storage operations with ZeroDB
 *
 * Issue #30: Implement file storage integration
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const multer = require('multer');
const fileStorageController = require('../../controllers/fileStorageController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     FileUploadResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         fileName:
 *           type: string
 *         size:
 *           type: integer
 *         contentType:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *     FileMetadata:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         fileName:
 *           type: string
 *         contentType:
 *           type: string
 *         size:
 *           type: integer
 *         metadata:
 *           type: object
 *         createdAt:
 *           type: string
 *           format: date-time
 *     StorageUsage:
 *       type: object
 *       properties:
 *         totalBytes:
 *           type: integer
 *         fileCount:
 *           type: integer
 *         quotaUsedPercent:
 *           type: number
 */

/**
 * @swagger
 * /api/v1/files:
 *   post:
 *     summary: Upload a file
 *     tags: [Files]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               category:
 *                 type: string
 *               metadata:
 *                 type: string
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FileUploadResponse'
 *       400:
 *         description: Bad request - no file or invalid file
 *       500:
 *         description: Server error
 */
router.post('/', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), upload.single('file'), fileStorageController.uploadFile);

/**
 * @swagger
 * /api/v1/files/batch:
 *   post:
 *     summary: Upload multiple files
 *     tags: [Files]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: All files uploaded successfully
 *       207:
 *         description: Partial success - some files failed
 */
router.post('/batch', upload.array('files', 10), fileStorageController.uploadMultipleFiles);

/**
 * @swagger
 * /api/v1/files/search:
 *   post:
 *     summary: Search files by metadata
 *     tags: [Files]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               criteria:
 *                 type: object
 *               skip:
 *                 type: integer
 *               limit:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Search results
 */
router.post('/search', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), fileStorageController.searchFiles);

/**
 * @swagger
 * /api/v1/files/usage:
 *   get:
 *     summary: Get storage usage statistics
 *     tags: [Files]
 *     responses:
 *       200:
 *         description: Storage usage statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StorageUsage'
 */
router.get('/usage', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), fileStorageController.getStorageUsage);

/**
 * @swagger
 * /api/v1/files:
 *   get:
 *     summary: List files
 *     tags: [Files]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: contentType
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of files with pagination
 */
router.get('/', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), fileStorageController.listFiles);

/**
 * @swagger
 * /api/v1/files/{id}/download:
 *   get:
 *     summary: Download a file
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File content
 *       404:
 *         description: File not found
 */
router.get('/:id/download', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), fileStorageController.downloadFile);

/**
 * @swagger
 * /api/v1/files/{id}/url:
 *   get:
 *     summary: Get presigned URL for file
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: expiresIn
 *         schema:
 *           type: integer
 *           description: URL expiration time in seconds
 *     responses:
 *       200:
 *         description: Presigned URL
 */
router.get('/:id/url', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), fileStorageController.getPresignedUrl);

/**
 * @swagger
 * /api/v1/files/{id}/metadata:
 *   get:
 *     summary: Get file metadata
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File metadata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FileMetadata'
 *       404:
 *         description: File not found
 */
router.get('/:id/metadata', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), fileStorageController.getFileMetadata);

/**
 * @swagger
 * /api/v1/files/{id}/metadata:
 *   patch:
 *     summary: Update file metadata
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               metadata:
 *                 type: object
 *               merge:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Updated metadata
 *       404:
 *         description: File not found
 */
router.patch('/:id/metadata', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), fileStorageController.updateFileMetadata);

/**
 * @swagger
 * /api/v1/files/{id}/versions:
 *   get:
 *     summary: Get version history
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Version history
 */
router.get('/:id/versions', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), fileStorageController.getVersionHistory);

/**
 * @swagger
 * /api/v1/files/{id}/versions:
 *   post:
 *     summary: Create new version of file
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               preserveMetadata:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: New version created
 */
router.post('/:id/versions', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), upload.single('file'), fileStorageController.createVersion);

/**
 * @swagger
 * /api/v1/files/{id}/restore:
 *   post:
 *     summary: Restore a previous version
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               version:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Version restored
 */
router.post('/:id/restore', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), fileStorageController.restoreVersion);

/**
 * @swagger
 * /api/v1/files/{id}:
 *   delete:
 *     summary: Delete a file
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: soft
 *         schema:
 *           type: boolean
 *           description: Soft delete (mark as deleted but don't remove)
 *     responses:
 *       200:
 *         description: File deleted
 *       404:
 *         description: File not found
 */
router.delete('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), fileStorageController.deleteFile);

module.exports = router;

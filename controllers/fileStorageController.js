/**
 * File Storage Controller
 *
 * Handles HTTP requests for file storage operations
 * using ZeroDB file storage service
 *
 * Issue #30: Implement file storage integration
 */

const fileStorageService = require('../services/fileStorageService');

/**
 * Upload a single file
 * POST /api/v1/files
 */
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    const { category, metadata: metadataStr } = req.body;
    let metadata = {};

    if (metadataStr) {
      try {
        metadata = JSON.parse(metadataStr);
      } catch (e) {
        metadata = {};
      }
    }

    const options = {
      companyId: req.user?.companyId,
      uploadedBy: req.user?.userId,
      category,
      metadata
    };

    const result = await fileStorageService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      options
    );

    res.status(201).json(result);
  } catch (error) {
    if (error.message.includes('size exceeds') || error.message.includes('not allowed')) {
      return res.status(400).json({ message: error.message });
    }
    console.error('File upload error:', error);
    res.status(500).json({ message: `File upload failed: ${error.message}` });
  }
};

/**
 * Upload multiple files
 * POST /api/v1/files/batch
 */
exports.uploadMultipleFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files provided' });
    }

    const files = req.files.map(f => ({
      buffer: f.buffer,
      name: f.originalname
    }));

    const options = {
      companyId: req.user?.companyId,
      uploadedBy: req.user?.userId
    };

    const result = await fileStorageService.uploadMultipleFiles(files, options);

    // Return 207 Multi-Status if there were partial failures
    const statusCode = result.failed > 0 ? 207 : 201;
    res.status(statusCode).json(result);
  } catch (error) {
    console.error('Batch file upload error:', error);
    res.status(500).json({ message: `Batch upload failed: ${error.message}` });
  }
};

/**
 * Download a file
 * GET /api/v1/files/:id/download
 */
exports.downloadFile = async (req, res) => {
  try {
    const { id } = req.params;

    // Get file metadata for headers
    const metadata = await fileStorageService.getFileMetadata(id);

    // Download file content
    const file = await fileStorageService.downloadFile(id);

    // Set response headers
    res.setHeader('Content-Type', metadata.contentType || file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${metadata.fileName}"`);
    res.setHeader('Content-Length', file.size || file.data.length);

    res.status(200).send(file.data);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: 'File not found' });
    }
    console.error('File download error:', error);
    res.status(500).json({ message: `Download failed: ${error.message}` });
  }
};

/**
 * Get presigned URL for file
 * GET /api/v1/files/:id/url
 */
exports.getPresignedUrl = async (req, res) => {
  try {
    const { id } = req.params;
    const expiresIn = parseInt(req.query.expiresIn, 10) || 3600;

    const result = await fileStorageService.getPresignedUrl(id, { expiresIn });

    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: 'File not found' });
    }
    console.error('Presigned URL error:', error);
    res.status(500).json({ message: `Failed to generate presigned URL: ${error.message}` });
  }
};

/**
 * Get file metadata
 * GET /api/v1/files/:id/metadata
 */
exports.getFileMetadata = async (req, res) => {
  try {
    const { id } = req.params;

    const metadata = await fileStorageService.getFileMetadata(id);

    res.status(200).json(metadata);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: 'File not found' });
    }
    console.error('Get metadata error:', error);
    res.status(500).json({ message: `Failed to get file metadata: ${error.message}` });
  }
};

/**
 * Update file metadata
 * PATCH /api/v1/files/:id/metadata
 */
exports.updateFileMetadata = async (req, res) => {
  try {
    const { id } = req.params;
    const { metadata, merge = false } = req.body;

    const result = await fileStorageService.updateFileMetadata(id, metadata, { merge });

    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: 'File not found' });
    }
    console.error('Update metadata error:', error);
    res.status(500).json({ message: `Failed to update metadata: ${error.message}` });
  }
};

/**
 * List files
 * GET /api/v1/files
 */
exports.listFiles = async (req, res) => {
  try {
    const { page = 1, limit = 20, contentType } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const result = await fileStorageService.listFiles({
      skip,
      limit: parseInt(limit, 10),
      contentType
    });

    res.status(200).json({
      files: result.files,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: result.total,
        totalPages: Math.ceil(result.total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({ message: `Failed to list files: ${error.message}` });
  }
};

/**
 * Delete a file
 * DELETE /api/v1/files/:id
 */
exports.deleteFile = async (req, res) => {
  try {
    const { id } = req.params;
    const soft = req.query.soft === 'true';

    const result = await fileStorageService.deleteFile(id, { soft });

    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: 'File not found' });
    }
    console.error('Delete file error:', error);
    res.status(500).json({ message: `Failed to delete file: ${error.message}` });
  }
};

/**
 * Create a new version of a file
 * POST /api/v1/files/:id/versions
 */
exports.createVersion = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'No file provided for new version' });
    }

    const options = {
      preserveMetadata: req.body.preserveMetadata !== 'false'
    };

    const result = await fileStorageService.createVersion(id, req.file.buffer, options);

    res.status(201).json(result);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: 'Original file not found' });
    }
    console.error('Create version error:', error);
    res.status(500).json({ message: `Failed to create version: ${error.message}` });
  }
};

/**
 * Get version history of a file
 * GET /api/v1/files/:id/versions
 */
exports.getVersionHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const history = await fileStorageService.getVersionHistory(id);

    res.status(200).json(history);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: 'File not found' });
    }
    console.error('Get version history error:', error);
    res.status(500).json({ message: `Failed to get version history: ${error.message}` });
  }
};

/**
 * Restore a previous version
 * POST /api/v1/files/:id/restore
 */
exports.restoreVersion = async (req, res) => {
  try {
    const { id } = req.params;
    const { version } = req.body;

    if (!version) {
      return res.status(400).json({ message: 'Version number required' });
    }

    const result = await fileStorageService.restoreVersion(id, version);

    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: 'File or version not found' });
    }
    console.error('Restore version error:', error);
    res.status(500).json({ message: `Failed to restore version: ${error.message}` });
  }
};

/**
 * Get storage usage statistics
 * GET /api/v1/files/usage
 */
exports.getStorageUsage = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    const usage = await fileStorageService.getStorageUsage(companyId);

    res.status(200).json(usage);
  } catch (error) {
    console.error('Get storage usage error:', error);
    res.status(500).json({ message: `Failed to get storage usage: ${error.message}` });
  }
};

/**
 * Search files by metadata
 * POST /api/v1/files/search
 */
exports.searchFiles = async (req, res) => {
  try {
    const { criteria, skip = 0, limit = 100 } = req.body;

    if (!criteria || Object.keys(criteria).length === 0) {
      return res.status(400).json({ message: 'Search criteria required' });
    }

    const result = await fileStorageService.searchFilesByMetadata(criteria, { skip, limit });

    res.status(200).json(result);
  } catch (error) {
    console.error('Search files error:', error);
    res.status(500).json({ message: `Search failed: ${error.message}` });
  }
};

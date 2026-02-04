/**
 * File Storage Service
 *
 * Provides integration with ZeroDB API for file storage functionality
 * including upload, download, presigned URLs, metadata management,
 * versioning, and storage usage monitoring.
 *
 * Issue #30: Implement file storage integration
 */

const path = require('path');
const fs = require('fs').promises;
const zerodbService = require('./zerodbService');

// Maximum file size (100MB by default)
const MAX_FILE_SIZE = 100 * 1024 * 1024;

// Content type mappings
const CONTENT_TYPE_MAP = {
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.zip': 'application/zip'
};

// Default allowed file extensions
const DEFAULT_ALLOWED_TYPES = ['pdf', 'txt', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'json', 'xml', 'png', 'jpg', 'jpeg', 'gif', 'zip'];

// Blocked file extensions (security)
const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js', '.msi', '.dll', '.com'];

class FileStorageService {
  constructor() {
    this.maxFileSize = MAX_FILE_SIZE;
  }

  /**
   * Get content type from file extension
   * @param {string} fileName - File name with extension
   * @returns {string} - MIME content type
   */
  getContentType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    return CONTENT_TYPE_MAP[ext] || 'application/octet-stream';
  }

  /**
   * Get file extension from file name
   * @param {string} fileName - File name
   * @returns {string} - Extension without dot
   */
  getFileExtension(fileName) {
    return path.extname(fileName).toLowerCase().slice(1);
  }

  /**
   * Validate file against rules
   * @param {Object} file - File object with name and size
   * @param {Object} rules - Validation rules
   * @returns {Object} - Validation result
   */
  validateFile(file, rules = {}) {
    const { name, size } = file;
    const {
      allowedTypes = DEFAULT_ALLOWED_TYPES,
      maxSize = this.maxFileSize
    } = rules;

    // Check for path traversal attempts
    if (name.includes('..') || name.includes('/') || name.includes('\\')) {
      return { valid: false, error: 'File name contains invalid characters' };
    }

    // Check for blocked extensions
    const ext = path.extname(name).toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      return { valid: false, error: 'File type not allowed for security reasons' };
    }

    // Check allowed types
    const fileExt = this.getFileExtension(name);
    if (allowedTypes && allowedTypes.length > 0 && !allowedTypes.includes(fileExt)) {
      return { valid: false, error: `File type '${fileExt}' not allowed. Allowed types: ${allowedTypes.join(', ')}` };
    }

    // Check size limit
    if (size > maxSize) {
      return { valid: false, error: `File size (${size} bytes) exceeds maximum allowed (${maxSize} bytes)` };
    }

    return { valid: true };
  }

  /**
   * Upload a file to ZeroDB
   * @param {Buffer} fileBuffer - File content as buffer
   * @param {string} fileName - Original file name
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} - Upload result
   */
  async uploadFile(fileBuffer, fileName, options = {}) {
    const {
      companyId,
      uploadedBy,
      category,
      metadata = {},
      allowedTypes
    } = options;

    // Validate file
    const validation = this.validateFile(
      { name: fileName, size: fileBuffer.length },
      { allowedTypes, maxSize: options.maxSize || this.maxFileSize }
    );

    if (!validation.valid) {
      if (validation.error.includes('size')) {
        throw new Error('File size exceeds maximum allowed');
      }
      if (validation.error.includes('not allowed')) {
        throw new Error('File type not allowed');
      }
      throw new Error(validation.error);
    }

    const contentType = this.getContentType(fileName);
    const fileKey = `opencap/files/${Date.now()}-${fileName}`;

    try {
      // Create form data for file upload
      const FormData = require('form-data');
      const form = new FormData();
      form.append('file', fileBuffer, {
        filename: fileName,
        contentType: contentType
      });
      form.append('file_key', fileKey);
      form.append('file_name', fileName);
      form.append('content_type', contentType);
      form.append('size_bytes', fileBuffer.length.toString());

      if (Object.keys(metadata).length > 0 || companyId || uploadedBy || category) {
        const fullMetadata = {
          ...metadata,
          companyId,
          uploadedBy,
          category
        };
        form.append('file_metadata', JSON.stringify(fullMetadata));
      }

      const response = await zerodbService.client.post(
        `/v1/public/zerodb/${zerodbService.projectId}/database/files`,
        form,
        {
          headers: form.getHeaders ? form.getHeaders() : { 'Content-Type': 'multipart/form-data' }
        }
      );

      return {
        id: response.data.id,
        fileKey: response.data.file_key,
        fileName: response.data.file_name || fileName,
        size: response.data.size_bytes || fileBuffer.length,
        contentType: response.data.content_type || contentType,
        metadata: response.data.file_metadata || metadata,
        createdAt: response.data.created_at
      };
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Upload timeout: Connection timed out');
      }
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Upload a file from filesystem path
   * @param {string} filePath - Path to file
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} - Upload result
   */
  async uploadFileFromPath(filePath, options = {}) {
    const fileBuffer = await fs.readFile(filePath);
    const fileName = path.basename(filePath);
    return this.uploadFile(fileBuffer, fileName, options);
  }

  /**
   * Upload multiple files in batch
   * @param {Array} files - Array of file objects with buffer and name
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} - Batch upload result
   */
  async uploadMultipleFiles(files, options = {}) {
    const results = {
      successful: 0,
      failed: 0,
      files: [],
      errors: []
    };

    for (const file of files) {
      try {
        const result = await this.uploadFile(file.buffer, file.name, options);
        results.files.push(result);
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          fileName: file.name,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Download a file from ZeroDB
   * @param {string} fileId - File ID
   * @param {Object} options - Download options
   * @returns {Promise<Object>} - Download result with file data
   */
  async downloadFile(fileId, options = {}) {
    const { includeMetadata = false, stream = false } = options;

    try {
      const response = await zerodbService.client.get(
        `/v1/public/zerodb/${zerodbService.projectId}/database/files/${fileId}`,
        { responseType: stream ? 'stream' : 'arraybuffer' }
      );

      const result = {
        data: stream ? null : response.data,
        contentType: response.headers['content-type'],
        size: parseInt(response.headers['content-length'] || '0', 10)
      };

      if (stream) {
        result.stream = response.data;
      }

      if (includeMetadata) {
        const metadataHeader = response.headers['x-file-metadata'];
        result.metadata = metadataHeader ? JSON.parse(metadataHeader) : {};
        result.fileName = response.headers['x-file-name'];
      }

      return result;
    } catch (error) {
      if (error.response) {
        switch (error.response.status) {
          case 404:
            throw new Error('File not found');
          case 401:
            throw new Error('Authentication required');
          case 503:
            throw new Error('Service temporarily unavailable');
          default:
            throw new Error(`Failed to download file: ${error.response.data?.message || error.message}`);
        }
      }
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * Download file directly to filesystem
   * @param {string} fileId - File ID
   * @param {string} outputPath - Path to save file
   * @returns {Promise<Object>} - Download result
   */
  async downloadFileToPath(fileId, outputPath) {
    const { data } = await this.downloadFile(fileId);
    await fs.writeFile(outputPath, data);
    return { path: outputPath, success: true };
  }

  /**
   * Generate presigned URL for file download
   * @param {string} fileId - File ID
   * @param {Object} options - URL options
   * @returns {Promise<Object>} - Presigned URL details
   */
  async getPresignedUrl(fileId, options = {}) {
    const { expiresIn = 3600 } = options;

    try {
      const response = await zerodbService.client.get(
        `/v1/public/zerodb/${zerodbService.projectId}/database/files/${fileId}/url`,
        { params: { expires_in: expiresIn } }
      );

      const expiresAt = new Date(response.data.expires_at);
      const now = new Date();

      return {
        url: response.data.url,
        expiresAt: expiresAt.toISOString(),
        expiresIn: Math.floor((expiresAt - now) / 1000)
      };
    } catch (error) {
      if (error.response?.status === 403) {
        throw new Error('Failed to generate presigned URL: Access denied');
      }
      throw new Error(`Failed to generate presigned URL: ${error.message}`);
    }
  }

  /**
   * Generate presigned URL for file upload
   * @param {string} fileName - File name
   * @param {Object} options - URL options
   * @returns {Promise<Object>} - Presigned upload URL details
   */
  async getPresignedUploadUrl(fileName, options = {}) {
    const { contentType, maxSize, expiresIn = 900 } = options;

    const response = await zerodbService.client.post(
      `/v1/public/zerodb/${zerodbService.projectId}/database/files/presigned-upload`,
      {
        file_name: fileName,
        content_type: contentType || this.getContentType(fileName),
        max_size: maxSize,
        expires_in: expiresIn
      }
    );

    return {
      uploadUrl: response.data.upload_url,
      fileKey: response.data.file_key,
      expiresAt: response.data.expires_at
    };
  }

  /**
   * Get file metadata
   * @param {string} fileId - File ID
   * @returns {Promise<Object>} - File metadata
   */
  async getFileMetadata(fileId) {
    const response = await zerodbService.client.get(
      `/v1/public/zerodb/${zerodbService.projectId}/database/files/${fileId}/metadata`
    );

    return {
      id: response.data.id,
      fileName: response.data.file_name,
      contentType: response.data.content_type,
      size: response.data.size_bytes,
      metadata: response.data.file_metadata || {},
      createdAt: response.data.created_at,
      updatedAt: response.data.updated_at
    };
  }

  /**
   * Update file metadata
   * @param {string} fileId - File ID
   * @param {Object} metadata - New metadata
   * @param {Object} options - Update options
   * @returns {Promise<Object>} - Updated metadata
   */
  async updateFileMetadata(fileId, metadata, options = {}) {
    const { merge = false } = options;

    let finalMetadata = metadata;

    if (merge) {
      const existing = await zerodbService.client.get(
        `/v1/public/zerodb/${zerodbService.projectId}/database/files/${fileId}/metadata`
      );
      finalMetadata = { ...existing.data.file_metadata, ...metadata };
    }

    const response = await zerodbService.client.patch(
      `/v1/public/zerodb/${zerodbService.projectId}/database/files/${fileId}/metadata`,
      { file_metadata: finalMetadata }
    );

    return {
      id: response.data.id,
      metadata: response.data.file_metadata,
      updatedAt: response.data.updated_at
    };
  }

  /**
   * Search files by metadata criteria
   * @param {Object} criteria - Search criteria
   * @param {Object} options - Search options
   * @returns {Promise<Object>} - Search results
   */
  async searchFilesByMetadata(criteria, options = {}) {
    const { skip = 0, limit = 100 } = options;

    const files = await zerodbService.listFiles(skip, limit);

    // Filter files by metadata criteria
    const matchingFiles = files.filter(file => {
      const fileMetadata = file.file_metadata || {};
      return Object.entries(criteria).every(([key, value]) => {
        return fileMetadata[key] === value;
      });
    });

    return {
      files: matchingFiles,
      total: matchingFiles.length
    };
  }

  /**
   * Create a new version of a file
   * @param {string} fileId - Original file ID
   * @param {Buffer} newContent - New file content
   * @param {Object} options - Version options
   * @returns {Promise<Object>} - New version details
   */
  async createVersion(fileId, newContent, options = {}) {
    const { preserveMetadata = true } = options;

    // Get original file info
    const original = await zerodbService.client.get(
      `/v1/public/zerodb/${zerodbService.projectId}/database/files/${fileId}/metadata`
    );

    const originalData = original.data;
    const newVersion = (originalData.version || 1) + 1;

    // Create new version with reference to original
    let metadata = { previousVersion: fileId };
    if (preserveMetadata && originalData.file_metadata) {
      metadata = { ...originalData.file_metadata, previousVersion: fileId };
    }

    const response = await zerodbService.client.post(
      `/v1/public/zerodb/${zerodbService.projectId}/database/files`,
      {
        file: newContent,
        file_name: originalData.file_name,
        content_type: originalData.content_type,
        version: newVersion,
        parent_version: fileId,
        file_metadata: metadata
      }
    );

    return {
      id: response.data.id,
      fileName: response.data.file_name,
      version: response.data.version,
      parentVersion: response.data.parent_version,
      metadata: response.data.file_metadata
    };
  }

  /**
   * Get version history of a file
   * @param {string} fileId - File ID
   * @returns {Promise<Object>} - Version history
   */
  async getVersionHistory(fileId) {
    const response = await zerodbService.client.get(
      `/v1/public/zerodb/${zerodbService.projectId}/database/files/${fileId}/versions`
    );

    const versions = response.data.versions.sort((a, b) => a.version - b.version);
    const currentVersion = versions.length > 0 ? versions[versions.length - 1].version : 1;

    return {
      versions,
      currentVersion,
      totalVersions: versions.length
    };
  }

  /**
   * Restore a previous version of a file
   * @param {string} fileId - Current file ID
   * @param {number} versionNumber - Version to restore
   * @returns {Promise<Object>} - Restored file details
   */
  async restoreVersion(fileId, versionNumber) {
    const response = await zerodbService.client.post(
      `/v1/public/zerodb/${zerodbService.projectId}/database/files/${fileId}/restore`,
      { version: versionNumber }
    );

    return {
      id: response.data.id,
      fileName: response.data.file_name,
      version: response.data.version,
      restoredFrom: response.data.restored_from || versionNumber
    };
  }

  /**
   * Delete a file
   * @param {string} fileId - File ID
   * @param {Object} options - Delete options
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteFile(fileId, options = {}) {
    const { soft = false } = options;

    if (soft) {
      // Soft delete - mark as deleted but don't remove
      const response = await zerodbService.client.patch(
        `/v1/public/zerodb/${zerodbService.projectId}/database/files/${fileId}`,
        { status: 'deleted', deleted_at: new Date().toISOString() }
      );

      return {
        id: response.data.id,
        status: response.data.status,
        deletedAt: response.data.deleted_at
      };
    }

    // Hard delete
    const response = await zerodbService.client.delete(
      `/v1/public/zerodb/${zerodbService.projectId}/database/files/${fileId}`
    );

    return {
      deleted: response.data.deleted,
      id: response.data.id || fileId
    };
  }

  /**
   * Delete multiple files
   * @param {Array} fileIds - Array of file IDs
   * @param {Object} options - Delete options
   * @returns {Promise<Object>} - Batch deletion result
   */
  async deleteMultipleFiles(fileIds, options = {}) {
    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const fileId of fileIds) {
      try {
        await this.deleteFile(fileId, options);
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({ fileId, error: error.message });
      }
    }

    return results;
  }

  /**
   * Get storage usage statistics
   * @param {string} companyId - Company ID (optional)
   * @returns {Promise<Object>} - Storage usage stats
   */
  async getStorageUsage(companyId) {
    const params = companyId ? { company_id: companyId } : {};

    const response = await zerodbService.client.get(
      `/v1/public/zerodb/${zerodbService.projectId}/database/files/usage`,
      { params }
    );

    const data = response.data;
    const quotaLimit = data.quota_limit || 0;
    const totalBytes = data.total_bytes || 0;

    return {
      totalBytes,
      fileCount: data.file_count,
      byContentType: data.by_content_type,
      quotaLimit,
      quotaRemaining: quotaLimit > 0 ? quotaLimit - totalBytes : null,
      quotaUsedPercent: quotaLimit > 0 ? Math.round((totalBytes / quotaLimit) * 100) : null
    };
  }

  /**
   * List files with pagination and filtering
   * @param {Object} options - List options
   * @returns {Promise<Object>} - File list
   */
  async listFiles(options = {}) {
    const { skip = 0, limit = 100, contentType } = options;

    const files = await zerodbService.listFiles(skip, limit);

    let filteredFiles = files.map(f => ({
      id: f.id,
      fileName: f.file_name,
      contentType: f.content_type,
      size: f.size_bytes,
      metadata: f.file_metadata,
      createdAt: f.created_at
    }));

    if (contentType) {
      filteredFiles = filteredFiles.filter(f => f.contentType === contentType);
    }

    return {
      files: filteredFiles,
      total: filteredFiles.length
    };
  }
}

// Export singleton instance
module.exports = new FileStorageService();

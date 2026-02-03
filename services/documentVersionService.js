/**
 * Document Version Service
 * Issue #98: Implement Document Version Control
 *
 * Provides document version control functionality including:
 * - Create new versions
 * - Get version history
 * - Compare versions
 * - Restore previous versions
 * - Archive/delete old versions
 */

const crypto = require('crypto');
const databaseAdapter = require('./databaseAdapter');
const fileStorageService = require('./fileStorageService');
const { v4: uuidv4 } = require('uuid');

class DocumentVersionService {
  /**
   * Calculate SHA-256 hash of file content for integrity verification
   * @param {Buffer} buffer - File content buffer
   * @returns {string} Hash string prefixed with algorithm
   */
  _calculateFileHash(buffer) {
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    return `sha256:${hash}`;
  }

  /**
   * Generate a unique version ID
   * @returns {string} Version ID
   */
  _generateVersionId() {
    return `DV-${uuidv4().slice(0, 8).toUpperCase()}`;
  }

  /**
   * Create a new version of a document
   * @param {string} documentId - The document ID
   * @param {Buffer} fileBuffer - The file content buffer
   * @param {Object} versionData - Version metadata
   * @returns {Promise<Object>} Created version
   */
  async createVersion(documentId, fileBuffer, versionData) {
    const {
      changeSummary,
      changeDescription,
      author,
      originalFilename,
      mimeType,
      majorVersionBump = false,
      metadata = {}
    } = versionData;

    // Get existing versions to determine version number
    const existingVersions = await databaseAdapter.find(
      'DocumentVersion',
      { documentId },
      { sort: { versionNumber: -1 }, limit: 1 }
    );

    const latestVersion = existingVersions && existingVersions.length > 0 ? existingVersions[0] : null;
    const newVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

    // Calculate semantic version
    let majorVersion = 1;
    let minorVersion = 0;

    if (latestVersion) {
      if (majorVersionBump) {
        majorVersion = (latestVersion.majorVersion || 1) + 1;
        minorVersion = 0;
      } else {
        majorVersion = latestVersion.majorVersion || 1;
        minorVersion = (latestVersion.minorVersion || 0) + 1;
      }
    }

    // Calculate file hash
    const fileHash = this._calculateFileHash(fileBuffer);

    // Generate storage key
    const fileKey = `opencap/documents/${documentId}/v${newVersionNumber}/${originalFilename || 'document'}`;

    // Upload file to storage
    const uploadResult = await fileStorageService.uploadFile(fileBuffer, originalFilename || 'document', {
      metadata: {
        documentId,
        versionNumber: newVersionNumber,
        ...metadata
      }
    });

    // Create version record
    const versionRecord = {
      versionId: this._generateVersionId(),
      documentId,
      versionNumber: newVersionNumber,
      majorVersion,
      minorVersion,
      storageReference: {
        provider: 'zerodb',
        fileKey: uploadResult.fileKey || fileKey,
        bucket: 'documents'
      },
      changeSummary,
      changeDescription,
      author,
      originalFilename: originalFilename || 'document',
      mimeType: mimeType || 'application/octet-stream',
      fileSize: fileBuffer.length,
      fileHash,
      previousVersion: latestVersion ? latestVersion._id : null,
      nextVersion: null,
      status: 'draft',
      metadata,
      createdBy: author
    };

    // Save the version
    const savedVersion = await databaseAdapter.create('DocumentVersion', versionRecord);

    // Update previous version's nextVersion reference
    if (latestVersion) {
      await databaseAdapter.findByIdAndUpdate(
        'DocumentVersion',
        latestVersion._id,
        { nextVersion: savedVersion._id },
        { new: true }
      );
    }

    return savedVersion;
  }

  /**
   * Get version history for a document
   * @param {string} documentId - The document ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Version history
   */
  async getVersionHistory(documentId, options = {}) {
    const { skip = 0, limit = 100, status } = options;

    const query = { documentId };
    if (status) {
      query.status = status;
    }

    const versions = await databaseAdapter.find('DocumentVersion', query, {
      skip,
      limit,
      sort: { versionNumber: -1 }
    });

    return {
      versions,
      totalVersions: versions.length,
      documentId
    };
  }

  /**
   * Get a version by its ID
   * @param {string} versionId - The version ID
   * @returns {Promise<Object|null>} Version or null
   */
  async getVersionById(versionId) {
    return await databaseAdapter.findById('DocumentVersion', versionId);
  }

  /**
   * Get the latest version of a document
   * @param {string} documentId - The document ID
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>} Latest version or null
   */
  async getLatestVersion(documentId, options = {}) {
    const { status } = options;

    const query = { documentId };
    if (status) {
      query.status = status;
    }

    const versions = await databaseAdapter.find('DocumentVersion', query, {
      sort: { versionNumber: -1 },
      limit: 1
    });

    return versions && versions.length > 0 ? versions[0] : null;
  }

  /**
   * Get a specific version by document ID and version number
   * @param {string} documentId - The document ID
   * @param {number} versionNumber - The version number
   * @returns {Promise<Object|null>} Version or null
   */
  async getVersionByNumber(documentId, versionNumber) {
    return await databaseAdapter.findOne('DocumentVersion', {
      documentId,
      versionNumber
    });
  }

  /**
   * Compare two versions and return differences
   * @param {string} versionId1 - First version ID
   * @param {string} versionId2 - Second version ID
   * @returns {Promise<Object>} Comparison result
   */
  async compareVersions(versionId1, versionId2) {
    const version1 = await databaseAdapter.findById('DocumentVersion', versionId1);
    const version2 = await databaseAdapter.findById('DocumentVersion', versionId2);

    if (!version1) {
      throw new Error(`Version ${versionId1} not found`);
    }
    if (!version2) {
      throw new Error(`Version ${versionId2} not found`);
    }

    const differences = {};
    const fieldsToCompare = ['fileSize', 'fileHash', 'mimeType', 'metadata', 'changeSummary'];

    for (const field of fieldsToCompare) {
      const val1 = version1[field];
      const val2 = version2[field];

      if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        differences[field] = {
          from: val1,
          to: val2
        };
      }
    }

    const contentChanged = version1.fileHash !== version2.fileHash;

    return {
      version1: {
        _id: version1._id,
        versionNumber: version1.versionNumber,
        fileHash: version1.fileHash,
        fileSize: version1.fileSize
      },
      version2: {
        _id: version2._id,
        versionNumber: version2.versionNumber,
        fileHash: version2.fileHash,
        fileSize: version2.fileSize
      },
      differences,
      contentChanged
    };
  }

  /**
   * Restore a previous version by creating a new version from it
   * @param {string} versionId - Version ID to restore
   * @param {Object} options - Restore options
   * @returns {Promise<Object>} New version created from restored content
   */
  async restoreVersion(versionId, options) {
    const { author, changeSummary } = options;

    // Get the version to restore
    const versionToRestore = await databaseAdapter.findById('DocumentVersion', versionId);
    if (!versionToRestore) {
      throw new Error('Version not found');
    }

    // Get the latest version
    const latestVersions = await databaseAdapter.find(
      'DocumentVersion',
      { documentId: versionToRestore.documentId },
      { sort: { versionNumber: -1 }, limit: 1 }
    );
    const latestVersion = latestVersions && latestVersions.length > 0 ? latestVersions[0] : null;

    // Download the content from the old version
    const downloadResult = await fileStorageService.downloadFile(
      versionToRestore.storageReference.fileKey,
      { includeMetadata: true }
    );

    // Create new version with restored content
    const newVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;
    const fileKey = `opencap/documents/${versionToRestore.documentId}/v${newVersionNumber}/${versionToRestore.originalFilename}`;

    // Upload restored content
    const uploadResult = await fileStorageService.uploadFile(
      downloadResult.data,
      versionToRestore.originalFilename,
      {
        metadata: {
          documentId: versionToRestore.documentId,
          versionNumber: newVersionNumber,
          restoredFrom: versionId
        }
      }
    );

    // Create the new version record
    const versionRecord = {
      versionId: this._generateVersionId(),
      documentId: versionToRestore.documentId,
      versionNumber: newVersionNumber,
      majorVersion: latestVersion ? latestVersion.majorVersion : 1,
      minorVersion: latestVersion ? (latestVersion.minorVersion || 0) + 1 : 0,
      storageReference: {
        provider: 'zerodb',
        fileKey: uploadResult.fileKey || fileKey,
        bucket: 'documents'
      },
      changeSummary: changeSummary || `Restored from version ${versionToRestore.versionNumber}`,
      changeDescription: `Content restored from version ${versionToRestore.versionNumber}`,
      author,
      originalFilename: versionToRestore.originalFilename,
      mimeType: versionToRestore.mimeType,
      fileSize: versionToRestore.fileSize,
      fileHash: versionToRestore.fileHash,
      previousVersion: latestVersion ? latestVersion._id : null,
      nextVersion: null,
      status: 'draft',
      metadata: {
        ...versionToRestore.metadata,
        restoredFrom: versionId
      },
      createdBy: author
    };

    // Save the new version
    const savedVersion = await databaseAdapter.create('DocumentVersion', versionRecord);

    // Update previous version's nextVersion reference
    if (latestVersion) {
      await databaseAdapter.findByIdAndUpdate(
        'DocumentVersion',
        latestVersion._id,
        { nextVersion: savedVersion._id },
        { new: true }
      );
    }

    return savedVersion;
  }

  /**
   * Archive a specific version
   * @param {string} versionId - Version ID to archive
   * @returns {Promise<Object>} Archived version
   */
  async archiveVersion(versionId) {
    const result = await databaseAdapter.findByIdAndUpdate(
      'DocumentVersion',
      versionId,
      { status: 'archived' },
      { new: true }
    );

    if (!result) {
      throw new Error('Version not found');
    }

    return result;
  }

  /**
   * Archive old versions keeping specified number of recent versions
   * @param {string} documentId - Document ID
   * @param {Object} options - Archive options
   * @returns {Promise<Object>} Archive result
   */
  async archiveOldVersions(documentId, options = {}) {
    const { keepLatest = 5 } = options;

    // Get all versions sorted by version number descending
    const allVersions = await databaseAdapter.find(
      'DocumentVersion',
      { documentId },
      { sort: { versionNumber: -1 } }
    );

    if (allVersions.length <= keepLatest) {
      return { archivedCount: 0 };
    }

    // Archive versions beyond keepLatest (excluding already archived)
    const versionsToArchive = allVersions
      .slice(keepLatest)
      .filter(v => v.status !== 'archived' && v.status !== 'deleted');

    let archivedCount = 0;
    for (const version of versionsToArchive) {
      await databaseAdapter.findByIdAndUpdate(
        'DocumentVersion',
        version._id,
        { status: 'archived' },
        { new: true }
      );
      archivedCount++;
    }

    return { archivedCount };
  }

  /**
   * Delete a version (soft or hard delete)
   * @param {string} versionId - Version ID to delete
   * @param {Object} options - Delete options
   * @returns {Promise<Object>} Delete result
   */
  async deleteVersion(versionId, options = {}) {
    const { hard = false } = options;

    if (!hard) {
      // Soft delete - just update status
      const result = await databaseAdapter.findByIdAndUpdate(
        'DocumentVersion',
        versionId,
        { status: 'deleted' },
        { new: true }
      );

      if (!result) {
        throw new Error('Version not found');
      }

      return result;
    }

    // Hard delete
    const version = await databaseAdapter.findById('DocumentVersion', versionId);
    if (!version) {
      throw new Error('Version not found');
    }

    // Update linked list references
    if (version.previousVersion) {
      await databaseAdapter.findByIdAndUpdate(
        'DocumentVersion',
        version.previousVersion,
        { nextVersion: version.nextVersion },
        { new: true }
      );
    }

    if (version.nextVersion) {
      await databaseAdapter.findByIdAndUpdate(
        'DocumentVersion',
        version.nextVersion,
        { previousVersion: version.previousVersion },
        { new: true }
      );
    }

    // Delete file from storage
    if (version.storageReference && version.storageReference.fileKey) {
      try {
        await fileStorageService.deleteFile(version.storageReference.fileKey);
      } catch (error) {
        console.error('Failed to delete file from storage:', error.message);
      }
    }

    // Delete the version record
    await databaseAdapter.findByIdAndDelete('DocumentVersion', versionId);

    return { deleted: true, versionId };
  }

  /**
   * Publish a version (change status to published)
   * @param {string} versionId - Version ID to publish
   * @returns {Promise<Object>} Published version
   */
  async publishVersion(versionId) {
    const result = await databaseAdapter.findByIdAndUpdate(
      'DocumentVersion',
      versionId,
      { status: 'published' },
      { new: true }
    );

    if (!result) {
      throw new Error('Version not found');
    }

    return result;
  }

  /**
   * Update version metadata
   * @param {string} versionId - Version ID
   * @param {Object} metadata - New metadata
   * @param {Object} options - Update options
   * @returns {Promise<Object>} Updated version
   */
  async updateVersionMetadata(versionId, metadata, options = {}) {
    const { merge = false } = options;

    let finalMetadata = metadata;

    if (merge) {
      const existing = await databaseAdapter.findById('DocumentVersion', versionId);
      if (existing) {
        finalMetadata = { ...(existing.metadata || {}), ...metadata };
      }
    }

    const result = await databaseAdapter.findByIdAndUpdate(
      'DocumentVersion',
      versionId,
      { metadata: finalMetadata },
      { new: true }
    );

    if (!result) {
      throw new Error('Version not found');
    }

    return result;
  }

  /**
   * Download version content
   * @param {string} versionId - Version ID
   * @returns {Promise<Object>} Download result with data and metadata
   */
  async downloadVersionContent(versionId) {
    const version = await databaseAdapter.findById('DocumentVersion', versionId);

    if (!version) {
      throw new Error('Version not found');
    }

    if (!version.storageReference || !version.storageReference.fileKey) {
      throw new Error('No storage reference for this version');
    }

    const downloadResult = await fileStorageService.downloadFile(
      version.storageReference.fileKey,
      { includeMetadata: true }
    );

    return {
      data: downloadResult.data,
      contentType: version.mimeType,
      fileName: version.originalFilename,
      fileSize: version.fileSize,
      versionNumber: version.versionNumber
    };
  }
}

module.exports = new DocumentVersionService();

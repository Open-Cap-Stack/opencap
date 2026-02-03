/**
 * DocumentVersion Controller
 * Issue #98: Implement Document Version Control
 *
 * API controller for managing document versions including:
 * - CRUD operations for versions
 * - Version history and comparison
 * - Restore and archive functionality
 */

const documentVersionService = require('../services/documentVersionService');

/**
 * Create a new version of a document
 */
exports.createVersion = async (req, res) => {
  try {
    // Validate file upload
    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    // Validate required fields
    const { documentId, changeSummary, author } = req.body;
    if (!documentId) {
      return res.status(400).json({ error: 'documentId is required' });
    }

    const versionData = {
      changeSummary: changeSummary || 'New version',
      changeDescription: req.body.changeDescription,
      author: author || req.body.userId || 'system',
      originalFilename: req.file.originalname,
      mimeType: req.file.mimetype,
      majorVersionBump: req.body.majorVersionBump === 'true' || req.body.majorVersionBump === true,
      metadata: req.body.metadata ? JSON.parse(req.body.metadata) : {}
    };

    const version = await documentVersionService.createVersion(
      documentId,
      req.file.buffer,
      versionData
    );

    res.status(201).json(version);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get version history for a document
 */
exports.getVersionHistory = async (req, res) => {
  try {
    const { documentId } = req.params;
    const options = {
      skip: req.query.skip ? parseInt(req.query.skip, 10) : 0,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 100,
      status: req.query.status
    };

    const history = await documentVersionService.getVersionHistory(documentId, options);

    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get a specific version by ID
 */
exports.getVersionById = async (req, res) => {
  try {
    const { versionId } = req.params;
    const version = await documentVersionService.getVersionById(versionId);

    if (!version) {
      return res.status(404).json({ message: 'Version not found' });
    }

    res.status(200).json(version);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get the latest version of a document
 */
exports.getLatestVersion = async (req, res) => {
  try {
    const { documentId } = req.params;
    const options = {
      status: req.query.status
    };

    const version = await documentVersionService.getLatestVersion(documentId, options);

    if (!version) {
      return res.status(404).json({ message: 'No versions found' });
    }

    res.status(200).json(version);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get a specific version by document ID and version number
 */
exports.getVersionByNumber = async (req, res) => {
  try {
    const { documentId, versionNumber } = req.params;
    const version = await documentVersionService.getVersionByNumber(
      documentId,
      parseInt(versionNumber, 10)
    );

    if (!version) {
      return res.status(404).json({ message: 'Version not found' });
    }

    res.status(200).json(version);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Compare two versions
 */
exports.compareVersions = async (req, res) => {
  try {
    const { versionId1, versionId2 } = req.params;
    const comparison = await documentVersionService.compareVersions(versionId1, versionId2);

    res.status(200).json(comparison);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Restore a previous version
 */
exports.restoreVersion = async (req, res) => {
  try {
    const { versionId } = req.params;
    const { author, changeSummary } = req.body;

    if (!author) {
      return res.status(400).json({ error: 'author is required' });
    }

    const restoredVersion = await documentVersionService.restoreVersion(versionId, {
      author,
      changeSummary
    });

    res.status(201).json(restoredVersion);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Archive a specific version
 */
exports.archiveVersion = async (req, res) => {
  try {
    const { versionId } = req.params;
    const archivedVersion = await documentVersionService.archiveVersion(versionId);

    res.status(200).json(archivedVersion);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Archive old versions for a document
 */
exports.archiveOldVersions = async (req, res) => {
  try {
    const { documentId } = req.params;
    const keepLatest = req.body.keepLatest ? parseInt(req.body.keepLatest, 10) : 5;

    const result = await documentVersionService.archiveOldVersions(documentId, {
      keepLatest
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete a version
 */
exports.deleteVersion = async (req, res) => {
  try {
    const { versionId } = req.params;
    const hard = req.query.hard === 'true';

    const result = await documentVersionService.deleteVersion(versionId, { hard });

    res.status(200).json({
      message: hard ? 'Version permanently deleted' : 'Version marked as deleted',
      ...result
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Publish a version
 */
exports.publishVersion = async (req, res) => {
  try {
    const { versionId } = req.params;
    const publishedVersion = await documentVersionService.publishVersion(versionId);

    res.status(200).json(publishedVersion);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update version metadata
 */
exports.updateVersionMetadata = async (req, res) => {
  try {
    const { versionId } = req.params;
    const { metadata, merge } = req.body;

    if (!metadata) {
      return res.status(400).json({ error: 'metadata is required' });
    }

    const updatedVersion = await documentVersionService.updateVersionMetadata(
      versionId,
      metadata,
      { merge: merge === true }
    );

    res.status(200).json(updatedVersion);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Download version content
 */
exports.downloadVersion = async (req, res) => {
  try {
    const { versionId } = req.params;
    const downloadResult = await documentVersionService.downloadVersionContent(versionId);

    res.setHeader('Content-Type', downloadResult.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${downloadResult.fileName}"`
    );
    res.setHeader('Content-Length', downloadResult.fileSize);

    res.status(200).send(downloadResult.data);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('No storage')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

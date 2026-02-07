/**
 * DocumentVersion Model
 * Issue #98: Implement Document Version Control
 *
 * Data model for tracking document versions with support for:
 * - Semantic and incremental versioning
 * - File storage references (MinIO/ZeroDB)
 * - Linked list for version history navigation
 * - Status tracking and integrity verification
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid storage providers
const STORAGE_PROVIDERS = ['zerodb', 'minio', 's3', 'local'];

// Valid statuses
const VALID_STATUSES = ['draft', 'published', 'archived', 'deleted'];

// Schema definition for documentation and validation
const documentVersionSchema = {
  versionId: { type: 'string', required: true, unique: true },
  documentId: { type: 'string', required: true },
  versionNumber: { type: 'number', required: true, default: 1 },
  majorVersion: { type: 'number', default: 1 },
  minorVersion: { type: 'number', default: 0 },
  storageReference: {
    type: 'object',
    required: true,
    default: {
      provider: 'zerodb',
      fileKey: null,
      bucket: 'documents',
      region: null,
      url: null
    }
  },
  changeSummary: { type: 'string', required: true },
  changeDescription: { type: 'string', default: '' },
  author: { type: 'string', required: true },
  originalFilename: { type: 'string', required: true },
  mimeType: { type: 'string', required: true, default: 'application/octet-stream' },
  fileSize: { type: 'number', required: true },
  fileHash: { type: 'string', required: true },
  previousVersion: { type: 'string', default: null },
  nextVersion: { type: 'string', default: null },
  status: { type: 'string', enum: VALID_STATUSES, default: 'draft' },
  metadata: { type: 'object', default: {} },
  publishedAt: { type: 'date', default: null },
  archivedAt: { type: 'date', default: null },
  createdBy: { type: 'string', default: null },
  updatedBy: { type: 'string', default: null },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('document_versions', documentVersionSchema);

// Extended DocumentVersion model with business logic
const DocumentVersion = {
  ...baseModel,
  tableName: 'document_versions',
  schema: documentVersionSchema,

  // Export constants
  STORAGE_PROVIDERS,
  VALID_STATUSES,

  /**
   * Create a new document version with defaults
   * @param {Object} data - Version data
   * @returns {Object} Created version
   */
  async create(data) {
    if (!data.versionId) {
      data.versionId = `DV-${uuidv4().slice(0, 8).toUpperCase()}`;
    }

    if (!data.versionNumber) {
      data.versionNumber = 1;
    }

    if (!data.status) {
      data.status = 'draft';
    }

    // Track status change timestamps
    if (data.status === 'published' && !data.publishedAt) {
      data.publishedAt = new Date().toISOString();
    }
    if (data.status === 'archived' && !data.archivedAt) {
      data.archivedAt = new Date().toISOString();
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find version by versionId
   * @param {string} versionId - Version ID
   * @returns {Object|null} Version or null
   */
  async findByVersionId(versionId) {
    return baseModel.findOne.call(baseModel, { versionId });
  },

  /**
   * Find versions by document
   * @param {string} documentId - Document ID
   * @param {Object} options - Query options
   * @returns {Array} Versions for document
   */
  async findByDocument(documentId, options = {}) {
    const query = { documentId };
    if (options.status) {
      query.status = options.status;
    }

    let versions = await baseModel.find.call(baseModel, query);

    // Sort by version number descending
    versions.sort((a, b) => b.versionNumber - a.versionNumber);

    if (options.skip) {
      versions = versions.slice(options.skip);
    }

    if (options.limit) {
      versions = versions.slice(0, options.limit);
    }

    return versions;
  },

  /**
   * Find latest version for document
   * @param {string} documentId - Document ID
   * @param {Object} options - Query options
   * @returns {Object|null} Latest version or null
   */
  async findLatestVersion(documentId, options = {}) {
    const query = { documentId };
    if (options.status) {
      query.status = options.status;
    }

    const versions = await baseModel.find.call(baseModel, query);
    if (versions.length === 0) return null;

    return versions.reduce((latest, v) =>
      v.versionNumber > latest.versionNumber ? v : latest
    );
  },

  /**
   * Find version by number
   * @param {string} documentId - Document ID
   * @param {number} versionNumber - Version number
   * @returns {Object|null} Version or null
   */
  async findByVersionNumber(documentId, versionNumber) {
    return baseModel.findOne.call(baseModel, { documentId, versionNumber });
  },

  /**
   * Get semantic version string
   * @param {Object} version - Version object
   * @returns {string} Semantic version
   */
  getSemanticVersion(version) {
    return `${version.majorVersion}.${version.minorVersion}`;
  },

  /**
   * Check if first version
   * @param {Object} version - Version object
   * @returns {boolean} True if first version
   */
  isFirstVersion(version) {
    return version.previousVersion === null;
  },

  /**
   * Check if latest version
   * @param {Object} version - Version object
   * @returns {boolean} True if latest version
   */
  isLatestVersion(version) {
    return version.nextVersion === null;
  },

  /**
   * Get display version
   * @param {Object} version - Version object
   * @returns {string} Display version
   */
  getDisplayVersion(version) {
    return `v${version.versionNumber} (${this.getSemanticVersion(version)})`;
  },

  /**
   * Publish version
   * @param {string} versionId - Version ID
   * @returns {Object} Updated version
   */
  async publish(versionId) {
    return baseModel.updateOne.call(baseModel,
      { versionId },
      {
        $set: {
          status: 'published',
          publishedAt: new Date().toISOString()
        }
      }
    );
  },

  /**
   * Archive version
   * @param {string} versionId - Version ID
   * @returns {Object} Updated version
   */
  async archive(versionId) {
    return baseModel.updateOne.call(baseModel,
      { versionId },
      {
        $set: {
          status: 'archived',
          archivedAt: new Date().toISOString()
        }
      }
    );
  },

  /**
   * Link versions
   * @param {string} previousVersionId - Previous version ID
   * @param {string} nextVersionId - Next version ID
   * @returns {Object} Updated versions
   */
  async linkVersions(previousVersionId, nextVersionId) {
    await baseModel.updateOne.call(baseModel,
      { versionId: previousVersionId },
      { $set: { nextVersion: nextVersionId } }
    );

    return baseModel.updateOne.call(baseModel,
      { versionId: nextVersionId },
      { $set: { previousVersion: previousVersionId } }
    );
  },

  // Expose base model methods
  find: baseModel.find.bind(baseModel),
  findOne: baseModel.findOne.bind(baseModel),
  findById: baseModel.findById.bind(baseModel),
  updateOne: baseModel.updateOne.bind(baseModel),
  updateMany: baseModel.updateMany.bind(baseModel),
  findOneAndUpdate: baseModel.findOneAndUpdate.bind(baseModel),
  findByIdAndUpdate: baseModel.findByIdAndUpdate.bind(baseModel),
  deleteOne: baseModel.deleteOne.bind(baseModel),
  deleteMany: baseModel.deleteMany.bind(baseModel),
  findOneAndDelete: baseModel.findOneAndDelete.bind(baseModel),
  findByIdAndDelete: baseModel.findByIdAndDelete.bind(baseModel),
  countDocuments: baseModel.countDocuments.bind(baseModel),
  exists: baseModel.exists.bind(baseModel),
  distinct: baseModel.distinct.bind(baseModel),
  aggregate: baseModel.aggregate.bind(baseModel)
};

module.exports = DocumentVersion;

/**
 * DocumentVersion Model
 * Issue #98: Implement Document Version Control
 *
 * Data model for tracking document versions with support for:
 * - Semantic and incremental versioning
 * - File storage references (MinIO/ZeroDB)
 * - Linked list for version history navigation
 * - Status tracking and integrity verification
 */
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Storage reference sub-schema
const storageReferenceSchema = new mongoose.Schema({
  provider: {
    type: String,
    enum: ['zerodb', 'minio', 's3', 'local'],
    required: true,
    default: 'zerodb'
  },
  fileKey: {
    type: String,
    required: true
  },
  bucket: {
    type: String,
    default: 'documents'
  },
  region: {
    type: String
  },
  url: {
    type: String
  }
}, { _id: false });

// Main DocumentVersion Schema
const documentVersionSchema = new mongoose.Schema({
  // Unique version identifier
  versionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => `DV-${uuidv4().slice(0, 8).toUpperCase()}`
  },

  // Reference to the original document
  documentId: {
    type: String,
    required: true,
    index: true
  },

  // Version numbering
  versionNumber: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },

  // Semantic versioning support
  majorVersion: {
    type: Number,
    default: 1,
    min: 1
  },
  minorVersion: {
    type: Number,
    default: 0,
    min: 0
  },

  // File storage reference
  storageReference: {
    type: storageReferenceSchema,
    required: true
  },

  // Change tracking
  changeSummary: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  changeDescription: {
    type: String,
    trim: true,
    maxlength: 5000
  },

  // Author information
  author: {
    type: String,
    required: true,
    index: true
  },

  // File information
  originalFilename: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true,
    default: 'application/octet-stream'
  },
  fileSize: {
    type: Number,
    required: true,
    min: 0
  },
  fileHash: {
    type: String,
    required: true
  },

  // Linked list references for version navigation
  previousVersion: {
    type: String,
    default: null,
    index: true
  },
  nextVersion: {
    type: String,
    default: null,
    index: true
  },

  // Version status
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'deleted'],
    default: 'draft',
    required: true,
    index: true
  },

  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Timestamps for when version was created/updated
  publishedAt: {
    type: Date
  },
  archivedAt: {
    type: Date
  },

  // Audit fields
  createdBy: {
    type: String
  },
  updatedBy: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for efficient queries
documentVersionSchema.index({ documentId: 1, versionNumber: -1 });
documentVersionSchema.index({ documentId: 1, status: 1 });
documentVersionSchema.index({ documentId: 1, status: 1, versionNumber: -1 });
documentVersionSchema.index({ author: 1, createdAt: -1 });

// Virtual for semantic version string
documentVersionSchema.virtual('semanticVersion').get(function() {
  return `${this.majorVersion}.${this.minorVersion}`;
});

// Virtual to check if this is the first version
documentVersionSchema.virtual('isFirstVersion').get(function() {
  return this.previousVersion === null;
});

// Virtual to check if this is the latest version
documentVersionSchema.virtual('isLatestVersion').get(function() {
  return this.nextVersion === null;
});

// Virtual for display version (combines incremental and semantic)
documentVersionSchema.virtual('displayVersion').get(function() {
  return `v${this.versionNumber} (${this.semanticVersion})`;
});

// Pre-save hook for status change tracking
documentVersionSchema.pre('save', function(next) {
  // Track status change timestamps
  if (this.isModified('status')) {
    if (this.status === 'published' && !this.publishedAt) {
      this.publishedAt = new Date();
    }
    if (this.status === 'archived' && !this.archivedAt) {
      this.archivedAt = new Date();
    }
  }
  next();
});

// Static method to find versions by document
documentVersionSchema.statics.findByDocument = function(documentId, options = {}) {
  const query = { documentId };
  if (options.status) {
    query.status = options.status;
  }

  let mongoQuery = this.find(query);

  if (options.sort) {
    mongoQuery = mongoQuery.sort(options.sort);
  } else {
    mongoQuery = mongoQuery.sort({ versionNumber: -1 });
  }

  if (options.skip) {
    mongoQuery = mongoQuery.skip(options.skip);
  }

  if (options.limit) {
    mongoQuery = mongoQuery.limit(options.limit);
  }

  return mongoQuery;
};

// Static method to find latest version
documentVersionSchema.statics.findLatestVersion = function(documentId, options = {}) {
  const query = { documentId };
  if (options.status) {
    query.status = options.status;
  }

  return this.findOne(query).sort({ versionNumber: -1 });
};

// Static method to find version by number
documentVersionSchema.statics.findByVersionNumber = function(documentId, versionNumber) {
  return this.findOne({ documentId, versionNumber });
};

// Instance method to get previous version document
documentVersionSchema.methods.getPreviousVersion = function() {
  if (!this.previousVersion) {
    return Promise.resolve(null);
  }
  return this.constructor.findById(this.previousVersion);
};

// Instance method to get next version document
documentVersionSchema.methods.getNextVersion = function() {
  if (!this.nextVersion) {
    return Promise.resolve(null);
  }
  return this.constructor.findById(this.nextVersion);
};

// Instance method to check if content changed from previous version
documentVersionSchema.methods.hasContentChanged = async function() {
  const prevVersion = await this.getPreviousVersion();
  if (!prevVersion) {
    return true; // First version is always "changed"
  }
  return this.fileHash !== prevVersion.fileHash;
};

const DocumentVersion = mongoose.model('DocumentVersion', documentVersionSchema);

module.exports = DocumentVersion;

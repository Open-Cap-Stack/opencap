/**
 * Document Audit Trail Model
 *
 * Issue #102: Add Document Audit Trail
 *
 * This model stores comprehensive audit records for document activities,
 * ensuring compliance with regulatory requirements and providing
 * complete traceability of all document operations.
 *
 * IMPORTANT: Audit records are immutable (append-only). Updates and
 * deletes are not permitted to maintain audit integrity.
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Valid action types for document audit
const ACTION_TYPES = [
  'created',
  'viewed',
  'downloaded',
  'edited',
  'signed',
  'shared',
  'deleted',
  'restored',
  'access_granted',
  'access_revoked',
  'version_created',
  'commented',
  'archived',
  'unarchived'
];

// Schema for tracking changes (for edits)
const changeSchema = new mongoose.Schema({
  field: {
    type: String,
    required: true
  },
  previousValue: {
    type: mongoose.Schema.Types.Mixed
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed
  }
}, { _id: false });

// Main Document Audit Trail Schema
const documentAuditTrailSchema = new mongoose.Schema({
  // Unique audit entry identifier
  auditId: {
    type: String,
    unique: true,
    default: () => uuidv4(),
    index: true
  },

  // Reference to the document being audited
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true
  },

  // Type of action performed
  actionType: {
    type: String,
    required: true,
    enum: ACTION_TYPES,
    index: true
  },

  // User who performed the action
  actor: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    email: {
      type: String
    },
    name: {
      type: String
    },
    role: {
      type: String
    }
  },

  // Timestamp of the action
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },

  // Client IP address
  ipAddress: {
    type: String,
    required: true
  },

  // User agent string
  userAgent: {
    type: String
  },

  // Changes made (for edits)
  changes: {
    type: [changeSchema],
    default: []
  },

  // Previous values snapshot (for significant changes)
  previousValues: {
    type: mongoose.Schema.Types.Mixed
  },

  // New values snapshot (for significant changes)
  newValues: {
    type: mongoose.Schema.Types.Mixed
  },

  // Additional context and metadata
  metadata: {
    // Session information
    sessionId: String,

    // Company context
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      index: true
    },

    // Request context
    requestId: String,

    // Document version at time of action
    documentVersion: Number,

    // Action-specific details
    details: {
      type: mongoose.Schema.Types.Mixed
    },

    // Reason for action (if provided)
    reason: String,

    // Related entities
    relatedDocuments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document'
    }],

    // Tags for categorization
    tags: [String],

    // Geographic location (if available)
    location: {
      country: String,
      region: String,
      city: String
    }
  },

  // For shared documents - who was it shared with
  sharedWith: {
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    emails: [String],
    accessLevel: {
      type: String,
      enum: ['view', 'edit', 'admin']
    },
    expiresAt: Date
  },

  // Signature details (for signed action)
  signatureDetails: {
    signatureId: String,
    signatureType: String,
    signedAt: Date,
    certificateInfo: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }, // Only track creation, not updates
  collection: 'documentaudittrails'
});

// Compound indexes for common queries
documentAuditTrailSchema.index({ documentId: 1, timestamp: -1 });
documentAuditTrailSchema.index({ 'actor.userId': 1, timestamp: -1 });
documentAuditTrailSchema.index({ actionType: 1, timestamp: -1 });
documentAuditTrailSchema.index({ 'metadata.companyId': 1, timestamp: -1 });
documentAuditTrailSchema.index({ documentId: 1, actionType: 1, timestamp: -1 });

// Prevent updates to maintain immutability
documentAuditTrailSchema.pre('findOneAndUpdate', function(next) {
  const error = new Error('Audit records are immutable and cannot be updated');
  error.name = 'ImmutabilityError';
  next(error);
});

documentAuditTrailSchema.pre('updateOne', function(next) {
  const error = new Error('Audit records are immutable and cannot be updated');
  error.name = 'ImmutabilityError';
  next(error);
});

documentAuditTrailSchema.pre('updateMany', function(next) {
  const error = new Error('Audit records are immutable and cannot be updated');
  error.name = 'ImmutabilityError';
  next(error);
});

// Static method to find audit trail by document
documentAuditTrailSchema.statics.findByDocument = function(documentId, options = {}) {
  const query = this.find({ documentId });

  if (options.actionType) {
    query.where('actionType').equals(options.actionType);
  }

  if (options.startDate) {
    query.where('timestamp').gte(new Date(options.startDate));
  }

  if (options.endDate) {
    query.where('timestamp').lte(new Date(options.endDate));
  }

  if (options.limit) {
    query.limit(options.limit);
  }

  return query.sort({ timestamp: -1 });
};

// Static method to find audit entries by user
documentAuditTrailSchema.statics.findByUser = function(userId, options = {}) {
  const query = this.find({ 'actor.userId': userId });

  if (options.actionType) {
    query.where('actionType').equals(options.actionType);
  }

  if (options.startDate) {
    query.where('timestamp').gte(new Date(options.startDate));
  }

  if (options.endDate) {
    query.where('timestamp').lte(new Date(options.endDate));
  }

  if (options.limit) {
    query.limit(options.limit);
  }

  return query.sort({ timestamp: -1 });
};

// Static method to find audit entries by date range
documentAuditTrailSchema.statics.findByDateRange = function(startDate, endDate, options = {}) {
  const query = this.find({
    timestamp: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  });

  if (options.documentId) {
    query.where('documentId').equals(options.documentId);
  }

  if (options.actionType) {
    query.where('actionType').equals(options.actionType);
  }

  if (options.companyId) {
    query.where('metadata.companyId').equals(options.companyId);
  }

  if (options.limit) {
    query.limit(options.limit);
  }

  return query.sort({ timestamp: -1 });
};

// Static method to get action counts by type
documentAuditTrailSchema.statics.getActionCounts = function(documentId, startDate = null, endDate = null) {
  const match = { documentId: new mongoose.Types.ObjectId(documentId) };

  if (startDate || endDate) {
    match.timestamp = {};
    if (startDate) match.timestamp.$gte = new Date(startDate);
    if (endDate) match.timestamp.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: match },
    { $group: { _id: '$actionType', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

// Static method to get recent activity summary
documentAuditTrailSchema.statics.getRecentActivitySummary = function(companyId, days = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        'metadata.companyId': new mongoose.Types.ObjectId(companyId),
        timestamp: { $gte: cutoffDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          actionType: '$actionType'
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.date': -1, count: -1 } }
  ]);
};

// Static method to search audit trail
documentAuditTrailSchema.statics.searchAuditTrail = function(searchParams) {
  const query = {};

  if (searchParams.documentId) {
    query.documentId = searchParams.documentId;
  }

  if (searchParams.userId) {
    query['actor.userId'] = searchParams.userId;
  }

  if (searchParams.actionType) {
    if (Array.isArray(searchParams.actionType)) {
      query.actionType = { $in: searchParams.actionType };
    } else {
      query.actionType = searchParams.actionType;
    }
  }

  if (searchParams.companyId) {
    query['metadata.companyId'] = searchParams.companyId;
  }

  if (searchParams.ipAddress) {
    query.ipAddress = searchParams.ipAddress;
  }

  if (searchParams.startDate || searchParams.endDate) {
    query.timestamp = {};
    if (searchParams.startDate) {
      query.timestamp.$gte = new Date(searchParams.startDate);
    }
    if (searchParams.endDate) {
      query.timestamp.$lte = new Date(searchParams.endDate);
    }
  }

  if (searchParams.keyword) {
    query.$or = [
      { 'metadata.reason': { $regex: searchParams.keyword, $options: 'i' } },
      { 'actor.email': { $regex: searchParams.keyword, $options: 'i' } },
      { 'actor.name': { $regex: searchParams.keyword, $options: 'i' } }
    ];
  }

  let queryBuilder = this.find(query);

  if (searchParams.skip) {
    queryBuilder = queryBuilder.skip(searchParams.skip);
  }

  if (searchParams.limit) {
    queryBuilder = queryBuilder.limit(searchParams.limit);
  }

  return queryBuilder.sort({ timestamp: -1 });
};

// Export action types for use in other modules
documentAuditTrailSchema.statics.ACTION_TYPES = ACTION_TYPES;

const DocumentAuditTrail = mongoose.model('DocumentAuditTrail', documentAuditTrailSchema);

module.exports = DocumentAuditTrail;

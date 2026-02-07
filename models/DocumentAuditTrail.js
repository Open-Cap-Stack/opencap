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
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
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

// Valid access levels
const ACCESS_LEVELS = ['view', 'edit', 'admin'];

// Schema definition for documentation and validation
const documentAuditTrailSchema = {
  auditId: { type: 'string', required: true, unique: true },
  documentId: { type: 'string', required: true },
  actionType: { type: 'string', required: true, enum: ACTION_TYPES },
  actor: {
    type: 'object',
    default: {
      userId: null,
      email: null,
      name: null,
      role: null
    }
  },
  timestamp: { type: 'date', required: true },
  ipAddress: { type: 'string', required: true },
  userAgent: { type: 'string', default: null },
  changes: { type: 'array', default: [] },
  previousValues: { type: 'object', default: null },
  newValues: { type: 'object', default: null },
  metadata: {
    type: 'object',
    default: {
      sessionId: null,
      companyId: null,
      requestId: null,
      documentVersion: null,
      details: null,
      reason: null,
      relatedDocuments: [],
      tags: [],
      location: {
        country: null,
        region: null,
        city: null
      }
    }
  },
  sharedWith: {
    type: 'object',
    default: {
      users: [],
      emails: [],
      accessLevel: null,
      expiresAt: null
    }
  },
  signatureDetails: {
    type: 'object',
    default: {
      signatureId: null,
      signatureType: null,
      signedAt: null,
      certificateInfo: null
    }
  },
  createdAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('document_audit_trails', documentAuditTrailSchema);

// Extended DocumentAuditTrail model with business logic
const DocumentAuditTrail = {
  ...baseModel,
  tableName: 'document_audit_trails',
  schema: documentAuditTrailSchema,

  // Export constants
  ACTION_TYPES,
  ACCESS_LEVELS,

  /**
   * Create a new audit trail entry with defaults
   * IMPORTANT: Audit records are immutable
   * @param {Object} data - Audit data
   * @returns {Object} Created audit entry
   */
  async create(data) {
    if (!data.auditId) {
      data.auditId = uuidv4();
    }

    // Validate action type
    if (!ACTION_TYPES.includes(data.actionType)) {
      throw new Error(`actionType must be one of: ${ACTION_TYPES.join(', ')}`);
    }

    // Set timestamp if not provided
    if (!data.timestamp) {
      data.timestamp = new Date().toISOString();
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find audit trail by document
   * @param {string} documentId - Document ID
   * @param {Object} options - Query options
   * @returns {Array} Audit entries for document
   */
  async findByDocument(documentId, options = {}) {
    const entries = await baseModel.find.call(baseModel, { documentId });

    let filtered = entries;

    if (options.actionType) {
      filtered = filtered.filter(e => e.actionType === options.actionType);
    }

    if (options.startDate) {
      const startDate = new Date(options.startDate);
      filtered = filtered.filter(e => new Date(e.timestamp) >= startDate);
    }

    if (options.endDate) {
      const endDate = new Date(options.endDate);
      filtered = filtered.filter(e => new Date(e.timestamp) <= endDate);
    }

    // Sort by timestamp descending
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  },

  /**
   * Find audit entries by user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array} Audit entries by user
   */
  async findByUser(userId, options = {}) {
    const entries = await baseModel.find.call(baseModel, { 'actor.userId': userId });

    let filtered = entries;

    if (options.actionType) {
      filtered = filtered.filter(e => e.actionType === options.actionType);
    }

    if (options.startDate) {
      const startDate = new Date(options.startDate);
      filtered = filtered.filter(e => new Date(e.timestamp) >= startDate);
    }

    if (options.endDate) {
      const endDate = new Date(options.endDate);
      filtered = filtered.filter(e => new Date(e.timestamp) <= endDate);
    }

    // Sort by timestamp descending
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  },

  /**
   * Find audit entries by date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Query options
   * @returns {Array} Audit entries in range
   */
  async findByDateRange(startDate, endDate, options = {}) {
    const entries = await baseModel.find.call(baseModel, {});

    const start = new Date(startDate);
    const end = new Date(endDate);

    let filtered = entries.filter(e => {
      const timestamp = new Date(e.timestamp);
      return timestamp >= start && timestamp <= end;
    });

    if (options.documentId) {
      filtered = filtered.filter(e => e.documentId === options.documentId);
    }

    if (options.actionType) {
      filtered = filtered.filter(e => e.actionType === options.actionType);
    }

    if (options.companyId) {
      filtered = filtered.filter(e => e.metadata?.companyId === options.companyId);
    }

    // Sort by timestamp descending
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  },

  /**
   * Get action counts by type for a document
   * @param {string} documentId - Document ID
   * @param {Date} startDate - Start date (optional)
   * @param {Date} endDate - End date (optional)
   * @returns {Array} Action counts
   */
  async getActionCounts(documentId, startDate = null, endDate = null) {
    let entries = await baseModel.find.call(baseModel, { documentId });

    if (startDate) {
      const start = new Date(startDate);
      entries = entries.filter(e => new Date(e.timestamp) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      entries = entries.filter(e => new Date(e.timestamp) <= end);
    }

    const counts = {};
    entries.forEach(e => {
      counts[e.actionType] = (counts[e.actionType] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([actionType, count]) => ({ _id: actionType, count }))
      .sort((a, b) => b.count - a.count);
  },

  /**
   * Get recent activity summary
   * @param {string} companyId - Company ID
   * @param {number} days - Number of days
   * @returns {Array} Activity summary
   */
  async getRecentActivitySummary(companyId, days = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const entries = await baseModel.find.call(baseModel, { 'metadata.companyId': companyId });

    const filtered = entries.filter(e => new Date(e.timestamp) >= cutoffDate);

    const summary = {};
    filtered.forEach(e => {
      const date = new Date(e.timestamp).toISOString().split('T')[0];
      const key = `${date}_${e.actionType}`;
      if (!summary[key]) {
        summary[key] = { date, actionType: e.actionType, count: 0 };
      }
      summary[key].count++;
    });

    return Object.values(summary).sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.count - a.count;
    });
  },

  /**
   * Search audit trail with multiple criteria
   * @param {Object} searchParams - Search parameters
   * @returns {Array} Matching entries
   */
  async searchAuditTrail(searchParams) {
    let entries = await baseModel.find.call(baseModel, {});

    if (searchParams.documentId) {
      entries = entries.filter(e => e.documentId === searchParams.documentId);
    }

    if (searchParams.userId) {
      entries = entries.filter(e => e.actor?.userId === searchParams.userId);
    }

    if (searchParams.actionType) {
      if (Array.isArray(searchParams.actionType)) {
        entries = entries.filter(e => searchParams.actionType.includes(e.actionType));
      } else {
        entries = entries.filter(e => e.actionType === searchParams.actionType);
      }
    }

    if (searchParams.companyId) {
      entries = entries.filter(e => e.metadata?.companyId === searchParams.companyId);
    }

    if (searchParams.ipAddress) {
      entries = entries.filter(e => e.ipAddress === searchParams.ipAddress);
    }

    if (searchParams.startDate) {
      const start = new Date(searchParams.startDate);
      entries = entries.filter(e => new Date(e.timestamp) >= start);
    }

    if (searchParams.endDate) {
      const end = new Date(searchParams.endDate);
      entries = entries.filter(e => new Date(e.timestamp) <= end);
    }

    if (searchParams.keyword) {
      const keyword = searchParams.keyword.toLowerCase();
      entries = entries.filter(e =>
        (e.metadata?.reason && e.metadata.reason.toLowerCase().includes(keyword)) ||
        (e.actor?.email && e.actor.email.toLowerCase().includes(keyword)) ||
        (e.actor?.name && e.actor.name.toLowerCase().includes(keyword))
      );
    }

    // Sort by timestamp descending
    entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (searchParams.skip) {
      entries = entries.slice(searchParams.skip);
    }

    if (searchParams.limit) {
      entries = entries.slice(0, searchParams.limit);
    }

    return entries;
  },

  // Note: Update and delete operations are intentionally omitted for immutability
  // Only expose read operations for audit integrity
  find: baseModel.find.bind(baseModel),
  findOne: baseModel.findOne.bind(baseModel),
  findById: baseModel.findById.bind(baseModel),
  countDocuments: baseModel.countDocuments.bind(baseModel),
  exists: baseModel.exists.bind(baseModel),
  distinct: baseModel.distinct.bind(baseModel),
  aggregate: baseModel.aggregate.bind(baseModel)
};

module.exports = DocumentAuditTrail;

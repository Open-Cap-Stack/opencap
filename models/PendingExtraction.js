'use strict';

/**
 * PendingExtraction Model
 * Issue #616: Structured extraction from data room PDFs into draft OpenCap records
 *
 * Stores AI-extracted records in a pending review queue before they are
 * committed to the main tables (Stakeholder, ShareClass, EquityGrant, SAFE).
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid record types that can be extracted
const RECORD_TYPES = ['stakeholder', 'shareClass', 'equityGrant', 'safe'];

// Extraction review statuses
const EXTRACTION_STATUSES = ['pending', 'approved', 'rejected'];

const pendingExtractionSchema = {
  extractionId: { type: 'string', required: true, unique: true },
  dataRoomId: { type: 'string', required: true, index: true },
  companyId: { type: 'string', required: true, index: true },
  recordType: { type: 'string', required: true, enum: RECORD_TYPES },
  extractedData: { type: 'object', required: true },
  sourceDocument: { type: 'string' },
  confidence: { type: 'number', min: 0, max: 1, default: 0 },
  status: { type: 'string', enum: EXTRACTION_STATUSES, default: 'pending' },
  reviewedBy: { type: 'string' },
  reviewedAt: { type: 'string' },
  rejectionReason: { type: 'string' },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' },
};

const baseModel = createModel('pending_extractions', pendingExtractionSchema);

const PendingExtraction = {
  ...baseModel,
  tableName: 'pending_extractions',
  schema: pendingExtractionSchema,

  RECORD_TYPES,
  EXTRACTION_STATUSES,

  /**
   * Create a new pending extraction record
   * @param {Object} data - Extraction data
   * @returns {Object} Created record
   */
  async create(data) {
    if (!data.extractionId) {
      data.extractionId = `ext_${uuidv4()}`;
    }
    if (!data.status) {
      data.status = 'pending';
    }
    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find extraction by extractionId
   * @param {string} extractionId
   * @returns {Object|null}
   */
  async findByExtractionId(extractionId) {
    return baseModel.findOne.call(baseModel, { extractionId });
  },

  /**
   * Find all extractions for a data room
   * @param {string} dataRoomId
   * @param {string} [status] - Optional status filter
   * @returns {Array}
   */
  async findByDataRoom(dataRoomId, status = null) {
    const query = { dataRoomId };
    if (status) query.status = status;
    return baseModel.find.call(baseModel, query);
  },

  // Expose base model methods
  find: baseModel.find.bind(baseModel),
  findOne: baseModel.findOne.bind(baseModel),
  findById: baseModel.findById.bind(baseModel),
  updateOne: baseModel.updateOne.bind(baseModel),
  deleteOne: baseModel.deleteOne.bind(baseModel),
  countDocuments: baseModel.countDocuments.bind(baseModel),
  exists: baseModel.exists.bind(baseModel),
};

module.exports = PendingExtraction;

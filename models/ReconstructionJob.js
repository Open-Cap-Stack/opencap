/**
 * ReconstructionJob Model
 * Issue #624: AI Data Room Reconstruction — Job tracking model
 *
 * Tracks the lifecycle of an AI-powered data room reconstruction job
 * through a 4-phase agent pipeline (scout → classify → gap analysis → finalize).
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid job statuses
const jobStatuses = ['queued', 'intake', 'running', 'complete', 'failed', 'cancelled'];

// Schema definition for documentation and validation
const reconstructionJobSchema = {
  jobId:        { type: 'string', required: true, unique: true },
  companyId:    { type: 'string', required: true },
  userId:       { type: 'string', required: true },
  status:       { type: 'string', enum: jobStatuses, default: 'queued' },
  phase:        { type: 'number', default: 0 },
  intakeConfig: {
    type: 'object',
    default: {
      companyName:      '',
      founderEmail:     '',
      targetDataRoomId: null,
      sources: {
        gmail:  { enabled: false, oauthCode: null },
        drive:  { enabled: false, oauthCode: null },
        carta:  { enabled: false, oauthCode: null },
        stripe: { enabled: false, oauthCode: null }
      }
    }
  },
  uploadedFiles: {
    type: 'array',
    default: []
    // each entry: { originalName, mimeType, sizeBytes, extractedFrom }
  },
  progress: {
    type: 'object',
    default: {
      scoutComplete:       false,
      classifyComplete:    false,
      gapAnalysisComplete: false,
      finalizeComplete:    false,
      agentsRun:           []
    }
  },
  result:    { type: 'object', default: null },
  error:     { type: 'string', default: null },
  createdAt: { type: 'string' },
  updatedAt: { type: 'string' }
};

// Create the base ZeroDB model
const baseModel = createModel('reconstruction_jobs', reconstructionJobSchema);

// Extended ReconstructionJob model with business logic
const ReconstructionJob = {
  ...baseModel,
  tableName:           'reconstruction_jobs',
  schema:              reconstructionJobSchema,
  jobStatuses,

  /**
   * Create a new reconstruction job with defaults applied.
   * @param {Object} data - Job data (companyId, userId, intakeConfig required)
   * @returns {Promise<Object>} Created job record
   */
  async createJob(data) {
    if (!data.jobId) data.jobId = `rj_${uuidv4()}`;
    if (!data.status) data.status = 'queued';
    if (!data.phase && data.phase !== 0) data.phase = 0;
    if (!data.uploadedFiles) data.uploadedFiles = [];
    if (!data.intakeConfig) {
      data.intakeConfig = {
        companyName:      '',
        founderEmail:     '',
        targetDataRoomId: null,
        sources: {
          gmail:  { enabled: false, oauthCode: null },
          drive:  { enabled: false, oauthCode: null },
          carta:  { enabled: false, oauthCode: null },
          stripe: { enabled: false, oauthCode: null }
        }
      };
    }
    if (!data.progress) {
      data.progress = {
        scoutComplete:       false,
        classifyComplete:    false,
        gapAnalysisComplete: false,
        finalizeComplete:    false,
        agentsRun:           []
      };
    }
    if (data.result === undefined) data.result = null;
    if (data.error  === undefined) data.error  = null;
    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find a job by its jobId (primary key).
   * @param {string} jobId
   * @returns {Promise<Object|null>}
   */
  async findByJobId(jobId) {
    return baseModel.findOne.call(baseModel, { jobId });
  },

  /**
   * Find all jobs for a company.
   * @param {string} companyId
   * @param {Object} options - find options (skip, limit, sort)
   * @returns {Promise<Array>}
   */
  async findByCompany(companyId, options = {}) {
    return baseModel.find.call(baseModel, { companyId }, options);
  },

  /**
   * Update status, phase, and progress atomically.
   * @param {string} jobId
   * @param {string} status - new status from jobStatuses enum
   * @param {number} phase  - current pipeline phase (0-4)
   * @param {Object} progress - partial progress overrides
   * @returns {Promise<Object>}
   */
  async updateStatus(jobId, status, phase, progress) {
    const updates = { status, phase };
    if (progress !== undefined) updates.progress = progress;
    return baseModel.updateOne.call(baseModel, { jobId }, { $set: updates });
  },

  /**
   * Store the final result on a completed job.
   * @param {string} jobId
   * @param {Object} result - ReconstructionResult object
   * @returns {Promise<Object>}
   */
  async setResult(jobId, result) {
    return baseModel.updateOne.call(baseModel, { jobId }, {
      $set: { result, status: 'complete' }
    });
  },

  /**
   * Record an error and mark the job as failed.
   * @param {string} jobId
   * @param {string} error - error message
   * @returns {Promise<Object>}
   */
  async setError(jobId, error) {
    return baseModel.updateOne.call(baseModel, { jobId }, {
      $set: { error, status: 'failed' }
    });
  },

  // Expose base methods directly
  find:           baseModel.find.bind(baseModel),
  findOne:        baseModel.findOne.bind(baseModel),
  findById:       baseModel.findById.bind(baseModel),
  updateOne:      baseModel.updateOne.bind(baseModel),
  deleteOne:      baseModel.deleteOne.bind(baseModel),
  countDocuments: baseModel.countDocuments.bind(baseModel),
  exists:         baseModel.exists.bind(baseModel)
};

module.exports = ReconstructionJob;

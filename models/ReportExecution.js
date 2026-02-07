/**
 * ReportExecution Model
 * Issue #112: Create Report Scheduling System
 *
 * Data model for tracking report execution history with support for:
 * - Execution status tracking
 * - File storage metadata
 * - Delivery status per recipient
 * - Error tracking
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid statuses
const VALID_STATUSES = ['pending', 'running', 'completed', 'failed'];

// Valid delivery statuses
const DELIVERY_STATUSES = ['pending', 'delivered', 'failed'];

// Schema definition for documentation and validation
const reportExecutionSchema = {
  executionId: { type: 'string', required: true, unique: true },
  scheduleId: { type: 'string', required: true },
  startedAt: { type: 'date', required: true },
  completedAt: { type: 'date', default: null },
  status: { type: 'string', enum: VALID_STATUSES, default: 'pending' },
  fileUrl: { type: 'string', default: null },
  fileSize: { type: 'number', default: null },
  fileName: { type: 'string', default: null },
  error: { type: 'string', default: null },
  deliveryStatus: { type: 'array', default: [] },
  reportParameters: { type: 'object', default: {} },
  metadata: { type: 'object', default: {} },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('report_executions', reportExecutionSchema);

// Extended ReportExecution model with business logic
const ReportExecution = {
  ...baseModel,
  tableName: 'report_executions',
  schema: reportExecutionSchema,

  // Export constants
  VALID_STATUSES,
  DELIVERY_STATUSES,

  /**
   * Create a new report execution with defaults
   * @param {Object} data - Execution data
   * @returns {Object} Created execution
   */
  async create(data) {
    if (!data.executionId) {
      data.executionId = `exec_${uuidv4()}`;
    }

    if (!data.startedAt) {
      data.startedAt = new Date().toISOString();
    }

    if (!data.status) {
      data.status = 'pending';
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find execution by executionId
   * @param {string} executionId - Execution ID
   * @returns {Object|null} Execution or null
   */
  async findByExecutionId(executionId) {
    return baseModel.findOne.call(baseModel, { executionId });
  },

  /**
   * Find executions by schedule
   * @param {string} scheduleId - Schedule ID
   * @param {Object} options - Query options
   * @returns {Array} Executions for schedule
   */
  async findBySchedule(scheduleId, options = {}) {
    const query = { scheduleId };
    if (options.status) {
      query.status = options.status;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Get execution duration in ms
   * @param {Object} execution - Execution object
   * @returns {number|null} Duration in ms
   */
  getDuration(execution) {
    if (!execution.startedAt) return null;
    const endTime = execution.completedAt ? new Date(execution.completedAt) : new Date();
    return endTime.getTime() - new Date(execution.startedAt).getTime();
  },

  /**
   * Check if execution is complete
   * @param {Object} execution - Execution object
   * @returns {boolean} True if complete
   */
  isComplete(execution) {
    return execution.status === 'completed' || execution.status === 'failed';
  },

  /**
   * Get delivery success rate
   * @param {Object} execution - Execution object
   * @returns {number|null} Success rate percentage
   */
  getDeliverySuccessRate(execution) {
    if (!execution.deliveryStatus || execution.deliveryStatus.length === 0) {
      return null;
    }
    const delivered = execution.deliveryStatus.filter(d => d.status === 'delivered').length;
    return (delivered / execution.deliveryStatus.length) * 100;
  },

  /**
   * Start execution
   * @param {string} executionId - Execution ID
   * @returns {Object} Updated execution
   */
  async start(executionId) {
    return baseModel.updateOne.call(baseModel,
      { executionId },
      { $set: { status: 'running', startedAt: new Date().toISOString() } }
    );
  },

  /**
   * Complete execution
   * @param {string} executionId - Execution ID
   * @param {Object} fileDetails - File details
   * @returns {Object} Updated execution
   */
  async complete(executionId, fileDetails = {}) {
    return baseModel.updateOne.call(baseModel,
      { executionId },
      {
        $set: {
          status: 'completed',
          completedAt: new Date().toISOString(),
          fileUrl: fileDetails.fileUrl,
          fileSize: fileDetails.fileSize,
          fileName: fileDetails.fileName
        }
      }
    );
  },

  /**
   * Mark execution as failed
   * @param {string} executionId - Execution ID
   * @param {string} error - Error message
   * @returns {Object} Updated execution
   */
  async fail(executionId, error) {
    return baseModel.updateOne.call(baseModel,
      { executionId },
      {
        $set: {
          status: 'failed',
          completedAt: new Date().toISOString(),
          error
        }
      }
    );
  },

  /**
   * Update delivery status
   * @param {string} executionId - Execution ID
   * @param {string} recipient - Recipient email
   * @param {string} status - Delivery status
   * @param {string} error - Error message (if failed)
   * @returns {Object} Updated execution
   */
  async updateDeliveryStatus(executionId, recipient, status, error = null) {
    const execution = await this.findByExecutionId(executionId);
    if (!execution) {
      throw new Error('Execution not found');
    }

    const deliveryStatus = execution.deliveryStatus || [];
    const existingIndex = deliveryStatus.findIndex(d => d.recipient === recipient);

    const deliveryEntry = {
      recipient,
      status,
      deliveredAt: status === 'delivered' ? new Date().toISOString() : null,
      error
    };

    if (existingIndex >= 0) {
      deliveryStatus[existingIndex] = deliveryEntry;
    } else {
      deliveryStatus.push(deliveryEntry);
    }

    return baseModel.updateOne.call(baseModel,
      { executionId },
      { $set: { deliveryStatus } }
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

module.exports = ReportExecution;

/**
 * SPVInvestor Model
 * Issue #590: SPV LP Management
 *
 * Manages LP (Limited Partner) investors on a per-SPV basis.
 * Tracks invite status, commitment amounts, and wiring for each investor.
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// Valid investor statuses (lifecycle)
const VALID_STATUSES = ['invited', 'applied', 'committed', 'wired', 'declined'];

const validators = {
  isValidStatus: (status) => VALID_STATUSES.includes(status),
  isValidEmail: (email) => {
    if (!email || typeof email !== 'string') return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
};

// Schema definition for documentation and validation
const spvInvestorSchema = {
  spvId: { type: 'string', required: true },
  userId: { type: 'string' },
  email: { type: 'string', required: true },
  name: { type: 'string', required: true },
  status: { type: 'string', required: true, enum: VALID_STATUSES, default: 'invited' },
  committedAmount: { type: 'number', default: 0 },
  wiredAmount: { type: 'number', default: 0 },
  invitedAt: { type: 'date' },
  committedAt: { type: 'date' },
  wiredAt: { type: 'date' },
  tags: { type: 'array', default: [] },
  accreditation: { type: 'string' },
  notes: { type: 'string' },
  inviteToken: { type: 'string', unique: true },
  inviteTokenExpiry: { type: 'date' },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('spv_investors', spvInvestorSchema);

/**
 * Generate a cryptographically secure invite token.
 * @returns {string} A URL-safe random token
 */
function generateInviteToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Extended SPVInvestor model with business logic
const SPVInvestor = {
  ...baseModel,
  tableName: 'spv_investors',
  schema: spvInvestorSchema,
  validators,
  VALID_STATUSES,
  generateInviteToken,

  /**
   * Create a new SPV investor record with validation
   * @param {Object} data - Investor data
   * @returns {Object} Created investor
   */
  async create(data) {
    if (!data.spvId) {
      throw new Error('spvId is required');
    }
    if (!data.email) {
      throw new Error('email is required');
    }
    if (!data.name) {
      throw new Error('name is required');
    }
    if (!validators.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }
    if (data.status && !validators.isValidStatus(data.status)) {
      throw new Error(`Invalid status. Valid values: ${VALID_STATUSES.join(', ')}`);
    }

    const doc = {
      ...data,
      status: data.status || 'invited',
      committedAmount: data.committedAmount || 0,
      wiredAmount: data.wiredAmount || 0,
      tags: data.tags || [],
      inviteToken: data.inviteToken || generateInviteToken(),
      invitedAt: data.invitedAt || new Date().toISOString()
    };

    return baseModel.create.call(baseModel, doc);
  },

  /**
   * Find all investors for a given SPV
   * @param {string} spvId - SPV identifier
   * @param {Object} filter - Additional filters (e.g. { status: 'committed' })
   * @returns {Array} Matching investors
   */
  async findBySPV(spvId, filter = {}) {
    return baseModel.find.call(baseModel, { spvId, ...filter });
  },

  /**
   * Find an investor by invite token
   * @param {string} token - Invite token
   * @returns {Object|null} Investor or null
   */
  async findByInviteToken(token) {
    return baseModel.findOne.call(baseModel, { inviteToken: token });
  },

  // Expose base model methods
  find: baseModel.find.bind(baseModel),
  findOne: baseModel.findOne.bind(baseModel),
  findById: baseModel.findById.bind(baseModel),
  updateOne: baseModel.updateOne.bind(baseModel),
  findOneAndUpdate: baseModel.findOneAndUpdate.bind(baseModel),
  findByIdAndUpdate: baseModel.findByIdAndUpdate.bind(baseModel),
  deleteOne: baseModel.deleteOne.bind(baseModel),
  findOneAndDelete: baseModel.findOneAndDelete.bind(baseModel),
  findByIdAndDelete: baseModel.findByIdAndDelete.bind(baseModel),
  countDocuments: baseModel.countDocuments.bind(baseModel),
  exists: baseModel.exists.bind(baseModel)
};

module.exports = SPVInvestor;

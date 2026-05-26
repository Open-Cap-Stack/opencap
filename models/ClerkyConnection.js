'use strict';

/**
 * ClerkyConnection Model
 * Issue #662: Clerky OAuth integration
 *
 * Stores encrypted Clerky API credentials per company.
 * Tokens are encrypted at rest using AES-256-GCM (ENCRYPTION_KEY env var).
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

const connectionStatuses = ['active', 'disconnected', 'error'];

const clerkyConnectionSchema = {
  connectionId: { type: 'string', required: true, unique: true },
  companyId: { type: 'string', required: true },
  userId: { type: 'string', required: true },
  clerkyOrgId: { type: 'string', required: true },
  accessToken: { type: 'string', required: true },
  accessTokenIv: { type: 'string', required: true },
  accessTokenTag: { type: 'string', required: true },
  refreshToken: { type: 'string', default: null },
  refreshTokenIv: { type: 'string', default: null },
  refreshTokenTag: { type: 'string', default: null },
  connectedAt: { type: 'string', required: true },
  lastSyncedAt: { type: 'string', default: null },
  status: { type: 'string', enum: connectionStatuses, default: 'active' },
};

const baseModel = createModel('clerky_connections', clerkyConnectionSchema);

const ClerkyConnection = {
  ...baseModel,
  tableName: 'clerky_connections',
  schema: clerkyConnectionSchema,
  connectionStatuses,

  async create(data) {
    if (!data.connectionId) {
      data.connectionId = `clerky_${uuidv4()}`;
    }
    if (!data.status) {
      data.status = 'active';
    }
    if (!data.connectedAt) {
      data.connectedAt = new Date().toISOString();
    }
    return baseModel.create.call(baseModel, data);
  },

  async findByCompanyId(companyId) {
    return baseModel.findOne.call(baseModel, { companyId, status: 'active' });
  },

  async findById(connectionId) {
    return baseModel.findOne.call(baseModel, { connectionId });
  },

  async update(connectionId, data) {
    return baseModel.updateOne.call(baseModel, { connectionId }, { $set: data });
  },

  async delete(connectionId) {
    return baseModel.deleteOne.call(baseModel, { connectionId });
  },

  find: baseModel.find.bind(baseModel),
  findOne: baseModel.findOne.bind(baseModel),
  updateOne: baseModel.updateOne.bind(baseModel),
  deleteOne: baseModel.deleteOne.bind(baseModel),
};

module.exports = ClerkyConnection;

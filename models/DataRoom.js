/**
 * DataRoom Model
 * Issue #194: Build Data Room Backend Infrastructure
 *
 * A comprehensive data room model supporting:
 * - Distinct data room entities with documents
 * - Granular permission management
 * - Activity tracking
 * - Time-limited external access
 * - ZIP export functionality
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// Valid data room statuses
const dataRoomStatuses = ['active', 'archived', 'deleted'];

// Valid permission levels (hierarchical: admin > upload > download > view)
const permissionLevels = ['view', 'download', 'upload', 'admin'];

// Permission hierarchy for access checking
const permissionHierarchy = {
  admin: ['admin', 'upload', 'download', 'view'],
  upload: ['upload', 'download', 'view'],
  download: ['download', 'view'],
  view: ['view']
};

// Schema definition for documentation and validation
const dataRoomSchema = {
  dataRoomId: { type: 'string', required: true, unique: true },
  name: { type: 'string', required: true },
  description: { type: 'string', default: '' },
  ownerCompany: { type: 'string', required: true },
  createdBy: { type: 'string', required: true },
  documents: { type: 'array', default: [] },
  permissions: { type: 'array', default: [] },
  status: { type: 'string', enum: dataRoomStatuses, default: 'active' },
  accessSettings: { type: 'object', default: {} },
  activityLog: { type: 'array', default: [] },
  metadata: { type: 'object', default: {} },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('data_rooms', dataRoomSchema);

// Extended DataRoom model with business logic
const DataRoom = {
  ...baseModel,
  tableName: 'data_rooms',
  schema: dataRoomSchema,
  dataRoomStatuses,
  permissionLevels,
  permissionHierarchy,

  async create(data) {
    if (!data.dataRoomId) data.dataRoomId = `dr_${uuidv4()}`;
    if (!data.status) data.status = 'active';
    if (!data.documents) data.documents = [];
    if (!data.permissions) data.permissions = [];
    if (!data.accessSettings) data.accessSettings = { requireNDA: false, watermarkEnabled: false, downloadEnabled: true, externalAccess: { enabled: false } };
    if (!data.activityLog) data.activityLog = [];
    if (!data.metadata) data.metadata = {};
    return baseModel.create.call(baseModel, data);
  },

  async findByDataRoomId(dataRoomId) {
    return baseModel.findOne.call(baseModel, { dataRoomId });
  },

  async findByCompany(companyId, options = {}) {
    return baseModel.find.call(baseModel, { ownerCompany: companyId }, options);
  },

  hasPermission(dataRoom, userId, requiredLevel) {
    if (dataRoom.createdBy === userId) return true;
    const userPermission = dataRoom.permissions.find(p => p.userId === userId);
    if (!userPermission) return false;
    if (userPermission.expiresAt && new Date(userPermission.expiresAt) < new Date()) return false;
    const grantedLevels = permissionHierarchy[userPermission.level] || [];
    return grantedLevels.includes(requiredLevel);
  },

  async addPermission(dataRoomId, permission, grantedBy) {
    const dataRoom = await this.findByDataRoomId(dataRoomId);
    if (!dataRoom) throw new Error('Data room not found');
    const existingIndex = dataRoom.permissions.findIndex(p => p.userId === permission.userId || p.email === permission.email);
    const newPermission = { ...permission, grantedBy, grantedAt: new Date().toISOString() };
    let permissions = existingIndex >= 0 ? [...dataRoom.permissions] : [...dataRoom.permissions, newPermission];
    if (existingIndex >= 0) permissions[existingIndex] = newPermission;
    return baseModel.updateOne.call(baseModel, { dataRoomId }, { $set: { permissions } });
  },

  async removePermission(dataRoomId, userId) {
    const dataRoom = await this.findByDataRoomId(dataRoomId);
    if (!dataRoom) throw new Error('Data room not found');
    const permissions = dataRoom.permissions.filter(p => p.userId !== userId);
    return baseModel.updateOne.call(baseModel, { dataRoomId }, { $set: { permissions } });
  },

  async addDocument(dataRoomId, documentId, addedBy) {
    const dataRoom = await this.findByDataRoomId(dataRoomId);
    if (!dataRoom) throw new Error('Data room not found');
    if (dataRoom.documents.some(d => d.documentId === documentId)) throw new Error('Document already in data room');
    const documents = [...dataRoom.documents, { documentId, addedBy, addedAt: new Date().toISOString() }];
    return baseModel.updateOne.call(baseModel, { dataRoomId }, { $set: { documents } });
  },

  async removeDocument(dataRoomId, documentId) {
    const dataRoom = await this.findByDataRoomId(dataRoomId);
    if (!dataRoom) throw new Error('Data room not found');
    const documents = dataRoom.documents.filter(d => d.documentId !== documentId);
    return baseModel.updateOne.call(baseModel, { dataRoomId }, { $set: { documents } });
  },

  isAccessLinkValid(dataRoom) {
    const externalAccess = dataRoom.accessSettings?.externalAccess;
    if (!externalAccess || !externalAccess.enabled) return false;
    if (externalAccess.expiresAt && new Date(externalAccess.expiresAt) < new Date()) return false;
    if (externalAccess.maxViews && externalAccess.viewCount >= externalAccess.maxViews) return false;
    return true;
  },

  async generateAccessLink(dataRoomId, expiresInHours = 24, options = {}) {
    const dataRoom = await this.findByDataRoomId(dataRoomId);
    if (!dataRoom) throw new Error('Data room not found');
    const accessToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();
    const externalAccess = { enabled: true, accessToken, expiresAt, createdAt: new Date().toISOString(), createdBy: options.createdBy, maxViews: options.maxViews, viewCount: 0 };
    const accessSettings = { ...dataRoom.accessSettings, externalAccess };
    await baseModel.updateOne.call(baseModel, { dataRoomId }, { $set: { accessSettings } });
    return { accessToken, expiresAt, dataRoomId };
  },

  async validateAccessToken(dataRoomId, accessToken) {
    const dataRoom = await this.findByDataRoomId(dataRoomId);
    if (!dataRoom) return false;
    const externalAccess = dataRoom.accessSettings?.externalAccess;
    if (!externalAccess || externalAccess.accessToken !== accessToken) return false;
    return this.isAccessLinkValid(dataRoom);
  },

  async logActivity(dataRoomId, activity) {
    const dataRoom = await this.findByDataRoomId(dataRoomId);
    if (!dataRoom) throw new Error('Data room not found');
    const activityLog = [...(dataRoom.activityLog || []), { ...activity, timestamp: new Date().toISOString() }];
    return baseModel.updateOne.call(baseModel, { dataRoomId }, { $set: { activityLog } });
  },

  async getActivityLog(dataRoomId, options = {}) {
    const dataRoom = await this.findByDataRoomId(dataRoomId);
    if (!dataRoom) throw new Error('Data room not found');
    let activities = dataRoom.activityLog || [];
    const { skip = 0, limit = 50 } = options;
    activities = activities.slice(skip, skip + limit);
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return activities;
  },

  async softDelete(dataRoomId) {
    return baseModel.updateOne.call(baseModel, { dataRoomId }, { $set: { status: 'deleted' } });
  },

  find: baseModel.find.bind(baseModel),
  findOne: baseModel.findOne.bind(baseModel),
  findById: baseModel.findById.bind(baseModel),
  updateOne: baseModel.updateOne.bind(baseModel),
  deleteOne: baseModel.deleteOne.bind(baseModel),
  countDocuments: baseModel.countDocuments.bind(baseModel),
  exists: baseModel.exists.bind(baseModel)
};

module.exports = DataRoom;

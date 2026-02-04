/**
 * InstalledIntegration Model
 * Issue #202: Build Integration Marketplace Backend
 */
const mongoose = require('mongoose');

const connectionLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  success: { type: Boolean, required: true },
  responseTime: { type: Number },
  error: { type: String },
  details: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

const installedIntegrationSchema = new mongoose.Schema({
  companyId: { type: String, required: true, index: true },
  integrationId: { type: String, required: true, index: true },
  integrationRef: { type: mongoose.Schema.Types.ObjectId, ref: 'IntegrationMarketplaceItem' },
  status: { type: String, enum: ['active', 'inactive', 'error', 'pending', 'configuring'], default: 'pending', index: true },
  configuration: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  encryptedSecrets: { type: Map, of: String, default: {} },
  permissions: [{ type: String, trim: true }],
  lastConnectionTest: { timestamp: Date, success: Boolean, responseTime: Number, error: String },
  connectionLogs: { type: [connectionLogSchema], default: [] },
  webhookUrl: { type: String, trim: true },
  webhookSecret: { type: String },
  syncSettings: { enabled: { type: Boolean, default: true }, frequency: { type: String, enum: ['realtime', 'hourly', 'daily', 'weekly', 'manual'], default: 'realtime' }, lastSyncAt: Date, nextSyncAt: Date },
  usageMetrics: { apiCallsTotal: { type: Number, default: 0 }, apiCallsThisMonth: { type: Number, default: 0 }, lastApiCallAt: Date, errorCount: { type: Number, default: 0 }, successRate: { type: Number, min: 0, max: 100, default: 100 } },
  installedBy: { type: String, required: true },
  installedAt: { type: Date, default: Date.now },
  configuredBy: { type: String },
  configuredAt: { type: Date },
  updatedBy: { type: String },
  activatedAt: { type: Date },
  deactivatedAt: { type: Date },
  deactivatedBy: { type: String },
  deactivationReason: { type: String },
  notes: { type: String, maxlength: 2000 },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

installedIntegrationSchema.index({ companyId: 1, integrationId: 1 }, { unique: true });
installedIntegrationSchema.index({ companyId: 1, status: 1 });
installedIntegrationSchema.index({ integrationId: 1, status: 1 });

installedIntegrationSchema.virtual('isOperational').get(function() {
  return this.status === 'active' && (!this.lastConnectionTest || this.lastConnectionTest.success !== false);
});

installedIntegrationSchema.virtual('daysSinceInstallation').get(function() {
  return Math.floor((Date.now() - this.installedAt) / (1000 * 60 * 60 * 24));
});

installedIntegrationSchema.set('toJSON', { virtuals: true });
installedIntegrationSchema.set('toObject', { virtuals: true });

const InstalledIntegration = mongoose.model('InstalledIntegration', installedIntegrationSchema);
module.exports = InstalledIntegration;

/**
 * IntegrationMarketplaceItem Model
 * Issue #202: Build Integration Marketplace Backend
 */
const mongoose = require('mongoose');

const configFieldSchema = new mongoose.Schema({
  type: { type: String, required: true, enum: ['string', 'number', 'boolean', 'select', 'password', 'url', 'email'] },
  required: { type: Boolean, default: false },
  label: { type: String, required: true },
  description: { type: String },
  placeholder: { type: String },
  defaultValue: { type: mongoose.Schema.Types.Mixed },
  options: [{ value: String, label: String }],
  validation: { pattern: String, minLength: Number, maxLength: Number, min: Number, max: Number },
  sensitive: { type: Boolean, default: false }
}, { _id: false });

const integrationMarketplaceItemSchema = new mongoose.Schema({
  integrationId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, required: true, trim: true, maxlength: 1000 },
  shortDescription: { type: String, trim: true, maxlength: 200 },
  category: { type: String, required: true, enum: ['payments', 'accounting', 'communication', 'crm', 'hr', 'legal', 'analytics', 'storage', 'productivity', 'security', 'other'], index: true },
  provider: { type: String, required: true, trim: true },
  icon: { type: String, trim: true },
  logo: { type: String, trim: true },
  version: { type: String, required: true, default: '1.0.0' },
  status: { type: String, enum: ['active', 'inactive', 'deprecated', 'beta'], default: 'active', index: true },
  configurationSchema: { type: Map, of: configFieldSchema, default: {} },
  features: [{ type: String, trim: true }],
  documentation: { type: String, trim: true },
  supportUrl: { type: String, trim: true },
  privacyPolicyUrl: { type: String, trim: true },
  termsOfServiceUrl: { type: String, trim: true },
  pricing: { type: { type: String, enum: ['free', 'freemium', 'paid', 'enterprise'], default: 'free' }, startingPrice: Number, currency: { type: String, default: 'USD' }, billingCycle: { type: String, enum: ['monthly', 'yearly', 'one-time'] } },
  permissions: [{ type: String, trim: true }],
  webhookEvents: [{ type: String, trim: true }],
  testEndpoint: { type: String, trim: true },
  healthCheckEndpoint: { type: String, trim: true },
  rating: { average: { type: Number, min: 0, max: 5, default: 0 }, count: { type: Number, default: 0 } },
  installCount: { type: Number, default: 0, min: 0 },
  tags: [{ type: String, trim: true, lowercase: true }],
  createdBy: { type: String },
  updatedBy: { type: String },
  publishedAt: { type: Date },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

integrationMarketplaceItemSchema.index({ category: 1, status: 1 });
integrationMarketplaceItemSchema.index({ name: 'text', description: 'text', tags: 'text' });
integrationMarketplaceItemSchema.index({ 'rating.average': -1, installCount: -1 });

integrationMarketplaceItemSchema.pre('save', function(next) {
  if (this.isNew && !this.integrationId) {
    this.integrationId = 'INT-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  next();
});

integrationMarketplaceItemSchema.virtual('isAvailable').get(function() {
  return this.status === 'active' || this.status === 'beta';
});

integrationMarketplaceItemSchema.set('toJSON', { virtuals: true });
integrationMarketplaceItemSchema.set('toObject', { virtuals: true });

const IntegrationMarketplaceItem = mongoose.model('IntegrationMarketplaceItem', integrationMarketplaceItemSchema);
module.exports = IntegrationMarketplaceItem;

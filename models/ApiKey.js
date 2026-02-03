/**
 * ApiKey Model
 * Issue #119: Create API Access for Partners
 *
 * Data model for partner API keys with support for:
 * - Key/secret authentication
 * - Permissions and rate limiting
 * - IP whitelisting
 * - Status management (active, suspended, revoked)
 */

const mongoose = require('mongoose');

const rateLimitSchema = new mongoose.Schema({
  requestsPerMinute: {
    type: Number,
    default: 60,
    min: 1
  },
  requestsPerHour: {
    type: Number,
    default: 1000,
    min: 1
  }
}, { _id: false });

const apiKeySchema = new mongoose.Schema({
  apiKeyId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  partnerId: {
    type: String,
    required: true,
    index: true
  },
  companyId: {
    type: String,
    required: true,
    index: true
  },
  keyHash: {
    type: String,
    required: true
  },
  secretHash: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  permissions: {
    type: [String],
    default: []
  },
  rateLimit: {
    type: rateLimitSchema,
    default: () => ({
      requestsPerMinute: 60,
      requestsPerHour: 1000
    })
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'revoked'],
    default: 'active',
    index: true
  },
  expiresAt: {
    type: Date,
    default: null
  },
  lastUsedAt: {
    type: Date,
    default: null
  },
  ipWhitelist: {
    type: [String],
    default: []
  },
  // Usage tracking
  usageCount: {
    type: Number,
    default: 0
  },
  usageHistory: {
    type: [{
      date: String,
      count: Number
    }],
    default: []
  },
  // Suspension tracking
  suspendedAt: {
    type: Date,
    default: null
  },
  suspensionReason: {
    type: String,
    default: null
  },
  reactivatedAt: {
    type: Date,
    default: null
  },
  // Revocation tracking
  revokedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
apiKeySchema.index({ partnerId: 1, status: 1 });
apiKeySchema.index({ companyId: 1, status: 1 });
apiKeySchema.index({ keyHash: 1 });

// Transform JSON output to hide sensitive fields
apiKeySchema.methods.toJSON = function() {
  const apiKey = this.toObject();
  delete apiKey.keyHash;
  delete apiKey.secretHash;
  return apiKey;
};

const ApiKey = mongoose.model('ApiKey', apiKeySchema);

module.exports = ApiKey;

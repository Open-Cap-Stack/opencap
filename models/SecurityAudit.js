/**
 * Security Audit Model
 * 
 * [Feature] OCAE-306: Implement security audit logging
 * 
 * This model stores security audit events in MongoDB for compliance reporting,
 * threat analysis, and security monitoring.
 */

const mongoose = require('mongoose');

const securityAuditSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  eventType: {
    type: String,
    required: true,
    index: true,
    enum: [
      'auth.login.success',
      'auth.login.failure', 
      'auth.logout',
      'auth.token.refresh',
      'auth.token.invalid',
      'auth.password.reset',
      'auth.unauthorized',
      'data.access',
      'data.modification',
      'data.deletion',
      'admin.action',
      'rbac.permission_denied',
      'security.rate_limit_exceeded',
      'security.suspicious_activity',
      'data.file_upload',
      'data.export_request',
      'admin.config_change'
    ]
  },
  
  level: {
    type: String,
    required: true,
    index: true,
    enum: ['low', 'medium', 'high', 'critical']
  },
  
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  
  // User context
  userContext: {
    userId: {
      type: String,
      index: true
    },
    userEmail: String,
    userRole: {
      type: String,
      index: true
    },
    sessionId: String
  },
  
  // Request context
  requestContext: {
    ip: {
      type: String,
      required: true,
      index: true
    },
    userAgent: String,
    method: String,
    url: String,
    headers: {
      authorization: String,
      'x-api-version': String,
      'x-forwarded-for': String,
      'x-real-ip': String
    }
  },
  
  // Event details
  details: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  // System context
  environment: {
    type: String,
    default: 'unknown'
  },
  
  nodeVersion: String,
  
  // Status tracking
  reviewed: {
    type: Boolean,
    default: false,
    index: true
  },
  
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  reviewedAt: Date,
  
  notes: String,
  
  // Risk assessment
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    index: true
  },
  
  // Tags for categorization
  tags: [{
    type: String,
    index: true
  }]
  
}, {
  timestamps: true,
  collection: 'securityaudits'
});

// Indexes for efficient querying
securityAuditSchema.index({ timestamp: -1 });
securityAuditSchema.index({ eventType: 1, timestamp: -1 });
securityAuditSchema.index({ level: 1, timestamp: -1 });
securityAuditSchema.index({ 'userContext.userId': 1, timestamp: -1 });
securityAuditSchema.index({ 'requestContext.ip': 1, timestamp: -1 });
securityAuditSchema.index({ reviewed: 1, level: 1 });

// Compound indexes for common queries
securityAuditSchema.index({ 
  eventType: 1, 
  'userContext.userId': 1, 
  timestamp: -1 
});

securityAuditSchema.index({
  level: 1,
  reviewed: 1,
  timestamp: -1
});

// Static methods for common queries
securityAuditSchema.statics.findByUser = function(userId, days = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  
  return this.find({
    'userContext.userId': userId,
    timestamp: { $gte: cutoff }
  }).sort({ timestamp: -1 });
};

securityAuditSchema.statics.findByEventType = function(eventType, days = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  
  return this.find({
    eventType,
    timestamp: { $gte: cutoff }
  }).sort({ timestamp: -1 });
};

securityAuditSchema.statics.findByLevel = function(level, limit = 100) {
  return this.find({ level })
    .sort({ timestamp: -1 })
    .limit(limit);
};

securityAuditSchema.statics.getUnreviewedCritical = function() {
  return this.find({
    level: 'critical',
    reviewed: false
  }).sort({ timestamp: -1 });
};

securityAuditSchema.statics.getSuspiciousActivity = function(days = 1) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  
  return this.find({
    $or: [
      { eventType: 'auth.login.failure' },
      { eventType: 'auth.unauthorized' },
      { eventType: 'security.suspicious_activity' },
      { eventType: 'security.rate_limit_exceeded' }
    ],
    timestamp: { $gte: cutoff }
  }).sort({ timestamp: -1 });
};

securityAuditSchema.statics.getSecuritySummary = function(days = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: cutoff }
      }
    },
    {
      $group: {
        _id: {
          eventType: '$eventType',
          level: '$level'
        },
        count: { $sum: 1 },
        lastOccurrence: { $max: '$timestamp' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// Instance methods
securityAuditSchema.methods.markReviewed = function(reviewedBy, notes) {
  this.reviewed = true;
  this.reviewedBy = reviewedBy;
  this.reviewedAt = new Date();
  if (notes) this.notes = notes;
  return this.save();
};

securityAuditSchema.methods.calculateRiskScore = function() {
  let score = 0;
  
  // Base score by level
  const levelScores = {
    low: 10,
    medium: 30,
    high: 60,
    critical: 90
  };
  score += levelScores[this.level] || 0;
  
  // Event type modifiers
  const eventTypeModifiers = {
    'auth.login.failure': 5,
    'auth.unauthorized': 10,
    'security.suspicious_activity': 15,
    'admin.action': 5,
    'data.deletion': 10
  };
  score += eventTypeModifiers[this.eventType] || 0;
  
  // Time-based decay (recent events are higher risk)
  const hoursSinceEvent = (Date.now() - this.timestamp.getTime()) / (1000 * 60 * 60);
  if (hoursSinceEvent < 1) score += 10;
  else if (hoursSinceEvent < 24) score += 5;
  
  // Cap at 100
  this.riskScore = Math.min(score, 100);
  return this.riskScore;
};

// Pre-save middleware
securityAuditSchema.pre('save', function(next) {
  if (this.isNew && !this.riskScore) {
    this.calculateRiskScore();
  }
  next();
});

// TTL index for automatic cleanup (keep logs for 2 years)
securityAuditSchema.index(
  { timestamp: 1 }, 
  { expireAfterSeconds: 60 * 60 * 24 * 365 * 2 }
);

const SecurityAudit = mongoose.model('SecurityAudit', securityAuditSchema);

module.exports = SecurityAudit;
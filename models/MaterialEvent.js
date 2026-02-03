/**
 * MaterialEvent Model
 * Feature: Issue #60 - Build Material Events Tracking
 *
 * Tracks significant company events that may trigger 409A valuation requirements.
 */
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const relatedEntitySchema = new mongoose.Schema({
  entityType: {
    type: String,
    enum: ['FundraisingRound', 'Stakeholder', 'Transaction', 'Document', 'Company', 'Other'],
    required: true
  },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  description: { type: String }
}, { _id: false });

const actionItemSchema = new mongoose.Schema({
  action: { type: String, required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dueDate: { type: Date },
  completedAt: { type: Date },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  notes: { type: String }
}, { _id: true });

const statusHistorySchema = new mongoose.Schema({
  status: { type: String, required: true },
  changedAt: { type: Date, default: Date.now },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reason: { type: String }
}, { _id: false });

const MaterialEventSchema = new mongoose.Schema({
  // Unique identifier
  eventId: {
    type: String,
    unique: true,
    default: () => `evt_${uuidv4()}`,
    index: true
  },

  // Company reference
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },

  // Event details
  eventType: {
    type: String,
    enum: [
      'fundraising_round',
      'significant_transaction',
      'key_employee_departure',
      'key_employee_hire',
      'acquisition_offer',
      'merger_discussion',
      'major_customer_change',
      'major_product_launch',
      'significant_revenue_change',
      'litigation',
      'regulatory_change',
      'market_condition_change',
      'ipo_preparation',
      'secondary_transaction',
      'other'
    ],
    required: true,
    index: true
  },

  eventDate: {
    type: Date,
    required: true,
    index: true
  },

  detectedAt: {
    type: Date,
    default: Date.now
  },

  description: {
    type: String,
    required: true
  },

  // Valuation impact
  triggersValuation: {
    type: Boolean,
    default: false,
    index: true
  },

  impactSeverity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },

  valuationImpactReason: { type: String },

  // Status workflow
  status: {
    type: String,
    enum: ['detected', 'acknowledged', 'action_required', 'resolved', 'dismissed'],
    default: 'detected',
    index: true
  },

  // Related entities
  relatedEntities: [relatedEntitySchema],

  // Action items
  actionItems: [actionItemSchema],

  // Resolution
  resolution: {
    resolvedAt: { type: Date },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolutionNotes: { type: String },
    valuationRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Valuation409A' }
  },

  // Detection source
  detectionSource: {
    type: String,
    enum: ['automatic', 'manual', 'api_integration', 'scheduled_scan'],
    default: 'manual'
  },

  detectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Audit trail
  statusHistory: [statusHistorySchema],

  // Additional data
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  notes: { type: String },
  tags: [{ type: String }],

  // Tracking
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
MaterialEventSchema.index({ companyId: 1, status: 1 });
MaterialEventSchema.index({ companyId: 1, eventDate: -1 });
MaterialEventSchema.index({ triggersValuation: 1, status: 1 });
MaterialEventSchema.index({ eventType: 1, eventDate: -1 });

// Event types that always trigger valuation
const alwaysTriggerTypes = [
  'fundraising_round',
  'significant_transaction',
  'acquisition_offer',
  'merger_discussion',
  'ipo_preparation'
];

// Virtuals
MaterialEventSchema.virtual('requiresImmediateAction').get(function() {
  return this.triggersValuation &&
         this.impactSeverity === 'critical' &&
         this.status !== 'resolved';
});

MaterialEventSchema.virtual('daysSinceEvent').get(function() {
  return Math.floor((new Date() - this.eventDate) / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to auto-set valuation trigger
MaterialEventSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('eventType')) {
    if (alwaysTriggerTypes.includes(this.eventType)) {
      this.triggersValuation = true;
      this.impactSeverity = 'critical';
    }
  }
  next();
});

// Instance methods
MaterialEventSchema.methods.acknowledge = async function(userId, notes = null) {
  if (this.status !== 'detected') {
    throw new Error('Can only acknowledge events in detected status');
  }

  this.statusHistory.push({
    status: 'acknowledged',
    changedAt: new Date(),
    changedBy: userId,
    reason: notes || 'Event acknowledged'
  });

  this.status = 'acknowledged';
  this.updatedBy = userId;
  return this.save();
};

MaterialEventSchema.methods.markActionRequired = async function(userId, actionItems = [], notes = null) {
  this.statusHistory.push({
    status: 'action_required',
    changedAt: new Date(),
    changedBy: userId,
    reason: notes || 'Action required'
  });

  this.status = 'action_required';

  if (actionItems.length > 0) {
    this.actionItems.push(...actionItems.map(item => ({
      ...item,
      status: 'pending'
    })));
  }

  this.updatedBy = userId;
  return this.save();
};

MaterialEventSchema.methods.resolve = async function(userId, resolutionData = {}) {
  this.statusHistory.push({
    status: 'resolved',
    changedAt: new Date(),
    changedBy: userId,
    reason: resolutionData.notes || 'Event resolved'
  });

  this.status = 'resolved';
  this.resolution = {
    resolvedAt: new Date(),
    resolvedBy: userId,
    resolutionNotes: resolutionData.notes,
    valuationRequestId: resolutionData.valuationRequestId
  };

  this.updatedBy = userId;
  return this.save();
};

MaterialEventSchema.methods.dismiss = async function(userId, reason) {
  if (!reason) {
    throw new Error('Dismissal reason is required');
  }

  this.statusHistory.push({
    status: 'dismissed',
    changedAt: new Date(),
    changedBy: userId,
    reason
  });

  this.status = 'dismissed';
  this.updatedBy = userId;
  return this.save();
};

MaterialEventSchema.methods.addActionItem = async function(actionItem, userId) {
  this.actionItems.push({
    ...actionItem,
    status: 'pending'
  });
  this.updatedBy = userId;
  return this.save();
};

MaterialEventSchema.methods.completeActionItem = async function(actionItemId, userId, notes = null) {
  const actionItem = this.actionItems.id(actionItemId);
  if (!actionItem) {
    throw new Error('Action item not found');
  }

  actionItem.status = 'completed';
  actionItem.completedAt = new Date();
  if (notes) actionItem.notes = notes;

  this.updatedBy = userId;

  // Auto-resolve if all action items completed
  const allCompleted = this.actionItems.every(item =>
    item.status === 'completed' || item.status === 'cancelled'
  );

  if (allCompleted && this.status === 'action_required') {
    await this.resolve(userId, { notes: 'All action items completed' });
  } else {
    await this.save();
  }

  return this;
};

// Static methods
MaterialEventSchema.statics.findByCompany = function(companyId, options = {}) {
  const query = { companyId };

  if (options.status) query.status = options.status;
  if (options.eventType) query.eventType = options.eventType;
  if (options.triggersValuation !== undefined) {
    query.triggersValuation = options.triggersValuation;
  }

  return this.find(query).sort({ eventDate: -1 });
};

MaterialEventSchema.statics.findActionRequired = function(companyId = null) {
  const query = { status: 'action_required' };
  if (companyId) query.companyId = companyId;
  return this.find(query)
    .populate('companyId', 'name')
    .sort({ impactSeverity: -1, eventDate: -1 });
};

MaterialEventSchema.statics.findValuationTriggers = function(companyId = null) {
  const query = {
    triggersValuation: true,
    status: { $nin: ['resolved', 'dismissed'] }
  };
  if (companyId) query.companyId = companyId;
  return this.find(query)
    .populate('companyId', 'name')
    .sort({ eventDate: -1 });
};

MaterialEventSchema.statics.getCompanySummary = async function(companyId) {
  const events = await this.find({ companyId });

  const summary = {
    total: events.length,
    byStatus: {},
    byType: {},
    triggersValuation: 0,
    actionRequired: 0,
    recentEvents: []
  };

  events.forEach(event => {
    summary.byStatus[event.status] = (summary.byStatus[event.status] || 0) + 1;
    summary.byType[event.eventType] = (summary.byType[event.eventType] || 0) + 1;
    if (event.triggersValuation) summary.triggersValuation++;
    if (event.status === 'action_required') summary.actionRequired++;
  });

  // Get 5 most recent events
  summary.recentEvents = events
    .sort((a, b) => b.eventDate - a.eventDate)
    .slice(0, 5)
    .map(e => ({
      eventId: e.eventId,
      eventType: e.eventType,
      eventDate: e.eventDate,
      status: e.status,
      triggersValuation: e.triggersValuation
    }));

  return summary;
};

// Auto-detect material events from fundraising rounds
MaterialEventSchema.statics.detectFromFundraisingRound = async function(roundData, userId) {
  const event = new this({
    companyId: roundData.companyId,
    eventType: 'fundraising_round',
    eventDate: roundData.closedDate || new Date(),
    description: `Fundraising round: ${roundData.name || roundData.type} - $${roundData.amount?.toLocaleString() || 'TBD'}`,
    triggersValuation: true,
    impactSeverity: 'critical',
    detectionSource: 'automatic',
    detectedBy: userId,
    createdBy: userId,
    relatedEntities: [{
      entityType: 'FundraisingRound',
      entityId: roundData._id,
      description: roundData.name
    }],
    metadata: {
      roundType: roundData.type,
      roundAmount: roundData.amount,
      roundName: roundData.name
    },
    statusHistory: [{
      status: 'detected',
      changedAt: new Date(),
      changedBy: userId,
      reason: 'Auto-detected from fundraising round creation'
    }]
  });

  return event.save();
};

// Auto-detect material events from key employee changes
MaterialEventSchema.statics.detectFromEmployeeChange = async function(employeeData, changeType, userId) {
  const isCLevel = ['CEO', 'CFO', 'CTO', 'COO', 'CMO', 'CPO', 'CLO'].some(
    title => employeeData.title?.toUpperCase().includes(title)
  );

  const eventType = changeType === 'departure' ? 'key_employee_departure' : 'key_employee_hire';

  const event = new this({
    companyId: employeeData.companyId,
    eventType,
    eventDate: employeeData.effectiveDate || new Date(),
    description: `${changeType === 'departure' ? 'Departure' : 'Hire'}: ${employeeData.name} (${employeeData.title})`,
    triggersValuation: isCLevel,
    impactSeverity: isCLevel ? 'high' : 'medium',
    detectionSource: 'automatic',
    detectedBy: userId,
    createdBy: userId,
    relatedEntities: [{
      entityType: 'Stakeholder',
      entityId: employeeData._id,
      description: `${employeeData.name} - ${employeeData.title}`
    }],
    metadata: {
      employeeName: employeeData.name,
      employeeTitle: employeeData.title,
      isCLevel,
      changeType
    },
    statusHistory: [{
      status: 'detected',
      changedAt: new Date(),
      changedBy: userId,
      reason: `Auto-detected from ${changeType}`
    }]
  });

  return event.save();
};

module.exports = mongoose.model('MaterialEvent', MaterialEventSchema);

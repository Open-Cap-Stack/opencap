/**
 * ValuationPartner Model
 * Feature: Issue #61 - Implement Valuation Specialist Integration
 *
 * Manages relationships with 409A valuation service providers.
 */
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  title: { type: String },
  isPrimary: { type: Boolean, default: false }
}, { _id: true });

const servicePackageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number },
  currency: { type: String, default: 'USD' },
  turnaroundDays: { type: Number },
  features: [{ type: String }]
}, { _id: true });

const communicationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['email', 'call', 'meeting', 'message', 'document_shared'],
    required: true
  },
  subject: { type: String },
  content: { type: String },
  participants: [{ type: String }],
  scheduledAt: { type: Date },
  completedAt: { type: Date },
  duration: { type: Number }, // minutes
  outcome: { type: String },
  relatedValuationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Valuation409A' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  attachments: [{
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    name: { type: String }
  }]
}, { _id: true, timestamps: true });

const scheduledCallSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  scheduledAt: { type: Date, required: true },
  duration: { type: Number, default: 30 }, // minutes
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled'],
    default: 'scheduled'
  },
  meetingLink: { type: String },
  participants: [{
    name: { type: String },
    email: { type: String },
    role: { type: String }
  }],
  agenda: { type: String },
  notes: { type: String },
  relatedValuationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Valuation409A' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  confirmedAt: { type: Date },
  completedAt: { type: Date },
  cancelledAt: { type: Date },
  cancelReason: { type: String }
}, { _id: true, timestamps: true });

const ValuationPartnerSchema = new mongoose.Schema({
  // Unique identifier
  partnerId: {
    type: String,
    unique: true,
    default: () => `vp_${uuidv4()}`,
    index: true
  },

  // Company using this partner (null for global partners)
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    index: true
  },

  // Partner details
  name: {
    type: String,
    required: true,
    trim: true
  },

  legalName: { type: String },

  type: {
    type: String,
    enum: ['valuation_firm', 'accounting_firm', 'independent_appraiser', 'consulting_firm'],
    default: 'valuation_firm'
  },

  status: {
    type: String,
    enum: ['active', 'inactive', 'pending_approval', 'suspended'],
    default: 'pending_approval',
    index: true
  },

  // Contact information
  contacts: [contactSchema],

  // Address
  address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    zipCode: { type: String },
    country: { type: String, default: 'USA' }
  },

  // Qualifications
  qualifications: {
    certifications: [{ type: String }],
    yearsInBusiness: { type: Number },
    valuationsCompleted: { type: Number },
    specializations: [{ type: String }],
    insuranceCoverage: { type: Number },
    rating: { type: Number, min: 1, max: 5 }
  },

  // Service packages
  servicePackages: [servicePackageSchema],

  // API Integration
  apiIntegration: {
    enabled: { type: Boolean, default: false },
    apiKey: { type: String },
    webhookUrl: { type: String },
    lastSyncAt: { type: Date }
  },

  // Communication history
  communications: [communicationSchema],

  // Scheduled calls
  scheduledCalls: [scheduledCallSchema],

  // Performance metrics
  metrics: {
    averageTurnaroundDays: { type: Number },
    completedValuations: { type: Number, default: 0 },
    onTimeDeliveryRate: { type: Number },
    customerSatisfaction: { type: Number },
    lastEngagement: { type: Date }
  },

  // Contract details
  contract: {
    startDate: { type: Date },
    endDate: { type: Date },
    terms: { type: String },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' }
  },

  // Additional data
  notes: { type: String },
  tags: [{ type: String }],
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

  // Tracking
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
ValuationPartnerSchema.index({ status: 1, type: 1 });
ValuationPartnerSchema.index({ 'qualifications.rating': -1 });
ValuationPartnerSchema.index({ companyId: 1, status: 1 });

// Virtuals
ValuationPartnerSchema.virtual('primaryContact').get(function() {
  return this.contacts.find(c => c.isPrimary) || this.contacts[0];
});

ValuationPartnerSchema.virtual('isContractActive').get(function() {
  if (!this.contract?.startDate) return false;
  const now = new Date();
  return now >= this.contract.startDate &&
         (!this.contract.endDate || now <= this.contract.endDate);
});

ValuationPartnerSchema.virtual('upcomingCalls').get(function() {
  const now = new Date();
  return this.scheduledCalls.filter(
    c => c.status === 'scheduled' && c.scheduledAt > now
  ).sort((a, b) => a.scheduledAt - b.scheduledAt);
});

// Instance methods
ValuationPartnerSchema.methods.addContact = async function(contactData, userId) {
  // Set as primary if first contact
  if (this.contacts.length === 0) {
    contactData.isPrimary = true;
  }

  this.contacts.push(contactData);
  this.updatedBy = userId;
  return this.save();
};

ValuationPartnerSchema.methods.setPrimaryContact = async function(contactId, userId) {
  this.contacts.forEach(c => {
    c.isPrimary = c._id.toString() === contactId.toString();
  });
  this.updatedBy = userId;
  return this.save();
};

ValuationPartnerSchema.methods.scheduleCall = async function(callData, userId) {
  const call = {
    ...callData,
    status: 'scheduled',
    createdBy: userId
  };

  this.scheduledCalls.push(call);
  this.updatedBy = userId;
  await this.save();

  // Return the newly created call
  return this.scheduledCalls[this.scheduledCalls.length - 1];
};

ValuationPartnerSchema.methods.updateCallStatus = async function(callId, status, userId, data = {}) {
  const call = this.scheduledCalls.id(callId);
  if (!call) {
    throw new Error('Call not found');
  }

  call.status = status;

  switch (status) {
    case 'confirmed':
      call.confirmedAt = new Date();
      if (data.meetingLink) call.meetingLink = data.meetingLink;
      break;
    case 'completed':
      call.completedAt = new Date();
      if (data.notes) call.notes = data.notes;
      if (data.duration) call.duration = data.duration;
      break;
    case 'cancelled':
      call.cancelledAt = new Date();
      call.cancelReason = data.reason;
      break;
    case 'rescheduled':
      call.scheduledAt = data.newTime;
      break;
  }

  this.updatedBy = userId;
  return this.save();
};

ValuationPartnerSchema.methods.addCommunication = async function(commData, userId) {
  const communication = {
    ...commData,
    createdBy: userId
  };

  this.communications.push(communication);
  this.metrics.lastEngagement = new Date();
  this.updatedBy = userId;
  return this.save();
};

ValuationPartnerSchema.methods.activate = async function(userId) {
  if (this.status === 'active') {
    throw new Error('Partner is already active');
  }

  this.status = 'active';
  this.updatedBy = userId;
  return this.save();
};

ValuationPartnerSchema.methods.deactivate = async function(userId, reason = null) {
  this.status = 'inactive';
  if (reason) {
    this.notes = `${this.notes || ''}\n[${new Date().toISOString()}] Deactivated: ${reason}`.trim();
  }
  this.updatedBy = userId;
  return this.save();
};

ValuationPartnerSchema.methods.updateMetrics = async function(metricsData) {
  Object.assign(this.metrics, metricsData);
  return this.save();
};

// Static methods
ValuationPartnerSchema.statics.findActive = function(companyId = null) {
  const query = { status: 'active' };
  if (companyId) {
    query.$or = [
      { companyId },
      { companyId: null } // Include global partners
    ];
  }
  return this.find(query).sort({ 'qualifications.rating': -1 });
};

ValuationPartnerSchema.statics.findByType = function(type, companyId = null) {
  const query = { type, status: 'active' };
  if (companyId) {
    query.$or = [
      { companyId },
      { companyId: null }
    ];
  }
  return this.find(query).sort({ 'qualifications.rating': -1 });
};

ValuationPartnerSchema.statics.searchPartners = function(criteria) {
  const query = { status: 'active' };

  if (criteria.type) query.type = criteria.type;
  if (criteria.minRating) {
    query['qualifications.rating'] = { $gte: criteria.minRating };
  }
  if (criteria.specialization) {
    query['qualifications.specializations'] = criteria.specialization;
  }
  if (criteria.maxTurnaround) {
    query['servicePackages.turnaroundDays'] = { $lte: criteria.maxTurnaround };
  }

  return this.find(query).sort({ 'qualifications.rating': -1 });
};

ValuationPartnerSchema.statics.getPartnerSummary = async function(partnerId) {
  const partner = await this.findOne({ partnerId })
    .populate('communications.createdBy', 'firstName lastName')
    .populate('scheduledCalls.createdBy', 'firstName lastName');

  if (!partner) {
    throw new Error('Partner not found');
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  return {
    partner: {
      partnerId: partner.partnerId,
      name: partner.name,
      type: partner.type,
      status: partner.status,
      primaryContact: partner.primaryContact
    },
    metrics: partner.metrics,
    recentCommunications: partner.communications
      .filter(c => c.createdAt > thirtyDaysAgo)
      .slice(-5),
    upcomingCalls: partner.upcomingCalls,
    servicePackages: partner.servicePackages.length,
    qualifications: partner.qualifications
  };
};

module.exports = mongoose.model('ValuationPartner', ValuationPartnerSchema);

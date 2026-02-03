/**
 * InvestorCommunication Model
 * Issue #91: Build Investor Communication System
 *
 * Manages investor-specific communications including:
 * - Message templates
 * - Investor segmentation
 * - Quarterly update distribution
 * - Document sharing notifications
 * - Portal announcements
 */
const mongoose = require('mongoose');

const COMMUNICATION_TYPES = [
  'quarterly_update',
  'annual_report',
  'document_notification',
  'portal_announcement',
  'funding_update',
  'general'
];

const STATUS_TYPES = [
  'draft',
  'scheduled',
  'sent',
  'delivered',
  'failed'
];

const DELIVERY_CHANNELS = [
  'email',
  'portal',
  'sms',
  'all'
];

const DeliveryTrackingSchema = new mongoose.Schema({
  investorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Investor',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'opened', 'clicked', 'failed'],
    default: 'pending'
  },
  channel: {
    type: String,
    enum: DELIVERY_CHANNELS
  },
  sentAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  openedAt: {
    type: Date
  },
  clickedAt: {
    type: Date
  },
  error: {
    type: String
  }
}, { _id: false });

const AttachmentSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  },
  fileName: {
    type: String,
    required: true
  },
  fileType: {
    type: String
  },
  fileSize: {
    type: Number
  },
  url: {
    type: String
  }
}, { _id: false });

const SegmentationSchema = new mongoose.Schema({
  investorTypes: [{
    type: String,
    enum: ['Angel', 'Venture Capital', 'Private Equity', 'Family Office', 'Individual', 'Institutional']
  }],
  minInvestmentAmount: {
    type: Number,
    min: 0
  },
  maxInvestmentAmount: {
    type: Number,
    min: 0
  },
  investmentDateFrom: {
    type: Date
  },
  investmentDateTo: {
    type: Date
  },
  investorIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Investor'
  }],
  excludeInvestorIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Investor'
  }],
  fundraisingRoundIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FundraisingRound'
  }]
}, { _id: false });

const InvestorCommunicationSchema = new mongoose.Schema({
  communicationId: {
    type: String,
    required: [true, 'communicationId is required'],
    unique: true,
    trim: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'companyId is required'],
    index: true
  },
  communicationType: {
    type: String,
    required: [true, 'communicationType is required'],
    enum: {
      values: COMMUNICATION_TYPES,
      message: `communicationType must be one of: ${COMMUNICATION_TYPES.join(', ')}`
    }
  },
  subject: {
    type: String,
    required: [true, 'subject is required'],
    trim: true,
    maxlength: [500, 'Subject cannot exceed 500 characters']
  },
  content: {
    type: String,
    required: [true, 'content is required'],
    maxlength: [50000, 'Content cannot exceed 50000 characters']
  },
  htmlContent: {
    type: String,
    maxlength: [100000, 'HTML content cannot exceed 100000 characters']
  },
  status: {
    type: String,
    enum: {
      values: STATUS_TYPES,
      message: `status must be one of: ${STATUS_TYPES.join(', ')}`
    },
    default: 'draft',
    index: true
  },
  deliveryChannel: {
    type: String,
    enum: {
      values: DELIVERY_CHANNELS,
      message: `deliveryChannel must be one of: ${DELIVERY_CHANNELS.join(', ')}`
    },
    default: 'email'
  },
  segmentation: {
    type: SegmentationSchema,
    default: () => ({})
  },
  attachments: [AttachmentSchema],
  deliveryTracking: [DeliveryTrackingSchema],
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InvestorCommunicationTemplate'
  },
  scheduledFor: {
    type: Date,
    index: true
  },
  sentAt: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'createdBy is required']
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: () => new Map()
  }
}, {
  timestamps: true
});

// Indexes for performance
InvestorCommunicationSchema.index({ communicationId: 1 }, { unique: true });
InvestorCommunicationSchema.index({ companyId: 1, status: 1, createdAt: -1 });
InvestorCommunicationSchema.index({ companyId: 1, communicationType: 1 });
InvestorCommunicationSchema.index({ scheduledFor: 1, status: 1 });
InvestorCommunicationSchema.index({ 'deliveryTracking.investorId': 1 });

// Virtual for recipient count
InvestorCommunicationSchema.virtual('recipientCount').get(function() {
  return this.deliveryTracking ? this.deliveryTracking.length : 0;
});

// Virtual for delivery statistics
InvestorCommunicationSchema.virtual('deliveryStats').get(function() {
  if (!this.deliveryTracking || this.deliveryTracking.length === 0) {
    return { total: 0, sent: 0, delivered: 0, failed: 0 };
  }

  const stats = {
    total: this.deliveryTracking.length,
    pending: 0,
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    failed: 0
  };

  this.deliveryTracking.forEach(tracking => {
    if (stats.hasOwnProperty(tracking.status)) {
      stats[tracking.status]++;
    }
  });

  return stats;
});

// Enable virtuals in JSON
InvestorCommunicationSchema.set('toJSON', { virtuals: true });
InvestorCommunicationSchema.set('toObject', { virtuals: true });

// Pre-save middleware to generate communicationId if not provided
InvestorCommunicationSchema.pre('save', function(next) {
  if (!this.communicationId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    this.communicationId = `INVCOM-${timestamp}-${random}`.toUpperCase();
  }
  next();
});

const InvestorCommunication = mongoose.model('InvestorCommunication', InvestorCommunicationSchema);

// Export model and constants
module.exports = InvestorCommunication;
module.exports.COMMUNICATION_TYPES = COMMUNICATION_TYPES;
module.exports.STATUS_TYPES = STATUS_TYPES;
module.exports.DELIVERY_CHANNELS = DELIVERY_CHANNELS;

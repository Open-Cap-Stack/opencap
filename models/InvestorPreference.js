/**
 * InvestorPreference Model
 * Issue #91: Build Investor Communication System
 *
 * Manages investor communication preferences including:
 * - Channel preferences (email, SMS, portal)
 * - Notification type preferences
 * - Frequency settings
 * - Unsubscribe management
 */
const mongoose = require('mongoose');

const FREQUENCY_OPTIONS = [
  'immediate',
  'daily_digest',
  'weekly_digest'
];

const CommunicationPreferencesSchema = new mongoose.Schema({
  email: {
    type: Boolean,
    default: true
  },
  sms: {
    type: Boolean,
    default: false
  },
  portalNotifications: {
    type: Boolean,
    default: true
  }
}, { _id: false });

const NotificationTypesSchema = new mongoose.Schema({
  quarterlyUpdates: {
    type: Boolean,
    default: true
  },
  annualReports: {
    type: Boolean,
    default: true
  },
  documentSharing: {
    type: Boolean,
    default: true
  },
  portalAnnouncements: {
    type: Boolean,
    default: true
  },
  fundingUpdates: {
    type: Boolean,
    default: true
  },
  generalCommunications: {
    type: Boolean,
    default: true
  }
}, { _id: false });

const InvestorPreferenceSchema = new mongoose.Schema({
  investorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Investor',
    required: [true, 'investorId is required'],
    index: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'companyId is required'],
    index: true
  },
  communicationPreferences: {
    type: CommunicationPreferencesSchema,
    default: () => ({
      email: true,
      sms: false,
      portalNotifications: true
    })
  },
  notificationTypes: {
    type: NotificationTypesSchema,
    default: () => ({
      quarterlyUpdates: true,
      annualReports: true,
      documentSharing: true,
      portalAnnouncements: true,
      fundingUpdates: true,
      generalCommunications: true
    })
  },
  frequency: {
    type: String,
    enum: {
      values: FREQUENCY_OPTIONS,
      message: `frequency must be one of: ${FREQUENCY_OPTIONS.join(', ')}`
    },
    default: 'immediate'
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  preferredLanguage: {
    type: String,
    default: 'en'
  },
  unsubscribedAll: {
    type: Boolean,
    default: false,
    index: true
  },
  unsubscribedAt: {
    type: Date
  },
  unsubscribeToken: {
    type: String,
    unique: true,
    sparse: true
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound unique index for investor-company pair
InvestorPreferenceSchema.index({ investorId: 1, companyId: 1 }, { unique: true });

// Pre-save middleware to generate unsubscribe token
InvestorPreferenceSchema.pre('save', function(next) {
  if (!this.unsubscribeToken) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    this.unsubscribeToken = `${timestamp}${random}`;
  }
  next();
});

// Method to check if investor wants a specific notification type
InvestorPreferenceSchema.methods.wantsNotificationType = function(type) {
  if (this.unsubscribedAll) return false;

  const typeMap = {
    'quarterly_update': 'quarterlyUpdates',
    'annual_report': 'annualReports',
    'document_notification': 'documentSharing',
    'portal_announcement': 'portalAnnouncements',
    'funding_update': 'fundingUpdates',
    'general': 'generalCommunications'
  };

  const prefKey = typeMap[type] || 'generalCommunications';
  return this.notificationTypes[prefKey] !== false;
};

// Method to check if investor wants a specific channel
InvestorPreferenceSchema.methods.wantsChannel = function(channel) {
  if (this.unsubscribedAll) return false;

  const channelMap = {
    'email': 'email',
    'sms': 'sms',
    'portal': 'portalNotifications'
  };

  const prefKey = channelMap[channel];
  return prefKey ? this.communicationPreferences[prefKey] !== false : false;
};

// Static method to get default preferences
InvestorPreferenceSchema.statics.getDefaults = function() {
  return {
    communicationPreferences: {
      email: true,
      sms: false,
      portalNotifications: true
    },
    notificationTypes: {
      quarterlyUpdates: true,
      annualReports: true,
      documentSharing: true,
      portalAnnouncements: true,
      fundingUpdates: true,
      generalCommunications: true
    },
    frequency: 'immediate',
    timezone: 'UTC',
    preferredLanguage: 'en',
    unsubscribedAll: false
  };
};

const InvestorPreference = mongoose.model('InvestorPreference', InvestorPreferenceSchema);

// Export model and constants
module.exports = InvestorPreference;
module.exports.FREQUENCY_OPTIONS = FREQUENCY_OPTIONS;

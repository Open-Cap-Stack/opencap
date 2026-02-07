/**
 * InvestorPreference Model
 * Issue #91: Build Investor Communication System
 *
 * Manages investor communication preferences including:
 * - Channel preferences (email, SMS, portal)
 * - Notification type preferences
 * - Frequency settings
 * - Unsubscribe management
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');

// Frequency options
const FREQUENCY_OPTIONS = ['immediate', 'daily_digest', 'weekly_digest'];

// Notification type to preference key mapping
const NOTIFICATION_TYPE_MAP = {
  'quarterly_update': 'quarterlyUpdates',
  'annual_report': 'annualReports',
  'document_notification': 'documentSharing',
  'portal_announcement': 'portalAnnouncements',
  'funding_update': 'fundingUpdates',
  'general': 'generalCommunications'
};

// Channel to preference key mapping
const CHANNEL_MAP = {
  'email': 'email',
  'sms': 'sms',
  'portal': 'portalNotifications'
};

// Schema definition for documentation and validation
const investorPreferenceSchema = {
  investorId: { type: 'string', required: true },
  companyId: { type: 'string', required: true },
  communicationPreferences: {
    type: 'object',
    default: {
      email: true,
      sms: false,
      portalNotifications: true
    }
  },
  notificationTypes: {
    type: 'object',
    default: {
      quarterlyUpdates: true,
      annualReports: true,
      documentSharing: true,
      portalAnnouncements: true,
      fundingUpdates: true,
      generalCommunications: true
    }
  },
  frequency: { type: 'string', enum: FREQUENCY_OPTIONS, default: 'immediate' },
  timezone: { type: 'string', default: 'UTC' },
  preferredLanguage: { type: 'string', default: 'en' },
  unsubscribedAll: { type: 'boolean', default: false },
  unsubscribedAt: { type: 'date', default: null },
  unsubscribeToken: { type: 'string', unique: true, default: null },
  lastUpdatedBy: { type: 'string', default: null },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('investor_preferences', investorPreferenceSchema);

// Extended InvestorPreference model with business logic
const InvestorPreference = {
  ...baseModel,
  tableName: 'investor_preferences',
  schema: investorPreferenceSchema,

  // Export constants
  FREQUENCY_OPTIONS,
  NOTIFICATION_TYPE_MAP,
  CHANNEL_MAP,

  /**
   * Create a new investor preference with defaults
   * @param {Object} data - Preference data
   * @returns {Object} Created preference
   */
  async create(data) {
    // Generate unsubscribe token if not provided
    if (!data.unsubscribeToken) {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 15);
      data.unsubscribeToken = `${timestamp}${random}`;
    }

    // Set defaults for nested objects
    if (!data.communicationPreferences) {
      data.communicationPreferences = {
        email: true,
        sms: false,
        portalNotifications: true
      };
    }

    if (!data.notificationTypes) {
      data.notificationTypes = {
        quarterlyUpdates: true,
        annualReports: true,
        documentSharing: true,
        portalAnnouncements: true,
        fundingUpdates: true,
        generalCommunications: true
      };
    }

    if (!data.frequency) {
      data.frequency = 'immediate';
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find preference by investor and company
   * @param {string} investorId - Investor ID
   * @param {string} companyId - Company ID
   * @returns {Object|null} Preference or null
   */
  async findByInvestorAndCompany(investorId, companyId) {
    return baseModel.findOne.call(baseModel, { investorId, companyId });
  },

  /**
   * Find preferences by investor
   * @param {string} investorId - Investor ID
   * @returns {Array} Preferences for investor
   */
  async findByInvestor(investorId) {
    return baseModel.find.call(baseModel, { investorId });
  },

  /**
   * Find preferences by company
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Array} Preferences for company
   */
  async findByCompany(companyId, options = {}) {
    const query = { companyId };
    if (options.unsubscribedAll !== undefined) {
      query.unsubscribedAll = options.unsubscribedAll;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Find preference by unsubscribe token
   * @param {string} token - Unsubscribe token
   * @returns {Object|null} Preference or null
   */
  async findByUnsubscribeToken(token) {
    return baseModel.findOne.call(baseModel, { unsubscribeToken: token });
  },

  /**
   * Check if investor wants a specific notification type
   * @param {Object} preference - Preference object
   * @param {string} type - Notification type
   * @returns {boolean} True if investor wants this notification type
   */
  wantsNotificationType(preference, type) {
    if (preference.unsubscribedAll) return false;

    const prefKey = NOTIFICATION_TYPE_MAP[type] || 'generalCommunications';
    return preference.notificationTypes[prefKey] !== false;
  },

  /**
   * Check if investor wants a specific channel
   * @param {Object} preference - Preference object
   * @param {string} channel - Channel (email, sms, portal)
   * @returns {boolean} True if investor wants this channel
   */
  wantsChannel(preference, channel) {
    if (preference.unsubscribedAll) return false;

    const prefKey = CHANNEL_MAP[channel];
    return prefKey ? preference.communicationPreferences[prefKey] !== false : false;
  },

  /**
   * Get default preferences
   * @returns {Object} Default preference values
   */
  getDefaults() {
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
  },

  /**
   * Unsubscribe from all communications
   * @param {string} investorId - Investor ID
   * @param {string} companyId - Company ID
   * @returns {Object} Updated preference
   */
  async unsubscribeAll(investorId, companyId) {
    return baseModel.updateOne.call(baseModel,
      { investorId, companyId },
      {
        $set: {
          unsubscribedAll: true,
          unsubscribedAt: new Date().toISOString()
        }
      }
    );
  },

  /**
   * Resubscribe to communications
   * @param {string} investorId - Investor ID
   * @param {string} companyId - Company ID
   * @returns {Object} Updated preference
   */
  async resubscribe(investorId, companyId) {
    return baseModel.updateOne.call(baseModel,
      { investorId, companyId },
      {
        $set: {
          unsubscribedAll: false,
          unsubscribedAt: null
        }
      }
    );
  },

  // Expose base model methods
  find: baseModel.find.bind(baseModel),
  findOne: baseModel.findOne.bind(baseModel),
  findById: baseModel.findById.bind(baseModel),
  updateOne: baseModel.updateOne.bind(baseModel),
  updateMany: baseModel.updateMany.bind(baseModel),
  findOneAndUpdate: baseModel.findOneAndUpdate.bind(baseModel),
  findByIdAndUpdate: baseModel.findByIdAndUpdate.bind(baseModel),
  deleteOne: baseModel.deleteOne.bind(baseModel),
  deleteMany: baseModel.deleteMany.bind(baseModel),
  findOneAndDelete: baseModel.findOneAndDelete.bind(baseModel),
  findByIdAndDelete: baseModel.findByIdAndDelete.bind(baseModel),
  countDocuments: baseModel.countDocuments.bind(baseModel),
  exists: baseModel.exists.bind(baseModel),
  distinct: baseModel.distinct.bind(baseModel),
  aggregate: baseModel.aggregate.bind(baseModel)
};

module.exports = InvestorPreference;
module.exports.FREQUENCY_OPTIONS = FREQUENCY_OPTIONS;

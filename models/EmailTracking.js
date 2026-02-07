/**
 * EmailTracking Model
 *
 * Issue #87: Implement Email Delivery Tracking
 *
 * Data model for tracking email delivery status, engagement metrics,
 * and provider webhooks. Supports open/click tracking with pixel
 * and link tracking, bounce handling, and engagement analytics.
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid email providers
const EMAIL_PROVIDERS = ['sendgrid', 'mailgun', 'ses', 'postmark', 'sparkpost', 'other'];

// Valid statuses
const VALID_STATUSES = ['queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'spam', 'unsubscribed', 'deferred'];

// Valid bounce types
const BOUNCE_TYPES = ['hard', 'soft', 'undetermined'];

// Schema definition for documentation and validation
const emailTrackingSchema = {
  trackingId: { type: 'string', required: true, unique: true },
  messageId: { type: 'string', required: true, unique: true },
  recipientEmail: { type: 'string', required: true },
  senderEmail: { type: 'string', required: true },
  subject: { type: 'string', required: true },
  templateId: { type: 'string', default: null },
  companyId: { type: 'string', default: null },
  userId: { type: 'string', default: null },
  provider: { type: 'string', enum: EMAIL_PROVIDERS, default: 'other' },
  status: { type: 'string', enum: VALID_STATUSES, default: 'queued' },
  trackingPixelUrl: { type: 'string', default: null },
  queuedAt: { type: 'date', default: null },
  sentAt: { type: 'date', default: null },
  deliveredAt: { type: 'date', default: null },
  firstOpenedAt: { type: 'date', default: null },
  lastOpenedAt: { type: 'date', default: null },
  firstClickedAt: { type: 'date', default: null },
  lastClickedAt: { type: 'date', default: null },
  opens: { type: 'array', default: [] },
  openCount: { type: 'number', default: 0 },
  clicks: { type: 'array', default: [] },
  clickCount: { type: 'number', default: 0 },
  uniqueUrlsClicked: { type: 'array', default: [] },
  bounceType: { type: 'string', enum: BOUNCE_TYPES, default: null },
  bounceReason: { type: 'string', default: null },
  bounceCode: { type: 'string', default: null },
  bouncedAt: { type: 'date', default: null },
  spamReportedAt: { type: 'date', default: null },
  spamReason: { type: 'string', default: null },
  unsubscribedAt: { type: 'date', default: null },
  unsubscribeReason: { type: 'string', default: null },
  failureReason: { type: 'string', default: null },
  failedAt: { type: 'date', default: null },
  providerMetadata: { type: 'object', default: {} },
  tags: { type: 'array', default: [] },
  metadata: { type: 'object', default: {} },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('email_tracking', emailTrackingSchema);

// Extended EmailTracking model with business logic
const EmailTracking = {
  ...baseModel,
  tableName: 'email_tracking',
  schema: emailTrackingSchema,

  // Export constants
  EMAIL_PROVIDERS,
  VALID_STATUSES,
  BOUNCE_TYPES,

  /**
   * Create a new email tracking record with defaults
   * @param {Object} data - Tracking data
   * @returns {Object} Created tracking record
   */
  async create(data) {
    if (!data.trackingId) {
      data.trackingId = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    if (!data.queuedAt) {
      data.queuedAt = new Date().toISOString();
    }

    if (!data.status) {
      data.status = 'queued';
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find tracking by trackingId
   * @param {string} trackingId - Tracking ID
   * @returns {Object|null} Tracking record or null
   */
  async findByTrackingId(trackingId) {
    return baseModel.findOne.call(baseModel, { trackingId });
  },

  /**
   * Find tracking by messageId
   * @param {string} messageId - Message ID
   * @returns {Object|null} Tracking record or null
   */
  async findByMessageId(messageId) {
    return baseModel.findOne.call(baseModel, { messageId });
  },

  /**
   * Find tracking by company
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Array} Tracking records for company
   */
  async findByCompany(companyId, options = {}) {
    const query = { companyId };
    if (options.status) {
      query.status = options.status;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Find tracking by recipient
   * @param {string} recipientEmail - Recipient email
   * @param {Object} options - Query options
   * @returns {Array} Tracking records for recipient
   */
  async findByRecipient(recipientEmail, options = {}) {
    const query = { recipientEmail: recipientEmail.toLowerCase() };
    if (options.status) {
      query.status = options.status;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Get engagement score
   * @param {Object} tracking - Tracking record
   * @returns {number} Engagement score
   */
  getEngagementScore(tracking) {
    let score = 0;
    if (['delivered', 'opened', 'clicked'].includes(tracking.status)) {
      score += 1;
    }
    if (tracking.openCount > 0) {
      score += Math.min(tracking.openCount, 5); // Cap at 5 opens
    }
    if (tracking.clickCount > 0) {
      score += tracking.clickCount * 2; // Clicks are more valuable
    }
    return score;
  },

  /**
   * Check if email was engaged
   * @param {Object} tracking - Tracking record
   * @returns {boolean} True if engaged
   */
  isEngaged(tracking) {
    return tracking.openCount > 0 || tracking.clickCount > 0;
  },

  /**
   * Get delivery time in ms
   * @param {Object} tracking - Tracking record
   * @returns {number|null} Delivery time
   */
  getDeliveryTime(tracking) {
    if (tracking.deliveredAt && tracking.sentAt) {
      return new Date(tracking.deliveredAt) - new Date(tracking.sentAt);
    }
    return null;
  },

  /**
   * Record open event
   * @param {string} trackingId - Tracking ID
   * @param {Object} openInfo - Open event info
   * @returns {Object} Updated tracking record
   */
  async recordOpen(trackingId, openInfo = {}) {
    const tracking = await this.findByTrackingId(trackingId);
    if (!tracking) {
      throw new Error('Tracking record not found');
    }

    const opens = tracking.opens || [];
    opens.push({
      timestamp: new Date().toISOString(),
      ipAddress: openInfo.ipAddress,
      userAgent: openInfo.userAgent,
      location: openInfo.location
    });

    const updateData = {
      opens,
      openCount: opens.length,
      lastOpenedAt: new Date().toISOString()
    };

    if (!tracking.firstOpenedAt) {
      updateData.firstOpenedAt = new Date().toISOString();
    }

    if (tracking.status === 'delivered') {
      updateData.status = 'opened';
    }

    return baseModel.updateOne.call(baseModel,
      { trackingId },
      { $set: updateData }
    );
  },

  /**
   * Record click event
   * @param {string} trackingId - Tracking ID
   * @param {Object} clickInfo - Click event info
   * @returns {Object} Updated tracking record
   */
  async recordClick(trackingId, clickInfo) {
    const tracking = await this.findByTrackingId(trackingId);
    if (!tracking) {
      throw new Error('Tracking record not found');
    }

    const clicks = tracking.clicks || [];
    clicks.push({
      timestamp: new Date().toISOString(),
      url: clickInfo.url,
      ipAddress: clickInfo.ipAddress,
      userAgent: clickInfo.userAgent,
      location: clickInfo.location
    });

    const uniqueUrlsClicked = tracking.uniqueUrlsClicked || [];
    if (!uniqueUrlsClicked.includes(clickInfo.url)) {
      uniqueUrlsClicked.push(clickInfo.url);
    }

    const updateData = {
      clicks,
      clickCount: clicks.length,
      uniqueUrlsClicked,
      lastClickedAt: new Date().toISOString(),
      status: 'clicked'
    };

    if (!tracking.firstClickedAt) {
      updateData.firstClickedAt = new Date().toISOString();
    }

    return baseModel.updateOne.call(baseModel,
      { trackingId },
      { $set: updateData }
    );
  },

  /**
   * Record bounce
   * @param {string} trackingId - Tracking ID
   * @param {Object} bounceInfo - Bounce info
   * @returns {Object} Updated tracking record
   */
  async recordBounce(trackingId, bounceInfo) {
    return baseModel.updateOne.call(baseModel,
      { trackingId },
      {
        $set: {
          status: 'bounced',
          bounceType: bounceInfo.bounceType,
          bounceReason: bounceInfo.reason,
          bounceCode: bounceInfo.code,
          bouncedAt: new Date().toISOString()
        }
      }
    );
  },

  /**
   * Get delivery stats for a company
   * @param {string} companyId - Company ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} Delivery statistics
   */
  async getDeliveryStats(companyId, startDate = null, endDate = null) {
    let records = await baseModel.find.call(baseModel, { companyId });

    if (startDate) {
      records = records.filter(r => new Date(r.createdAt) >= startDate);
    }
    if (endDate) {
      records = records.filter(r => new Date(r.createdAt) <= endDate);
    }

    const stats = {};
    records.forEach(r => {
      if (!stats[r.status]) {
        stats[r.status] = { count: 0, totalOpens: 0, totalClicks: 0 };
      }
      stats[r.status].count++;
      stats[r.status].totalOpens += r.openCount || 0;
      stats[r.status].totalClicks += r.clickCount || 0;
    });

    return Object.entries(stats).map(([status, data]) => ({
      _id: status,
      ...data
    }));
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

module.exports = EmailTracking;

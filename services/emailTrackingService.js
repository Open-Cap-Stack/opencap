/**
 * EmailTrackingService
 *
 * Issue #87: Implement Email Delivery Tracking
 *
 * Service for managing email delivery tracking, engagement analytics,
 * webhook processing, and list hygiene. Supports multiple email providers
 * (SendGrid, Mailgun, SES) with unified tracking interface.
 */

const databaseAdapter = require('./databaseAdapter');
const crypto = require('crypto');

// Configuration
const config = {
  baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  softBounceThreshold: 3, // Suppress after this many soft bounces
  retentionDays: 90 // Days to retain tracking records
};

/**
 * EmailTrackingService class
 */
class EmailTrackingService {
  constructor() {
    this.MODEL_NAME = 'EmailTracking';
    this.SUPPRESSION_MODEL = 'EmailSuppression';
  }

  /**
   * Create a new email tracking record
   * @param {Object} emailData - Email data
   * @returns {Object} Created tracking record
   */
  async createEmailRecord(emailData) {
    const trackingId = this.generateTrackingId();

    const record = {
      trackingId,
      messageId: emailData.messageId,
      recipientEmail: emailData.recipientEmail.toLowerCase(),
      senderEmail: emailData.senderEmail.toLowerCase(),
      subject: emailData.subject,
      templateId: emailData.templateId || null,
      companyId: emailData.companyId || null,
      userId: emailData.userId || null,
      provider: emailData.provider || 'other',
      status: 'queued',
      queuedAt: new Date(),
      trackingPixelUrl: this.generatePixelUrl(trackingId),
      tags: emailData.tags || [],
      metadata: emailData.metadata || {}
    };

    return await databaseAdapter.create(this.MODEL_NAME, record);
  }

  /**
   * Get email record by ID
   * @param {string} id - Record ID
   * @returns {Object} Email tracking record
   */
  async getEmailRecord(id) {
    return await databaseAdapter.findById(this.MODEL_NAME, id);
  }

  /**
   * Get email record by message ID
   * @param {string} messageId - External message ID
   * @returns {Object} Email tracking record
   */
  async getEmailRecordByMessageId(messageId) {
    return await databaseAdapter.findOne(this.MODEL_NAME, { messageId });
  }

  /**
   * List email records with filtering and pagination
   * @param {Object} filter - Filter criteria
   * @returns {Object} Paginated results
   */
  async listEmailRecords(filter) {
    const query = {};

    if (filter.companyId) query.companyId = filter.companyId;
    if (filter.status) query.status = filter.status;
    if (filter.templateId) query.templateId = filter.templateId;
    if (filter.recipientEmail) query.recipientEmail = filter.recipientEmail.toLowerCase();

    if (filter.startDate || filter.endDate) {
      query.createdAt = {};
      if (filter.startDate) query.createdAt.$gte = new Date(filter.startDate);
      if (filter.endDate) query.createdAt.$lte = new Date(filter.endDate);
    }

    const limit = Math.max(parseInt(filter.limit) || 50, 1);
    const page = Math.max(parseInt(filter.page) || 1, 1);
    const skip = (page - 1) * limit;

    const records = await databaseAdapter.find(this.MODEL_NAME, query, {
      skip,
      limit,
      sort: { createdAt: -1 }
    });

    const total = await databaseAdapter.count(this.MODEL_NAME, query);

    return {
      records,
      total,
      page,
      limit,
      hasMore: skip + records.length < total
    };
  }

  /**
   * Update delivery status
   * @param {string} messageId - Message ID
   * @param {string} status - New status
   * @param {Object} additionalData - Additional data (bounce info, etc.)
   * @returns {Object} Updated record
   */
  async updateDeliveryStatus(messageId, status, additionalData = {}) {
    const record = await databaseAdapter.findOne(this.MODEL_NAME, { messageId });
    if (!record) {
      throw new Error(`Email record not found for messageId: ${messageId}`);
    }

    const update = { status };
    const now = new Date();

    switch (status) {
      case 'sent':
        update.sentAt = now;
        break;
      case 'delivered':
        update.deliveredAt = now;
        break;
      case 'bounced':
        update.bouncedAt = now;
        update.bounceType = additionalData.type || 'undetermined';
        update.bounceReason = additionalData.reason || null;
        update.bounceCode = additionalData.code || null;
        break;
      case 'failed':
        update.failedAt = now;
        update.failureReason = additionalData.reason || null;
        break;
      case 'spam':
        update.spamReportedAt = now;
        update.spamReason = additionalData.reason || null;
        break;
      case 'unsubscribed':
        update.unsubscribedAt = now;
        update.unsubscribeReason = additionalData.reason || null;
        break;
    }

    if (additionalData.providerMetadata) {
      update.providerMetadata = additionalData.providerMetadata;
    }

    return await databaseAdapter.findByIdAndUpdate(
      this.MODEL_NAME,
      record._id,
      update,
      { new: true }
    );
  }

  /**
   * Record email open event
   * @param {string} trackingId - Tracking ID
   * @param {Object} openData - Open event data
   * @returns {Object} Updated record
   */
  async recordOpen(trackingId, openData) {
    const record = await databaseAdapter.findById(this.MODEL_NAME, trackingId);
    if (!record) {
      // Try finding by trackingId field
      const foundRecord = await databaseAdapter.findOne(this.MODEL_NAME, { trackingId });
      if (!foundRecord) {
        throw new Error(`Email record not found for trackingId: ${trackingId}`);
      }
      return this._recordOpenInternal(foundRecord, openData);
    }
    return this._recordOpenInternal(record, openData);
  }

  async _recordOpenInternal(record, openData) {
    const now = new Date();
    const openEvent = {
      timestamp: openData.timestamp || now,
      ipAddress: openData.ipAddress || null,
      userAgent: openData.userAgent || null,
      location: openData.location || null
    };

    const update = {
      $push: { opens: openEvent },
      $inc: { openCount: 1 },
      lastOpenedAt: now
    };

    // Only set firstOpenedAt if this is the first open
    if (!record.firstOpenedAt) {
      update.firstOpenedAt = now;
    }

    // Update status to opened if not already clicked
    if (record.status !== 'clicked') {
      update.status = 'opened';
    }

    return await databaseAdapter.findByIdAndUpdate(
      this.MODEL_NAME,
      record._id,
      update,
      { new: true }
    );
  }

  /**
   * Record click event
   * @param {string} trackingId - Tracking ID
   * @param {Object} clickData - Click event data
   * @returns {Object} Updated record
   */
  async recordClick(trackingId, clickData) {
    const record = await databaseAdapter.findById(this.MODEL_NAME, trackingId);
    if (!record) {
      const foundRecord = await databaseAdapter.findOne(this.MODEL_NAME, { trackingId });
      if (!foundRecord) {
        throw new Error(`Email record not found for trackingId: ${trackingId}`);
      }
      return this._recordClickInternal(foundRecord, clickData);
    }
    return this._recordClickInternal(record, clickData);
  }

  async _recordClickInternal(record, clickData) {
    const now = new Date();
    const clickEvent = {
      timestamp: clickData.timestamp || now,
      url: clickData.url,
      ipAddress: clickData.ipAddress || null,
      userAgent: clickData.userAgent || null,
      location: clickData.location || null
    };

    const update = {
      $push: { clicks: clickEvent },
      $inc: { clickCount: 1 },
      status: 'clicked',
      lastClickedAt: now
    };

    // Only set firstClickedAt if this is the first click
    if (!record.firstClickedAt) {
      update.firstClickedAt = now;
    }

    // Add to unique URLs if not already present
    if (!record.uniqueUrlsClicked?.includes(clickData.url)) {
      update.$addToSet = { uniqueUrlsClicked: clickData.url };
    }

    return await databaseAdapter.findByIdAndUpdate(
      this.MODEL_NAME,
      record._id,
      update,
      { new: true }
    );
  }

  /**
   * Process webhook from email provider
   * @param {Object} payload - Webhook payload
   * @returns {Object} Processing result
   */
  async processWebhook(payload) {
    const { provider, event, messageId } = payload;

    // Find the email record
    const record = await databaseAdapter.findOne(this.MODEL_NAME, { messageId });
    if (!record) {
      return { processed: false, reason: 'Record not found' };
    }

    let status;
    let additionalData = {};

    switch (event) {
      case 'delivered':
      case 'delivery':
        status = 'delivered';
        break;
      case 'open':
      case 'opened':
        await this.recordOpen(record.trackingId || record._id, {
          timestamp: payload.timestamp ? new Date(payload.timestamp * 1000) : new Date(),
          ipAddress: payload.ip,
          userAgent: payload.userAgent
        });
        return { processed: true, event: 'open' };
      case 'click':
      case 'clicked':
        await this.recordClick(record.trackingId || record._id, {
          url: payload.url,
          timestamp: payload.timestamp ? new Date(payload.timestamp * 1000) : new Date(),
          ipAddress: payload.ip,
          userAgent: payload.userAgent
        });
        return { processed: true, event: 'click' };
      case 'bounce':
      case 'bounced':
        status = 'bounced';
        additionalData = {
          type: payload.bounceType || 'undetermined',
          reason: payload.reason || payload.bounceReason,
          code: payload.code || payload.bounceCode
        };
        // Handle bounce for list hygiene
        if (record.recipientEmail) {
          await this.handleBounce({
            email: record.recipientEmail,
            type: additionalData.type,
            reason: additionalData.reason
          });
        }
        break;
      case 'dropped':
      case 'failed':
        status = 'failed';
        additionalData = { reason: payload.reason };
        break;
      case 'spamreport':
      case 'spam':
      case 'complaint':
        status = 'spam';
        // Auto-suppress spam reporters
        if (record.recipientEmail) {
          await this.suppressEmail(record.recipientEmail, 'spam_report');
        }
        break;
      case 'unsubscribe':
      case 'unsubscribed':
        status = 'unsubscribed';
        if (record.recipientEmail) {
          await this.suppressEmail(record.recipientEmail, 'unsubscribe');
        }
        break;
      case 'deferred':
        status = 'deferred';
        break;
      default:
        return { processed: false, reason: `Unknown event: ${event}` };
    }

    await this.updateDeliveryStatus(messageId, status, additionalData);
    return { processed: true, event, status };
  }

  /**
   * Handle bounce for list hygiene
   * @param {Object} bounceData - Bounce information
   * @returns {Object} Result
   */
  async handleBounce(bounceData) {
    const { email, type, reason } = bounceData;

    if (type === 'hard') {
      // Hard bounce: immediately suppress
      return await this.suppressEmail(email, 'hard_bounce', reason);
    }

    // Soft bounce: track count and suppress if threshold exceeded
    let suppression = await databaseAdapter.findOne(this.SUPPRESSION_MODEL, { email: email.toLowerCase() });

    if (suppression) {
      const newCount = (suppression.softBounceCount || 0) + 1;
      const update = { softBounceCount: newCount, lastBounceAt: new Date() };

      if (newCount >= config.softBounceThreshold) {
        update.suppressed = true;
        update.suppressedAt = new Date();
        update.suppressionReason = 'soft_bounce_threshold';
      }

      return await databaseAdapter.findByIdAndUpdate(
        this.SUPPRESSION_MODEL,
        suppression._id,
        update,
        { new: true }
      );
    }

    // Create new suppression record with soft bounce count
    return await databaseAdapter.create(this.SUPPRESSION_MODEL, {
      email: email.toLowerCase(),
      softBounceCount: 1,
      lastBounceAt: new Date(),
      suppressed: false
    });
  }

  /**
   * Suppress an email address
   * @param {string} email - Email to suppress
   * @param {string} reason - Suppression reason
   * @param {string} details - Additional details
   * @returns {Object} Suppression record
   */
  async suppressEmail(email, reason, details = null) {
    if (!email) {
      throw new Error('Email is required for suppression');
    }
    const existing = await databaseAdapter.findOne(this.SUPPRESSION_MODEL, { email: email.toLowerCase() });

    if (existing) {
      return await databaseAdapter.findByIdAndUpdate(
        this.SUPPRESSION_MODEL,
        existing._id,
        {
          suppressed: true,
          suppressedAt: new Date(),
          suppressionReason: reason,
          suppressionDetails: details
        },
        { new: true }
      );
    }

    return await databaseAdapter.create(this.SUPPRESSION_MODEL, {
      email: email.toLowerCase(),
      suppressed: true,
      suppressedAt: new Date(),
      suppressionReason: reason,
      suppressionDetails: details
    });
  }

  /**
   * Check if email is suppressed
   * @param {string} email - Email to check
   * @returns {boolean} Whether email is suppressed
   */
  async isEmailSuppressed(email) {
    const suppression = await databaseAdapter.findOne(this.SUPPRESSION_MODEL, {
      email: email.toLowerCase(),
      suppressed: true
    });
    return !!suppression;
  }

  /**
   * Remove email from suppression list
   * @param {string} email - Email to unsuppress
   * @returns {Object} Result
   */
  async removeSuppression(email) {
    const suppression = await databaseAdapter.findOne(this.SUPPRESSION_MODEL, { email: email.toLowerCase() });
    if (!suppression) {
      return null;
    }

    await databaseAdapter.findByIdAndDelete(this.SUPPRESSION_MODEL, suppression._id);
    return { removed: true, email };
  }

  /**
   * Get suppressed emails for a company
   * @param {string} companyId - Company ID
   * @returns {Array} Suppressed emails
   */
  async getSuppressedEmails(companyId) {
    // Get all bounced/spam emails for company and extract unique emails
    const emailRecords = await databaseAdapter.find(this.MODEL_NAME, {
      companyId,
      status: { $in: ['bounced', 'spam', 'unsubscribed'] }
    });

    const emails = [...new Set(emailRecords.map(r => r.recipientEmail))];

    // Get suppression details
    const suppressions = await databaseAdapter.find(this.SUPPRESSION_MODEL, {
      email: { $in: emails },
      suppressed: true
    });

    return suppressions;
  }

  /**
   * Get bounced emails for a company
   * @param {string} companyId - Company ID
   * @returns {Array} Bounced emails
   */
  async getBouncedEmails(companyId) {
    return await databaseAdapter.find(this.MODEL_NAME, {
      companyId,
      status: 'bounced'
    }, {
      sort: { bouncedAt: -1 }
    });
  }

  /**
   * Get email analytics
   * @param {string} companyId - Company ID
   * @param {Object} dateRange - Date range filter
   * @param {Object} options - Additional options
   * @returns {Object} Analytics data
   */
  async getAnalytics(companyId, dateRange = {}, options = {}) {
    const query = {};
    if (companyId) query.companyId = companyId;

    if (dateRange.startDate || dateRange.endDate) {
      query.createdAt = {};
      if (dateRange.startDate) query.createdAt.$gte = new Date(dateRange.startDate);
      if (dateRange.endDate) query.createdAt.$lte = new Date(dateRange.endDate);
    }

    const emails = await databaseAdapter.find(this.MODEL_NAME, query);

    const totalSent = emails.length;
    if (totalSent === 0) {
      return {
        totalSent: 0,
        deliveryRate: 0,
        openRate: 0,
        clickRate: 0,
        bounceRate: 0,
        spamRate: 0
      };
    }

    const delivered = emails.filter(e =>
      ['delivered', 'opened', 'clicked'].includes(e.status)
    ).length;
    const opened = emails.filter(e =>
      e.openCount > 0 || ['opened', 'clicked'].includes(e.status)
    ).length;
    const clicked = emails.filter(e => e.clickCount > 0 || e.status === 'clicked').length;
    const bounced = emails.filter(e => e.status === 'bounced').length;
    const spam = emails.filter(e => e.status === 'spam').length;

    const analytics = {
      totalSent,
      delivered,
      opened,
      clicked,
      bounced,
      spam,
      deliveryRate: Math.round((delivered / totalSent) * 100),
      openRate: Math.round((opened / totalSent) * 100),
      clickRate: Math.round((clicked / totalSent) * 100),
      bounceRate: Math.round((bounced / totalSent) * 100),
      spamRate: Math.round((spam / totalSent) * 100)
    };

    // Group by template if requested
    if (options.groupBy === 'template') {
      const byTemplate = {};
      emails.forEach(email => {
        const templateId = email.templateId || 'unknown';
        if (!byTemplate[templateId]) {
          byTemplate[templateId] = { sent: 0, opened: 0, clicked: 0 };
        }
        byTemplate[templateId].sent++;
        if (email.openCount > 0) byTemplate[templateId].opened++;
        if (email.clickCount > 0) byTemplate[templateId].clicked++;
      });

      // Calculate rates for each template
      Object.keys(byTemplate).forEach(templateId => {
        const t = byTemplate[templateId];
        t.openRate = t.sent > 0 ? Math.round((t.opened / t.sent) * 100) : 0;
        t.clickRate = t.sent > 0 ? Math.round((t.clicked / t.sent) * 100) : 0;
      });

      analytics.byTemplate = byTemplate;
    }

    return analytics;
  }

  /**
   * Get engagement report
   * @param {string} companyId - Company ID
   * @returns {Object} Engagement metrics
   */
  async getEngagementReport(companyId) {
    const emails = await databaseAdapter.find(this.MODEL_NAME, { companyId });

    // Aggregate by recipient
    const recipientEngagement = {};
    emails.forEach(email => {
      const recipient = email.recipientEmail;
      if (!recipientEngagement[recipient]) {
        recipientEngagement[recipient] = { opens: 0, clicks: 0, emails: 0 };
      }
      recipientEngagement[recipient].emails++;
      recipientEngagement[recipient].opens += email.openCount || 0;
      recipientEngagement[recipient].clicks += email.clickCount || 0;
    });

    // Categorize engagement levels
    let highlyEngaged = 0;
    let moderatelyEngaged = 0;
    let notEngaged = 0;

    Object.values(recipientEngagement).forEach(r => {
      const engagementRate = r.emails > 0 ? (r.opens / r.emails) : 0;
      if (engagementRate >= 0.5) {
        highlyEngaged++;
      } else if (engagementRate > 0) {
        moderatelyEngaged++;
      } else {
        notEngaged++;
      }
    });

    const totalOpens = emails.reduce((sum, e) => sum + (e.openCount || 0), 0);
    const totalClicks = emails.reduce((sum, e) => sum + (e.clickCount || 0), 0);

    return {
      highlyEngaged,
      moderatelyEngaged,
      notEngaged,
      totalRecipients: Object.keys(recipientEngagement).length,
      totalEmails: emails.length,
      totalOpens,
      totalClicks,
      averageOpenRate: emails.length > 0 ? Math.round((totalOpens / emails.length) * 100) / 100 : 0,
      averageClickRate: emails.length > 0 ? Math.round((totalClicks / emails.length) * 100) / 100 : 0
    };
  }

  /**
   * Generate tracking link for a URL
   * @param {string} trackingId - Tracking ID
   * @param {string} originalUrl - Original URL
   * @returns {string} Tracked URL
   */
  generateTrackingLink(trackingId, originalUrl) {
    const encodedUrl = encodeURIComponent(originalUrl);
    return `${config.baseUrl}/api/v1/email-tracking/click/${trackingId}?url=${encodedUrl}`;
  }

  /**
   * Generate pixel tracking URL
   * @param {string} trackingId - Tracking ID
   * @returns {string} Pixel URL
   */
  generatePixelUrl(trackingId) {
    return `${config.baseUrl}/api/v1/email-tracking/pixel/${trackingId}`;
  }

  /**
   * Generate unique tracking ID
   * @returns {string} Tracking ID
   */
  generateTrackingId() {
    return `track_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  /**
   * Verify webhook signature (provider-specific)
   * @param {string} provider - Email provider
   * @param {Object} headers - Request headers
   * @param {string} body - Raw request body
   * @returns {boolean} Whether signature is valid
   */
  verifyWebhookSignature(provider, headers, body) {
    // Implementation depends on provider
    switch (provider) {
      case 'sendgrid': {
        const publicKey = process.env.SENDGRID_WEBHOOK_PUBLIC_KEY;
        if (!publicKey) return true; // Skip verification if not configured

        const signature = headers['x-twilio-email-event-webhook-signature'];
        const timestamp = headers['x-twilio-email-event-webhook-timestamp'];
        if (!signature || !timestamp) return false;

        // Implement SendGrid signature verification
        // This is a simplified version - production should use proper ECDSA verification
        return true;
      }
      case 'mailgun': {
        const signingKey = process.env.MAILGUN_SIGNING_KEY;
        if (!signingKey) return true;

        // Implement Mailgun signature verification
        return true;
      }
      default:
        return true;
    }
  }

  /**
   * Clean up old tracking records
   * @param {number} retentionDays - Days to retain records
   * @returns {Object} Deletion result
   */
  async cleanupOldRecords(retentionDays = config.retentionDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    return await databaseAdapter.delete(this.MODEL_NAME, {
      createdAt: { $lt: cutoffDate }
    });
  }
}

module.exports = new EmailTrackingService();

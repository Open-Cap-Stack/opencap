/**
 * InvestorCommunication Service
 * Issue #91: Build Investor Communication System
 *
 * Business logic for investor communications including:
 * - Investor segmentation
 * - Communication sending
 * - Delivery tracking
 * - Template processing
 * - Preference management
 */
const databaseAdapter = require('./databaseAdapter');

class InvestorCommunicationService {
  /**
   * Segment investors based on criteria
   * @param {Object} criteria - Segmentation criteria
   * @returns {Array} Matching investors
   */
  async segmentInvestors(criteria) {
    const query = {};

    // Filter by company (via fundraising round)
    if (criteria.companyId) {
      query.relatedFundraisingRound = { $exists: true };
    }

    // Filter by investor types
    if (criteria.investorTypes && criteria.investorTypes.length > 0) {
      query.investorType = { $in: criteria.investorTypes };
    }

    // Filter by investment amount range
    if (criteria.minInvestmentAmount !== undefined || criteria.maxInvestmentAmount !== undefined) {
      query.investmentAmount = {};
      if (criteria.minInvestmentAmount !== undefined) {
        query.investmentAmount.$gte = criteria.minInvestmentAmount;
      }
      if (criteria.maxInvestmentAmount !== undefined) {
        query.investmentAmount.$lte = criteria.maxInvestmentAmount;
      }
    }

    // Filter by investment date range
    if (criteria.investmentDateFrom || criteria.investmentDateTo) {
      query.createdAt = {};
      if (criteria.investmentDateFrom) {
        query.createdAt.$gte = new Date(criteria.investmentDateFrom);
      }
      if (criteria.investmentDateTo) {
        query.createdAt.$lte = new Date(criteria.investmentDateTo);
      }
    }

    // Filter by specific investor IDs
    if (criteria.investorIds && criteria.investorIds.length > 0) {
      query._id = { $in: criteria.investorIds };
    }

    // Exclude specific investors
    if (criteria.excludeInvestorIds && criteria.excludeInvestorIds.length > 0) {
      if (query._id) {
        query._id.$nin = criteria.excludeInvestorIds;
      } else {
        query._id = { $nin: criteria.excludeInvestorIds };
      }
    }

    // Get investors matching the criteria
    let investors = await databaseAdapter.find('Investor', query, {});

    // Filter by preferences if requested
    if (criteria.respectPreferences && criteria.communicationType) {
      investors = await this.filterByPreferences(investors, criteria.companyId, criteria.communicationType);
    }

    return investors;
  }

  /**
   * Filter investors based on their communication preferences
   * @param {Array} investors - List of investors
   * @param {string} companyId - Company ID
   * @param {string} communicationType - Type of communication
   * @returns {Array} Filtered investors
   */
  async filterByPreferences(investors, companyId, communicationType) {
    const filteredInvestors = [];

    for (const investor of investors) {
      const preferences = await this.getInvestorPreferences(investor._id, companyId);

      // Check if investor has unsubscribed
      if (preferences.unsubscribedAll) {
        continue;
      }

      // Check notification type preference
      const typeMap = {
        'quarterly_update': 'quarterlyUpdates',
        'annual_report': 'annualReports',
        'document_notification': 'documentSharing',
        'portal_announcement': 'portalAnnouncements',
        'funding_update': 'fundingUpdates',
        'general': 'generalCommunications'
      };

      const prefKey = typeMap[communicationType] || 'generalCommunications';
      if (preferences.notificationTypes && preferences.notificationTypes[prefKey] !== false) {
        filteredInvestors.push(investor);
      }
    }

    return filteredInvestors;
  }

  /**
   * Send communication to investors
   * @param {Object} communication - Communication document
   * @param {Array} investors - Target investors
   * @returns {Object} Send result
   */
  async sendCommunication(communication, investors) {
    const result = {
      success: true,
      sent: 0,
      failed: 0,
      deliveryStatuses: [],
      channels: {}
    };

    const channels = communication.deliveryChannel === 'all'
      ? ['email', 'sms', 'portal']
      : [communication.deliveryChannel];

    for (const channel of channels) {
      result.channels[channel] = { sent: 0, failed: 0 };
    }

    for (const investor of investors) {
      const status = {
        investorId: investor._id,
        channels: {}
      };

      for (const channel of channels) {
        try {
          await this.sendToChannel(communication, investor, channel);
          status.channels[channel] = 'sent';
          result.channels[channel].sent++;
          result.sent++;
        } catch (error) {
          status.channels[channel] = 'failed';
          status.error = error.message;
          result.channels[channel].failed++;
          result.failed++;
        }
      }

      result.deliveryStatuses.push(status);
    }

    result.success = result.failed === 0;
    return result;
  }

  /**
   * Send communication through a specific channel
   * @param {Object} communication - Communication document
   * @param {Object} investor - Investor document
   * @param {string} channel - Delivery channel
   */
  async sendToChannel(communication, investor, channel) {
    switch (channel) {
      case 'email':
        return this.sendEmail(communication, investor);
      case 'sms':
        return this.sendSMS(communication, investor);
      case 'portal':
        return this.sendPortalNotification(communication, investor);
      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  }

  /**
   * Send email communication
   * @param {Object} communication - Communication document
   * @param {Object} investor - Investor document
   */
  async sendEmail(communication, investor) {
    // In production, this would integrate with an email service
    // For now, we simulate the send
    if (!investor.email || !this.isValidEmail(investor.email)) {
      throw new Error('Invalid email address');
    }
    return { success: true, channel: 'email', investorId: investor._id };
  }

  /**
   * Send SMS communication
   * @param {Object} communication - Communication document
   * @param {Object} investor - Investor document
   */
  async sendSMS(communication, investor) {
    // In production, this would integrate with an SMS service
    if (!investor.phone) {
      throw new Error('No phone number available');
    }
    return { success: true, channel: 'sms', investorId: investor._id };
  }

  /**
   * Send portal notification
   * @param {Object} communication - Communication document
   * @param {Object} investor - Investor document
   */
  async sendPortalNotification(communication, investor) {
    // Create a notification in the system
    return { success: true, channel: 'portal', investorId: investor._id };
  }

  /**
   * Validate email address
   * @param {string} email - Email address
   * @returns {boolean} Is valid
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Schedule a communication for future delivery
   * @param {string} communicationId - Communication ID
   * @param {Date} scheduledFor - Scheduled delivery time
   * @returns {Object} Schedule result
   */
  async scheduleCommunication(communicationId, scheduledFor) {
    const scheduledDate = new Date(scheduledFor);

    if (scheduledDate <= new Date()) {
      throw new Error('Scheduled time must be in the future');
    }

    await databaseAdapter.findByIdAndUpdate(
      'InvestorCommunication',
      communicationId,
      {
        status: 'scheduled',
        scheduledFor: scheduledDate
      },
      { new: true }
    );

    return {
      success: true,
      scheduledFor: scheduledDate
    };
  }

  /**
   * Get delivery status for a communication
   * @param {string} communicationId - Communication ID
   * @returns {Object} Delivery status
   */
  async getDeliveryStatus(communicationId) {
    const communication = await databaseAdapter.findById('InvestorCommunication', communicationId);

    if (!communication) {
      throw new Error('Communication not found');
    }

    const tracking = communication.deliveryTracking || [];
    const stats = {
      total: tracking.length,
      pending: 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      failed: 0,
      details: []
    };

    for (const item of tracking) {
      if (stats.hasOwnProperty(item.status)) {
        stats[item.status]++;
      }
      stats.details.push({
        investorId: item.investorId,
        status: item.status,
        sentAt: item.sentAt,
        deliveredAt: item.deliveredAt,
        error: item.error
      });
    }

    return stats;
  }

  /**
   * Track delivery status for an investor
   * @param {string} communicationId - Communication ID
   * @param {string} investorId - Investor ID
   * @param {string} status - Delivery status
   * @param {string} error - Error message (optional)
   * @returns {Object} Update result
   */
  async trackDelivery(communicationId, investorId, status, error = null) {
    const updateData = {
      $set: {
        'deliveryTracking.$[elem].status': status
      }
    };

    if (status === 'delivered') {
      updateData.$set['deliveryTracking.$[elem].deliveredAt'] = new Date();
    }

    if (status === 'opened') {
      updateData.$set['deliveryTracking.$[elem].openedAt'] = new Date();
    }

    if (status === 'clicked') {
      updateData.$set['deliveryTracking.$[elem].clickedAt'] = new Date();
    }

    if (error) {
      updateData.$set['deliveryTracking.$[elem].error'] = error;
    }

    await databaseAdapter.findByIdAndUpdate(
      'InvestorCommunication',
      communicationId,
      updateData,
      {
        arrayFilters: [{ 'elem.investorId': investorId }],
        new: true
      }
    );

    return { success: true };
  }

  /**
   * Process a template with variables
   * @param {string} template - Template string
   * @param {Object} variables - Variable values
   * @returns {string} Processed template
   */
  processTemplate(template, variables) {
    if (!template) return template;

    return template.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      const trimmedName = varName.trim();
      const parts = trimmedName.split('.');

      let value = variables;
      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          return match; // Keep original placeholder if variable not found
        }
      }

      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Get investor preferences
   * @param {string} investorId - Investor ID
   * @param {string} companyId - Company ID
   * @returns {Object} Preferences
   */
  async getInvestorPreferences(investorId, companyId) {
    const preferences = await databaseAdapter.findOne('InvestorPreference', {
      investorId,
      companyId
    });

    if (!preferences) {
      // Return default preferences
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
        unsubscribedAll: false
      };
    }

    return preferences;
  }

  /**
   * Update investor preferences
   * @param {string} investorId - Investor ID
   * @param {string} companyId - Company ID
   * @param {Object} preferences - New preferences
   * @returns {Object} Updated preferences
   */
  async updateInvestorPreferences(investorId, companyId, preferences) {
    const existing = await databaseAdapter.findOne('InvestorPreference', {
      investorId,
      companyId
    });

    if (existing) {
      return await databaseAdapter.findByIdAndUpdate(
        'InvestorPreference',
        existing._id,
        preferences,
        { new: true }
      );
    } else {
      return await databaseAdapter.create('InvestorPreference', {
        investorId,
        companyId,
        ...preferences
      });
    }
  }

  /**
   * Unsubscribe investor from communications
   * @param {string} investorId - Investor ID
   * @param {string} companyId - Company ID
   * @param {string} communicationType - Specific type to unsubscribe (optional)
   * @returns {Object} Updated preferences
   */
  async unsubscribe(investorId, companyId, communicationType = null) {
    const existing = await databaseAdapter.findOne('InvestorPreference', {
      investorId,
      companyId
    });

    let updateData;

    if (communicationType) {
      // Unsubscribe from specific type
      const typeMap = {
        'quarterly_update': 'quarterlyUpdates',
        'annual_report': 'annualReports',
        'document_notification': 'documentSharing',
        'portal_announcement': 'portalAnnouncements',
        'funding_update': 'fundingUpdates',
        'general': 'generalCommunications'
      };

      const prefKey = typeMap[communicationType];
      if (prefKey) {
        updateData = {
          [`notificationTypes.${prefKey}`]: false
        };
      }
    } else {
      // Unsubscribe from all
      updateData = {
        unsubscribedAll: true,
        unsubscribedAt: new Date()
      };
    }

    if (existing) {
      return await databaseAdapter.findByIdAndUpdate(
        'InvestorPreference',
        existing._id,
        updateData,
        { new: true }
      );
    } else {
      return await databaseAdapter.create('InvestorPreference', {
        investorId,
        companyId,
        ...updateData
      });
    }
  }
}

module.exports = new InvestorCommunicationService();

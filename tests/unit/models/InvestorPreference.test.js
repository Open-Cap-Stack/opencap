/**
 * InvestorPreference Model Unit Tests
 * Issue #91: Build Investor Communication System
 *
 * Tests for ZeroDB-based InvestorPreference model
 */
process.env.SKIP_DB_SETUP = 'true';

const InvestorPreference = require('../../../models/InvestorPreference');

describe('InvestorPreference Model', () => {
  describe('Schema Definition', () => {
    it('should have correct table name', () => {
      expect(InvestorPreference.tableName).toBe('investor_preferences');
    });

    it('should have required fields defined', () => {
      const schema = InvestorPreference.schema;
      expect(schema.investorId).toBeDefined();
      expect(schema.companyId).toBeDefined();
      expect(schema.communicationPreferences).toBeDefined();
    });

    it('should mark required fields as required', () => {
      const schema = InvestorPreference.schema;
      expect(schema.investorId.required).toBe(true);
      expect(schema.companyId.required).toBe(true);
    });

    it('should have communicationPreferences as object field', () => {
      const schema = InvestorPreference.schema;
      expect(schema.communicationPreferences.type).toBe('object');
    });

    it('should have default communication preferences', () => {
      const commDefault = InvestorPreference.schema.communicationPreferences.default;
      expect(commDefault.email).toBe(true);
      expect(commDefault.sms).toBe(false);
      expect(commDefault.portalNotifications).toBe(true);
    });

    it('should have notificationTypes as object field', () => {
      const schema = InvestorPreference.schema;
      expect(schema.notificationTypes).toBeDefined();
      expect(schema.notificationTypes.type).toBe('object');
    });

    it('should have default notification types', () => {
      const notifDefault = InvestorPreference.schema.notificationTypes.default;
      expect(notifDefault.quarterlyUpdates).toBe(true);
      expect(notifDefault.annualReports).toBe(true);
      expect(notifDefault.documentSharing).toBe(true);
      expect(notifDefault.portalAnnouncements).toBe(true);
      expect(notifDefault.fundingUpdates).toBe(true);
    });

    it('should have frequency with enum values', () => {
      const schema = InvestorPreference.schema;
      expect(schema.frequency.enum).toContain('immediate');
      expect(schema.frequency.enum).toContain('daily_digest');
      expect(schema.frequency.enum).toContain('weekly_digest');
    });

    it('should default frequency to immediate', () => {
      expect(InvestorPreference.schema.frequency.default).toBe('immediate');
    });

    it('should have timezone field with default UTC', () => {
      expect(InvestorPreference.schema.timezone).toBeDefined();
      expect(InvestorPreference.schema.timezone.default).toBe('UTC');
    });

    it('should have unsubscribe tracking fields', () => {
      const schema = InvestorPreference.schema;
      expect(schema.unsubscribedAll).toBeDefined();
      expect(schema.unsubscribedAll.default).toBe(false);
      expect(schema.unsubscribedAt).toBeDefined();
    });
  });

  describe('wantsNotificationType', () => {
    it('should return true for enabled notification types', () => {
      const preference = {
        notificationTypes: {
          quarterlyUpdates: true,
          annualReports: true,
          documentSharing: true,
          portalAnnouncements: true,
          fundingUpdates: true,
          generalCommunications: true
        },
        unsubscribedAll: false
      };

      expect(InvestorPreference.wantsNotificationType(preference, 'quarterly_update')).toBe(true);
      expect(InvestorPreference.wantsNotificationType(preference, 'annual_report')).toBe(true);
      expect(InvestorPreference.wantsNotificationType(preference, 'document_notification')).toBe(true);
      expect(InvestorPreference.wantsNotificationType(preference, 'portal_announcement')).toBe(true);
      expect(InvestorPreference.wantsNotificationType(preference, 'funding_update')).toBe(true);
      expect(InvestorPreference.wantsNotificationType(preference, 'general')).toBe(true);
    });

    it('should return false for disabled notification types', () => {
      const preference = {
        notificationTypes: {
          quarterlyUpdates: false,
          annualReports: true
        },
        unsubscribedAll: false
      };

      expect(InvestorPreference.wantsNotificationType(preference, 'quarterly_update')).toBe(false);
    });

    it('should return false when unsubscribedAll is true', () => {
      const preference = {
        notificationTypes: {
          quarterlyUpdates: true
        },
        unsubscribedAll: true
      };

      expect(InvestorPreference.wantsNotificationType(preference, 'quarterly_update')).toBe(false);
    });

    it('should default to generalCommunications for unknown types', () => {
      const preference = {
        notificationTypes: {
          generalCommunications: true
        },
        unsubscribedAll: false
      };

      expect(InvestorPreference.wantsNotificationType(preference, 'unknown_type')).toBe(true);
    });
  });

  describe('wantsChannel', () => {
    it('should return true for enabled channels', () => {
      const preference = {
        communicationPreferences: {
          email: true,
          sms: true,
          portalNotifications: true
        },
        unsubscribedAll: false
      };

      expect(InvestorPreference.wantsChannel(preference, 'email')).toBe(true);
      expect(InvestorPreference.wantsChannel(preference, 'sms')).toBe(true);
      expect(InvestorPreference.wantsChannel(preference, 'portal')).toBe(true);
    });

    it('should return false for disabled channels', () => {
      const preference = {
        communicationPreferences: {
          email: true,
          sms: false,
          portalNotifications: true
        },
        unsubscribedAll: false
      };

      expect(InvestorPreference.wantsChannel(preference, 'sms')).toBe(false);
    });

    it('should return false when unsubscribedAll is true', () => {
      const preference = {
        communicationPreferences: {
          email: true
        },
        unsubscribedAll: true
      };

      expect(InvestorPreference.wantsChannel(preference, 'email')).toBe(false);
    });

    it('should return false for unknown channels', () => {
      const preference = {
        communicationPreferences: {
          email: true
        },
        unsubscribedAll: false
      };

      expect(InvestorPreference.wantsChannel(preference, 'unknown')).toBe(false);
    });
  });

  describe('getDefaults', () => {
    it('should return default preferences', () => {
      const defaults = InvestorPreference.getDefaults();

      expect(defaults).toHaveProperty('communicationPreferences');
      expect(defaults.communicationPreferences.email).toBe(true);
      expect(defaults.communicationPreferences.sms).toBe(false);
      expect(defaults).toHaveProperty('notificationTypes');
      expect(defaults.notificationTypes.quarterlyUpdates).toBe(true);
      expect(defaults).toHaveProperty('frequency', 'immediate');
      expect(defaults).toHaveProperty('timezone', 'UTC');
      expect(defaults).toHaveProperty('unsubscribedAll', false);
    });
  });

  describe('Constants', () => {
    it('should export FREQUENCY_OPTIONS constant', () => {
      expect(InvestorPreference.FREQUENCY_OPTIONS).toBeDefined();
      expect(InvestorPreference.FREQUENCY_OPTIONS).toContain('immediate');
      expect(InvestorPreference.FREQUENCY_OPTIONS).toContain('daily_digest');
      expect(InvestorPreference.FREQUENCY_OPTIONS).toContain('weekly_digest');
    });

    it('should export NOTIFICATION_TYPE_MAP constant', () => {
      expect(InvestorPreference.NOTIFICATION_TYPE_MAP).toBeDefined();
      expect(InvestorPreference.NOTIFICATION_TYPE_MAP['quarterly_update']).toBe('quarterlyUpdates');
    });

    it('should export CHANNEL_MAP constant', () => {
      expect(InvestorPreference.CHANNEL_MAP).toBeDefined();
      expect(InvestorPreference.CHANNEL_MAP['email']).toBe('email');
      expect(InvestorPreference.CHANNEL_MAP['portal']).toBe('portalNotifications');
    });
  });

  describe('Model Methods', () => {
    it('should have create method', () => {
      expect(typeof InvestorPreference.create).toBe('function');
    });

    it('should have find method', () => {
      expect(typeof InvestorPreference.find).toBe('function');
    });

    it('should have findOne method', () => {
      expect(typeof InvestorPreference.findOne).toBe('function');
    });

    it('should have findByInvestorAndCompany method', () => {
      expect(typeof InvestorPreference.findByInvestorAndCompany).toBe('function');
    });

    it('should have findByInvestor method', () => {
      expect(typeof InvestorPreference.findByInvestor).toBe('function');
    });

    it('should have findByCompany method', () => {
      expect(typeof InvestorPreference.findByCompany).toBe('function');
    });

    it('should have findByUnsubscribeToken method', () => {
      expect(typeof InvestorPreference.findByUnsubscribeToken).toBe('function');
    });

    it('should have unsubscribeAll method', () => {
      expect(typeof InvestorPreference.unsubscribeAll).toBe('function');
    });

    it('should have resubscribe method', () => {
      expect(typeof InvestorPreference.resubscribe).toBe('function');
    });
  });
});

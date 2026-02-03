/**
 * InvestorPreference Model Unit Tests
 * Issue #91: Build Investor Communication System
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

const mongoose = require('mongoose');

describe('InvestorPreference Model', () => {
  let InvestorPreference;

  beforeAll(() => {
    InvestorPreference = require('../../../models/InvestorPreference');
  });

  describe('Schema Validation', () => {
    it('should have required fields defined', () => {
      const schema = InvestorPreference.schema;

      expect(schema.paths.investorId).toBeDefined();
      expect(schema.paths.companyId).toBeDefined();
      expect(schema.paths.communicationPreferences).toBeDefined();
    });

    it('should have communication channel preferences', () => {
      const schema = InvestorPreference.schema;

      // Nested schema paths are accessed through the parent path's schema
      expect(schema.paths.communicationPreferences).toBeDefined();
      const commPrefSchema = schema.paths.communicationPreferences.schema;
      expect(commPrefSchema.paths.email).toBeDefined();
      expect(commPrefSchema.paths.sms).toBeDefined();
      expect(commPrefSchema.paths.portalNotifications).toBeDefined();
    });

    it('should have notification type preferences', () => {
      const schema = InvestorPreference.schema;

      // Nested schema paths are accessed through the parent path's schema
      expect(schema.paths.notificationTypes).toBeDefined();
      const notifTypeSchema = schema.paths.notificationTypes.schema;
      expect(notifTypeSchema.paths.quarterlyUpdates).toBeDefined();
      expect(notifTypeSchema.paths.annualReports).toBeDefined();
      expect(notifTypeSchema.paths.documentSharing).toBeDefined();
      expect(notifTypeSchema.paths.portalAnnouncements).toBeDefined();
      expect(notifTypeSchema.paths.fundingUpdates).toBeDefined();
    });

    it('should have frequency preference', () => {
      const schema = InvestorPreference.schema;
      const enumValues = schema.paths.frequency.enumValues;

      expect(enumValues).toContain('immediate');
      expect(enumValues).toContain('daily_digest');
      expect(enumValues).toContain('weekly_digest');
    });

    it('should have timezone preference', () => {
      const schema = InvestorPreference.schema;

      expect(schema.paths.timezone).toBeDefined();
    });

    it('should have unsubscribe tracking', () => {
      const schema = InvestorPreference.schema;

      expect(schema.paths.unsubscribedAll).toBeDefined();
      expect(schema.paths.unsubscribedAt).toBeDefined();
    });
  });

  describe('Document Creation', () => {
    it('should create a valid preference document', () => {
      const prefData = {
        investorId: new mongoose.Types.ObjectId(),
        companyId: new mongoose.Types.ObjectId(),
        communicationPreferences: {
          email: true,
          sms: false,
          portalNotifications: true
        },
        notificationTypes: {
          quarterlyUpdates: true,
          annualReports: true,
          documentSharing: true,
          portalAnnouncements: false,
          fundingUpdates: true
        },
        frequency: 'immediate'
      };

      const preference = new InvestorPreference(prefData);

      expect(preference.communicationPreferences.email).toBe(true);
      expect(preference.communicationPreferences.sms).toBe(false);
      expect(preference.notificationTypes.quarterlyUpdates).toBe(true);
      expect(preference.frequency).toBe('immediate');
    });

    it('should have default values for boolean preferences', () => {
      const prefData = {
        investorId: new mongoose.Types.ObjectId(),
        companyId: new mongoose.Types.ObjectId()
      };

      const preference = new InvestorPreference(prefData);

      expect(preference.communicationPreferences.email).toBe(true);
      expect(preference.unsubscribedAll).toBe(false);
    });

    it('should have default frequency of immediate', () => {
      const prefData = {
        investorId: new mongoose.Types.ObjectId(),
        companyId: new mongoose.Types.ObjectId()
      };

      const preference = new InvestorPreference(prefData);

      expect(preference.frequency).toBe('immediate');
    });

    it('should have default timezone of UTC', () => {
      const prefData = {
        investorId: new mongoose.Types.ObjectId(),
        companyId: new mongoose.Types.ObjectId()
      };

      const preference = new InvestorPreference(prefData);

      expect(preference.timezone).toBe('UTC');
    });
  });

  describe('Instance Methods', () => {
    describe('wantsNotificationType', () => {
      it('should return true for enabled notification types', () => {
        const prefData = {
          investorId: new mongoose.Types.ObjectId(),
          companyId: new mongoose.Types.ObjectId(),
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

        const preference = new InvestorPreference(prefData);

        expect(preference.wantsNotificationType('quarterly_update')).toBe(true);
        expect(preference.wantsNotificationType('annual_report')).toBe(true);
        expect(preference.wantsNotificationType('document_notification')).toBe(true);
        expect(preference.wantsNotificationType('portal_announcement')).toBe(true);
        expect(preference.wantsNotificationType('funding_update')).toBe(true);
        expect(preference.wantsNotificationType('general')).toBe(true);
      });

      it('should return false for disabled notification types', () => {
        const prefData = {
          investorId: new mongoose.Types.ObjectId(),
          companyId: new mongoose.Types.ObjectId(),
          notificationTypes: {
            quarterlyUpdates: false,
            annualReports: true
          },
          unsubscribedAll: false
        };

        const preference = new InvestorPreference(prefData);

        expect(preference.wantsNotificationType('quarterly_update')).toBe(false);
      });

      it('should return false when unsubscribedAll is true', () => {
        const prefData = {
          investorId: new mongoose.Types.ObjectId(),
          companyId: new mongoose.Types.ObjectId(),
          notificationTypes: {
            quarterlyUpdates: true
          },
          unsubscribedAll: true
        };

        const preference = new InvestorPreference(prefData);

        expect(preference.wantsNotificationType('quarterly_update')).toBe(false);
      });

      it('should default to generalCommunications for unknown types', () => {
        const prefData = {
          investorId: new mongoose.Types.ObjectId(),
          companyId: new mongoose.Types.ObjectId(),
          notificationTypes: {
            generalCommunications: true
          },
          unsubscribedAll: false
        };

        const preference = new InvestorPreference(prefData);

        expect(preference.wantsNotificationType('unknown_type')).toBe(true);
      });
    });

    describe('wantsChannel', () => {
      it('should return true for enabled channels', () => {
        const prefData = {
          investorId: new mongoose.Types.ObjectId(),
          companyId: new mongoose.Types.ObjectId(),
          communicationPreferences: {
            email: true,
            sms: true,
            portalNotifications: true
          },
          unsubscribedAll: false
        };

        const preference = new InvestorPreference(prefData);

        expect(preference.wantsChannel('email')).toBe(true);
        expect(preference.wantsChannel('sms')).toBe(true);
        expect(preference.wantsChannel('portal')).toBe(true);
      });

      it('should return false for disabled channels', () => {
        const prefData = {
          investorId: new mongoose.Types.ObjectId(),
          companyId: new mongoose.Types.ObjectId(),
          communicationPreferences: {
            email: true,
            sms: false,
            portalNotifications: true
          },
          unsubscribedAll: false
        };

        const preference = new InvestorPreference(prefData);

        expect(preference.wantsChannel('sms')).toBe(false);
      });

      it('should return false when unsubscribedAll is true', () => {
        const prefData = {
          investorId: new mongoose.Types.ObjectId(),
          companyId: new mongoose.Types.ObjectId(),
          communicationPreferences: {
            email: true
          },
          unsubscribedAll: true
        };

        const preference = new InvestorPreference(prefData);

        expect(preference.wantsChannel('email')).toBe(false);
      });

      it('should return false for unknown channels', () => {
        const prefData = {
          investorId: new mongoose.Types.ObjectId(),
          companyId: new mongoose.Types.ObjectId(),
          communicationPreferences: {
            email: true
          },
          unsubscribedAll: false
        };

        const preference = new InvestorPreference(prefData);

        expect(preference.wantsChannel('unknown')).toBe(false);
      });
    });
  });

  describe('Static Methods', () => {
    it('should return default preferences using getDefaults', () => {
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

  describe('Model Exports', () => {
    it('should export FREQUENCY_OPTIONS constant', () => {
      expect(InvestorPreference.FREQUENCY_OPTIONS).toBeDefined();
      expect(InvestorPreference.FREQUENCY_OPTIONS).toContain('immediate');
    });
  });
});

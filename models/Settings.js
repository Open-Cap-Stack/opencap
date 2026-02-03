/**
 * Settings Model
 *
 * Manages user and company settings including notifications, security,
 * preferences, and company-specific configurations.
 *
 * Issue #189: Add Settings Management Endpoints
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Schema definition for user settings
const userSettingsSchema = {
    settingsId: { type: 'string', required: true, unique: true },
    userId: { type: 'string', required: true, unique: true },
    settingsType: { type: 'string', required: true, default: 'user', enum: ['user', 'company'] },
    notifications: {
        type: 'object',
        default: {
            email: true,
            push: false,
            sms: false,
            digest: {
                enabled: false,
                frequency: 'weekly' // daily, weekly, monthly
            },
            categories: {
                equity: true,
                compliance: true,
                fundraising: true,
                documents: true,
                system: true
            }
        }
    },
    security: {
        type: 'object',
        default: {
            twoFactorEnabled: false,
            twoFactorMethod: null, // 'sms', 'email', 'authenticator'
            sessionTimeout: 30, // minutes
            passwordExpiryDays: 90,
            loginNotifications: true,
            ipWhitelist: []
        }
    },
    preferences: {
        type: 'object',
        default: {
            theme: 'light', // light, dark, auto
            language: 'en',
            dateFormat: 'MM/DD/YYYY',
            timeFormat: '12h', // 12h, 24h
            timezone: 'America/New_York',
            currency: 'USD',
            numberFormat: 'en-US'
        }
    },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

// Schema definition for company settings
const companySettingsSchema = {
    settingsId: { type: 'string', required: true, unique: true },
    companyId: { type: 'string', required: true, unique: true },
    settingsType: { type: 'string', required: true, default: 'company', enum: ['user', 'company'] },
    fiscal: {
        type: 'object',
        default: {
            yearEnd: '12-31', // MM-DD format
            taxYearType: 'calendar', // calendar, fiscal
            reportingCurrency: 'USD'
        }
    },
    equity: {
        type: 'object',
        default: {
            defaultShareClass: null,
            defaultVestingSchedule: '4-year-1-cliff',
            exerciseWindow: 90, // days post-termination
            earlyExerciseEnabled: false,
            autoApproveExercises: false
        }
    },
    compliance: {
        type: 'object',
        default: {
            require409AValuation: true,
            valuation409AFrequency: 12, // months
            requireBoardApproval: true,
            requireSignatures: true,
            retentionPeriod: 7, // years
            dataResidency: 'US'
        }
    },
    notifications: {
        type: 'object',
        default: {
            stakeholderUpdates: true,
            complianceAlerts: true,
            expirationReminders: true,
            transactionNotifications: true,
            reportGeneration: true
        }
    },
    integrations: {
        type: 'object',
        default: {
            accounting: {
                enabled: false,
                provider: null, // quickbooks, xero, etc
                syncFrequency: 'daily'
            },
            payroll: {
                enabled: false,
                provider: null,
                syncFrequency: 'daily'
            },
            banking: {
                enabled: false,
                provider: null
            }
        }
    },
    branding: {
        type: 'object',
        default: {
            logo: null,
            primaryColor: '#000000',
            secondaryColor: '#FFFFFF',
            emailFooter: null,
            customDomain: null
        }
    },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

// Create base models for both user and company settings
const baseUserSettingsModel = createModel('user_settings', userSettingsSchema);
const baseCompanySettingsModel = createModel('company_settings', companySettingsSchema);

// Valid setting categories
const VALID_THEMES = ['light', 'dark', 'auto'];
const VALID_LANGUAGES = ['en', 'es', 'fr', 'de', 'ja', 'zh'];
const VALID_DATE_FORMATS = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];
const VALID_TIME_FORMATS = ['12h', '24h'];
const VALID_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY'];
const VALID_2FA_METHODS = ['sms', 'email', 'authenticator'];
const VALID_TAX_YEAR_TYPES = ['calendar', 'fiscal'];

// Extended Settings model with business logic
const Settings = {
    userSettingsModel: baseUserSettingsModel,
    companySettingsModel: baseCompanySettingsModel,
    tableName: 'settings',
    userSettingsSchema,
    companySettingsSchema,

    /**
     * Create default user settings
     * @param {string} userId - User ID
     * @returns {Object} Created settings
     */
    async createUserSettings(userId) {
        const settingsId = `user_settings_${uuidv4()}`;
        const now = new Date().toISOString();

        const defaultSettings = {
            settingsId,
            userId,
            settingsType: 'user',
            notifications: {
                email: true,
                push: false,
                sms: false,
                digest: {
                    enabled: false,
                    frequency: 'weekly'
                },
                categories: {
                    equity: true,
                    compliance: true,
                    fundraising: true,
                    documents: true,
                    system: true
                }
            },
            security: {
                twoFactorEnabled: false,
                twoFactorMethod: null,
                sessionTimeout: 30,
                passwordExpiryDays: 90,
                loginNotifications: true,
                ipWhitelist: []
            },
            preferences: {
                theme: 'light',
                language: 'en',
                dateFormat: 'MM/DD/YYYY',
                timeFormat: '12h',
                timezone: 'America/New_York',
                currency: 'USD',
                numberFormat: 'en-US'
            },
            createdAt: now,
            updatedAt: now
        };

        return baseUserSettingsModel.create.call(baseUserSettingsModel, defaultSettings);
    },

    /**
     * Create default company settings
     * @param {string} companyId - Company ID
     * @returns {Object} Created settings
     */
    async createCompanySettings(companyId) {
        const settingsId = `company_settings_${uuidv4()}`;
        const now = new Date().toISOString();

        const defaultSettings = {
            settingsId,
            companyId,
            settingsType: 'company',
            fiscal: {
                yearEnd: '12-31',
                taxYearType: 'calendar',
                reportingCurrency: 'USD'
            },
            equity: {
                defaultShareClass: null,
                defaultVestingSchedule: '4-year-1-cliff',
                exerciseWindow: 90,
                earlyExerciseEnabled: false,
                autoApproveExercises: false
            },
            compliance: {
                require409AValuation: true,
                valuation409AFrequency: 12,
                requireBoardApproval: true,
                requireSignatures: true,
                retentionPeriod: 7,
                dataResidency: 'US'
            },
            notifications: {
                stakeholderUpdates: true,
                complianceAlerts: true,
                expirationReminders: true,
                transactionNotifications: true,
                reportGeneration: true
            },
            integrations: {
                accounting: {
                    enabled: false,
                    provider: null,
                    syncFrequency: 'daily'
                },
                payroll: {
                    enabled: false,
                    provider: null,
                    syncFrequency: 'daily'
                },
                banking: {
                    enabled: false,
                    provider: null
                }
            },
            branding: {
                logo: null,
                primaryColor: '#000000',
                secondaryColor: '#FFFFFF',
                emailFooter: null,
                customDomain: null
            },
            createdAt: now,
            updatedAt: now
        };

        return baseCompanySettingsModel.create.call(baseCompanySettingsModel, defaultSettings);
    },

    /**
     * Get user settings by userId
     * @param {string} userId - User ID
     * @returns {Object|null} Settings or null
     */
    async getUserSettings(userId) {
        return baseUserSettingsModel.findOne.call(baseUserSettingsModel, { userId });
    },

    /**
     * Get company settings by companyId
     * @param {string} companyId - Company ID
     * @returns {Object|null} Settings or null
     */
    async getCompanySettings(companyId) {
        return baseCompanySettingsModel.findOne.call(baseCompanySettingsModel, { companyId });
    },

    /**
     * Update user settings with partial updates support
     * @param {string} userId - User ID
     * @param {Object} updates - Settings updates (partial)
     * @returns {Object} Updated settings
     */
    async updateUserSettings(userId, updates) {
        // Validate updates before applying
        const validationErrors = this.validateUserSettingsUpdate(updates);
        if (validationErrors.length > 0) {
            throw new Error(`Invalid settings: ${validationErrors.join(', ')}`);
        }

        // Get existing settings
        const existingSettings = await this.getUserSettings(userId);
        if (!existingSettings) {
            throw new Error('Settings not found for user');
        }

        // Merge updates with existing settings (deep merge)
        const mergedSettings = this.deepMerge(existingSettings, updates);
        mergedSettings.updatedAt = new Date().toISOString();

        return baseUserSettingsModel.findOneAndUpdate.call(
            baseUserSettingsModel,
            { userId },
            { $set: mergedSettings }
        );
    },

    /**
     * Update company settings with partial updates support
     * @param {string} companyId - Company ID
     * @param {Object} updates - Settings updates (partial)
     * @returns {Object} Updated settings
     */
    async updateCompanySettings(companyId, updates) {
        // Validate updates before applying
        const validationErrors = this.validateCompanySettingsUpdate(updates);
        if (validationErrors.length > 0) {
            throw new Error(`Invalid settings: ${validationErrors.join(', ')}`);
        }

        // Get existing settings
        const existingSettings = await this.getCompanySettings(companyId);
        if (!existingSettings) {
            throw new Error('Settings not found for company');
        }

        // Merge updates with existing settings (deep merge)
        const mergedSettings = this.deepMerge(existingSettings, updates);
        mergedSettings.updatedAt = new Date().toISOString();

        return baseCompanySettingsModel.findOneAndUpdate.call(
            baseCompanySettingsModel,
            { companyId },
            { $set: mergedSettings }
        );
    },

    /**
     * Validate user settings update
     * @param {Object} updates - Settings to validate
     * @returns {Array} Array of error messages
     */
    validateUserSettingsUpdate(updates) {
        const errors = [];

        if (updates.preferences) {
            if (updates.preferences.theme && !VALID_THEMES.includes(updates.preferences.theme)) {
                errors.push(`theme must be one of: ${VALID_THEMES.join(', ')}`);
            }
            if (updates.preferences.language && !VALID_LANGUAGES.includes(updates.preferences.language)) {
                errors.push(`language must be one of: ${VALID_LANGUAGES.join(', ')}`);
            }
            if (updates.preferences.dateFormat && !VALID_DATE_FORMATS.includes(updates.preferences.dateFormat)) {
                errors.push(`dateFormat must be one of: ${VALID_DATE_FORMATS.join(', ')}`);
            }
            if (updates.preferences.timeFormat && !VALID_TIME_FORMATS.includes(updates.preferences.timeFormat)) {
                errors.push(`timeFormat must be one of: ${VALID_TIME_FORMATS.join(', ')}`);
            }
            if (updates.preferences.currency && !VALID_CURRENCIES.includes(updates.preferences.currency)) {
                errors.push(`currency must be one of: ${VALID_CURRENCIES.join(', ')}`);
            }
        }

        if (updates.security) {
            if (updates.security.sessionTimeout && (updates.security.sessionTimeout < 5 || updates.security.sessionTimeout > 480)) {
                errors.push('sessionTimeout must be between 5 and 480 minutes');
            }
            if (updates.security.twoFactorMethod && !VALID_2FA_METHODS.includes(updates.security.twoFactorMethod)) {
                errors.push(`twoFactorMethod must be one of: ${VALID_2FA_METHODS.join(', ')}`);
            }
        }

        return errors;
    },

    /**
     * Validate company settings update
     * @param {Object} updates - Settings to validate
     * @returns {Array} Array of error messages
     */
    validateCompanySettingsUpdate(updates) {
        const errors = [];

        if (updates.fiscal) {
            if (updates.fiscal.taxYearType && !VALID_TAX_YEAR_TYPES.includes(updates.fiscal.taxYearType)) {
                errors.push(`taxYearType must be one of: ${VALID_TAX_YEAR_TYPES.join(', ')}`);
            }
            if (updates.fiscal.reportingCurrency && !VALID_CURRENCIES.includes(updates.fiscal.reportingCurrency)) {
                errors.push(`reportingCurrency must be one of: ${VALID_CURRENCIES.join(', ')}`);
            }
        }

        if (updates.equity) {
            if (updates.equity.exerciseWindow && (updates.equity.exerciseWindow < 0 || updates.equity.exerciseWindow > 365)) {
                errors.push('exerciseWindow must be between 0 and 365 days');
            }
        }

        if (updates.compliance) {
            if (updates.compliance.valuation409AFrequency && (updates.compliance.valuation409AFrequency < 1 || updates.compliance.valuation409AFrequency > 36)) {
                errors.push('valuation409AFrequency must be between 1 and 36 months');
            }
            if (updates.compliance.retentionPeriod && (updates.compliance.retentionPeriod < 1 || updates.compliance.retentionPeriod > 99)) {
                errors.push('retentionPeriod must be between 1 and 99 years');
            }
        }

        return errors;
    },

    /**
     * Deep merge two objects (for partial updates)
     * @param {Object} target - Target object
     * @param {Object} source - Source object with updates
     * @returns {Object} Merged object
     */
    deepMerge(target, source) {
        const output = { ...target };

        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        output[key] = source[key];
                    } else {
                        output[key] = this.deepMerge(target[key], source[key]);
                    }
                } else {
                    output[key] = source[key];
                }
            });
        }

        return output;
    },

    /**
     * Check if value is an object (not array or null)
     * @param {*} item - Item to check
     * @returns {boolean} True if object
     */
    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }
};

module.exports = Settings;

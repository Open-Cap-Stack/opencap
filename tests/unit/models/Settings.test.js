/**
 * Settings Model Tests
 *
 * Comprehensive unit tests for Settings model including user and company settings,
 * validation, partial updates, and default settings creation.
 *
 * Issue #189: Add Settings Management Endpoints
 */

// Mock the ZeroDBModel before requiring Settings
const mockUserSettingsModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    deleteOne: jest.fn()
};

const mockCompanySettingsModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    deleteOne: jest.fn()
};

jest.mock('../../../models/base/ZeroDBModel', () => ({
    createModel: jest.fn((tableName) => {
        if (tableName === 'user_settings') return mockUserSettingsModel;
        if (tableName === 'company_settings') return mockCompanySettingsModel;
        return {};
    })
}));

const Settings = require('../../../models/Settings');

describe('Settings Model', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createUserSettings', () => {
        it('should create default user settings with all default values', async () => {
            const userId = 'user_123';
            const mockSettings = {
                settingsId: 'user_settings_abc',
                userId,
                settingsType: 'user',
                notifications: {
                    email: true,
                    push: false,
                    sms: false,
                    digest: { enabled: false, frequency: 'weekly' },
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
                createdAt: expect.any(String),
                updatedAt: expect.any(String)
            };

            mockUserSettingsModel.create.mockResolvedValue(mockSettings);

            const result = await Settings.createUserSettings(userId);

            expect(mockUserSettingsModel.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId,
                    settingsType: 'user',
                    notifications: expect.objectContaining({ email: true }),
                    security: expect.objectContaining({ sessionTimeout: 30 }),
                    preferences: expect.objectContaining({ theme: 'light' })
                })
            );
            expect(result).toEqual(mockSettings);
        });

        it('should generate unique settingsId for user settings', async () => {
            const userId = 'user_456';
            mockUserSettingsModel.create.mockResolvedValue({ settingsId: 'user_settings_xyz' });

            await Settings.createUserSettings(userId);

            const callArgs = mockUserSettingsModel.create.mock.calls[0][0];
            expect(callArgs.settingsId).toMatch(/^user_settings_/);
        });
    });

    describe('createCompanySettings', () => {
        it('should create default company settings with all default values', async () => {
            const companyId = 'company_123';
            const mockSettings = {
                settingsId: 'company_settings_abc',
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
                    accounting: { enabled: false, provider: null, syncFrequency: 'daily' },
                    payroll: { enabled: false, provider: null, syncFrequency: 'daily' },
                    banking: { enabled: false, provider: null }
                },
                branding: {
                    logo: null,
                    primaryColor: '#000000',
                    secondaryColor: '#FFFFFF',
                    emailFooter: null,
                    customDomain: null
                },
                createdAt: expect.any(String),
                updatedAt: expect.any(String)
            };

            mockCompanySettingsModel.create.mockResolvedValue(mockSettings);

            const result = await Settings.createCompanySettings(companyId);

            expect(mockCompanySettingsModel.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    companyId,
                    settingsType: 'company',
                    fiscal: expect.objectContaining({ taxYearType: 'calendar' }),
                    equity: expect.objectContaining({ exerciseWindow: 90 }),
                    compliance: expect.objectContaining({ require409AValuation: true })
                })
            );
            expect(result).toEqual(mockSettings);
        });
    });

    describe('getUserSettings', () => {
        it('should retrieve user settings by userId', async () => {
            const userId = 'user_789';
            const mockSettings = {
                userId,
                notifications: { email: true },
                security: { sessionTimeout: 30 },
                preferences: { theme: 'dark' }
            };

            mockUserSettingsModel.findOne.mockResolvedValue(mockSettings);

            const result = await Settings.getUserSettings(userId);

            expect(mockUserSettingsModel.findOne).toHaveBeenCalledWith({ userId });
            expect(result).toEqual(mockSettings);
        });

        it('should return null if settings do not exist', async () => {
            mockUserSettingsModel.findOne.mockResolvedValue(null);

            const result = await Settings.getUserSettings('nonexistent_user');

            expect(result).toBeNull();
        });
    });

    describe('getCompanySettings', () => {
        it('should retrieve company settings by companyId', async () => {
            const companyId = 'company_789';
            const mockSettings = {
                companyId,
                fiscal: { taxYearType: 'calendar' },
                equity: { exerciseWindow: 90 }
            };

            mockCompanySettingsModel.findOne.mockResolvedValue(mockSettings);

            const result = await Settings.getCompanySettings(companyId);

            expect(mockCompanySettingsModel.findOne).toHaveBeenCalledWith({ companyId });
            expect(result).toEqual(mockSettings);
        });
    });

    describe('updateUserSettings', () => {
        it('should update user settings with partial updates', async () => {
            const userId = 'user_update';
            const existingSettings = {
                userId,
                settingsType: 'user',
                notifications: { email: true, push: false },
                security: { sessionTimeout: 30 },
                preferences: { theme: 'light', language: 'en' },
                createdAt: '2024-01-01T00:00:00Z'
            };

            const updates = {
                preferences: { theme: 'dark' },
                notifications: { push: true }
            };

            const expectedMerged = {
                userId,
                settingsType: 'user',
                notifications: { email: true, push: true },
                security: { sessionTimeout: 30 },
                preferences: { theme: 'dark', language: 'en' },
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: expect.any(String)
            };

            mockUserSettingsModel.findOne.mockResolvedValue(existingSettings);
            mockUserSettingsModel.findOneAndUpdate.mockResolvedValue(expectedMerged);

            const result = await Settings.updateUserSettings(userId, updates);

            expect(mockUserSettingsModel.findOne).toHaveBeenCalledWith({ userId });
            expect(mockUserSettingsModel.findOneAndUpdate).toHaveBeenCalledWith(
                { userId },
                { $set: expect.objectContaining({ updatedAt: expect.any(String) }) }
            );
            expect(result).toEqual(expectedMerged);
        });

        it('should throw error if settings not found', async () => {
            mockUserSettingsModel.findOne.mockResolvedValue(null);

            await expect(
                Settings.updateUserSettings('nonexistent', { preferences: { theme: 'dark' } })
            ).rejects.toThrow('Settings not found for user');
        });

        it('should validate theme value', async () => {
            const userId = 'user_validate';
            const existingSettings = { userId, preferences: { theme: 'light' } };
            mockUserSettingsModel.findOne.mockResolvedValue(existingSettings);

            await expect(
                Settings.updateUserSettings(userId, { preferences: { theme: 'invalid' } })
            ).rejects.toThrow('theme must be one of: light, dark, auto');
        });

        it('should validate language value', async () => {
            const userId = 'user_validate';
            const existingSettings = { userId, preferences: { language: 'en' } };
            mockUserSettingsModel.findOne.mockResolvedValue(existingSettings);

            await expect(
                Settings.updateUserSettings(userId, { preferences: { language: 'xyz' } })
            ).rejects.toThrow('language must be one of:');
        });

        it('should validate sessionTimeout range', async () => {
            const userId = 'user_validate';
            const existingSettings = { userId, security: { sessionTimeout: 30 } };
            mockUserSettingsModel.findOne.mockResolvedValue(existingSettings);

            await expect(
                Settings.updateUserSettings(userId, { security: { sessionTimeout: 1000 } })
            ).rejects.toThrow('sessionTimeout must be between 5 and 480 minutes');
        });

        it('should validate twoFactorMethod value', async () => {
            const userId = 'user_validate';
            const existingSettings = { userId, security: { twoFactorMethod: null } };
            mockUserSettingsModel.findOne.mockResolvedValue(existingSettings);

            await expect(
                Settings.updateUserSettings(userId, { security: { twoFactorMethod: 'invalid' } })
            ).rejects.toThrow('twoFactorMethod must be one of:');
        });
    });

    describe('updateCompanySettings', () => {
        it('should update company settings with partial updates', async () => {
            const companyId = 'company_update';
            const existingSettings = {
                companyId,
                settingsType: 'company',
                fiscal: { taxYearType: 'calendar', reportingCurrency: 'USD' },
                equity: { exerciseWindow: 90 },
                createdAt: '2024-01-01T00:00:00Z'
            };

            const updates = {
                fiscal: { taxYearType: 'fiscal' },
                equity: { exerciseWindow: 120 }
            };

            const expectedMerged = {
                companyId,
                settingsType: 'company',
                fiscal: { taxYearType: 'fiscal', reportingCurrency: 'USD' },
                equity: { exerciseWindow: 120 },
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: expect.any(String)
            };

            mockCompanySettingsModel.findOne.mockResolvedValue(existingSettings);
            mockCompanySettingsModel.findOneAndUpdate.mockResolvedValue(expectedMerged);

            const result = await Settings.updateCompanySettings(companyId, updates);

            expect(mockCompanySettingsModel.findOne).toHaveBeenCalledWith({ companyId });
            expect(mockCompanySettingsModel.findOneAndUpdate).toHaveBeenCalledWith(
                { companyId },
                { $set: expect.objectContaining({ updatedAt: expect.any(String) }) }
            );
            expect(result).toEqual(expectedMerged);
        });

        it('should validate taxYearType value', async () => {
            const companyId = 'company_validate';
            const existingSettings = { companyId, fiscal: { taxYearType: 'calendar' } };
            mockCompanySettingsModel.findOne.mockResolvedValue(existingSettings);

            await expect(
                Settings.updateCompanySettings(companyId, { fiscal: { taxYearType: 'invalid' } })
            ).rejects.toThrow('taxYearType must be one of:');
        });

        it('should validate exerciseWindow range', async () => {
            const companyId = 'company_validate';
            const existingSettings = { companyId, equity: { exerciseWindow: 90 } };
            mockCompanySettingsModel.findOne.mockResolvedValue(existingSettings);

            await expect(
                Settings.updateCompanySettings(companyId, { equity: { exerciseWindow: 500 } })
            ).rejects.toThrow('exerciseWindow must be between 0 and 365 days');
        });

        it('should validate valuation409AFrequency range', async () => {
            const companyId = 'company_validate';
            const existingSettings = { companyId, compliance: { valuation409AFrequency: 12 } };
            mockCompanySettingsModel.findOne.mockResolvedValue(existingSettings);

            await expect(
                Settings.updateCompanySettings(companyId, { compliance: { valuation409AFrequency: 50 } })
            ).rejects.toThrow('valuation409AFrequency must be between 1 and 36 months');
        });

        it('should validate retentionPeriod range', async () => {
            const companyId = 'company_validate';
            const existingSettings = { companyId, compliance: { retentionPeriod: 7 } };
            mockCompanySettingsModel.findOne.mockResolvedValue(existingSettings);

            await expect(
                Settings.updateCompanySettings(companyId, { compliance: { retentionPeriod: 150 } })
            ).rejects.toThrow('retentionPeriod must be between 1 and 99 years');
        });
    });

    describe('validateUserSettingsUpdate', () => {
        it('should return empty array for valid user settings', () => {
            const validSettings = {
                preferences: { theme: 'dark', language: 'en', currency: 'USD' },
                security: { sessionTimeout: 60 }
            };

            const errors = Settings.validateUserSettingsUpdate(validSettings);
            expect(errors).toEqual([]);
        });

        it('should return errors for invalid theme', () => {
            const errors = Settings.validateUserSettingsUpdate({
                preferences: { theme: 'rainbow' }
            });
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0]).toContain('theme');
        });

        it('should return errors for invalid currency', () => {
            const errors = Settings.validateUserSettingsUpdate({
                preferences: { currency: 'XYZ' }
            });
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0]).toContain('currency');
        });

        it('should return errors for sessionTimeout out of range', () => {
            const errors = Settings.validateUserSettingsUpdate({
                security: { sessionTimeout: 2 }
            });
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0]).toContain('sessionTimeout');
        });
    });

    describe('validateCompanySettingsUpdate', () => {
        it('should return empty array for valid company settings', () => {
            const validSettings = {
                fiscal: { taxYearType: 'calendar', reportingCurrency: 'USD' },
                equity: { exerciseWindow: 90 },
                compliance: { valuation409AFrequency: 12, retentionPeriod: 7 }
            };

            const errors = Settings.validateCompanySettingsUpdate(validSettings);
            expect(errors).toEqual([]);
        });

        it('should return errors for invalid taxYearType', () => {
            const errors = Settings.validateCompanySettingsUpdate({
                fiscal: { taxYearType: 'quarterly' }
            });
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0]).toContain('taxYearType');
        });
    });

    describe('deepMerge', () => {
        it('should merge nested objects correctly', () => {
            const target = {
                a: 1,
                b: { c: 2, d: 3 },
                e: { f: 4 }
            };

            const source = {
                b: { c: 5 },
                e: { g: 6 }
            };

            const result = Settings.deepMerge(target, source);

            expect(result).toEqual({
                a: 1,
                b: { c: 5, d: 3 },
                e: { f: 4, g: 6 }
            });
        });

        it('should not modify original objects', () => {
            const target = { a: { b: 1 } };
            const source = { a: { c: 2 } };

            Settings.deepMerge(target, source);

            expect(target).toEqual({ a: { b: 1 } });
            expect(source).toEqual({ a: { c: 2 } });
        });

        it('should handle arrays correctly', () => {
            const target = { arr: [1, 2, 3] };
            const source = { arr: [4, 5] };

            const result = Settings.deepMerge(target, source);

            expect(result.arr).toEqual([4, 5]);
        });
    });

    describe('isObject', () => {
        it('should return true for plain objects', () => {
            expect(Settings.isObject({})).toBe(true);
            expect(Settings.isObject({ a: 1 })).toBe(true);
        });

        it('should return false for arrays', () => {
            expect(Settings.isObject([])).toBe(false);
            expect(Settings.isObject([1, 2, 3])).toBe(false);
        });

        it('should return false for null', () => {
            expect(Settings.isObject(null)).toBeFalsy();
        });

        it('should return false for primitives', () => {
            expect(Settings.isObject('string')).toBe(false);
            expect(Settings.isObject(123)).toBe(false);
            expect(Settings.isObject(true)).toBe(false);
            expect(Settings.isObject(undefined)).toBeFalsy();
        });
    });
});

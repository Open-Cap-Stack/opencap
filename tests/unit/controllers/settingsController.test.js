/**
 * Settings Controller Tests
 *
 * Comprehensive unit tests for settings controller including user and company
 * settings retrieval, updates, resets, and access control.
 *
 * Issue #189: Add Settings Management Endpoints
 */

const settingsController = require('../../../controllers/settingsController');
const Settings = require('../../../models/Settings');
const User = require('../../../models/User');
const Company = require('../../../models/Company');
const httpMocks = require('node-mocks-http');

// Mock the models
jest.mock('../../../models/Settings');
jest.mock('../../../models/User');
jest.mock('../../../models/Company');

describe('Settings Controller', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = httpMocks.createRequest();
        res = httpMocks.createResponse();
    });

    describe('getUserSettings', () => {
        it('should retrieve existing user settings', async () => {
            const userId = 'user_123';
            req.user = { userId };

            const mockSettings = {
                userId,
                notifications: { email: true },
                security: { sessionTimeout: 30 },
                preferences: { theme: 'light' }
            };

            Settings.getUserSettings.mockResolvedValue(mockSettings);

            await settingsController.getUserSettings(req, res);

            expect(Settings.getUserSettings).toHaveBeenCalledWith(userId);
            expect(res.statusCode).toBe(200);
            const data = JSON.parse(res._getData());
            expect(data).toEqual(mockSettings);
        });

        it('should create default settings if none exist', async () => {
            const userId = 'user_456';
            req.user = { userId };

            const defaultSettings = {
                userId,
                notifications: { email: true, push: false },
                security: { sessionTimeout: 30 },
                preferences: { theme: 'light' }
            };

            Settings.getUserSettings.mockResolvedValue(null);
            Settings.createUserSettings.mockResolvedValue(defaultSettings);

            await settingsController.getUserSettings(req, res);

            expect(Settings.getUserSettings).toHaveBeenCalledWith(userId);
            expect(Settings.createUserSettings).toHaveBeenCalledWith(userId);
            expect(res.statusCode).toBe(200);
            const data = JSON.parse(res._getData());
            expect(data).toEqual(defaultSettings);
        });

        it('should handle user from req.user.id fallback', async () => {
            const userId = 'user_789';
            req.user = { id: userId };

            const mockSettings = { userId, preferences: { theme: 'dark' } };
            Settings.getUserSettings.mockResolvedValue(mockSettings);

            await settingsController.getUserSettings(req, res);

            expect(Settings.getUserSettings).toHaveBeenCalledWith(userId);
            expect(res.statusCode).toBe(200);
        });

        it('should return 401 if user not authenticated', async () => {
            req.user = {};

            await settingsController.getUserSettings(req, res);

            expect(res.statusCode).toBe(401);
            const data = JSON.parse(res._getData());
            expect(data.error).toBe('User not authenticated');
        });

        it('should handle errors gracefully', async () => {
            req.user = { userId: 'user_error' };
            Settings.getUserSettings.mockRejectedValue(new Error('Database error'));

            await settingsController.getUserSettings(req, res);

            expect(res.statusCode).toBe(500);
            const data = JSON.parse(res._getData());
            expect(data.error).toBe('Error fetching user settings');
        });
    });

    describe('updateUserSettings', () => {
        it('should update user settings successfully', async () => {
            const userId = 'user_update';
            req.user = { userId };
            req.body = {
                preferences: { theme: 'dark' },
                notifications: { email: false }
            };

            const existingSettings = { userId, preferences: { theme: 'light' } };
            const updatedSettings = {
                userId,
                preferences: { theme: 'dark' },
                notifications: { email: false }
            };

            Settings.getUserSettings.mockResolvedValue(existingSettings);
            Settings.updateUserSettings.mockResolvedValue(updatedSettings);

            await settingsController.updateUserSettings(req, res);

            expect(Settings.updateUserSettings).toHaveBeenCalledWith(
                userId,
                expect.objectContaining({
                    preferences: { theme: 'dark' },
                    notifications: { email: false }
                })
            );
            expect(res.statusCode).toBe(200);
            const data = JSON.parse(res._getData());
            expect(data).toEqual(updatedSettings);
        });

        it('should create settings if none exist before updating', async () => {
            const userId = 'user_new';
            req.user = { userId };
            req.body = { preferences: { theme: 'dark' } };

            const defaultSettings = { userId, preferences: { theme: 'light' } };
            const updatedSettings = { userId, preferences: { theme: 'dark' } };

            Settings.getUserSettings.mockResolvedValue(null);
            Settings.createUserSettings.mockResolvedValue(defaultSettings);
            Settings.updateUserSettings.mockResolvedValue(updatedSettings);

            await settingsController.updateUserSettings(req, res);

            expect(Settings.createUserSettings).toHaveBeenCalledWith(userId);
            expect(Settings.updateUserSettings).toHaveBeenCalled();
            expect(res.statusCode).toBe(200);
        });

        it('should filter out protected fields', async () => {
            const userId = 'user_protected';
            req.user = { userId };
            req.body = {
                settingsId: 'malicious_id',
                userId: 'malicious_user',
                settingsType: 'malicious_type',
                createdAt: 'malicious_date',
                preferences: { theme: 'dark' }
            };

            const existingSettings = { userId };
            Settings.getUserSettings.mockResolvedValue(existingSettings);
            Settings.updateUserSettings.mockResolvedValue({ userId });

            await settingsController.updateUserSettings(req, res);

            const updateCall = Settings.updateUserSettings.mock.calls[0][1];
            expect(updateCall.settingsId).toBeUndefined();
            expect(updateCall.userId).toBeUndefined();
            expect(updateCall.settingsType).toBeUndefined();
            expect(updateCall.createdAt).toBeUndefined();
            expect(updateCall.preferences).toBeDefined();
        });

        it('should return 400 if no updates provided', async () => {
            req.user = { userId: 'user_empty' };
            req.body = {};

            await settingsController.updateUserSettings(req, res);

            expect(res.statusCode).toBe(400);
            const data = JSON.parse(res._getData());
            expect(data.error).toBe('No settings updates provided');
        });

        it('should return 400 on validation error', async () => {
            const userId = 'user_invalid';
            req.user = { userId };
            req.body = { preferences: { theme: 'invalid_theme' } };

            const existingSettings = { userId };
            Settings.getUserSettings.mockResolvedValue(existingSettings);
            Settings.updateUserSettings.mockRejectedValue(
                new Error('Invalid settings: theme must be one of: light, dark, auto')
            );

            await settingsController.updateUserSettings(req, res);

            expect(res.statusCode).toBe(400);
            const data = JSON.parse(res._getData());
            expect(data.error).toBe('Validation failed');
        });
    });

    describe('getCompanySettings', () => {
        it('should retrieve existing company settings', async () => {
            const companyId = 'company_123';
            const userId = 'user_123';
            req.params = { id: companyId };
            req.user = { userId };

            const mockCompany = { companyId, CompanyName: 'Test Co' };
            const mockUser = { userId, companyId, permissions: ['read:companies'] };
            const mockSettings = {
                companyId,
                fiscal: { taxYearType: 'calendar' },
                equity: { exerciseWindow: 90 }
            };

            Company.findByCompanyId.mockResolvedValue(mockCompany);
            User.findByUserId.mockResolvedValue(mockUser);
            Settings.getCompanySettings.mockResolvedValue(mockSettings);

            await settingsController.getCompanySettings(req, res);

            expect(Settings.getCompanySettings).toHaveBeenCalledWith(companyId);
            expect(res.statusCode).toBe(200);
            const data = JSON.parse(res._getData());
            expect(data).toEqual(mockSettings);
        });

        it('should create default settings if none exist', async () => {
            const companyId = 'company_456';
            const userId = 'user_456';
            req.params = { id: companyId };
            req.user = { userId };

            const mockCompany = { companyId };
            const mockUser = { userId, companyId, permissions: ['read:companies'] };
            const defaultSettings = { companyId, fiscal: { taxYearType: 'calendar' } };

            Company.findByCompanyId.mockResolvedValue(mockCompany);
            User.findByUserId.mockResolvedValue(mockUser);
            Settings.getCompanySettings.mockResolvedValue(null);
            Settings.createCompanySettings.mockResolvedValue(defaultSettings);

            await settingsController.getCompanySettings(req, res);

            expect(Settings.createCompanySettings).toHaveBeenCalledWith(companyId);
            expect(res.statusCode).toBe(200);
        });

        it('should return 404 if company not found', async () => {
            req.params = { id: 'nonexistent' };
            req.user = { userId: 'user_123' };

            Company.findByCompanyId.mockResolvedValue(null);
            Company.findById.mockResolvedValue(null);

            await settingsController.getCompanySettings(req, res);

            expect(res.statusCode).toBe(404);
            const data = JSON.parse(res._getData());
            expect(data.error).toBe('Company not found');
        });

        it('should return 403 if user lacks access', async () => {
            const companyId = 'company_123';
            const userId = 'user_other';
            req.params = { id: companyId };
            req.user = { userId };

            const mockCompany = { companyId };
            const mockUser = { userId, companyId: 'different_company', permissions: [] };

            Company.findByCompanyId.mockResolvedValue(mockCompany);
            User.findByUserId.mockResolvedValue(mockUser);

            await settingsController.getCompanySettings(req, res);

            expect(res.statusCode).toBe(403);
            const data = JSON.parse(res._getData());
            expect(data.error).toBe('Access denied to company settings');
        });

        it('should allow access for admin users', async () => {
            const companyId = 'company_123';
            const userId = 'admin_user';
            req.params = { id: companyId };
            req.user = { userId };

            const mockCompany = { companyId };
            const mockUser = { userId, companyId: 'different_company', permissions: ['admin:all'] };
            const mockSettings = { companyId };

            Company.findByCompanyId.mockResolvedValue(mockCompany);
            User.findByUserId.mockResolvedValue(mockUser);
            Settings.getCompanySettings.mockResolvedValue(mockSettings);

            await settingsController.getCompanySettings(req, res);

            expect(res.statusCode).toBe(200);
        });
    });

    describe('updateCompanySettings', () => {
        it('should update company settings successfully', async () => {
            const companyId = 'company_update';
            const userId = 'user_update';
            req.params = { id: companyId };
            req.user = { userId };
            req.body = {
                fiscal: { taxYearType: 'fiscal' },
                equity: { exerciseWindow: 120 }
            };

            const mockCompany = { companyId };
            const mockUser = { userId, companyId, permissions: ['write:companies'] };
            const existingSettings = { companyId };
            const updatedSettings = { companyId, fiscal: { taxYearType: 'fiscal' } };

            Company.findByCompanyId.mockResolvedValue(mockCompany);
            User.findByUserId.mockResolvedValue(mockUser);
            Settings.getCompanySettings.mockResolvedValue(existingSettings);
            Settings.updateCompanySettings.mockResolvedValue(updatedSettings);

            await settingsController.updateCompanySettings(req, res);

            expect(Settings.updateCompanySettings).toHaveBeenCalledWith(
                companyId,
                expect.objectContaining({
                    fiscal: { taxYearType: 'fiscal' },
                    equity: { exerciseWindow: 120 }
                })
            );
            expect(res.statusCode).toBe(200);
        });

        it('should return 400 if no updates provided', async () => {
            req.params = { id: 'company_123' };
            req.user = { userId: 'user_123' };
            req.body = {};

            await settingsController.updateCompanySettings(req, res);

            expect(res.statusCode).toBe(400);
            const data = JSON.parse(res._getData());
            expect(data.error).toBe('No settings updates provided');
        });

        it('should return 403 if user lacks write access', async () => {
            const companyId = 'company_123';
            const userId = 'user_readonly';
            req.params = { id: companyId };
            req.user = { userId };
            req.body = { fiscal: { taxYearType: 'fiscal' } };

            const mockCompany = { companyId };
            const mockUser = { userId, companyId: 'different_company', permissions: ['read:companies'] };

            Company.findByCompanyId.mockResolvedValue(mockCompany);
            User.findByUserId.mockResolvedValue(mockUser);

            await settingsController.updateCompanySettings(req, res);

            expect(res.statusCode).toBe(403);
            const data = JSON.parse(res._getData());
            expect(data.error).toBe('Access denied to modify company settings');
        });
    });

    describe('resetUserSettings', () => {
        it('should reset user settings to defaults', async () => {
            const userId = 'user_reset';
            req.user = { userId };

            const existingSettings = { userId };
            const defaultSettings = { userId, preferences: { theme: 'light' } };

            Settings.getUserSettings.mockResolvedValue(existingSettings);
            Settings.userSettingsModel = { deleteOne: jest.fn().mockResolvedValue({}) };
            Settings.createUserSettings.mockResolvedValue(defaultSettings);

            await settingsController.resetUserSettings(req, res);

            expect(Settings.userSettingsModel.deleteOne).toHaveBeenCalledWith({ userId });
            expect(Settings.createUserSettings).toHaveBeenCalledWith(userId);
            expect(res.statusCode).toBe(200);
            const data = JSON.parse(res._getData());
            expect(data.message).toBe('Settings reset to defaults');
            expect(data.settings).toEqual(defaultSettings);
        });

        it('should create settings even if none existed', async () => {
            const userId = 'user_new_reset';
            req.user = { userId };

            const defaultSettings = { userId, preferences: { theme: 'light' } };

            Settings.getUserSettings.mockResolvedValue(null);
            Settings.createUserSettings.mockResolvedValue(defaultSettings);

            await settingsController.resetUserSettings(req, res);

            expect(Settings.createUserSettings).toHaveBeenCalledWith(userId);
            expect(res.statusCode).toBe(200);
        });
    });

    describe('resetCompanySettings', () => {
        it('should reset company settings to defaults for admin', async () => {
            const companyId = 'company_reset';
            const userId = 'admin_user';
            req.params = { id: companyId };
            req.user = { userId };

            const mockCompany = { companyId };
            const mockUser = { userId, companyId, role: 'admin', permissions: ['admin:all'] };
            const existingSettings = { companyId };
            const defaultSettings = { companyId, fiscal: { taxYearType: 'calendar' } };

            Company.findByCompanyId.mockResolvedValue(mockCompany);
            User.findByUserId.mockResolvedValue(mockUser);
            Settings.getCompanySettings.mockResolvedValue(existingSettings);
            Settings.companySettingsModel = { deleteOne: jest.fn().mockResolvedValue({}) };
            Settings.createCompanySettings.mockResolvedValue(defaultSettings);

            await settingsController.resetCompanySettings(req, res);

            expect(Settings.companySettingsModel.deleteOne).toHaveBeenCalledWith({ companyId });
            expect(Settings.createCompanySettings).toHaveBeenCalledWith(companyId);
            expect(res.statusCode).toBe(200);
            const data = JSON.parse(res._getData());
            expect(data.message).toBe('Company settings reset to defaults');
        });

        it('should return 403 for non-admin users', async () => {
            const companyId = 'company_reset';
            const userId = 'regular_user';
            req.params = { id: companyId };
            req.user = { userId };

            const mockCompany = { companyId };
            const mockUser = { userId, companyId, role: 'user', permissions: ['read:companies'] };

            Company.findByCompanyId.mockResolvedValue(mockCompany);
            User.findByUserId.mockResolvedValue(mockUser);

            await settingsController.resetCompanySettings(req, res);

            expect(res.statusCode).toBe(403);
            const data = JSON.parse(res._getData());
            expect(data.error).toBe('Admin access required to reset company settings');
        });

        it('should allow company admin to reset settings', async () => {
            const companyId = 'company_reset';
            const userId = 'company_admin';
            req.params = { id: companyId };
            req.user = { userId };

            const mockCompany = { companyId };
            const mockUser = { userId, companyId, role: 'admin', permissions: ['write:companies'] };
            const defaultSettings = { companyId };

            Company.findByCompanyId.mockResolvedValue(mockCompany);
            User.findByUserId.mockResolvedValue(mockUser);
            Settings.getCompanySettings.mockResolvedValue(null);
            Settings.createCompanySettings.mockResolvedValue(defaultSettings);

            await settingsController.resetCompanySettings(req, res);

            expect(res.statusCode).toBe(200);
        });
    });
});

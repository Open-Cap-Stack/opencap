/**
 * Settings Endpoints Integration Tests
 *
 * End-to-end integration tests for settings management endpoints including
 * user settings, company settings, authentication, and authorization.
 *
 * Issue #189: Add Settings Management Endpoints
 */

const request = require('supertest');
const app = require('../../app');
const Settings = require('../../models/Settings');
const User = require('../../models/User');
const Company = require('../../models/Company');

// Mock the models
jest.mock('../../models/Settings');
jest.mock('../../models/User');
jest.mock('../../models/Company');
jest.mock('../../middleware/authMiddleware', () => ({
    authenticate: (req, res, next) => {
        if (req.headers.authorization) {
            req.user = { userId: 'test_user_123', id: 'test_user_123', companyId: 'company_123', role: 'admin' };
        }
        next();
    },
    authenticateToken: (req, res, next) => {
        if (req.headers.authorization) {
            req.user = { userId: 'test_user_123', id: 'test_user_123', companyId: 'company_123', role: 'admin' };
        }
        next();
    }
}));
jest.mock('../../middleware/rbacMiddleware', () => ({
    hasPermission: (permission) => (req, res, next) => next(),
    hasRole: (role) => (req, res, next) => next(),
    checkPermission: () => true,
    requireUserNotAgent: (req, res, next) => next(),
    getUserPermissions: () => [],
    rolePermissions: {},
    agentCapabilities: {},
    hasAgentCapability: () => (req, res, next) => next()
}));

describe('Settings Endpoints Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/v1/users/settings', () => {
        it('should retrieve user settings', async () => {
            const mockSettings = {
                userId: 'test_user_123',
                notifications: { email: true, push: false, sms: false },
                security: { twoFactorEnabled: false, sessionTimeout: 30 },
                preferences: { theme: 'light', language: 'en', currency: 'USD' }
            };

            Settings.getUserSettings.mockResolvedValue(mockSettings);

            const response = await request(app)
                .get('/api/v1/users/settings')
                .set('Authorization', 'Bearer valid_token')
                .expect(200);

            expect(response.body).toMatchObject({
                userId: 'test_user_123',
                notifications: expect.objectContaining({ email: true }),
                security: expect.objectContaining({ sessionTimeout: 30 }),
                preferences: expect.objectContaining({ theme: 'light' })
            });
        });

        it('should create default settings if none exist', async () => {
            const defaultSettings = {
                userId: 'test_user_123',
                notifications: { email: true, push: false, sms: false },
                security: { twoFactorEnabled: false, sessionTimeout: 30 },
                preferences: { theme: 'light', language: 'en', currency: 'USD' }
            };

            Settings.getUserSettings.mockResolvedValue(null);
            Settings.createUserSettings.mockResolvedValue(defaultSettings);

            const response = await request(app)
                .get('/api/v1/users/settings')
                .set('Authorization', 'Bearer valid_token')
                .expect(200);

            expect(Settings.createUserSettings).toHaveBeenCalledWith('test_user_123');
            expect(response.body).toMatchObject(defaultSettings);
        });

        it('should return 401 without authentication', async () => {
            const response = await request(app)
                .get('/api/v1/users/settings')
                .expect(401);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('PUT /api/v1/users/settings', () => {
        it('should update user settings with partial updates', async () => {
            const existingSettings = {
                userId: 'test_user_123',
                preferences: { theme: 'light', language: 'en' },
                notifications: { email: true }
            };

            const updatedSettings = {
                userId: 'test_user_123',
                preferences: { theme: 'dark', language: 'en' },
                notifications: { email: false }
            };

            Settings.getUserSettings.mockResolvedValue(existingSettings);
            Settings.updateUserSettings.mockResolvedValue(updatedSettings);

            const response = await request(app)
                .put('/api/v1/users/settings')
                .set('Authorization', 'Bearer valid_token')
                .send({
                    preferences: { theme: 'dark' },
                    notifications: { email: false }
                })
                .expect(200);

            expect(Settings.updateUserSettings).toHaveBeenCalledWith(
                'test_user_123',
                expect.objectContaining({
                    preferences: { theme: 'dark' },
                    notifications: { email: false }
                })
            );
            expect(response.body.preferences.theme).toBe('dark');
        });

        it('should return 400 for invalid settings', async () => {
            const existingSettings = { userId: 'test_user_123' };

            Settings.getUserSettings.mockResolvedValue(existingSettings);
            Settings.updateUserSettings.mockRejectedValue(
                new Error('Invalid settings: theme must be one of: light, dark, auto')
            );

            const response = await request(app)
                .put('/api/v1/users/settings')
                .set('Authorization', 'Bearer valid_token')
                .send({ preferences: { theme: 'rainbow' } })
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Validation failed');
            expect(response.body.message).toContain('theme');
        });

        it('should return 400 when no updates provided', async () => {
            const response = await request(app)
                .put('/api/v1/users/settings')
                .set('Authorization', 'Bearer valid_token')
                .send({})
                .expect(400);

            expect(response.body).toHaveProperty('error', 'No settings updates provided');
        });

        it('should filter out protected fields', async () => {
            const existingSettings = { userId: 'test_user_123' };
            const updatedSettings = { userId: 'test_user_123', preferences: { theme: 'dark' } };

            Settings.getUserSettings.mockResolvedValue(existingSettings);
            Settings.updateUserSettings.mockResolvedValue(updatedSettings);

            await request(app)
                .put('/api/v1/users/settings')
                .set('Authorization', 'Bearer valid_token')
                .send({
                    settingsId: 'malicious_id',
                    userId: 'malicious_user',
                    preferences: { theme: 'dark' }
                })
                .expect(200);

            const updateCall = Settings.updateUserSettings.mock.calls[0][1];
            expect(updateCall.settingsId).toBeUndefined();
            expect(updateCall.userId).toBeUndefined();
        });
    });

    describe('POST /api/v1/users/settings/reset', () => {
        it('should reset user settings to defaults', async () => {
            const existingSettings = { userId: 'test_user_123' };
            const defaultSettings = {
                userId: 'test_user_123',
                notifications: { email: true, push: false },
                security: { sessionTimeout: 30 },
                preferences: { theme: 'light', language: 'en' }
            };

            Settings.getUserSettings.mockResolvedValue(existingSettings);
            Settings.userSettingsModel = { deleteOne: jest.fn().mockResolvedValue({}) };
            Settings.createUserSettings.mockResolvedValue(defaultSettings);

            const response = await request(app)
                .post('/api/v1/users/settings/reset')
                .set('Authorization', 'Bearer valid_token')
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Settings reset to defaults');
            expect(response.body.settings).toMatchObject(defaultSettings);
        });
    });

    describe('GET /api/v1/companies/:id/settings', () => {
        it('should retrieve company settings with proper access', async () => {
            const companyId = 'company_123';
            const mockCompany = { companyId, CompanyName: 'Test Company' };
            const mockUser = {
                userId: 'test_user_123',
                companyId,
                permissions: ['read:companies']
            };
            const mockSettings = {
                companyId,
                fiscal: { yearEnd: '12-31', taxYearType: 'calendar' },
                equity: { exerciseWindow: 90 },
                compliance: { require409AValuation: true }
            };

            Company.findByCompanyId.mockResolvedValue(mockCompany);
            User.findByUserId.mockResolvedValue(mockUser);
            Settings.getCompanySettings.mockResolvedValue(mockSettings);

            const response = await request(app)
                .get(`/api/v1/companies/${companyId}/settings`)
                .set('Authorization', 'Bearer valid_token')
                .expect(200);

            expect(response.body).toMatchObject({
                companyId,
                fiscal: expect.objectContaining({ taxYearType: 'calendar' }),
                equity: expect.objectContaining({ exerciseWindow: 90 })
            });
        });

        it('should create default company settings if none exist', async () => {
            const companyId = 'company_456';
            const mockCompany = { companyId };
            const mockUser = { userId: 'test_user_123', companyId, permissions: ['read:companies'] };
            const defaultSettings = {
                companyId,
                fiscal: { taxYearType: 'calendar' },
                equity: { exerciseWindow: 90 }
            };

            Company.findByCompanyId.mockResolvedValue(mockCompany);
            User.findByUserId.mockResolvedValue(mockUser);
            Settings.getCompanySettings.mockResolvedValue(null);
            Settings.createCompanySettings.mockResolvedValue(defaultSettings);

            const response = await request(app)
                .get(`/api/v1/companies/${companyId}/settings`)
                .set('Authorization', 'Bearer valid_token')
                .expect(200);

            expect(Settings.createCompanySettings).toHaveBeenCalledWith(companyId);
            expect(response.body).toMatchObject(defaultSettings);
        });

        it('should return 404 if company not found', async () => {
            Company.findByCompanyId.mockResolvedValue(null);
            Company.findById.mockResolvedValue(null);

            const response = await request(app)
                .get('/api/v1/companies/nonexistent/settings')
                .set('Authorization', 'Bearer valid_token')
                .expect(404);

            expect(response.body).toHaveProperty('error', 'Company not found');
        });

        it('should return 403 for unauthorized access', async () => {
            const companyId = 'company_123';
            const mockCompany = { companyId };
            const mockUser = {
                userId: 'test_user_123',
                companyId: 'different_company',
                permissions: []
            };

            Company.findByCompanyId.mockResolvedValue(mockCompany);
            User.findByUserId.mockResolvedValue(mockUser);

            const response = await request(app)
                .get(`/api/v1/companies/${companyId}/settings`)
                .set('Authorization', 'Bearer valid_token')
                .expect(403);

            expect(response.body).toHaveProperty('error', 'Access denied to company settings');
        });

        it('should allow admin users to access any company settings', async () => {
            const companyId = 'company_123';
            const mockCompany = { companyId };
            const mockUser = {
                userId: 'admin_user',
                companyId: 'different_company',
                permissions: ['admin:all']
            };
            const mockSettings = { companyId };

            Company.findByCompanyId.mockResolvedValue(mockCompany);
            User.findByUserId.mockResolvedValue(mockUser);
            Settings.getCompanySettings.mockResolvedValue(mockSettings);

            const response = await request(app)
                .get(`/api/v1/companies/${companyId}/settings`)
                .set('Authorization', 'Bearer valid_token')
                .expect(200);

            expect(response.body.companyId).toBe(companyId);
        });
    });

    describe('PUT /api/v1/companies/:id/settings', () => {
        it('should update company settings with proper access', async () => {
            const companyId = 'company_123';
            const mockCompany = { companyId };
            const mockUser = {
                userId: 'test_user_123',
                companyId,
                permissions: ['write:companies']
            };
            const existingSettings = { companyId, fiscal: { taxYearType: 'calendar' } };
            const updatedSettings = { companyId, fiscal: { taxYearType: 'fiscal' } };

            Company.findByCompanyId.mockResolvedValue(mockCompany);
            User.findByUserId.mockResolvedValue(mockUser);
            Settings.getCompanySettings.mockResolvedValue(existingSettings);
            Settings.updateCompanySettings.mockResolvedValue(updatedSettings);

            const response = await request(app)
                .put(`/api/v1/companies/${companyId}/settings`)
                .set('Authorization', 'Bearer valid_token')
                .send({ fiscal: { taxYearType: 'fiscal' } })
                .expect(200);

            expect(Settings.updateCompanySettings).toHaveBeenCalledWith(
                companyId,
                expect.objectContaining({ fiscal: { taxYearType: 'fiscal' } })
            );
            expect(response.body.fiscal.taxYearType).toBe('fiscal');
        });

        it('should return 400 for invalid settings', async () => {
            const companyId = 'company_123';
            const mockCompany = { companyId };
            const mockUser = { userId: 'test_user_123', companyId, permissions: ['write:companies'] };
            const existingSettings = { companyId };

            Company.findByCompanyId.mockResolvedValue(mockCompany);
            User.findByUserId.mockResolvedValue(mockUser);
            Settings.getCompanySettings.mockResolvedValue(existingSettings);
            Settings.updateCompanySettings.mockRejectedValue(
                new Error('Invalid settings: exerciseWindow must be between 0 and 365 days')
            );

            const response = await request(app)
                .put(`/api/v1/companies/${companyId}/settings`)
                .set('Authorization', 'Bearer valid_token')
                .send({ equity: { exerciseWindow: 500 } })
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Validation failed');
            expect(response.body.message).toContain('exerciseWindow');
        });

        it('should return 403 for users without write access', async () => {
            const companyId = 'company_123';
            const mockCompany = { companyId };
            const mockUser = {
                userId: 'test_user_123',
                companyId: 'different_company',
                permissions: ['read:companies']
            };

            Company.findByCompanyId.mockResolvedValue(mockCompany);
            User.findByUserId.mockResolvedValue(mockUser);

            const response = await request(app)
                .put(`/api/v1/companies/${companyId}/settings`)
                .set('Authorization', 'Bearer valid_token')
                .send({ fiscal: { taxYearType: 'fiscal' } })
                .expect(403);

            expect(response.body).toHaveProperty('error', 'Access denied to modify company settings');
        });
    });

    describe('POST /api/v1/companies/:id/settings/reset', () => {
        it('should reset company settings for admin users', async () => {
            const companyId = 'company_123';
            const mockCompany = { companyId };
            const mockUser = {
                userId: 'admin_user',
                companyId,
                role: 'admin',
                permissions: ['admin:all']
            };
            const existingSettings = { companyId };
            const defaultSettings = {
                companyId,
                fiscal: { taxYearType: 'calendar' },
                equity: { exerciseWindow: 90 }
            };

            Company.findByCompanyId.mockResolvedValue(mockCompany);
            User.findByUserId.mockResolvedValue(mockUser);
            Settings.getCompanySettings.mockResolvedValue(existingSettings);
            Settings.companySettingsModel = { deleteOne: jest.fn().mockResolvedValue({}) };
            Settings.createCompanySettings.mockResolvedValue(defaultSettings);

            const response = await request(app)
                .post(`/api/v1/companies/${companyId}/settings/reset`)
                .set('Authorization', 'Bearer valid_token')
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Company settings reset to defaults');
            expect(response.body.settings).toMatchObject(defaultSettings);
        });

        it('should return 403 for non-admin users', async () => {
            const companyId = 'company_123';
            const mockCompany = { companyId };
            const mockUser = {
                userId: 'regular_user',
                companyId,
                role: 'employee',
                permissions: ['read:companies']
            };

            Company.findByCompanyId.mockResolvedValue(mockCompany);
            User.findByUserId.mockResolvedValue(mockUser);

            const response = await request(app)
                .post(`/api/v1/companies/${companyId}/settings/reset`)
                .set('Authorization', 'Bearer valid_token')
                .expect(403);

            expect(response.body).toHaveProperty('error', 'Admin access required to reset company settings');
        });
    });
});

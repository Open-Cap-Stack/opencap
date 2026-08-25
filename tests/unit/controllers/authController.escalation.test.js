/**
 * Auth Controller - Privilege Escalation Prevention Tests
 * Issue #171: Profile update endpoint must not allow self-escalation
 */

jest.mock('../../../models/User', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  updateLastLogin: jest.fn().mockResolvedValue({})
}));

jest.mock('../../../middleware/authMiddleware', () => ({
  blacklistToken: jest.fn().mockResolvedValue(true),
  isTokenBlacklisted: jest.fn().mockResolvedValue(false),
  authenticateToken: jest.fn((req, res, next) => next()),
  provisionAINativeUser: jest.fn()
}));

jest.mock('axios');

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: jest.fn().mockResolvedValue(true) }))
}));

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken: jest.fn() }))
}));

const httpMocks = require('node-mocks-http');
const authController = require('../../../controllers/authController');
const User = require('../../../models/User');
const bcrypt = require('bcryptjs');

jest.spyOn(bcrypt, 'hash');
jest.spyOn(bcrypt, 'compare');

describe('updateUserProfile - privilege escalation prevention', () => {
  let req, res;

  const mockUser = {
    _id: 'user_123',
    userId: 'user_123',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    password: 'hashed_password',
    role: 'employee',
    permissions: [],
    status: 'active'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.NODE_ENV = 'development';
    bcrypt.hash.mockResolvedValue('hashed_password');
    bcrypt.compare.mockResolvedValue(true);
  });

  it('should return 403 when a normal user tries to set role to super_admin', async () => {
    req.user = { userId: 'user_123', role: 'employee' };
    req.body = { role: 'super_admin' };

    User.findOne.mockResolvedValue({ ...mockUser });

    await authController.updateUserProfile(req, res);

    expect(res.statusCode).toBe(403);
    const data = res._getJSONData();
    expect(data.message).toMatch(/super_admin/i);
    expect(User.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('should return 403 when a normal user tries to set permissions', async () => {
    req.user = { userId: 'user_123', role: 'employee' };
    req.body = { permissions: ['admin:all', 'write:users'] };

    User.findOne.mockResolvedValue({ ...mockUser });

    await authController.updateUserProfile(req, res);

    expect(res.statusCode).toBe(403);
    const data = res._getJSONData();
    expect(data.message).toMatch(/super_admin/i);
    expect(User.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('should allow super_admin to set role and permissions', async () => {
    req.user = { userId: 'admin_001', role: 'super_admin' };
    req.body = { role: 'admin', permissions: ['read:all'] };

    const adminUser = { ...mockUser, userId: 'admin_001', role: 'super_admin' };
    User.findOne.mockResolvedValue(adminUser);
    User.findOneAndUpdate.mockResolvedValue({ ...adminUser, role: 'admin', permissions: ['read:all'] });

    await authController.updateUserProfile(req, res);

    expect(res.statusCode).toBe(200);
    expect(User.findOneAndUpdate).toHaveBeenCalledWith(
      { userId: 'admin_001' },
      expect.objectContaining({ role: 'admin', permissions: ['read:all'] }),
      { new: true }
    );
  });

  it('should allow normal user to update name and email without touching role', async () => {
    req.user = { userId: 'user_123', role: 'employee' };
    req.body = { firstName: 'Updated', lastName: 'Name' };

    User.findOne.mockResolvedValue({ ...mockUser });
    User.findOneAndUpdate.mockResolvedValue({ ...mockUser, firstName: 'Updated', lastName: 'Name' });

    await authController.updateUserProfile(req, res);

    expect(res.statusCode).toBe(200);
    expect(User.findOneAndUpdate).toHaveBeenCalledWith(
      { userId: 'user_123' },
      expect.objectContaining({ firstName: 'Updated', lastName: 'Name' }),
      { new: true }
    );
    // Ensure role and permissions are NOT in the update payload
    const updatePayload = User.findOneAndUpdate.mock.calls[0][1];
    expect(updatePayload).not.toHaveProperty('role');
    expect(updatePayload).not.toHaveProperty('permissions');
  });

  it('should return 403 when a founder tries to escalate role', async () => {
    req.user = { userId: 'user_456', role: 'founder' };
    req.body = { role: 'super_admin' };

    User.findOne.mockResolvedValue({ ...mockUser, userId: 'user_456', role: 'founder' });

    await authController.updateUserProfile(req, res);

    expect(res.statusCode).toBe(403);
    expect(User.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('should return 403 when an admin (non-super) tries to set permissions', async () => {
    req.user = { userId: 'user_789', role: 'admin' };
    req.body = { permissions: ['admin:all'] };

    User.findOne.mockResolvedValue({ ...mockUser, userId: 'user_789', role: 'admin' });

    await authController.updateUserProfile(req, res);

    expect(res.statusCode).toBe(403);
    expect(User.findOneAndUpdate).not.toHaveBeenCalled();
  });
});

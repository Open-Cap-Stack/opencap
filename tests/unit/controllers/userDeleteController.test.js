/**
 * User Delete Controller Test Suite
 *
 * Tests for soft-delete, hard-delete with cleanup, and bulk delete guards.
 * Issue #485: Single user hard-delete left orphaned ZeroDB data
 * Issue #487: Mass user hard-delete wiped users table (no safety guard)
 */

// Mock all models before requiring the controller
jest.mock('../../../models/User');
jest.mock('../../../models/ApiKey');
jest.mock('../../../models/StripeCustomer');
jest.mock('../../../services/fileStorageService');
jest.mock('sharp', () => jest.fn(() => ({
  resize: jest.fn().mockReturnThis(),
  jpeg: jest.fn().mockReturnThis(),
  toBuffer: jest.fn().mockResolvedValue(Buffer.from('thumb'))
})));

const User = require('../../../models/User');
const ApiKey = require('../../../models/ApiKey');
const StripeCustomer = require('../../../models/StripeCustomer');

const {
  deleteUserById,
  hardDeleteUserById,
  bulkDeleteUsers,
  BULK_DELETE_MAX
} = require('../../../controllers/userController');

describe('User Delete Controller', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      params: { id: 'user-abc-123' },
      body: {},
      user: {
        userId: 'admin-001',
        email: 'admin@example.com',
        role: 'admin'
      }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  // -------------------------------------------------------
  // deleteUserById (soft-delete)
  // -------------------------------------------------------
  describe('deleteUserById (soft-delete)', () => {
    it('should soft-delete user by setting deletedAt and status=inactive', async () => {
      const fakeUser = {
        _id: 'user-abc-123',
        userId: 'user_u1',
        email: 'alice@example.com',
        deletedAt: null
      };

      User.findById.mockResolvedValue(fakeUser);
      User.findByIdAndUpdate.mockResolvedValue({ ...fakeUser, deletedAt: '2026-05-09', status: 'inactive' });

      await deleteUserById(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith('user-abc-123');
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-abc-123',
        expect.objectContaining({ status: 'inactive' }),
        { new: true }
      );
      // deletedAt should be a string (ISO date)
      const updateArg = User.findByIdAndUpdate.mock.calls[0][1];
      expect(updateArg.deletedAt).toBeDefined();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'User deleted successfully' });
    });

    it('should return 404 if user does not exist', async () => {
      User.findById.mockResolvedValue(null);

      await deleteUserById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should return 404 if user is already soft-deleted', async () => {
      User.findById.mockResolvedValue({
        _id: 'user-abc-123',
        deletedAt: '2026-01-01T00:00:00Z'
      });

      await deleteUserById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should return 500 on database error', async () => {
      User.findById.mockRejectedValue(new Error('DB failure'));

      await deleteUserById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  // -------------------------------------------------------
  // hardDeleteUserById (admin only, with cleanup)
  // -------------------------------------------------------
  describe('hardDeleteUserById', () => {
    const fakeUser = {
      _id: 'user-abc-123',
      userId: 'user_u1',
      email: 'alice@example.com',
      companyId: 'company-001'
    };

    it('should hard-delete user and clean up API keys and Stripe data', async () => {
      User.findById.mockResolvedValue(fakeUser);
      User.findByIdAndDelete.mockResolvedValue(fakeUser);

      // API keys cleanup
      ApiKey.find.mockResolvedValue([
        { apiKeyId: 'apikey_1', partnerId: 'user_u1' },
        { apiKeyId: 'apikey_2', partnerId: 'user_u1' }
      ]);
      ApiKey.updateOne.mockResolvedValue({});

      // Stripe cleanup
      StripeCustomer.findOne.mockResolvedValueOnce(null); // first call by userId
      StripeCustomer.findOne.mockResolvedValueOnce({
        companyId: 'company-001',
        stripeCustomerId: 'cus_abc',
        metadata: {}
      }); // second call by companyId
      StripeCustomer.updateOne.mockResolvedValue({});

      await hardDeleteUserById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.message).toBe('User permanently deleted');
      expect(response.cleanup.apiKeysRevoked).toBe(2);
      expect(response.cleanup.stripeCustomerMarked).toBe(true);
      expect(User.findByIdAndDelete).toHaveBeenCalledWith('user-abc-123');
    });

    it('should reject non-admin users with 403', async () => {
      mockReq.user.role = 'user';

      await hardDeleteUserById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Admin access required' });
      expect(User.findById).not.toHaveBeenCalled();
    });

    it('should return 404 if user not found', async () => {
      User.findById.mockResolvedValue(null);

      await hardDeleteUserById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should still delete user if cleanup partially fails', async () => {
      User.findById.mockResolvedValue(fakeUser);
      User.findByIdAndDelete.mockResolvedValue(fakeUser);
      ApiKey.find.mockRejectedValue(new Error('API key service down'));
      StripeCustomer.findOne.mockResolvedValue(null);

      await hardDeleteUserById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.cleanup.errors.length).toBeGreaterThan(0);
      expect(User.findByIdAndDelete).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------
  // bulkDeleteUsers (Issue #487 guards)
  // -------------------------------------------------------
  describe('bulkDeleteUsers', () => {
    it('should reject if confirm !== true', async () => {
      mockReq.body = { userIds: ['u1', 'u2'] };

      await bulkDeleteUsers(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Bulk delete requires explicit confirmation'
      });
    });

    it('should reject if confirm is string "true" instead of boolean', async () => {
      mockReq.body = { userIds: ['u1'], confirm: 'true' };

      await bulkDeleteUsers(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Bulk delete requires explicit confirmation'
      });
    });

    it('should reject if more than BULK_DELETE_MAX users', async () => {
      const tooMany = Array.from({ length: BULK_DELETE_MAX + 1 }, (_, i) => `user-${i}`);
      mockReq.body = { userIds: tooMany, confirm: true };

      await bulkDeleteUsers(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.error).toContain('limited to');
      expect(response.requested).toBe(BULK_DELETE_MAX + 1);
      expect(response.max).toBe(BULK_DELETE_MAX);
    });

    it('should reject non-admin users with 403', async () => {
      mockReq.user.role = 'user';
      mockReq.body = { userIds: ['u1'], confirm: true };

      await bulkDeleteUsers(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should reject empty userIds array', async () => {
      mockReq.body = { userIds: [], confirm: true };

      await bulkDeleteUsers(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'userIds must be a non-empty array'
      });
    });

    it('should reject if userIds is not an array', async () => {
      mockReq.body = { userIds: 'not-an-array', confirm: true };

      await bulkDeleteUsers(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should soft-delete multiple users when confirm=true and count <= max', async () => {
      const users = [
        { _id: 'u1', userId: 'user_1', email: 'a@x.com' },
        { _id: 'u2', userId: 'user_2', email: 'b@x.com' }
      ];

      User.findById
        .mockResolvedValueOnce(users[0])
        .mockResolvedValueOnce(users[1]);
      User.findByIdAndUpdate.mockResolvedValue({});

      mockReq.body = { userIds: ['u1', 'u2'], confirm: true };

      await bulkDeleteUsers(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.results).toHaveLength(2);
      expect(response.results[0].status).toBe('soft_deleted');
      expect(response.results[1].status).toBe('soft_deleted');
      expect(User.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it('should hard-delete users when hard=true with cleanup', async () => {
      const fakeUser = {
        _id: 'u1',
        userId: 'user_1',
        email: 'a@x.com',
        companyId: null
      };

      User.findById.mockResolvedValue(fakeUser);
      User.findByIdAndDelete.mockResolvedValue(fakeUser);
      ApiKey.find.mockResolvedValue([]);
      StripeCustomer.findOne.mockResolvedValue(null);

      mockReq.body = { userIds: ['u1'], confirm: true, hard: true };

      await bulkDeleteUsers(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.results[0].status).toBe('hard_deleted');
      expect(User.findByIdAndDelete).toHaveBeenCalledWith('u1');
    });

    it('should report not_found for missing users', async () => {
      User.findById.mockResolvedValue(null);

      mockReq.body = { userIds: ['nonexistent'], confirm: true };

      await bulkDeleteUsers(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.results[0].status).toBe('not_found');
    });

    it('should enforce exactly BULK_DELETE_MAX as the limit', () => {
      expect(BULK_DELETE_MAX).toBe(10);
    });
  });
});

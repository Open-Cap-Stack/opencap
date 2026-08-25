/**
 * User Soft-Delete Access Control Tests
 *
 * Issue #165: User soft-delete endpoint allows all roles to delete any user.
 * Verifies:
 *   1. Admin can delete a user
 *   2. Employee cannot delete a user (403 from route-level RBAC)
 *   3. User cannot delete themselves (403 from controller guard)
 */

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
const { deleteUserById } = require('../../../controllers/userController');
const { hasRole } = require('../../../middleware/rbacMiddleware');

describe('Issue #165 - User soft-delete access control', () => {
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  // -------------------------------------------------------
  // 1. Admin can delete a user
  // -------------------------------------------------------
  it('should allow admin to soft-delete a user', async () => {
    const targetUser = {
      _id: 'target-user-123',
      userId: 'user_target',
      email: 'target@example.com',
      deletedAt: null
    };

    User.findById.mockResolvedValue(targetUser);
    User.findByIdAndUpdate.mockResolvedValue({
      ...targetUser,
      deletedAt: '2026-08-25T00:00:00.000Z',
      status: 'inactive'
    });

    const mockReq = {
      params: { id: 'target-user-123' },
      user: {
        userId: 'admin-001',
        _id: 'admin-001',
        role: 'admin'
      }
    };

    await deleteUserById(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: 'User deleted successfully' });
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      'target-user-123',
      expect.objectContaining({ status: 'inactive' }),
      { new: true }
    );
  });

  // -------------------------------------------------------
  // 2. Employee cannot delete a user (route-level RBAC)
  // -------------------------------------------------------
  it('should reject employee role at route level with 403', () => {
    const middleware = hasRole(['admin', 'super_admin', 'founder']);

    const mockReq = {
      user: {
        userId: 'emp-001',
        role: 'employee'
      }
    };
    const mockNext = jest.fn();

    middleware(mockReq, mockRes, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Access denied: Insufficient role permissions'
    });
  });

  it('should also reject client role at route level with 403', () => {
    const middleware = hasRole(['admin', 'super_admin', 'founder']);

    const mockReq = {
      user: {
        userId: 'client-001',
        role: 'client'
      }
    };
    const mockNext = jest.fn();

    middleware(mockReq, mockRes, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(403);
  });

  it('should also reject investor role at route level with 403', () => {
    const middleware = hasRole(['admin', 'super_admin', 'founder']);

    const mockReq = {
      user: {
        userId: 'investor-001',
        role: 'investor'
      }
    };
    const mockNext = jest.fn();

    middleware(mockReq, mockRes, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(403);
  });

  // -------------------------------------------------------
  // 3. User cannot delete themselves
  // -------------------------------------------------------
  it('should return 403 when user tries to delete themselves (matched by params.id)', async () => {
    const mockReq = {
      params: { id: 'admin-001' },
      user: {
        userId: 'admin-001',
        _id: 'admin-001',
        role: 'admin'
      }
    };

    await deleteUserById(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ success: false, error: expect.objectContaining({ message: 'You cannot delete your own account' }) });
    expect(User.findById).not.toHaveBeenCalled();
  });

  it('should return 403 when user tries to delete themselves (matched by user.userId on target)', async () => {
    const targetUser = {
      _id: 'db-id-999',
      userId: 'admin-001',
      email: 'admin@example.com',
      deletedAt: null
    };

    // params.id is the DB _id which differs from req.user.userId,
    // but the target user's userId field matches the requester
    User.findById.mockResolvedValue(targetUser);

    const mockReq = {
      params: { id: 'db-id-999' },
      user: {
        userId: 'admin-001',
        _id: 'admin-id-different',
        role: 'admin'
      }
    };

    await deleteUserById(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ success: false, error: expect.objectContaining({ message: 'You cannot delete your own account' }) });
    // findById is called because the first check (params.id vs userId) didn't match
    expect(User.findById).toHaveBeenCalledWith('db-id-999');
    // But findByIdAndUpdate should NOT be called
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});

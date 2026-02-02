/**
 * User Controller Tests
 *
 * Tests for the User controller with ZeroDB migration support
 *
 * Issue #15: Migrate User controller to ZeroDB
 */

const userController = require('../../../controllers/userController');
const databaseAdapter = require('../../../services/databaseAdapter');
const httpMocks = require('node-mocks-http');

// Mock the database adapter
jest.mock('../../../services/databaseAdapter');

describe('UserController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      req.body = {
        userId: 'user-123',
        name: 'John Doe',
        username: 'johndoe',
        email: 'john@example.com',
        password: 'securepassword123',
        role: 'user'
      };

      const mockUser = {
        _id: 'mongo-id-123',
        userId: 'user-123',
        name: 'John Doe',
        username: 'johndoe',
        email: 'john@example.com',
        role: 'user',
        createdAt: new Date().toISOString()
      };

      databaseAdapter.findOne.mockResolvedValue(null); // No existing user
      databaseAdapter.create.mockResolvedValue(mockUser);

      await userController.createUser(req, res);

      expect(res.statusCode).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.userId).toBe('user-123');
      expect(data.email).toBe('john@example.com');
      expect(databaseAdapter.findOne).toHaveBeenCalledWith('User', { email: 'john@example.com' });
      expect(databaseAdapter.create).toHaveBeenCalledWith('User', expect.objectContaining({
        userId: 'user-123',
        email: 'john@example.com'
      }));
    });

    it('should return 400 when required fields are missing', async () => {
      req.body = {
        userId: 'user-123',
        name: 'John Doe'
        // Missing username, email, password, role
      };

      await userController.createUser(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('required');
    });

    it('should return 400 when email already exists', async () => {
      req.body = {
        userId: 'user-456',
        name: 'Jane Doe',
        username: 'janedoe',
        email: 'existing@example.com',
        password: 'password123',
        role: 'user'
      };

      databaseAdapter.findOne.mockResolvedValue({
        _id: 'existing-id',
        email: 'existing@example.com'
      });

      await userController.createUser(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('Email already exists');
    });

    it('should return 500 on database error during creation', async () => {
      req.body = {
        userId: 'user-789',
        name: 'Error User',
        username: 'erroruser',
        email: 'error@example.com',
        password: 'password123',
        role: 'user'
      };

      databaseAdapter.findOne.mockResolvedValue(null);
      databaseAdapter.create.mockRejectedValue(new Error('Database connection failed'));

      await userController.createUser(req, res);

      expect(res.statusCode).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('Server error');
    });
  });

  describe('getAllUsers', () => {
    it('should return all users successfully', async () => {
      const mockUsers = [
        { _id: 'id-1', userId: 'user-1', name: 'User One', email: 'user1@example.com' },
        { _id: 'id-2', userId: 'user-2', name: 'User Two', email: 'user2@example.com' }
      ];

      databaseAdapter.find.mockResolvedValue(mockUsers);

      await userController.getAllUsers(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveLength(2);
      expect(data[0].email).toBe('user1@example.com');
      expect(databaseAdapter.find).toHaveBeenCalledWith('User', {}, expect.any(Object));
    });

    it('should return empty array when no users exist', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      await userController.getAllUsers(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveLength(0);
    });

    it('should return 500 on database error', async () => {
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await userController.getAllUsers(req, res);

      expect(res.statusCode).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('Error fetching users');
    });
  });

  describe('getUserById', () => {
    it('should return user by ID successfully', async () => {
      req.params = { id: 'user-id-123' };

      const mockUser = {
        _id: 'user-id-123',
        userId: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'user'
      };

      databaseAdapter.findById.mockResolvedValue(mockUser);

      await userController.getUserById(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.email).toBe('john@example.com');
      expect(databaseAdapter.findById).toHaveBeenCalledWith('User', 'user-id-123');
    });

    it('should return 404 when user not found', async () => {
      req.params = { id: 'non-existent-id' };

      databaseAdapter.findById.mockResolvedValue(null);

      await userController.getUserById(req, res);

      expect(res.statusCode).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('User not found');
    });

    it('should return 500 on database error', async () => {
      req.params = { id: 'error-id' };

      databaseAdapter.findById.mockRejectedValue(new Error('Database error'));

      await userController.getUserById(req, res);

      expect(res.statusCode).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('Error fetching user');
    });
  });

  describe('getProfile', () => {
    it('should return user profile using userId', async () => {
      req.user = { userId: 'user-123' };

      const mockUser = {
        _id: 'mongo-id-123',
        userId: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'user',
        profile: { bio: 'Test bio' }
      };

      databaseAdapter.findOne.mockResolvedValue(mockUser);

      await userController.getProfile(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.userId).toBe('user-123');
      expect(databaseAdapter.findOne).toHaveBeenCalledWith(
        'User',
        { userId: 'user-123' },
        expect.objectContaining({ select: expect.stringContaining('-password') })
      );
    });

    it('should return user profile using _id as fallback', async () => {
      req.user = { id: 'mongo-id-456' };

      const mockUser = {
        _id: 'mongo-id-456',
        userId: 'user-456',
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'admin'
      };

      // First call with userId returns null (no userId in req.user)
      databaseAdapter.findOne.mockResolvedValue(null);
      databaseAdapter.findById.mockResolvedValue(mockUser);

      await userController.getProfile(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data._id).toBe('mongo-id-456');
    });

    it('should return 404 when user not found', async () => {
      req.user = { userId: 'non-existent' };

      databaseAdapter.findOne.mockResolvedValue(null);
      databaseAdapter.findById.mockResolvedValue(null);

      await userController.getProfile(req, res);

      expect(res.statusCode).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('User not found');
    });

    it('should return 500 on database error', async () => {
      req.user = { userId: 'error-user' };

      databaseAdapter.findOne.mockRejectedValue(new Error('Database error'));

      await userController.getProfile(req, res);

      expect(res.statusCode).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('Error fetching user profile');
    });
  });

  describe('updateUserById', () => {
    it('should update user successfully', async () => {
      req.params = { id: 'user-id-123' };
      req.body = {
        name: 'John Updated',
        role: 'admin'
      };

      const mockUpdatedUser = {
        _id: 'user-id-123',
        userId: 'user-123',
        name: 'John Updated',
        email: 'john@example.com',
        role: 'admin'
      };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedUser);

      await userController.updateUserById(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.name).toBe('John Updated');
      expect(data.role).toBe('admin');
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'User',
        'user-id-123',
        { name: 'John Updated', role: 'admin' },
        { new: true, runValidators: true }
      );
    });

    it('should return 404 when user not found for update', async () => {
      req.params = { id: 'non-existent-id' };
      req.body = { name: 'Updated Name' };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(null);

      await userController.updateUserById(req, res);

      expect(res.statusCode).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('User not found');
    });

    it('should return 500 on database error during update', async () => {
      req.params = { id: 'error-id' };
      req.body = { name: 'Error Update' };

      databaseAdapter.findByIdAndUpdate.mockRejectedValue(new Error('Update failed'));

      await userController.updateUserById(req, res);

      expect(res.statusCode).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('Error updating user');
    });
  });

  describe('deleteUserById', () => {
    it('should delete user successfully', async () => {
      req.params = { id: 'user-id-123' };

      const mockDeletedUser = {
        _id: 'user-id-123',
        userId: 'user-123',
        name: 'Deleted User',
        email: 'deleted@example.com'
      };

      databaseAdapter.findByIdAndDelete.mockResolvedValue(mockDeletedUser);

      await userController.deleteUserById(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('User deleted successfully');
      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('User', 'user-id-123');
    });

    it('should return 404 when user not found for deletion', async () => {
      req.params = { id: 'non-existent-id' };

      databaseAdapter.findByIdAndDelete.mockResolvedValue(null);

      await userController.deleteUserById(req, res);

      expect(res.statusCode).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('User not found');
    });

    it('should return 500 on database error during deletion', async () => {
      req.params = { id: 'error-id' };

      databaseAdapter.findByIdAndDelete.mockRejectedValue(new Error('Delete failed'));

      await userController.deleteUserById(req, res);

      expect(res.statusCode).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('Error deleting user');
    });
  });

  describe('Error Handling', () => {
    it('should handle ZeroDB connection errors gracefully', async () => {
      req.body = {
        userId: 'user-123',
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'user'
      };

      const zerodbError = new Error('ZeroDB connection timeout');
      zerodbError.code = 'ECONNREFUSED';

      databaseAdapter.findOne.mockResolvedValue(null);
      databaseAdapter.create.mockRejectedValue(zerodbError);

      await userController.createUser(req, res);

      expect(res.statusCode).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error).toBeDefined();
    });

    it('should handle validation errors from databaseAdapter', async () => {
      req.body = {
        userId: 'user-123',
        name: 'Test User',
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123',
        role: 'user'
      };

      const validationError = new Error('Validation failed: email is invalid');
      validationError.name = 'ValidationError';

      databaseAdapter.findOne.mockResolvedValue(null);
      databaseAdapter.create.mockRejectedValue(validationError);

      await userController.createUser(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('Database Adapter Integration', () => {
    it('should use databaseAdapter.find for getAllUsers', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      await userController.getAllUsers(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledTimes(1);
      expect(databaseAdapter.find).toHaveBeenCalledWith('User', {}, expect.any(Object));
    });

    it('should use databaseAdapter.findById for getUserById', async () => {
      req.params = { id: 'test-id' };
      databaseAdapter.findById.mockResolvedValue(null);

      await userController.getUserById(req, res);

      expect(databaseAdapter.findById).toHaveBeenCalledTimes(1);
      expect(databaseAdapter.findById).toHaveBeenCalledWith('User', 'test-id');
    });

    it('should use databaseAdapter.create for createUser', async () => {
      req.body = {
        userId: 'user-123',
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'user'
      };

      databaseAdapter.findOne.mockResolvedValue(null);
      databaseAdapter.create.mockResolvedValue({ ...req.body, _id: 'mongo-id' });

      await userController.createUser(req, res);

      expect(databaseAdapter.create).toHaveBeenCalledTimes(1);
      expect(databaseAdapter.create).toHaveBeenCalledWith('User', expect.objectContaining({
        userId: 'user-123',
        email: 'test@example.com'
      }));
    });

    it('should use databaseAdapter.findByIdAndUpdate for updateUserById', async () => {
      req.params = { id: 'test-id' };
      req.body = { name: 'Updated' };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ _id: 'test-id', name: 'Updated' });

      await userController.updateUserById(req, res);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledTimes(1);
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'User',
        'test-id',
        { name: 'Updated' },
        expect.any(Object)
      );
    });

    it('should use databaseAdapter.findByIdAndDelete for deleteUserById', async () => {
      req.params = { id: 'test-id' };

      databaseAdapter.findByIdAndDelete.mockResolvedValue({ _id: 'test-id' });

      await userController.deleteUserById(req, res);

      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledTimes(1);
      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('User', 'test-id');
    });
  });
});

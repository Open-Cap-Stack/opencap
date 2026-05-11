/**
 * User Controller Tests
 * Rewritten to mock User model directly instead of databaseAdapter
 */

jest.mock('../../../models/User', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  toJSON: null
}));

jest.mock('../../../services/fileStorageService', () => ({
  uploadFile: jest.fn(),
  getPresignedUrl: jest.fn(),
  deleteFile: jest.fn()
}));

jest.mock('sharp', () => jest.fn().mockReturnValue({
  resize: jest.fn().mockReturnThis(),
  jpeg: jest.fn().mockReturnThis(),
  toBuffer: jest.fn().mockResolvedValue(Buffer.from('thumbnail'))
}));

const userController = require('../../../controllers/userController');
const User = require('../../../models/User');
const httpMocks = require('node-mocks-http');

describe('UserController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      req.body = { userId: 'user-123', name: 'John Doe', username: 'johndoe', email: 'john@example.com', password: 'securepassword123', role: 'user' };
      User.findOne.mockResolvedValue(null);
      const mockUser = { _id: 'mongo-id-123', userId: 'user-123', name: 'John Doe', username: 'johndoe', email: 'john@example.com', role: 'user' };
      User.create.mockResolvedValue(mockUser);
      await userController.createUser(req, res);
      expect(res.statusCode).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.userId).toBe('user-123');
    });

    it('should return 400 when required fields are missing', async () => {
      req.body = { userId: 'user-123', name: 'John Doe' };
      await userController.createUser(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when email already exists', async () => {
      req.body = { userId: 'user-456', name: 'Jane Doe', username: 'janedoe', email: 'existing@example.com', password: 'password123', role: 'user' };
      User.findOne.mockResolvedValue({ _id: 'existing-id', email: 'existing@example.com' });
      await userController.createUser(req, res);
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData()).error).toContain('Email already exists');
    });

    it('should return 500 on database error during creation', async () => {
      req.body = { userId: 'user-789', name: 'Error User', username: 'erroruser', email: 'error@example.com', password: 'password123', role: 'user' };
      User.findOne.mockResolvedValue(null);
      User.create.mockRejectedValue(new Error('Database connection failed'));
      await userController.createUser(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  describe('getAllUsers', () => {
    it('should return all users successfully', async () => {
      const mockUsers = [{ _id: 'id-1', userId: 'user-1', email: 'user1@example.com' }, { _id: 'id-2', userId: 'user-2', email: 'user2@example.com' }];
      User.find.mockResolvedValue(mockUsers);
      await userController.getAllUsers(req, res);
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.users).toHaveLength(2);
    });

    it('should return empty array when no users exist', async () => {
      User.find.mockResolvedValue([]);
      await userController.getAllUsers(req, res);
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.users).toHaveLength(0);
    });

    it('should return 500 on database error', async () => {
      User.find.mockRejectedValue(new Error('Database error'));
      await userController.getAllUsers(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  describe('getUserById', () => {
    it('should return user by ID successfully', async () => {
      req.params = { id: 'user-id-123' };
      User.findById.mockResolvedValue({ _id: 'user-id-123', email: 'john@example.com', role: 'user' });
      await userController.getUserById(req, res);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).email).toBe('john@example.com');
    });

    it('should return 404 when user not found', async () => {
      req.params = { id: 'non-existent-id' };
      User.findById.mockResolvedValue(null);
      await userController.getUserById(req, res);
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData()).error).toBe('User not found');
    });

    it('should return 500 on database error', async () => {
      req.params = { id: 'error-id' };
      User.findById.mockRejectedValue(new Error('Database error'));
      await userController.getUserById(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  describe('getProfile', () => {
    it('should return user profile using userId', async () => {
      req.user = { userId: 'user-123' };
      User.findOne.mockResolvedValue({ _id: 'mongo-id-123', userId: 'user-123', name: 'John Doe', email: 'john@example.com' });
      await userController.getProfile(req, res);
      expect(res.statusCode).toBe(200);
    });

    it('should return user profile using _id as fallback', async () => {
      req.user = { _id: 'mongo-id-456' };
      User.findOne.mockResolvedValue(null);
      User.findById.mockResolvedValue({ _id: 'mongo-id-456', userId: 'user-456', name: 'Jane Doe', email: 'jane@example.com' });
      await userController.getProfile(req, res);
      expect(res.statusCode).toBe(200);
    });

    it('should return 404 when user not found', async () => {
      req.user = { userId: 'non-existent' };
      User.findOne.mockResolvedValue(null);
      User.findById.mockResolvedValue(null);
      await userController.getProfile(req, res);
      expect(res.statusCode).toBe(404);
    });

    it('should return 500 on database error', async () => {
      req.user = { userId: 'error-user' };
      User.findOne.mockRejectedValue(new Error('Database error'));
      await userController.getProfile(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  describe('updateUserById', () => {
    it('should update user successfully', async () => {
      req.params = { id: 'user-id-123' };
      req.body = { name: 'John Updated', role: 'admin' };
      User.findByIdAndUpdate.mockResolvedValue({ _id: 'user-id-123', name: 'John Updated', role: 'admin' });
      await userController.updateUserById(req, res);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).name).toBe('John Updated');
    });

    it('should return 404 when user not found for update', async () => {
      req.params = { id: 'non-existent-id' };
      req.body = { name: 'Updated Name' };
      User.findByIdAndUpdate.mockResolvedValue(null);
      await userController.updateUserById(req, res);
      expect(res.statusCode).toBe(404);
    });

    it('should return 500 on database error during update', async () => {
      req.params = { id: 'error-id' };
      req.body = { name: 'Error Update' };
      User.findByIdAndUpdate.mockRejectedValue(new Error('Update failed'));
      await userController.updateUserById(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  describe('deleteUserById', () => {
    it('should soft-delete user successfully', async () => {
      req.params = { id: 'user-id-123' };
      User.findById.mockResolvedValue({ _id: 'user-id-123', deletedAt: null });
      User.findByIdAndUpdate.mockResolvedValue({ _id: 'user-id-123', deletedAt: new Date(), status: 'inactive' });
      await userController.deleteUserById(req, res);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).message).toBe('User deleted successfully');
    });

    it('should return 404 when user not found for deletion', async () => {
      req.params = { id: 'non-existent-id' };
      User.findById.mockResolvedValue(null);
      await userController.deleteUserById(req, res);
      expect(res.statusCode).toBe(404);
    });

    it('should return 500 on database error during deletion', async () => {
      req.params = { id: 'error-id' };
      User.findById.mockRejectedValue(new Error('Delete failed'));
      await userController.deleteUserById(req, res);
      expect(res.statusCode).toBe(500);
    });
  });
});

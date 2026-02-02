/**
 * Admin Controller Tests
 *
 * Issue #20: Migrate remaining controllers to ZeroDB (Batch 2)
 *
 * Tests for the admin controller using DatabaseAdapter for ZeroDB migration
 * Follows TDD pattern: Red -> Green -> Refactor
 */

const httpMocks = require('node-mocks-http');
const adminController = require('../../../controllers/adminController');
const databaseAdapter = require('../../../services/databaseAdapter');

// Mock the database adapter
jest.mock('../../../services/databaseAdapter');

describe('AdminController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
  });

  describe('createAdmin', () => {
    it('should create an admin successfully', async () => {
      const adminData = {
        UserID: 'ADMIN-001',
        Name: 'John Admin',
        Email: 'admin@company.com',
        UserRoles: ['admin', 'manager'],
        NotificationSettings: { email: true, sms: false }
      };

      req.body = adminData;

      const mockCreatedAdmin = {
        _id: 'mongo_123',
        ...adminData
      };

      databaseAdapter.create.mockResolvedValue(mockCreatedAdmin);

      await adminController.createAdmin(req, res);

      expect(res.statusCode).toBe(201);
      expect(databaseAdapter.create).toHaveBeenCalledWith('Admin', adminData);
    });

    it('should return 400 when required fields are missing', async () => {
      req.body = { UserID: 'ADMIN-001' }; // Missing required fields

      await adminController.createAdmin(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Invalid admin data');
    });

    it('should return 400 when UserID is missing', async () => {
      req.body = {
        Name: 'John Admin',
        Email: 'admin@company.com',
        UserRoles: ['admin'],
        NotificationSettings: { email: true }
      };

      await adminController.createAdmin(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should handle database errors gracefully', async () => {
      req.body = {
        UserID: 'ADMIN-001',
        Name: 'John Admin',
        Email: 'admin@company.com',
        UserRoles: ['admin'],
        NotificationSettings: { email: true }
      };

      databaseAdapter.create.mockRejectedValue(new Error('Database error'));

      await adminController.createAdmin(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('getAllAdmins', () => {
    it('should return all admins', async () => {
      const mockAdmins = [
        { _id: 'mongo_1', UserID: 'ADMIN-001', Name: 'Admin One' },
        { _id: 'mongo_2', UserID: 'ADMIN-002', Name: 'Admin Two' }
      ];

      databaseAdapter.find.mockResolvedValue(mockAdmins);

      await adminController.getAllAdmins(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.find).toHaveBeenCalledWith('Admin', {}, expect.any(Object));
    });

    it('should return 404 when no admins exist', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      await adminController.getAllAdmins(req, res);

      expect(res.statusCode).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('No admins found');
    });

    it('should handle database errors', async () => {
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await adminController.getAllAdmins(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('getAdminById', () => {
    it('should return admin by ID', async () => {
      req.params = { id: 'mongo_123' };
      const mockAdmin = {
        _id: 'mongo_123',
        UserID: 'ADMIN-001',
        Name: 'John Admin'
      };

      databaseAdapter.findById.mockResolvedValue(mockAdmin);

      await adminController.getAdminById(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.findById).toHaveBeenCalledWith('Admin', 'mongo_123');
    });

    it('should return 404 when admin not found', async () => {
      req.params = { id: 'nonexistent_id' };

      databaseAdapter.findById.mockResolvedValue(null);

      await adminController.getAdminById(req, res);

      expect(res.statusCode).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Admin not found');
    });

    it('should handle database errors', async () => {
      req.params = { id: 'mongo_123' };

      databaseAdapter.findById.mockRejectedValue(new Error('Database error'));

      await adminController.getAdminById(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('updateAdmin', () => {
    it('should update an admin successfully', async () => {
      req.params = { id: 'mongo_123' };
      req.body = { Name: 'Updated Admin Name' };

      const mockUpdatedAdmin = {
        _id: 'mongo_123',
        UserID: 'ADMIN-001',
        Name: 'Updated Admin Name'
      };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedAdmin);

      await adminController.updateAdmin(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'Admin',
        'mongo_123',
        req.body,
        expect.any(Object)
      );
    });

    it('should return 404 when admin to update not found', async () => {
      req.params = { id: 'nonexistent_id' };
      req.body = { Name: 'Updated Name' };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(null);

      await adminController.updateAdmin(req, res);

      expect(res.statusCode).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Admin not found');
    });

    it('should handle database errors during update', async () => {
      req.params = { id: 'mongo_123' };
      req.body = { Name: 'Updated Name' };

      databaseAdapter.findByIdAndUpdate.mockRejectedValue(new Error('Database error'));

      await adminController.updateAdmin(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('deleteAdmin', () => {
    it('should delete an admin successfully', async () => {
      req.params = { id: 'mongo_123' };

      databaseAdapter.findByIdAndDelete.mockResolvedValue({ _id: 'mongo_123' });

      await adminController.deleteAdmin(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('Admin', 'mongo_123');
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Admin deleted');
    });

    it('should return 404 when admin to delete not found', async () => {
      req.params = { id: 'nonexistent_id' };

      databaseAdapter.findByIdAndDelete.mockResolvedValue(null);

      await adminController.deleteAdmin(req, res);

      expect(res.statusCode).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Admin not found');
    });

    it('should handle database errors during delete', async () => {
      req.params = { id: 'mongo_123' };

      databaseAdapter.findByIdAndDelete.mockRejectedValue(new Error('Database error'));

      await adminController.deleteAdmin(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('loginAdmin', () => {
    it('should return 400 when email is missing', async () => {
      req.body = { password: 'testpass' };

      await adminController.loginAdmin(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Email and password are required');
    });

    it('should return 400 when password is missing', async () => {
      req.body = { email: 'admin@test.com' };

      await adminController.loginAdmin(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 401 when admin not found', async () => {
      req.body = { email: 'nonexistent@test.com', password: 'testpass' };

      databaseAdapter.findOne.mockResolvedValue(null);

      await adminController.loginAdmin(req, res);

      expect(res.statusCode).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Invalid credentials');
    });
  });

  describe('logoutAdmin', () => {
    it('should logout admin successfully', async () => {
      await adminController.logoutAdmin(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Admin logged out');
    });
  });

  describe('changePassword', () => {
    it('should return success for password change', async () => {
      req.body = { currentPassword: 'old', newPassword: 'new' };

      await adminController.changePassword(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Password changed');
    });
  });

  describe('ZeroDB Migration Specific Tests', () => {
    it('should work in zerodb-only mode', async () => {
      req.body = {
        UserID: 'ADMIN-001',
        Name: 'ZeroDB Admin',
        Email: 'zerodb@admin.com',
        UserRoles: ['admin'],
        NotificationSettings: { email: true }
      };

      const zerodbResult = {
        id: 'zero_123',
        ...req.body
      };

      databaseAdapter.create.mockResolvedValue(zerodbResult);

      await adminController.createAdmin(req, res);

      expect(res.statusCode).toBe(201);
    });

    it('should handle parallel mode consistency', async () => {
      req.params = { id: 'mongo_123' };

      const parallelResult = {
        _id: 'mongo_123',
        UserID: 'ADMIN-001',
        Name: 'Parallel Admin'
      };

      databaseAdapter.findById.mockResolvedValue(parallelResult);

      await adminController.getAdminById(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.UserID).toBe('ADMIN-001');
    });
  });
});

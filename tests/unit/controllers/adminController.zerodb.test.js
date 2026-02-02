/**
 * Admin Controller Tests
 *
 * Issue #20: Migrate remaining controllers to ZeroDB (Batch 2)
 */

const httpMocks = require('node-mocks-http');
const adminController = require('../../../controllers/adminController');
const databaseAdapter = require('../../../services/databaseAdapter');

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
      req.body = {
        UserID: 'ADMIN-001',
        Name: 'John Admin',
        Email: 'admin@company.com',
        UserRoles: ['admin'],
        NotificationSettings: { email: true }
      };

      databaseAdapter.create.mockResolvedValue({ _id: 'mongo_123', ...req.body });

      await adminController.createAdmin(req, res);

      expect(res.statusCode).toBe(201);
    });

    it('should return 400 when required fields are missing', async () => {
      req.body = { UserID: 'ADMIN-001' };

      await adminController.createAdmin(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('getAllAdmins', () => {
    it('should return all admins', async () => {
      databaseAdapter.find.mockResolvedValue([{ _id: 'mongo_1', UserID: 'ADMIN-001' }]);

      await adminController.getAllAdmins(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should return 404 when no admins exist', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      await adminController.getAllAdmins(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('getAdminById', () => {
    it('should return admin by ID', async () => {
      req.params = { id: 'mongo_123' };
      databaseAdapter.findById.mockResolvedValue({ _id: 'mongo_123', UserID: 'ADMIN-001' });

      await adminController.getAdminById(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should return 404 when admin not found', async () => {
      req.params = { id: 'nonexistent_id' };
      databaseAdapter.findById.mockResolvedValue(null);

      await adminController.getAdminById(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('updateAdmin', () => {
    it('should update an admin successfully', async () => {
      req.params = { id: 'mongo_123' };
      req.body = { Name: 'Updated Name' };
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ _id: 'mongo_123', Name: 'Updated Name' });

      await adminController.updateAdmin(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should return 404 when admin not found', async () => {
      req.params = { id: 'nonexistent_id' };
      req.body = { Name: 'Updated Name' };
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(null);

      await adminController.updateAdmin(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('deleteAdmin', () => {
    it('should delete an admin successfully', async () => {
      req.params = { id: 'mongo_123' };
      databaseAdapter.findByIdAndDelete.mockResolvedValue({ _id: 'mongo_123' });

      await adminController.deleteAdmin(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should return 404 when admin not found', async () => {
      req.params = { id: 'nonexistent_id' };
      databaseAdapter.findByIdAndDelete.mockResolvedValue(null);

      await adminController.deleteAdmin(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('loginAdmin', () => {
    it('should return 400 when email is missing', async () => {
      req.body = { password: 'testpass' };

      await adminController.loginAdmin(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 401 when admin not found', async () => {
      req.body = { email: 'test@test.com', password: 'testpass' };
      databaseAdapter.findOne.mockResolvedValue(null);

      await adminController.loginAdmin(req, res);

      expect(res.statusCode).toBe(401);
    });
  });

  describe('logoutAdmin', () => {
    it('should logout successfully', async () => {
      await adminController.logoutAdmin(req, res);

      expect(res.statusCode).toBe(200);
    });
  });
});

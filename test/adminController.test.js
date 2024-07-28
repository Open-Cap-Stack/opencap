const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const adminController = require('../controllers/adminController');
const Admin = require('../models/Admin');

// Mock the Admin model
jest.mock('../models/Admin');

const app = express();
app.use(express.json());

// Mock routes for testing
app.post('/admins', adminController.createAdmin);
app.get('/admins', adminController.getAdmins);
app.get('/admins/:id', adminController.getAdminById);
app.put('/admins/:id', adminController.updateAdminById);
app.delete('/admins/:id', adminController.deleteAdmin);

describe('Admin Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /admins', () => {
    it('should create a new admin', async () => {
      const adminData = {
        UserID: mongoose.Types.ObjectId().toString(),
        Name: 'John Doe',
        Email: 'john@example.com',
        UserRoles: ['admin'],
        NotificationSettings: { email: true, sms: false }
      };

      Admin.prototype.save.mockResolvedValue(adminData);

      const response = await request(app)
        .post('/admins')
        .send(adminData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(adminData);
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/admins')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: 'Invalid admin data' });
    });
  });

  describe('GET /admins', () => {
    it('should get all admins', async () => {
      const admins = [
        { _id: mongoose.Types.ObjectId().toString(), Name: 'Admin 1' },
        { _id: mongoose.Types.ObjectId().toString(), Name: 'Admin 2' }
      ];

      Admin.find.mockResolvedValue(admins);

      const response = await request(app).get('/admins');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(admins);
    });

    it('should return 404 if no admins are found', async () => {
      Admin.find.mockResolvedValue(null);

      const response = await request(app).get('/admins');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'No admins found' });
    });
  });

  describe('GET /admins/:id', () => {
    it('should get an admin by id', async () => {
      const admin = {
        _id: mongoose.Types.ObjectId().toString(),
        Name: 'Admin 1',
        Email: 'admin1@example.com',
        UserRoles: ['admin'],
        NotificationSettings: { email: true, sms: false }
      };

      Admin.findById.mockResolvedValue(admin);

      const response = await request(app).get(`/admins/${admin._id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(admin);
    });

    it('should return 404 if admin is not found', async () => {
      Admin.findById.mockResolvedValue(null);

      const response = await request(app).get(`/admins/${mongoose.Types.ObjectId()}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Admin not found' });
    });
  });

  describe('PUT /admins/:id', () => {
    it('should update an admin by id', async () => {
      const adminId = mongoose.Types.ObjectId().toString();
      const updatedAdmin = {
        _id: adminId,
        Name: 'Updated Admin',
        Email: 'updated@example.com',
        UserRoles: ['admin'],
        NotificationSettings: { email: true, sms: false }
      };

      Admin.findByIdAndUpdate.mockResolvedValue(updatedAdmin);

      const response = await request(app)
        .put(`/admins/${adminId}`)
        .send(updatedAdmin);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedAdmin);
    });

    it('should return 404 if admin to update is not found', async () => {
      Admin.findByIdAndUpdate.mockResolvedValue(null);

      const response = await request(app)
        .put(`/admins/${mongoose.Types.ObjectId()}`)
        .send({ Name: 'Updated Admin' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Admin not found' });
    });
  });

  describe('DELETE /admins/:id', () => {
    it('should delete an admin by id', async () => {
      const adminId = mongoose.Types.ObjectId().toString();
      Admin.findByIdAndDelete.mockResolvedValue({ _id: adminId });

      const response = await request(app).delete(`/admins/${adminId}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Admin deleted' });
    });

    it('should return 404 if admin to delete is not found', async () => {
      Admin.findByIdAndDelete.mockResolvedValue(null);

      const response = await request(app).delete(`/admins/${mongoose.Types.ObjectId()}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Admin not found' });
    });
  });
});
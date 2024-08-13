const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const adminController = require('../controllers/adminController');
const Admin = require('../models/admin');

// Mock the Admin model
jest.mock('../models/admin');

const app = express();
app.use(express.json());
app.use("/api/admins", require("../routes/adminRoutes"));

describe('Admin Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/admins', () => {
    it('should create a new admin', async () => {
      const adminData = {
        UserID: mongoose.Types.ObjectId().toString(),
        Name: 'John Doe',
        Email: 'john@example.com',
        UserRoles: ['admin'],
        NotificationSettings: { emailNotifications: true, smsNotifications: false }
      };

      Admin.prototype.save.mockResolvedValue(adminData);

      const response = await request(app)
        .post('/api/admins')
        .send(adminData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(adminData);
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/admins')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: 'Invalid admin data' });
    });
  });

  describe('GET /api/admins', () => {
    it('should get all admins', async () => {
      const admins = [
        { _id: mongoose.Types.ObjectId().toString(), Name: 'Admin 1' },
        { _id: mongoose.Types.ObjectId().toString(), Name: 'Admin 2' }
      ];

      Admin.find.mockResolvedValue(admins);

      const response = await request(app).get('/api/admins');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(admins);
    });

    it('should return 404 if no admins are found', async () => {
      Admin.find.mockResolvedValue([]);

      const response = await request(app).get('/api/admins');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'No admins found' });
    });
  });

  describe('GET /api/admins/:id', () => {
    it('should get an admin by id', async () => {
      const admin = {
        _id: mongoose.Types.ObjectId().toString(),
        Name: 'Admin 1',
        Email: 'admin1@example.com',
        UserRoles: ['admin'],
        NotificationSettings: { emailNotifications: true, smsNotifications: false }
      };

      Admin.findById.mockResolvedValue(admin);

      const response = await request(app).get(`/api/admins/${admin._id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(admin);
    });

    it('should return 404 if admin is not found', async () => {
      Admin.findById.mockResolvedValue(null);

      const response = await request(app).get(`/api/admins/${mongoose.Types.ObjectId()}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Admin not found' });
    });
  });

  describe('PUT /api/admins/:id', () => {
    it('should update an admin by id', async () => {
      const adminId = mongoose.Types.ObjectId().toString();
      const updatedAdmin = {
        _id: adminId,
        Name: 'Updated Admin',
        Email: 'updated@example.com',
        UserRoles: ['admin'],
        NotificationSettings: { emailNotifications: true, smsNotifications: false }
      };

      Admin.findByIdAndUpdate.mockResolvedValue(updatedAdmin);

      const response = await request(app)
        .put(`/api/admins/${adminId}`)
        .send(updatedAdmin);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedAdmin);
    });

    it('should return 404 if admin to update is not found', async () => {
      Admin.findByIdAndUpdate.mockResolvedValue(null);

      const response = await request(app)
        .put(`/api/admins/${mongoose.Types.ObjectId()}`)
        .send({ Name: 'Updated Admin' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Admin not found' });
    });
  });

  describe('DELETE /api/admins/:id', () => {
    it('should delete an admin by id', async () => {
      const adminId = mongoose.Types.ObjectId().toString();
      Admin.findByIdAndDelete.mockResolvedValue({ _id: adminId });

      const response = await request(app).delete(`/api/admins/${adminId}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Admin deleted' });
    });

    it('should return 404 if admin to delete is not found', async () => {
      Admin.findByIdAndDelete.mockResolvedValue(null);

      const response = await request(app).delete(`/api/admins/${mongoose.Types.ObjectId()}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Admin not found' });
    });
  });
});

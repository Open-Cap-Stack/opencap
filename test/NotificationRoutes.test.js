const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../db'); // Correctly import the functions
const Notification = require('../models/Notification');
const notificationRoutes = require('../routes/NotificationRoutes');

const app = express();
app.use(express.json());
app.use('/api/notifications', notificationRoutes);

beforeAll(async () => {
  await connectDB(); // Ensure the database is connected before tests
});

afterAll(async () => {
  if (mongoose.connection && mongoose.connection.db) {
    try {
      await mongoose.connection.db.dropDatabase(); // Safely drop the database after tests
      console.log('Test database dropped');
    } catch (err) {
      console.error('Error dropping test database:', err.message);
    }
  }
  await disconnectDB(); // Disconnect from the database after all tests are complete
});

beforeEach(async () => {
  await Notification.deleteMany({});
});

describe('Notification API Test', () => {
  it('should create a new notification', async () => {
    const res = await request(app)
      .post('/api/notifications')
      .send({
        title: 'Test Notification',
        message: 'This is a test notification',
        recipient: 'user@example.com',
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('title', 'Test Notification');
    expect(res.body).toHaveProperty('message', 'This is a test notification');
    expect(res.body).toHaveProperty('recipient', 'user@example.com');
    expect(res.body).toHaveProperty('_id');
  }, 10000);

  it('should get all notifications', async () => {
    await new Notification({
      title: 'Test Notification',
      message: 'This is a test notification',
      recipient: 'user@example.com',
    }).save();

    const res = await request(app).get('/api/notifications');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('notifications');
    expect(res.body.notifications).toBeInstanceOf(Array);
    expect(res.body.notifications.length).toBe(1);
    expect(res.body.notifications[0]).toHaveProperty('title', 'Test Notification');
  }, 10000);

  it('should get a notification by ID', async () => {
    const notification = new Notification({
      title: 'Test Notification',
      message: 'This is a test notification',
      recipient: 'user@example.com',
    });
    await notification.save();

    const res = await request(app).get(`/api/notifications/${notification._id}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('notification');
    expect(res.body.notification).toHaveProperty('_id', notification._id.toString());
    expect(res.body.notification).toHaveProperty('title', 'Test Notification');
  }, 10000);

  it('should delete a notification by ID', async () => {
    const notification = new Notification({
      title: 'Test Notification',
      message: 'This is a test notification',
      recipient: 'user@example.com',
    });
    await notification.save();

    const res = await request(app).delete(`/api/notifications/${notification._id}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', 'Notification deleted');
  }, 10000);
});

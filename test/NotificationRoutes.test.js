const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const connectDB = require('../db');

const app = express();
app.use(express.json());
app.use('/api/notifications', require('../routes/notificationRoutes'));

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
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

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../db');
const Notification = require('../models/Notification');
const notificationRoutes = require('../routes/Notification');

const app = express();
app.use(express.json());
app.use('/api/notifications', notificationRoutes);

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  if (mongoose.connection && mongoose.connection.db) {
    try {
      await mongoose.connection.db.dropDatabase();
      console.log('Test database dropped');
    } catch (err) {
      console.error('Error dropping test database:', err.message);
    }
  }
  await disconnectDB();
});

beforeEach(async () => {
  await Notification.deleteMany({});
});

describe('Notification API Test', () => {
  it('should create a new notification', async () => {
    const res = await request(app)
      .post('/api/notifications')
      .send({
        notificationId: 'unique-notification-id',
        notificationType: 'system',
        title: 'Test Notification',
        message: 'This is a test notification',
        recipient: 'user@example.com',
        Timestamp: new Date(),
        UserInvolved: mongoose.Types.ObjectId().toString(),
        RelatedObjects: 'Related Object ID'
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('notificationId', 'unique-notification-id');
    expect(res.body).toHaveProperty('notificationType', 'system');
    expect(res.body).toHaveProperty('title', 'Test Notification');
    expect(res.body).toHaveProperty('message', 'This is a test notification');
    expect(res.body).toHaveProperty('recipient', 'user@example.com');
    expect(res.body).toHaveProperty('Timestamp');
    expect(res.body).toHaveProperty('UserInvolved');
    expect(res.body).toHaveProperty('RelatedObjects', 'Related Object ID');
    expect(res.body).toHaveProperty('_id');
  });

  it('should get all notifications', async () => {
    await new Notification({
      notificationId: 'unique-notification-id',
      notificationType: 'system',
      title: 'Test Notification',
      message: 'This is a test notification',
      recipient: 'user@example.com',
      Timestamp: new Date(),
      UserInvolved: mongoose.Types.ObjectId().toString(),
      RelatedObjects: 'Related Object ID'
    }).save();

    const res = await request(app).get('/api/notifications');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('notifications');
    expect(res.body.notifications).toBeInstanceOf(Array);
    expect(res.body.notifications.length).toBe(1);
    expect(res.body.notifications[0]).toHaveProperty('notificationId', 'unique-notification-id');
  });

  it('should get a notification by ID', async () => {
    const notification = new Notification({
      notificationId: 'unique-notification-id',
      notificationType: 'system',
      title: 'Test Notification',
      message: 'This is a test notification',
      recipient: 'user@example.com',
      Timestamp: new Date(),
      UserInvolved: mongoose.Types.ObjectId().toString(),
      RelatedObjects: 'Related Object ID'
    });
    await notification.save();

    const res = await request(app).get(`/api/notifications/${notification._id}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('notification');
    expect(res.body.notification).toHaveProperty('_id', notification._id.toString());
    expect(res.body.notification).toHaveProperty('notificationId', 'unique-notification-id');
  });

  it('should delete a notification by ID', async () => {
    const notification = new Notification({
      notificationId: 'unique-notification-id',
      notificationType: 'system',
      title: 'Test Notification',
      message: 'This is a test notification',
      recipient: 'user@example.com',
      Timestamp: new Date(),
      UserInvolved: mongoose.Types.ObjectId().toString(),
      RelatedObjects: 'Related Object ID'
    });
    await notification.save();

    const res = await request(app).delete(`/api/notifications/${notification._id}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', 'Notification deleted');
  });
});

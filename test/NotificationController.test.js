const mongoose = require('mongoose');
const sinon = require('sinon');
const { expect } = require('@jest/globals');
const Notification = require('../models/Notification');
const notificationController = require('../controllers/Notification');

describe('Notification Controller', function () {
  beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await mongoose.connection.dropDatabase();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await Notification.deleteMany({});
  });

  it('should create a new notification', async function () {
    const req = {
      body: {
        title: 'Test Notification',
        message: 'This is a test notification',
        recipient: 'user@example.com',
      },
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await notificationController.createNotification(req, res);

    expect(res.status.calledWith(201)).toBe(true);
    expect(res.json.calledWith(sinon.match({
      title: 'Test Notification',
      message: 'This is a test notification',
      recipient: 'user@example.com',
    }))).toBe(true);
  });

  it('should get all notifications', async function () {
    const notificationData = {
      title: 'Test Notification',
      message: 'This is a test notification',
      recipient: 'user@example.com',
    };
    await new Notification(notificationData).save();

    const req = {};
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await notificationController.getNotifications(req, res);

    console.log('Actual res.json call:', JSON.stringify(res.json.args, null, 2)); // Debug log

    expect(res.status.calledWith(200)).toBe(true);
    expect(res.json.args[0][0]).toHaveProperty('notifications'); // Simplified check
    expect(res.json.args[0][0].notifications).toBeInstanceOf(Array);
    expect(res.json.args[0][0].notifications[0]).toHaveProperty('title', 'Test Notification');
  });

  it('should get a notification by ID', async function () {
    const notification = new Notification({
      title: 'Test Notification',
      message: 'This is a test notification',
      recipient: 'user@example.com',
    });
    await notification.save();

    const req = {
      params: {
        id: notification._id.toString(),
      },
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await notificationController.getNotificationById(req, res);

    expect(res.status.calledWith(200)).toBe(true);
    expect(res.json.calledWith(sinon.match({
      notification: sinon.match.has('title', 'Test Notification'),
    }))).toBe(true);
  });

  it('should delete a notification by ID', async function () {
    const notification = new Notification({
      title: 'Test Notification',
      message: 'This is a test notification',
      recipient: 'user@example.com',
    });
    await notification.save();

    const req = {
      params: {
        id: notification._id.toString(),
      },
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await notificationController.deleteNotification(req, res);

    expect(res.status.calledWith(200)).toBe(true);
    expect(res.json.calledWith(sinon.match({
      message: 'Notification deleted',
    }))).toBe(true);
  });
});

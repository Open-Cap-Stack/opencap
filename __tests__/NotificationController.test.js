const mongoose = require('mongoose');
const sinon = require('sinon');
const { expect } = require('@jest/globals');
const Notification = require('../models/Notification');
const notificationController = require('../controllers/Notification');

describe('Notification Controller', function () {
  beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/test');
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
        notificationId: 'test-notification-id',
        notificationType: 'system',
        title: 'Test Notification',
        message: 'This is a test notification',
        recipient: 'user@example.com',
        Timestamp: new Date().toISOString(),
        UserInvolved: mongoose.Types.ObjectId(), // Valid ObjectId
        RelatedObjects: 'Related Object ID',
      },
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await notificationController.createNotification(req, res);

    const responseData = res.json.args[0][0];

    expect(res.status.calledWith(201)).toBe(true);
    expect(responseData.notificationId).toBe(req.body.notificationId);
    expect(responseData.notificationType).toBe(req.body.notificationType);
    expect(responseData.title).toBe(req.body.title);
    expect(responseData.message).toBe(req.body.message);
    expect(responseData.recipient).toBe(req.body.recipient);
    expect(new Date(responseData.Timestamp).toISOString()).toBe(req.body.Timestamp);
    expect(responseData.UserInvolved.toString()).toBe(req.body.UserInvolved.toString()); // Convert both to strings
    expect(responseData.RelatedObjects).toBe(req.body.RelatedObjects);
  });

  it('should get all notifications', async function () {
    const notificationData = {
      notificationId: 'test-notification-id',
      notificationType: 'system',
      title: 'Test Notification',
      message: 'This is a test notification',
      recipient: 'user@example.com',
      Timestamp: new Date().toISOString(),
      UserInvolved: mongoose.Types.ObjectId(), // Valid ObjectId
      RelatedObjects: 'Related Object ID',
    };
    await new Notification(notificationData).save();

    const req = {};
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await notificationController.getNotifications(req, res);

    const responseData = res.json.args[0][0];
    const notification = responseData.notifications[0];

    expect(res.status.calledWith(200)).toBe(true);
    expect(responseData.notifications).toBeInstanceOf(Array);
    expect(notification.title).toBe(notificationData.title);
    expect(notification.notificationId).toBe(notificationData.notificationId);
  });

  it('should get a notification by ID', async function () {
    const notification = new Notification({
      notificationId: 'test-notification-id',
      notificationType: 'system',
      title: 'Test Notification',
      message: 'This is a test notification',
      recipient: 'user@example.com',
      Timestamp: new Date().toISOString(),
      UserInvolved: mongoose.Types.ObjectId(), // Valid ObjectId
      RelatedObjects: 'Related Object ID',
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

    const responseData = res.json.args[0][0];

    expect(res.status.calledWith(200)).toBe(true);
    expect(responseData.notification.title).toBe(notification.title);
  });

  it('should delete a notification by ID', async function () {
    const notification = new Notification({
      notificationId: 'test-notification-id',
      notificationType: 'system',
      title: 'Test Notification',
      message: 'This is a test notification',
      recipient: 'user@example.com',
      Timestamp: new Date().toISOString(),
      UserInvolved: mongoose.Types.ObjectId(), // Valid ObjectId
      RelatedObjects: 'Related Object ID',
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

    const responseData = res.json.args[0][0];

    expect(res.status.calledWith(200)).toBe(true);
    expect(responseData.message).toBe('Notification deleted');
  });
});

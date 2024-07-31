const mongoose = require('mongoose');
const chai = require('chai');
const sinon = require('sinon');
const expect = chai.expect;
const Notification = require('../models/Notification');
const notificationController = require('../controllers/notificationController');

describe('Notification Controller', function () {
  before(async function () {
    await mongoose.connect('mongodb://localhost:27017/test', { useNewUrlParser: true, useUnifiedTopology: true });
    await mongoose.connection.dropDatabase();
  });

  after(async function () {
    await mongoose.disconnect();
  });

  beforeEach(async function () {
    await Notification.deleteMany({});
  });

  it('should create a new notification', async function () {
    const req = {
      body: {
        title: 'Test Notification',
        message: 'This is a test notification',
        recipient: 'user@example.com',
      }
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await notificationController.createNotification(req, res);

    expect(res.status.calledWith(201)).to.be.true;
    expect(res.json.calledWith(sinon.match({
      title: 'Test Notification',
      message: 'This is a test notification',
      recipient: 'user@example.com',
    }))).to.be.true;
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

    expect(res.status.calledWith(200)).to.be.true;
    expect(res.json.calledWith(sinon.match({
      notifications: sinon.match.array.deepEquals([sinon.match.has('title', 'Test Notification')])
    }))).to.be.true;
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
      }
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await notificationController.getNotificationById(req, res);

    expect(res.status.calledWith(200)).to.be.true;
    expect(res.json.calledWith(sinon.match({
      notification: sinon.match.has('title', 'Test Notification')
    }))).to.be.true;
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
      }
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await notificationController.deleteNotification(req, res);

    expect(res.status.calledWith(200)).to.be.true;
    expect(res.json.calledWith(sinon.match({
      message: 'Notification deleted'
    }))).to.be.true;
  });
});

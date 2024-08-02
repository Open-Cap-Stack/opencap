const mongoose = require('mongoose');
const chai = require('chai');
const expect = chai.expect;
const Notification = require('../models/Notification');

before(async function () {
  await mongoose.connect('mongodb://localhost:27017/test', { useNewUrlParser: true, useUnifiedTopology: true });
  await mongoose.connection.dropDatabase();
});

after(async function () {
  await mongoose.disconnect();
});

describe('Notification Model', function () {
  it('should create a notification with valid fields', async function () {
    const notificationData = {
      title: 'Test Notification',
      message: 'This is a test notification',
      recipient: 'user@example.com',
    };

    const notification = new Notification(notificationData);
    const savedNotification = await notification.save();

    expect(savedNotification.title).to.equal(notificationData.title);
    expect(savedNotification.message).to.equal(notificationData.message);
    expect(savedNotification.recipient).to.equal(notificationData.recipient);
  });

  it('should not create a notification without required fields', async function () {
    const notificationData = {
      message: 'This is a test notification',
    };

    const notification = new Notification(notificationData);

    try {
      await notification.save();
    } catch (error) {
      expect(error).to.exist;
      expect(error.errors.title).to.exist;
      expect(error.errors.recipient).to.exist;
    }
  });

  it('should not create a notification with invalid field values', async function () {
    const notificationData = {
      title: 'Test Notification',
      message: 'This is a test notification',
      recipient: 'invalidEmail',
    };

    const notification = new Notification(notificationData);

    try {
      await notification.save();
    } catch (error) {
      expect(error).to.exist;
      expect(error.errors.recipient).to.exist;
    }
  });
});

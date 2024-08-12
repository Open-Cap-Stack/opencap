const mongoose = require('mongoose');
const { expect } = require('@jest/globals');
const Notification = require('../models/Notification');

beforeAll(async () => {
  await mongoose.connect('mongodb://localhost:27017/test', { useNewUrlParser: true, useUnifiedTopology: true });
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('Notification Model', () => {
  it('should create a notification with valid fields', async () => {
    const notificationData = {
      title: 'Test Notification',
      message: 'This is a test notification',
      recipient: 'user@example.com',
    };

    const notification = new Notification(notificationData);
    const savedNotification = await notification.save();

    expect(savedNotification.title).toEqual(notificationData.title);
    expect(savedNotification.message).toEqual(notificationData.message);
    expect(savedNotification.recipient).toEqual(notificationData.recipient);
  });

  it('should not create a notification without required fields', async () => {
    const notificationData = {
      message: 'This is a test notification',
    };

    const notification = new Notification(notificationData);

    try {
      await notification.save();
    } catch (error) {
      expect(error).toBeTruthy();
      expect(error.errors.title).toBeTruthy();
      expect(error.errors.recipient).toBeTruthy();
    }
  });

  it('should not create a notification with invalid field values', async () => {
    const notificationData = {
      title: 'Test Notification',
      message: 'This is a test notification',
      recipient: 'invalidEmail',
    };

    const notification = new Notification(notificationData);

    try {
      await notification.save();
    } catch (error) {
      expect(error).toBeTruthy();
      expect(error.errors.recipient).toBeTruthy();
    }
  });
});

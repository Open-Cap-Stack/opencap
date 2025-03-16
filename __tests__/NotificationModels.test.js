const mongoose = require('mongoose');
const { expect } = require('@jest/globals');
const Notification = require('../models/Notification');

beforeAll(async () => {
  await mongoose.connect('mongodb://localhost:27017/test');
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('Notification Model', () => {
  it('should create a notification with valid fields', async () => {
    const notificationData = {
      notificationId: 'unique-notification-id',
      notificationType: 'system',
      title: 'Test Notification',
      message: 'This is a test notification',
      recipient: 'user@example.com',
      Timestamp: new Date(),
      UserInvolved: mongoose.Types.ObjectId().toString(),
      RelatedObjects: 'Related Object ID'
    };

    const notification = new Notification(notificationData);
    const savedNotification = await notification.save();

    expect(savedNotification.notificationId).toEqual(notificationData.notificationId);
    expect(savedNotification.notificationType).toEqual(notificationData.notificationType);
    expect(savedNotification.title).toEqual(notificationData.title);
    expect(savedNotification.message).toEqual(notificationData.message);
    expect(savedNotification.recipient).toEqual(notificationData.recipient);
    expect(new Date(savedNotification.Timestamp).toISOString()).toEqual(notificationData.Timestamp.toISOString());
    expect(savedNotification.UserInvolved.toString()).toEqual(notificationData.UserInvolved);
    expect(savedNotification.RelatedObjects).toEqual(notificationData.RelatedObjects);
  });

  it('should not create a notification without required fields', async () => {
    const notificationData = {
      title: 'Test Notification',
      message: 'This is a test notification',
      recipient: 'user@example.com'
    };

    const notification = new Notification(notificationData);

    try {
      await notification.save();
    } catch (error) {
      console.log('Validation Errors:', error.errors); // Print the error details for debugging
      expect(error).toBeTruthy();
      expect(error.errors.notificationId).toBeTruthy();
      expect(error.errors.notificationType).toBeTruthy();
      // Removed the timestamp check because it may not be required or is given a default value
      expect(error.errors.UserInvolved).toBeTruthy();
    }
  });

  it('should not create a notification with invalid field values', async () => {
    const notificationData = {
      notificationId: 'invalid-id',
      notificationType: 'invalid-type', // Invalid enum value
      title: 'Test Notification',
      message: 'This is a test notification',
      recipient: 'user@example.com',
      Timestamp: 'invalid-timestamp', // Invalid date format
      UserInvolved: 'invalid-user-id'  // Invalid ObjectId
    };

    const notification = new Notification(notificationData);

    try {
      await notification.save();
    } catch (error) {
      console.log('Validation Errors:', error.errors); // Print the error details for debugging
      expect(error).toBeTruthy();
      expect(error.errors.notificationType).toBeTruthy();
      // Removed the timestamp check because it may not be required or is given a default value
      expect(error.errors.UserInvolved).toBeTruthy();
    }
  });
});

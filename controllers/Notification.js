/**
 * Notification Controller
 * Issue #20: Migrate to ZeroDB via DatabaseAdapter
 */
const databaseAdapter = require('../services/databaseAdapter');

// Create a new notification
exports.createNotification = async (req, res) => {
  try {
    const { notificationId, notificationType, title, message, recipient, Timestamp, RelatedObjects, UserInvolved } = req.body;

    if (!notificationId || !notificationType || !title || !message || !recipient || !Timestamp || !UserInvolved) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const notificationData = {
      notificationId,
      notificationType,
      title,
      message,
      recipient,
      Timestamp,
      RelatedObjects,
      UserInvolved,
    };

    const savedNotification = await databaseAdapter.create('Notification', notificationData);
    res.status(201).json(savedNotification);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create notification', error: error.message });
  }
};

// Get all notifications
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await databaseAdapter.find('Notification', {});
    res.status(200).json({ notifications });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve notifications', error: error.message });
  }
};

// Get a notification by ID
exports.getNotificationById = async (req, res) => {
  try {
    const notification = await databaseAdapter.findById('Notification', req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.status(200).json({ notification });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve notification', error: error.message });
  }
};

// Delete a notification by ID
exports.deleteNotification = async (req, res) => {
  try {
    const deletedNotification = await databaseAdapter.findByIdAndDelete('Notification', req.params.id);
    if (!deletedNotification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.status(200).json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete notification', error: error.message });
  }
};

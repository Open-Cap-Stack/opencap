const express = require('express');
const Notification = require('../models/Notification');
const router = express.Router();

// POST /api/notifications - Create a new notification
router.post('/', async (req, res) => {
  try {
    const { notificationId, notificationType, title, message, recipient, Timestamp, RelatedObjects, UserInvolved } = req.body;

    if (!notificationId || !notificationType || !title || !message || !recipient || !Timestamp || !UserInvolved) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newNotification = new Notification({
      notificationId,
      notificationType,
      title,
      message,
      recipient,
      Timestamp,
      RelatedObjects,
      UserInvolved,
    });

    const savedNotification = await newNotification.save();
    res.status(201).json(savedNotification);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create notification', error: error.message });
  }
});

// GET /api/notifications - Get all notifications
router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find();

    if (!notifications.length) {
      return res.status(404).json({ message: 'No notifications found' });
    }

    res.status(200).json({ notifications });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve notifications', error: error.message });
  }
});

// GET /api/notifications/:id - Get a notification by ID
router.get('/:id', async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json({ notification });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve notification', error: error.message });
  }
});

// DELETE /api/notifications/:id - Delete a notification by ID
router.delete('/:id', async (req, res) => {
  try {
    const deletedNotification = await Notification.findByIdAndDelete(req.params.id);

    if (!deletedNotification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete notification', error: error.message });
  }
});

module.exports = router;

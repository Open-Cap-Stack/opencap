const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  notificationId: {
    type: String,
    required: true,
    unique: true,
  },
  notificationType: {
    type: String,
    enum: ['system', 'user-generated'],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  recipient: {
    type: String,
    required: true,
  },
  Timestamp: {
    type: Date,
    required: true,
    default: Date.now,
  },
  RelatedObjects: {
    type: String,
  },
  UserInvolved: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
});

module.exports = mongoose.model('Notification', NotificationSchema);

const mongoose = require('mongoose');

const notificationSettingsSchema = new mongoose.Schema({
  emailNotifications: {
    type: Boolean,
    default: true,
  },
  smsNotifications: {
    type: Boolean,
    default: false,
  },
  pushNotifications: {
    type: Boolean,
    default: true,
  },
  notificationFrequency: {
    type: String,
    enum: ['Immediate', 'Daily', 'Weekly'],
    default: 'Immediate',
  },
});

const adminSchema = new mongoose.Schema({
  UserID: {
    type: String,
    required: true,
    unique: true,
  },
  Name: {
    type: String,
    required: true,
  },
  Email: {
    type: String,
    required: true,
    unique: true,
  },
  UserRoles: [String],
  NotificationSettings: {
    type: notificationSettingsSchema,
    default: () => ({}),
  },
});

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;

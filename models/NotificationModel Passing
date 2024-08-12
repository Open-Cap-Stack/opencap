const mongoose = require('mongoose');
const { Schema } = mongoose;

const notificationSchema = new Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
  },
  recipient: {
    type: String,
    required: [true, 'Recipient is required'],
    validate: {
      validator: function(v) {
        // Basic email validation
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: props => `${props.value} is not a valid email address!`
    }
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt fields
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;

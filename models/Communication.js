const mongoose = require('mongoose');

const communicationSchema = new mongoose.Schema({
  communicationId: {
    type: String,
    required: true,
    unique: true,
  },
  MessageType: {
    type: String,
    required: true,
    enum: ['email', 'SMS', 'chat'], // Example enum values
  },
  Sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  Recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  Timestamp: {
    type: Date,
    required: true,
  },
  Content: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('Communication', communicationSchema);

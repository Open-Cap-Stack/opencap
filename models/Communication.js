const mongoose = require('mongoose');

const MESSAGE_TYPES = ['email', 'SMS', 'notification'];

const CommunicationSchema = new mongoose.Schema({
  communicationId: {
    type: String,
    required: [true, 'communicationId is required'],
    unique: true,
    trim: true
  },
  MessageType: {
    type: String,
    required: [true, 'MessageType is required'],
    enum: {
      values: MESSAGE_TYPES,
      message: `MessageType must be one of: ${MESSAGE_TYPES.join(', ')}`
    }
  },
  Sender: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Sender is required'],
    ref: 'User'
  },
  Recipient: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Recipient is required'],
    ref: 'User'
  },
  Timestamp: {
    type: Date,
    required: [true, 'Timestamp is required'],
  },
  Content: {
    type: String,
    required: [true, 'Content is required'],
    trim: true,
    maxlength: [5000, 'Content cannot exceed 5000 characters']
  },
  threadId: {
    type: String,
    trim: true,
    index: true,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for performance
CommunicationSchema.index({ communicationId: 1 }, { unique: true });
CommunicationSchema.index({ Sender: 1, Timestamp: -1 });
CommunicationSchema.index({ Recipient: 1, Timestamp: -1 });
CommunicationSchema.index({ threadId: 1, Timestamp: 1 }); // Index for thread-based sorting

const Communication = mongoose.model('Communication', CommunicationSchema);

module.exports = Communication;
module.exports.MESSAGE_TYPES = MESSAGE_TYPES;
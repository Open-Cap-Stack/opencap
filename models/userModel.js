const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  userId: {
    type: String,
    unique: true,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: { 
    type: String,
    required: false,
  },
  UserRoles: {
    type: [String],
    enum: ['Admin', 'Editor', 'Viewer'],
    required: true,
  },
  Permissions: {
    type: String,
    required: true,
  },
  AuditLogs: {
    type: [String],
    default: [],
  },
  AuthenticationMethods: {
    type: String,
    enum: ['OAuth', 'UsernamePassword'],
    default: 'UsernamePassword',
  },
}, {
  timestamps: true,
});


module.exports = mongoose.model('userModel', userSchema);

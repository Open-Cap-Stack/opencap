const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  activityId: { type: String, required: true, unique: true },
  activityType: {
    type: String,
    enum: ['DocumentUpload', 'StakeholderUpdate'],
    required: true,
  },
  timestamp: { type: Date, required: true },
  userInvolved: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  changesMade: { type: String },
  relatedObjects: [{ type: String }],
});

const Activity = mongoose.model('Activity', activitySchema);
module.exports = Activity;

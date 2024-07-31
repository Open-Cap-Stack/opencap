const mongoose = require("mongoose");

const inviteSchema = new mongoose.Schema({
  InviteID: {
    type: String,
    required: true,
    unique: true,
  },
  ReceiverID: String,
  Status: {
    type: String,
    enum: ["Pending", "Accepted", "Declined"],
    default: "Pending",
  },
  Timestamp: {
    type: Date,
    default: Date.now,
  },
});

const InviteManagement = mongoose.model("InviteManagement", inviteSchema);

module.exports = InviteManagement;

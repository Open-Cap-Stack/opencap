const Invite = require("../models/invitemanagement");

// Controller function to create a new invite
async function createInvite(req, res, next) {
  try {
    const { InviteID, ReceiverID, Status, Timestamp } = req.body;
    const invite = new Invite({ InviteID, ReceiverID, Status, Timestamp });
    const newInvite = await invite.save();
    res.status(201).json(newInvite);
  } catch (error) {
    next(error);
  }
}

// Controller function to get all invites
async function getAllInvites(req, res, next) {
  try {
    const invites = await Invite.find();
    res.status(200).json(invites);
  } catch (error) {
    next(error);
  }
}

// Controller function to get an invite by ID
async function getInviteById(req, res, next) {
  try {
    const invite = await Invite.findById(req.params.id);
    if (!invite) {
      return res.status(404).json({ message: "Invite not found" });
    }
    res.status(200).json(invite);
  } catch (error) {
    next(error);
  }
}

// Controller function to update an invite
async function updateInvite(req, res, next) {
  try {
    const { Status } = req.body;
    const invite = await Invite.findByIdAndUpdate(
      req.params.id,
      { Status },
      { new: true }
    );
    if (!invite) {
      return res.status(404).json({ message: "Invite not found" });
    }
    res.status(200).json(invite);
  } catch (error) {
    next(error);
  }
}

// Controller function to delete an invite
async function deleteInvite(req, res, next) {
  try {
    const invite = await Invite.findByIdAndDelete(req.params.id);
    if (!invite) {
      return res.status(404).json({ message: "Invite not found" });
    }
    res.status(204).json();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createInvite,
  getAllInvites,
  getInviteById,
  updateInvite,
  deleteInvite,
};

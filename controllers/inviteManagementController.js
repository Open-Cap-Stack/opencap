// inviteManagementController.js
const Invite = require('../models/inviteManagementModel');

exports.createInvite = async (req, res) => {
  try {
    const newInvite = new Invite(req.body);
    const savedInvite = await newInvite.save();
    res.status(201).json(savedInvite); // Ensure this returns an object
  } catch (error) {
    console.error('Error creating invite:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};



exports.getAllInvites = async (req, res) => {
  try {
    const invites = await Invite.find();
    res.status(200).json(invites);
  } catch (error) {
    console.error('Error fetching invites:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.getInviteById = async (req, res) => {
  try {
    const invite = await Invite.findById(req.params.id);
    if (!invite) {
      return res.status(404).json({ message: 'Invite not found' });
    }
    res.status(200).json(invite);
  } catch (error) {
    console.error('Error fetching invite by ID:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.updateInvite = async (req, res) => {
  try {
    const updatedInvite = await Invite.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedInvite) {
      return res.status(404).json({ message: 'Invite not found' });
    }
    res.status(200).json(updatedInvite);
  } catch (error) {
    console.error('Error updating invite:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.deleteInvite = async (req, res) => {
  try {
    const result = await Invite.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ message: 'Invite not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting invite:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

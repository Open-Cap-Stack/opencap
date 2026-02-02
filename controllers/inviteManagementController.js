/**
 * Invite Management Controller - ZeroDB Migration
 * Issue #20 - Batch 3 Controllers
 * Uses DatabaseAdapter for database-agnostic operations
 */

const databaseAdapter = require('../services/databaseAdapter');

const MODEL_NAME = 'Invite';

exports.createInvite = async (req, res) => {
  try {
    const savedInvite = await databaseAdapter.create(MODEL_NAME, req.body);
    res.status(201).json(savedInvite);
  } catch (error) {
    console.error('Error creating invite:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.getAllInvites = async (req, res) => {
  try {
    const invites = await databaseAdapter.find(MODEL_NAME, {});
    res.status(200).json(invites);
  } catch (error) {
    console.error('Error fetching invites:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.getInviteById = async (req, res) => {
  try {
    const invite = await databaseAdapter.findById(MODEL_NAME, req.params.id);
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
    const updatedInvite = await databaseAdapter.findByIdAndUpdate(MODEL_NAME, req.params.id, req.body, { new: true });
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
    const result = await databaseAdapter.findByIdAndDelete(MODEL_NAME, req.params.id);
    if (!result) {
      return res.status(404).json({ message: 'Invite not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting invite:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

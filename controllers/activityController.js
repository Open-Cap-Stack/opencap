const mongoose = require('mongoose');
const Activity = require('../models/Activity'); // Update if necessary

// Create a new activity
exports.createActivity = async (req, res) => {
  const { name, description, date, type, status, createdBy, participants } = req.body;

  if (!name || !description || !date || !type || !status || !createdBy) {
    return res.status(400).json({ message: 'Invalid activity data' });
  }

  const newActivity = new Activity({
    name,
    description,
    date: new Date(date),
    type,
    status,
    createdBy: mongoose.Types.ObjectId(createdBy),
    participants: participants.map(participant => mongoose.Types.ObjectId(participant)),
  });

  try {
    const createdActivity = await newActivity.save();
    return res.status(201).json(createdActivity);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Retrieve all activities
exports.getActivities = async (req, res) => {
  try {
    const activities = await Activity.find().populate('participants');
    if (!activities.length) {
      return res.status(404).json({ message: 'No activities found' });
    }
    res.status(200).json(activities);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Retrieve an activity by ID
exports.getActivityById = async (req, res) => {
  try {
    const activityId = req.params.id;
    const activity = await Activity.findById(activityId).populate('participants');

    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    return res.status(200).json(activity);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Update an activity by ID
exports.updateActivityById = async (req, res) => {
  const { id } = req.params;

  try {
    const updatedActivity = await Activity.findByIdAndUpdate(id, req.body, { new: true });

    if (!updatedActivity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    return res.status(200).json(updatedActivity);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Delete an activity by ID
exports.deleteActivity = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedActivity = await Activity.findByIdAndDelete(id);

    if (!deletedActivity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    return res.status(200).json({ message: 'Activity deleted' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

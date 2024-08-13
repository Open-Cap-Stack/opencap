const mongoose = require('mongoose');
const Activity = require("../models/Activity");

exports.createActivity = async (req, res) => {
  const { name, description, date, type, status, createdBy, participants } = req.body;

  // Improved validation
  if (!name || !description || !date || !type || !status || !createdBy) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const newActivity = new Activity({
    name,
    description,
    date: new Date(date),
    type,
    status,
    createdBy: new mongoose.Types.ObjectId(createdBy),
    participants: participants.map(
      (participant) => new mongoose.Types.ObjectId(participant)
    ),
  });

  try {
    const createdActivity = await newActivity.save();
    return res.status(201).json(createdActivity);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.getActivities = async (req, res) => {
  try {
    const activities = await Activity.find().populate("participants");
    // If no activities are found, still return 200 with an empty array
    res.status(200).json(activities);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getActivityById = async (req, res) => {
  try {
    const activityId = req.params.id;
    const activity = await Activity.findById(activityId).populate("participants");

    if (!activity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    return res.status(200).json(activity);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.updateActivityById = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "Invalid activity ID" });
  }

  try {
    const updatedActivity = await Activity.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!updatedActivity) {
      return res.status(404).json({ error: "Activity not found" });
    }

    return res.status(200).json(updatedActivity);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.deleteActivity = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "Invalid activity ID" });
  }

  try {
    const deletedActivity = await Activity.findByIdAndDelete(id);

    if (!deletedActivity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    return res.status(200).json({ message: "Activity deleted" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

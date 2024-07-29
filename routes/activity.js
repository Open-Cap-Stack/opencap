const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity'); // Ensure you have an Activity model

// Get all activities
router.get('/activities', async (req, res) => {
  try {
    const activities = await Activity.find();
    res.status(200).json(activities);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new activity
router.post('/activities', async (req, res) => {
  const activity = new Activity({
    activityId: req.body.activityId,
    name: req.body.name,
    description: req.body.description,
    date: req.body.date,
    type: req.body.type,
  });

  try {
    const newActivity = await activity.save();
    res.status(201).json(newActivity);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get a single activity by ID
router.get('/activities/:id', async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) return res.status(404).json({ message: 'Activity not found' });
    res.status(200).json(activity);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update an activity by ID
router.put('/activities/:id', async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) return res.status(404).json({ message: 'Activity not found' });

    activity.name = req.body.name || activity.name;
    activity.description = req.body.description || activity.description;
    activity.date = req.body.date || activity.date;
    activity.type = req.body.type || activity.type;

    const updatedActivity = await activity.save();
    res.status(200).json(updatedActivity);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete an activity by ID
router.delete('/activities/:id', async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) return res.status(404).json({ message: 'Activity not found' });

    await activity.remove();
    res.status(200).json({ message: 'Activity deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
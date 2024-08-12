// routes/activity.js
const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');

// Get all activities
router.get('/', async (req, res) => {  // Root route should be '/'
  try {
    const activities = await Activity.find();
    if (activities.length === 0) {
      return res.status(404).json({ message: 'No activities found' });
    }
    res.status(200).json(activities);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new activity
router.post('/', async (req, res) => {  // Root route should be '/'
  const activity = new Activity({
    name: req.body.name,
    description: req.body.description,
    date: req.body.date,
    type: req.body.type,
    participants: req.body.participants,
    status: req.body.status,
    createdBy: req.body.createdBy,
  });

  try {
    const newActivity = await activity.save();
    res.status(201).json(newActivity);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get a single activity by ID
router.get('/:id', async (req, res) => {  // Root route should be '/:id'
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) return res.status(404).json({ message: 'Activity not found' });
    res.status(200).json(activity);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update an activity by ID
router.put('/:id', async (req, res) => {  // Root route should be '/:id'
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) return res.status(404).json({ message: 'Activity not found' });

    activity.name = req.body.name || activity.name;
    activity.description = req.body.description || activity.description;
    activity.date = req.body.date || activity.date;
    activity.type = req.body.type || activity.type;
    activity.participants = req.body.participants || activity.participants;
    activity.status = req.body.status || activity.status;
    activity.updatedAt = Date.now();

    const updatedActivity = await activity.save();
    res.status(200).json(updatedActivity);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete an activity by ID
router.delete('/:id', async (req, res) => {  // Root route should be '/:id'
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

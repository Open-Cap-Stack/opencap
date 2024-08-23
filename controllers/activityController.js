const Activity = require('../models/Activity');

exports.createActivity = async (req, res) => {
  try {
    const activity = new Activity(req.body);
    await activity.save();
    res.status(201).send(activity);
  } catch (error) {
    res.status(400).send(error);
  }
};

exports.getActivities = async (req, res) => {
  try {
    const activities = await Activity.find();
    res.send(activities);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching activities' });
  }
};

exports.getActivityById = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      res.status(404).send({ message: 'Activity not found' });
    } else {
      res.send(activity);
    }
  } catch (error) {
    res.status(500).json({ error: 'Error fetching activity' });
  }
};

exports.updateActivity = async (req, res) => {
  try {
    const activity = await Activity.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!activity) {
      res.status(404).send({ message: 'Activity not found' });
    } else {
      res.send(activity);
    }
  } catch (error) {
    res.status(400).send(error);
  }
};

exports.deleteActivity = async (req, res) => {
  try {
    await Activity.findByIdAndRemove(req.params.id);
    res.send({ message: 'Activity deleted' });
  } catch (error) {
    res.status(500).send(error);
  }
};

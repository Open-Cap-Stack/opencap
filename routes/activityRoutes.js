const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');

// Route for creating a new activity
router.post('/activities', activityController.createActivity);

// Route for retrieving all activities
router.get('/activities', activityController.getActivities);

// Route for retrieving a single activity by ID
router.get('/activities/:id', activityController.getActivityById);

// Route for updating an activity by ID
router.put('/activities/:id', activityController.updateActivityById);

// Route for deleting an activity by ID
router.delete('/activities/:id', activityController.deleteActivity);

module.exports = router;
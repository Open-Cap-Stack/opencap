const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');

// Route for creating a new activity
router.post('/', activityController.createActivity);

// Route for retrieving all activities
router.get('/', activityController.getActivities);

// Route for retrieving a single activity by ID
router.get('/:id', activityController.getActivityById);

// Route for updating an activity by ID
router.put('/:id', activityController.updateActivityById);

// Route for deleting an activity by ID
router.delete('/:id', activityController.deleteActivity);

module.exports = router;

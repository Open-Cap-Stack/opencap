const express = require('express');
const router = express.Router();
const activityController = require('../../controllers/activityController');

//Activity Routes
router.post('/', activityController.createActivity);
router.get('/', activityController.getActivities);
router.get('/:id', activityController.getActivityById);
router.put('/:id', activityController.updateActivity);
router.delete('/:id', activityController.deleteActivity);

module.exports = router;

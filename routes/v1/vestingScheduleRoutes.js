/**
 * VestingSchedule Routes
 * Issue #78: Implement Automated Vesting Schedules
 *
 * API routes for vesting schedule management
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const vestingScheduleController = require('../../controllers/vestingScheduleController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// CRUD operations
router.post('/vesting-schedules', vestingScheduleController.createVestingSchedule);
router.get('/vesting-schedules', vestingScheduleController.getVestingSchedules);
router.get('/vesting-schedules/due-today', vestingScheduleController.getSchedulesDueForVesting);
router.get('/vesting-schedules/:id', vestingScheduleController.getVestingScheduleById);
router.put('/vesting-schedules/:id', vestingScheduleController.updateVestingSchedule);
router.delete('/vesting-schedules/:id', vestingScheduleController.deleteVestingSchedule);

// Vesting calculations
router.get('/vesting-schedules/:id/calculate', vestingScheduleController.calculateVesting);
router.get('/vesting-schedules/:id/timeline', vestingScheduleController.getVestingTimeline);
router.get('/vesting-schedules/:id/visualization', vestingScheduleController.getVisualizationData);
router.get('/vesting-schedules/:id/upcoming', vestingScheduleController.getUpcomingVestingEvents);

// Acceleration
router.post('/vesting-schedules/:id/accelerate', vestingScheduleController.applyAcceleration);

// Status management
router.post('/vesting-schedules/:id/pause', vestingScheduleController.pauseVestingSchedule);
router.post('/vesting-schedules/:id/resume', vestingScheduleController.resumeVestingSchedule);
router.post('/vesting-schedules/:id/terminate', vestingScheduleController.terminateVestingSchedule);

module.exports = router;

/**
 * VestingSchedule Routes
 * Issue #78: Implement Automated Vesting Schedules
 *
 * API routes for vesting schedule management
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const vestingScheduleController = require('../../controllers/vestingScheduleController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// CRUD operations
router.post('/vesting-schedules', hasRole(['super_admin', 'admin', 'founder', 'manager']), vestingScheduleController.createVestingSchedule);
router.get('/vesting-schedules', hasRole(['super_admin', 'admin', 'founder', 'manager']), vestingScheduleController.getVestingSchedules);
router.get('/vesting-schedules/due-today', hasRole(['super_admin', 'admin', 'founder', 'manager']), vestingScheduleController.getSchedulesDueForVesting);
router.get('/vesting-schedules/:id', hasRole(['super_admin', 'admin', 'founder', 'manager']), vestingScheduleController.getVestingScheduleById);
router.put('/vesting-schedules/:id', hasRole(['super_admin', 'admin', 'founder', 'manager']), vestingScheduleController.updateVestingSchedule);
router.delete('/vesting-schedules/:id', hasRole(['super_admin', 'admin', 'founder', 'manager']), vestingScheduleController.deleteVestingSchedule);

// Vesting calculations
router.get('/vesting-schedules/:id/calculate', hasRole(['super_admin', 'admin', 'founder', 'manager']), vestingScheduleController.calculateVesting);
router.get('/vesting-schedules/:id/timeline', hasRole(['super_admin', 'admin', 'founder', 'manager']), vestingScheduleController.getVestingTimeline);
router.get('/vesting-schedules/:id/visualization', hasRole(['super_admin', 'admin', 'founder', 'manager']), vestingScheduleController.getVisualizationData);
router.get('/vesting-schedules/:id/upcoming', hasRole(['super_admin', 'admin', 'founder', 'manager']), vestingScheduleController.getUpcomingVestingEvents);

// Acceleration
router.post('/vesting-schedules/:id/accelerate', hasRole(['super_admin', 'admin', 'founder', 'manager']), vestingScheduleController.applyAcceleration);

// Status management
router.post('/vesting-schedules/:id/pause', hasRole(['super_admin', 'admin', 'founder', 'manager']), vestingScheduleController.pauseVestingSchedule);
router.post('/vesting-schedules/:id/resume', hasRole(['super_admin', 'admin', 'founder', 'manager']), vestingScheduleController.resumeVestingSchedule);
router.post('/vesting-schedules/:id/terminate', hasRole(['super_admin', 'admin', 'founder', 'manager']), vestingScheduleController.terminateVestingSchedule);

module.exports = router;

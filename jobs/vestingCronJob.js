/**
 * Vesting Cron Job
 * Issue #78: Implement Automated Vesting Schedules
 *
 * Daily cron job to:
 * - Process active vesting schedules
 * - Update vested shares
 * - Create notifications for vesting events
 * - Mark completed schedules
 */
const databaseAdapter = require('../services/databaseAdapter');
const VestingCalculatorService = require('../services/vestingCalculatorService');
const { v4: uuidv4 } = require('uuid');

/**
 * Default cron schedule - daily at midnight
 */
const JOB_SCHEDULE = '0 0 * * *';

/**
 * Process all active vesting schedules
 * @returns {Object} Summary of processing results
 */
async function processVestingSchedules() {
  const results = {
    processed: 0,
    updated: 0,
    completed: 0,
    errors: 0,
    notifications: 0,
    startTime: new Date(),
    endTime: null
  };

  try {
    // Fetch all active vesting schedules
    const schedules = await databaseAdapter.find('VestingSchedule', { status: 'active' });

    for (const schedule of schedules) {
      try {
        await processSchedule(schedule, results);
        results.processed++;
      } catch (error) {
        console.error(`Error processing schedule ${schedule._id}:`, error);
        results.errors++;
      }
    }

    results.endTime = new Date();
    return results;
  } catch (error) {
    results.endTime = new Date();
    console.error('Error in vesting cron job:', error);
    throw error;
  }
}

/**
 * Process a single vesting schedule
 * @param {Object} schedule - Vesting schedule to process
 * @param {Object} results - Results object to update
 */
async function processSchedule(schedule, results) {
  const today = new Date();

  // Calculate current vesting
  const vestingResult = VestingCalculatorService.calculateVestedShares(schedule, today);

  // Check if vesting has changed
  const previousVested = schedule.vestedShares || 0;
  const newVested = vestingResult.vestedShares;
  const sharesVestedToday = newVested - previousVested;

  // Get next vesting event
  const nextEvent = VestingCalculatorService.getNextVestingEvent(schedule, today);

  // Prepare update data
  const updateData = {
    vestedShares: newVested,
    unvestedShares: vestingResult.unvestedShares,
    lastVestingDate: sharesVestedToday > 0 ? today : schedule.lastVestingDate,
    nextVestingDate: nextEvent ? nextEvent.eventDate : null
  };

  // Check if fully vested
  if (newVested >= schedule.totalShares) {
    updateData.status = 'completed';
    updateData.unvestedShares = 0;
    updateData.vestedShares = schedule.totalShares;
    results.completed++;
  }

  // Update schedule in database
  await databaseAdapter.findByIdAndUpdate(
    'VestingSchedule',
    schedule._id,
    updateData,
    { new: true }
  );
  results.updated++;

  // Create notification if shares vested today
  if (sharesVestedToday > 0) {
    try {
      await createVestingNotification({
        scheduleId: schedule.scheduleId,
        stakeholderId: schedule.stakeholderId,
        sharesVested: sharesVestedToday,
        totalVested: newVested,
        totalShares: schedule.totalShares,
        vestingPercentage: vestingResult.vestingPercentage,
        isComplete: newVested >= schedule.totalShares
      });
      results.notifications++;
    } catch (notifError) {
      console.error(`Error creating notification for schedule ${schedule._id}:`, notifError);
    }
  }
}

/**
 * Create a notification for a vesting event
 * @param {Object} vestingEvent - Vesting event details
 */
async function createVestingNotification(vestingEvent) {
  const {
    scheduleId,
    stakeholderId,
    sharesVested,
    totalVested,
    totalShares,
    vestingPercentage,
    isComplete
  } = vestingEvent;

  const title = isComplete
    ? 'Vesting Complete'
    : 'Vesting Event';

  const message = isComplete
    ? `Congratulations! Your vesting schedule (${scheduleId}) is now complete. All ${totalShares.toLocaleString()} shares have vested.`
    : `${sharesVested.toLocaleString()} shares have vested from schedule ${scheduleId}. Total vested: ${totalVested.toLocaleString()} of ${totalShares.toLocaleString()} (${vestingPercentage.toFixed(2)}%)`;

  const notification = {
    notificationId: `NOTIF-${uuidv4().slice(0, 8).toUpperCase()}`,
    notificationType: 'system',
    title,
    message,
    recipient: stakeholderId,
    Timestamp: new Date(),
    RelatedObjects: scheduleId,
    UserInvolved: stakeholderId
  };

  await databaseAdapter.create('Notification', notification);
  return notification;
}

/**
 * Prepare email data for a vesting event
 * @param {Object} vestingEvent - Vesting event details
 * @returns {Object} Email data
 */
function prepareVestingEmailData(vestingEvent) {
  const {
    scheduleId,
    email,
    sharesVested,
    totalVested,
    totalShares
  } = vestingEvent;

  const vestingPercentage = ((totalVested / totalShares) * 100).toFixed(2);
  const isComplete = totalVested >= totalShares;

  return {
    to: email,
    subject: isComplete
      ? `Vesting Complete - Schedule ${scheduleId}`
      : `Vesting Event - ${sharesVested.toLocaleString()} Shares Vested`,
    body: {
      scheduleId,
      sharesVested,
      totalVested,
      totalShares,
      vestingPercentage,
      isComplete,
      date: new Date().toISOString()
    },
    template: isComplete ? 'vesting-complete' : 'vesting-event'
  };
}

/**
 * Get the cron job schedule expression
 * @returns {string} Cron schedule expression
 */
function getJobSchedule() {
  return process.env.VESTING_CRON_SCHEDULE || JOB_SCHEDULE;
}

/**
 * Initialize the cron job (if using node-cron or similar)
 * @param {Object} cron - Cron library instance (e.g., node-cron)
 * @returns {Object} Scheduled job
 */
function initializeJob(cron) {
  if (!cron || typeof cron.schedule !== 'function') {
    console.warn('Cron library not provided, job not scheduled');
    return null;
  }

  const schedule = getJobSchedule();
  console.log(`Scheduling vesting cron job with schedule: ${schedule}`);

  return cron.schedule(schedule, async () => {
    console.log('Running vesting cron job...');
    try {
      const results = await processVestingSchedules();
      console.log('Vesting cron job completed:', results);
    } catch (error) {
      console.error('Vesting cron job failed:', error);
    }
  });
}

module.exports = {
  processVestingSchedules,
  createVestingNotification,
  prepareVestingEmailData,
  getJobSchedule,
  initializeJob
};

const zerodbService = require('../services/zerodbService');
const emailService = require('../services/emailService');

const JOB_SCHEDULE = '0 9 * * *';

async function processAbandonedOnboarding() {
  const results = { checked: 0, reminded24h: 0, reminded7d: 0, errors: 0 };

  try {
    const allUsers = await zerodbService.queryTable('users', {
      filter: { status: 'active' }
    });
    const rows = allUsers?.data || allUsers?.rows || allUsers || [];
    const users = rows.map(r => r.row_data ? { ...r.row_data, _id: r.row_id } : r);

    const now = Date.now();
    const DAY = 86400000;

    for (const user of users) {
      if (user.companyId || user.onboardingCompleted) continue;
      if (user.onboardingReminderSent === '7d') continue;

      results.checked++;
      const createdAt = new Date(user.createdAt).getTime();
      if (isNaN(createdAt)) continue;

      const daysAgo = Math.floor((now - createdAt) / DAY);

      try {
        if (daysAgo >= 7 && user.onboardingReminderSent !== '7d') {
          await emailService.sendOnboardingReminder({
            to: user.email,
            firstName: user.firstName,
            daysAgo: 7
          });
          await zerodbService.updateRows('users', {
            filter: { _id: user._id },
            update: { onboardingReminderSent: '7d' }
          });
          results.reminded7d++;
        } else if (daysAgo >= 1 && !user.onboardingReminderSent) {
          await emailService.sendOnboardingReminder({
            to: user.email,
            firstName: user.firstName,
            daysAgo: 1
          });
          await zerodbService.updateRows('users', {
            filter: { _id: user._id },
            update: { onboardingReminderSent: '24h' }
          });
          results.reminded24h++;
        }
      } catch (err) {
        console.error(`Onboarding reminder failed for ${user.email}:`, err.message);
        results.errors++;
      }
    }
  } catch (err) {
    console.error('Onboarding reminder job failed:', err.message);
    results.errors++;
  }

  return results;
}

module.exports = { processAbandonedOnboarding, JOB_SCHEDULE };

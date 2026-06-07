'use strict';

/**
 * 83(b) Election Deadline Tracking Service
 * Issue #667: 83(b) deadline tracking and automated email reminders
 *
 * Calculates 83(b) election deadlines (grant date + 30 calendar days),
 * determines filing status, and sends automated email reminders on a
 * predefined schedule (25, 14, 7, 3, 1 days before deadline).
 */

const databaseAdapter = require('./databaseAdapter');
const emailService = require('./emailService');

// Reminder schedule: days before deadline at which to send reminders
const REMINDER_SCHEDULE = [25, 14, 7, 3, 1];

// 83(b) deadline is 30 calendar days from the grant date
const DEADLINE_DAYS = 30;

/**
 * Calculate the 83(b) election deadline for a given grant date.
 * @param {string|Date} grantDate - The equity grant date
 * @returns {Date} The deadline date (grant date + 30 calendar days)
 */
function calculate83bDeadline(grantDate) {
  const date = new Date(grantDate);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid grant date');
  }
  const deadline = new Date(date);
  deadline.setDate(deadline.getDate() + DEADLINE_DAYS);
  return deadline;
}

/**
 * Determine the 83(b) filing status for a grant.
 * @param {Object} grant - The equity grant object
 * @param {Date} deadline - The calculated deadline
 * @param {number} daysRemaining - Days until the deadline
 * @returns {string} One of: filed, expired, urgent, pending
 */
function determineStatus(grant, deadline, daysRemaining) {
  if (grant.eightythreeBFiled) {
    return 'filed';
  }
  if (daysRemaining < 0) {
    return 'expired';
  }
  if (daysRemaining <= 7) {
    return 'urgent';
  }
  return 'pending';
}

/**
 * Get the 83(b) status for all equity grants in a company.
 * Joins grant data with stakeholder data to include names and emails.
 *
 * @param {string} companyId - The company identifier
 * @returns {Array<Object>} Array of status objects per grant
 */
async function get83bStatus(companyId) {
  if (!companyId) {
    throw new Error('companyId is required');
  }

  // Fetch all equity grants for the company
  const grants = await databaseAdapter.find('EquityGrant', { companyId });
  if (!grants || grants.length === 0) {
    return [];
  }

  // Fetch all stakeholders for the company so we can join by stakeholderId
  const stakeholders = await databaseAdapter.find('Stakeholder', { companyId });
  const stakeholderMap = {};
  if (stakeholders && stakeholders.length > 0) {
    for (const s of stakeholders) {
      // Map by all possible ID fields so grant.stakeholderId or grant.employeeId matches
      if (s._id) stakeholderMap[s._id] = s;
      if (s.row_id) stakeholderMap[s.row_id] = s;
      if (s.id) stakeholderMap[s.id] = s;
      if (s.stakeholderId) stakeholderMap[s.stakeholderId] = s;
    }
  }

  const now = new Date();
  const results = [];

  // 83(b) elections only apply to restricted stock (RSA/RSU) — not to stock options (NSO/ISO)
  // unless they are early-exercised. Filter to RSA/RSU grants only.
  const STOCK_GRANT_TYPES = ['RSA', 'RSU', 'rsa', 'rsu', 'restricted_stock', 'common'];
  const eligibleGrants = grants.filter(g => {
    const type = (g.grantType || g.type || '').toUpperCase();
    return STOCK_GRANT_TYPES.includes(type) || STOCK_GRANT_TYPES.includes(type.toLowerCase());
  });

  for (const grant of eligibleGrants) {
    const grantDate = grant.grantDate || grant.issueDate;
    if (!grantDate) {
      continue; // Skip grants without a date
    }

    const deadline = calculate83bDeadline(grantDate);
    const diffMs = deadline.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const status = determineStatus(grant, deadline, daysRemaining);

    const grantId = grant._id || grant.row_id || grant.id;
    const stakeholderId = grant.stakeholderId || grant.employeeId;
    const stakeholder = stakeholderMap[stakeholderId] || {};

    results.push({
      grantId,
      stakeholderId,
      stakeholderName: stakeholder.name
        || (stakeholder.firstName ? `${stakeholder.firstName} ${stakeholder.lastName || ''}`.trim() : null)
        || 'Unknown',
      stakeholderEmail: stakeholder.email || null,
      grantDate: new Date(grantDate).toISOString(),
      shares: grant.numberOfShares || grant.quantity || 0,
      deadline: deadline.toISOString(),
      daysRemaining,
      status,
      eightythreeBFiled: !!grant.eightythreeBFiled,
      eightythreeBFiledDate: grant.eightythreeBFiledDate || null,
      remindersSent: grant.remindersSent || [],
    });
  }

  return results;
}

/**
 * Mark an equity grant's 83(b) election as filed.
 *
 * @param {string} grantId - The equity grant identifier
 * @returns {Object} The updated grant record
 */
async function mark83bFiled(grantId) {
  if (!grantId) {
    throw new Error('grantId is required');
  }

  const grant = await databaseAdapter.findOne('EquityGrant', { _id: grantId });
  if (!grant) {
    // Try by row_id
    const grantByRow = await databaseAdapter.findOne('EquityGrant', { row_id: grantId });
    if (!grantByRow) {
      throw new Error('Equity grant not found');
    }
    const updatedGrant = await databaseAdapter.update(
      'EquityGrant',
      { row_id: grantId },
      { eightythreeBFiled: true, eightythreeBFiledDate: new Date().toISOString() }
    );
    return updatedGrant;
  }

  const updatedGrant = await databaseAdapter.update(
    'EquityGrant',
    { _id: grantId },
    { eightythreeBFiled: true, eightythreeBFiledDate: new Date().toISOString() }
  );
  return updatedGrant;
}

/**
 * Send a manual 83(b) reminder for a specific grant/stakeholder.
 *
 * @param {string} stakeholderId - The stakeholder to remind
 * @param {string} grantId - The grant to remind about
 * @returns {Object} Result with success status
 */
async function sendManualReminder(stakeholderId, grantId) {
  if (!stakeholderId || !grantId) {
    throw new Error('stakeholderId and grantId are required');
  }

  const grant = await databaseAdapter.findOne('EquityGrant', {
    _id: grantId,
  }) || await databaseAdapter.findOne('EquityGrant', { row_id: grantId });

  if (!grant) {
    throw new Error('Equity grant not found');
  }

  const stakeholder = await databaseAdapter.findOne('Stakeholder', {
    _id: stakeholderId,
  }) || await databaseAdapter.findOne('Stakeholder', { row_id: stakeholderId });

  if (!stakeholder) {
    throw new Error('Stakeholder not found');
  }

  if (!stakeholder.email) {
    throw new Error('Stakeholder has no email address');
  }

  const grantDate = grant.grantDate || grant.issueDate;
  if (!grantDate) {
    throw new Error('Grant has no grant date');
  }

  const deadline = calculate83bDeadline(grantDate);
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const name = stakeholder.name
    || `${stakeholder.firstName || ''} ${stakeholder.lastName || ''}`.trim()
    || 'there';

  await emailService.send83bDeadlineReminder(
    stakeholder.email,
    name,
    {
      shares: grant.numberOfShares || grant.quantity || 0,
      grantDate: new Date(grantDate).toISOString(),
      companyName: grant.companyName || 'your company',
    },
    daysRemaining,
    deadline
  );

  return { success: true, email: stakeholder.email, daysRemaining };
}

/**
 * Automated reminder check: finds all grants needing reminders and sends them.
 * Uses the REMINDER_SCHEDULE to decide which grants should receive emails.
 * Tracks sent reminders in the grant's `remindersSent` metadata array.
 *
 * @returns {number} Number of reminders sent
 */
async function checkAndSendReminders() {
  // Fetch all companies, then iterate grants
  // For efficiency we query all grants that are not yet filed
  const allGrants = await databaseAdapter.find('EquityGrant', {
    eightythreeBFiled: { $ne: true },
  });

  if (!allGrants || allGrants.length === 0) {
    return 0;
  }

  // Build a set of unique stakeholder IDs so we can batch-fetch
  const stakeholderIds = new Set();
  for (const g of allGrants) {
    if (g.stakeholderId) stakeholderIds.add(g.stakeholderId);
  }

  // Fetch all relevant stakeholders in one query per company
  // For simplicity, fetch all stakeholders (the set may span companies)
  const stakeholders = await databaseAdapter.find('Stakeholder', {});
  const stakeholderMap = {};
  if (stakeholders) {
    for (const s of stakeholders) {
      const id = s._id || s.row_id || s.id;
      stakeholderMap[id] = s;
    }
  }

  const now = new Date();
  let sentCount = 0;

  for (const grant of allGrants) {
    const grantDate = grant.grantDate || grant.issueDate;
    if (!grantDate) continue;

    const deadline = calculate83bDeadline(grantDate);
    const diffMs = deadline.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    // Skip grants where the deadline has already passed
    if (daysRemaining < 0) continue;

    const remindersSent = grant.remindersSent || [];

    // Find the matching reminder threshold
    for (const threshold of REMINDER_SCHEDULE) {
      if (daysRemaining <= threshold && !remindersSent.includes(threshold)) {
        const stakeholder = stakeholderMap[grant.stakeholderId];
        if (!stakeholder || !stakeholder.email) continue;

        const name = stakeholder.name
          || `${stakeholder.firstName || ''} ${stakeholder.lastName || ''}`.trim()
          || 'there';

        try {
          await emailService.send83bDeadlineReminder(
            stakeholder.email,
            name,
            {
              shares: grant.numberOfShares || grant.quantity || 0,
              grantDate: new Date(grantDate).toISOString(),
              companyName: grant.companyName || 'your company',
            },
            daysRemaining,
            deadline
          );

          // Record that this threshold was sent
          const updatedReminders = [...remindersSent, threshold];
          const grantId = grant._id || grant.row_id || grant.id;
          await databaseAdapter.update(
            'EquityGrant',
            { _id: grantId },
            { remindersSent: updatedReminders }
          );

          sentCount++;
        } catch (err) {
          console.error(`[83b] Failed to send reminder for grant ${grant._id || grant.row_id}:`, err.message);
        }

        // Only send the most relevant threshold per grant per run
        break;
      }
    }
  }

  return sentCount;
}

module.exports = {
  calculate83bDeadline,
  determineStatus,
  get83bStatus,
  mark83bFiled,
  sendManualReminder,
  checkAndSendReminders,
  REMINDER_SCHEDULE,
  DEADLINE_DAYS,
};

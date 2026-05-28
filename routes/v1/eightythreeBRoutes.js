'use strict';

/**
 * 83(b) Election Compliance Routes
 * Issue #667: 83(b) deadline tracking and automated email reminders
 *
 * Endpoints:
 *   GET  /83b-status?companyId=xxx  — returns all grants with 83(b) deadline info
 *   POST /83b-filed                 — marks a grant's 83(b) election as filed
 *   POST /83b-remind                — manually triggers a reminder email
 */

const express = require('express');
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const eightythreeBService = require('../../services/eightythreeBService');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

const ALLOWED_ROLES = ['super_admin', 'admin', 'founder', 'manager', 'service_provider'];

/**
 * GET /83b-status?companyId=xxx
 * Returns all equity grants with their 83(b) deadline status.
 */
router.get('/83b-status', hasRole(ALLOWED_ROLES), async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'companyId query parameter is required',
      });
    }

    const statuses = await eightythreeBService.get83bStatus(companyId);

    return res.status(200).json({
      success: true,
      companyId,
      count: statuses.length,
      grants: statuses,
    });
  } catch (error) {
    console.error('[83b] GET /83b-status error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve 83(b) status',
      error: error.message,
    });
  }
});

/**
 * POST /83b-filed
 * Marks an equity grant's 83(b) election as filed.
 * Body: { grantId: string }
 */
router.post('/83b-filed', hasRole(ALLOWED_ROLES), async (req, res) => {
  try {
    const { grantId } = req.body;

    if (!grantId) {
      return res.status(400).json({
        success: false,
        message: 'grantId is required in request body',
      });
    }

    const result = await eightythreeBService.mark83bFiled(grantId);

    return res.status(200).json({
      success: true,
      message: '83(b) election marked as filed',
      grant: result,
    });
  } catch (error) {
    console.error('[83b] POST /83b-filed error:', error.message);

    if (error.message === 'Equity grant not found') {
      return res.status(404).json({
        success: false,
        message: 'Equity grant not found',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to mark 83(b) as filed',
      error: error.message,
    });
  }
});

/**
 * POST /83b-remind
 * Manually triggers a reminder email for a specific grant/stakeholder.
 * Body: { stakeholderId: string, grantId: string }
 */
router.post('/83b-remind', hasRole(ALLOWED_ROLES), async (req, res) => {
  try {
    const { stakeholderId, grantId } = req.body;

    if (!stakeholderId || !grantId) {
      return res.status(400).json({
        success: false,
        message: 'stakeholderId and grantId are required in request body',
      });
    }

    const result = await eightythreeBService.sendManualReminder(stakeholderId, grantId);

    return res.status(200).json({
      success: true,
      message: 'Reminder email sent successfully',
      email: result.email,
      daysRemaining: result.daysRemaining,
    });
  } catch (error) {
    console.error('[83b] POST /83b-remind error:', error.message);

    const notFoundMessages = [
      'Equity grant not found',
      'Stakeholder not found',
      'Stakeholder has no email address',
      'Grant has no grant date',
    ];

    if (notFoundMessages.includes(error.message)) {
      const statusCode = error.message.includes('not found') ? 404 : 400;
      return res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to send reminder',
      error: error.message,
    });
  }
});

module.exports = router;

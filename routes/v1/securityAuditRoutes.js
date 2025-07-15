/**
 * Security Audit Routes
 * 
 * [Feature] OCAE-306: Implement security audit logging
 * 
 * This module provides API endpoints for viewing and managing security audit logs.
 * Access is restricted to administrators and security personnel.
 */

const express = require('express');
const router = express.Router();
const SecurityAudit = require('../../models/SecurityAudit');
const { securityLogger } = require('../../middleware/securityAuditLogger');
const { authenticateJWT } = require('../../middleware/jwtAuth');
const { requireRole } = require('../../middleware/rbacMiddleware');

// Apply authentication to all routes
router.use(authenticateJWT);

// Apply admin/security role requirement to all routes
router.use(requireRole(['admin', 'security_analyst']));

/**
 * @swagger
 * /api/v1/security-audits:
 *   get:
 *     tags: [Security Audits]
 *     summary: Get security audit logs
 *     description: Retrieve security audit logs with filtering and pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: eventType
 *         schema:
 *           type: string
 *         description: Filter by event type
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Filter by security level
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *         description: Number of days to look back
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Items per page
 *       - in: query
 *         name: reviewed
 *         schema:
 *           type: boolean
 *         description: Filter by review status
 *     responses:
 *       200:
 *         description: Security audit logs retrieved successfully
 *       403:
 *         description: Access denied
 */
router.get('/', async (req, res) => {
  try {
    const {
      eventType,
      level,
      userId,
      days = 7,
      page = 1,
      limit = 50,
      reviewed
    } = req.query;

    // Build filter query
    const filter = {};
    
    // Date filter
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(days));
    filter.timestamp = { $gte: cutoff };

    // Add optional filters
    if (eventType) filter.eventType = eventType;
    if (level) filter.level = level;
    if (userId) filter['userContext.userId'] = userId;
    if (reviewed !== undefined) filter.reviewed = reviewed === 'true';

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const [logs, total] = await Promise.all([
      SecurityAudit.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('reviewedBy', 'email'),
      SecurityAudit.countDocuments(filter)
    ]);

    // Log this access
    securityLogger.logAuditEvent(
      'data.access',
      {
        action: 'security_audit_logs_accessed',
        filters: filter,
        resultCount: logs.length
      },
      req
    );

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching security audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch security audit logs' });
  }
});

/**
 * @swagger
 * /api/v1/security-audits/summary:
 *   get:
 *     tags: [Security Audits]
 *     summary: Get security audit summary
 *     description: Get aggregated statistics of security events
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *         description: Number of days to analyze
 *     responses:
 *       200:
 *         description: Security audit summary retrieved successfully
 */
router.get('/summary', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    const [summary, suspicious, unreviewed] = await Promise.all([
      SecurityAudit.getSecuritySummary(days),
      SecurityAudit.getSuspiciousActivity(1), // Last 24 hours
      SecurityAudit.getUnreviewedCritical()
    ]);

    res.json({
      period: `${days} days`,
      summary,
      recentSuspiciousActivity: suspicious.slice(0, 10),
      unreviewedCriticalEvents: unreviewed.slice(0, 5),
      stats: {
        totalSuspicious: suspicious.length,
        totalUnreviewedCritical: unreviewed.length
      }
    });

  } catch (error) {
    console.error('Error generating security audit summary:', error);
    res.status(500).json({ error: 'Failed to generate security audit summary' });
  }
});

/**
 * @swagger
 * /api/v1/security-audits/suspicious:
 *   get:
 *     tags: [Security Audits]
 *     summary: Get suspicious activity
 *     description: Retrieve recent suspicious security events
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Number of days to look back
 *     responses:
 *       200:
 *         description: Suspicious activities retrieved successfully
 */
router.get('/suspicious', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 1;
    const suspicious = await SecurityAudit.getSuspiciousActivity(days);

    res.json({
      period: `${days} days`,
      events: suspicious
    });

  } catch (error) {
    console.error('Error fetching suspicious activity:', error);
    res.status(500).json({ error: 'Failed to fetch suspicious activity' });
  }
});

/**
 * @swagger
 * /api/v1/security-audits/{id}/review:
 *   patch:
 *     tags: [Security Audits]
 *     summary: Mark audit log as reviewed
 *     description: Mark a security audit log entry as reviewed
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Audit log ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Review notes
 *     responses:
 *       200:
 *         description: Audit log marked as reviewed
 *       404:
 *         description: Audit log not found
 */
router.patch('/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const auditLog = await SecurityAudit.findById(id);
    if (!auditLog) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    await auditLog.markReviewed(req.user.id, notes);

    // Log this review action
    securityLogger.logAuditEvent(
      'admin.action',
      {
        action: 'security_audit_reviewed',
        auditLogId: id,
        reviewNotes: notes ? 'provided' : 'none'
      },
      req
    );

    res.json({
      message: 'Audit log marked as reviewed',
      auditLog
    });

  } catch (error) {
    console.error('Error reviewing audit log:', error);
    res.status(500).json({ error: 'Failed to review audit log' });
  }
});

/**
 * @swagger
 * /api/v1/security-audits/user/{userId}:
 *   get:
 *     tags: [Security Audits]
 *     summary: Get user-specific audit logs
 *     description: Retrieve security audit logs for a specific user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to look back
 *     responses:
 *       200:
 *         description: User audit logs retrieved successfully
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const days = parseInt(req.query.days) || 30;

    const logs = await SecurityAudit.findByUser(userId, days);

    // Log this access
    securityLogger.logAuditEvent(
      'data.access',
      {
        action: 'user_audit_logs_accessed',
        targetUserId: userId,
        days,
        resultCount: logs.length
      },
      req
    );

    res.json({
      userId,
      period: `${days} days`,
      logs
    });

  } catch (error) {
    console.error('Error fetching user audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch user audit logs' });
  }
});

/**
 * @swagger
 * /api/v1/security-audits/export:
 *   get:
 *     tags: [Security Audits]
 *     summary: Export audit logs
 *     description: Export security audit logs in CSV format
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to export
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *         description: Filter by security level
 *     responses:
 *       200:
 *         description: Audit logs exported successfully
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get('/export', async (req, res) => {
  try {
    const { days = 30, level } = req.query;

    // Build filter
    const filter = {};
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(days));
    filter.timestamp = { $gte: cutoff };
    
    if (level) filter.level = level;

    const logs = await SecurityAudit.find(filter)
      .sort({ timestamp: -1 })
      .limit(10000); // Limit to prevent memory issues

    // Log this export
    securityLogger.logAuditEvent(
      'data.export_request',
      {
        action: 'security_audit_export',
        exportType: 'csv',
        recordCount: logs.length,
        filters: filter
      },
      req
    );

    // Convert to CSV
    const csvHeaders = [
      'Event ID',
      'Timestamp',
      'Event Type',
      'Level',
      'User ID',
      'User Email',
      'IP Address',
      'Method',
      'URL',
      'Details'
    ];

    const csvRows = logs.map(log => [
      log.eventId,
      log.timestamp.toISOString(),
      log.eventType,
      log.level,
      log.userContext.userId || '',
      log.userContext.userEmail || '',
      log.requestContext.ip || '',
      log.requestContext.method || '',
      log.requestContext.url || '',
      JSON.stringify(log.details).replace(/"/g, '""')
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => 
        row.map(field => `"${field}"`).join(',')
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="security-audit-${Date.now()}.csv"`);
    res.send(csvContent);

  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({ error: 'Failed to export audit logs' });
  }
});

module.exports = router;
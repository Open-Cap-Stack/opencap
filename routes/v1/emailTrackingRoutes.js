/**
 * Email Tracking Routes
 *
 * Issue #87: Implement Email Delivery Tracking
 *
 * Routes for email tracking, engagement analytics, and webhook handling.
 * Supports pixel tracking, click tracking, and provider webhooks.
 */

const express = require('express');
const router = express.Router();
const emailTrackingController = require('../../controllers/emailTrackingController');

/**
 * @swagger
 * tags:
 *   name: Email Tracking
 *   description: Email delivery tracking and analytics
 */

/**
 * @swagger
 * /api/v1/email-tracking:
 *   post:
 *     summary: Create email tracking record
 *     tags: [Email Tracking]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messageId
 *               - recipientEmail
 *               - senderEmail
 *               - subject
 *             properties:
 *               messageId:
 *                 type: string
 *               recipientEmail:
 *                 type: string
 *               senderEmail:
 *                 type: string
 *               subject:
 *                 type: string
 *               templateId:
 *                 type: string
 *               companyId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tracking record created
 *       400:
 *         description: Invalid input
 */
router.post('/', emailTrackingController.createEmailTracking);

/**
 * @swagger
 * /api/v1/email-tracking:
 *   get:
 *     summary: List email tracking records
 *     tags: [Email Tracking]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [queued, sent, delivered, opened, clicked, bounced, failed, spam, unsubscribed]
 *       - in: query
 *         name: templateId
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of tracking records
 */
router.get('/', emailTrackingController.listEmailTracking);

/**
 * @swagger
 * /api/v1/email-tracking/analytics:
 *   get:
 *     summary: Get email analytics
 *     tags: [Email Tracking]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [template, date]
 *     responses:
 *       200:
 *         description: Email analytics data
 */
router.get('/analytics', emailTrackingController.getAnalytics);

/**
 * @swagger
 * /api/v1/email-tracking/engagement:
 *   get:
 *     summary: Get engagement report
 *     tags: [Email Tracking]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Engagement report
 */
router.get('/engagement', emailTrackingController.getEngagementReport);

/**
 * @swagger
 * /api/v1/email-tracking/bounced:
 *   get:
 *     summary: Get bounced emails
 *     tags: [Email Tracking]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of bounced emails
 */
router.get('/bounced', emailTrackingController.getBouncedEmails);

/**
 * @swagger
 * /api/v1/email-tracking/suppressed:
 *   get:
 *     summary: Get suppressed emails
 *     tags: [Email Tracking]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of suppressed emails
 */
router.get('/suppressed', emailTrackingController.getSuppressedEmails);

/**
 * @swagger
 * /api/v1/email-tracking/suppression/{email}:
 *   get:
 *     summary: Check if email is suppressed
 *     tags: [Email Tracking]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Suppression status
 */
router.get('/suppression/:email', emailTrackingController.checkEmailSuppression);

/**
 * @swagger
 * /api/v1/email-tracking/suppression/{email}:
 *   delete:
 *     summary: Remove email from suppression list
 *     tags: [Email Tracking]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Suppression removed
 *       404:
 *         description: Email not found in suppression list
 */
router.delete('/suppression/:email', emailTrackingController.removeSuppression);

/**
 * @swagger
 * /api/v1/email-tracking/pixel/{trackingId}:
 *   get:
 *     summary: Tracking pixel endpoint (records email open)
 *     tags: [Email Tracking]
 *     parameters:
 *       - in: path
 *         name: trackingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Returns 1x1 transparent GIF
 *         content:
 *           image/gif:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/pixel/:trackingId', emailTrackingController.handlePixelTracking);

/**
 * @swagger
 * /api/v1/email-tracking/click/{trackingId}:
 *   get:
 *     summary: Click tracking endpoint (records click and redirects)
 *     tags: [Email Tracking]
 *     parameters:
 *       - in: path
 *         name: trackingId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirects to original URL
 *       400:
 *         description: Missing URL parameter
 */
router.get('/click/:trackingId', emailTrackingController.handleClickTracking);

/**
 * @swagger
 * /api/v1/email-tracking/webhook/{provider}:
 *   post:
 *     summary: Webhook endpoint for email providers
 *     tags: [Email Tracking]
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [sendgrid, mailgun, ses, postmark, sparkpost]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed
 *       400:
 *         description: Unsupported provider
 */
router.post('/webhook/:provider', emailTrackingController.handleWebhook);

/**
 * @swagger
 * /api/v1/email-tracking/message/{messageId}:
 *   get:
 *     summary: Get tracking record by message ID
 *     tags: [Email Tracking]
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tracking record
 *       404:
 *         description: Record not found
 */
router.get('/message/:messageId', emailTrackingController.getEmailTrackingByMessageId);

/**
 * @swagger
 * /api/v1/email-tracking/{id}:
 *   get:
 *     summary: Get tracking record by ID
 *     tags: [Email Tracking]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tracking record
 *       404:
 *         description: Record not found
 */
router.get('/:id', emailTrackingController.getEmailTracking);

module.exports = router;

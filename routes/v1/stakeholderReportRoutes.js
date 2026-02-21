/**
 * Stakeholder Report Routes
 * Issue #198: Enhance Stakeholder Report Generation
 * Issue #234: Fix Reports Page 401 Unauthorized Errors
 *
 * API routes for stakeholder report generation:
 * - GET    /api/v1/stakeholders/:id/reports - Get stakeholder reports
 * - POST   /api/v1/stakeholders/:id/reports/holdings - Holdings report
 * - POST   /api/v1/stakeholders/:id/reports/transactions - Transaction history
 * - POST   /api/v1/stakeholders/:id/reports/valuations - Valuation report
 * - POST   /api/v1/stakeholders/:id/reports/tax - Tax documents
 * - GET    /api/v1/stakeholders/:id/reports/:reportId - Get specific report
 * - GET    /api/v1/stakeholders/:id/reports/:reportId/download - Download report
 * - POST   /api/v1/stakeholders/:id/reports/schedule - Schedule automated delivery
 */

const express = require('express');
const router = express.Router();
const stakeholderReportController = require('../../controllers/stakeholderReportController');
const { authenticateToken } = require('../../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: StakeholderReports
 *   description: Stakeholder report generation and management
 */

/**
 * @swagger
 * /api/v1/stakeholders/{id}/reports:
 *   get:
 *     summary: Get all reports for a stakeholder
 *     tags: [StakeholderReports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Stakeholder ID
 *       - in: query
 *         name: reportType
 *         schema:
 *           type: string
 *           enum: [holdings, transactions, valuations, tax, summary]
 *         description: Filter by report type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, generating, completed, failed, delivered]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of reports
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.get('/:id/reports', stakeholderReportController.getStakeholderReports);

/**
 * @swagger
 * /api/v1/stakeholders/{id}/reports/holdings:
 *   post:
 *     summary: Generate holdings report for a stakeholder
 *     tags: [StakeholderReports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Stakeholder ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyId
 *             properties:
 *               companyId:
 *                 type: string
 *                 description: Company ID
 *               format:
 *                 type: string
 *                 enum: [pdf, excel, csv, json]
 *                 default: pdf
 *     responses:
 *       201:
 *         description: Report generated successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Stakeholder not found
 *       500:
 *         description: Server error
 */
router.post('/:id/reports/holdings', stakeholderReportController.generateHoldingsReport);

/**
 * @swagger
 * /api/v1/stakeholders/{id}/reports/transactions:
 *   post:
 *     summary: Generate transaction history report for a stakeholder
 *     tags: [StakeholderReports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Stakeholder ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyId
 *             properties:
 *               companyId:
 *                 type: string
 *                 description: Company ID
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Start date filter
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: End date filter
 *               format:
 *                 type: string
 *                 enum: [pdf, excel, csv, json]
 *                 default: pdf
 *     responses:
 *       201:
 *         description: Report generated successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Stakeholder not found
 *       500:
 *         description: Server error
 */
router.post('/:id/reports/transactions', stakeholderReportController.generateTransactionsReport);

/**
 * @swagger
 * /api/v1/stakeholders/{id}/reports/valuations:
 *   post:
 *     summary: Generate valuation report for a stakeholder
 *     tags: [StakeholderReports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Stakeholder ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyId
 *             properties:
 *               companyId:
 *                 type: string
 *                 description: Company ID
 *               format:
 *                 type: string
 *                 enum: [pdf, excel, csv, json]
 *                 default: pdf
 *     responses:
 *       201:
 *         description: Report generated successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Stakeholder not found
 *       500:
 *         description: Server error
 */
router.post('/:id/reports/valuations', stakeholderReportController.generateValuationsReport);

/**
 * @swagger
 * /api/v1/stakeholders/{id}/reports/tax:
 *   post:
 *     summary: Generate tax document report for a stakeholder
 *     tags: [StakeholderReports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Stakeholder ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyId
 *               - taxYear
 *             properties:
 *               companyId:
 *                 type: string
 *                 description: Company ID
 *               taxYear:
 *                 type: integer
 *                 description: Tax year (e.g., 2023)
 *               format:
 *                 type: string
 *                 enum: [pdf, excel, csv, json]
 *                 default: pdf
 *     responses:
 *       201:
 *         description: Report generated successfully
 *       400:
 *         description: Invalid request or invalid tax year
 *       404:
 *         description: Stakeholder not found
 *       500:
 *         description: Server error
 */
router.post('/:id/reports/tax', stakeholderReportController.generateTaxReport);

/**
 * @swagger
 * /api/v1/stakeholders/{id}/reports/schedule:
 *   post:
 *     summary: Schedule automated report delivery
 *     tags: [StakeholderReports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Stakeholder ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyId
 *               - reportType
 *               - schedule
 *               - recipients
 *             properties:
 *               companyId:
 *                 type: string
 *                 description: Company ID
 *               reportType:
 *                 type: string
 *                 enum: [holdings, transactions, valuations, tax, summary]
 *                 description: Type of report to schedule
 *               schedule:
 *                 type: string
 *                 description: Cron expression (e.g., "0 9 1 * *" for first of month at 9 AM)
 *               recipients:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: email
 *                 description: Email recipients for automated delivery
 *               format:
 *                 type: string
 *                 enum: [pdf, excel, csv, json]
 *                 default: pdf
 *     responses:
 *       201:
 *         description: Schedule created successfully
 *       400:
 *         description: Invalid request, schedule format, or email format
 *       500:
 *         description: Server error
 */
router.post('/:id/reports/schedule', stakeholderReportController.scheduleAutomatedDelivery);

/**
 * @swagger
 * /api/v1/stakeholders/{id}/reports/{reportId}/email:
 *   post:
 *     summary: Email a report to specified recipients
 *     tags: [StakeholderReports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Stakeholder ID
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *         description: Report ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - to
 *             properties:
 *               to:
 *                 type: string
 *                 format: email
 *                 description: Recipient email address
 *               subject:
 *                 type: string
 *                 description: Email subject
 *               message:
 *                 type: string
 *                 description: Email message body
 *     responses:
 *       200:
 *         description: Email sent successfully
 *       400:
 *         description: Invalid request or report not ready
 *       404:
 *         description: Report not found
 *       500:
 *         description: Server error
 */
router.post('/:id/reports/:reportId/email', stakeholderReportController.emailReport);

/**
 * @swagger
 * /api/v1/stakeholders/{id}/reports/{reportId}:
 *   get:
 *     summary: Get a specific report by ID
 *     tags: [StakeholderReports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Stakeholder ID
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *         description: Report ID
 *     responses:
 *       200:
 *         description: Report details
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Report not found
 *       500:
 *         description: Server error
 */
router.get('/:id/reports/:reportId', stakeholderReportController.getReportById);

/**
 * @swagger
 * /api/v1/stakeholders/{id}/reports/{reportId}/download:
 *   get:
 *     summary: Download a report
 *     tags: [StakeholderReports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Stakeholder ID
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *         description: Report ID
 *     responses:
 *       200:
 *         description: Download URL
 *       400:
 *         description: Report not ready for download
 *       404:
 *         description: Report not found
 *       500:
 *         description: Server error
 */
router.get('/:id/reports/:reportId/download', stakeholderReportController.downloadReport);

module.exports = router;

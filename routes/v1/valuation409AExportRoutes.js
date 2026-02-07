/**
 * Valuation409A Export Routes
 * Feature: Issue #269 - Create 409A data export API for third-party valuation providers
 *
 * API routes for exporting 409A valuation data packages.
 */
const express = require('express');
const router = express.Router();
const valuation409AExportController = require('../../controllers/valuation409AExportController');
const { authenticateToken } = require('../../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: 409A Export
 *   description: Export data for third-party 409A valuation providers
 */

/**
 * @swagger
 * /api/v1/valuations/export/requirements:
 *   get:
 *     summary: Get export requirements checklist
 *     tags: [409A Export]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Export requirements and data checklist
 */
router.get('/requirements', valuation409AExportController.getExportRequirements);

/**
 * @swagger
 * /api/v1/valuations/export/validate:
 *   post:
 *     summary: Validate data completeness before export
 *     tags: [409A Export]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - company_id
 *             properties:
 *               company_id:
 *                 type: string
 *                 description: Company ID to validate
 *     responses:
 *       200:
 *         description: Validation result with completeness score
 *       400:
 *         description: Missing company_id
 *       404:
 *         description: Company not found
 */
router.post('/validate', valuation409AExportController.validateExportData);

/**
 * @swagger
 * /api/v1/valuations/export:
 *   post:
 *     summary: Generate full 409A export package
 *     tags: [409A Export]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - company_id
 *             properties:
 *               company_id:
 *                 type: string
 *                 description: Company ID to export
 *               effective_date:
 *                 type: string
 *                 format: date
 *                 description: Effective date for the export
 *               export_format:
 *                 type: string
 *                 enum: [JSON]
 *                 default: JSON
 *               include_sections:
 *                 type: array
 *                 items:
 *                   type: string
 *                 default: ["all"]
 *               recipient:
 *                 type: object
 *                 properties:
 *                   firm_name:
 *                     type: string
 *                   contact_email:
 *                     type: string
 *               password_protect:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Export package created successfully
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Company not found
 */
router.post('/', valuation409AExportController.exportFullPackage);

/**
 * @swagger
 * /api/v1/valuations/export/{exportId}:
 *   get:
 *     summary: Get export metadata by ID
 *     tags: [409A Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: exportId
 *         required: true
 *         schema:
 *           type: string
 *         description: Export ID
 *     responses:
 *       200:
 *         description: Export metadata
 *       404:
 *         description: Export not found
 */
router.get('/:exportId', valuation409AExportController.getExport);

/**
 * @swagger
 * /api/v1/valuations/export/{exportId}/download:
 *   get:
 *     summary: Download export package
 *     tags: [409A Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: exportId
 *         required: true
 *         schema:
 *           type: string
 *         description: Export ID
 *     responses:
 *       200:
 *         description: Export download initiated
 *       404:
 *         description: Export not found
 *       410:
 *         description: Export has expired
 */
router.get('/:exportId/download', valuation409AExportController.downloadExport);

/**
 * @swagger
 * /api/v1/valuations/export/{companyId}/cap-table:
 *   get:
 *     summary: Export cap table summary
 *     tags: [409A Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Company ID
 *       - in: query
 *         name: effectiveDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Effective date for the export
 *     responses:
 *       200:
 *         description: Cap table export data
 *       404:
 *         description: Company not found
 */
router.get('/:companyId/cap-table', valuation409AExportController.exportCapTable);

/**
 * @swagger
 * /api/v1/valuations/export/{companyId}/financials:
 *   get:
 *     summary: Export financial highlights
 *     tags: [409A Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Company ID
 *       - in: query
 *         name: fiscalYear
 *         schema:
 *           type: integer
 *         description: Fiscal year for the export
 *     responses:
 *       200:
 *         description: Financial highlights export data
 *       404:
 *         description: Company not found
 */
router.get('/:companyId/financials', valuation409AExportController.exportFinancials);

/**
 * @swagger
 * /api/v1/valuations/export/{companyId}/transactions:
 *   get:
 *     summary: Export transaction history
 *     tags: [409A Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Company ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for transaction range
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for transaction range
 *     responses:
 *       200:
 *         description: Transaction history export data
 *       404:
 *         description: Company not found
 */
router.get('/:companyId/transactions', valuation409AExportController.exportTransactions);

module.exports = router;

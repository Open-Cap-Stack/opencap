/**
 * Valuation409A Routes
 * Feature: Issue #59 - Create 409A Valuation Request System
 *
 * API routes for 409A valuation management.
 */
const express = require('express');
const router = express.Router();
const valuation409AController = require('../../controllers/valuation409AController');
const { authenticateToken } = require('../../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: 409A Valuations
 *   description: 409A valuation request and management
 */

// Get all valuations
router.get('/', valuation409AController.getAllValuations);

// Get valuation analytics
router.get('/analytics', valuation409AController.getValuationAnalytics);

/**
 * @swagger
 * /api/v1/valuations/latest:
 *   get:
 *     summary: Get latest valuation for a company
 *     tags: [409A Valuations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *         description: The company ID to get the latest valuation for
 *     responses:
 *       200:
 *         description: Latest valuation or null if none exists
 *       400:
 *         description: Missing companyId parameter
 */
router.get('/latest', valuation409AController.getLatestValuation);

/**
 * @swagger
 * /api/v1/valuations:
 *   post:
 *     summary: Create a new 409A valuation request
 *     tags: [409A Valuations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyId
 *               - reason
 *             properties:
 *               companyId:
 *                 type: string
 *               reason:
 *                 type: string
 *                 enum: [annual_valuation, fundraising_round, material_event, option_grant, board_request, audit_requirement, other]
 *               reasonDetails:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Valuation request created
 *       400:
 *         description: Invalid input
 */
router.post('/', valuation409AController.createValuationRequest);

/**
 * @swagger
 * /api/v1/valuations/expiring:
 *   get:
 *     summary: Get valuations expiring soon
 *     tags: [409A Valuations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 60
 *         description: Number of days threshold
 *     responses:
 *       200:
 *         description: List of expiring valuations
 */
router.get('/expiring', valuation409AController.getExpiringValuations);

/**
 * @swagger
 * /api/v1/valuations/process-expired:
 *   post:
 *     summary: Process and mark expired valuations
 *     tags: [409A Valuations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expired valuations processed
 */
router.post('/process-expired', valuation409AController.processExpiredValuations);

/**
 * @swagger
 * /api/v1/valuations/company/{companyId}:
 *   get:
 *     summary: Get all valuations for a company
 *     tags: [409A Valuations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
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
 *         description: List of valuations
 */
router.get('/company/:companyId', valuation409AController.getCompanyValuations);

/**
 * @swagger
 * /api/v1/valuations/company/{companyId}/current:
 *   get:
 *     summary: Get current active valuation for a company
 *     tags: [409A Valuations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Current valuation
 *       404:
 *         description: No current valuation found
 */
router.get('/company/:companyId/current', valuation409AController.getCurrentValuation);

/**
 * @swagger
 * /api/v1/valuations/company/{companyId}/history:
 *   get:
 *     summary: Get valuation history for a company
 *     tags: [409A Valuations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Valuation history
 */
router.get('/company/:companyId/history', valuation409AController.getValuationHistory);

/**
 * @swagger
 * /api/v1/valuations/company/{companyId}/summary:
 *   get:
 *     summary: Get valuation summary for a company
 *     tags: [409A Valuations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Valuation summary
 */
router.get('/company/:companyId/summary', valuation409AController.getCompanySummary);

/**
 * @swagger
 * /api/v1/valuations/{valuationId}:
 *   get:
 *     summary: Get a specific valuation
 *     tags: [409A Valuations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: valuationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Valuation details
 *       404:
 *         description: Valuation not found
 */
router.get('/:valuationId', valuation409AController.getValuation);

/**
 * @swagger
 * /api/v1/valuations/{valuationId}:
 *   put:
 *     summary: Update a valuation request
 *     tags: [409A Valuations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: valuationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Valuation updated
 *       400:
 *         description: Cannot update valuation in current status
 */
router.put('/:valuationId', valuation409AController.updateValuation);
router.delete('/:valuationId', valuation409AController.deleteValuation);

/**
 * @swagger
 * /api/v1/valuations/{valuationId}/assign-firm:
 *   post:
 *     summary: Assign a valuation firm
 *     tags: [409A Valuations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: valuationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               contactName:
 *                 type: string
 *               contactEmail:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Firm assigned
 */
router.post('/:valuationId/assign-firm', valuation409AController.assignValuationFirm);

/**
 * @swagger
 * /api/v1/valuations/{valuationId}/receive-draft:
 *   post:
 *     summary: Record receipt of draft valuation report
 *     tags: [409A Valuations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: valuationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fairMarketValue:
 *                 type: number
 *               valuationMethod:
 *                 type: string
 *                 enum: [income, market, asset, hybrid, other]
 *               effectiveDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Draft received
 */
router.post('/:valuationId/receive-draft', valuation409AController.receiveDraft);

/**
 * @swagger
 * /api/v1/valuations/{valuationId}/start-review:
 *   post:
 *     summary: Start review of draft valuation
 *     tags: [409A Valuations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: valuationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review started
 */
router.post('/:valuationId/start-review', valuation409AController.startReview);

/**
 * @swagger
 * /api/v1/valuations/{valuationId}/approve:
 *   post:
 *     summary: Approve a valuation
 *     tags: [409A Valuations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: valuationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resolution:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Valuation approved
 */
router.post('/:valuationId/approve', valuation409AController.approveValuation);

/**
 * @swagger
 * /api/v1/valuations/{valuationId}/cancel:
 *   post:
 *     summary: Cancel a valuation request
 *     tags: [409A Valuations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: valuationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Valuation cancelled
 */
router.post('/:valuationId/cancel', valuation409AController.cancelValuation);

/**
 * @swagger
 * /api/v1/valuations/{valuationId}/documents:
 *   post:
 *     summary: Add a document to a valuation
 *     tags: [409A Valuations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: valuationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documentId
 *               - type
 *             properties:
 *               documentId:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [valuation_report, draft_report, supporting_data, board_approval, other]
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Document added
 */
router.post('/:valuationId/documents', valuation409AController.addDocument);

// ============================================================================
// AUDIT TRAIL ROUTES (Issue #63)
// ============================================================================

/**
 * @swagger
 * /api/v1/valuations/{valuationId}/audit-trail:
 *   get:
 *     summary: Get complete audit trail for a valuation
 *     tags: [409A Valuations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: valuationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Complete audit trail with timeline, documents, and status history
 *       404:
 *         description: Valuation not found
 */
router.get('/:valuationId/audit-trail', valuation409AController.getValuationAuditTrail);

/**
 * @swagger
 * /api/v1/valuations/company/{companyId}/compliance/irs:
 *   get:
 *     summary: Generate IRS 409A compliance report
 *     tags: [409A Valuations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: fiscalYear
 *         schema:
 *           type: integer
 *         description: Fiscal year for the report (defaults to current year)
 *     responses:
 *       200:
 *         description: IRS compliance report with requirement checklist
 */
router.get('/company/:companyId/compliance/irs', valuation409AController.generateIRSComplianceReport);

/**
 * @swagger
 * /api/v1/valuations/company/{companyId}/compliance/gaap:
 *   get:
 *     summary: Generate GAAP ASC 718 compliance report
 *     tags: [409A Valuations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: fiscalYear
 *         schema:
 *           type: integer
 *         description: Fiscal year for the report (defaults to current year)
 *     responses:
 *       200:
 *         description: GAAP compliance report
 */
router.get('/company/:companyId/compliance/gaap', valuation409AController.generateGAAPComplianceReport);

/**
 * @swagger
 * /api/v1/valuations/company/{companyId}/audit-report:
 *   get:
 *     summary: Generate comprehensive audit report
 *     tags: [409A Valuations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: fiscalYear
 *         schema:
 *           type: integer
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
 *     responses:
 *       200:
 *         description: Comprehensive audit report with IRS, GAAP compliance and history
 */
router.get('/company/:companyId/audit-report', valuation409AController.generateAuditReport);

/**
 * @swagger
 * /api/v1/valuations/company/{companyId}/audit-export:
 *   get:
 *     summary: Export audit data for external systems
 *     tags: [409A Valuations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json]
 *         description: Export format (defaults to json)
 *     responses:
 *       200:
 *         description: Exported audit data
 */
router.get('/company/:companyId/audit-export', valuation409AController.exportAuditData);

module.exports = router;

/**
 * Security Issuance Routes
 * Issue #76: Implement Security Issuances Register
 *
 * API routes for managing security issuances with:
 * - CRUD operations
 * - Compliance checking
 * - State filing management
 * - Deadline tracking
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const securityIssuanceController = require('../../controllers/securityIssuanceController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @swagger
 * components:
 *   schemas:
 *     SecurityIssuance:
 *       type: object
 *       required:
 *         - issuanceId
 *         - companyId
 *         - securityType
 *         - stakeholderId
 *         - numberOfShares
 *         - pricePerShare
 *         - issuanceDate
 *       properties:
 *         issuanceId:
 *           type: string
 *           description: Unique identifier for the issuance
 *         companyId:
 *           type: string
 *           description: Company ID
 *         securityType:
 *           type: string
 *           enum: [common_stock, preferred_stock, convertible_note, safe, warrant, option, restricted_stock, rsu]
 *         shareClassId:
 *           type: string
 *           description: Share class ID
 *         stakeholderId:
 *           type: string
 *           description: Stakeholder receiving the securities
 *         numberOfShares:
 *           type: number
 *           description: Number of shares issued
 *         pricePerShare:
 *           type: number
 *           description: Price per share
 *         issuanceDate:
 *           type: string
 *           format: date
 *           description: Date of issuance
 *         status:
 *           type: string
 *           enum: [pending, issued, cancelled, transferred, exercised, converted]
 *         exemptionType:
 *           type: string
 *           enum: [rule_701, regulation_d_506b, regulation_d_506c, regulation_a, regulation_cf, section_4a2, intrastate, other]
 *         complianceStatus:
 *           type: string
 *           enum: [compliant, pending_review, non_compliant, remediation_required]
 *     StateFiling:
 *       type: object
 *       required:
 *         - stateCode
 *       properties:
 *         stateCode:
 *           type: string
 *           description: Two-letter state code (e.g., CA, NY)
 *         filingStatus:
 *           type: string
 *           enum: [not_required, pending, filed, overdue, exempt]
 *         filingDeadline:
 *           type: string
 *           format: date
 *         filingDate:
 *           type: string
 *           format: date
 *         exemptionClaimed:
 *           type: string
 */

/**
 * @swagger
 * /api/v1/security-issuances:
 *   get:
 *     summary: Get all security issuances
 *     tags: [Security Issuances]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *         description: Filter by company ID
 *       - in: query
 *         name: securityType
 *         schema:
 *           type: string
 *         description: Filter by security type
 *       - in: query
 *         name: exemptionType
 *         schema:
 *           type: string
 *         description: Filter by exemption type
 *     responses:
 *       200:
 *         description: List of security issuances
 */
router.get('/', hasRole(['super_admin', 'admin', 'founder', 'manager']), securityIssuanceController.getAllSecurityIssuances);

/**
 * @swagger
 * /api/v1/security-issuances:
 *   post:
 *     summary: Create a new security issuance
 *     tags: [Security Issuances]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SecurityIssuance'
 *     responses:
 *       201:
 *         description: Security issuance created successfully
 *       400:
 *         description: Invalid input
 */
router.post('/', hasRole(['super_admin', 'admin', 'founder', 'manager']), securityIssuanceController.createSecurityIssuance);

/**
 * @swagger
 * /api/v1/security-issuances/compliance:
 *   get:
 *     summary: Get compliance status for a company's issuances
 *     tags: [Security Issuances]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Compliance status summary
 */
router.get('/compliance', hasRole(['super_admin', 'admin', 'founder', 'manager']), securityIssuanceController.getComplianceStatus);

/**
 * @swagger
 * /api/v1/security-issuances/overdue:
 *   get:
 *     summary: Get overdue filings
 *     tags: [Security Issuances]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of overdue filings
 */
router.get('/overdue', hasRole(['super_admin', 'admin', 'founder', 'manager']), securityIssuanceController.getOverdueFilings);

/**
 * @swagger
 * /api/v1/security-issuances/deadlines:
 *   get:
 *     summary: Get upcoming filing deadlines
 *     tags: [Security Issuances]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: daysAhead
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: List of upcoming deadlines
 */
router.get('/deadlines', hasRole(['super_admin', 'admin', 'founder', 'manager']), securityIssuanceController.getUpcomingDeadlines);

/**
 * @swagger
 * /api/v1/security-issuances/exemption/{exemptionType}:
 *   get:
 *     summary: Get issuances by exemption type
 *     tags: [Security Issuances]
 *     parameters:
 *       - in: query
 *         name: exemptionType
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of issuances
 */
router.get('/exemption', hasRole(['super_admin', 'admin', 'founder', 'manager']), securityIssuanceController.getByExemptionType);

/**
 * @swagger
 * /api/v1/security-issuances/state-requirements:
 *   get:
 *     summary: Get state filing requirements
 *     tags: [Security Issuances]
 *     parameters:
 *       - in: query
 *         name: exemptionType
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: states
 *         schema:
 *           type: string
 *         description: Comma-separated list of state codes
 *     responses:
 *       200:
 *         description: State filing requirements
 */
router.get('/state-requirements', hasRole(['super_admin', 'admin', 'founder', 'manager']), securityIssuanceController.getStateFilingRequirements);

/**
 * @swagger
 * /api/v1/security-issuances/{id}:
 *   get:
 *     summary: Get security issuance by ID
 *     tags: [Security Issuances]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Security issuance details
 *       404:
 *         description: Security issuance not found
 */
router.get('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager']), securityIssuanceController.getSecurityIssuanceById);

/**
 * @swagger
 * /api/v1/security-issuances/{id}:
 *   put:
 *     summary: Update security issuance
 *     tags: [Security Issuances]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SecurityIssuance'
 *     responses:
 *       200:
 *         description: Security issuance updated
 *       404:
 *         description: Security issuance not found
 */
router.put('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager']), securityIssuanceController.updateSecurityIssuanceById);

/**
 * @swagger
 * /api/v1/security-issuances/{id}:
 *   delete:
 *     summary: Delete security issuance
 *     tags: [Security Issuances]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Security issuance deleted
 *       404:
 *         description: Security issuance not found
 */
router.delete('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager']), securityIssuanceController.deleteSecurityIssuanceById);

/**
 * @swagger
 * /api/v1/security-issuances/{id}/state-filings:
 *   post:
 *     summary: Add state filing to an issuance
 *     tags: [Security Issuances]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StateFiling'
 *     responses:
 *       200:
 *         description: State filing added
 *       404:
 *         description: Security issuance not found
 */
router.post('/:id/state-filings', hasRole(['super_admin', 'admin', 'founder', 'manager']), securityIssuanceController.addStateFiling);

/**
 * @swagger
 * /api/v1/security-issuances/{id}/state-filings/{stateCode}:
 *   put:
 *     summary: Update state filing
 *     tags: [Security Issuances]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: stateCode
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StateFiling'
 *     responses:
 *       200:
 *         description: State filing updated
 *       404:
 *         description: Security issuance or state filing not found
 */
router.put('/:id/state-filings/:stateCode', hasRole(['super_admin', 'admin', 'founder', 'manager']), securityIssuanceController.updateStateFiling);

module.exports = router;

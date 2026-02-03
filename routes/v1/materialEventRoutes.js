/**
 * MaterialEvent Routes
 * Feature: Issue #60 - Build Material Events Tracking
 *
 * API routes for material event detection and management.
 */
const express = require('express');
const router = express.Router();
const materialEventController = require('../../controllers/materialEventController');
const authMiddleware = require('../../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Material Events
 *   description: Material event detection and tracking for 409A compliance
 */

/**
 * @swagger
 * /api/v1/material-events:
 *   post:
 *     summary: Create a new material event
 *     tags: [Material Events]
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
 *               - eventType
 *               - description
 *             properties:
 *               companyId:
 *                 type: string
 *               eventType:
 *                 type: string
 *                 enum: [fundraising_round, significant_transaction, key_employee_departure, key_employee_hire, acquisition_offer, merger_discussion, major_customer_change, major_product_launch, significant_revenue_change, litigation, regulatory_change, market_condition_change, ipo_preparation, secondary_transaction, other]
 *               eventDate:
 *                 type: string
 *                 format: date
 *               description:
 *                 type: string
 *               triggersValuation:
 *                 type: boolean
 *               impactSeverity:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *     responses:
 *       201:
 *         description: Event created
 *       400:
 *         description: Invalid input
 */
router.post('/', materialEventController.createEvent);

/**
 * @swagger
 * /api/v1/material-events/action-required:
 *   get:
 *     summary: Get events requiring action
 *     tags: [Material Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *         description: Filter by company (optional)
 *     responses:
 *       200:
 *         description: List of events requiring action
 */
router.get('/action-required', materialEventController.getActionRequired);

/**
 * @swagger
 * /api/v1/material-events/valuation-triggers:
 *   get:
 *     summary: Get events that trigger 409A valuation
 *     tags: [Material Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *         description: Filter by company (optional)
 *     responses:
 *       200:
 *         description: List of valuation trigger events
 */
router.get('/valuation-triggers', materialEventController.getValuationTriggers);

/**
 * @swagger
 * /api/v1/material-events/detect/fundraising-round:
 *   post:
 *     summary: Auto-detect material event from fundraising round
 *     tags: [Material Events]
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
 *             properties:
 *               companyId:
 *                 type: string
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *               amount:
 *                 type: number
 *               closedDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Event detected and created
 */
router.post('/detect/fundraising-round', materialEventController.detectFromFundraisingRound);

/**
 * @swagger
 * /api/v1/material-events/detect/employee-change:
 *   post:
 *     summary: Auto-detect material event from employee change
 *     tags: [Material Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeData
 *               - changeType
 *             properties:
 *               employeeData:
 *                 type: object
 *                 properties:
 *                   companyId:
 *                     type: string
 *                   name:
 *                     type: string
 *                   title:
 *                     type: string
 *               changeType:
 *                 type: string
 *                 enum: [departure, hire]
 *     responses:
 *       201:
 *         description: Event detected and created
 */
router.post('/detect/employee-change', materialEventController.detectFromEmployeeChange);

/**
 * @swagger
 * /api/v1/material-events/company/{companyId}:
 *   get:
 *     summary: Get all material events for a company
 *     tags: [Material Events]
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
 *         name: eventType
 *         schema:
 *           type: string
 *       - in: query
 *         name: triggersValuation
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of material events
 */
router.get('/company/:companyId', materialEventController.getCompanyEvents);

/**
 * @swagger
 * /api/v1/material-events/company/{companyId}/summary:
 *   get:
 *     summary: Get material event summary for a company
 *     tags: [Material Events]
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
 *         description: Event summary
 */
router.get('/company/:companyId/summary', materialEventController.getCompanySummary);

/**
 * @swagger
 * /api/v1/material-events/company/{companyId}/compliance-dashboard:
 *   get:
 *     summary: Get compliance dashboard data for a company
 *     tags: [Material Events]
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
 *         description: Compliance dashboard data
 */
router.get('/company/:companyId/compliance-dashboard', materialEventController.getComplianceDashboard);

/**
 * @swagger
 * /api/v1/material-events/{eventId}:
 *   get:
 *     summary: Get a specific material event
 *     tags: [Material Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event details
 *       404:
 *         description: Event not found
 */
router.get('/:eventId', materialEventController.getEvent);

/**
 * @swagger
 * /api/v1/material-events/{eventId}:
 *   put:
 *     summary: Update a material event
 *     tags: [Material Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event updated
 */
router.put('/:eventId', materialEventController.updateEvent);

/**
 * @swagger
 * /api/v1/material-events/{eventId}/acknowledge:
 *   post:
 *     summary: Acknowledge a material event
 *     tags: [Material Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event acknowledged
 */
router.post('/:eventId/acknowledge', materialEventController.acknowledgeEvent);

/**
 * @swagger
 * /api/v1/material-events/{eventId}/action-required:
 *   post:
 *     summary: Mark event as action required
 *     tags: [Material Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               actionItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     action:
 *                       type: string
 *                     assignedTo:
 *                       type: string
 *                     dueDate:
 *                       type: string
 *                       format: date
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Event marked as action required
 */
router.post('/:eventId/action-required', materialEventController.markActionRequired);

/**
 * @swagger
 * /api/v1/material-events/{eventId}/resolve:
 *   post:
 *     summary: Resolve a material event
 *     tags: [Material Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *               valuationRequestId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Event resolved
 */
router.post('/:eventId/resolve', materialEventController.resolveEvent);

/**
 * @swagger
 * /api/v1/material-events/{eventId}/dismiss:
 *   post:
 *     summary: Dismiss a material event
 *     tags: [Material Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
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
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Event dismissed
 */
router.post('/:eventId/dismiss', materialEventController.dismissEvent);

/**
 * @swagger
 * /api/v1/material-events/{eventId}/action-items:
 *   post:
 *     summary: Add action item to event
 *     tags: [Material Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
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
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *               assignedTo:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Action item added
 */
router.post('/:eventId/action-items', materialEventController.addActionItem);

/**
 * @swagger
 * /api/v1/material-events/{eventId}/action-items/{actionItemId}/complete:
 *   post:
 *     summary: Complete an action item
 *     tags: [Material Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: actionItemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Action item completed
 */
router.post('/:eventId/action-items/:actionItemId/complete', materialEventController.completeActionItem);

module.exports = router;

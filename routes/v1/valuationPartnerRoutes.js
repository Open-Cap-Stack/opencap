/**
 * ValuationPartner Routes
 * Feature: Issue #61 - Implement Valuation Specialist Integration
 *
 * API routes for valuation partner management.
 */
const express = require('express');
const router = express.Router();
const valuationPartnerController = require('../../controllers/valuationPartnerController');
const { authenticateToken } = require('../../middleware/authMiddleware');

// Apply auth middleware
router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Valuation Partners
 *   description: Valuation specialist/firm integration and management
 */

/**
 * @swagger
 * /api/v1/valuation-partners:
 *   post:
 *     summary: Create a new valuation partner
 *     tags: [Valuation Partners]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               companyId:
 *                 type: string
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [valuation_firm, accounting_firm, independent_appraiser, consulting_firm]
 *               contacts:
 *                 type: array
 *               qualifications:
 *                 type: object
 *     responses:
 *       201:
 *         description: Partner created
 */
router.post('/', valuationPartnerController.createPartner);

/**
 * @swagger
 * /api/v1/valuation-partners:
 *   get:
 *     summary: Get all valuation partners
 *     tags: [Valuation Partners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of partners
 */
router.get('/', valuationPartnerController.getPartners);

/**
 * @swagger
 * /api/v1/valuation-partners/search:
 *   get:
 *     summary: Search valuation partners
 *     tags: [Valuation Partners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: number
 *       - in: query
 *         name: specialization
 *         schema:
 *           type: string
 *       - in: query
 *         name: maxTurnaround
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/search', valuationPartnerController.searchPartners);

/**
 * @swagger
 * /api/v1/valuation-partners/company/{companyId}/active:
 *   get:
 *     summary: Get active partners for a company
 *     tags: [Valuation Partners]
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
 *         description: List of active partners
 */
router.get('/company/:companyId/active', valuationPartnerController.getActivePartners);

/**
 * @swagger
 * /api/v1/valuation-partners/{partnerId}:
 *   get:
 *     summary: Get a specific partner
 *     tags: [Valuation Partners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Partner details
 */
router.get('/:partnerId', valuationPartnerController.getPartner);

/**
 * @swagger
 * /api/v1/valuation-partners/{partnerId}:
 *   put:
 *     summary: Update a partner
 *     tags: [Valuation Partners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Partner updated
 */
router.put('/:partnerId', valuationPartnerController.updatePartner);

/**
 * @swagger
 * /api/v1/valuation-partners/{partnerId}/summary:
 *   get:
 *     summary: Get partner summary with metrics
 *     tags: [Valuation Partners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Partner summary
 */
router.get('/:partnerId/summary', valuationPartnerController.getPartnerSummary);

/**
 * @swagger
 * /api/v1/valuation-partners/{partnerId}/activate:
 *   post:
 *     summary: Activate a partner
 *     tags: [Valuation Partners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Partner activated
 */
router.post('/:partnerId/activate', valuationPartnerController.activatePartner);

/**
 * @swagger
 * /api/v1/valuation-partners/{partnerId}/deactivate:
 *   post:
 *     summary: Deactivate a partner
 *     tags: [Valuation Partners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partnerId
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
 *         description: Partner deactivated
 */
router.post('/:partnerId/deactivate', valuationPartnerController.deactivatePartner);

/**
 * @swagger
 * /api/v1/valuation-partners/{partnerId}/contacts:
 *   post:
 *     summary: Add contact to partner
 *     tags: [Valuation Partners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partnerId
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
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               title:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contact added
 */
router.post('/:partnerId/contacts', valuationPartnerController.addContact);

/**
 * @swagger
 * /api/v1/valuation-partners/{partnerId}/contacts/{contactId}/primary:
 *   post:
 *     summary: Set primary contact
 *     tags: [Valuation Partners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Primary contact set
 */
router.post('/:partnerId/contacts/:contactId/primary', valuationPartnerController.setPrimaryContact);

/**
 * @swagger
 * /api/v1/valuation-partners/{partnerId}/calls:
 *   post:
 *     summary: Schedule a call with partner
 *     tags: [Valuation Partners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partnerId
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
 *               - title
 *               - scheduledAt
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *               duration:
 *                 type: integer
 *               participants:
 *                 type: array
 *               agenda:
 *                 type: string
 *     responses:
 *       201:
 *         description: Call scheduled
 */
router.post('/:partnerId/calls', valuationPartnerController.scheduleCall);

/**
 * @swagger
 * /api/v1/valuation-partners/{partnerId}/calls/upcoming:
 *   get:
 *     summary: Get upcoming calls
 *     tags: [Valuation Partners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of upcoming calls
 */
router.get('/:partnerId/calls/upcoming', valuationPartnerController.getUpcomingCalls);

/**
 * @swagger
 * /api/v1/valuation-partners/{partnerId}/calls/{callId}/status:
 *   put:
 *     summary: Update call status
 *     tags: [Valuation Partners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: callId
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [confirmed, completed, cancelled, rescheduled]
 *               meetingLink:
 *                 type: string
 *               notes:
 *                 type: string
 *               reason:
 *                 type: string
 *               newTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Call status updated
 */
router.put('/:partnerId/calls/:callId/status', valuationPartnerController.updateCallStatus);

/**
 * @swagger
 * /api/v1/valuation-partners/{partnerId}/communications:
 *   post:
 *     summary: Add communication record
 *     tags: [Valuation Partners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partnerId
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
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [email, call, meeting, message, document_shared]
 *               subject:
 *                 type: string
 *               content:
 *                 type: string
 *               outcome:
 *                 type: string
 *     responses:
 *       200:
 *         description: Communication added
 */
router.post('/:partnerId/communications', valuationPartnerController.addCommunication);

/**
 * @swagger
 * /api/v1/valuation-partners/{partnerId}/communications:
 *   get:
 *     summary: Get communication history
 *     tags: [Valuation Partners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Communication history
 */
router.get('/:partnerId/communications', valuationPartnerController.getCommunicationHistory);

module.exports = router;

/**
 * Termination Routes
 * Issue #81: Implement Termination Equity Workflow
 *
 * API routes for managing employee terminations,
 * exercise windows, and equity forfeitures.
 */

const express = require('express');
const router = express.Router();
const terminationController = require('../../controllers/terminationController');

/**
 * @swagger
 * tags:
 *   name: Terminations
 *   description: Employee termination and equity management
 */

/**
 * @swagger
 * /terminations:
 *   post:
 *     summary: Create a new termination record
 *     tags: [Terminations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - companyId
 *               - terminationDate
 *               - terminationType
 *             properties:
 *               employeeId:
 *                 type: string
 *               companyId:
 *                 type: string
 *               terminationDate:
 *                 type: string
 *                 format: date
 *               terminationType:
 *                 type: string
 *                 enum: [voluntary, involuntary, for_cause, layoff, retirement, death, disability]
 *               grants:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Termination created successfully
 *       400:
 *         description: Invalid request
 */
router.post('/', terminationController.createTermination);

/**
 * @swagger
 * /terminations:
 *   get:
 *     summary: Get all terminations for a company
 *     tags: [Terminations]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: terminationType
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of terminations
 */
router.get('/', terminationController.getTerminations);

/**
 * @swagger
 * /terminations/calculate-vesting:
 *   post:
 *     summary: Calculate vesting for given parameters (preview)
 *     tags: [Terminations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - grantDate
 *               - terminationDate
 *               - totalGrantedShares
 *               - vestingSchedule
 *     responses:
 *       200:
 *         description: Vesting calculation result
 */
router.post('/calculate-vesting', terminationController.calculateVesting);

/**
 * @swagger
 * /terminations/expiring-windows:
 *   get:
 *     summary: Get terminations with expiring exercise windows
 *     tags: [Terminations]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: daysUntilExpiry
 *         schema:
 *           type: integer
 *           default: 7
 *     responses:
 *       200:
 *         description: List of terminations with expiring windows
 */
router.get('/expiring-windows', terminationController.getExpiringExerciseWindows);

/**
 * @swagger
 * /terminations/{id}:
 *   get:
 *     summary: Get a termination by ID
 *     tags: [Terminations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Termination details
 *       404:
 *         description: Termination not found
 */
router.get('/:id', terminationController.getTerminationById);

/**
 * @swagger
 * /terminations/{id}:
 *   put:
 *     summary: Update a termination record
 *     tags: [Terminations]
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
 *             type: object
 *     responses:
 *       200:
 *         description: Termination updated
 *       404:
 *         description: Termination not found
 */
router.put('/:id', terminationController.updateTermination);

/**
 * @swagger
 * /terminations/{id}:
 *   delete:
 *     summary: Delete a termination record
 *     tags: [Terminations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Termination deleted
 *       404:
 *         description: Termination not found
 */
router.delete('/:id', terminationController.deleteTermination);

/**
 * @swagger
 * /terminations/{id}/exercise-window:
 *   get:
 *     summary: Get exercise window status
 *     tags: [Terminations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Exercise window status
 */
router.get('/:id/exercise-window', terminationController.getExerciseWindowStatus);

/**
 * @swagger
 * /terminations/{id}/extend-window:
 *   post:
 *     summary: Extend exercise window
 *     tags: [Terminations]
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
 *             type: object
 *             required:
 *               - additionalDays
 *             properties:
 *               additionalDays:
 *                 type: integer
 *               reason:
 *                 type: string
 *               approvedBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Exercise window extended
 *       400:
 *         description: Cannot extend expired window
 */
router.post('/:id/extend-window', terminationController.extendExerciseWindow);

/**
 * @swagger
 * /terminations/{id}/exercise:
 *   post:
 *     summary: Record share exercise
 *     tags: [Terminations]
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
 *             type: object
 *             required:
 *               - shares
 *               - exercisePrice
 *             properties:
 *               shares:
 *                 type: integer
 *               exercisePrice:
 *                 type: number
 *               fmvAtExercise:
 *                 type: number
 *     responses:
 *       200:
 *         description: Exercise recorded
 *       400:
 *         description: Exercise window expired or insufficient shares
 */
router.post('/:id/exercise', terminationController.recordExercise);

/**
 * @swagger
 * /terminations/{id}/documents:
 *   post:
 *     summary: Generate termination documents
 *     tags: [Terminations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Documents generated
 *       404:
 *         description: Termination not found
 */
router.post('/:id/documents', terminationController.generateDocuments);

/**
 * @swagger
 * /terminations/{id}/update-status:
 *   post:
 *     summary: Update termination status (check for expired windows)
 *     tags: [Terminations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Status updated
 *       404:
 *         description: Termination not found
 */
router.post('/:id/update-status', terminationController.updateStatus);

module.exports = router;

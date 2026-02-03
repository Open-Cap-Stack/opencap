/**
 * Exercise Routes
 * Feature: Issue #79 - Build Exercise Management System
 *
 * API routes for managing stock option exercise requests.
 */
const express = require('express');
const router = express.Router();
const exerciseController = require('../../controllers/exerciseController');
const { authenticateToken } = require('../../middleware/authMiddleware');

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route POST /api/v1/exercise-requests
 * @desc Create a new exercise request
 * @access Private
 */
router.post('/exercise-requests', exerciseController.createExerciseRequest);

/**
 * @route GET /api/v1/exercise-requests/:id
 * @desc Get exercise request by ID
 * @access Private
 */
router.get('/exercise-requests/:id', exerciseController.getExerciseRequestById);

/**
 * @route GET /api/v1/exercise-requests/company/:companyId
 * @desc Get all exercise requests for a company
 * @access Private
 */
router.get('/exercise-requests/company/:companyId', exerciseController.getExerciseRequestsByCompany);

/**
 * @route GET /api/v1/exercise-requests/stakeholder/:stakeholderId
 * @desc Get all exercise requests for a stakeholder
 * @access Private
 */
router.get('/exercise-requests/stakeholder/:stakeholderId', exerciseController.getExerciseRequestsByStakeholder);

/**
 * @route POST /api/v1/exercise-requests/:id/approve
 * @desc Approve an exercise request
 * @access Private (Admin)
 */
router.post('/exercise-requests/:id/approve', exerciseController.approveExerciseRequest);

/**
 * @route POST /api/v1/exercise-requests/:id/reject
 * @desc Reject an exercise request
 * @access Private (Admin)
 */
router.post('/exercise-requests/:id/reject', exerciseController.rejectExerciseRequest);

/**
 * @route POST /api/v1/exercise-requests/:id/process
 * @desc Process an approved exercise request (calculate taxes)
 * @access Private (Admin)
 */
router.post('/exercise-requests/:id/process', exerciseController.processExerciseRequest);

/**
 * @route POST /api/v1/exercise-requests/:id/complete
 * @desc Complete a processed exercise request (issue shares)
 * @access Private (Admin)
 */
router.post('/exercise-requests/:id/complete', exerciseController.completeExerciseRequest);

/**
 * @route POST /api/v1/exercise-requests/:id/cancel
 * @desc Cancel an exercise request
 * @access Private
 */
router.post('/exercise-requests/:id/cancel', exerciseController.cancelExerciseRequest);

/**
 * @route POST /api/v1/exercise-requests/check-window
 * @desc Check if exercise is within valid window
 * @access Private
 */
router.post('/exercise-requests/check-window', exerciseController.checkExerciseWindow);

/**
 * @route POST /api/v1/exercise-requests/preview
 * @desc Calculate exercise preview (costs, taxes)
 * @access Private
 */
router.post('/exercise-requests/preview', exerciseController.calculateExercisePreview);

/**
 * @route GET /api/v1/exercise-requests/grant/:equityGrantId/summary
 * @desc Get exercise summary by equity grant
 * @access Private
 */
router.get('/exercise-requests/grant/:equityGrantId/summary', exerciseController.getExerciseSummaryByGrant);

/**
 * @route GET /api/v1/exercise-requests/grant/:equityGrantId
 * @desc Get all exercises for an equity grant
 * @access Private
 */
router.get('/exercise-requests/grant/:equityGrantId', exerciseController.getExercisesByGrant);

/**
 * @route POST /api/v1/exercise-requests/validate-partial
 * @desc Validate partial exercise availability
 * @access Private
 */
router.post('/exercise-requests/validate-partial', exerciseController.validatePartialExercise);

/**
 * @route GET /api/v1/exercise-requests/company/:companyId/iso-exercises/:taxYear
 * @desc Get ISO exercises for Form 3921 generation
 * @access Private
 */
router.get('/exercise-requests/company/:companyId/iso-exercises/:taxYear', exerciseController.getISOExercisesForTaxYear);

/**
 * @route POST /api/v1/exercise-requests/:id/generate-form-3921
 * @desc Generate Form 3921 for completed ISO exercise
 * @access Private (Admin)
 */
router.post('/exercise-requests/:id/generate-form-3921', exerciseController.generateForm3921);

module.exports = router;

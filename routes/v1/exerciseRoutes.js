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
const { hasRole } = require('../../middleware/rbacMiddleware');

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route POST /api/v1/exercise-requests
 * @desc Create a new exercise request
 * @access Private
 */
router.post('/exercise-requests', hasRole(['super_admin', 'admin', 'founder', 'manager']), exerciseController.createExerciseRequest);

/**
 * @route GET /api/v1/exercise-requests/:id
 * @desc Get exercise request by ID
 * @access Private
 */
router.get('/exercise-requests/:id', hasRole(['super_admin', 'admin', 'founder', 'manager']), exerciseController.getExerciseRequestById);

/**
 * @route GET /api/v1/exercise-requests/company/:companyId
 * @desc Get all exercise requests for a company
 * @access Private
 */
router.get('/exercise-requests/company/:companyId', hasRole(['super_admin', 'admin', 'founder', 'manager']), exerciseController.getExerciseRequestsByCompany);

/**
 * @route GET /api/v1/exercise-requests/stakeholder/:stakeholderId
 * @desc Get all exercise requests for a stakeholder
 * @access Private
 */
router.get('/exercise-requests/stakeholder/:stakeholderId', hasRole(['super_admin', 'admin', 'founder', 'manager']), exerciseController.getExerciseRequestsByStakeholder);

/**
 * @route POST /api/v1/exercise-requests/:id/approve
 * @desc Approve an exercise request
 * @access Private (Admin)
 */
router.post('/exercise-requests/:id/approve', hasRole(['super_admin', 'admin', 'founder', 'manager']), exerciseController.approveExerciseRequest);

/**
 * @route POST /api/v1/exercise-requests/:id/reject
 * @desc Reject an exercise request
 * @access Private (Admin)
 */
router.post('/exercise-requests/:id/reject', hasRole(['super_admin', 'admin', 'founder', 'manager']), exerciseController.rejectExerciseRequest);

/**
 * @route POST /api/v1/exercise-requests/:id/process
 * @desc Process an approved exercise request (calculate taxes)
 * @access Private (Admin)
 */
router.post('/exercise-requests/:id/process', hasRole(['super_admin', 'admin', 'founder', 'manager']), exerciseController.processExerciseRequest);

/**
 * @route POST /api/v1/exercise-requests/:id/complete
 * @desc Complete a processed exercise request (issue shares)
 * @access Private (Admin)
 */
router.post('/exercise-requests/:id/complete', hasRole(['super_admin', 'admin', 'founder', 'manager']), exerciseController.completeExerciseRequest);

/**
 * @route POST /api/v1/exercise-requests/:id/cancel
 * @desc Cancel an exercise request
 * @access Private
 */
router.post('/exercise-requests/:id/cancel', hasRole(['super_admin', 'admin', 'founder', 'manager']), exerciseController.cancelExerciseRequest);

/**
 * @route POST /api/v1/exercise-requests/check-window
 * @desc Check if exercise is within valid window
 * @access Private
 */
router.post('/exercise-requests/check-window', hasRole(['super_admin', 'admin', 'founder', 'manager']), exerciseController.checkExerciseWindow);

/**
 * @route POST /api/v1/exercise-requests/preview
 * @desc Calculate exercise preview (costs, taxes)
 * @access Private
 */
router.post('/exercise-requests/preview', hasRole(['super_admin', 'admin', 'founder', 'manager']), exerciseController.calculateExercisePreview);

/**
 * @route GET /api/v1/exercise-requests/grant/:equityGrantId/summary
 * @desc Get exercise summary by equity grant
 * @access Private
 */
router.get('/exercise-requests/grant/:equityGrantId/summary', hasRole(['super_admin', 'admin', 'founder', 'manager']), exerciseController.getExerciseSummaryByGrant);

/**
 * @route GET /api/v1/exercise-requests/grant/:equityGrantId
 * @desc Get all exercises for an equity grant
 * @access Private
 */
router.get('/exercise-requests/grant/:equityGrantId', hasRole(['super_admin', 'admin', 'founder', 'manager']), exerciseController.getExercisesByGrant);

/**
 * @route POST /api/v1/exercise-requests/validate-partial
 * @desc Validate partial exercise availability
 * @access Private
 */
router.post('/exercise-requests/validate-partial', hasRole(['super_admin', 'admin', 'founder', 'manager']), exerciseController.validatePartialExercise);

/**
 * @route GET /api/v1/exercise-requests/company/:companyId/iso-exercises/:taxYear
 * @desc Get ISO exercises for Form 3921 generation
 * @access Private
 */
router.get('/exercise-requests/company/:companyId/iso-exercises/:taxYear', hasRole(['super_admin', 'admin', 'founder', 'manager']), exerciseController.getISOExercisesForTaxYear);

/**
 * @route POST /api/v1/exercise-requests/:id/generate-form-3921
 * @desc Generate Form 3921 for completed ISO exercise
 * @access Private (Admin)
 */
router.post('/exercise-requests/:id/generate-form-3921', hasRole(['super_admin', 'admin', 'founder', 'manager']), exerciseController.generateForm3921);

module.exports = router;

/**
 * Exercise Controller
 * Feature: Issue #79 - Build Exercise Management System
 *
 * API controller for managing stock option exercise requests.
 */
const ExerciseService = require('../services/exerciseService');
const TaxWithholdingService = require('../services/taxWithholdingService');

/**
 * Create a new exercise request
 * POST /api/v1/exercise-requests
 */
exports.createExerciseRequest = async (req, res) => {
  try {
    const {
      companyId,
      stakeholderId,
      equityGrantId,
      optionType,
      sharesRequested,
      exercisePrice,
      currentFMV,
      paymentMethod,
      employeeProfile,
      exerciseWindow,
      notes
    } = req.body;

    // Validate required fields
    if (!companyId || !stakeholderId || !equityGrantId || !optionType) {
      return res.status(400).json({
        error: 'Missing required fields: companyId, stakeholderId, equityGrantId, and optionType are required'
      });
    }

    if (!sharesRequested || sharesRequested <= 0) {
      return res.status(400).json({
        error: 'sharesRequested must be a positive number'
      });
    }

    if (exercisePrice === undefined || exercisePrice < 0) {
      return res.status(400).json({
        error: 'exercisePrice is required and cannot be negative'
      });
    }

    if (currentFMV === undefined || currentFMV < 0) {
      return res.status(400).json({
        error: 'currentFMV is required and cannot be negative'
      });
    }

    const requestData = {
      companyId,
      stakeholderId,
      equityGrantId,
      optionType,
      sharesRequested,
      exercisePrice,
      currentFMV,
      paymentMethod,
      employeeProfile,
      exerciseWindow,
      notes,
      requestedBy: req.user?.userId
    };

    const exerciseRequest = await ExerciseService.createExerciseRequest(requestData);
    res.status(201).json(exerciseRequest);
  } catch (error) {
    console.error('Error creating exercise request:', error);
    res.status(500).json({ error: 'Error creating exercise request' });
  }
};

/**
 * Get exercise request by ID
 * GET /api/v1/exercise-requests/:id
 */
exports.getExerciseRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const exerciseRequest = await ExerciseService.getExerciseRequestById(id);

    if (!exerciseRequest) {
      return res.status(404).json({ error: 'Exercise request not found' });
    }

    res.status(200).json(exerciseRequest);
  } catch (error) {
    console.error('Error fetching exercise request:', error);
    res.status(500).json({ error: 'Error fetching exercise request' });
  }
};

/**
 * Get exercise requests by company
 * GET /api/v1/exercise-requests/company/:companyId
 */
exports.getExerciseRequestsByCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { status } = req.query;

    const exerciseRequests = await ExerciseService.getExerciseRequestsByCompany(
      companyId,
      status
    );

    res.status(200).json(exerciseRequests);
  } catch (error) {
    console.error('Error fetching exercise requests:', error);
    res.status(500).json({ error: 'Error fetching exercise requests' });
  }
};

/**
 * Get exercise requests by stakeholder
 * GET /api/v1/exercise-requests/stakeholder/:stakeholderId
 */
exports.getExerciseRequestsByStakeholder = async (req, res) => {
  try {
    const { stakeholderId } = req.params;

    const exerciseRequests = await ExerciseService.getExerciseRequestsByStakeholder(
      stakeholderId
    );

    res.status(200).json(exerciseRequests);
  } catch (error) {
    console.error('Error fetching exercise requests:', error);
    res.status(500).json({ error: 'Error fetching exercise requests' });
  }
};

/**
 * Approve an exercise request
 * POST /api/v1/exercise-requests/:id/approve
 */
exports.approveExerciseRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const approvedBy = req.user?.userId;

    const exerciseRequest = await ExerciseService.approveExerciseRequest(
      id,
      approvedBy,
      notes
    );

    res.status(200).json(exerciseRequest);
  } catch (error) {
    console.error('Error approving exercise request:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Can only approve')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Error approving exercise request' });
  }
};

/**
 * Reject an exercise request
 * POST /api/v1/exercise-requests/:id/reject
 */
exports.rejectExerciseRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const rejectedBy = req.user?.userId;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const exerciseRequest = await ExerciseService.rejectExerciseRequest(
      id,
      rejectedBy,
      reason
    );

    res.status(200).json(exerciseRequest);
  } catch (error) {
    console.error('Error rejecting exercise request:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Can only reject')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Error rejecting exercise request' });
  }
};

/**
 * Process an approved exercise request
 * POST /api/v1/exercise-requests/:id/process
 */
exports.processExerciseRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const processedBy = req.user?.userId;

    const exerciseRequest = await ExerciseService.processExerciseRequest(
      id,
      processedBy
    );

    res.status(200).json(exerciseRequest);
  } catch (error) {
    console.error('Error processing exercise request:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Can only process')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Error processing exercise request' });
  }
};

/**
 * Complete a processed exercise request
 * POST /api/v1/exercise-requests/:id/complete
 */
exports.completeExerciseRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { certificateNumber, paymentReceived } = req.body;
    const completedBy = req.user?.userId;

    if (!certificateNumber) {
      return res.status(400).json({ error: 'Certificate number is required' });
    }

    const exerciseRequest = await ExerciseService.completeExerciseRequest(
      id,
      completedBy,
      { certificateNumber, paymentReceived }
    );

    res.status(200).json(exerciseRequest);
  } catch (error) {
    console.error('Error completing exercise request:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Can only complete')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Error completing exercise request' });
  }
};

/**
 * Cancel an exercise request
 * POST /api/v1/exercise-requests/:id/cancel
 */
exports.cancelExerciseRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const cancelledBy = req.user?.userId;

    const exerciseRequest = await ExerciseService.cancelExerciseRequest(
      id,
      cancelledBy,
      reason
    );

    res.status(200).json(exerciseRequest);
  } catch (error) {
    console.error('Error cancelling exercise request:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Cannot cancel')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Error cancelling exercise request' });
  }
};

/**
 * Check exercise window validity
 * POST /api/v1/exercise-requests/check-window
 */
exports.checkExerciseWindow = async (req, res) => {
  try {
    const { exerciseWindow } = req.body;

    if (!exerciseWindow) {
      return res.status(400).json({ error: 'exerciseWindow is required' });
    }

    const result = ExerciseService.checkExerciseWindow(exerciseWindow);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error checking exercise window:', error);
    res.status(500).json({ error: 'Error checking exercise window' });
  }
};

/**
 * Calculate exercise preview (tax estimates, costs)
 * POST /api/v1/exercise-requests/preview
 */
exports.calculateExercisePreview = async (req, res) => {
  try {
    const {
      sharesRequested,
      exercisePrice,
      currentFMV,
      optionType,
      employeeProfile
    } = req.body;

    // Validate required fields
    if (!sharesRequested || exercisePrice === undefined || currentFMV === undefined) {
      return res.status(400).json({
        error: 'sharesRequested, exercisePrice, and currentFMV are required'
      });
    }

    // Calculate exercise details
    const exerciseDetails = ExerciseService.calculateExerciseDetails({
      sharesRequested,
      exercisePrice,
      currentFMV
    });

    // Calculate tax estimate if employee profile provided
    let taxEstimate = null;
    if (employeeProfile && optionType) {
      const taxParams = {
        exercisePrice,
        fmvAtExercise: currentFMV,
        sharesExercised: sharesRequested,
        employeeProfile,
        ytdWages: employeeProfile.ytdWages || 0,
        ytdSocialSecurity: employeeProfile.ytdSocialSecurity || 0
      };

      if (optionType === 'ISO') {
        taxEstimate = TaxWithholdingService.calculateISOExerciseWithholding(taxParams);
      } else if (optionType === 'NSO') {
        taxEstimate = TaxWithholdingService.calculateNSOExerciseWithholding(taxParams);
      }
    }

    res.status(200).json({
      exerciseDetails,
      taxEstimate,
      preview: {
        totalCost: exerciseDetails.totalExerciseCost,
        estimatedTax: taxEstimate?.summary?.totalWithholding || 0,
        netValue: exerciseDetails.totalValue - exerciseDetails.totalExerciseCost -
          (taxEstimate?.summary?.totalWithholding || 0)
      }
    });
  } catch (error) {
    console.error('Error calculating exercise preview:', error);
    res.status(500).json({ error: 'Error calculating exercise preview' });
  }
};

/**
 * Get exercise summary by equity grant
 * GET /api/v1/exercise-requests/grant/:equityGrantId/summary
 */
exports.getExerciseSummaryByGrant = async (req, res) => {
  try {
    const { equityGrantId } = req.params;

    const summary = await ExerciseService.getExerciseSummaryByGrant(equityGrantId);

    res.status(200).json(summary);
  } catch (error) {
    console.error('Error fetching exercise summary:', error);
    res.status(500).json({ error: 'Error fetching exercise summary' });
  }
};

/**
 * Get exercises by equity grant
 * GET /api/v1/exercise-requests/grant/:equityGrantId
 */
exports.getExercisesByGrant = async (req, res) => {
  try {
    const { equityGrantId } = req.params;
    const { status } = req.query;

    const exercises = await ExerciseService.getExercisesByGrant(equityGrantId, status);

    res.status(200).json(exercises);
  } catch (error) {
    console.error('Error fetching exercises by grant:', error);
    res.status(500).json({ error: 'Error fetching exercises by grant' });
  }
};

/**
 * Validate partial exercise
 * POST /api/v1/exercise-requests/validate-partial
 */
exports.validatePartialExercise = async (req, res) => {
  try {
    const { equityGrantId, sharesRequested, vestedShares } = req.body;

    if (!equityGrantId || !sharesRequested || !vestedShares) {
      return res.status(400).json({
        error: 'equityGrantId, sharesRequested, and vestedShares are required'
      });
    }

    const validation = await ExerciseService.validatePartialExercise(
      equityGrantId,
      sharesRequested,
      vestedShares
    );

    res.status(200).json(validation);
  } catch (error) {
    console.error('Error validating partial exercise:', error);
    res.status(500).json({ error: 'Error validating partial exercise' });
  }
};

/**
 * Get ISO exercises requiring Form 3921 for tax year
 * GET /api/v1/exercise-requests/company/:companyId/iso-exercises/:taxYear
 */
exports.getISOExercisesForTaxYear = async (req, res) => {
  try {
    const { companyId, taxYear } = req.params;

    const exercises = await ExerciseService.getISOExercisesForTaxYear(
      companyId,
      parseInt(taxYear, 10)
    );

    res.status(200).json({
      companyId,
      taxYear: parseInt(taxYear, 10),
      exerciseCount: exercises.length,
      exercises
    });
  } catch (error) {
    console.error('Error fetching ISO exercises:', error);
    res.status(500).json({ error: 'Error fetching ISO exercises' });
  }
};

/**
 * Generate Form 3921 for completed ISO exercise
 * POST /api/v1/exercise-requests/:id/generate-form-3921
 */
exports.generateForm3921 = async (req, res) => {
  try {
    const { id } = req.params;
    const formData = req.body;
    const userId = req.user?.userId;

    const exerciseRequest = await ExerciseService.getExerciseRequestById(id);

    if (!exerciseRequest) {
      return res.status(404).json({ error: 'Exercise request not found' });
    }

    if (exerciseRequest.status !== 'completed') {
      return res.status(400).json({
        error: 'Form 3921 can only be generated for completed exercises'
      });
    }

    if (exerciseRequest.optionType !== 'ISO') {
      return res.status(400).json({
        error: 'Form 3921 is only required for ISO exercises'
      });
    }

    if (exerciseRequest.form3921Generated) {
      return res.status(400).json({
        error: 'Form 3921 has already been generated for this exercise',
        form3921Id: exerciseRequest.form3921Id
      });
    }

    const form3921 = await ExerciseService.generateForm3921(
      exerciseRequest,
      userId,
      formData
    );

    // Update exercise request with Form 3921 reference
    await ExerciseService.updateExerciseRequest(exerciseRequest._id, {
      form3921Id: form3921._id,
      form3921Generated: true,
      form3921GeneratedAt: new Date()
    });

    res.status(201).json({
      message: 'Form 3921 generated successfully',
      form3921
    });
  } catch (error) {
    console.error('Error generating Form 3921:', error);
    res.status(500).json({ error: 'Error generating Form 3921' });
  }
};

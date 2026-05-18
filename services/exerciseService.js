/**
 * Exercise Service
 * Feature: Issue #79 - Build Exercise Management System
 *
 * Business logic for managing stock option exercise requests
 * including workflow transitions, tax calculations, and certificate generation.
 */
const ExerciseRequest = require('../models/ExerciseRequest');
const TaxWithholdingService = require('./taxWithholdingService');
const Form3921 = require('../models/Form3921');

class ExerciseService {
  /**
   * Create a new exercise request
   * @param {Object} requestData - Exercise request data
   * @returns {Promise<Object>} Created exercise request
   */
  static async createExerciseRequest(requestData) {
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
      requestedBy,
      exerciseWindow,
      notes,
      // Partial exercise data
      grantTotalShares,
      vestedShares
    } = requestData;

    // Validation
    if (!sharesRequested || sharesRequested <= 0) {
      throw new Error('Shares requested must be greater than zero');
    }

    if (exercisePrice < 0) {
      throw new Error('Exercise price cannot be negative');
    }

    // Validate partial exercise if grant info provided
    let partialExerciseData = {};
    if (grantTotalShares !== undefined) {
      const exerciseSummary = await this.getExerciseSummaryByGrant(equityGrantId);
      const previouslyExercised = exerciseSummary.totalExercisedShares;
      const availableShares = (vestedShares || grantTotalShares) - previouslyExercised;

      if (sharesRequested > availableShares) {
        throw new Error(`Cannot exercise ${sharesRequested} shares. Only ${availableShares} shares available.`);
      }

      partialExerciseData = {
        grantTotalShares,
        previouslyExercised,
        vestedShares: vestedShares || grantTotalShares,
        remainingExercisable: availableShares - sharesRequested,
        isPartialExercise: sharesRequested < availableShares
      };
    }

    // Calculate exercise details
    const exerciseDetails = this.calculateExerciseDetails({
      sharesRequested,
      exercisePrice,
      currentFMV
    });

    // Create the exercise request via model's create method
    return await ExerciseRequest.create({
      companyId,
      stakeholderId,
      equityGrantId,
      optionType,
      exerciseDetails: {
        sharesRequested,
        exercisePrice,
        currentFMV,
        ...exerciseDetails,
        ...partialExerciseData
      },
      exerciseWindow,
      paymentMethod,
      employeeProfile,
      status: 'pending',
      requestedBy,
      requestedAt: new Date(),
      notes
    });
  }

  /**
   * Get exercise summary by grant
   * @param {string} equityGrantId - Equity grant ID
   * @returns {Promise<Object>} Exercise summary
   */
  static async getExerciseSummaryByGrant(equityGrantId) {
    return await ExerciseRequest.getExerciseSummaryByGrant(equityGrantId);
  }

  /**
   * Validate partial exercise
   * @param {string} equityGrantId - Equity grant ID
   * @param {number} sharesRequested - Shares to exercise
   * @param {number} vestedShares - Total vested shares
   * @returns {Promise<Object>} Validation result
   */
  static async validatePartialExercise(equityGrantId, sharesRequested, vestedShares) {
    const exerciseSummary = await this.getExerciseSummaryByGrant(equityGrantId);
    const previouslyExercised = exerciseSummary.totalExercisedShares;
    const availableShares = vestedShares - previouslyExercised;

    return {
      isValid: sharesRequested <= availableShares,
      availableShares,
      previouslyExercised,
      sharesRequested,
      remaining: availableShares - sharesRequested,
      message: sharesRequested > availableShares
        ? `Cannot exercise ${sharesRequested} shares. Only ${availableShares} shares available.`
        : null
    };
  }

  /**
   * Approve an exercise request
   * @param {string} requestId - Exercise request ID
   * @param {string} approvedBy - User ID of approver
   * @param {string} notes - Approval notes
   * @returns {Promise<Object>} Updated exercise request
   */
  static async approveExerciseRequest(requestId, approvedBy, notes = '') {
    const exerciseRequest = await ExerciseRequest.findById(requestId);

    if (!exerciseRequest) {
      throw new Error('Exercise request not found');
    }

    if (exerciseRequest.status !== 'pending') {
      throw new Error('Can only approve pending requests');
    }

    return await ExerciseRequest.findOneAndUpdate(
      { _id: requestId },
      {
        status: 'approved',
        approvedBy,
        approvedAt: new Date().toISOString(),
        approvalNotes: notes
      }
    );
  }

  /**
   * Reject an exercise request
   * @param {string} requestId - Exercise request ID
   * @param {string} rejectedBy - User ID of rejector
   * @param {string} reason - Rejection reason (required)
   * @returns {Promise<Object>} Updated exercise request
   */
  static async rejectExerciseRequest(requestId, rejectedBy, reason) {
    if (!reason || reason.trim() === '') {
      throw new Error('Rejection reason is required');
    }

    const exerciseRequest = await ExerciseRequest.findById(requestId);

    if (!exerciseRequest) {
      throw new Error('Exercise request not found');
    }

    if (exerciseRequest.status !== 'pending') {
      throw new Error('Can only reject pending requests');
    }

    return await ExerciseRequest.findOneAndUpdate(
      { _id: requestId },
      {
        status: 'rejected',
        rejectedBy,
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason
      }
    );
  }

  /**
   * Process an approved exercise request (calculate taxes, prepare for settlement)
   * @param {string} requestId - Exercise request ID
   * @param {string} processedBy - User ID of processor
   * @returns {Promise<Object>} Updated exercise request with tax calculations
   */
  static async processExerciseRequest(requestId, processedBy) {
    const exerciseRequest = await ExerciseRequest.findById(requestId);

    if (!exerciseRequest) {
      throw new Error('Exercise request not found');
    }

    if (exerciseRequest.status !== 'approved') {
      throw new Error('Can only process approved requests');
    }

    // Calculate tax withholding based on option type
    let taxResult;
    const { exerciseDetails, employeeProfile, optionType } = exerciseRequest;

    const taxParams = {
      exercisePrice: exerciseDetails.exercisePrice,
      fmvAtExercise: exerciseDetails.currentFMV,
      sharesExercised: exerciseDetails.sharesRequested,
      employeeProfile: employeeProfile || {
        filingStatus: 'single',
        stateCode: 'CA',
        additionalWithholding: 0,
        isSubjectToAMT: false
      },
      ytdWages: employeeProfile?.ytdWages || 0,
      ytdSocialSecurity: employeeProfile?.ytdSocialSecurity || 0
    };

    if (optionType === 'ISO') {
      taxResult = TaxWithholdingService.calculateISOExerciseWithholding(taxParams);
    } else if (optionType === 'NSO') {
      taxResult = TaxWithholdingService.calculateNSOExerciseWithholding(taxParams);
    } else {
      // Default calculation for other types
      taxResult = TaxWithholdingService.getWithholdingEstimate({
        eventType: 'nso_exercise',
        ...taxParams
      });
    }

    // Calculate shares to withhold for sell-to-cover if applicable
    const sharesToWithhold = exerciseRequest.paymentMethod === 'cashless'
      ? TaxWithholdingService.calculateSharesToWithhold(
          taxResult.summary.totalWithholding,
          exerciseDetails.currentFMV
        )
      : 0;

    // Build tax withholding data
    const taxWithholding = {
      calculated: true,
      totalWithholding: taxResult.summary.totalWithholding,
      federalWithholding: taxResult.summary.federalWithholding,
      stateWithholding: taxResult.summary.stateWithholding,
      socialSecurityWithholding: taxResult.summary.socialSecurityWithholding,
      medicareWithholding: taxResult.summary.medicareWithholding,
      additionalMedicare: taxResult.summary.additionalMedicare || 0,
      amtWithholding: optionType === 'ISO' ? taxResult.summary.totalWithholding : 0,
      sharesToWithhold,
      withholdingMethod: exerciseRequest.paymentMethod === 'cashless' ? 'sell_to_cover' : 'cash'
    };

    return await ExerciseRequest.findOneAndUpdate(
      { _id: requestId },
      {
        taxWithholding,
        status: 'processed',
        processedBy,
        processedAt: new Date().toISOString()
      }
    );
  }

  /**
   * Complete an exercise request (issue shares, generate certificate)
   * @param {string} requestId - Exercise request ID
   * @param {string} completedBy - User ID
   * @param {Object} certificateInfo - Certificate information
   * @returns {Promise<Object>} Completed exercise request
   */
  static async completeExerciseRequest(requestId, completedBy, certificateInfo) {
    const exerciseRequest = await ExerciseRequest.findById(requestId);

    if (!exerciseRequest) {
      throw new Error('Exercise request not found');
    }

    if (exerciseRequest.status !== 'processed') {
      throw new Error('Can only complete processed requests');
    }

    // Generate certificate data
    const certificateData = this.generateCertificateData(
      exerciseRequest,
      certificateInfo.certificateNumber
    );

    const updateData = {
      certificateData,
      status: 'completed',
      completedBy,
      completedAt: new Date().toISOString()
    };

    // Mark payment as received if applicable
    if (certificateInfo.paymentReceived !== false) {
      updateData.payment = {
        paymentReceived: true,
        paymentAmount: exerciseRequest.exerciseDetails.totalExerciseCost,
        paymentDate: new Date().toISOString(),
        paymentMethod: exerciseRequest.paymentMethod
      };
    }

    // Generate Form 3921 for ISO exercises (required by IRS)
    if (exerciseRequest.optionType === 'ISO' && certificateInfo.generateForm3921 !== false) {
      try {
        // Use the merged data for form generation (since we have completedAt now)
        const mergedRequest = { ...exerciseRequest, ...updateData };
        const form3921 = await this.generateForm3921(mergedRequest, completedBy, certificateInfo);
        if (form3921) {
          updateData.form3921Id = form3921._id;
          updateData.form3921Generated = true;
          updateData.form3921GeneratedAt = new Date().toISOString();
        }
      } catch (error) {
        // Log error but don't fail the completion
        console.error('Error generating Form 3921:', error);
      }
    }

    return await ExerciseRequest.findOneAndUpdate(
      { _id: requestId },
      updateData
    );
  }

  /**
   * Generate Form 3921 for ISO exercise
   * @param {Object} exerciseRequest - Completed exercise request
   * @param {string} userId - User ID
   * @param {Object} formData - Additional form data (company/employee info)
   * @returns {Promise<Object|null>} Created Form 3921 or null
   */
  static async generateForm3921(exerciseRequest, userId, formData = {}) {
    if (exerciseRequest.optionType !== 'ISO') {
      return null;
    }

    const taxYear = exerciseRequest.completedAt
      ? exerciseRequest.completedAt.getFullYear()
      : new Date().getFullYear();

    const form3921Data = {
      taxYear,
      companyId: exerciseRequest.companyId,
      employeeId: exerciseRequest.stakeholderId,
      transferor: formData.transferor || {
        name: formData.companyName || 'Company Name Required',
        ein: formData.companyEIN || '00-0000000',
        address: formData.companyAddress || {
          street: 'Address Required',
          city: 'City',
          state: 'CA',
          zipCode: '00000'
        }
      },
      transferee: formData.transferee || {
        name: formData.employeeName || 'Employee Name Required',
        ssn: formData.employeeSSN || '000-00-0000',
        address: formData.employeeAddress || {
          street: 'Address Required',
          city: 'City',
          state: 'CA',
          zipCode: '00000'
        }
      },
      exerciseDetails: {
        grantDate: formData.grantDate || exerciseRequest.createdAt,
        exerciseDate: exerciseRequest.completedAt || new Date(),
        exercisePrice: exerciseRequest.exerciseDetails.exercisePrice,
        fmvOnExercise: exerciseRequest.exerciseDetails.currentFMV,
        sharesTransferred: exerciseRequest.exerciseDetails.sharesRequested
      },
      optionGrantId: exerciseRequest.equityGrantId,
      optionExerciseId: exerciseRequest._id,
      status: 'draft',
      createdBy: userId
    };

    try {
      return await Form3921.create(form3921Data);
    } catch (error) {
      console.error('Error creating Form 3921:', error);
      throw error;
    }
  }

  /**
   * Get ISO exercises requiring Form 3921 for a tax year
   * @param {string} companyId - Company ID
   * @param {number} taxYear - Tax year
   * @returns {Promise<Array>} ISO exercises
   */
  static async getISOExercisesForTaxYear(companyId, taxYear) {
    return await ExerciseRequest.getISOExercisesForTaxYear(companyId, taxYear);
  }

  /**
   * Get exercises by equity grant
   * @param {string} equityGrantId - Equity grant ID
   * @param {string} status - Optional status filter
   * @returns {Promise<Array>} Exercise requests
   */
  static async getExercisesByGrant(equityGrantId, status = null) {
    return await ExerciseRequest.findByEquityGrant(equityGrantId, status);
  }

  /**
   * Cancel an exercise request
   * @param {string} requestId - Exercise request ID
   * @param {string} cancelledBy - User ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Cancelled exercise request
   */
  static async cancelExerciseRequest(requestId, cancelledBy, reason) {
    const exerciseRequest = await ExerciseRequest.findById(requestId);

    if (!exerciseRequest) {
      throw new Error('Exercise request not found');
    }

    if (['processed', 'completed'].includes(exerciseRequest.status)) {
      throw new Error('Cannot cancel processed or completed requests');
    }

    return await ExerciseRequest.findOneAndUpdate(
      { _id: requestId },
      {
        status: 'cancelled',
        cancelledBy,
        cancelledAt: new Date().toISOString(),
        cancellationReason: reason
      }
    );
  }

  /**
   * Get exercise request by ID
   * @param {string} requestId - Exercise request ID
   * @returns {Promise<Object|null>} Exercise request or null
   */
  static async getExerciseRequestById(requestId) {
    return await ExerciseRequest.findById(requestId);
  }

  /**
   * Get exercise requests by stakeholder
   * @param {string} stakeholderId - Stakeholder ID
   * @returns {Promise<Array>} Exercise requests
   */
  static async getExerciseRequestsByStakeholder(stakeholderId) {
    return await ExerciseRequest.find(
      { stakeholderId },
      { sort: { requestedAt: -1 } }
    );
  }

  /**
   * Get exercise requests by company
   * @param {string} companyId - Company ID
   * @param {string} status - Optional status filter
   * @returns {Promise<Array>} Exercise requests
   */
  static async getExerciseRequestsByCompany(companyId, status = null) {
    const query = { companyId };
    if (status) {
      query.status = status;
    }
    return await ExerciseRequest.find(query, { sort: { requestedAt: -1 } });
  }

  /**
   * Update an exercise request by ID
   * @param {string} requestId - Exercise request ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object>} Updated exercise request
   */
  static async updateExerciseRequest(requestId, updateData) {
    return await ExerciseRequest.findOneAndUpdate(
      { _id: requestId },
      updateData
    );
  }

  /**
   * Check if exercise is within valid window
   * @param {Object} exerciseWindow - Exercise window configuration
   * @returns {Object} Validation result with isValid and reason
   */
  static checkExerciseWindow(exerciseWindow) {
    const now = new Date();

    if (!exerciseWindow) {
      return { isValid: true, reason: null };
    }

    // Check if in blackout period
    if (exerciseWindow.windowType === 'blackout') {
      return {
        isValid: false,
        reason: 'Exercise is currently in a blackout period'
      };
    }

    // Check if window has started
    if (exerciseWindow.windowStart && new Date(exerciseWindow.windowStart) > now) {
      return {
        isValid: false,
        reason: 'Exercise window is not yet open'
      };
    }

    // Check if window has closed
    if (exerciseWindow.windowEnd && new Date(exerciseWindow.windowEnd) < now) {
      return {
        isValid: false,
        reason: 'Exercise window has closed'
      };
    }

    // Check grant expiration
    if (exerciseWindow.grantExpirationDate && new Date(exerciseWindow.grantExpirationDate) < now) {
      return {
        isValid: false,
        reason: 'Grant has expired'
      };
    }

    return { isValid: true, reason: null };
  }

  /**
   * Calculate exercise details (spread, costs, etc.)
   * @param {Object} params - Calculation parameters
   * @returns {Object} Calculated exercise details
   */
  static calculateExerciseDetails(params) {
    const { sharesRequested, exercisePrice, currentFMV } = params;

    const spread = currentFMV - exercisePrice;
    const totalSpread = spread * sharesRequested;
    const totalExerciseCost = exercisePrice * sharesRequested;
    const totalValue = currentFMV * sharesRequested;
    const isUnderwater = spread < 0;

    return {
      spread,
      totalSpread,
      totalExerciseCost,
      totalValue,
      isUnderwater
    };
  }

  /**
   * Generate certificate data for completed exercise
   * @param {Object} exerciseRequest - Exercise request document
   * @param {string} certificateNumber - Certificate number
   * @returns {Object} Certificate data
   */
  static generateCertificateData(exerciseRequest, certificateNumber) {
    const sharesIssued = exerciseRequest.exerciseDetails.sharesRequested -
      (exerciseRequest.taxWithholding?.sharesToWithhold || 0);

    return {
      certificateNumber,
      sharesIssued,
      issueDate: new Date(),
      companyId: exerciseRequest.companyId,
      holderId: exerciseRequest.stakeholderId,
      restrictionPeriod: exerciseRequest.optionType === 'ISO' ? 365 : 0, // 1 year for ISO
      restrictionEndDate: exerciseRequest.optionType === 'ISO'
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        : null
    };
  }
}

module.exports = ExerciseService;

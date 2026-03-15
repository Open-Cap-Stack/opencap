/**
 * Exercise Controller Tests
 * Feature: Issue #79 - Build Exercise Management System
 */

// Mock the exercise service
jest.mock('../../../services/exerciseService');

const ExerciseService = require('../../../services/exerciseService');

describe('ExerciseController', () => {
  let exerciseController;
  let mockReq;
  let mockRes;

  beforeAll(() => {
    exerciseController = require('../../../controllers/exerciseController');
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      params: {},
      query: {},
      user: { id: 'user-001', userId: 'user-001', companyId: 'company-123', role: 'user' }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('createExerciseRequest', () => {
    const validRequestData = {
      companyId: 'company-123',
      stakeholderId: 'stakeholder-456',
      equityGrantId: 'grant-789',
      optionType: 'ISO',
      sharesRequested: 1000,
      exercisePrice: 1.00,
      currentFMV: 10.00,
      paymentMethod: 'cash',
      employeeProfile: {
        filingStatus: 'single',
        stateCode: 'CA'
      }
    };

    it('should create exercise request successfully', async () => {
      mockReq.body = validRequestData;

      const mockCreatedRequest = {
        _id: 'request-id-123',
        exerciseRequestId: 'exr_123',
        ...validRequestData,
        status: 'pending'
      };

      ExerciseService.createExerciseRequest = jest.fn().mockResolvedValue(mockCreatedRequest);

      await exerciseController.createExerciseRequest(mockReq, mockRes);

      expect(ExerciseService.createExerciseRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          ...validRequestData,
          requestedBy: 'user-001'
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockCreatedRequest);
    });

    it('should return 400 when required fields are missing', async () => {
      mockReq.body = {
        companyId: 'company-123'
        // Missing other required fields
      };

      await exerciseController.createExerciseRequest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: expect.stringContaining('required')
      });
    });

    it('should return 400 when sharesRequested is zero or negative', async () => {
      mockReq.body = { ...validRequestData, sharesRequested: 0 };

      await exerciseController.createExerciseRequest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 when service throws error', async () => {
      mockReq.body = validRequestData;

      ExerciseService.createExerciseRequest = jest.fn().mockRejectedValue(
        new Error('Database error')
      );

      await exerciseController.createExerciseRequest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Error creating exercise request'
      });
    });
  });

  describe('getExerciseRequestById', () => {
    it('should return exercise request by id', async () => {
      mockReq.params.id = 'request-id-123';

      const mockRequest = {
        _id: 'request-id-123',
        exerciseRequestId: 'exr_123',
        status: 'pending'
      };

      ExerciseService.getExerciseRequestById = jest.fn().mockResolvedValue(mockRequest);

      await exerciseController.getExerciseRequestById(mockReq, mockRes);

      expect(ExerciseService.getExerciseRequestById).toHaveBeenCalledWith('request-id-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockRequest);
    });

    it('should return 404 when request not found', async () => {
      mockReq.params.id = 'non-existent';

      ExerciseService.getExerciseRequestById = jest.fn().mockResolvedValue(null);

      await exerciseController.getExerciseRequestById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Exercise request not found'
      });
    });

    it('should return 500 on service error', async () => {
      mockReq.params.id = 'request-id-123';

      ExerciseService.getExerciseRequestById = jest.fn().mockRejectedValue(
        new Error('Database error')
      );

      await exerciseController.getExerciseRequestById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getExerciseRequestsByCompany', () => {
    it('should return all exercise requests for a company', async () => {
      mockReq.params.companyId = 'company-123';

      const mockRequests = [
        { _id: 'request-1', status: 'pending' },
        { _id: 'request-2', status: 'approved' }
      ];

      ExerciseService.getExerciseRequestsByCompany = jest.fn().mockResolvedValue(mockRequests);

      await exerciseController.getExerciseRequestsByCompany(mockReq, mockRes);

      expect(ExerciseService.getExerciseRequestsByCompany).toHaveBeenCalledWith('company-123', undefined);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockRequests);
    });

    it('should filter by status when provided', async () => {
      mockReq.params.companyId = 'company-123';
      mockReq.query.status = 'pending';

      ExerciseService.getExerciseRequestsByCompany = jest.fn().mockResolvedValue([]);

      await exerciseController.getExerciseRequestsByCompany(mockReq, mockRes);

      expect(ExerciseService.getExerciseRequestsByCompany).toHaveBeenCalledWith('company-123', 'pending');
    });
  });

  describe('getExerciseRequestsByStakeholder', () => {
    it('should return all exercise requests for a stakeholder', async () => {
      mockReq.params.stakeholderId = 'stakeholder-456';

      const mockRequests = [
        { _id: 'request-1', status: 'completed' }
      ];

      ExerciseService.getExerciseRequestsByStakeholder = jest.fn().mockResolvedValue(mockRequests);

      await exerciseController.getExerciseRequestsByStakeholder(mockReq, mockRes);

      expect(ExerciseService.getExerciseRequestsByStakeholder).toHaveBeenCalledWith('stakeholder-456');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockRequests);
    });
  });

  describe('approveExerciseRequest', () => {
    it('should approve pending exercise request', async () => {
      mockReq.params.id = 'request-id-123';

      const mockApprovedRequest = {
        _id: 'request-id-123',
        status: 'approved',
        approvedBy: 'user-001',
        approvedAt: new Date()
      };

      ExerciseService.approveExerciseRequest = jest.fn().mockResolvedValue(mockApprovedRequest);

      await exerciseController.approveExerciseRequest(mockReq, mockRes);

      expect(ExerciseService.approveExerciseRequest).toHaveBeenCalledWith('request-id-123', 'user-001', undefined);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockApprovedRequest);
    });

    it('should return 404 when request not found', async () => {
      mockReq.params.id = 'non-existent';

      ExerciseService.approveExerciseRequest = jest.fn().mockRejectedValue(
        new Error('Exercise request not found')
      );

      await exerciseController.approveExerciseRequest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 when status transition invalid', async () => {
      mockReq.params.id = 'request-id-123';

      ExerciseService.approveExerciseRequest = jest.fn().mockRejectedValue(
        new Error('Can only approve pending requests')
      );

      await exerciseController.approveExerciseRequest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('rejectExerciseRequest', () => {
    it('should reject exercise request with reason', async () => {
      mockReq.params.id = 'request-id-123';
      mockReq.body = { reason: 'Insufficient vested shares' };

      const mockRejectedRequest = {
        _id: 'request-id-123',
        status: 'rejected',
        rejectedBy: 'user-001',
        rejectionReason: 'Insufficient vested shares'
      };

      ExerciseService.rejectExerciseRequest = jest.fn().mockResolvedValue(mockRejectedRequest);

      await exerciseController.rejectExerciseRequest(mockReq, mockRes);

      expect(ExerciseService.rejectExerciseRequest).toHaveBeenCalledWith(
        'request-id-123',
        'user-001',
        'Insufficient vested shares'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when reason is missing', async () => {
      mockReq.params.id = 'request-id-123';
      mockReq.body = {};

      await exerciseController.rejectExerciseRequest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Rejection reason is required'
      });
    });
  });

  describe('processExerciseRequest', () => {
    it('should process approved exercise request', async () => {
      mockReq.params.id = 'request-id-123';

      const mockProcessedRequest = {
        _id: 'request-id-123',
        status: 'processed',
        processedBy: 'user-001',
        processedAt: new Date(),
        taxWithholding: {
          totalWithholding: 3000,
          federalWithholding: 1980
        }
      };

      ExerciseService.processExerciseRequest = jest.fn().mockResolvedValue(mockProcessedRequest);

      await exerciseController.processExerciseRequest(mockReq, mockRes);

      expect(ExerciseService.processExerciseRequest).toHaveBeenCalledWith('request-id-123', 'user-001');
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when status is not approved', async () => {
      mockReq.params.id = 'request-id-123';

      ExerciseService.processExerciseRequest = jest.fn().mockRejectedValue(
        new Error('Can only process approved requests')
      );

      await exerciseController.processExerciseRequest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('completeExerciseRequest', () => {
    it('should complete processed request with certificate data', async () => {
      mockReq.params.id = 'request-id-123';
      mockReq.body = { certificateNumber: 'CERT-001' };

      const mockCompletedRequest = {
        _id: 'request-id-123',
        status: 'completed',
        completedBy: 'user-001',
        completedAt: new Date(),
        certificateData: {
          certificateNumber: 'CERT-001',
          sharesIssued: 1000
        }
      };

      ExerciseService.completeExerciseRequest = jest.fn().mockResolvedValue(mockCompletedRequest);

      await exerciseController.completeExerciseRequest(mockReq, mockRes);

      expect(ExerciseService.completeExerciseRequest).toHaveBeenCalledWith(
        'request-id-123',
        'user-001',
        { certificateNumber: 'CERT-001' }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when certificateNumber is missing', async () => {
      mockReq.params.id = 'request-id-123';
      mockReq.body = {};

      await exerciseController.completeExerciseRequest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('cancelExerciseRequest', () => {
    it('should cancel pending exercise request', async () => {
      mockReq.params.id = 'request-id-123';
      mockReq.body = { reason: 'User requested cancellation' };

      const mockCancelledRequest = {
        _id: 'request-id-123',
        status: 'cancelled',
        cancelledBy: 'user-001',
        cancellationReason: 'User requested cancellation'
      };

      ExerciseService.cancelExerciseRequest = jest.fn().mockResolvedValue(mockCancelledRequest);

      await exerciseController.cancelExerciseRequest(mockReq, mockRes);

      expect(ExerciseService.cancelExerciseRequest).toHaveBeenCalledWith(
        'request-id-123',
        'user-001',
        'User requested cancellation'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when request is already processed', async () => {
      mockReq.params.id = 'request-id-123';
      mockReq.body = { reason: 'Cancel please' };

      ExerciseService.cancelExerciseRequest = jest.fn().mockRejectedValue(
        new Error('Cannot cancel processed or completed requests')
      );

      await exerciseController.cancelExerciseRequest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('checkExerciseWindow', () => {
    it('should return exercise window status', async () => {
      mockReq.body = {
        exerciseWindow: {
          windowStart: new Date(Date.now() - 86400000),
          windowEnd: new Date(Date.now() + 86400000),
          windowType: 'open'
        }
      };

      ExerciseService.checkExerciseWindow = jest.fn().mockReturnValue({
        isValid: true,
        reason: null
      });

      await exerciseController.checkExerciseWindow(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        isValid: true,
        reason: null
      });
    });

    it('should return 400 when exercise window not provided', async () => {
      mockReq.body = {};

      await exerciseController.checkExerciseWindow(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('calculateExercisePreview', () => {
    it('should return exercise preview calculations', async () => {
      mockReq.body = {
        sharesRequested: 1000,
        exercisePrice: 1.00,
        currentFMV: 10.00,
        optionType: 'NSO',
        employeeProfile: {
          filingStatus: 'single',
          stateCode: 'CA'
        }
      };

      const mockPreview = {
        exerciseDetails: {
          spread: 9.00,
          totalSpread: 9000,
          totalExerciseCost: 1000
        },
        taxEstimate: {
          totalWithholding: 3000
        }
      };

      ExerciseService.calculateExerciseDetails = jest.fn().mockReturnValue(mockPreview.exerciseDetails);

      await exerciseController.calculateExercisePreview(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when required params missing', async () => {
      mockReq.body = {
        sharesRequested: 1000
        // Missing other required fields
      };

      await exerciseController.calculateExercisePreview(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getExerciseSummaryByGrant', () => {
    it('should return exercise summary for grant', async () => {
      mockReq.params.equityGrantId = 'grant-123';

      const mockSummary = {
        totalExercisedShares: 2000,
        exerciseCount: 2,
        exercises: []
      };

      ExerciseService.getExerciseSummaryByGrant = jest.fn().mockResolvedValue(mockSummary);

      await exerciseController.getExerciseSummaryByGrant(mockReq, mockRes);

      expect(ExerciseService.getExerciseSummaryByGrant).toHaveBeenCalledWith('grant-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockSummary);
    });

    it('should return 500 on service error', async () => {
      mockReq.params.equityGrantId = 'grant-123';

      ExerciseService.getExerciseSummaryByGrant = jest.fn().mockRejectedValue(new Error('Database error'));

      await exerciseController.getExerciseSummaryByGrant(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getExercisesByGrant', () => {
    it('should return exercises for grant', async () => {
      mockReq.params.equityGrantId = 'grant-123';

      const mockExercises = [
        { _id: 'ex-1', status: 'completed' }
      ];

      ExerciseService.getExercisesByGrant = jest.fn().mockResolvedValue(mockExercises);

      await exerciseController.getExercisesByGrant(mockReq, mockRes);

      expect(ExerciseService.getExercisesByGrant).toHaveBeenCalledWith('grant-123', undefined);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should filter by status when provided', async () => {
      mockReq.params.equityGrantId = 'grant-123';
      mockReq.query.status = 'completed';

      ExerciseService.getExercisesByGrant = jest.fn().mockResolvedValue([]);

      await exerciseController.getExercisesByGrant(mockReq, mockRes);

      expect(ExerciseService.getExercisesByGrant).toHaveBeenCalledWith('grant-123', 'completed');
    });
  });

  describe('validatePartialExercise', () => {
    it('should return validation result', async () => {
      mockReq.body = {
        equityGrantId: 'grant-123',
        sharesRequested: 300,
        vestedShares: 1000
      };

      const mockValidation = {
        isValid: true,
        availableShares: 500,
        remaining: 200
      };

      ExerciseService.validatePartialExercise = jest.fn().mockResolvedValue(mockValidation);

      await exerciseController.validatePartialExercise(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockValidation);
    });

    it('should return 400 when required params missing', async () => {
      mockReq.body = {
        equityGrantId: 'grant-123'
        // Missing sharesRequested and vestedShares
      };

      await exerciseController.validatePartialExercise(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getISOExercisesForTaxYear', () => {
    it('should return ISO exercises for tax year', async () => {
      mockReq.params.companyId = 'company-123';
      mockReq.params.taxYear = '2024';

      const mockExercises = [
        { _id: 'ex-1', optionType: 'ISO' }
      ];

      ExerciseService.getISOExercisesForTaxYear = jest.fn().mockResolvedValue(mockExercises);

      await exerciseController.getISOExercisesForTaxYear(mockReq, mockRes);

      expect(ExerciseService.getISOExercisesForTaxYear).toHaveBeenCalledWith('company-123', 2024);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        companyId: 'company-123',
        taxYear: 2024,
        exerciseCount: 1
      }));
    });
  });

  describe('generateForm3921', () => {
    it('should generate Form 3921 for completed ISO exercise', async () => {
      mockReq.params.id = 'request-123';
      mockReq.body = {
        companyName: 'Test Company',
        companyEIN: '12-3456789'
      };

      const mockExerciseRequest = {
        _id: 'request-123',
        status: 'completed',
        optionType: 'ISO',
        form3921Generated: false,
        save: jest.fn().mockResolvedValue({})
      };

      const mockForm3921 = {
        _id: 'form-3921-123',
        taxYear: 2024
      };

      ExerciseService.getExerciseRequestById = jest.fn().mockResolvedValue(mockExerciseRequest);
      ExerciseService.generateForm3921 = jest.fn().mockResolvedValue(mockForm3921);

      await exerciseController.generateForm3921(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Form 3921 generated successfully'
      }));
    });

    it('should return 404 when exercise not found', async () => {
      mockReq.params.id = 'non-existent';

      ExerciseService.getExerciseRequestById = jest.fn().mockResolvedValue(null);

      await exerciseController.generateForm3921(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 for non-completed exercise', async () => {
      mockReq.params.id = 'request-123';

      const mockExerciseRequest = {
        _id: 'request-123',
        status: 'pending',
        optionType: 'ISO'
      };

      ExerciseService.getExerciseRequestById = jest.fn().mockResolvedValue(mockExerciseRequest);

      await exerciseController.generateForm3921(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Form 3921 can only be generated for completed exercises'
      }));
    });

    it('should return 400 for non-ISO exercise', async () => {
      mockReq.params.id = 'request-123';

      const mockExerciseRequest = {
        _id: 'request-123',
        status: 'completed',
        optionType: 'NSO'
      };

      ExerciseService.getExerciseRequestById = jest.fn().mockResolvedValue(mockExerciseRequest);

      await exerciseController.generateForm3921(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Form 3921 is only required for ISO exercises'
      }));
    });

    it('should return 400 if Form 3921 already generated', async () => {
      mockReq.params.id = 'request-123';

      const mockExerciseRequest = {
        _id: 'request-123',
        status: 'completed',
        optionType: 'ISO',
        form3921Generated: true,
        form3921Id: 'form-123'
      };

      ExerciseService.getExerciseRequestById = jest.fn().mockResolvedValue(mockExerciseRequest);

      await exerciseController.generateForm3921(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Form 3921 has already been generated for this exercise'
      }));
    });
  });
});

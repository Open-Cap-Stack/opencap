/**
 * Exercise Service Tests
 * Feature: Issue #79 - Build Exercise Management System
 *
 * Updated for ZeroDB-compatible patterns (no Mongoose constructor/save)
 */

// Mock dependencies first
jest.mock('../../../models/ExerciseRequest', () => {
  const mock = {
    create: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    findOneAndUpdate: jest.fn(),
    getExerciseSummaryByGrant: jest.fn(),
    getISOExercisesForTaxYear: jest.fn(),
    findByEquityGrant: jest.fn(),
  };
  return mock;
});
jest.mock('../../../services/taxWithholdingService');
jest.mock('../../../models/Form3921', () => {
  return {
    create: jest.fn(),
  };
});

const ExerciseRequest = require('../../../models/ExerciseRequest');
const TaxWithholdingService = require('../../../services/taxWithholdingService');
const Form3921 = require('../../../models/Form3921');

describe('ExerciseService', () => {
  let ExerciseService;

  beforeAll(() => {
    ExerciseService = require('../../../services/exerciseService');
  });

  beforeEach(() => {
    jest.clearAllMocks();
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
        stateCode: 'CA',
        additionalWithholding: 0,
        isSubjectToAMT: false
      },
      requestedBy: 'user-001'
    };

    it('should create an exercise request with pending status', async () => {
      const mockSavedRequest = {
        _id: 'request-id-123',
        ...validRequestData,
        status: 'pending',
        exerciseRequestId: 'exr_mock-uuid'
      };

      ExerciseRequest.create.mockResolvedValue(mockSavedRequest);

      const result = await ExerciseService.createExerciseRequest(validRequestData);

      expect(result).toBeDefined();
      expect(result.status).toBe('pending');
      expect(ExerciseRequest.create).toHaveBeenCalled();
    });

    it('should calculate exercise details automatically', async () => {
      const mockSavedRequest = {
        _id: 'request-id-123',
        ...validRequestData,
        status: 'pending',
        exerciseDetails: {
          spread: 9.00,
          totalSpread: 9000,
          totalExerciseCost: 1000
        }
      };

      ExerciseRequest.create.mockResolvedValue(mockSavedRequest);

      const result = await ExerciseService.createExerciseRequest(validRequestData);

      expect(result.exerciseDetails).toBeDefined();
    });

    it('should throw error for invalid shares requested', async () => {
      const invalidData = { ...validRequestData, sharesRequested: 0 };

      await expect(ExerciseService.createExerciseRequest(invalidData))
        .rejects.toThrow();
    });

    it('should throw error for negative exercise price', async () => {
      const invalidData = { ...validRequestData, exercisePrice: -1 };

      await expect(ExerciseService.createExerciseRequest(invalidData))
        .rejects.toThrow();
    });
  });

  describe('approveExerciseRequest', () => {
    it('should change status from pending to approved', async () => {
      const mockRequest = {
        _id: 'request-id-123',
        status: 'pending'
      };

      ExerciseRequest.findById.mockResolvedValue(mockRequest);
      ExerciseRequest.findOneAndUpdate.mockResolvedValue({
        _id: 'request-id-123',
        status: 'approved',
        approvedBy: 'admin-001',
        approvedAt: new Date().toISOString()
      });

      const result = await ExerciseService.approveExerciseRequest('request-id-123', 'admin-001');

      expect(result.status).toBe('approved');
      expect(result.approvedBy).toBe('admin-001');
    });

    it('should throw error if request not found', async () => {
      ExerciseRequest.findById.mockResolvedValue(null);

      await expect(ExerciseService.approveExerciseRequest('non-existent', 'admin-001'))
        .rejects.toThrow('Exercise request not found');
    });

    it('should throw error if status is not pending', async () => {
      const mockRequest = {
        _id: 'request-id-123',
        status: 'processed'
      };

      ExerciseRequest.findById.mockResolvedValue(mockRequest);

      await expect(ExerciseService.approveExerciseRequest('request-id-123', 'admin-001'))
        .rejects.toThrow('Can only approve pending requests');
    });
  });

  describe('rejectExerciseRequest', () => {
    it('should change status from pending to rejected', async () => {
      const mockRequest = {
        _id: 'request-id-123',
        status: 'pending'
      };

      ExerciseRequest.findById.mockResolvedValue(mockRequest);
      ExerciseRequest.findOneAndUpdate.mockResolvedValue({
        _id: 'request-id-123',
        status: 'rejected',
        rejectedBy: 'admin-001',
        rejectionReason: 'Insufficient vested shares'
      });

      const result = await ExerciseService.rejectExerciseRequest(
        'request-id-123',
        'admin-001',
        'Insufficient vested shares'
      );

      expect(result.status).toBe('rejected');
      expect(result.rejectionReason).toBe('Insufficient vested shares');
    });

    it('should require rejection reason', async () => {
      const mockRequest = {
        _id: 'request-id-123',
        status: 'pending'
      };

      ExerciseRequest.findById.mockResolvedValue(mockRequest);

      await expect(ExerciseService.rejectExerciseRequest('request-id-123', 'admin-001', ''))
        .rejects.toThrow('Rejection reason is required');
    });
  });

  describe('processExerciseRequest', () => {
    it('should process approved request and calculate tax withholding', async () => {
      const mockRequest = {
        _id: 'request-id-123',
        status: 'approved',
        optionType: 'NSO',
        exerciseDetails: {
          sharesRequested: 1000,
          exercisePrice: 1.00,
          currentFMV: 10.00
        },
        employeeProfile: {
          filingStatus: 'single',
          stateCode: 'CA',
          additionalWithholding: 0,
          isSubjectToAMT: false
        },
        paymentMethod: 'cash'
      };

      ExerciseRequest.findById.mockResolvedValue(mockRequest);

      TaxWithholdingService.calculateNSOExerciseWithholding = jest.fn().mockReturnValue({
        income: { ordinaryIncome: 9000 },
        summary: {
          totalWithholding: 3000,
          federalWithholding: 1980,
          stateWithholding: 920,
          socialSecurityWithholding: 558,
          medicareWithholding: 130.5
        }
      });

      ExerciseRequest.findOneAndUpdate.mockResolvedValue({
        ...mockRequest,
        status: 'processed',
        processedAt: new Date().toISOString()
      });

      const result = await ExerciseService.processExerciseRequest('request-id-123', 'admin-001');

      expect(result.status).toBe('processed');
      expect(TaxWithholdingService.calculateNSOExerciseWithholding).toHaveBeenCalled();
    });

    it('should process ISO exercise without regular withholding', async () => {
      const mockRequest = {
        _id: 'request-id-123',
        status: 'approved',
        optionType: 'ISO',
        exerciseDetails: {
          sharesRequested: 1000,
          exercisePrice: 1.00,
          currentFMV: 10.00
        },
        employeeProfile: {
          filingStatus: 'single',
          stateCode: 'CA',
          additionalWithholding: 0,
          isSubjectToAMT: true
        },
        paymentMethod: 'cash'
      };

      ExerciseRequest.findById.mockResolvedValue(mockRequest);

      TaxWithholdingService.calculateISOExerciseWithholding = jest.fn().mockReturnValue({
        income: { amtIncome: 9000 },
        summary: {
          totalWithholding: 2340,
          federalWithholding: 0,
          stateWithholding: 0,
          socialSecurityWithholding: 0,
          medicareWithholding: 0
        }
      });

      ExerciseRequest.findOneAndUpdate.mockResolvedValue({
        ...mockRequest,
        status: 'processed',
        processedAt: new Date().toISOString()
      });

      const result = await ExerciseService.processExerciseRequest('request-id-123', 'admin-001');

      expect(result.status).toBe('processed');
      expect(TaxWithholdingService.calculateISOExerciseWithholding).toHaveBeenCalled();
    });

    it('should throw error if status is not approved', async () => {
      const mockRequest = {
        _id: 'request-id-123',
        status: 'pending'
      };

      ExerciseRequest.findById.mockResolvedValue(mockRequest);

      await expect(ExerciseService.processExerciseRequest('request-id-123', 'admin-001'))
        .rejects.toThrow('Can only process approved requests');
    });
  });

  describe('completeExerciseRequest', () => {
    it('should complete processed request and generate certificate data', async () => {
      const mockRequest = {
        _id: 'request-id-123',
        status: 'processed',
        companyId: 'company-123',
        stakeholderId: 'stakeholder-456',
        exerciseDetails: {
          sharesRequested: 1000
        },
        paymentMethod: 'cash'
      };

      ExerciseRequest.findById.mockResolvedValue(mockRequest);
      ExerciseRequest.findOneAndUpdate.mockResolvedValue({
        ...mockRequest,
        status: 'completed',
        completedAt: new Date().toISOString(),
        certificateData: {
          certificateNumber: 'CERT-001',
          sharesIssued: 1000,
          issueDate: expect.any(Date)
        }
      });

      const result = await ExerciseService.completeExerciseRequest('request-id-123', 'admin-001', {
        certificateNumber: 'CERT-001'
      });

      expect(result.status).toBe('completed');
      expect(result.certificateData).toBeDefined();
      expect(result.certificateData.certificateNumber).toBe('CERT-001');
    });

    it('should throw error if status is not processed', async () => {
      const mockRequest = {
        _id: 'request-id-123',
        status: 'approved'
      };

      ExerciseRequest.findById.mockResolvedValue(mockRequest);

      await expect(ExerciseService.completeExerciseRequest('request-id-123', 'admin-001', {}))
        .rejects.toThrow('Can only complete processed requests');
    });
  });

  describe('cancelExerciseRequest', () => {
    it('should cancel pending request', async () => {
      const mockRequest = {
        _id: 'request-id-123',
        status: 'pending'
      };

      ExerciseRequest.findById.mockResolvedValue(mockRequest);
      ExerciseRequest.findOneAndUpdate.mockResolvedValue({
        ...mockRequest,
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelledBy: 'user-001',
        cancellationReason: 'User requested cancellation'
      });

      const result = await ExerciseService.cancelExerciseRequest(
        'request-id-123',
        'user-001',
        'User requested cancellation'
      );

      expect(result.status).toBe('cancelled');
    });

    it('should throw error if request is already processed', async () => {
      const mockRequest = {
        _id: 'request-id-123',
        status: 'processed'
      };

      ExerciseRequest.findById.mockResolvedValue(mockRequest);

      await expect(ExerciseService.cancelExerciseRequest('request-id-123', 'user-001', 'reason'))
        .rejects.toThrow('Cannot cancel processed or completed requests');
    });
  });

  describe('getExerciseRequestById', () => {
    it('should return exercise request by id', async () => {
      const mockRequest = {
        _id: 'request-id-123',
        exerciseRequestId: 'exr_123',
        status: 'pending'
      };

      ExerciseRequest.findById.mockResolvedValue(mockRequest);

      const result = await ExerciseService.getExerciseRequestById('request-id-123');

      expect(result).toEqual(mockRequest);
    });

    it('should return null if not found', async () => {
      ExerciseRequest.findById.mockResolvedValue(null);

      const result = await ExerciseService.getExerciseRequestById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getExerciseRequestsByStakeholder', () => {
    it('should return all exercise requests for a stakeholder', async () => {
      const mockRequests = [
        { _id: 'request-1', status: 'pending' },
        { _id: 'request-2', status: 'completed' }
      ];

      ExerciseRequest.find.mockResolvedValue(mockRequests);

      const result = await ExerciseService.getExerciseRequestsByStakeholder('stakeholder-456');

      expect(result).toHaveLength(2);
      expect(ExerciseRequest.find).toHaveBeenCalledWith(
        { stakeholderId: 'stakeholder-456' },
        { sort: { requestedAt: -1 } }
      );
    });
  });

  describe('getExerciseRequestsByCompany', () => {
    it('should return all exercise requests for a company', async () => {
      const mockRequests = [
        { _id: 'request-1', status: 'pending' },
        { _id: 'request-2', status: 'approved' }
      ];

      ExerciseRequest.find.mockResolvedValue(mockRequests);

      const result = await ExerciseService.getExerciseRequestsByCompany('company-123');

      expect(result).toHaveLength(2);
      expect(ExerciseRequest.find).toHaveBeenCalledWith(
        { companyId: 'company-123' },
        { sort: { requestedAt: -1 } }
      );
    });

    it('should filter by status if provided', async () => {
      const mockRequests = [
        { _id: 'request-1', status: 'pending' }
      ];

      ExerciseRequest.find.mockResolvedValue(mockRequests);

      const result = await ExerciseService.getExerciseRequestsByCompany('company-123', 'pending');

      expect(ExerciseRequest.find).toHaveBeenCalledWith(
        { companyId: 'company-123', status: 'pending' },
        { sort: { requestedAt: -1 } }
      );
    });
  });

  describe('checkExerciseWindow', () => {
    it('should return true if within exercise window', () => {
      const exerciseWindow = {
        windowStart: new Date(Date.now() - 86400000), // Yesterday
        windowEnd: new Date(Date.now() + 86400000), // Tomorrow
        windowType: 'open'
      };

      const result = ExerciseService.checkExerciseWindow(exerciseWindow);

      expect(result.isValid).toBe(true);
    });

    it('should return false if before exercise window', () => {
      const exerciseWindow = {
        windowStart: new Date(Date.now() + 86400000), // Tomorrow
        windowEnd: new Date(Date.now() + 172800000), // Day after tomorrow
        windowType: 'open'
      };

      const result = ExerciseService.checkExerciseWindow(exerciseWindow);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('not yet open');
    });

    it('should return false if after exercise window', () => {
      const exerciseWindow = {
        windowStart: new Date(Date.now() - 172800000), // 2 days ago
        windowEnd: new Date(Date.now() - 86400000), // Yesterday
        windowType: 'open'
      };

      const result = ExerciseService.checkExerciseWindow(exerciseWindow);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('closed');
    });

    it('should handle blackout periods', () => {
      const exerciseWindow = {
        windowStart: new Date(Date.now() - 86400000),
        windowEnd: new Date(Date.now() + 86400000),
        windowType: 'blackout'
      };

      const result = ExerciseService.checkExerciseWindow(exerciseWindow);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('blackout');
    });
  });

  describe('calculateExerciseDetails', () => {
    it('should calculate spread and total costs correctly', () => {
      const params = {
        sharesRequested: 1000,
        exercisePrice: 1.00,
        currentFMV: 10.00
      };

      const result = ExerciseService.calculateExerciseDetails(params);

      expect(result.spread).toBe(9.00);
      expect(result.totalSpread).toBe(9000);
      expect(result.totalExerciseCost).toBe(1000);
      expect(result.totalValue).toBe(10000);
    });

    it('should handle zero spread (underwater options)', () => {
      const params = {
        sharesRequested: 1000,
        exercisePrice: 10.00,
        currentFMV: 5.00
      };

      const result = ExerciseService.calculateExerciseDetails(params);

      expect(result.spread).toBe(-5.00);
      expect(result.totalSpread).toBe(-5000);
      expect(result.isUnderwater).toBe(true);
    });
  });

  describe('generateCertificateData', () => {
    it('should generate certificate data with all required fields', () => {
      const exerciseRequest = {
        _id: 'request-123',
        companyId: 'company-123',
        stakeholderId: 'stakeholder-456',
        exerciseDetails: {
          sharesRequested: 1000
        }
      };

      const result = ExerciseService.generateCertificateData(exerciseRequest, 'CERT-001');

      expect(result.certificateNumber).toBe('CERT-001');
      expect(result.sharesIssued).toBe(1000);
      expect(result.issueDate).toBeDefined();
      expect(result.companyId).toBe('company-123');
      expect(result.holderId).toBe('stakeholder-456');
    });

    it('should subtract shares to withhold for sell-to-cover', () => {
      const exerciseRequest = {
        _id: 'request-123',
        companyId: 'company-123',
        stakeholderId: 'stakeholder-456',
        exerciseDetails: {
          sharesRequested: 1000
        },
        taxWithholding: {
          sharesToWithhold: 100
        }
      };

      const result = ExerciseService.generateCertificateData(exerciseRequest, 'CERT-001');

      expect(result.sharesIssued).toBe(900);
    });
  });

  describe('getExerciseSummaryByGrant', () => {
    it('should return exercise summary for a grant', async () => {
      const mockSummary = {
        totalExercisedShares: 2000,
        exerciseCount: 2,
        exercises: []
      };

      ExerciseRequest.getExerciseSummaryByGrant = jest.fn().mockResolvedValue(mockSummary);

      const result = await ExerciseService.getExerciseSummaryByGrant('grant-123');

      expect(result.totalExercisedShares).toBe(2000);
      expect(ExerciseRequest.getExerciseSummaryByGrant).toHaveBeenCalledWith('grant-123');
    });
  });

  describe('validatePartialExercise', () => {
    it('should return valid when shares available', async () => {
      ExerciseRequest.getExerciseSummaryByGrant = jest.fn().mockResolvedValue({
        totalExercisedShares: 500,
        exerciseCount: 1
      });

      const result = await ExerciseService.validatePartialExercise('grant-123', 300, 1000);

      expect(result.isValid).toBe(true);
      expect(result.availableShares).toBe(500);
      expect(result.remaining).toBe(200);
    });

    it('should return invalid when requesting more than available', async () => {
      ExerciseRequest.getExerciseSummaryByGrant = jest.fn().mockResolvedValue({
        totalExercisedShares: 800,
        exerciseCount: 2
      });

      const result = await ExerciseService.validatePartialExercise('grant-123', 300, 1000);

      expect(result.isValid).toBe(false);
      expect(result.availableShares).toBe(200);
      expect(result.message).toContain('Only 200 shares available');
    });
  });

  describe('createExerciseRequest with partial exercise', () => {
    it('should validate available shares when grant info provided', async () => {
      ExerciseRequest.getExerciseSummaryByGrant = jest.fn().mockResolvedValue({
        totalExercisedShares: 800,
        exerciseCount: 2
      });

      const requestData = {
        companyId: 'company-123',
        stakeholderId: 'stakeholder-456',
        equityGrantId: 'grant-789',
        optionType: 'ISO',
        sharesRequested: 300, // Only 200 available
        exercisePrice: 1.00,
        currentFMV: 10.00,
        requestedBy: 'user-001',
        grantTotalShares: 1000,
        vestedShares: 1000
      };

      await expect(ExerciseService.createExerciseRequest(requestData))
        .rejects.toThrow('Only 200 shares available');
    });

    it('should allow partial exercise when shares available', async () => {
      ExerciseRequest.getExerciseSummaryByGrant = jest.fn().mockResolvedValue({
        totalExercisedShares: 500,
        exerciseCount: 1
      });

      const mockSavedRequest = {
        _id: 'request-id-123',
        status: 'pending',
        exerciseDetails: {
          isPartialExercise: true,
          remainingExercisable: 200
        }
      };

      ExerciseRequest.create.mockResolvedValue(mockSavedRequest);

      const requestData = {
        companyId: 'company-123',
        stakeholderId: 'stakeholder-456',
        equityGrantId: 'grant-789',
        optionType: 'ISO',
        sharesRequested: 300,
        exercisePrice: 1.00,
        currentFMV: 10.00,
        requestedBy: 'user-001',
        grantTotalShares: 1000,
        vestedShares: 1000
      };

      const result = await ExerciseService.createExerciseRequest(requestData);

      expect(result.exerciseDetails.isPartialExercise).toBe(true);
    });
  });

  describe('generateForm3921', () => {
    it('should generate Form 3921 for ISO exercise', async () => {
      const exerciseRequest = {
        _id: 'request-123',
        optionType: 'ISO',
        companyId: 'company-123',
        stakeholderId: 'stakeholder-456',
        equityGrantId: 'grant-789',
        completedAt: new Date('2024-06-15'),
        exerciseDetails: {
          sharesRequested: 1000,
          exercisePrice: 1.00,
          currentFMV: 10.00
        }
      };

      const mockForm3921 = {
        _id: 'form-3921-123',
        formId: 'f3921_mock',
        taxYear: 2024
      };

      Form3921.create.mockResolvedValue(mockForm3921);

      const result = await ExerciseService.generateForm3921(
        exerciseRequest,
        'user-001',
        { companyName: 'Test Company', companyEIN: '12-3456789' }
      );

      expect(result).toBeDefined();
      expect(result.taxYear).toBe(2024);
    });

    it('should return null for non-ISO exercise', async () => {
      const exerciseRequest = {
        optionType: 'NSO'
      };

      const result = await ExerciseService.generateForm3921(exerciseRequest, 'user-001');

      expect(result).toBeNull();
    });
  });

  describe('getISOExercisesForTaxYear', () => {
    it('should call model method with correct params', async () => {
      const mockExercises = [
        { _id: 'ex-1', optionType: 'ISO' },
        { _id: 'ex-2', optionType: 'ISO' }
      ];

      ExerciseRequest.getISOExercisesForTaxYear = jest.fn().mockResolvedValue(mockExercises);

      const result = await ExerciseService.getISOExercisesForTaxYear('company-123', 2024);

      expect(result).toHaveLength(2);
      expect(ExerciseRequest.getISOExercisesForTaxYear).toHaveBeenCalledWith('company-123', 2024);
    });
  });

  describe('getExercisesByGrant', () => {
    it('should return exercises for a grant', async () => {
      const mockExercises = [
        { _id: 'ex-1', status: 'completed' },
        { _id: 'ex-2', status: 'pending' }
      ];

      ExerciseRequest.findByEquityGrant = jest.fn().mockResolvedValue(mockExercises);

      const result = await ExerciseService.getExercisesByGrant('grant-123');

      expect(result).toHaveLength(2);
      expect(ExerciseRequest.findByEquityGrant).toHaveBeenCalledWith('grant-123', null);
    });

    it('should filter by status when provided', async () => {
      ExerciseRequest.findByEquityGrant = jest.fn().mockResolvedValue([]);

      await ExerciseService.getExercisesByGrant('grant-123', 'completed');

      expect(ExerciseRequest.findByEquityGrant).toHaveBeenCalledWith('grant-123', 'completed');
    });
  });

  describe('updateExerciseRequest', () => {
    it('should update exercise request by ID', async () => {
      const mockUpdated = {
        _id: 'request-id-123',
        form3921Generated: true,
        form3921Id: 'form-123'
      };

      ExerciseRequest.findOneAndUpdate.mockResolvedValue(mockUpdated);

      const result = await ExerciseService.updateExerciseRequest('request-id-123', {
        form3921Generated: true,
        form3921Id: 'form-123'
      });

      expect(result.form3921Generated).toBe(true);
      expect(ExerciseRequest.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'request-id-123' },
        { form3921Generated: true, form3921Id: 'form-123' }
      );
    });
  });
});

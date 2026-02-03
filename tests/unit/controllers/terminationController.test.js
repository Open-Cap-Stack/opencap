/**
 * Termination Controller Unit Tests
 * Issue #81: Implement Termination Equity Workflow
 * TDD Red Phase: Tests written before implementation
 */

process.env.SKIP_DB_SETUP = 'true';

// Mock database adapter
jest.mock('../../../services/databaseAdapter', () => ({
  initialized: true,
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn()
}));

// Mock termination service
jest.mock('../../../services/terminationService', () => ({
  processTermination: jest.fn(),
  calculateVestedShares: jest.fn(),
  calculateExerciseWindow: jest.fn(),
  calculateRepurchaseRights: jest.fn(),
  getExerciseWindowStatus: jest.fn(),
  extendExerciseWindow: jest.fn(),
  recordExercise: jest.fn(),
  generateTerminationDocuments: jest.fn(),
  getTerminationsByCompany: jest.fn(),
  updateTerminationStatus: jest.fn()
}));

const httpMocks = require('node-mocks-http');
const terminationController = require('../../../controllers/terminationController');
const databaseAdapter = require('../../../services/databaseAdapter');
const terminationService = require('../../../services/terminationService');

describe('Termination Controller', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  describe('createTermination', () => {
    const validTerminationData = {
      employeeId: 'emp123',
      companyId: 'comp456',
      terminationDate: '2024-06-01',
      terminationType: 'voluntary',
      grants: [
        {
          grantId: 'grant1',
          grantDate: '2022-01-01',
          totalShares: 10000,
          vestingSchedule: {
            type: 'monthly',
            cliffMonths: 12,
            totalMonths: 48
          }
        }
      ]
    };

    it('should create a termination record successfully', async () => {
      req.body = validTerminationData;
      const mockCreatedTermination = {
        _id: 'term789',
        terminationId: 'TERM-2024-001',
        ...validTerminationData,
        vestedSharesAtTermination: 6250,
        unvestedSharesForfeited: 3750,
        status: 'exercise_window_open'
      };

      terminationService.processTermination.mockResolvedValue(mockCreatedTermination);

      await terminationController.createTermination(req, res);

      expect(terminationService.processTermination).toHaveBeenCalledWith(expect.objectContaining({
        employeeId: 'emp123',
        companyId: 'comp456',
        terminationType: 'voluntary'
      }));
      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res._getData())).toHaveProperty('terminationId');
    });

    it('should return 400 for missing required fields', async () => {
      req.body = { employeeId: 'emp123' }; // Missing required fields

      await terminationController.createTermination(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });

    it('should return 400 for invalid termination type', async () => {
      req.body = {
        ...validTerminationData,
        terminationType: 'invalid'
      };

      terminationService.processTermination.mockRejectedValue(
        new Error('Invalid termination type')
      );

      await terminationController.createTermination(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });
  });

  describe('getTerminations', () => {
    it('should return all terminations for a company', async () => {
      req.query = { companyId: 'comp456' };
      const mockTerminations = [
        { _id: 'term1', employeeId: 'emp1', status: 'completed' },
        { _id: 'term2', employeeId: 'emp2', status: 'exercise_window_open' }
      ];

      terminationService.getTerminationsByCompany.mockResolvedValue(mockTerminations);

      await terminationController.getTerminations(req, res);

      expect(terminationService.getTerminationsByCompany).toHaveBeenCalledWith('comp456', expect.any(Object));
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveLength(2);
    });

    it('should filter by status', async () => {
      req.query = { companyId: 'comp456', status: 'exercise_window_open' };
      const mockTerminations = [
        { _id: 'term2', employeeId: 'emp2', status: 'exercise_window_open' }
      ];

      terminationService.getTerminationsByCompany.mockResolvedValue(mockTerminations);

      await terminationController.getTerminations(req, res);

      expect(terminationService.getTerminationsByCompany).toHaveBeenCalledWith('comp456', {
        status: 'exercise_window_open'
      });
      expect(res.statusCode).toBe(200);
    });

    it('should return 400 if companyId is missing', async () => {
      req.query = {};

      await terminationController.getTerminations(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('error', 'companyId is required');
    });

    it('should return 500 on database error', async () => {
      req.query = { companyId: 'comp456' };
      terminationService.getTerminationsByCompany.mockRejectedValue(
        new Error('Database error')
      );

      await terminationController.getTerminations(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });
  });

  describe('getTerminationById', () => {
    it('should return termination by ID', async () => {
      req.params = { id: 'term123' };
      const mockTermination = {
        _id: 'term123',
        terminationId: 'TERM-2024-001',
        employeeId: 'emp123',
        status: 'exercise_window_open'
      };

      databaseAdapter.findById.mockResolvedValue(mockTermination);

      await terminationController.getTerminationById(req, res);

      expect(databaseAdapter.findById).toHaveBeenCalledWith('Termination', 'term123');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('terminationId', 'TERM-2024-001');
    });

    it('should return 404 if termination not found', async () => {
      req.params = { id: 'nonexistent' };
      databaseAdapter.findById.mockResolvedValue(null);

      await terminationController.getTerminationById(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Termination not found');
    });

    it('should return 500 on database error', async () => {
      req.params = { id: 'term123' };
      databaseAdapter.findById.mockRejectedValue(new Error('Database error'));

      await terminationController.getTerminationById(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });
  });

  describe('updateTermination', () => {
    it('should update termination successfully', async () => {
      req.params = { id: 'term123' };
      req.body = { notes: 'Updated notes', status: 'completed' };
      const mockUpdatedTermination = {
        _id: 'term123',
        notes: 'Updated notes',
        status: 'completed'
      };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedTermination);

      await terminationController.updateTermination(req, res);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'Termination',
        'term123',
        req.body,
        { new: true }
      );
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('status', 'completed');
    });

    it('should return 404 if termination not found', async () => {
      req.params = { id: 'nonexistent' };
      req.body = { notes: 'Updated notes' };
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(null);

      await terminationController.updateTermination(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Termination not found');
    });
  });

  describe('deleteTermination', () => {
    it('should delete termination successfully', async () => {
      req.params = { id: 'term123' };
      const mockDeletedTermination = { _id: 'term123' };

      databaseAdapter.findByIdAndDelete.mockResolvedValue(mockDeletedTermination);

      await terminationController.deleteTermination(req, res);

      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('Termination', 'term123');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Termination deleted');
    });

    it('should return 404 if termination not found', async () => {
      req.params = { id: 'nonexistent' };
      databaseAdapter.findByIdAndDelete.mockResolvedValue(null);

      await terminationController.deleteTermination(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Termination not found');
    });
  });

  describe('getExerciseWindowStatus', () => {
    it('should return exercise window status', async () => {
      req.params = { id: 'term123' };
      const mockStatus = {
        status: 'open',
        daysRemaining: 30,
        sharesAvailableToExercise: 5000
      };

      terminationService.getExerciseWindowStatus.mockResolvedValue(mockStatus);

      await terminationController.getExerciseWindowStatus(req, res);

      expect(terminationService.getExerciseWindowStatus).toHaveBeenCalledWith('term123');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('status', 'open');
    });

    it('should return 404 if termination not found', async () => {
      req.params = { id: 'nonexistent' };
      terminationService.getExerciseWindowStatus.mockRejectedValue(
        new Error('Termination not found')
      );

      await terminationController.getExerciseWindowStatus(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('extendExerciseWindow', () => {
    it('should extend exercise window successfully', async () => {
      req.params = { id: 'term123' };
      req.body = {
        additionalDays: 30,
        reason: 'Medical leave',
        approvedBy: 'admin123'
      };

      const mockUpdatedTermination = {
        _id: 'term123',
        exerciseWindowDays: 120,
        exerciseWindowExtended: true
      };

      terminationService.extendExerciseWindow.mockResolvedValue(mockUpdatedTermination);

      await terminationController.extendExerciseWindow(req, res);

      expect(terminationService.extendExerciseWindow).toHaveBeenCalledWith('term123', {
        additionalDays: 30,
        reason: 'Medical leave',
        approvedBy: 'admin123'
      });
      expect(res.statusCode).toBe(200);
    });

    it('should return 400 if window already expired', async () => {
      req.params = { id: 'term123' };
      req.body = { additionalDays: 30 };

      terminationService.extendExerciseWindow.mockRejectedValue(
        new Error('Cannot extend expired exercise window')
      );

      await terminationController.extendExerciseWindow(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('recordExercise', () => {
    it('should record share exercise successfully', async () => {
      req.params = { id: 'term123' };
      req.body = {
        shares: 2000,
        exercisePrice: 1.00,
        fmvAtExercise: 10.00
      };

      const mockUpdatedTermination = {
        _id: 'term123',
        sharesExercised: 2000
      };

      terminationService.recordExercise.mockResolvedValue(mockUpdatedTermination);

      await terminationController.recordExercise(req, res);

      expect(terminationService.recordExercise).toHaveBeenCalledWith('term123', {
        shares: 2000,
        exercisePrice: 1.00,
        fmvAtExercise: 10.00
      });
      expect(res.statusCode).toBe(200);
    });

    it('should return 400 if exercise window expired', async () => {
      req.params = { id: 'term123' };
      req.body = { shares: 2000, exercisePrice: 1.00 };

      terminationService.recordExercise.mockRejectedValue(
        new Error('Exercise window has expired')
      );

      await terminationController.recordExercise(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 if exceeding available shares', async () => {
      req.params = { id: 'term123' };
      req.body = { shares: 10000, exercisePrice: 1.00 };

      terminationService.recordExercise.mockRejectedValue(
        new Error('Insufficient shares available')
      );

      await terminationController.recordExercise(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('generateDocuments', () => {
    it('should generate termination documents', async () => {
      req.params = { id: 'term123' };
      const mockDocuments = {
        documents: [
          { type: 'termination_notice', url: '/docs/term123/notice.pdf' },
          { type: 'exercise_window_notification', url: '/docs/term123/exercise.pdf' },
          { type: 'equity_summary', url: '/docs/term123/summary.pdf' }
        ]
      };

      terminationService.generateTerminationDocuments.mockResolvedValue(mockDocuments);

      await terminationController.generateDocuments(req, res);

      expect(terminationService.generateTerminationDocuments).toHaveBeenCalledWith('term123');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).documents).toHaveLength(3);
    });

    it('should return 404 if termination not found', async () => {
      req.params = { id: 'nonexistent' };
      terminationService.generateTerminationDocuments.mockRejectedValue(
        new Error('Termination not found')
      );

      await terminationController.generateDocuments(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('calculateVesting', () => {
    it('should calculate vesting for given parameters', async () => {
      req.body = {
        grantDate: '2022-01-01',
        terminationDate: '2024-07-01',
        totalGrantedShares: 10000,
        vestingSchedule: {
          type: 'monthly',
          cliffMonths: 12,
          totalMonths: 48
        }
      };

      const mockResult = {
        vestedShares: 6250,
        unvestedShares: 3750,
        vestingPercentage: 62.5
      };

      terminationService.calculateVestedShares.mockReturnValue(mockResult);

      await terminationController.calculateVesting(req, res);

      expect(terminationService.calculateVestedShares).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('vestedShares', 6250);
    });
  });

  describe('getExpiringExerciseWindows', () => {
    it('should return terminations with expiring exercise windows', async () => {
      req.query = { companyId: 'comp456', daysUntilExpiry: '7' };
      const mockTerminations = [
        { _id: 'term1', employeeId: 'emp1', exerciseWindowEndDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) }
      ];

      databaseAdapter.find.mockResolvedValue(mockTerminations);

      await terminationController.getExpiringExerciseWindows(req, res);

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveLength(1);
    });
  });
});

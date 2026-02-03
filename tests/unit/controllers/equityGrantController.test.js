/**
 * EquityGrant Controller Unit Tests
 * Issue #77: Create Equity Grant Model and Workflow
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock must be before any requires
jest.mock('../../../services/databaseAdapter', () => ({
  initialized: true,
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  aggregate: jest.fn(),
  count: jest.fn()
}));

const httpMocks = require('node-mocks-http');
const equityGrantController = require('../../../controllers/equityGrantController');
const databaseAdapter = require('../../../services/databaseAdapter');

describe('EquityGrant Controller', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  describe('createEquityGrant', () => {
    const validGrantData = {
      grantId: 'GRANT-001',
      employeeId: 'EMP-001',
      companyId: 'COMP-001',
      grantType: 'ISO',
      numberOfShares: 10000,
      strikePrice: 1.50,
      grantDate: '2024-01-15',
      vestingSchedule: {
        vestingStartDate: '2024-01-15',
        vestingPeriodMonths: 48,
        cliffMonths: 12,
        vestingFrequency: 'monthly'
      }
    };

    it('should create an equity grant successfully', async () => {
      req.body = validGrantData;
      const mockSavedGrant = { _id: 'grant123', ...validGrantData, status: 'pending' };
      databaseAdapter.create.mockResolvedValue(mockSavedGrant);

      await equityGrantController.createEquityGrant(req, res);

      expect(databaseAdapter.create).toHaveBeenCalledWith('EquityGrant', expect.objectContaining({
        grantId: validGrantData.grantId,
        employeeId: validGrantData.employeeId
      }));
      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res._getData())).toEqual(mockSavedGrant);
    });

    it('should return 400 on validation error', async () => {
      req.body = validGrantData;
      databaseAdapter.create.mockRejectedValue(new Error('Validation error'));

      await equityGrantController.createEquityGrant(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });

    it('should return 400 when required fields are missing', async () => {
      req.body = { grantId: 'GRANT-001' }; // Missing required fields
      databaseAdapter.create.mockRejectedValue(new Error('Validation error: employeeId is required'));

      await equityGrantController.createEquityGrant(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });
  });

  describe('getEquityGrants', () => {
    it('should return all equity grants', async () => {
      const mockGrants = [
        { _id: 'grant1', grantId: 'GRANT-001', employeeId: 'EMP-001', numberOfShares: 10000 },
        { _id: 'grant2', grantId: 'GRANT-002', employeeId: 'EMP-002', numberOfShares: 5000 }
      ];
      databaseAdapter.find.mockResolvedValue(mockGrants);

      await equityGrantController.getEquityGrants(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('EquityGrant', {});
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockGrants);
    });

    it('should filter grants by employeeId', async () => {
      req.query = { employeeId: 'EMP-001' };
      const mockGrants = [
        { _id: 'grant1', grantId: 'GRANT-001', employeeId: 'EMP-001', numberOfShares: 10000 }
      ];
      databaseAdapter.find.mockResolvedValue(mockGrants);

      await equityGrantController.getEquityGrants(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('EquityGrant', { employeeId: 'EMP-001' });
      expect(res.statusCode).toBe(200);
    });

    it('should filter grants by status', async () => {
      req.query = { status: 'active' };
      const mockGrants = [
        { _id: 'grant1', grantId: 'GRANT-001', status: 'active' }
      ];
      databaseAdapter.find.mockResolvedValue(mockGrants);

      await equityGrantController.getEquityGrants(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('EquityGrant', { status: 'active' });
      expect(res.statusCode).toBe(200);
    });

    it('should filter grants by companyId', async () => {
      req.query = { companyId: 'COMP-001' };
      const mockGrants = [
        { _id: 'grant1', grantId: 'GRANT-001', companyId: 'COMP-001' }
      ];
      databaseAdapter.find.mockResolvedValue(mockGrants);

      await equityGrantController.getEquityGrants(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('EquityGrant', { companyId: 'COMP-001' });
      expect(res.statusCode).toBe(200);
    });

    it('should return empty array when no grants exist', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      await equityGrantController.getEquityGrants(req, res);

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual([]);
    });

    it('should return 500 on database error', async () => {
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await equityGrantController.getEquityGrants(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });
  });

  describe('getEquityGrantById', () => {
    it('should return equity grant by ID', async () => {
      const mockGrant = {
        _id: 'grant123',
        grantId: 'GRANT-001',
        employeeId: 'EMP-001',
        numberOfShares: 10000
      };
      req.params = { id: 'grant123' };
      databaseAdapter.findById.mockResolvedValue(mockGrant);

      await equityGrantController.getEquityGrantById(req, res);

      expect(databaseAdapter.findById).toHaveBeenCalledWith('EquityGrant', 'grant123');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockGrant);
    });

    it('should return 404 when grant not found', async () => {
      req.params = { id: 'nonexistent' };
      databaseAdapter.findById.mockResolvedValue(null);

      await equityGrantController.getEquityGrantById(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Equity grant not found');
    });

    it('should return 500 on database error', async () => {
      req.params = { id: 'grant123' };
      databaseAdapter.findById.mockRejectedValue(new Error('Database error'));

      await equityGrantController.getEquityGrantById(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });
  });

  describe('updateEquityGrant', () => {
    it('should update equity grant successfully', async () => {
      req.params = { id: 'grant123' };
      req.body = { numberOfShares: 15000 };
      const mockUpdatedGrant = {
        _id: 'grant123',
        grantId: 'GRANT-001',
        numberOfShares: 15000
      };
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedGrant);

      await equityGrantController.updateEquityGrant(req, res);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'EquityGrant',
        'grant123',
        req.body,
        { new: true }
      );
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockUpdatedGrant);
    });

    it('should return 404 when grant not found', async () => {
      req.params = { id: 'nonexistent' };
      req.body = { numberOfShares: 15000 };
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(null);

      await equityGrantController.updateEquityGrant(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Equity grant not found');
    });

    it('should return 400 on validation error', async () => {
      req.params = { id: 'grant123' };
      req.body = { numberOfShares: -1000 };
      databaseAdapter.findByIdAndUpdate.mockRejectedValue(new Error('Validation error'));

      await equityGrantController.updateEquityGrant(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });
  });

  describe('deleteEquityGrant', () => {
    it('should delete equity grant successfully', async () => {
      req.params = { id: 'grant123' };
      const mockDeletedGrant = { _id: 'grant123', grantId: 'GRANT-001' };
      databaseAdapter.findByIdAndDelete.mockResolvedValue(mockDeletedGrant);

      await equityGrantController.deleteEquityGrant(req, res);

      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('EquityGrant', 'grant123');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Equity grant deleted');
    });

    it('should return 404 when grant not found', async () => {
      req.params = { id: 'nonexistent' };
      databaseAdapter.findByIdAndDelete.mockResolvedValue(null);

      await equityGrantController.deleteEquityGrant(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Equity grant not found');
    });

    it('should return 500 on database error', async () => {
      req.params = { id: 'grant123' };
      databaseAdapter.findByIdAndDelete.mockRejectedValue(new Error('Database error'));

      await equityGrantController.deleteEquityGrant(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });
  });

  describe('updateGrantStatus', () => {
    it('should update grant status to approved', async () => {
      req.params = { id: 'grant123' };
      req.body = { status: 'approved' };
      const mockUpdatedGrant = {
        _id: 'grant123',
        grantId: 'GRANT-001',
        status: 'approved',
        approvedDate: expect.any(String)
      };
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedGrant);

      await equityGrantController.updateGrantStatus(req, res);

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).status).toBe('approved');
    });

    it('should update grant status to active', async () => {
      req.params = { id: 'grant123' };
      req.body = { status: 'active' };
      const mockUpdatedGrant = {
        _id: 'grant123',
        grantId: 'GRANT-001',
        status: 'active'
      };
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedGrant);

      await equityGrantController.updateGrantStatus(req, res);

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).status).toBe('active');
    });

    it('should update grant status to cancelled', async () => {
      req.params = { id: 'grant123' };
      req.body = { status: 'cancelled', cancellationReason: 'Employee terminated' };
      const mockUpdatedGrant = {
        _id: 'grant123',
        grantId: 'GRANT-001',
        status: 'cancelled',
        cancellationReason: 'Employee terminated'
      };
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedGrant);

      await equityGrantController.updateGrantStatus(req, res);

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).status).toBe('cancelled');
    });

    it('should return 400 for invalid status', async () => {
      req.params = { id: 'grant123' };
      req.body = { status: 'invalid_status' };

      await equityGrantController.updateGrantStatus(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });

    it('should return 404 when grant not found', async () => {
      req.params = { id: 'nonexistent' };
      req.body = { status: 'approved' };
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(null);

      await equityGrantController.updateGrantStatus(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('exerciseGrant', () => {
    it('should exercise shares from a grant', async () => {
      req.params = { id: 'grant123' };
      req.body = { sharesToExercise: 2500, exercisePrice: 5.00 };

      const mockGrant = {
        _id: 'grant123',
        grantId: 'GRANT-001',
        numberOfShares: 10000,
        exercisedShares: 0,
        status: 'active'
      };

      const mockUpdatedGrant = {
        ...mockGrant,
        exercisedShares: 2500
      };

      databaseAdapter.findById.mockResolvedValue(mockGrant);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedGrant);

      await equityGrantController.exerciseGrant(req, res);

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).exercisedShares).toBe(2500);
    });

    it('should return 400 when exercising more shares than available', async () => {
      req.params = { id: 'grant123' };
      req.body = { sharesToExercise: 15000, exercisePrice: 5.00 };

      const mockGrant = {
        _id: 'grant123',
        numberOfShares: 10000,
        exercisedShares: 0,
        status: 'active'
      };

      databaseAdapter.findById.mockResolvedValue(mockGrant);

      await equityGrantController.exerciseGrant(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });

    it('should return 400 when grant is not active', async () => {
      req.params = { id: 'grant123' };
      req.body = { sharesToExercise: 2500, exercisePrice: 5.00 };

      const mockGrant = {
        _id: 'grant123',
        numberOfShares: 10000,
        exercisedShares: 0,
        status: 'pending'
      };

      databaseAdapter.findById.mockResolvedValue(mockGrant);

      await equityGrantController.exerciseGrant(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });

    it('should return 404 when grant not found', async () => {
      req.params = { id: 'nonexistent' };
      req.body = { sharesToExercise: 2500, exercisePrice: 5.00 };

      databaseAdapter.findById.mockResolvedValue(null);

      await equityGrantController.exerciseGrant(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('getGrantsByEmployee', () => {
    it('should return all grants for an employee', async () => {
      req.params = { employeeId: 'EMP-001' };
      const mockGrants = [
        { _id: 'grant1', grantId: 'GRANT-001', employeeId: 'EMP-001', numberOfShares: 10000 },
        { _id: 'grant2', grantId: 'GRANT-002', employeeId: 'EMP-001', numberOfShares: 5000 }
      ];
      databaseAdapter.find.mockResolvedValue(mockGrants);

      await equityGrantController.getGrantsByEmployee(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('EquityGrant', { employeeId: 'EMP-001' });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveLength(2);
    });

    it('should return 500 on database error', async () => {
      req.params = { employeeId: 'EMP-001' };
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await equityGrantController.getGrantsByEmployee(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('getGrantTemplates', () => {
    it('should return available grant templates', async () => {
      await equityGrantController.getGrantTemplates(req, res);

      expect(res.statusCode).toBe(200);
      const templates = JSON.parse(res._getData());
      expect(templates).toBeInstanceOf(Array);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should include standard templates', async () => {
      await equityGrantController.getGrantTemplates(req, res);

      const templates = JSON.parse(res._getData());
      const templateNames = templates.map(t => t.name);

      expect(templateNames).toContain('Standard ISO - 4 Year Vesting');
      expect(templateNames).toContain('Standard NSO - 4 Year Vesting');
      expect(templateNames).toContain('Standard RSU - 4 Year Vesting');
    });
  });

  describe('createGrantFromTemplate', () => {
    it('should create a grant from template', async () => {
      req.body = {
        templateName: 'Standard ISO - 4 Year Vesting',
        employeeId: 'EMP-001',
        companyId: 'COMP-001',
        numberOfShares: 10000,
        strikePrice: 1.50,
        grantDate: '2024-01-15'
      };

      const mockSavedGrant = {
        _id: 'grant123',
        grantId: expect.any(String),
        employeeId: 'EMP-001',
        companyId: 'COMP-001',
        grantType: 'ISO',
        numberOfShares: 10000,
        strikePrice: 1.50,
        vestingSchedule: {
          vestingPeriodMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'monthly'
        },
        status: 'pending'
      };

      databaseAdapter.create.mockResolvedValue(mockSavedGrant);

      await equityGrantController.createGrantFromTemplate(req, res);

      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res._getData()).grantType).toBe('ISO');
    });

    it('should return 400 for invalid template name', async () => {
      req.body = {
        templateName: 'Invalid Template',
        employeeId: 'EMP-001',
        companyId: 'COMP-001',
        numberOfShares: 10000,
        strikePrice: 1.50,
        grantDate: '2024-01-15'
      };

      await equityGrantController.createGrantFromTemplate(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });
  });
});

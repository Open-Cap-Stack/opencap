/**
 * Employee Controller Tests
 *
 * Issue #20: Migrate remaining controllers to ZeroDB (Batch 2)
 *
 * Tests for the employee controller using DatabaseAdapter for ZeroDB migration
 * Follows TDD pattern: Red -> Green -> Refactor
 */

const httpMocks = require('node-mocks-http');
const employeeController = require('../../../controllers/employeeController');
const databaseAdapter = require('../../../services/databaseAdapter');

// Generate a 24-char hex string to simulate ObjectId
function generateObjectId() {
  const hex = '0123456789abcdef';
  let id = '';
  for (let i = 0; i < 24; i++) id += hex[Math.floor(Math.random() * 16)];
  return id;
}

// Mock the database adapter
jest.mock('../../../services/databaseAdapter');

describe('EmployeeController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
  });

  describe('createEmployee', () => {
    it('should create an employee successfully', async () => {
      const employeeData = {
        EmployeeID: 'EMP-001',
        Name: 'John Employee',
        Email: 'john@company.com',
        Department: 'Engineering',
        StartDate: new Date().toISOString(),
        EquityOverview: {
          TotalEquity: 10000,
          VestedEquity: 2500,
          UnvestedEquity: 7500
        }
      };

      req.body = employeeData;

      const mockCreatedEmployee = {
        _id: 'mongo_123',
        ...employeeData
      };

      databaseAdapter.create.mockResolvedValue(mockCreatedEmployee);

      await employeeController.createEmployee(req, res);

      expect(res.statusCode).toBe(201);
      expect(databaseAdapter.create).toHaveBeenCalledWith('Employee', expect.objectContaining({
        EmployeeID: 'EMP-001',
        Name: 'John Employee',
        Email: 'john@company.com'
      }));
    });

    it('should return 400 when EmployeeID is missing', async () => {
      req.body = {
        Name: 'John Employee',
        Email: 'john@company.com'
      };

      await employeeController.createEmployee(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Validation error');
      expect(data.message).toContain('EmployeeID');
    });

    it('should return 400 when Name is missing', async () => {
      req.body = {
        EmployeeID: 'EMP-001',
        Email: 'john@company.com'
      };

      await employeeController.createEmployee(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('Name');
    });

    it('should return 400 when Email is missing', async () => {
      req.body = {
        EmployeeID: 'EMP-001',
        Name: 'John Employee'
      };

      await employeeController.createEmployee(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('Email');
    });

    it('should handle duplicate EmployeeID error', async () => {
      req.body = {
        EmployeeID: 'EMP-001',
        Name: 'John Employee',
        Email: 'john@company.com'
      };

      // Simulate existing employee found
      databaseAdapter.findOne.mockResolvedValue({ EmployeeID: 'EMP-001' });

      await employeeController.createEmployee(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Duplicate key error');
    });

    it('should handle duplicate Email error', async () => {
      req.body = {
        EmployeeID: 'EMP-002',
        Name: 'Jane Employee',
        Email: 'john@company.com' // Existing email
      };

      // First check for EmployeeID - not found
      databaseAdapter.findOne.mockResolvedValueOnce(null);
      // Second check for Email - found
      databaseAdapter.findOne.mockResolvedValueOnce({ Email: 'john@company.com' });

      await employeeController.createEmployee(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should handle database errors gracefully', async () => {
      req.body = {
        EmployeeID: 'EMP-001',
        Name: 'John Employee',
        Email: 'john@company.com'
      };

      databaseAdapter.findOne.mockResolvedValue(null);
      databaseAdapter.create.mockRejectedValue(new Error('Database error'));

      await employeeController.createEmployee(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('getEmployees', () => {
    it('should return all employees with pagination', async () => {
      req.query = { page: 1, limit: 10 };
      const mockEmployees = [
        { _id: 'mongo_1', EmployeeID: 'EMP-001', Name: 'Employee One' },
        { _id: 'mongo_2', EmployeeID: 'EMP-002', Name: 'Employee Two' }
      ];

      databaseAdapter.find.mockResolvedValue(mockEmployees);

      await employeeController.getEmployees(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'Employee',
        {},
        expect.objectContaining({ skip: 0, limit: 10 })
      );
    });

    it('should use default pagination values', async () => {
      req.query = {};
      databaseAdapter.find.mockResolvedValue([]);

      await employeeController.getEmployees(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'Employee',
        {},
        expect.objectContaining({ skip: 0, limit: 10 })
      );
    });

    it('should handle page 2 with correct skip', async () => {
      req.query = { page: 2, limit: 10 };
      databaseAdapter.find.mockResolvedValue([]);

      await employeeController.getEmployees(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'Employee',
        {},
        expect.objectContaining({ skip: 10, limit: 10 })
      );
    });

    it('should handle database errors', async () => {
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await employeeController.getEmployees(req, res);

      expect(res.statusCode).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('getEmployeeById', () => {
    it('should return employee by ID', async () => {
      const validId = generateObjectId();
      req.params = { id: validId };

      const mockEmployee = {
        _id: validId,
        EmployeeID: 'EMP-001',
        Name: 'John Employee'
      };

      databaseAdapter.findById.mockResolvedValue(mockEmployee);

      await employeeController.getEmployeeById(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.findById).toHaveBeenCalledWith('Employee', validId);
    });

    it('should return 404 when employee not found', async () => {
      const validId = generateObjectId();
      req.params = { id: validId };

      databaseAdapter.findById.mockResolvedValue(null);

      await employeeController.getEmployeeById(req, res);

      expect(res.statusCode).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Not found');
      expect(data.message).toBe('Employee not found');
    });

    it('should return 400 for invalid ID format', async () => {
      req.params = { id: 'invalid-id' };

      await employeeController.getEmployeeById(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Validation error');
      expect(data.message).toBe('Invalid employee ID format');
    });

    it('should handle database errors', async () => {
      const validId = generateObjectId();
      req.params = { id: validId };

      databaseAdapter.findById.mockRejectedValue(new Error('Database error'));

      await employeeController.getEmployeeById(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('updateEmployee', () => {
    it('should update an employee successfully', async () => {
      const validId = generateObjectId();
      req.params = { id: validId };
      req.body = { Name: 'Updated Name' };

      const mockUpdatedEmployee = {
        _id: validId,
        EmployeeID: 'EMP-001',
        Name: 'Updated Name'
      };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedEmployee);

      await employeeController.updateEmployee(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'Employee',
        validId,
        req.body,
        expect.objectContaining({ new: true, runValidators: true })
      );
    });

    it('should return 400 for invalid ID format', async () => {
      req.params = { id: 'invalid-id' };
      req.body = { Name: 'Updated Name' };

      await employeeController.updateEmployee(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when no update data provided', async () => {
      const validId = generateObjectId();
      req.params = { id: validId };
      req.body = {};

      await employeeController.updateEmployee(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('No data provided for update');
    });

    it('should return 404 when employee to update not found', async () => {
      const validId = generateObjectId();
      req.params = { id: validId };
      req.body = { Name: 'Updated Name' };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(null);

      await employeeController.updateEmployee(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should validate EquityOverview nested fields', async () => {
      const validId = generateObjectId();
      req.params = { id: validId };
      req.body = {
        EquityOverview: {
          TotalEquity: 'invalid' // Should be number
        }
      };

      await employeeController.updateEmployee(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('TotalEquity must be a number');
    });

    it('should handle duplicate key errors', async () => {
      const validId = generateObjectId();
      req.params = { id: validId };
      req.body = { Email: 'existing@company.com' };

      const duplicateError = new Error('Duplicate key');
      duplicateError.code = 11000;
      duplicateError.keyPattern = { Email: 1 };

      databaseAdapter.findByIdAndUpdate.mockRejectedValue(duplicateError);

      await employeeController.updateEmployee(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Duplicate key error');
    });
  });

  describe('deleteEmployee', () => {
    it('should delete an employee successfully', async () => {
      const validId = generateObjectId();
      req.params = { id: validId };

      const mockDeletedEmployee = {
        _id: validId,
        EmployeeID: 'EMP-001'
      };

      databaseAdapter.findByIdAndDelete.mockResolvedValue(mockDeletedEmployee);

      await employeeController.deleteEmployee(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('Employee', validId);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Employee deleted successfully');
    });

    it('should return 400 for invalid ID format', async () => {
      req.params = { id: 'invalid-id' };

      await employeeController.deleteEmployee(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 404 when employee to delete not found', async () => {
      const validId = generateObjectId();
      req.params = { id: validId };

      databaseAdapter.findByIdAndDelete.mockResolvedValue(null);

      await employeeController.deleteEmployee(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should handle database errors during delete', async () => {
      const validId = generateObjectId();
      req.params = { id: validId };

      databaseAdapter.findByIdAndDelete.mockRejectedValue(new Error('Database error'));

      await employeeController.deleteEmployee(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('ZeroDB Migration Specific Tests', () => {
    it('should work in zerodb-only mode', async () => {
      req.body = {
        EmployeeID: 'EMP-001',
        Name: 'ZeroDB Employee',
        Email: 'zerodb@company.com'
      };

      const zerodbResult = {
        id: 'zero_123',
        ...req.body
      };

      databaseAdapter.findOne.mockResolvedValue(null);
      databaseAdapter.create.mockResolvedValue(zerodbResult);

      await employeeController.createEmployee(req, res);

      expect(res.statusCode).toBe(201);
    });

    it('should handle parallel mode for employee lookup', async () => {
      const validId = generateObjectId();
      req.params = { id: validId };

      const parallelResult = {
        _id: validId,
        EmployeeID: 'EMP-001',
        Name: 'Parallel Employee'
      };

      databaseAdapter.findById.mockResolvedValue(parallelResult);

      await employeeController.getEmployeeById(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.EmployeeID).toBe('EMP-001');
    });
  });
});

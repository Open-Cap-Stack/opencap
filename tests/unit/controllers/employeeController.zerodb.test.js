/**
 * Employee Controller Tests
 *
 * Issue #20: Migrate remaining controllers to ZeroDB (Batch 2)
 */

const httpMocks = require('node-mocks-http');
const employeeController = require('../../../controllers/employeeController');
const databaseAdapter = require('../../../services/databaseAdapter');
const mongoose = require('mongoose');

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
      req.body = {
        EmployeeID: 'EMP-001',
        Name: 'John Employee',
        Email: 'john@company.com'
      };

      databaseAdapter.findOne.mockResolvedValue(null);
      databaseAdapter.create.mockResolvedValue({ _id: 'mongo_123', ...req.body });

      await employeeController.createEmployee(req, res);

      expect(res.statusCode).toBe(201);
    });

    it('should return 400 when EmployeeID is missing', async () => {
      req.body = { Name: 'John', Email: 'john@company.com' };

      await employeeController.createEmployee(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 for duplicate EmployeeID', async () => {
      req.body = { EmployeeID: 'EMP-001', Name: 'John', Email: 'john@company.com' };
      databaseAdapter.findOne.mockResolvedValue({ EmployeeID: 'EMP-001' });

      await employeeController.createEmployee(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('getEmployees', () => {
    it('should return employees with pagination', async () => {
      req.query = { page: 1, limit: 10 };
      databaseAdapter.find.mockResolvedValue([{ _id: 'mongo_1', EmployeeID: 'EMP-001' }]);

      await employeeController.getEmployees(req, res);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('getEmployeeById', () => {
    it('should return employee by ID', async () => {
      const validId = new mongoose.Types.ObjectId().toString();
      req.params = { id: validId };
      databaseAdapter.findById.mockResolvedValue({ _id: validId, EmployeeID: 'EMP-001' });

      await employeeController.getEmployeeById(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should return 404 when employee not found', async () => {
      const validId = new mongoose.Types.ObjectId().toString();
      req.params = { id: validId };
      databaseAdapter.findById.mockResolvedValue(null);

      await employeeController.getEmployeeById(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for invalid ID format', async () => {
      req.params = { id: 'invalid-id' };

      await employeeController.getEmployeeById(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('updateEmployee', () => {
    it('should update an employee successfully', async () => {
      const validId = new mongoose.Types.ObjectId().toString();
      req.params = { id: validId };
      req.body = { Name: 'Updated Name' };
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ _id: validId, Name: 'Updated Name' });

      await employeeController.updateEmployee(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should return 400 for empty update data', async () => {
      const validId = new mongoose.Types.ObjectId().toString();
      req.params = { id: validId };
      req.body = {};

      await employeeController.updateEmployee(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('deleteEmployee', () => {
    it('should delete an employee successfully', async () => {
      const validId = new mongoose.Types.ObjectId().toString();
      req.params = { id: validId };
      databaseAdapter.findByIdAndDelete.mockResolvedValue({ _id: validId });

      await employeeController.deleteEmployee(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should return 404 when employee not found', async () => {
      const validId = new mongoose.Types.ObjectId().toString();
      req.params = { id: validId };
      databaseAdapter.findByIdAndDelete.mockResolvedValue(null);

      await employeeController.deleteEmployee(req, res);

      expect(res.statusCode).toBe(404);
    });
  });
});

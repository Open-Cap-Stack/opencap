/**
 * Employee Invite Controller Tests
 *
 * Phase 3: Employee invite flow and employee self-service equity API
 *
 * TDD: Tests written before implementation (Red phase)
 */

const httpMocks = require('node-mocks-http');

// Mock all external dependencies before requiring the controller
jest.mock('../../../models/User');
jest.mock('../../../services/databaseAdapter');
jest.mock('jsonwebtoken');
jest.mock('crypto');

const User = require('../../../models/User');
const databaseAdapter = require('../../../services/databaseAdapter');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const employeeInviteController = require('../../../controllers/employeeInviteController');

describe('EmployeeInviteController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();

    // Default authenticated user (admin sending invite)
    req.user = {
      userId: 'user_admin_123',
      role: 'admin',
      companyId: 'company_abc'
    };
  });

  // -------------------------------------------------------------------------
  describe('inviteEmployee', () => {
    it('should create a pending user and return inviteToken and userId', async () => {
      req.body = {
        email: 'jane@acme.com',
        firstName: 'Jane',
        lastName: 'Doe'
      };

      const fakeToken = 'abc123invitetoken';
      crypto.randomBytes = jest.fn().mockReturnValue({
        toString: jest.fn().mockReturnValue(fakeToken)
      });

      const createdUser = {
        userId: 'user_new_456',
        email: 'jane@acme.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'employee',
        status: 'pending',
        companyId: 'company_abc',
        inviteToken: fakeToken
      };

      User.findByEmail = jest.fn().mockResolvedValue(null);
      User.create = jest.fn().mockResolvedValue(createdUser);

      await employeeInviteController.inviteEmployee(req, res);

      expect(res.statusCode).toBe(201);
      const data = res._getJSONData();
      expect(data.success).toBe(true);
      expect(data.userId).toBe('user_new_456');
      expect(data.inviteToken).toBe(fakeToken);
    });

    it('should return 400 when email is missing', async () => {
      req.body = { firstName: 'Jane', lastName: 'Doe' };

      await employeeInviteController.inviteEmployee(req, res);

      expect(res.statusCode).toBe(400);
      const data = res._getJSONData();
      expect(data.error).toBeTruthy();
    });

    it('should return 409 when email already exists', async () => {
      req.body = { email: 'existing@acme.com', firstName: 'Jane', lastName: 'Doe' };

      User.findByEmail = jest.fn().mockResolvedValue({
        userId: 'user_existing',
        email: 'existing@acme.com'
      });

      await employeeInviteController.inviteEmployee(req, res);

      expect(res.statusCode).toBe(409);
      const data = res._getJSONData();
      expect(data.error).toMatch(/already exists/i);
    });

    it('should return 400 when firstName is missing', async () => {
      req.body = { email: 'jane@acme.com', lastName: 'Doe' };

      await employeeInviteController.inviteEmployee(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should attach the equityGrantId to the user record when provided', async () => {
      req.body = {
        email: 'grant@acme.com',
        firstName: 'Grant',
        lastName: 'User',
        equityGrantId: 'grant_789'
      };

      crypto.randomBytes = jest.fn().mockReturnValue({
        toString: jest.fn().mockReturnValue('token123')
      });

      User.findByEmail = jest.fn().mockResolvedValue(null);
      User.create = jest.fn().mockResolvedValue({
        userId: 'user_grant',
        email: 'grant@acme.com',
        firstName: 'Grant',
        lastName: 'User',
        role: 'employee',
        status: 'pending',
        companyId: 'company_abc',
        equityGrantId: 'grant_789',
        inviteToken: 'token123'
      });

      await employeeInviteController.inviteEmployee(req, res);

      expect(res.statusCode).toBe(201);
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({ equityGrantId: 'grant_789' })
      );
    });
  });

  // -------------------------------------------------------------------------
  describe('acceptInvite', () => {
    it('should activate user and return a JWT when token and password are valid', async () => {
      req.body = { inviteToken: 'validtoken123', password: 'SecurePass123!' };

      const pendingUser = {
        userId: 'user_pending_789',
        email: 'jane@acme.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'employee',
        status: 'pending',
        companyId: 'company_abc',
        inviteToken: 'validtoken123',
        inviteTokenExpires: new Date(Date.now() + 86400000).toISOString()
      };

      User.findOne = jest.fn().mockResolvedValue(pendingUser);
      User.findOneAndUpdate = jest.fn().mockResolvedValue({
        ...pendingUser,
        status: 'active',
        inviteToken: null
      });
      jwt.sign = jest.fn().mockReturnValue('signed.jwt.token');

      await employeeInviteController.acceptInvite(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.token).toBe('signed.jwt.token');
      expect(data.user).toBeDefined();
    });

    it('should return 400 when inviteToken is missing', async () => {
      req.body = { password: 'SecurePass123!' };

      await employeeInviteController.acceptInvite(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when password is missing', async () => {
      req.body = { inviteToken: 'sometoken' };

      await employeeInviteController.acceptInvite(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 404 when invite token does not match any user', async () => {
      req.body = { inviteToken: 'badtoken', password: 'SecurePass123!' };

      User.findOne = jest.fn().mockResolvedValue(null);

      await employeeInviteController.acceptInvite(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should return 400 when invite token is expired', async () => {
      req.body = { inviteToken: 'expiredtoken', password: 'SecurePass123!' };

      User.findOne = jest.fn().mockResolvedValue({
        userId: 'user_789',
        status: 'pending',
        inviteToken: 'expiredtoken',
        inviteTokenExpires: new Date(Date.now() - 1000).toISOString() // expired
      });

      await employeeInviteController.acceptInvite(req, res);

      expect(res.statusCode).toBe(400);
      const data = res._getJSONData();
      expect(data.error).toMatch(/expired/i);
    });
  });

  // -------------------------------------------------------------------------
  describe('listEmployees', () => {
    it('should return all employees for the authenticated company', async () => {
      const employees = [
        { userId: 'u1', role: 'employee', companyId: 'company_abc', status: 'active' },
        { userId: 'u2', role: 'employee', companyId: 'company_abc', status: 'pending' }
      ];

      User.find = jest.fn().mockResolvedValue(employees);

      await employeeInviteController.listEmployees(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(2);
    });

    it('should return 500 on database error', async () => {
      User.find = jest.fn().mockRejectedValue(new Error('DB error'));

      await employeeInviteController.listEmployees(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // -------------------------------------------------------------------------
  describe('getEmployee', () => {
    it('should return a single employee when admin requests it', async () => {
      req.params = { userId: 'user_emp_001' };

      const employee = {
        userId: 'user_emp_001',
        email: 'emp@acme.com',
        role: 'employee',
        companyId: 'company_abc',
        status: 'active'
      };

      User.findOne = jest.fn().mockResolvedValue(employee);

      await employeeInviteController.getEmployee(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.userId).toBe('user_emp_001');
    });

    it('should allow an employee to view their own record', async () => {
      req.user = { userId: 'user_self_001', role: 'employee', companyId: 'company_abc' };
      req.params = { userId: 'user_self_001' };

      const employee = {
        userId: 'user_self_001',
        email: 'self@acme.com',
        role: 'employee',
        companyId: 'company_abc',
        status: 'active'
      };

      User.findOne = jest.fn().mockResolvedValue(employee);

      await employeeInviteController.getEmployee(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should return 403 when employee tries to view another user', async () => {
      req.user = { userId: 'user_self_001', role: 'employee', companyId: 'company_abc' };
      req.params = { userId: 'user_other_002' };

      const employee = {
        userId: 'user_other_002',
        role: 'employee',
        companyId: 'company_abc'
      };

      User.findOne = jest.fn().mockResolvedValue(employee);

      await employeeInviteController.getEmployee(req, res);

      expect(res.statusCode).toBe(403);
    });

    it('should return 404 when employee is not found', async () => {
      req.params = { userId: 'user_nonexistent' };

      User.findOne = jest.fn().mockResolvedValue(null);

      await employeeInviteController.getEmployee(req, res);

      expect(res.statusCode).toBe(404);
    });
  });
});

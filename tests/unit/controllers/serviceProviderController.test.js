'use strict';

/**
 * Service Provider Controller Tests
 *
 * Phase 4: Service provider invite flow and engagement-scoped access
 *
 * TDD: Red -> Green -> Refactor
 */

const httpMocks = require('node-mocks-http');

// Mock User model before requiring controller
jest.mock('../../../models/User');
const User = require('../../../models/User');

const controller = require('../../../controllers/serviceProviderController');

function mockUser(overrides = {}) {
  return {
    userId: 'user_sp_1',
    email: 'sp@cooley.com',
    firstName: 'Jane',
    lastName: 'Doe',
    role: 'service_provider',
    status: 'pending',
    companyId: 'company_abc',
    profile: {
      firm: 'Cooley LLP',
      engagementType: 'legal',
      accessScopes: ['documents', 'compliance'],
    },
    inviteToken: 'tok_abc',
    inviteTokenExpires: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('serviceProviderController.inviteServiceProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a service provider and returns 201 with inviteToken and userId', async () => {
    const req = httpMocks.createRequest({
      method: 'POST',
      body: {
        email: 'sp@cooley.com',
        firstName: 'Jane',
        lastName: 'Doe',
        firm: 'Cooley LLP',
        engagementType: 'legal',
        accessScopes: ['documents', 'compliance'],
      },
      user: { userId: 'founder_1', companyId: 'company_abc', role: 'founder' },
    });
    const res = mockRes();

    User.findByEmail = jest.fn().mockResolvedValue(null);
    User.create = jest.fn().mockResolvedValue(mockUser());

    await controller.inviteServiceProvider(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.userId).toBeDefined();
    expect(body.inviteToken).toBeDefined();
  });

  it('returns 400 when email is missing', async () => {
    const req = httpMocks.createRequest({
      method: 'POST',
      body: { firstName: 'Jane', lastName: 'Doe', firm: 'Cooley', engagementType: 'legal', accessScopes: ['documents'] },
      user: { userId: 'admin_1', companyId: 'company_abc', role: 'admin' },
    });
    const res = mockRes();

    await controller.inviteServiceProvider(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.json.mock.calls[0][0];
    expect(body.error).toMatch(/email/i);
  });

  it('returns 400 when engagementType is missing', async () => {
    const req = httpMocks.createRequest({
      method: 'POST',
      body: { email: 'sp@cooley.com', firstName: 'Jane', lastName: 'Doe', firm: 'Cooley', accessScopes: ['documents'] },
      user: { userId: 'admin_1', companyId: 'company_abc', role: 'admin' },
    });
    const res = mockRes();

    await controller.inviteServiceProvider(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.json.mock.calls[0][0];
    expect(body.error).toMatch(/engagementType/i);
  });

  it('returns 400 when engagementType is invalid', async () => {
    const req = httpMocks.createRequest({
      method: 'POST',
      body: {
        email: 'sp@cooley.com', firstName: 'Jane', lastName: 'Doe',
        firm: 'Cooley', engagementType: 'invalid_type', accessScopes: ['documents'],
      },
      user: { userId: 'admin_1', companyId: 'company_abc', role: 'admin' },
    });
    const res = mockRes();

    await controller.inviteServiceProvider(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.json.mock.calls[0][0];
    expect(body.error).toMatch(/engagementType/i);
  });

  it('returns 409 when email already exists', async () => {
    const req = httpMocks.createRequest({
      method: 'POST',
      body: {
        email: 'sp@cooley.com', firstName: 'Jane', lastName: 'Doe',
        firm: 'Cooley', engagementType: 'legal', accessScopes: ['documents'],
      },
      user: { userId: 'admin_1', companyId: 'company_abc', role: 'admin' },
    });
    const res = mockRes();

    User.findByEmail = jest.fn().mockResolvedValue(mockUser());

    await controller.inviteServiceProvider(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    const body = res.json.mock.calls[0][0];
    expect(body.error).toMatch(/already exists/i);
  });

  it('returns 400 when accessScopes is empty', async () => {
    const req = httpMocks.createRequest({
      method: 'POST',
      body: {
        email: 'sp@cooley.com', firstName: 'Jane', lastName: 'Doe',
        firm: 'Cooley', engagementType: 'legal', accessScopes: [],
      },
      user: { userId: 'admin_1', companyId: 'company_abc', role: 'admin' },
    });
    const res = mockRes();

    await controller.inviteServiceProvider(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.json.mock.calls[0][0];
    expect(body.error).toMatch(/accessScopes/i);
  });

  it('returns 500 on unexpected error', async () => {
    const req = httpMocks.createRequest({
      method: 'POST',
      body: {
        email: 'sp@cooley.com', firstName: 'Jane', lastName: 'Doe',
        firm: 'Cooley', engagementType: 'legal', accessScopes: ['documents'],
      },
      user: { userId: 'admin_1', companyId: 'company_abc', role: 'admin' },
    });
    const res = mockRes();

    User.findByEmail = jest.fn().mockRejectedValue(new Error('DB failure'));

    await controller.inviteServiceProvider(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('serviceProviderController.acceptServiceProviderInvite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts invite, activates account, returns token and user', async () => {
    const req = httpMocks.createRequest({
      method: 'POST',
      body: { inviteToken: 'tok_abc', password: 'SecurePass1!' },
    });
    const res = mockRes();

    const sp = mockUser({ status: 'pending', inviteToken: 'tok_abc' });
    User.findOne = jest.fn().mockResolvedValue(sp);
    User.hashPassword = jest.fn().mockResolvedValue('hashed_pw');
    User.findOneAndUpdate = jest.fn().mockResolvedValue({ ...sp, status: 'active', inviteToken: null });

    await controller.acceptServiceProviderInvite(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.token).toBeDefined();
    expect(body.user).toBeDefined();
    expect(body.user.password).toBeUndefined();
  });

  it('returns 400 when inviteToken is missing', async () => {
    const req = httpMocks.createRequest({ method: 'POST', body: { password: 'SecurePass1!' } });
    const res = mockRes();

    await controller.acceptServiceProviderInvite(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toMatch(/inviteToken/i);
  });

  it('returns 400 when password is missing', async () => {
    const req = httpMocks.createRequest({ method: 'POST', body: { inviteToken: 'tok_abc' } });
    const res = mockRes();

    await controller.acceptServiceProviderInvite(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toMatch(/password/i);
  });

  it('returns 404 when token not found', async () => {
    const req = httpMocks.createRequest({ method: 'POST', body: { inviteToken: 'bad_tok', password: 'pass' } });
    const res = mockRes();

    User.findOne = jest.fn().mockResolvedValue(null);

    await controller.acceptServiceProviderInvite(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 400 when token is expired', async () => {
    const req = httpMocks.createRequest({ method: 'POST', body: { inviteToken: 'tok_abc', password: 'pass' } });
    const res = mockRes();

    const sp = mockUser({ inviteTokenExpires: new Date(Date.now() - 1000).toISOString() });
    User.findOne = jest.fn().mockResolvedValue(sp);

    await controller.acceptServiceProviderInvite(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toMatch(/expired/i);
  });
});

describe('serviceProviderController.listServiceProviders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns list of service providers for the company', async () => {
    const req = httpMocks.createRequest({
      method: 'GET',
      user: { userId: 'admin_1', companyId: 'company_abc', role: 'admin' },
    });
    const res = mockRes();

    const sp = mockUser();
    User.find = jest.fn().mockResolvedValue([sp]);
    User.toJSON = jest.fn().mockImplementation(u => ({ ...u }));

    await controller.listServiceProviders(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(1);
  });

  it('returns 500 on database error', async () => {
    const req = httpMocks.createRequest({
      method: 'GET',
      user: { userId: 'admin_1', companyId: 'company_abc', role: 'admin' },
    });
    const res = mockRes();

    User.find = jest.fn().mockRejectedValue(new Error('DB error'));

    await controller.listServiceProviders(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('serviceProviderController.getServiceProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a single service provider by userId', async () => {
    const req = httpMocks.createRequest({
      method: 'GET',
      params: { userId: 'user_sp_1' },
      user: { userId: 'admin_1', companyId: 'company_abc', role: 'admin' },
    });
    const res = mockRes();

    const sp = mockUser();
    User.findOne = jest.fn().mockResolvedValue(sp);

    await controller.getServiceProvider(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.userId).toBe('user_sp_1');
    expect(body.password).toBeUndefined();
  });

  it('returns 404 when service provider not found', async () => {
    const req = httpMocks.createRequest({
      method: 'GET',
      params: { userId: 'user_sp_999' },
      user: { userId: 'admin_1', companyId: 'company_abc', role: 'admin' },
    });
    const res = mockRes();

    User.findOne = jest.fn().mockResolvedValue(null);

    await controller.getServiceProvider(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('serviceProviderController.updateServiceProviderScopes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates accessScopes and returns updated user', async () => {
    const req = httpMocks.createRequest({
      method: 'PATCH',
      params: { userId: 'user_sp_1' },
      body: { accessScopes: ['documents', 'compliance', 'cap_table_read'] },
      user: { userId: 'admin_1', companyId: 'company_abc', role: 'admin' },
    });
    const res = mockRes();

    const sp = mockUser();
    User.findOne = jest.fn().mockResolvedValue(sp);
    User.findOneAndUpdate = jest.fn().mockResolvedValue({
      ...sp,
      profile: { ...sp.profile, accessScopes: ['documents', 'compliance', 'cap_table_read'] },
    });

    await controller.updateServiceProviderScopes(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.profile.accessScopes).toContain('cap_table_read');
  });

  it('returns 400 when accessScopes is missing from body', async () => {
    const req = httpMocks.createRequest({
      method: 'PATCH',
      params: { userId: 'user_sp_1' },
      body: {},
      user: { userId: 'admin_1', companyId: 'company_abc', role: 'admin' },
    });
    const res = mockRes();

    await controller.updateServiceProviderScopes(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toMatch(/accessScopes/i);
  });

  it('returns 404 when service provider not found', async () => {
    const req = httpMocks.createRequest({
      method: 'PATCH',
      params: { userId: 'user_sp_999' },
      body: { accessScopes: ['documents'] },
      user: { userId: 'admin_1', companyId: 'company_abc', role: 'admin' },
    });
    const res = mockRes();

    User.findOne = jest.fn().mockResolvedValue(null);

    await controller.updateServiceProviderScopes(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('serviceProviderController.revokeServiceProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('revokes access by setting status to inactive', async () => {
    const req = httpMocks.createRequest({
      method: 'DELETE',
      params: { userId: 'user_sp_1' },
      user: { userId: 'admin_1', companyId: 'company_abc', role: 'admin' },
    });
    const res = mockRes();

    const sp = mockUser();
    User.findOne = jest.fn().mockResolvedValue(sp);
    User.findOneAndUpdate = jest.fn().mockResolvedValue({ ...sp, status: 'inactive' });

    await controller.revokeServiceProvider(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });

  it('returns 404 when service provider not found', async () => {
    const req = httpMocks.createRequest({
      method: 'DELETE',
      params: { userId: 'user_sp_999' },
      user: { userId: 'admin_1', companyId: 'company_abc', role: 'admin' },
    });
    const res = mockRes();

    User.findOne = jest.fn().mockResolvedValue(null);

    await controller.revokeServiceProvider(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 500 on database error', async () => {
    const req = httpMocks.createRequest({
      method: 'DELETE',
      params: { userId: 'user_sp_1' },
      user: { userId: 'admin_1', companyId: 'company_abc', role: 'admin' },
    });
    const res = mockRes();

    User.findOne = jest.fn().mockRejectedValue(new Error('DB error'));

    await controller.revokeServiceProvider(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

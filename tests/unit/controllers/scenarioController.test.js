/**
 * Tests for scenario CRUD controller
 * Issue #176: Verify RBAC-protected CRUD stubs behave correctly
 */

const scenarioController = require('../../../controllers/scenarioController');

function makeReq(overrides = {}) {
  return {
    body: {},
    params: {},
    user: { userId: 'user-1', companyId: 'co-1', role: 'admin' },
    ...overrides
  };
}

function makeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
}

describe('scenarioController', () => {
  describe('list', () => {
    it('should return an empty array', () => {
      const req = makeReq();
      const res = makeRes();

      scenarioController.list(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe('create', () => {
    it('should return 201 with the body and a generated id', () => {
      const req = makeReq({ body: { name: 'Test Scenario', preMoney: 5000000 } });
      const res = makeRes();

      scenarioController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const data = res.json.mock.calls[0][0];
      expect(data.name).toBe('Test Scenario');
      expect(data.preMoney).toBe(5000000);
      expect(data.id).toBeDefined();
    });

    it('should use provided id when present in body', () => {
      const req = makeReq({ body: { id: 'custom-id', name: 'Scenario' } });
      const res = makeRes();

      scenarioController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const data = res.json.mock.calls[0][0];
      expect(data.id).toBe('custom-id');
    });
  });

  describe('update', () => {
    it('should return body merged with params id', () => {
      const req = makeReq({ params: { id: 'sc-123' }, body: { name: 'Updated' } });
      const res = makeRes();

      scenarioController.update(req, res);

      const data = res.json.mock.calls[0][0];
      expect(data.id).toBe('sc-123');
      expect(data.name).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should return success true', () => {
      const req = makeReq({ params: { id: 'sc-123' } });
      const res = makeRes();

      scenarioController.remove(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true });
    });
  });
});

/**
 * Stakeholder Title Field Tests
 * Issue #555: Add title/jobTitle field to Stakeholder
 *
 * Verifies that the optional `title` field is properly persisted
 * through create and update operations and returned on GET.
 */
process.env.SKIP_DB_SETUP = 'true';

jest.mock('../models/Stakeholder', () => ({
  create: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOneAndUpdate: jest.fn(),
  STAKEHOLDER_ROLES: ['founder', 'co_founder', 'employee', 'advisor', 'consultant', 'investor', 'board_member', 'service_provider', 'engineer', 'manager', 'venture_capitalist'],
  STAKEHOLDER_TYPES: ['common', 'preferred', 'option', 'warrant', 'convertible', 'rsu', 'phantom'],
  STAKEHOLDER_STATUS: ['active', 'inactive', 'pending', 'terminated', 'deceased'],
}));

const httpMocks = require('node-mocks-http');
const stakeholderController = require('../controllers/stakeholderController');
const Stakeholder = require('../models/Stakeholder');

describe('Stakeholder title field (Issue #555)', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    req.user = { companyId: 'company_1', _id: 'user_1' };
    jest.clearAllMocks();
  });

  describe('createStakeholder with title', () => {
    it('should create a stakeholder with a title and return it in the response', async () => {
      const input = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'employee',
        companyId: 'company_1',
        title: 'VP Engineering',
      };

      const mockCreated = {
        _id: 'sh_1',
        stakeholderId: 'stakeholder_abc',
        ...input,
        status: 'active',
        totalGrantedShares: 0,
      };

      req.body = input;
      Stakeholder.create.mockResolvedValue(mockCreated);

      await stakeholderController.createStakeholder(req, res);

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res._getData());
      expect(body.title).toBe('VP Engineering');

      // Verify the title was passed to the model
      expect(Stakeholder.create).toHaveBeenCalledTimes(1);
      const createArg = Stakeholder.create.mock.calls[0][0];
      expect(createArg.title).toBe('VP Engineering');
    });

    it('should create a stakeholder without title (title is optional)', async () => {
      const input = {
        name: 'John Smith',
        email: 'john@example.com',
        role: 'advisor',
        companyId: 'company_1',
      };

      const mockCreated = {
        _id: 'sh_2',
        stakeholderId: 'stakeholder_def',
        ...input,
        status: 'active',
        totalGrantedShares: 0,
      };

      req.body = input;
      Stakeholder.create.mockResolvedValue(mockCreated);

      await stakeholderController.createStakeholder(req, res);

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res._getData());
      expect(body.title).toBeUndefined();
    });
  });

  describe('getStakeholderById returns title', () => {
    it('should return stakeholder with title field present', async () => {
      const mockStakeholder = {
        _id: 'sh_1',
        stakeholderId: 'stakeholder_abc',
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'employee',
        companyId: 'company_1',
        title: 'VP Engineering',
        status: 'active',
        totalGrantedShares: 100,
      };

      req.params = { id: 'sh_1' };
      Stakeholder.findById.mockResolvedValue(mockStakeholder);

      await stakeholderController.getStakeholderById(req, res);

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res._getData());
      expect(body.stakeholder).toBeDefined();
      expect(body.stakeholder.title).toBe('VP Engineering');
    });
  });

  describe('updateStakeholderById with title', () => {
    it('should update the title field on an existing stakeholder', async () => {
      const existing = {
        _id: 'sh_1',
        stakeholderId: 'stakeholder_abc',
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'employee',
        companyId: 'company_1',
        title: 'VP Engineering',
        status: 'active',
      };

      const updated = {
        ...existing,
        title: 'SVP Platform Engineering',
      };

      req.params = { id: 'sh_1' };
      req.body = { title: 'SVP Platform Engineering' };

      Stakeholder.findById.mockResolvedValue(existing);
      Stakeholder.findByIdAndUpdate.mockResolvedValue(updated);

      await stakeholderController.updateStakeholderById(req, res);

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res._getData());
      expect(body.stakeholder.title).toBe('SVP Platform Engineering');
    });
  });
});

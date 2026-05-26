/**
 * SPV Controller Unit Tests
 * Rewritten to mock SPV model directly instead of databaseAdapter
 */
process.env.SKIP_DB_SETUP = 'true';

jest.mock('../../../models/SPV', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  findByIdAndDelete: jest.fn(),
  VALID_STATUSES: ['draft', 'in_review', 'raising', 'closing', 'wired', 'canceled'],
  VALID_COMPLIANCE_STATUSES: ['Compliant', 'NonCompliant', 'PendingReview'],
  VALID_COMPANY_STAGES: ['pre-seed', 'seed', 'series-a', 'series-b', 'post-revenue', 'other'],
  VALID_INCORPORATION_TYPES: ['c-corp', 'llc', 's-corp', 'other'],
  VALID_MONTHS_OF_RUNWAY: ['less-than-12', '12-or-more'],
  VALID_TRANSACTION_TYPES: ['primary', 'secondary'],
  VALID_INSTRUMENTS: ['safe', 'convertible-note', 'preferred-equity', 'common-equity', 'other'],
  VALID_VALUATIONS: ['capped', 'uncapped'],
  VALID_ADVISER_TYPES: ['platform-advisor', 'self-advised'],
  LEGACY_STATUS_MAP: { active: 'raising', inactive: 'draft', dissolved: 'canceled', pending: 'in_review', closed: 'wired', liquidated: 'canceled' },
  TRANSITION_RULES: { draft: ['in_review', 'canceled'], in_review: ['raising', 'draft', 'canceled'], raising: ['closing', 'canceled'], closing: ['wired', 'canceled'], wired: ['canceled'], canceled: [] },
  REQUIRED_STEPS_FOR_REVIEW: ['terms', 'adviser', 'memo', 'carry'],
  normalizeStatus: jest.fn((status) => {
    if (!status) return 'draft';
    const lower = status.toLowerCase();
    const valid = ['draft', 'in_review', 'raising', 'closing', 'wired', 'canceled'];
    if (valid.includes(lower)) return lower;
    const map = { active: 'raising', inactive: 'draft', dissolved: 'canceled', pending: 'in_review', closed: 'wired', liquidated: 'canceled' };
    return map[lower] || lower;
  }),
  validateTransition: jest.fn()
}));

const httpMocks = require('node-mocks-http');
const spvController = require('../../../controllers/SPV');
const SPV = require('../../../models/SPV');

describe('SPV Controller', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  describe('createSPV', () => {
    const validSPVData = { SPVID: 'SPV001', Name: 'Test SPV', Purpose: 'Investment vehicle', CreationDate: '2024-01-15', Status: 'draft', ParentCompanyID: 'COMPANY001', ComplianceStatus: 'Compliant' };

    it('should create an SPV successfully', async () => {
      req.body = validSPVData;
      SPV.findOne.mockResolvedValue(null);
      const mockSaved = { _id: 'spv123', ...validSPVData, Status: 'draft' };
      SPV.create.mockResolvedValue(mockSaved);
      await spvController.createSPV(req, res);
      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res._getData())).toEqual(mockSaved);
    });

    it('should return 400 when required fields are missing', async () => {
      req.body = { SPVID: 'SPV001' }; // Missing Name
      await spvController.createSPV(req, res);
      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('required');
    });

    it('should return 400 for invalid status', async () => {
      req.body = { ...validSPVData, Status: 'Invalid' };
      await spvController.createSPV(req, res);
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData()).message).toContain('Invalid status');
    });

    it('should return 400 for invalid compliance status', async () => {
      req.body = { ...validSPVData, ComplianceStatus: 'Invalid' };
      SPV.findOne.mockResolvedValue(null);
      await spvController.createSPV(req, res);
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData()).message).toContain('Invalid compliance status');
    });

    it('should return 409 when SPV with same SPVID exists', async () => {
      req.body = validSPVData;
      SPV.findOne.mockResolvedValue({ _id: 'existing', ...validSPVData });
      await spvController.createSPV(req, res);
      expect(res.statusCode).toBe(409);
    });

    it('should return 500 on database error', async () => {
      req.body = validSPVData;
      SPV.findOne.mockResolvedValue(null);
      SPV.create.mockRejectedValue(new Error('Database error'));
      await spvController.createSPV(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  describe('getSPVs', () => {
    it('should return all SPVs scoped to user companyId', async () => {
      req.user = { companyId: 'COMPANY001' };
      const mockSPVs = [{ _id: 'spv1', SPVID: 'SPV001' }, { _id: 'spv2', SPVID: 'SPV002' }];
      SPV.find.mockResolvedValue(mockSPVs);
      await spvController.getSPVs(req, res);
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.spvs).toHaveLength(2);
      expect(data.spvs[0]).toMatchObject({ _id: 'spv1', SPVID: 'SPV001', spvId: 'SPV001' });
      expect(data.spvs[1]).toMatchObject({ _id: 'spv2', SPVID: 'SPV002', spvId: 'SPV002' });
      expect(SPV.find).toHaveBeenCalledWith({ ParentCompanyID: 'COMPANY001' });
    });

    it('should return empty when user has no companyId', async () => {
      req.user = {};
      await spvController.getSPVs(req, res);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({ message: 'No SPVs found', spvs: [] });
    });

    it('should return message when no SPVs found', async () => {
      req.user = { companyId: 'COMPANY001' };
      SPV.find.mockResolvedValue([]);
      await spvController.getSPVs(req, res);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({ message: 'No SPVs found', spvs: [] });
    });

    it('should return 500 on database error', async () => {
      req.user = { companyId: 'COMPANY001' };
      SPV.find.mockRejectedValue(new Error('Database error'));
      await spvController.getSPVs(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  describe('getSPVById', () => {
    it('should return SPV by SPVID', async () => {
      const mockSPV = { _id: 'spv123', SPVID: 'SPV001', Name: 'Test SPV' };
      req.params = { id: 'SPV001' };
      SPV.findOne.mockResolvedValue(mockSPV);
      await spvController.getSPVById(req, res);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockSPV);
    });

    it('should return 404 when SPV not found', async () => {
      req.params = { id: 'nonexistent' };
      SPV.findOne.mockResolvedValue(null);
      await spvController.getSPVById(req, res);
      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for invalid ID format', async () => {
      req.params = { id: '123456789012345678901234' };
      await spvController.getSPVById(req, res);
      expect(res.statusCode).toBe(400);
    });
  });

  describe('updateSPV', () => {
    it('should update SPV successfully', async () => {
      req.params = { id: 'SPV001' };
      req.body = { Name: 'Updated SPV Name', Status: 'in_review' };
      const mockUpdated = { _id: 'spv123', SPVID: 'SPV001', Name: 'Updated SPV Name', Status: 'in_review' };
      SPV.findOneAndUpdate.mockResolvedValue(mockUpdated);
      await spvController.updateSPV(req, res);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockUpdated);
    });

    it('should return 400 when trying to modify SPVID', async () => {
      req.params = { id: 'SPV001' };
      req.body = { SPVID: 'NEW_SPV_ID' };
      await spvController.updateSPV(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 for invalid status', async () => {
      req.params = { id: 'SPV001' };
      req.body = { Status: 'InvalidStatus' };
      await spvController.updateSPV(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 404 when SPV not found', async () => {
      req.params = { id: 'SPV001' };
      req.body = { Name: 'Updated Name' };
      SPV.findOneAndUpdate.mockResolvedValue(null);
      SPV.findByIdAndUpdate.mockResolvedValue(null);
      await spvController.updateSPV(req, res);
      expect(res.statusCode).toBe(404);
    });
  });

  describe('deleteSPV', () => {
    it('should delete SPV by SPVID', async () => {
      req.params = { id: 'SPV001' };
      SPV.findOneAndDelete.mockResolvedValue({ _id: 'spv123', SPVID: 'SPV001' });
      await spvController.deleteSPV(req, res);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'SPV deleted successfully');
    });

    it('should return 404 when SPV not found', async () => {
      req.params = { id: 'nonexistent' };
      SPV.findOneAndDelete.mockResolvedValue(null);
      await spvController.deleteSPV(req, res);
      expect(res.statusCode).toBe(404);
    });
  });

  describe('getSPVsByStatus', () => {
    it('should return SPVs by status', async () => {
      req.params = { status: 'draft' };
      const mockSPVs = [{ _id: 'spv1', Status: 'draft' }];
      SPV.find.mockResolvedValue(mockSPVs);
      await spvController.getSPVsByStatus(req, res);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({ spvs: mockSPVs });
    });

    it('should return 400 for invalid status', async () => {
      req.params = { status: 'InvalidStatus' };
      await spvController.getSPVsByStatus(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 404 when no SPVs found with status', async () => {
      req.params = { status: 'wired' };
      SPV.find.mockResolvedValue([]);
      await spvController.getSPVsByStatus(req, res);
      expect(res.statusCode).toBe(404);
    });
  });

  describe('getSPVsByComplianceStatus', () => {
    it('should return SPVs by compliance status', async () => {
      req.params = { status: 'Compliant' };
      SPV.find.mockResolvedValue([{ _id: 'spv1', ComplianceStatus: 'Compliant' }]);
      await spvController.getSPVsByComplianceStatus(req, res);
      expect(res.statusCode).toBe(200);
    });

    it('should return 400 for invalid compliance status', async () => {
      req.params = { status: 'Invalid' };
      await spvController.getSPVsByComplianceStatus(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 404 when no SPVs found', async () => {
      req.params = { status: 'NonCompliant' };
      SPV.find.mockResolvedValue([]);
      await spvController.getSPVsByComplianceStatus(req, res);
      expect(res.statusCode).toBe(404);
    });
  });

  describe('getSPVsByParentCompany', () => {
    it('should return SPVs by parent company', async () => {
      req.params = { id: 'COMPANY001' };
      SPV.find.mockResolvedValue([{ _id: 'spv1', SPVID: 'SPV001', ParentCompanyID: 'COMPANY001' }]);
      await spvController.getSPVsByParentCompany(req, res);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('spvs');
    });

    it('should return 400 when parent company ID is missing', async () => {
      req.params = { id: '' };
      await spvController.getSPVsByParentCompany(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 404 when no SPVs found', async () => {
      req.params = { id: 'COMPANY999' };
      SPV.find.mockResolvedValue([]);
      await spvController.getSPVsByParentCompany(req, res);
      expect(res.statusCode).toBe(404);
    });
  });
});

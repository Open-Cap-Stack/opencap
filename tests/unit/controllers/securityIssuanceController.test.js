/**
 * SecurityIssuance Controller Test Suite
 * Issue #76: Implement Security Issuances Register
 *
 * Tests for the SecurityIssuance API controller including:
 * - CRUD operations
 * - Compliance checking
 * - State filing management
 * - Deadline tracking
 */

const zerodbService = require('../../../services/zerodbService');

// Mock ZeroDB service
jest.mock('../../../services/zerodbService');

// Import controller after mocking
const securityIssuanceController = require('../../../controllers/securityIssuanceController');

describe('SecurityIssuance Controller', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      params: {},
      query: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Reset ZeroDB service mocks
    zerodbService.insertRow = jest.fn();
    zerodbService.queryTable = jest.fn();
    zerodbService.updateRows = jest.fn();
    zerodbService.deleteRows = jest.fn();
  });

  describe('createSecurityIssuance', () => {
    const validIssuanceData = {
      issuanceId: 'ISS-2024-001',
      companyId: 'COMP-001',
      securityType: 'common_stock',
      shareClassId: 'SC-001',
      stakeholderId: 'STK-001',
      numberOfShares: 10000,
      pricePerShare: 1.50,
      issuanceDate: '2024-01-15',
      exemptionType: 'rule_701',
      status: 'issued'
    };

    it('should create a new security issuance successfully', async () => {
      mockReq.body = validIssuanceData;

      const mockCreatedIssuance = {
        id: 'zerodb-id-123',
        ...validIssuanceData,
        createdAt: new Date().toISOString()
      };

      zerodbService.insertRow.mockResolvedValue({
        rows: [mockCreatedIssuance]
      });

      await securityIssuanceController.createSecurityIssuance(mockReq, mockRes);

      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'security_issuances',
        expect.objectContaining({
          issuanceId: 'ISS-2024-001',
          companyId: 'COMP-001',
          securityType: 'common_stock'
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockCreatedIssuance
      });
    });

    it('should return 400 when issuanceId is missing', async () => {
      const { issuanceId, ...incompleteData } = validIssuanceData;
      mockReq.body = incompleteData;

      await securityIssuanceController.createSecurityIssuance(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required fields: issuanceId, companyId, securityType, stakeholderId, numberOfShares, pricePerShare, issuanceDate'
      });
      expect(zerodbService.insertRow).not.toHaveBeenCalled();
    });

    it('should return 400 when companyId is missing', async () => {
      const { companyId, ...incompleteData } = validIssuanceData;
      mockReq.body = incompleteData;

      await securityIssuanceController.createSecurityIssuance(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when securityType is invalid', async () => {
      mockReq.body = { ...validIssuanceData, securityType: 'invalid_type' };

      await securityIssuanceController.createSecurityIssuance(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Invalid security type')
      });
    });

    it('should return 400 when numberOfShares is negative', async () => {
      mockReq.body = { ...validIssuanceData, numberOfShares: -100 };

      await securityIssuanceController.createSecurityIssuance(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Number of shares must be positive')
      });
    });

    it('should return 400 when pricePerShare is negative', async () => {
      mockReq.body = { ...validIssuanceData, pricePerShare: -1.50 };

      await securityIssuanceController.createSecurityIssuance(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Price per share must be non-negative')
      });
    });

    it('should return 500 when ZeroDB insert fails', async () => {
      mockReq.body = validIssuanceData;
      zerodbService.insertRow.mockRejectedValue(new Error('ZeroDB connection error'));

      await securityIssuanceController.createSecurityIssuance(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Error creating security issuance'
      });
    });

    it('should calculate totalConsideration automatically', async () => {
      mockReq.body = validIssuanceData;
      zerodbService.insertRow.mockResolvedValue({
        rows: [{ id: '123', ...validIssuanceData, totalConsideration: 15000 }]
      });

      await securityIssuanceController.createSecurityIssuance(mockReq, mockRes);

      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'security_issuances',
        expect.objectContaining({
          totalConsideration: 15000
        })
      );
    });
  });

  describe('getAllSecurityIssuances', () => {
    it('should return all security issuances successfully', async () => {
      const mockIssuances = [
        { id: '1', issuanceId: 'ISS-001', companyId: 'COMP-001', securityType: 'common_stock' },
        { id: '2', issuanceId: 'ISS-002', companyId: 'COMP-001', securityType: 'preferred_stock' }
      ];

      zerodbService.queryTable.mockResolvedValue(mockIssuances);

      await securityIssuanceController.getAllSecurityIssuances(mockReq, mockRes);

      expect(zerodbService.queryTable).toHaveBeenCalledWith('security_issuances', {});
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockIssuances,
        count: 2
      });
    });

    it('should return empty array when no issuances exist', async () => {
      zerodbService.queryTable.mockResolvedValue([]);

      await securityIssuanceController.getAllSecurityIssuances(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        count: 0
      });
    });

    it('should filter by companyId when provided', async () => {
      mockReq.query.companyId = 'COMP-001';
      zerodbService.queryTable.mockResolvedValue([]);

      await securityIssuanceController.getAllSecurityIssuances(mockReq, mockRes);

      expect(zerodbService.queryTable).toHaveBeenCalledWith('security_issuances', {
        filter: { companyId: 'COMP-001' }
      });
    });

    it('should filter by securityType when provided', async () => {
      mockReq.query.securityType = 'common_stock';
      zerodbService.queryTable.mockResolvedValue([]);

      await securityIssuanceController.getAllSecurityIssuances(mockReq, mockRes);

      expect(zerodbService.queryTable).toHaveBeenCalledWith('security_issuances', {
        filter: { securityType: 'common_stock' }
      });
    });

    it('should filter by exemptionType when provided', async () => {
      mockReq.query.exemptionType = 'rule_701';
      zerodbService.queryTable.mockResolvedValue([]);

      await securityIssuanceController.getAllSecurityIssuances(mockReq, mockRes);

      expect(zerodbService.queryTable).toHaveBeenCalledWith('security_issuances', {
        filter: { exemptionType: 'rule_701' }
      });
    });

    it('should return 500 when ZeroDB query fails', async () => {
      zerodbService.queryTable.mockRejectedValue(new Error('ZeroDB query error'));

      await securityIssuanceController.getAllSecurityIssuances(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Error fetching security issuances'
      });
    });
  });

  describe('getSecurityIssuanceById', () => {
    it('should return a security issuance by id successfully', async () => {
      const issuanceId = 'zerodb-id-123';
      mockReq.params.id = issuanceId;

      const mockIssuance = {
        id: issuanceId,
        issuanceId: 'ISS-001',
        companyId: 'COMP-001',
        securityType: 'common_stock'
      };

      zerodbService.queryTable.mockResolvedValue([mockIssuance]);

      await securityIssuanceController.getSecurityIssuanceById(mockReq, mockRes);

      expect(zerodbService.queryTable).toHaveBeenCalledWith('security_issuances', {
        filter: { id: issuanceId }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockIssuance
      });
    });

    it('should return 404 when issuance is not found', async () => {
      mockReq.params.id = 'non-existent-id';
      zerodbService.queryTable.mockResolvedValue([]);

      await securityIssuanceController.getSecurityIssuanceById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Security issuance not found'
      });
    });

    it('should return 500 when ZeroDB query fails', async () => {
      mockReq.params.id = 'zerodb-id-123';
      zerodbService.queryTable.mockRejectedValue(new Error('ZeroDB query error'));

      await securityIssuanceController.getSecurityIssuanceById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Error fetching security issuance'
      });
    });
  });

  describe('updateSecurityIssuanceById', () => {
    it('should update a security issuance successfully', async () => {
      const issuanceId = 'zerodb-id-123';
      mockReq.params.id = issuanceId;
      mockReq.body = {
        status: 'transferred',
        complianceNotes: 'Transfer completed'
      };

      const mockUpdatedIssuance = {
        id: issuanceId,
        issuanceId: 'ISS-001',
        status: 'transferred',
        complianceNotes: 'Transfer completed'
      };

      zerodbService.updateRows.mockResolvedValue({
        modifiedCount: 1,
        rows: [mockUpdatedIssuance]
      });

      await securityIssuanceController.updateSecurityIssuanceById(mockReq, mockRes);

      expect(zerodbService.updateRows).toHaveBeenCalledWith(
        'security_issuances',
        { id: issuanceId },
        expect.objectContaining({
          status: 'transferred',
          complianceNotes: 'Transfer completed'
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedIssuance
      });
    });

    it('should return 404 when issuance to update is not found', async () => {
      mockReq.params.id = 'non-existent-id';
      mockReq.body = { status: 'transferred' };

      zerodbService.updateRows.mockResolvedValue({
        modifiedCount: 0,
        rows: []
      });

      await securityIssuanceController.updateSecurityIssuanceById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Security issuance not found'
      });
    });

    it('should return 400 when trying to update issuanceId', async () => {
      mockReq.params.id = 'zerodb-id-123';
      mockReq.body = { issuanceId: 'ISS-NEW-001' };

      await securityIssuanceController.updateSecurityIssuanceById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot update issuanceId'
      });
    });

    it('should return 500 when ZeroDB update fails', async () => {
      mockReq.params.id = 'zerodb-id-123';
      mockReq.body = { status: 'transferred' };

      zerodbService.updateRows.mockRejectedValue(new Error('ZeroDB update error'));

      await securityIssuanceController.updateSecurityIssuanceById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Error updating security issuance'
      });
    });
  });

  describe('deleteSecurityIssuanceById', () => {
    it('should delete a security issuance successfully', async () => {
      const issuanceId = 'zerodb-id-123';
      mockReq.params.id = issuanceId;

      zerodbService.deleteRows.mockResolvedValue({
        deletedCount: 1
      });

      await securityIssuanceController.deleteSecurityIssuanceById(mockReq, mockRes);

      expect(zerodbService.deleteRows).toHaveBeenCalledWith(
        'security_issuances',
        { id: issuanceId }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Security issuance deleted successfully'
      });
    });

    it('should return 404 when issuance to delete is not found', async () => {
      mockReq.params.id = 'non-existent-id';

      zerodbService.deleteRows.mockResolvedValue({
        deletedCount: 0
      });

      await securityIssuanceController.deleteSecurityIssuanceById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Security issuance not found'
      });
    });

    it('should return 500 when ZeroDB delete fails', async () => {
      mockReq.params.id = 'zerodb-id-123';

      zerodbService.deleteRows.mockRejectedValue(new Error('ZeroDB delete error'));

      await securityIssuanceController.deleteSecurityIssuanceById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Error deleting security issuance'
      });
    });
  });

  describe('getComplianceStatus', () => {
    it('should return compliance status for all issuances', async () => {
      mockReq.query.companyId = 'COMP-001';

      const mockIssuances = [
        { id: '1', complianceStatus: 'compliant', federalFilingStatus: 'filed' },
        { id: '2', complianceStatus: 'pending_review', federalFilingStatus: 'pending' },
        { id: '3', complianceStatus: 'non_compliant', federalFilingStatus: 'overdue' }
      ];

      zerodbService.queryTable.mockResolvedValue(mockIssuances);

      await securityIssuanceController.getComplianceStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          totalIssuances: 3,
          compliant: 1,
          pendingReview: 1,
          nonCompliant: 1,
          federalFilingStatus: {
            filed: 1,
            pending: 1,
            overdue: 1
          },
          issuances: mockIssuances
        }
      });
    });

    it('should return 400 when companyId is not provided', async () => {
      await securityIssuanceController.getComplianceStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'companyId is required'
      });
    });
  });

  describe('getOverdueFilings', () => {
    it('should return all overdue filings', async () => {
      mockReq.query.companyId = 'COMP-001';

      const mockOverdueIssuances = [
        {
          id: '1',
          issuanceId: 'ISS-001',
          federalFilingStatus: 'overdue',
          federalFilingDeadline: '2024-01-01'
        }
      ];

      zerodbService.queryTable.mockResolvedValue(mockOverdueIssuances);

      await securityIssuanceController.getOverdueFilings(mockReq, mockRes);

      expect(zerodbService.queryTable).toHaveBeenCalledWith('security_issuances', {
        filter: {
          companyId: 'COMP-001',
          $or: [
            { federalFilingStatus: 'overdue' },
            { 'stateFilings.filingStatus': 'overdue' }
          ]
        }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockOverdueIssuances,
        count: 1
      });
    });
  });

  describe('addStateFiling', () => {
    it('should add a state filing to an issuance', async () => {
      const issuanceId = 'zerodb-id-123';
      mockReq.params.id = issuanceId;
      mockReq.body = {
        stateCode: 'CA',
        filingStatus: 'pending',
        filingDeadline: '2024-03-15',
        exemptionClaimed: 'Section 25102(f)'
      };

      const existingIssuance = {
        id: issuanceId,
        stateFilings: []
      };

      const mockUpdatedIssuance = {
        id: issuanceId,
        stateFilings: [mockReq.body]
      };

      // First call: queryTable to get current issuance (read-modify-write pattern)
      zerodbService.queryTable.mockResolvedValue([existingIssuance]);

      zerodbService.updateRows.mockResolvedValue({
        modifiedCount: 1,
        rows: [mockUpdatedIssuance]
      });

      await securityIssuanceController.addStateFiling(mockReq, mockRes);

      // Controller uses read-modify-write: queries first, then updates with full array
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'security_issuances',
        { filter: { id: issuanceId } }
      );
      expect(zerodbService.updateRows).toHaveBeenCalledWith(
        'security_issuances',
        { id: issuanceId },
        expect.objectContaining({
          stateFilings: expect.arrayContaining([
            expect.objectContaining({ stateCode: 'CA' })
          ])
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedIssuance
      });
    });

    it('should return 400 when stateCode is missing', async () => {
      mockReq.params.id = 'zerodb-id-123';
      mockReq.body = {
        filingStatus: 'pending'
      };

      await securityIssuanceController.addStateFiling(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'stateCode is required'
      });
    });

    it('should return 400 when stateCode is invalid', async () => {
      mockReq.params.id = 'zerodb-id-123';
      mockReq.body = {
        stateCode: 'INVALID',
        filingStatus: 'pending'
      };

      await securityIssuanceController.addStateFiling(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid state code'
      });
    });
  });

  describe('updateStateFiling', () => {
    it('should update a state filing', async () => {
      const issuanceId = 'zerodb-id-123';
      mockReq.params.id = issuanceId;
      mockReq.params.stateCode = 'CA';
      mockReq.body = {
        filingStatus: 'filed',
        filingDate: '2024-02-01'
      };

      // Mock the initial query to find the issuance
      const existingIssuance = {
        id: issuanceId,
        stateFilings: [{
          stateCode: 'CA',
          filingStatus: 'pending'
        }]
      };

      const mockUpdatedIssuance = {
        id: issuanceId,
        stateFilings: [{
          stateCode: 'CA',
          filingStatus: 'filed',
          filingDate: '2024-02-01'
        }]
      };

      // First call to queryTable to find the issuance
      zerodbService.queryTable.mockResolvedValue([existingIssuance]);

      // Then update
      zerodbService.updateRows.mockResolvedValue({
        modifiedCount: 1,
        rows: [mockUpdatedIssuance]
      });

      await securityIssuanceController.updateStateFiling(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedIssuance
      });
    });
  });

  describe('getStateFilingRequirements', () => {
    it('should return state filing requirements for an exemption type', async () => {
      mockReq.query.exemptionType = 'regulation_d_506b';
      mockReq.query.states = 'CA,NY,TX';

      await securityIssuanceController.getStateFilingRequirements(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          exemptionType: 'regulation_d_506b',
          states: expect.arrayContaining([
            expect.objectContaining({ stateCode: 'CA' }),
            expect.objectContaining({ stateCode: 'NY' }),
            expect.objectContaining({ stateCode: 'TX' })
          ])
        })
      });
    });

    it('should return 400 when exemptionType is not provided', async () => {
      await securityIssuanceController.getStateFilingRequirements(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'exemptionType is required'
      });
    });
  });

  describe('getUpcomingDeadlines', () => {
    it('should return upcoming filing deadlines', async () => {
      mockReq.query.companyId = 'COMP-001';
      mockReq.query.daysAhead = '30';

      const mockIssuances = [
        {
          id: '1',
          issuanceId: 'ISS-001',
          federalFilingDeadline: '2024-02-15',
          federalFilingStatus: 'pending'
        }
      ];

      zerodbService.queryTable.mockResolvedValue(mockIssuances);

      await securityIssuanceController.getUpcomingDeadlines(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          deadlines: expect.any(Array)
        })
      });
    });

    it('should use default 30 days when daysAhead is not provided', async () => {
      mockReq.query.companyId = 'COMP-001';

      zerodbService.queryTable.mockResolvedValue([]);

      await securityIssuanceController.getUpcomingDeadlines(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getByExemptionType', () => {
    it('should return issuances filtered by exemption type', async () => {
      mockReq.query.exemptionType = 'rule_701';

      const mockIssuances = [
        { id: '1', issuanceId: 'ISS-001', exemptionType: 'rule_701' },
        { id: '2', issuanceId: 'ISS-002', exemptionType: 'rule_701' }
      ];

      zerodbService.queryTable.mockResolvedValue(mockIssuances);

      await securityIssuanceController.getByExemptionType(mockReq, mockRes);

      expect(zerodbService.queryTable).toHaveBeenCalledWith('security_issuances', {
        filter: { exemptionType: 'rule_701' }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockIssuances,
        count: 2
      });
    });

    it('should return 400 when exemptionType is not provided', async () => {
      await securityIssuanceController.getByExemptionType(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'exemptionType is required'
      });
    });

    it('should return 400 when exemptionType is invalid', async () => {
      mockReq.query.exemptionType = 'invalid_exemption';

      await securityIssuanceController.getByExemptionType(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Invalid exemption type')
      });
    });
  });

  describe('Input Validation Edge Cases', () => {
    it('should handle empty request body gracefully', async () => {
      mockReq.body = {};

      await securityIssuanceController.createSecurityIssuance(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle null values in request body', async () => {
      mockReq.body = {
        issuanceId: null,
        companyId: 'COMP-001'
      };

      await securityIssuanceController.createSecurityIssuance(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle undefined params', async () => {
      mockReq.params = {};

      await securityIssuanceController.getSecurityIssuanceById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'id parameter is required'
      });
    });
  });
});

/**
 * TransferApproval Controller Unit Tests
 * Issue #104: Build Transfer Approval Workflow
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
  findByIdAndDelete: jest.fn()
}));

jest.mock('../../../services/transferApprovalService', () => ({
  createTransferRequest: jest.fn(),
  submitForApproval: jest.fn(),
  approveTransfer: jest.fn(),
  rejectTransfer: jest.fn(),
  requestChanges: jest.fn(),
  executeTransfer: jest.fn(),
  checkRofrEligibility: jest.fn(),
  getApprovalHistory: jest.fn(),
  getTransferRequest: jest.fn(),
  getTransferRequestsByCompany: jest.fn(),
  cancelTransferRequest: jest.fn(),
  updateRofrStatus: jest.fn()
}));

const httpMocks = require('node-mocks-http');
const transferApprovalController = require('../../../controllers/transferApprovalController');
const TransferApprovalService = require('../../../services/transferApprovalService');
const databaseAdapter = require('../../../services/databaseAdapter');

describe('TransferApproval Controller', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  describe('createTransferRequest', () => {
    const validRequestData = {
      companyId: 'company123',
      sellerId: 'seller123',
      buyerId: 'buyer123',
      shareClassId: 'shareClass123',
      numberOfShares: 1000,
      pricePerShare: 10.00
    };

    it('should create a transfer request successfully', async () => {
      req.body = validRequestData;
      const mockCreatedRequest = {
        _id: 'request123',
        requestId: 'TR-001',
        ...validRequestData,
        totalAmount: 10000,
        status: 'pending'
      };
      TransferApprovalService.createTransferRequest.mockResolvedValue(mockCreatedRequest);

      await transferApprovalController.createTransferRequest(req, res);

      expect(TransferApprovalService.createTransferRequest).toHaveBeenCalledWith(validRequestData);
      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res._getData())).toHaveProperty('requestId', 'TR-001');
    });

    it('should return 400 on validation error', async () => {
      req.body = { numberOfShares: -1 };
      TransferApprovalService.createTransferRequest.mockRejectedValue(new Error('Validation failed'));

      await transferApprovalController.createTransferRequest(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });
  });

  describe('getTransferRequest', () => {
    it('should return transfer request by ID', async () => {
      req.params = { requestId: 'TR-001' };
      const mockRequest = {
        requestId: 'TR-001',
        status: 'pending'
      };
      TransferApprovalService.getTransferRequest.mockResolvedValue(mockRequest);

      await transferApprovalController.getTransferRequest(req, res);

      expect(TransferApprovalService.getTransferRequest).toHaveBeenCalledWith('TR-001');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockRequest);
    });

    it('should return 404 when request not found', async () => {
      req.params = { requestId: 'nonexistent' };
      TransferApprovalService.getTransferRequest.mockResolvedValue(null);

      await transferApprovalController.getTransferRequest(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Transfer request not found');
    });
  });

  describe('getTransferRequestsByCompany', () => {
    it('should return all transfer requests for a company', async () => {
      req.params = { companyId: 'company123' };
      const mockRequests = [
        { requestId: 'TR-001', status: 'pending' },
        { requestId: 'TR-002', status: 'approved' }
      ];
      TransferApprovalService.getTransferRequestsByCompany.mockResolvedValue(mockRequests);

      await transferApprovalController.getTransferRequestsByCompany(req, res);

      expect(TransferApprovalService.getTransferRequestsByCompany).toHaveBeenCalledWith(
        'company123',
        {}
      );
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveLength(2);
    });

    it('should support status filter', async () => {
      req.params = { companyId: 'company123' };
      req.query = { status: 'pending' };
      TransferApprovalService.getTransferRequestsByCompany.mockResolvedValue([]);

      await transferApprovalController.getTransferRequestsByCompany(req, res);

      expect(TransferApprovalService.getTransferRequestsByCompany).toHaveBeenCalledWith(
        'company123',
        { status: 'pending' }
      );
    });
  });

  describe('submitForApproval', () => {
    it('should submit request for approval successfully', async () => {
      req.params = { requestId: 'TR-001' };
      const mockUpdatedRequest = {
        requestId: 'TR-001',
        status: 'under_review'
      };
      TransferApprovalService.submitForApproval.mockResolvedValue(mockUpdatedRequest);

      await transferApprovalController.submitForApproval(req, res);

      expect(TransferApprovalService.submitForApproval).toHaveBeenCalledWith('TR-001');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('status', 'under_review');
    });

    it('should return 400 if submission fails', async () => {
      req.params = { requestId: 'TR-001' };
      TransferApprovalService.submitForApproval.mockRejectedValue(
        new Error('Only pending requests can be submitted')
      );

      await transferApprovalController.submitForApproval(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });

    it('should return 404 if request not found', async () => {
      req.params = { requestId: 'nonexistent' };
      const error = new Error('Transfer request not found');
      error.statusCode = 404;
      TransferApprovalService.submitForApproval.mockRejectedValue(error);

      await transferApprovalController.submitForApproval(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('approveTransfer', () => {
    const approvalData = {
      approverId: 'approver123',
      approverRole: 'cfo',
      comments: 'Approved after review'
    };

    it('should approve transfer request successfully', async () => {
      req.params = { requestId: 'TR-001' };
      req.body = approvalData;
      const mockResult = {
        request: { requestId: 'TR-001', status: 'approved' },
        approval: { approvalId: 'AP-001', decision: 'approved' }
      };
      TransferApprovalService.approveTransfer.mockResolvedValue(mockResult);

      await transferApprovalController.approveTransfer(req, res);

      expect(TransferApprovalService.approveTransfer).toHaveBeenCalledWith({
        requestId: 'TR-001',
        ...approvalData
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).request).toHaveProperty('status', 'approved');
    });

    it('should return 400 if approval fails', async () => {
      req.params = { requestId: 'TR-001' };
      req.body = approvalData;
      TransferApprovalService.approveTransfer.mockRejectedValue(
        new Error('Only requests under review can be approved')
      );

      await transferApprovalController.approveTransfer(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('rejectTransfer', () => {
    const rejectionData = {
      approverId: 'approver123',
      approverRole: 'cfo',
      comments: 'Rejected due to compliance',
      rejectionReason: 'Buyer not accredited'
    };

    it('should reject transfer request successfully', async () => {
      req.params = { requestId: 'TR-001' };
      req.body = rejectionData;
      const mockResult = {
        request: { requestId: 'TR-001', status: 'rejected', rejectionReason: rejectionData.rejectionReason },
        approval: { approvalId: 'AP-001', decision: 'rejected' }
      };
      TransferApprovalService.rejectTransfer.mockResolvedValue(mockResult);

      await transferApprovalController.rejectTransfer(req, res);

      expect(TransferApprovalService.rejectTransfer).toHaveBeenCalledWith({
        requestId: 'TR-001',
        ...rejectionData
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).request).toHaveProperty('status', 'rejected');
    });

    it('should return 400 if rejection reason not provided', async () => {
      req.params = { requestId: 'TR-001' };
      req.body = { approverId: 'approver123', approverRole: 'cfo' };
      TransferApprovalService.rejectTransfer.mockRejectedValue(
        new Error('Rejection reason is required')
      );

      await transferApprovalController.rejectTransfer(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData()).error).toContain('Rejection reason');
    });
  });

  describe('requestChanges', () => {
    const changeRequestData = {
      approverId: 'approver123',
      approverRole: 'legal_counsel',
      comments: 'Please provide more documentation',
      conditions: ['Provide proof of funds', 'Submit accreditation']
    };

    it('should request changes successfully', async () => {
      req.params = { requestId: 'TR-001' };
      req.body = changeRequestData;
      const mockResult = {
        request: { requestId: 'TR-001', status: 'pending' },
        approval: { approvalId: 'AP-001', decision: 'requested_changes' }
      };
      TransferApprovalService.requestChanges.mockResolvedValue(mockResult);

      await transferApprovalController.requestChanges(req, res);

      expect(TransferApprovalService.requestChanges).toHaveBeenCalledWith({
        requestId: 'TR-001',
        ...changeRequestData
      });
      expect(res.statusCode).toBe(200);
    });

    it('should return 400 if conditions not provided', async () => {
      req.params = { requestId: 'TR-001' };
      req.body = { approverId: 'approver123', approverRole: 'legal_counsel' };
      TransferApprovalService.requestChanges.mockRejectedValue(
        new Error('Conditions or comments are required')
      );

      await transferApprovalController.requestChanges(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('executeTransfer', () => {
    it('should execute approved transfer successfully', async () => {
      req.params = { requestId: 'TR-001' };
      const mockResult = {
        requestId: 'TR-001',
        status: 'completed',
        completedAt: new Date()
      };
      TransferApprovalService.executeTransfer.mockResolvedValue(mockResult);

      await transferApprovalController.executeTransfer(req, res);

      expect(TransferApprovalService.executeTransfer).toHaveBeenCalledWith('TR-001');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('status', 'completed');
    });

    it('should return 400 if transfer cannot be executed', async () => {
      req.params = { requestId: 'TR-001' };
      TransferApprovalService.executeTransfer.mockRejectedValue(
        new Error('Only approved requests can be executed')
      );

      await transferApprovalController.executeTransfer(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('checkRofrEligibility', () => {
    it('should return ROFR eligibility status', async () => {
      req.params = { requestId: 'TR-001' };
      const mockResult = {
        isEligible: true,
        eligibleParties: ['stakeholder1', 'stakeholder2'],
        expirationDate: new Date('2024-12-31')
      };
      TransferApprovalService.checkRofrEligibility.mockResolvedValue(mockResult);

      await transferApprovalController.checkRofrEligibility(req, res);

      expect(TransferApprovalService.checkRofrEligibility).toHaveBeenCalledWith('TR-001');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('isEligible', true);
    });

    it('should return 404 if request not found', async () => {
      req.params = { requestId: 'nonexistent' };
      const error = new Error('Transfer request not found');
      error.statusCode = 404;
      TransferApprovalService.checkRofrEligibility.mockRejectedValue(error);

      await transferApprovalController.checkRofrEligibility(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('getApprovalHistory', () => {
    it('should return approval history for a request', async () => {
      req.params = { requestId: 'TR-001' };
      const mockHistory = [
        { approvalId: 'AP-001', decision: 'requested_changes', decidedAt: new Date('2024-01-01') },
        { approvalId: 'AP-002', decision: 'approved', decidedAt: new Date('2024-01-15') }
      ];
      TransferApprovalService.getApprovalHistory.mockResolvedValue(mockHistory);

      await transferApprovalController.getApprovalHistory(req, res);

      expect(TransferApprovalService.getApprovalHistory).toHaveBeenCalledWith('TR-001');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveLength(2);
    });

    it('should return empty array if no history found', async () => {
      req.params = { requestId: 'TR-001' };
      TransferApprovalService.getApprovalHistory.mockResolvedValue([]);

      await transferApprovalController.getApprovalHistory(req, res);

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual([]);
    });
  });

  describe('cancelTransferRequest', () => {
    it('should cancel transfer request successfully', async () => {
      req.params = { requestId: 'TR-001' };
      req.body = { userId: 'seller123' };
      const mockResult = {
        requestId: 'TR-001',
        status: 'canceled'
      };
      TransferApprovalService.cancelTransferRequest.mockResolvedValue(mockResult);

      await transferApprovalController.cancelTransferRequest(req, res);

      expect(TransferApprovalService.cancelTransferRequest).toHaveBeenCalledWith('TR-001', 'seller123');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('status', 'canceled');
    });

    it('should return 400 if request cannot be canceled', async () => {
      req.params = { requestId: 'TR-001' };
      req.body = { userId: 'seller123' };
      TransferApprovalService.cancelTransferRequest.mockRejectedValue(
        new Error('Completed or rejected requests cannot be canceled')
      );

      await transferApprovalController.cancelTransferRequest(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('updateRofrStatus', () => {
    it('should update ROFR status successfully', async () => {
      req.params = { requestId: 'TR-001' };
      req.body = { rofrStatus: 'waived' };
      const mockResult = {
        requestId: 'TR-001',
        rofrStatus: 'waived'
      };
      TransferApprovalService.updateRofrStatus.mockResolvedValue(mockResult);

      await transferApprovalController.updateRofrStatus(req, res);

      expect(TransferApprovalService.updateRofrStatus).toHaveBeenCalledWith('TR-001', 'waived');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('rofrStatus', 'waived');
    });

    it('should return 400 for invalid ROFR status', async () => {
      req.params = { requestId: 'TR-001' };
      req.body = { rofrStatus: 'invalid' };
      TransferApprovalService.updateRofrStatus.mockRejectedValue(
        new Error('Invalid ROFR status')
      );

      await transferApprovalController.updateRofrStatus(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('updateTransferRequest', () => {
    it('should update transfer request successfully', async () => {
      req.params = { requestId: 'TR-001' };
      req.body = { numberOfShares: 500, pricePerShare: 15.00 };
      const mockUpdated = {
        requestId: 'TR-001',
        numberOfShares: 500,
        pricePerShare: 15.00,
        totalAmount: 7500
      };
      databaseAdapter.findOne.mockResolvedValue({ _id: 'request123', status: 'pending' });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdated);

      await transferApprovalController.updateTransferRequest(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should return 400 if request not in pending status', async () => {
      req.params = { requestId: 'TR-001' };
      req.body = { numberOfShares: 500 };
      databaseAdapter.findOne.mockResolvedValue({ _id: 'request123', status: 'approved' });

      await transferApprovalController.updateTransferRequest(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 404 if request not found', async () => {
      req.params = { requestId: 'TR-001' };
      req.body = { numberOfShares: 500 };
      databaseAdapter.findOne.mockResolvedValue(null);

      await transferApprovalController.updateTransferRequest(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('deleteTransferRequest', () => {
    it('should delete transfer request successfully', async () => {
      req.params = { requestId: 'TR-001' };
      databaseAdapter.findOne.mockResolvedValue({ _id: 'request123', status: 'pending' });
      databaseAdapter.findByIdAndDelete.mockResolvedValue({ _id: 'request123' });

      await transferApprovalController.deleteTransferRequest(req, res);

      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('TransferRequest', 'request123');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Transfer request deleted');
    });

    it('should return 400 if request cannot be deleted', async () => {
      req.params = { requestId: 'TR-001' };
      databaseAdapter.findOne.mockResolvedValue({ _id: 'request123', status: 'completed' });

      await transferApprovalController.deleteTransferRequest(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData()).error).toContain('cannot be deleted');
    });

    it('should return 404 if request not found', async () => {
      req.params = { requestId: 'TR-001' };
      databaseAdapter.findOne.mockResolvedValue(null);

      await transferApprovalController.deleteTransferRequest(req, res);

      expect(res.statusCode).toBe(404);
    });
  });
});

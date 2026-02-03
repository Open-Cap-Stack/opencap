/**
 * Transfer Approval Service Unit Tests
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
  findByIdAndDelete: jest.fn(),
  findOneAndUpdate: jest.fn()
}));

const databaseAdapter = require('../../../services/databaseAdapter');
const TransferApprovalService = require('../../../services/transferApprovalService');

describe('TransferApprovalService', () => {
  beforeEach(() => {
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
      const mockCreatedRequest = {
        _id: 'request123',
        requestId: 'TR-001',
        ...validRequestData,
        totalAmount: 10000,
        status: 'pending'
      };
      databaseAdapter.create.mockResolvedValue(mockCreatedRequest);

      const result = await TransferApprovalService.createTransferRequest(validRequestData);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'TransferRequest',
        expect.objectContaining({
          ...validRequestData,
          totalAmount: 10000,
          status: 'pending'
        })
      );
      expect(result).toHaveProperty('requestId');
      expect(result.totalAmount).toBe(10000);
    });

    it('should auto-generate requestId if not provided', async () => {
      databaseAdapter.create.mockResolvedValue({ requestId: 'TR-ABC12345' });

      await TransferApprovalService.createTransferRequest(validRequestData);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'TransferRequest',
        expect.objectContaining({
          requestId: expect.stringMatching(/^TR-/)
        })
      );
    });

    it('should calculate totalAmount from numberOfShares and pricePerShare', async () => {
      const requestData = {
        ...validRequestData,
        numberOfShares: 500,
        pricePerShare: 25.50
      };
      databaseAdapter.create.mockResolvedValue({ totalAmount: 12750 });

      await TransferApprovalService.createTransferRequest(requestData);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'TransferRequest',
        expect.objectContaining({
          totalAmount: 12750
        })
      );
    });

    it('should set requestedAt to current date', async () => {
      databaseAdapter.create.mockResolvedValue({ requestedAt: new Date() });

      await TransferApprovalService.createTransferRequest(validRequestData);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'TransferRequest',
        expect.objectContaining({
          requestedAt: expect.any(Date)
        })
      );
    });

    it('should throw error for invalid data', async () => {
      databaseAdapter.create.mockRejectedValue(new Error('Validation failed'));

      await expect(
        TransferApprovalService.createTransferRequest({ numberOfShares: -1 })
      ).rejects.toThrow();
    });
  });

  describe('submitForApproval', () => {
    it('should update transfer request status to under_review', async () => {
      const mockRequest = {
        _id: 'request123',
        requestId: 'TR-001',
        status: 'pending'
      };
      databaseAdapter.findOne.mockResolvedValue(mockRequest);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockRequest,
        status: 'under_review'
      });

      const result = await TransferApprovalService.submitForApproval('TR-001');

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'TransferRequest',
        'request123',
        expect.objectContaining({ status: 'under_review' }),
        expect.anything()
      );
      expect(result.status).toBe('under_review');
    });

    it('should throw error if request not found', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      await expect(
        TransferApprovalService.submitForApproval('nonexistent')
      ).rejects.toThrow('Transfer request not found');
    });

    it('should throw error if request is not in pending status', async () => {
      databaseAdapter.findOne.mockResolvedValue({
        _id: 'request123',
        status: 'approved'
      });

      await expect(
        TransferApprovalService.submitForApproval('TR-001')
      ).rejects.toThrow('Only pending requests can be submitted for approval');
    });
  });

  describe('approveTransfer', () => {
    const approvalData = {
      requestId: 'TR-001',
      approverId: 'approver123',
      approverRole: 'cfo',
      comments: 'Approved after review'
    };

    it('should approve transfer request successfully', async () => {
      const mockRequest = {
        _id: 'request123',
        requestId: 'TR-001',
        status: 'under_review'
      };
      databaseAdapter.findOne.mockResolvedValue(mockRequest);
      databaseAdapter.create.mockResolvedValue({
        approvalId: 'AP-001',
        decision: 'approved'
      });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockRequest,
        status: 'approved'
      });

      const result = await TransferApprovalService.approveTransfer(approvalData);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'TransferApproval',
        expect.objectContaining({
          requestId: 'TR-001',
          approverId: 'approver123',
          decision: 'approved'
        })
      );
      expect(result.request.status).toBe('approved');
    });

    it('should update reviewedAt and reviewedBy fields', async () => {
      const mockRequest = {
        _id: 'request123',
        requestId: 'TR-001',
        status: 'under_review'
      };
      databaseAdapter.findOne.mockResolvedValue(mockRequest);
      databaseAdapter.create.mockResolvedValue({ approvalId: 'AP-001' });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        reviewedAt: new Date(),
        reviewedBy: 'approver123'
      });

      await TransferApprovalService.approveTransfer(approvalData);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'TransferRequest',
        expect.anything(),
        expect.objectContaining({
          reviewedAt: expect.any(Date),
          reviewedBy: 'approver123'
        }),
        expect.anything()
      );
    });

    it('should throw error if request not in under_review status', async () => {
      databaseAdapter.findOne.mockResolvedValue({
        _id: 'request123',
        status: 'pending'
      });

      await expect(
        TransferApprovalService.approveTransfer(approvalData)
      ).rejects.toThrow('Only requests under review can be approved');
    });
  });

  describe('rejectTransfer', () => {
    const rejectionData = {
      requestId: 'TR-001',
      approverId: 'approver123',
      approverRole: 'cfo',
      comments: 'Rejected due to compliance concerns',
      rejectionReason: 'Buyer not accredited investor'
    };

    it('should reject transfer request successfully', async () => {
      const mockRequest = {
        _id: 'request123',
        requestId: 'TR-001',
        status: 'under_review'
      };
      databaseAdapter.findOne.mockResolvedValue(mockRequest);
      databaseAdapter.create.mockResolvedValue({
        approvalId: 'AP-001',
        decision: 'rejected'
      });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockRequest,
        status: 'rejected',
        rejectionReason: rejectionData.rejectionReason
      });

      const result = await TransferApprovalService.rejectTransfer(rejectionData);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'TransferApproval',
        expect.objectContaining({
          decision: 'rejected'
        })
      );
      expect(result.request.status).toBe('rejected');
      expect(result.request.rejectionReason).toBe(rejectionData.rejectionReason);
    });

    it('should require rejection reason', async () => {
      const dataWithoutReason = {
        requestId: 'TR-001',
        approverId: 'approver123',
        approverRole: 'cfo'
      };

      await expect(
        TransferApprovalService.rejectTransfer(dataWithoutReason)
      ).rejects.toThrow('Rejection reason is required');
    });
  });

  describe('requestChanges', () => {
    const changeRequestData = {
      requestId: 'TR-001',
      approverId: 'approver123',
      approverRole: 'legal_counsel',
      comments: 'Please provide additional documentation',
      conditions: ['Provide proof of funds', 'Submit accreditation certificate']
    };

    it('should request changes successfully', async () => {
      const mockRequest = {
        _id: 'request123',
        requestId: 'TR-001',
        status: 'under_review'
      };
      databaseAdapter.findOne.mockResolvedValue(mockRequest);
      databaseAdapter.create.mockResolvedValue({
        approvalId: 'AP-001',
        decision: 'requested_changes',
        conditions: changeRequestData.conditions
      });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockRequest,
        status: 'pending'
      });

      const result = await TransferApprovalService.requestChanges(changeRequestData);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'TransferApproval',
        expect.objectContaining({
          decision: 'requested_changes',
          conditions: changeRequestData.conditions
        })
      );
      expect(result.request.status).toBe('pending');
    });

    it('should throw error if no conditions provided', async () => {
      const dataWithoutConditions = {
        requestId: 'TR-001',
        approverId: 'approver123',
        approverRole: 'legal_counsel'
      };

      await expect(
        TransferApprovalService.requestChanges(dataWithoutConditions)
      ).rejects.toThrow('Conditions or comments are required');
    });
  });

  describe('executeTransfer', () => {
    it('should execute an approved transfer', async () => {
      const mockRequest = {
        _id: 'request123',
        requestId: 'TR-001',
        status: 'approved',
        sellerId: 'seller123',
        buyerId: 'buyer123',
        numberOfShares: 1000,
        shareClassId: 'shareClass123'
      };
      databaseAdapter.findOne.mockResolvedValue(mockRequest);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockRequest,
        status: 'completed',
        completedAt: new Date()
      });

      const result = await TransferApprovalService.executeTransfer('TR-001');

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'TransferRequest',
        'request123',
        expect.objectContaining({
          status: 'completed',
          completedAt: expect.any(Date)
        }),
        expect.anything()
      );
      expect(result.status).toBe('completed');
    });

    it('should throw error if request not approved', async () => {
      databaseAdapter.findOne.mockResolvedValue({
        _id: 'request123',
        status: 'under_review'
      });

      await expect(
        TransferApprovalService.executeTransfer('TR-001')
      ).rejects.toThrow('Only approved requests can be executed');
    });

    it('should throw error if request not found', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      await expect(
        TransferApprovalService.executeTransfer('nonexistent')
      ).rejects.toThrow('Transfer request not found');
    });
  });

  describe('checkRofrEligibility', () => {
    it('should return ROFR eligibility status', async () => {
      const mockRequest = {
        _id: 'request123',
        requestId: 'TR-001',
        companyId: 'company123',
        shareClassId: 'shareClass123',
        numberOfShares: 1000
      };
      databaseAdapter.findOne.mockResolvedValue(mockRequest);

      const result = await TransferApprovalService.checkRofrEligibility('TR-001');

      expect(result).toHaveProperty('isEligible');
      expect(result).toHaveProperty('eligibleParties');
      expect(result).toHaveProperty('expirationDate');
    });

    it('should identify eligible ROFR parties', async () => {
      const mockRequest = {
        _id: 'request123',
        requestId: 'TR-001',
        companyId: 'company123',
        shareClassId: 'shareClass123'
      };
      databaseAdapter.findOne.mockResolvedValue(mockRequest);

      // Mock stakeholders with ROFR rights
      databaseAdapter.find.mockResolvedValue([
        { _id: 'stakeholder1', hasRofrRights: true },
        { _id: 'stakeholder2', hasRofrRights: true }
      ]);

      const result = await TransferApprovalService.checkRofrEligibility('TR-001');

      expect(result.eligibleParties).toBeDefined();
      expect(Array.isArray(result.eligibleParties)).toBe(true);
    });

    it('should throw error if request not found', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      await expect(
        TransferApprovalService.checkRofrEligibility('nonexistent')
      ).rejects.toThrow('Transfer request not found');
    });
  });

  describe('getApprovalHistory', () => {
    it('should return approval history for a request', async () => {
      const mockApprovals = [
        {
          approvalId: 'AP-001',
          requestId: 'TR-001',
          decision: 'requested_changes',
          decidedAt: new Date('2024-01-01')
        },
        {
          approvalId: 'AP-002',
          requestId: 'TR-001',
          decision: 'approved',
          decidedAt: new Date('2024-01-15')
        }
      ];
      databaseAdapter.find.mockResolvedValue(mockApprovals);

      const result = await TransferApprovalService.getApprovalHistory('TR-001');

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'TransferApproval',
        { requestId: 'TR-001' },
        expect.anything()
      );
      expect(result).toHaveLength(2);
    });

    it('should return approvals sorted by decidedAt descending', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      await TransferApprovalService.getApprovalHistory('TR-001');

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'TransferApproval',
        { requestId: 'TR-001' },
        expect.objectContaining({ sort: { decidedAt: -1 } })
      );
    });

    it('should return empty array if no approvals found', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      const result = await TransferApprovalService.getApprovalHistory('TR-001');

      expect(result).toEqual([]);
    });
  });

  describe('getTransferRequest', () => {
    it('should return transfer request by requestId', async () => {
      const mockRequest = {
        _id: 'request123',
        requestId: 'TR-001',
        status: 'pending'
      };
      databaseAdapter.findOne.mockResolvedValue(mockRequest);

      const result = await TransferApprovalService.getTransferRequest('TR-001');

      expect(databaseAdapter.findOne).toHaveBeenCalledWith(
        'TransferRequest',
        { requestId: 'TR-001' }
      );
      expect(result).toEqual(mockRequest);
    });

    it('should return null if request not found', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      const result = await TransferApprovalService.getTransferRequest('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getTransferRequestsByCompany', () => {
    it('should return all transfer requests for a company', async () => {
      const mockRequests = [
        { requestId: 'TR-001', companyId: 'company123' },
        { requestId: 'TR-002', companyId: 'company123' }
      ];
      databaseAdapter.find.mockResolvedValue(mockRequests);

      const result = await TransferApprovalService.getTransferRequestsByCompany('company123');

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'TransferRequest',
        { companyId: 'company123' },
        expect.anything()
      );
      expect(result).toHaveLength(2);
    });

    it('should support status filter', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      await TransferApprovalService.getTransferRequestsByCompany('company123', { status: 'pending' });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'TransferRequest',
        { companyId: 'company123', status: 'pending' },
        expect.anything()
      );
    });
  });

  describe('cancelTransferRequest', () => {
    it('should cancel a pending transfer request', async () => {
      const mockRequest = {
        _id: 'request123',
        requestId: 'TR-001',
        status: 'pending'
      };
      databaseAdapter.findOne.mockResolvedValue(mockRequest);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockRequest,
        status: 'canceled'
      });

      const result = await TransferApprovalService.cancelTransferRequest('TR-001', 'seller123');

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'TransferRequest',
        'request123',
        expect.objectContaining({ status: 'canceled' }),
        expect.anything()
      );
      expect(result.status).toBe('canceled');
    });

    it('should throw error if request cannot be canceled', async () => {
      databaseAdapter.findOne.mockResolvedValue({
        _id: 'request123',
        status: 'completed'
      });

      await expect(
        TransferApprovalService.cancelTransferRequest('TR-001', 'seller123')
      ).rejects.toThrow('Completed or rejected requests cannot be canceled');
    });
  });

  describe('updateRofrStatus', () => {
    it('should update ROFR status successfully', async () => {
      const mockRequest = {
        _id: 'request123',
        requestId: 'TR-001',
        rofrStatus: 'pending'
      };
      databaseAdapter.findOne.mockResolvedValue(mockRequest);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockRequest,
        rofrStatus: 'waived'
      });

      const result = await TransferApprovalService.updateRofrStatus('TR-001', 'waived');

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'TransferRequest',
        'request123',
        expect.objectContaining({ rofrStatus: 'waived' }),
        expect.anything()
      );
      expect(result.rofrStatus).toBe('waived');
    });

    it('should validate ROFR status value', async () => {
      await expect(
        TransferApprovalService.updateRofrStatus('TR-001', 'invalid_status')
      ).rejects.toThrow();
    });
  });
});

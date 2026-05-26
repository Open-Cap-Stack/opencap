'use strict';

/**
 * Data Room Extraction Controller Test Suite
 * Issue #616: POST /api/v1/data-rooms/:id/extract with pending review queue
 */

const { v4: uuidv4 } = require('uuid');

// Mock dependencies before requiring controller
jest.mock('../../../services/ainativeAgentService');
jest.mock('../../../models/DataRoom');
jest.mock('../../../models/PendingExtraction');
jest.mock('../../../models/Stakeholder');
jest.mock('../../../models/ShareClass');
jest.mock('../../../models/EquityGrant');
jest.mock('../../../models/SAFE');

const ainativeAgentService = require('../../../services/ainativeAgentService');
const DataRoom = require('../../../models/DataRoom');
const PendingExtraction = require('../../../models/PendingExtraction');
const Stakeholder = require('../../../models/Stakeholder');
const ShareClass = require('../../../models/ShareClass');
const EquityGrant = require('../../../models/EquityGrant');
const SAFE = require('../../../models/SAFE');

describe('DataRoomExtractController', () => {
  let controller;
  let mockReq, mockRes;

  const mockDataRoomId = `dr_${uuidv4()}`;
  const mockCompanyId = `company_${uuidv4()}`;
  const mockUserId = `user_${uuidv4()}`;
  const mockExtractionId = `ext_${uuidv4()}`;

  const mockDataRoom = {
    dataRoomId: mockDataRoomId,
    ownerCompany: mockCompanyId,
    name: 'Series A Data Room',
    status: 'active',
    documents: [
      { documentId: 'doc_001', addedBy: mockUserId, addedAt: '2026-01-01T00:00:00.000Z' },
      { documentId: 'doc_002', addedBy: mockUserId, addedAt: '2026-01-02T00:00:00.000Z' },
    ],
  };

  const mockAiExtractionResult = {
    stakeholders: [
      { name: 'Alice Smith', email: 'alice@example.com', role: 'founder', ownershipPercentage: 40 },
    ],
    shareClasses: [
      { name: 'Series A Preferred', type: 'preferred', authorizedShares: 1000000, pricePerShare: 1.5 },
    ],
    equityGrants: [
      { grantee: 'Bob Jones', shares: 50000, grantDate: '2025-06-01', vestingSchedule: '4yr/1yr cliff' },
    ],
    safes: [
      { investor: 'VC Fund I', amount: 500000, valuationCap: 10000000, discount: 0.2 },
    ],
  };

  beforeAll(() => {
    controller = require('../../../controllers/dataRoomExtractController');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockReq = {
      params: { id: mockDataRoomId },
      body: {},
      query: {},
      user: { userId: mockUserId, companyId: mockCompanyId },
    };
  });

  // ── POST /api/v1/data-rooms/:id/extract ─────────────────────────────────────

  describe('extractRecords', () => {
    it('should extract records and return pending extractions with 200', async () => {
      DataRoom.findByDataRoomId.mockResolvedValue(mockDataRoom);
      ainativeAgentService.ainativeChatWithRetry.mockResolvedValue({
        content: '{}',
        parsed: mockAiExtractionResult,
      });
      PendingExtraction.create.mockImplementation(async (data) => ({
        ...data,
        _id: uuidv4(),
      }));

      await controller.extractRecords(mockReq, mockRes);

      expect(DataRoom.findByDataRoomId).toHaveBeenCalledWith(mockDataRoomId);
      expect(ainativeAgentService.ainativeChatWithRetry).toHaveBeenCalled();
      expect(PendingExtraction.create).toHaveBeenCalledTimes(4); // 1 stakeholder + 1 shareClass + 1 equityGrant + 1 safe
      expect(mockRes.status).toHaveBeenCalledWith(200);

      const responseBody = mockRes.json.mock.calls[0][0];
      expect(responseBody.extractions).toHaveLength(4);
      expect(responseBody.dataRoomId).toBe(mockDataRoomId);
    });

    it('should return 404 when data room not found', async () => {
      DataRoom.findByDataRoomId.mockResolvedValue(null);

      await controller.extractRecords(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('not found') })
      );
    });

    it('should return 400 when data room has no documents', async () => {
      DataRoom.findByDataRoomId.mockResolvedValue({
        ...mockDataRoom,
        documents: [],
      });

      await controller.extractRecords(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('no documents') })
      );
    });

    it('should handle AI service failure gracefully', async () => {
      DataRoom.findByDataRoomId.mockResolvedValue(mockDataRoom);
      ainativeAgentService.ainativeChatWithRetry.mockRejectedValue(new Error('AI service unavailable'));

      await controller.extractRecords(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('extraction failed') })
      );
    });

    it('should assign confidence scores to extracted records', async () => {
      DataRoom.findByDataRoomId.mockResolvedValue(mockDataRoom);
      ainativeAgentService.ainativeChatWithRetry.mockResolvedValue({
        content: '{}',
        parsed: {
          stakeholders: [
            { name: 'Alice Smith', email: 'alice@example.com', role: 'founder', ownershipPercentage: 40, confidence: 0.95 },
          ],
          shareClasses: [],
          equityGrants: [],
          safes: [],
        },
      });
      PendingExtraction.create.mockImplementation(async (data) => ({
        ...data,
        _id: uuidv4(),
      }));

      await controller.extractRecords(mockReq, mockRes);

      const createCall = PendingExtraction.create.mock.calls[0][0];
      expect(createCall.confidence).toBeGreaterThanOrEqual(0);
      expect(createCall.confidence).toBeLessThanOrEqual(1);
      expect(createCall.status).toBe('pending');
    });
  });

  // ── POST /api/v1/data-rooms/:id/extract/:extractionId/approve ───────────────

  describe('approveExtraction', () => {
    const pendingStakeholder = {
      extractionId: mockExtractionId,
      dataRoomId: mockDataRoomId,
      companyId: mockCompanyId,
      recordType: 'stakeholder',
      extractedData: { name: 'Alice Smith', email: 'alice@example.com', role: 'founder', ownershipPercentage: 40 },
      sourceDocument: 'doc_001',
      confidence: 0.92,
      status: 'pending',
      createdAt: '2026-05-26T00:00:00.000Z',
    };

    beforeEach(() => {
      mockReq.params.extractionId = mockExtractionId;
    });

    it('should approve a stakeholder extraction and commit to Stakeholder model', async () => {
      PendingExtraction.findOne.mockResolvedValue(pendingStakeholder);
      Stakeholder.create.mockResolvedValue({ stakeholderId: `stakeholder_${uuidv4()}`, ...pendingStakeholder.extractedData });
      PendingExtraction.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await controller.approveExtraction(mockReq, mockRes);

      expect(PendingExtraction.findOne).toHaveBeenCalledWith({ extractionId: mockExtractionId });
      expect(Stakeholder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Alice Smith',
          email: 'alice@example.com',
          companyId: mockCompanyId,
        })
      );
      expect(PendingExtraction.updateOne).toHaveBeenCalledWith(
        { extractionId: mockExtractionId },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'approved',
            reviewedBy: mockUserId,
          }),
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should approve a shareClass extraction and commit to ShareClass model', async () => {
      const pendingShareClass = {
        ...pendingStakeholder,
        recordType: 'shareClass',
        extractedData: { name: 'Series A Preferred', type: 'preferred', authorizedShares: 1000000, pricePerShare: 1.5 },
      };
      PendingExtraction.findOne.mockResolvedValue(pendingShareClass);
      ShareClass.create.mockResolvedValue({ shareClassId: `sc_${uuidv4()}` });
      PendingExtraction.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await controller.approveExtraction(mockReq, mockRes);

      expect(ShareClass.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Series A Preferred', companyId: mockCompanyId })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should approve an equityGrant extraction and commit to EquityGrant model', async () => {
      const pendingGrant = {
        ...pendingStakeholder,
        recordType: 'equityGrant',
        extractedData: { grantee: 'Bob Jones', shares: 50000, grantDate: '2025-06-01', vestingSchedule: '4yr/1yr cliff' },
      };
      PendingExtraction.findOne.mockResolvedValue(pendingGrant);
      EquityGrant.create.mockResolvedValue({ grantId: `grant_${uuidv4()}` });
      PendingExtraction.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await controller.approveExtraction(mockReq, mockRes);

      expect(EquityGrant.create).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: mockCompanyId })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should approve a SAFE extraction and commit to SAFE model', async () => {
      const pendingSafe = {
        ...pendingStakeholder,
        recordType: 'safe',
        extractedData: { investor: 'VC Fund I', amount: 500000, valuationCap: 10000000, discount: 0.2 },
      };
      PendingExtraction.findOne.mockResolvedValue(pendingSafe);
      SAFE.create.mockResolvedValue({ safeId: `safe_${uuidv4()}` });
      PendingExtraction.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await controller.approveExtraction(mockReq, mockRes);

      expect(SAFE.create).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: mockCompanyId })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 when extraction not found', async () => {
      PendingExtraction.findOne.mockResolvedValue(null);

      await controller.approveExtraction(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 when extraction is already approved', async () => {
      PendingExtraction.findOne.mockResolvedValue({
        ...pendingStakeholder,
        status: 'approved',
      });

      await controller.approveExtraction(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('already') })
      );
    });

    it('should return 400 when extraction is already rejected', async () => {
      PendingExtraction.findOne.mockResolvedValue({
        ...pendingStakeholder,
        status: 'rejected',
      });

      await controller.approveExtraction(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  // ── POST /api/v1/data-rooms/:id/extract/:extractionId/reject ────────────────

  describe('rejectExtraction', () => {
    const pendingRecord = {
      extractionId: mockExtractionId,
      dataRoomId: mockDataRoomId,
      companyId: mockCompanyId,
      recordType: 'stakeholder',
      extractedData: { name: 'Alice Smith' },
      status: 'pending',
    };

    beforeEach(() => {
      mockReq.params.extractionId = mockExtractionId;
    });

    it('should reject a pending extraction and mark status as rejected', async () => {
      PendingExtraction.findOne.mockResolvedValue(pendingRecord);
      PendingExtraction.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await controller.rejectExtraction(mockReq, mockRes);

      expect(PendingExtraction.updateOne).toHaveBeenCalledWith(
        { extractionId: mockExtractionId },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'rejected',
            reviewedBy: mockUserId,
          }),
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 when extraction not found', async () => {
      PendingExtraction.findOne.mockResolvedValue(null);

      await controller.rejectExtraction(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 when extraction is already reviewed', async () => {
      PendingExtraction.findOne.mockResolvedValue({
        ...pendingRecord,
        status: 'approved',
      });

      await controller.rejectExtraction(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should include rejection reason if provided in body', async () => {
      mockReq.body = { reason: 'Incorrect data' };
      PendingExtraction.findOne.mockResolvedValue(pendingRecord);
      PendingExtraction.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await controller.rejectExtraction(mockReq, mockRes);

      expect(PendingExtraction.updateOne).toHaveBeenCalledWith(
        { extractionId: mockExtractionId },
        expect.objectContaining({
          $set: expect.objectContaining({
            rejectionReason: 'Incorrect data',
          }),
        })
      );
    });
  });

  // ── GET /api/v1/data-rooms/:id/extract ──────────────────────────────────────

  describe('listExtractions', () => {
    it('should return all pending extractions for a data room', async () => {
      const mockExtractions = [
        { extractionId: `ext_1`, recordType: 'stakeholder', status: 'pending' },
        { extractionId: `ext_2`, recordType: 'shareClass', status: 'pending' },
      ];
      DataRoom.findByDataRoomId.mockResolvedValue(mockDataRoom);
      PendingExtraction.find.mockResolvedValue(mockExtractions);

      await controller.listExtractions(mockReq, mockRes);

      expect(PendingExtraction.find).toHaveBeenCalledWith(
        expect.objectContaining({ dataRoomId: mockDataRoomId })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseBody = mockRes.json.mock.calls[0][0];
      expect(responseBody.extractions).toHaveLength(2);
    });

    it('should return 404 when data room not found', async () => {
      DataRoom.findByDataRoomId.mockResolvedValue(null);

      await controller.listExtractions(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should filter by status when query param is provided', async () => {
      mockReq.query = { status: 'approved' };
      DataRoom.findByDataRoomId.mockResolvedValue(mockDataRoom);
      PendingExtraction.find.mockResolvedValue([]);

      await controller.listExtractions(mockReq, mockRes);

      expect(PendingExtraction.find).toHaveBeenCalledWith(
        expect.objectContaining({ dataRoomId: mockDataRoomId, status: 'approved' })
      );
    });
  });
});

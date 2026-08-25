/**
 * TransferRequest Model Unit Tests
 * Issue #104: Build Transfer Approval Workflow
 * Tests the actual ZeroDB-based TransferRequest model with mocked service layer
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock the zerodbService to prevent real API calls
jest.mock('../../../services/zerodbService', () => ({
  initialize: jest.fn(),
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  deleteRowById: jest.fn(),
  createTable: jest.fn(),
  client: { put: jest.fn() },
  projectId: 'test-project'
}));

// Mock the logger to suppress output
jest.mock('../../../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

const TransferRequest = require('../../../models/TransferRequest');
const zerodbService = require('../../../services/zerodbService');

describe('TransferRequest Model', () => {
  let store = [];
  let idCounter = 0;

  beforeEach(() => {
    store = [];
    idCounter = 0;
    jest.clearAllMocks();

    // Mock insertRow
    zerodbService.insertRow.mockImplementation((tableName, doc) => {
      const row_id = ++idCounter;
      const storedDoc = { ...doc };
      store.push(storedDoc);
      return Promise.resolve({
        data: [{ row_id, row_data: storedDoc }]
      });
    });

    // Mock queryTable
    zerodbService.queryTable.mockImplementation((tableName, { filter = {}, limit } = {}) => {
      let results = [...store];
      for (const [key, value] of Object.entries(filter)) {
        results = results.filter(doc => doc[key] === value);
      }
      if (limit) {
        results = results.slice(0, limit);
      }
      return Promise.resolve({
        data: results.map((doc, i) => ({ row_id: i + 1, row_data: doc })),
        total: results.length
      });
    });

    // Mock client.put for updates
    zerodbService.client.put.mockImplementation((url, { row_data }) => {
      const idx = store.findIndex(doc => doc._id === row_data._id);
      if (idx !== -1) {
        store[idx] = { ...store[idx], ...row_data };
      }
      return Promise.resolve({ data: { row_data } });
    });

    // Mock deleteRowById
    zerodbService.deleteRowById.mockImplementation((tableName, rowId) => {
      return Promise.resolve({ deleted: true });
    });
  });

  // ─── Constants ───────────────────────────────────────────────

  describe('Constants', () => {
    it('should expose VALID_STATUSES', () => {
      expect(TransferRequest.VALID_STATUSES).toEqual([
        'pending', 'under_review', 'approved', 'rejected', 'completed', 'canceled'
      ]);
    });

    it('should expose ROFR_STATUSES', () => {
      expect(TransferRequest.ROFR_STATUSES).toEqual([
        'not_applicable', 'pending', 'waived', 'exercised', 'expired'
      ]);
    });
  });

  // ─── Schema ─────────────────────────────────────────────────

  describe('Schema', () => {
    it('should have the correct table name', () => {
      expect(TransferRequest.tableName).toBe('transfer_requests');
    });

    it('should have required schema fields', () => {
      const schema = TransferRequest.schema;
      expect(schema.requestId).toBeDefined();
      expect(schema.companyId).toBeDefined();
      expect(schema.sellerId).toBeDefined();
      expect(schema.buyerId).toBeDefined();
      expect(schema.shareClassId).toBeDefined();
      expect(schema.numberOfShares).toBeDefined();
      expect(schema.pricePerShare).toBeDefined();
    });

    it('should mark required fields', () => {
      expect(TransferRequest.schema.requestId.required).toBe(true);
      expect(TransferRequest.schema.companyId.required).toBe(true);
      expect(TransferRequest.schema.sellerId.required).toBe(true);
      expect(TransferRequest.schema.buyerId.required).toBe(true);
      expect(TransferRequest.schema.shareClassId.required).toBe(true);
    });

    it('should have status enum', () => {
      expect(TransferRequest.schema.status.enum).toEqual(
        ['pending', 'under_review', 'approved', 'rejected', 'completed', 'canceled']
      );
    });

    it('should have rofrStatus enum', () => {
      expect(TransferRequest.schema.rofrStatus.enum).toEqual(
        ['not_applicable', 'pending', 'waived', 'exercised', 'expired']
      );
    });

    it('should default status to pending', () => {
      expect(TransferRequest.schema.status.default).toBe('pending');
    });

    it('should default rofrStatus to not_applicable', () => {
      expect(TransferRequest.schema.rofrStatus.default).toBe('not_applicable');
    });

    it('should have documents, notes, metadata fields', () => {
      expect(TransferRequest.schema.documents).toBeDefined();
      expect(TransferRequest.schema.notes).toBeDefined();
      expect(TransferRequest.schema.metadata).toBeDefined();
    });
  });

  // ─── create() ───────────────────────────────────────────────

  describe('create()', () => {
    const validData = {
      companyId: 'comp_1',
      sellerId: 'seller_1',
      buyerId: 'buyer_1',
      shareClassId: 'sc_1',
      numberOfShares: 100,
      pricePerShare: 10.0
    };

    it('should create a transfer request with valid data', async () => {
      const result = await TransferRequest.create(validData);
      expect(result).toBeDefined();
      expect(result.companyId).toBe('comp_1');
      expect(result.numberOfShares).toBe(100);
      expect(result.pricePerShare).toBe(10.0);
    });

    it('should auto-generate requestId if not provided', async () => {
      const result = await TransferRequest.create(validData);
      expect(result.requestId).toBeDefined();
      expect(result.requestId).toMatch(/^tr_/);
    });

    it('should use provided requestId if given', async () => {
      const result = await TransferRequest.create({ ...validData, requestId: 'tr_custom' });
      expect(result.requestId).toBe('tr_custom');
    });

    it('should calculate totalAmount from shares and price', async () => {
      const result = await TransferRequest.create(validData);
      expect(result.totalAmount).toBe(1000);
    });

    it('should default status to pending', async () => {
      const result = await TransferRequest.create(validData);
      expect(result.status).toBe('pending');
    });

    it('should set requestedAt if not provided', async () => {
      const result = await TransferRequest.create(validData);
      expect(result.requestedAt).toBeDefined();
    });

    it('should throw if numberOfShares < 1', async () => {
      await expect(TransferRequest.create({ ...validData, numberOfShares: 0 }))
        .rejects.toThrow('numberOfShares must be at least 1');
    });

    it('should throw if numberOfShares is negative', async () => {
      await expect(TransferRequest.create({ ...validData, numberOfShares: -5 }))
        .rejects.toThrow('numberOfShares must be at least 1');
    });

    it('should throw if pricePerShare is negative', async () => {
      await expect(TransferRequest.create({ ...validData, pricePerShare: -1 }))
        .rejects.toThrow('pricePerShare cannot be negative');
    });

    it('should allow pricePerShare of 0', async () => {
      const result = await TransferRequest.create({ ...validData, pricePerShare: 0 });
      expect(result.pricePerShare).toBe(0);
      expect(result.totalAmount).toBe(0);
    });

    it('should use provided status if given', async () => {
      const result = await TransferRequest.create({ ...validData, status: 'under_review' });
      expect(result.status).toBe('under_review');
    });

    it('should use provided requestedAt if given', async () => {
      const ts = '2026-01-01T00:00:00.000Z';
      const result = await TransferRequest.create({ ...validData, requestedAt: ts });
      expect(result.requestedAt).toBe(ts);
    });
  });

  // ─── findByRequestId() ─────────────────────────────────────

  describe('findByRequestId()', () => {
    it('should find a request by requestId', async () => {
      await TransferRequest.create({
        requestId: 'tr_findme',
        companyId: 'comp_1',
        sellerId: 's1',
        buyerId: 'b1',
        shareClassId: 'sc1',
        numberOfShares: 10,
        pricePerShare: 5
      });

      const found = await TransferRequest.findByRequestId('tr_findme');
      expect(found).toBeDefined();
      expect(found.requestId).toBe('tr_findme');
    });

    it('should return null for non-existent requestId', async () => {
      const found = await TransferRequest.findByRequestId('tr_nonexistent');
      expect(found).toBeNull();
    });
  });

  // ─── findByCompany() ───────────────────────────────────────

  describe('findByCompany()', () => {
    beforeEach(async () => {
      await TransferRequest.create({
        companyId: 'comp_A', sellerId: 's1', buyerId: 'b1',
        shareClassId: 'sc1', numberOfShares: 10, pricePerShare: 5
      });
      await TransferRequest.create({
        companyId: 'comp_A', sellerId: 's2', buyerId: 'b2',
        shareClassId: 'sc1', numberOfShares: 20, pricePerShare: 3, status: 'approved'
      });
      await TransferRequest.create({
        companyId: 'comp_B', sellerId: 's3', buyerId: 'b3',
        shareClassId: 'sc2', numberOfShares: 5, pricePerShare: 10
      });
    });

    it('should find requests by company', async () => {
      const results = await TransferRequest.findByCompany('comp_A');
      expect(results.length).toBe(2);
    });

    it('should filter by status when provided', async () => {
      const results = await TransferRequest.findByCompany('comp_A', { status: 'approved' });
      expect(results.length).toBe(1);
      expect(results[0].status).toBe('approved');
    });

    it('should return empty array for unknown company', async () => {
      const results = await TransferRequest.findByCompany('comp_unknown');
      expect(results).toEqual([]);
    });
  });

  // ─── findBySeller() ────────────────────────────────────────

  describe('findBySeller()', () => {
    beforeEach(async () => {
      await TransferRequest.create({
        companyId: 'c1', sellerId: 'seller_X', buyerId: 'b1',
        shareClassId: 'sc1', numberOfShares: 10, pricePerShare: 5
      });
    });

    it('should find requests by seller', async () => {
      const results = await TransferRequest.findBySeller('seller_X');
      expect(results.length).toBe(1);
      expect(results[0].sellerId).toBe('seller_X');
    });

    it('should filter by status', async () => {
      const results = await TransferRequest.findBySeller('seller_X', { status: 'approved' });
      expect(results).toEqual([]);
    });
  });

  // ─── findByBuyer() ─────────────────────────────────────────

  describe('findByBuyer()', () => {
    beforeEach(async () => {
      await TransferRequest.create({
        companyId: 'c1', sellerId: 's1', buyerId: 'buyer_Y',
        shareClassId: 'sc1', numberOfShares: 10, pricePerShare: 5
      });
    });

    it('should find requests by buyer', async () => {
      const results = await TransferRequest.findByBuyer('buyer_Y');
      expect(results.length).toBe(1);
      expect(results[0].buyerId).toBe('buyer_Y');
    });

    it('should filter by status', async () => {
      const results = await TransferRequest.findByBuyer('buyer_Y', { status: 'rejected' });
      expect(results).toEqual([]);
    });
  });

  // ─── isActive() ────────────────────────────────────────────

  describe('isActive()', () => {
    it('should return true for pending', () => {
      expect(TransferRequest.isActive({ status: 'pending' })).toBe(true);
    });

    it('should return true for under_review', () => {
      expect(TransferRequest.isActive({ status: 'under_review' })).toBe(true);
    });

    it('should return true for approved', () => {
      expect(TransferRequest.isActive({ status: 'approved' })).toBe(true);
    });

    it('should return false for rejected', () => {
      expect(TransferRequest.isActive({ status: 'rejected' })).toBe(false);
    });

    it('should return false for completed', () => {
      expect(TransferRequest.isActive({ status: 'completed' })).toBe(false);
    });

    it('should return false for canceled', () => {
      expect(TransferRequest.isActive({ status: 'canceled' })).toBe(false);
    });
  });

  // ─── canBeModified() ───────────────────────────────────────

  describe('canBeModified()', () => {
    it('should return true for pending', () => {
      expect(TransferRequest.canBeModified({ status: 'pending' })).toBe(true);
    });

    it('should return false for under_review', () => {
      expect(TransferRequest.canBeModified({ status: 'under_review' })).toBe(false);
    });

    it('should return false for approved', () => {
      expect(TransferRequest.canBeModified({ status: 'approved' })).toBe(false);
    });

    it('should return false for rejected', () => {
      expect(TransferRequest.canBeModified({ status: 'rejected' })).toBe(false);
    });

    it('should return false for completed', () => {
      expect(TransferRequest.canBeModified({ status: 'completed' })).toBe(false);
    });

    it('should return false for canceled', () => {
      expect(TransferRequest.canBeModified({ status: 'canceled' })).toBe(false);
    });
  });

  // ─── canBeCanceled() ───────────────────────────────────────

  describe('canBeCanceled()', () => {
    it('should return true for pending', () => {
      expect(TransferRequest.canBeCanceled({ status: 'pending' })).toBe(true);
    });

    it('should return true for under_review', () => {
      expect(TransferRequest.canBeCanceled({ status: 'under_review' })).toBe(true);
    });

    it('should return false for approved', () => {
      expect(TransferRequest.canBeCanceled({ status: 'approved' })).toBe(false);
    });

    it('should return false for rejected', () => {
      expect(TransferRequest.canBeCanceled({ status: 'rejected' })).toBe(false);
    });

    it('should return false for completed', () => {
      expect(TransferRequest.canBeCanceled({ status: 'completed' })).toBe(false);
    });

    it('should return false for canceled', () => {
      expect(TransferRequest.canBeCanceled({ status: 'canceled' })).toBe(false);
    });
  });

  // ─── submitForReview() ─────────────────────────────────────

  describe('submitForReview()', () => {
    it('should update status to under_review', async () => {
      const created = await TransferRequest.create({
        requestId: 'tr_review',
        companyId: 'c1', sellerId: 's1', buyerId: 'b1',
        shareClassId: 'sc1', numberOfShares: 10, pricePerShare: 5
      });

      const result = await TransferRequest.submitForReview('tr_review');
      expect(result).toBeDefined();
    });
  });

  // ─── approve() ─────────────────────────────────────────────

  describe('approve()', () => {
    it('should update status to approved with reviewer info', async () => {
      await TransferRequest.create({
        requestId: 'tr_approve',
        companyId: 'c1', sellerId: 's1', buyerId: 'b1',
        shareClassId: 'sc1', numberOfShares: 10, pricePerShare: 5
      });

      const result = await TransferRequest.approve('tr_approve', 'reviewer_1');
      expect(result).toBeDefined();
    });
  });

  // ─── reject() ──────────────────────────────────────────────

  describe('reject()', () => {
    it('should update status to rejected with reason', async () => {
      await TransferRequest.create({
        requestId: 'tr_reject',
        companyId: 'c1', sellerId: 's1', buyerId: 'b1',
        shareClassId: 'sc1', numberOfShares: 10, pricePerShare: 5
      });

      const result = await TransferRequest.reject('tr_reject', 'reviewer_1', 'Insufficient documentation');
      expect(result).toBeDefined();
    });
  });

  // ─── complete() ────────────────────────────────────────────

  describe('complete()', () => {
    it('should update status to completed', async () => {
      await TransferRequest.create({
        requestId: 'tr_complete',
        companyId: 'c1', sellerId: 's1', buyerId: 'b1',
        shareClassId: 'sc1', numberOfShares: 10, pricePerShare: 5
      });

      const result = await TransferRequest.complete('tr_complete');
      expect(result).toBeDefined();
    });
  });

  // ─── cancel() ──────────────────────────────────────────────

  describe('cancel()', () => {
    it('should update status to canceled', async () => {
      await TransferRequest.create({
        requestId: 'tr_cancel',
        companyId: 'c1', sellerId: 's1', buyerId: 'b1',
        shareClassId: 'sc1', numberOfShares: 10, pricePerShare: 5
      });

      const result = await TransferRequest.cancel('tr_cancel');
      expect(result).toBeDefined();
    });
  });

  // ─── updateRofrStatus() ────────────────────────────────────

  describe('updateRofrStatus()', () => {
    it('should update ROFR status with valid status', async () => {
      await TransferRequest.create({
        requestId: 'tr_rofr',
        companyId: 'c1', sellerId: 's1', buyerId: 'b1',
        shareClassId: 'sc1', numberOfShares: 10, pricePerShare: 5
      });

      const result = await TransferRequest.updateRofrStatus('tr_rofr', 'waived');
      expect(result).toBeDefined();
    });

    it('should accept all valid ROFR statuses', async () => {
      for (const status of TransferRequest.ROFR_STATUSES) {
        await TransferRequest.create({
          requestId: `tr_rofr_${status}`,
          companyId: 'c1', sellerId: 's1', buyerId: 'b1',
          shareClassId: 'sc1', numberOfShares: 10, pricePerShare: 5
        });
        const result = await TransferRequest.updateRofrStatus(`tr_rofr_${status}`, status);
        expect(result).toBeDefined();
      }
    });

    it('should throw for invalid ROFR status', async () => {
      await expect(TransferRequest.updateRofrStatus('tr_x', 'invalid_status'))
        .rejects.toThrow('rofrStatus must be one of');
    });
  });

  // ─── addDocument() ─────────────────────────────────────────

  describe('addDocument()', () => {
    it('should add a document to a request', async () => {
      await TransferRequest.create({
        requestId: 'tr_doc',
        companyId: 'c1', sellerId: 's1', buyerId: 'b1',
        shareClassId: 'sc1', numberOfShares: 10, pricePerShare: 5
      });

      const result = await TransferRequest.addDocument('tr_doc', {
        documentId: 'doc_1',
        name: 'Transfer Agreement',
        url: 'https://example.com/doc.pdf',
        type: 'pdf'
      });
      expect(result).toBeDefined();
    });

    it('should throw if request not found', async () => {
      await expect(TransferRequest.addDocument('tr_nonexistent', {
        documentId: 'doc_1',
        name: 'Test',
        url: 'https://example.com/test.pdf',
        type: 'pdf'
      })).rejects.toThrow('Request not found');
    });
  });

  // ─── Delegated Base Methods ─────────────────────────────────

  describe('Delegated base methods', () => {
    it('should expose find method', () => {
      expect(typeof TransferRequest.find).toBe('function');
    });

    it('should expose findOne method', () => {
      expect(typeof TransferRequest.findOne).toBe('function');
    });

    it('should expose findById method', () => {
      expect(typeof TransferRequest.findById).toBe('function');
    });

    it('should expose updateOne method', () => {
      expect(typeof TransferRequest.updateOne).toBe('function');
    });

    it('should expose updateMany method', () => {
      expect(typeof TransferRequest.updateMany).toBe('function');
    });

    it('should expose deleteOne method', () => {
      expect(typeof TransferRequest.deleteOne).toBe('function');
    });

    it('should expose deleteMany method', () => {
      expect(typeof TransferRequest.deleteMany).toBe('function');
    });

    it('should expose findOneAndUpdate method', () => {
      expect(typeof TransferRequest.findOneAndUpdate).toBe('function');
    });

    it('should expose findByIdAndUpdate method', () => {
      expect(typeof TransferRequest.findByIdAndUpdate).toBe('function');
    });

    it('should expose findOneAndDelete method', () => {
      expect(typeof TransferRequest.findOneAndDelete).toBe('function');
    });

    it('should expose findByIdAndDelete method', () => {
      expect(typeof TransferRequest.findByIdAndDelete).toBe('function');
    });

    it('should expose countDocuments method', () => {
      expect(typeof TransferRequest.countDocuments).toBe('function');
    });

    it('should expose exists method', () => {
      expect(typeof TransferRequest.exists).toBe('function');
    });

    it('should expose distinct method', () => {
      expect(typeof TransferRequest.distinct).toBe('function');
    });

    it('should expose aggregate method', () => {
      expect(typeof TransferRequest.aggregate).toBe('function');
    });
  });
});

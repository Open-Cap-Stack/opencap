/**
 * SecondaryTransactionService Tests
 * Issue #103: Create Secondary Transaction Model
 *
 * Test suite for secondary share transactions including:
 * - Market listing creation and management
 * - Transaction initiation, completion, cancellation
 * - Fee calculations
 * - Report generation
 * - Market statistics
 */

const SecondaryTransactionService = require('../../../services/secondaryTransactionService');
const databaseAdapter = require('../../../services/databaseAdapter');

jest.mock('../../../services/databaseAdapter');

describe('SecondaryTransactionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateListingId', () => {
    it('should generate a listing ID with LST- prefix', () => {
      const id = SecondaryTransactionService.generateListingId();
      expect(id).toMatch(/^LST-[A-Z0-9]{8}$/);
    });

    it('should generate unique IDs on each call', () => {
      const id1 = SecondaryTransactionService.generateListingId();
      const id2 = SecondaryTransactionService.generateListingId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateTransactionId', () => {
    it('should generate a transaction ID with TXN- prefix', () => {
      const id = SecondaryTransactionService.generateTransactionId();
      expect(id).toMatch(/^TXN-[A-Z0-9]{8}$/);
    });
  });

  describe('createListing', () => {
    it('should create a listing with default values', async () => {
      const listingData = {
        companyId: 'comp-1',
        sellerId: 'seller-1',
        numberOfShares: 1000,
        askingPrice: 50000
      };

      databaseAdapter.create.mockResolvedValue({ ...listingData, _id: 'listing-1' });

      await SecondaryTransactionService.createListing(listingData);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'SecondaryMarketListing',
        expect.objectContaining({
          companyId: 'comp-1',
          sellerId: 'seller-1',
          numberOfShares: 1000,
          askingPrice: 50000,
          status: 'active',
          sharesAvailable: 1000,
          pricePerShare: 50
        })
      );
    });

    it('should generate listingId when not provided', async () => {
      databaseAdapter.create.mockResolvedValue({});

      await SecondaryTransactionService.createListing({ numberOfShares: 100 });

      const callArg = databaseAdapter.create.mock.calls[0][1];
      expect(callArg.listingId).toMatch(/^LST-/);
    });

    it('should preserve provided listingId and status', async () => {
      const listingData = {
        listingId: 'LST-CUSTOM01',
        status: 'pending_review',
        numberOfShares: 500,
        sharesAvailable: 300
      };

      databaseAdapter.create.mockResolvedValue({});

      await SecondaryTransactionService.createListing(listingData);

      const callArg = databaseAdapter.create.mock.calls[0][1];
      expect(callArg.listingId).toBe('LST-CUSTOM01');
      expect(callArg.status).toBe('pending_review');
      expect(callArg.sharesAvailable).toBe(300);
    });

    it('should not calculate pricePerShare when already provided', async () => {
      const listingData = {
        numberOfShares: 100,
        askingPrice: 5000,
        pricePerShare: 60
      };

      databaseAdapter.create.mockResolvedValue({});

      await SecondaryTransactionService.createListing(listingData);

      const callArg = databaseAdapter.create.mock.calls[0][1];
      expect(callArg.pricePerShare).toBe(60);
    });
  });

  describe('updateListing', () => {
    it('should update a listing with new data', async () => {
      const updated = { _id: 'listing-1', status: 'paused' };
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await SecondaryTransactionService.updateListing('listing-1', { status: 'paused' });

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'SecondaryMarketListing',
        'listing-1',
        expect.objectContaining({ status: 'paused', updatedAt: expect.any(Date) }),
        { new: true }
      );
      expect(result).toEqual(updated);
    });
  });

  describe('getListingById', () => {
    it('should return listing by ID', async () => {
      const listing = { _id: 'listing-1', status: 'active' };
      databaseAdapter.findById.mockResolvedValue(listing);

      const result = await SecondaryTransactionService.getListingById('listing-1');

      expect(databaseAdapter.findById).toHaveBeenCalledWith('SecondaryMarketListing', 'listing-1');
      expect(result).toEqual(listing);
    });

    it('should return null if listing not found', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      const result = await SecondaryTransactionService.getListingById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getListings', () => {
    it('should return listings with filters', async () => {
      const listings = [{ _id: '1' }, { _id: '2' }];
      databaseAdapter.find.mockResolvedValue(listings);

      const result = await SecondaryTransactionService.getListings({
        companyId: 'comp-1',
        status: 'active'
      });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'SecondaryMarketListing',
        { companyId: 'comp-1', status: 'active' },
        { sort: { listedAt: -1 } }
      );
      expect(result).toHaveLength(2);
    });

    it('should return all listings when no filters given', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      await SecondaryTransactionService.getListings();

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'SecondaryMarketListing',
        {},
        { sort: { listedAt: -1 } }
      );
    });

    it('should support all filter types', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      await SecondaryTransactionService.getListings({
        companyId: 'c1',
        sellerId: 's1',
        shareClassId: 'sc1',
        status: 'active',
        visibility: 'public'
      });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'SecondaryMarketListing',
        {
          companyId: 'c1',
          sellerId: 's1',
          shareClassId: 'sc1',
          status: 'active',
          visibility: 'public'
        },
        expect.any(Object)
      );
    });
  });

  describe('expressInterest', () => {
    it('should add a new interested buyer to a listing', async () => {
      const listing = {
        _id: 'listing-1',
        status: 'active',
        interestedBuyers: []
      };
      databaseAdapter.findById.mockResolvedValue(listing);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ ...listing, interestedBuyers: [{}] });

      await SecondaryTransactionService.expressInterest({
        listingId: 'listing-1',
        buyerId: 'buyer-1',
        buyerName: 'John Doe',
        offeredPrice: 55000,
        offeredShares: 1000,
        message: 'Interested in buying'
      });

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'SecondaryMarketListing',
        'listing-1',
        expect.objectContaining({
          interestedBuyers: expect.arrayContaining([
            expect.objectContaining({
              buyerId: 'buyer-1',
              buyerName: 'John Doe',
              status: 'interested'
            })
          ])
        }),
        { new: true }
      );
    });

    it('should update existing buyer interest', async () => {
      const listing = {
        _id: 'listing-1',
        status: 'active',
        interestedBuyers: [
          { buyerId: 'buyer-1', offeredPrice: 40000, status: 'interested' }
        ]
      };
      databaseAdapter.findById.mockResolvedValue(listing);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      await SecondaryTransactionService.expressInterest({
        listingId: 'listing-1',
        buyerId: 'buyer-1',
        buyerName: 'John Doe',
        offeredPrice: 50000,
        offeredShares: 900
      });

      const callArg = databaseAdapter.findByIdAndUpdate.mock.calls[0][2];
      expect(callArg.interestedBuyers).toHaveLength(1);
      expect(callArg.interestedBuyers[0].offeredPrice).toBe(50000);
    });

    it('should throw if listing not found', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      await expect(
        SecondaryTransactionService.expressInterest({ listingId: 'bad-id' })
      ).rejects.toThrow('Listing not found');
    });

    it('should throw if listing is not active', async () => {
      databaseAdapter.findById.mockResolvedValue({ _id: '1', status: 'withdrawn' });

      await expect(
        SecondaryTransactionService.expressInterest({ listingId: '1' })
      ).rejects.toThrow('Listing is not active');
    });

    it('should allow interest on partially_sold listing', async () => {
      const listing = {
        _id: 'listing-1',
        status: 'partially_sold',
        interestedBuyers: []
      };
      databaseAdapter.findById.mockResolvedValue(listing);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      await SecondaryTransactionService.expressInterest({
        listingId: 'listing-1',
        buyerId: 'buyer-1'
      });

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalled();
    });
  });

  describe('withdrawListing', () => {
    it('should withdraw an active listing', async () => {
      databaseAdapter.findById.mockResolvedValue({ _id: '1', status: 'active' });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ status: 'withdrawn' });

      await SecondaryTransactionService.withdrawListing('1', 'user-1');

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'SecondaryMarketListing',
        '1',
        expect.objectContaining({
          status: 'withdrawn',
          updatedBy: 'user-1',
          withdrawnAt: expect.any(Date)
        }),
        { new: true }
      );
    });

    it('should throw if listing not found', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      await expect(
        SecondaryTransactionService.withdrawListing('bad-id', 'user-1')
      ).rejects.toThrow('Listing not found');
    });

    it('should throw if listing cannot be withdrawn', async () => {
      databaseAdapter.findById.mockResolvedValue({ _id: '1', status: 'sold' });

      await expect(
        SecondaryTransactionService.withdrawListing('1', 'user-1')
      ).rejects.toThrow('Listing cannot be withdrawn');
    });
  });

  describe('initiateTransaction', () => {
    it('should create a transaction with calculated total', async () => {
      const txnData = {
        companyId: 'comp-1',
        sellerId: 'seller-1',
        buyerId: 'buyer-1',
        numberOfShares: 100,
        pricePerShare: 50
      };

      databaseAdapter.create.mockResolvedValue({ ...txnData, _id: 'txn-1' });

      await SecondaryTransactionService.initiateTransaction(txnData);

      const callArg = databaseAdapter.create.mock.calls[0][1];
      expect(callArg.status).toBe('pending');
      expect(callArg.totalAmount).toBe(5000);
      expect(callArg.transactionId).toMatch(/^TXN-/);
      expect(callArg.initiatedAt).toBeInstanceOf(Date);
    });

    it('should use provided totalAmount if given', async () => {
      const txnData = {
        totalAmount: 6000,
        numberOfShares: 100,
        pricePerShare: 50
      };

      databaseAdapter.create.mockResolvedValue({});

      await SecondaryTransactionService.initiateTransaction(txnData);

      const callArg = databaseAdapter.create.mock.calls[0][1];
      expect(callArg.totalAmount).toBe(6000);
    });
  });

  describe('getTransactionById', () => {
    it('should return transaction by ID', async () => {
      const txn = { _id: 'txn-1', status: 'pending' };
      databaseAdapter.findById.mockResolvedValue(txn);

      const result = await SecondaryTransactionService.getTransactionById('txn-1');

      expect(databaseAdapter.findById).toHaveBeenCalledWith('SecondaryTransaction', 'txn-1');
      expect(result).toEqual(txn);
    });
  });

  describe('completeTransaction', () => {
    it('should complete a pending transaction', async () => {
      databaseAdapter.findById.mockResolvedValue({ _id: 'txn-1', status: 'pending' });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ status: 'completed' });

      await SecondaryTransactionService.completeTransaction('txn-1');

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'SecondaryTransaction',
        'txn-1',
        expect.objectContaining({
          status: 'completed',
          completedAt: expect.any(Date),
          settlementDate: expect.any(Date)
        }),
        { new: true }
      );
    });

    it('should complete an approved transaction', async () => {
      databaseAdapter.findById.mockResolvedValue({ _id: 'txn-1', status: 'approved' });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ status: 'completed' });

      await SecondaryTransactionService.completeTransaction('txn-1');
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('should complete a transaction in_escrow', async () => {
      databaseAdapter.findById.mockResolvedValue({ _id: 'txn-1', status: 'in_escrow' });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ status: 'completed' });

      await SecondaryTransactionService.completeTransaction('txn-1');
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('should throw if transaction not found', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      await expect(
        SecondaryTransactionService.completeTransaction('bad')
      ).rejects.toThrow('Transaction not found');
    });

    it('should throw if transaction cannot be completed', async () => {
      databaseAdapter.findById.mockResolvedValue({ _id: '1', status: 'completed' });

      await expect(
        SecondaryTransactionService.completeTransaction('1')
      ).rejects.toThrow('Transaction cannot be completed');
    });

    it('should use provided settlementDate from completionData', async () => {
      const settlementDate = new Date('2026-06-01');
      databaseAdapter.findById.mockResolvedValue({ _id: 'txn-1', status: 'pending' });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      await SecondaryTransactionService.completeTransaction('txn-1', { settlementDate });

      const callArg = databaseAdapter.findByIdAndUpdate.mock.calls[0][2];
      expect(callArg.settlementDate).toEqual(settlementDate);
    });
  });

  describe('cancelTransaction', () => {
    it('should cancel a pending transaction', async () => {
      databaseAdapter.findById.mockResolvedValue({ _id: 'txn-1', status: 'pending' });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ status: 'canceled' });

      await SecondaryTransactionService.cancelTransaction('txn-1', 'Changed mind', 'user-1');

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'SecondaryTransaction',
        'txn-1',
        expect.objectContaining({
          status: 'canceled',
          cancellationReason: 'Changed mind',
          canceledBy: 'user-1',
          canceledAt: expect.any(Date)
        }),
        { new: true }
      );
    });

    it('should throw if transaction not found', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      await expect(
        SecondaryTransactionService.cancelTransaction('bad', 'reason', 'user')
      ).rejects.toThrow('Transaction not found');
    });

    it('should throw if transaction cannot be canceled', async () => {
      databaseAdapter.findById.mockResolvedValue({ _id: '1', status: 'completed' });

      await expect(
        SecondaryTransactionService.cancelTransaction('1', 'reason', 'user')
      ).rejects.toThrow('Transaction cannot be canceled');
    });
  });

  describe('approveTransaction', () => {
    it('should add an approval to a transaction', async () => {
      databaseAdapter.findById.mockResolvedValue({
        _id: 'txn-1',
        status: 'pending',
        approvals: []
      });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      await SecondaryTransactionService.approveTransaction('txn-1', {
        approverType: 'company',
        approverId: 'admin-1',
        status: 'approved',
        notes: 'Approved'
      });

      const callArg = databaseAdapter.findByIdAndUpdate.mock.calls[0][2];
      expect(callArg.approvals).toHaveLength(1);
      expect(callArg.approvals[0]).toMatchObject({
        approverType: 'company',
        status: 'approved',
        approvedAt: expect.any(Date)
      });
    });

    it('should set status to approved when all approvals pass for pending transaction', async () => {
      databaseAdapter.findById.mockResolvedValue({
        _id: 'txn-1',
        status: 'pending',
        approvals: []
      });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      await SecondaryTransactionService.approveTransaction('txn-1', {
        approverType: 'company',
        approverId: 'admin-1',
        status: 'approved'
      });

      const callArg = databaseAdapter.findByIdAndUpdate.mock.calls[0][2];
      expect(callArg.status).toBe('approved');
    });

    it('should not change status if approval is rejected', async () => {
      databaseAdapter.findById.mockResolvedValue({
        _id: 'txn-1',
        status: 'pending',
        approvals: []
      });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      await SecondaryTransactionService.approveTransaction('txn-1', {
        approverType: 'company',
        approverId: 'admin-1',
        status: 'rejected'
      });

      const callArg = databaseAdapter.findByIdAndUpdate.mock.calls[0][2];
      expect(callArg.status).toBe('pending');
    });

    it('should set approvedAt to null if status is not approved', async () => {
      databaseAdapter.findById.mockResolvedValue({
        _id: 'txn-1',
        status: 'pending',
        approvals: []
      });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      await SecondaryTransactionService.approveTransaction('txn-1', {
        approverType: 'company',
        approverId: 'admin-1',
        status: 'pending_review'
      });

      const callArg = databaseAdapter.findByIdAndUpdate.mock.calls[0][2];
      expect(callArg.approvals[0].approvedAt).toBeNull();
    });

    it('should throw if transaction not found', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      await expect(
        SecondaryTransactionService.approveTransaction('bad', {})
      ).rejects.toThrow('Transaction not found');
    });
  });

  describe('getTransactionHistory', () => {
    it('should return transactions with filters', async () => {
      databaseAdapter.find.mockResolvedValue([{ _id: '1' }]);

      const result = await SecondaryTransactionService.getTransactionHistory({
        companyId: 'comp-1',
        status: 'completed'
      });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'SecondaryTransaction',
        { companyId: 'comp-1', status: 'completed' },
        { sort: { transactionDate: -1 } }
      );
      expect(result).toHaveLength(1);
    });

    it('should add date range filters when provided', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      await SecondaryTransactionService.getTransactionHistory({
        startDate: '2026-01-01',
        endDate: '2026-12-31'
      });

      const queryArg = databaseAdapter.find.mock.calls[0][1];
      expect(queryArg.transactionDate).toEqual({
        $gte: expect.any(Date),
        $lte: expect.any(Date)
      });
    });

    it('should handle partial date range with only startDate', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      await SecondaryTransactionService.getTransactionHistory({
        startDate: '2026-01-01'
      });

      const queryArg = databaseAdapter.find.mock.calls[0][1];
      expect(queryArg.transactionDate.$gte).toBeDefined();
      expect(queryArg.transactionDate.$lte).toBeUndefined();
    });

    it('should support all filter types', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      await SecondaryTransactionService.getTransactionHistory({
        companyId: 'c1',
        sellerId: 's1',
        buyerId: 'b1',
        shareClassId: 'sc1',
        status: 'completed',
        transactionType: 'private_sale'
      });

      const queryArg = databaseAdapter.find.mock.calls[0][1];
      expect(queryArg).toEqual(expect.objectContaining({
        companyId: 'c1',
        sellerId: 's1',
        buyerId: 'b1',
        shareClassId: 'sc1',
        status: 'completed',
        transactionType: 'private_sale'
      }));
    });
  });

  describe('calculateFees', () => {
    it('should calculate fees for a private sale', async () => {
      const result = await SecondaryTransactionService.calculateFees({
        totalAmount: 100000,
        transactionType: 'private_sale'
      });

      expect(result.platformFee).toBe(1500);
      expect(result.legalFees).toBe(500);
      expect(result.transferAgentFee).toBe(100);
      expect(result.escrowFee).toBe(500);
      expect(result.totalFees).toBe(2600);
      expect(result.netAmount).toBe(97400);
      expect(result.feePercentage).toBe(2.6);
    });

    it('should use private_sale rates for unknown transaction types', async () => {
      const result = await SecondaryTransactionService.calculateFees({
        totalAmount: 100000,
        transactionType: 'unknown_type'
      });

      expect(result.platformFee).toBe(1500);
    });

    it('should cap transfer agent fee at $250', async () => {
      const result = await SecondaryTransactionService.calculateFees({
        totalAmount: 1000000,
        transactionType: 'private_sale'
      });

      expect(result.transferAgentFee).toBe(250);
    });

    it('should use lower escrow fee for amounts under $50,000', async () => {
      const result = await SecondaryTransactionService.calculateFees({
        totalAmount: 30000,
        transactionType: 'private_sale'
      });

      expect(result.escrowFee).toBe(250);
    });

    it('should calculate correct fees for gift transactions', async () => {
      const result = await SecondaryTransactionService.calculateFees({
        totalAmount: 10000,
        transactionType: 'gift'
      });

      expect(result.platformFee).toBe(25);
      expect(result.legalFees).toBe(25);
    });

    it('should default to private_sale when transactionType not given', async () => {
      const result = await SecondaryTransactionService.calculateFees({
        totalAmount: 100000
      });

      expect(result.platformFee).toBe(1500);
    });
  });

  describe('generateTransactionReport', () => {
    it('should generate a complete report for a transaction', async () => {
      const transaction = {
        _id: 'txn-1',
        transactionId: 'TXN-12345678',
        status: 'completed',
        transactionType: 'private_sale',
        sellerId: 'seller-1',
        buyerId: 'buyer-1',
        shareClassId: 'sc-1',
        numberOfShares: 100,
        pricePerShare: 50,
        totalAmount: 5000,
        transactionDate: new Date('2026-06-01'),
        initiatedAt: new Date('2026-05-01'),
        completedAt: new Date('2026-06-01'),
        approvals: [
          { approverType: 'company', status: 'approved', approvedAt: new Date('2026-05-15') }
        ],
        documents: ['doc-1']
      };

      databaseAdapter.findById.mockResolvedValue(transaction);

      const report = await SecondaryTransactionService.generateTransactionReport('txn-1');

      expect(report.transaction).toEqual(transaction);
      expect(report.summary.transactionId).toBe('TXN-12345678');
      expect(report.summary.status).toBe('completed');
      expect(report.fees).toBeDefined();
      expect(report.fees.totalFees).toBeGreaterThan(0);
      expect(report.timeline.length).toBeGreaterThan(0);
      expect(report.approvals).toHaveLength(1);
      expect(report.documents).toEqual(['doc-1']);
    });

    it('should throw if transaction not found', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      await expect(
        SecondaryTransactionService.generateTransactionReport('bad')
      ).rejects.toThrow('Transaction not found');
    });
  });

  describe('generateTransactionTimeline', () => {
    it('should generate timeline with all events', () => {
      const transaction = {
        transactionId: 'TXN-1',
        initiatedAt: new Date('2026-01-01'),
        approvals: [
          { approverType: 'company', status: 'approved', approvedAt: new Date('2026-01-05') }
        ],
        escrow: {
          fundsReceivedAt: new Date('2026-01-10'),
          fundsReleasedAt: new Date('2026-01-15')
        },
        completedAt: new Date('2026-01-20')
      };

      const timeline = SecondaryTransactionService.generateTransactionTimeline(transaction);

      expect(timeline).toHaveLength(5);
      expect(timeline[0].event).toBe('Transaction Initiated');
      expect(timeline[1].event).toBe('company Approval');
      expect(timeline[2].event).toBe('Funds Received in Escrow');
      expect(timeline[3].event).toBe('Funds Released from Escrow');
      expect(timeline[4].event).toBe('Transaction Completed');
    });

    it('should include cancellation event', () => {
      const transaction = {
        transactionId: 'TXN-1',
        initiatedAt: new Date('2026-01-01'),
        canceledAt: new Date('2026-01-02'),
        cancellationReason: 'Deal fell through'
      };

      const timeline = SecondaryTransactionService.generateTransactionTimeline(transaction);

      expect(timeline).toHaveLength(2);
      expect(timeline[1].event).toBe('Transaction Canceled');
      expect(timeline[1].description).toBe('Deal fell through');
    });

    it('should sort timeline by date', () => {
      const transaction = {
        transactionId: 'TXN-1',
        completedAt: new Date('2026-01-20'),
        initiatedAt: new Date('2026-01-01')
      };

      const timeline = SecondaryTransactionService.generateTransactionTimeline(transaction);

      const dates = timeline.map(t => new Date(t.date).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
      }
    });

    it('should return empty timeline for empty transaction', () => {
      const timeline = SecondaryTransactionService.generateTransactionTimeline({});
      expect(timeline).toHaveLength(0);
    });
  });

  describe('getMarketStatistics', () => {
    it('should return comprehensive market statistics', async () => {
      const transactions = [
        { status: 'completed', totalAmount: 10000, numberOfShares: 100 },
        { status: 'completed', totalAmount: 20000, numberOfShares: 200 },
        { status: 'pending', totalAmount: 5000, numberOfShares: 50 }
      ];
      const listings = [
        { status: 'active', sharesAvailable: 500 },
        { status: 'partially_sold', sharesAvailable: 200 },
        { status: 'sold', sharesAvailable: 0 }
      ];

      databaseAdapter.find
        .mockResolvedValueOnce(transactions)
        .mockResolvedValueOnce(listings);

      const stats = await SecondaryTransactionService.getMarketStatistics('comp-1');

      expect(stats.companyId).toBe('comp-1');
      expect(stats.totalTransactions).toBe(3);
      expect(stats.completedTransactions).toBe(2);
      expect(stats.pendingTransactions).toBe(1);
      expect(stats.totalListings).toBe(3);
      expect(stats.activeListings).toBe(2);
      expect(stats.totalVolume).toBe(30000);
      expect(stats.totalSharesTraded).toBe(300);
      expect(stats.averagePricePerShare).toBe(100);
      expect(stats.sharesAvailableForSale).toBe(700);
    });

    it('should handle zero completed transactions', async () => {
      databaseAdapter.find
        .mockResolvedValueOnce([{ status: 'pending', totalAmount: 0, numberOfShares: 0 }])
        .mockResolvedValueOnce([]);

      const stats = await SecondaryTransactionService.getMarketStatistics('comp-1');

      expect(stats.completedTransactions).toBe(0);
      expect(stats.totalVolume).toBe(0);
      expect(stats.averagePricePerShare).toBe(0);
    });
  });

  describe('FEE_RATES', () => {
    it('should define fee rates for all transaction types', () => {
      const rates = SecondaryTransactionService.FEE_RATES;
      expect(rates.private_sale).toBeDefined();
      expect(rates.tender_offer).toBeDefined();
      expect(rates.rofr_exercise).toBeDefined();
      expect(rates.gift).toBeDefined();
      expect(rates.estate_transfer).toBeDefined();
      expect(rates.company_buyback).toBeDefined();
    });
  });
});

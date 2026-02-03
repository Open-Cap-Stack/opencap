/**
 * SecondaryTransaction Service Unit Tests
 * Issue #103: Create Secondary Transaction Model
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
  count: jest.fn()
}));

const databaseAdapter = require('../../../services/databaseAdapter');
const secondaryTransactionService = require('../../../services/secondaryTransactionService');

describe('SecondaryTransaction Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createListing', () => {
    const validListingData = {
      companyId: 'company123',
      sellerId: 'seller123',
      shareClassId: 'shareClass123',
      numberOfShares: 1000,
      askingPrice: 50000,
      visibility: 'private'
    };

    it('should create a new listing successfully', async () => {
      const mockSavedListing = { _id: 'listing123', ...validListingData };
      databaseAdapter.create.mockResolvedValue(mockSavedListing);

      const result = await secondaryTransactionService.createListing(validListingData);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'SecondaryMarketListing',
        expect.objectContaining({
          ...validListingData,
          listingId: expect.stringMatching(/^LST-/)
        })
      );
      expect(result).toHaveProperty('_id', 'listing123');
    });

    it('should auto-generate listingId if not provided', async () => {
      databaseAdapter.create.mockResolvedValue({ _id: 'listing123' });

      await secondaryTransactionService.createListing(validListingData);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'SecondaryMarketListing',
        expect.objectContaining({
          listingId: expect.stringMatching(/^LST-[A-Z0-9]{8}$/)
        })
      );
    });

    it('should throw error for invalid data', async () => {
      databaseAdapter.create.mockRejectedValue(new Error('Validation error'));

      await expect(secondaryTransactionService.createListing({})).rejects.toThrow();
    });
  });

  describe('updateListing', () => {
    it('should update listing successfully', async () => {
      const mockUpdatedListing = { _id: 'listing123', askingPrice: 60000 };
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedListing);

      const result = await secondaryTransactionService.updateListing('listing123', { askingPrice: 60000 });

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'SecondaryMarketListing',
        'listing123',
        expect.objectContaining({ askingPrice: 60000 }),
        { new: true }
      );
      expect(result).toHaveProperty('askingPrice', 60000);
    });

    it('should return null if listing not found', async () => {
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(null);

      const result = await secondaryTransactionService.updateListing('nonexistent', { askingPrice: 60000 });

      expect(result).toBeNull();
    });
  });

  describe('expressInterest', () => {
    const interestData = {
      listingId: 'listing123',
      buyerId: 'buyer123',
      buyerName: 'John Doe',
      offeredPrice: 45000,
      message: 'Interested in purchasing'
    };

    it('should add interested buyer to listing', async () => {
      const mockListing = {
        _id: 'listing123',
        status: 'active',
        interestedBuyers: [],
        addInterestedBuyer: jest.fn()
      };
      databaseAdapter.findById.mockResolvedValue(mockListing);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockListing,
        interestedBuyers: [{ buyerId: 'buyer123' }]
      });

      const result = await secondaryTransactionService.expressInterest(interestData);

      expect(databaseAdapter.findById).toHaveBeenCalledWith('SecondaryMarketListing', 'listing123');
      expect(result).toBeDefined();
    });

    it('should throw error if listing not found', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      await expect(secondaryTransactionService.expressInterest(interestData)).rejects.toThrow('Listing not found');
    });

    it('should throw error if listing is not active', async () => {
      const mockListing = { _id: 'listing123', status: 'sold' };
      databaseAdapter.findById.mockResolvedValue(mockListing);

      await expect(secondaryTransactionService.expressInterest(interestData)).rejects.toThrow('Listing is not active');
    });
  });

  describe('initiateTransaction', () => {
    const transactionData = {
      companyId: 'company123',
      sellerId: 'seller123',
      buyerId: 'buyer123',
      shareClassId: 'shareClass123',
      numberOfShares: 500,
      pricePerShare: 50,
      transactionType: 'private_sale',
      transactionDate: new Date()
    };

    it('should create a new transaction', async () => {
      const mockTransaction = { _id: 'transaction123', ...transactionData };
      databaseAdapter.create.mockResolvedValue(mockTransaction);

      const result = await secondaryTransactionService.initiateTransaction(transactionData);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'SecondaryTransaction',
        expect.objectContaining({
          ...transactionData,
          transactionId: expect.stringMatching(/^TXN-/),
          status: 'pending',
          totalAmount: 25000
        })
      );
      expect(result).toHaveProperty('_id', 'transaction123');
    });

    it('should auto-generate transactionId', async () => {
      databaseAdapter.create.mockResolvedValue({ _id: 'transaction123' });

      await secondaryTransactionService.initiateTransaction(transactionData);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'SecondaryTransaction',
        expect.objectContaining({
          transactionId: expect.stringMatching(/^TXN-[A-Z0-9]{8}$/)
        })
      );
    });
  });

  describe('completeTransaction', () => {
    it('should complete a pending transaction', async () => {
      const mockTransaction = { _id: 'transaction123', status: 'pending' };
      databaseAdapter.findById.mockResolvedValue(mockTransaction);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockTransaction,
        status: 'completed'
      });

      const result = await secondaryTransactionService.completeTransaction('transaction123');

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'SecondaryTransaction',
        'transaction123',
        expect.objectContaining({
          status: 'completed',
          completedAt: expect.any(Date)
        }),
        { new: true }
      );
      expect(result).toHaveProperty('status', 'completed');
    });

    it('should throw error if transaction not found', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      await expect(secondaryTransactionService.completeTransaction('nonexistent')).rejects.toThrow('Transaction not found');
    });

    it('should throw error if transaction is already completed', async () => {
      const mockTransaction = { _id: 'transaction123', status: 'completed' };
      databaseAdapter.findById.mockResolvedValue(mockTransaction);

      await expect(secondaryTransactionService.completeTransaction('transaction123')).rejects.toThrow('Transaction cannot be completed');
    });
  });

  describe('cancelTransaction', () => {
    it('should cancel a pending transaction', async () => {
      const mockTransaction = { _id: 'transaction123', status: 'pending' };
      databaseAdapter.findById.mockResolvedValue(mockTransaction);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockTransaction,
        status: 'canceled'
      });

      const result = await secondaryTransactionService.cancelTransaction('transaction123', 'Buyer withdrew', 'user123');

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'SecondaryTransaction',
        'transaction123',
        expect.objectContaining({
          status: 'canceled',
          cancellationReason: 'Buyer withdrew',
          canceledBy: 'user123',
          canceledAt: expect.any(Date)
        }),
        { new: true }
      );
      expect(result).toHaveProperty('status', 'canceled');
    });

    it('should throw error if transaction cannot be canceled', async () => {
      const mockTransaction = { _id: 'transaction123', status: 'completed' };
      databaseAdapter.findById.mockResolvedValue(mockTransaction);

      await expect(secondaryTransactionService.cancelTransaction('transaction123', 'reason', 'user123')).rejects.toThrow('Transaction cannot be canceled');
    });
  });

  describe('getTransactionHistory', () => {
    it('should return transaction history for a company', async () => {
      const mockTransactions = [
        { _id: 'txn1', companyId: 'company123', status: 'completed' },
        { _id: 'txn2', companyId: 'company123', status: 'pending' }
      ];
      databaseAdapter.find.mockResolvedValue(mockTransactions);

      const result = await secondaryTransactionService.getTransactionHistory({ companyId: 'company123' });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'SecondaryTransaction',
        { companyId: 'company123' },
        expect.any(Object)
      );
      expect(result).toHaveLength(2);
    });

    it('should filter by status', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      await secondaryTransactionService.getTransactionHistory({
        companyId: 'company123',
        status: 'completed'
      });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'SecondaryTransaction',
        expect.objectContaining({ companyId: 'company123', status: 'completed' }),
        expect.any(Object)
      );
    });

    it('should filter by sellerId', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      await secondaryTransactionService.getTransactionHistory({ sellerId: 'seller123' });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'SecondaryTransaction',
        expect.objectContaining({ sellerId: 'seller123' }),
        expect.any(Object)
      );
    });

    it('should filter by buyerId', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      await secondaryTransactionService.getTransactionHistory({ buyerId: 'buyer123' });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'SecondaryTransaction',
        expect.objectContaining({ buyerId: 'buyer123' }),
        expect.any(Object)
      );
    });
  });

  describe('calculateFees', () => {
    it('should calculate transaction fees correctly', async () => {
      const transactionData = {
        totalAmount: 100000,
        transactionType: 'private_sale'
      };

      const result = await secondaryTransactionService.calculateFees(transactionData);

      expect(result).toHaveProperty('platformFee');
      expect(result).toHaveProperty('totalFees');
      expect(result.totalFees).toBeGreaterThanOrEqual(0);
    });

    it('should apply different fee rates for different transaction types', async () => {
      const privateSaleData = { totalAmount: 100000, transactionType: 'private_sale' };
      const giftData = { totalAmount: 100000, transactionType: 'gift' };

      const privateSaleFees = await secondaryTransactionService.calculateFees(privateSaleData);
      const giftFees = await secondaryTransactionService.calculateFees(giftData);

      // Gift transfers typically have lower fees
      expect(giftFees.platformFee).toBeLessThanOrEqual(privateSaleFees.platformFee);
    });
  });

  describe('generateTransactionReport', () => {
    it('should generate a report for a transaction', async () => {
      const mockTransaction = {
        _id: 'transaction123',
        transactionId: 'TXN-12345678',
        companyId: 'company123',
        sellerId: 'seller123',
        buyerId: 'buyer123',
        numberOfShares: 1000,
        pricePerShare: 50,
        totalAmount: 50000,
        status: 'completed',
        transactionDate: new Date(),
        completedAt: new Date()
      };
      databaseAdapter.findById.mockResolvedValue(mockTransaction);

      const result = await secondaryTransactionService.generateTransactionReport('transaction123');

      expect(result).toHaveProperty('transaction');
      expect(result).toHaveProperty('summary');
      expect(result.summary).toHaveProperty('transactionId', 'TXN-12345678');
      expect(result.summary).toHaveProperty('totalAmount', 50000);
    });

    it('should throw error if transaction not found', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      await expect(secondaryTransactionService.generateTransactionReport('nonexistent')).rejects.toThrow('Transaction not found');
    });
  });

  describe('getListings', () => {
    it('should return active listings for a company', async () => {
      const mockListings = [
        { _id: 'listing1', status: 'active' },
        { _id: 'listing2', status: 'active' }
      ];
      databaseAdapter.find.mockResolvedValue(mockListings);

      const result = await secondaryTransactionService.getListings({ companyId: 'company123' });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'SecondaryMarketListing',
        expect.objectContaining({ companyId: 'company123' }),
        expect.any(Object)
      );
      expect(result).toHaveLength(2);
    });

    it('should filter by visibility', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      await secondaryTransactionService.getListings({ visibility: 'public' });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'SecondaryMarketListing',
        expect.objectContaining({ visibility: 'public' }),
        expect.any(Object)
      );
    });
  });

  describe('getListingById', () => {
    it('should return a listing by ID', async () => {
      const mockListing = { _id: 'listing123', listingId: 'LST-12345678' };
      databaseAdapter.findById.mockResolvedValue(mockListing);

      const result = await secondaryTransactionService.getListingById('listing123');

      expect(databaseAdapter.findById).toHaveBeenCalledWith('SecondaryMarketListing', 'listing123');
      expect(result).toHaveProperty('listingId', 'LST-12345678');
    });
  });

  describe('withdrawListing', () => {
    it('should withdraw an active listing', async () => {
      const mockListing = { _id: 'listing123', status: 'active' };
      databaseAdapter.findById.mockResolvedValue(mockListing);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockListing,
        status: 'withdrawn'
      });

      const result = await secondaryTransactionService.withdrawListing('listing123', 'user123');

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'SecondaryMarketListing',
        'listing123',
        expect.objectContaining({
          status: 'withdrawn',
          withdrawnAt: expect.any(Date)
        }),
        { new: true }
      );
      expect(result).toHaveProperty('status', 'withdrawn');
    });

    it('should throw error if listing is not active', async () => {
      const mockListing = { _id: 'listing123', status: 'sold' };
      databaseAdapter.findById.mockResolvedValue(mockListing);

      await expect(secondaryTransactionService.withdrawListing('listing123', 'user123')).rejects.toThrow('Listing cannot be withdrawn');
    });
  });

  describe('getTransactionById', () => {
    it('should return a transaction by ID', async () => {
      const mockTransaction = { _id: 'transaction123', transactionId: 'TXN-12345678' };
      databaseAdapter.findById.mockResolvedValue(mockTransaction);

      const result = await secondaryTransactionService.getTransactionById('transaction123');

      expect(databaseAdapter.findById).toHaveBeenCalledWith('SecondaryTransaction', 'transaction123');
      expect(result).toHaveProperty('transactionId', 'TXN-12345678');
    });
  });

  describe('approveTransaction', () => {
    it('should add approval to a transaction', async () => {
      const mockTransaction = {
        _id: 'transaction123',
        status: 'pending',
        approvals: []
      };
      databaseAdapter.findById.mockResolvedValue(mockTransaction);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockTransaction,
        approvals: [{ approverType: 'board', status: 'approved' }]
      });

      const result = await secondaryTransactionService.approveTransaction('transaction123', {
        approverType: 'board',
        approverId: 'approver123',
        status: 'approved'
      });

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});

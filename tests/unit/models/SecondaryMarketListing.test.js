/**
 * SecondaryMarketListing Model Unit Tests
 * Issue #103: Create Secondary Transaction Model
 *
 * Tests the actual model file for creation, validation, query methods,
 * interested buyer tracking, transaction recording, and status transitions.
 */

// Mock the ZeroDB base model before importing the model
jest.mock('../../../models/base/ZeroDBModel', () => {
  let mockData = [];

  const mockBaseModel = {
    create: jest.fn(async (data) => {
      const doc = { _id: `id_${Date.now()}_${Math.random()}`, ...data };
      mockData.push(doc);
      return doc;
    }),
    find: jest.fn(async (query = {}) => {
      return mockData.filter(doc => {
        for (const [key, value] of Object.entries(query)) {
          if (doc[key] !== value) return false;
        }
        return true;
      });
    }),
    findOne: jest.fn(async (query = {}) => {
      return mockData.find(doc => {
        for (const [key, value] of Object.entries(query)) {
          if (doc[key] !== value) return false;
        }
        return true;
      }) || null;
    }),
    findById: jest.fn(async (id) => {
      return mockData.find(doc => doc._id === id) || null;
    }),
    updateOne: jest.fn(async (query, update) => {
      const doc = mockData.find(d => {
        for (const [key, value] of Object.entries(query)) {
          if (d[key] !== value) return false;
        }
        return true;
      });
      if (doc) {
        if (update.$set) {
          Object.assign(doc, update.$set);
        } else {
          Object.assign(doc, update);
        }
        return { modifiedCount: 1 };
      }
      return { modifiedCount: 0 };
    }),
    findOneAndUpdate: jest.fn(async () => null),
    findByIdAndUpdate: jest.fn(async () => null),
    updateMany: jest.fn(async () => ({ modifiedCount: 0 })),
    deleteOne: jest.fn(async (query) => {
      const index = mockData.findIndex(d => {
        for (const [key, value] of Object.entries(query)) {
          if (d[key] !== value) return false;
        }
        return true;
      });
      if (index >= 0) {
        mockData.splice(index, 1);
        return { deletedCount: 1 };
      }
      return { deletedCount: 0 };
    }),
    deleteMany: jest.fn(async () => ({ deletedCount: 0 })),
    findOneAndDelete: jest.fn(async () => null),
    findByIdAndDelete: jest.fn(async () => null),
    countDocuments: jest.fn(async () => mockData.length),
    exists: jest.fn(async () => mockData.length > 0),
    distinct: jest.fn(async () => []),
    aggregate: jest.fn(async () => []),
    tableName: 'secondary_market_listings'
  };

  return {
    createModel: jest.fn(() => mockBaseModel),
    __mockData: mockData,
    __resetMockData: () => { mockData.length = 0; },
    __getMockBaseModel: () => mockBaseModel
  };
});

const SecondaryMarketListing = require('../../../models/SecondaryMarketListing');
const zeroDBModelMock = require('../../../models/base/ZeroDBModel');

describe('SecondaryMarketListing Model', () => {
  beforeEach(() => {
    zeroDBModelMock.__resetMockData();
    jest.clearAllMocks();
  });

  const validData = {
    companyId: 'company_123',
    sellerId: 'seller_456',
    shareClassId: 'sc_001',
    numberOfShares: 500,
    askingPrice: 25000
  };

  describe('Constants', () => {
    it('should export valid statuses', () => {
      expect(SecondaryMarketListing.VALID_STATUSES).toEqual(
        ['draft', 'active', 'pending_approval', 'sold', 'partially_sold', 'expired', 'withdrawn', 'suspended']
      );
    });

    it('should export visibility options', () => {
      expect(SecondaryMarketListing.VISIBILITY_OPTIONS).toEqual(
        ['public', 'private', 'invited_only']
      );
    });

    it('should export buyer statuses', () => {
      expect(SecondaryMarketListing.BUYER_STATUSES).toEqual(
        ['interested', 'negotiating', 'accepted', 'rejected', 'withdrawn']
      );
    });
  });

  describe('Schema', () => {
    it('should have a schema definition', () => {
      expect(SecondaryMarketListing.schema).toBeDefined();
      expect(SecondaryMarketListing.schema.listingId).toBeDefined();
      expect(SecondaryMarketListing.schema.companyId).toBeDefined();
      expect(SecondaryMarketListing.schema.sellerId).toBeDefined();
    });

    it('should define the table name as secondary_market_listings', () => {
      expect(SecondaryMarketListing.tableName).toBe('secondary_market_listings');
    });
  });

  describe('create()', () => {
    it('should create a listing with valid data', async () => {
      const result = await SecondaryMarketListing.create({ ...validData });
      expect(result).toBeDefined();
      expect(result.companyId).toBe('company_123');
      expect(result.sellerId).toBe('seller_456');
      expect(result.numberOfShares).toBe(500);
      expect(result.askingPrice).toBe(25000);
    });

    it('should auto-generate listingId if not provided', async () => {
      const result = await SecondaryMarketListing.create({ ...validData });
      expect(result.listingId).toBeDefined();
      expect(result.listingId).toMatch(/^lst_/);
    });

    it('should use provided listingId if given', async () => {
      const result = await SecondaryMarketListing.create({
        ...validData,
        listingId: 'lst_custom_123'
      });
      expect(result.listingId).toBe('lst_custom_123');
    });

    it('should default status to active', async () => {
      const result = await SecondaryMarketListing.create({ ...validData });
      expect(result.status).toBe('active');
    });

    it('should set listedAt if not provided', async () => {
      const result = await SecondaryMarketListing.create({ ...validData });
      expect(result.listedAt).toBeDefined();
    });

    it('should initialize sharesAvailable to numberOfShares', async () => {
      const result = await SecondaryMarketListing.create({ ...validData });
      expect(result.sharesAvailable).toBe(500);
    });

    it('should calculate pricePerShare if not provided', async () => {
      const result = await SecondaryMarketListing.create({ ...validData });
      expect(result.pricePerShare).toBe(25000 / 500);
    });

    it('should not overwrite sharesAvailable if explicitly set', async () => {
      const result = await SecondaryMarketListing.create({
        ...validData,
        sharesAvailable: 250
      });
      expect(result.sharesAvailable).toBe(250);
    });

    it('should throw error if numberOfShares is less than 1', async () => {
      await expect(
        SecondaryMarketListing.create({ ...validData, numberOfShares: 0 })
      ).rejects.toThrow('numberOfShares must be at least 1');
    });

    it('should throw error if askingPrice is negative', async () => {
      await expect(
        SecondaryMarketListing.create({ ...validData, askingPrice: -100 })
      ).rejects.toThrow('askingPrice cannot be negative');
    });
  });

  describe('findByListingId()', () => {
    it('should find a listing by its listingId', async () => {
      await SecondaryMarketListing.create({
        ...validData,
        listingId: 'lst_find_me'
      });
      const found = await SecondaryMarketListing.findByListingId('lst_find_me');
      expect(found).toBeDefined();
      expect(found.listingId).toBe('lst_find_me');
    });

    it('should return null for non-existent listingId', async () => {
      const found = await SecondaryMarketListing.findByListingId('lst_nonexistent');
      expect(found).toBeNull();
    });
  });

  describe('findByCompany()', () => {
    it('should find listings by companyId', async () => {
      await SecondaryMarketListing.create({ ...validData, companyId: 'comp_A' });
      await SecondaryMarketListing.create({ ...validData, companyId: 'comp_A' });
      await SecondaryMarketListing.create({ ...validData, companyId: 'comp_B' });

      const results = await SecondaryMarketListing.findByCompany('comp_A');
      expect(results).toHaveLength(2);
    });

    it('should filter by status when provided', async () => {
      await SecondaryMarketListing.create({ ...validData, companyId: 'comp_C' });
      const results = await SecondaryMarketListing.findByCompany('comp_C', { status: 'active' });
      expect(results).toHaveLength(1);
    });

    it('should filter by visibility when provided', async () => {
      await SecondaryMarketListing.create({ ...validData, companyId: 'comp_D', visibility: 'public' });
      const results = await SecondaryMarketListing.findByCompany('comp_D', { visibility: 'public' });
      expect(results).toHaveLength(1);
    });
  });

  describe('findBySeller()', () => {
    it('should find listings by sellerId', async () => {
      await SecondaryMarketListing.create({ ...validData, sellerId: 'seller_A' });
      await SecondaryMarketListing.create({ ...validData, sellerId: 'seller_A' });

      const results = await SecondaryMarketListing.findBySeller('seller_A');
      expect(results).toHaveLength(2);
    });

    it('should filter by status when provided', async () => {
      await SecondaryMarketListing.create({ ...validData, sellerId: 'seller_B' });
      const results = await SecondaryMarketListing.findBySeller('seller_B', { status: 'active' });
      expect(results).toHaveLength(1);
    });
  });

  describe('findActive()', () => {
    it('should find active listings by companyId', async () => {
      await SecondaryMarketListing.create({ ...validData, companyId: 'comp_active' });
      const results = await SecondaryMarketListing.findActive('comp_active');
      expect(results).toHaveLength(1);
    });
  });

  describe('getInterestedBuyersCount()', () => {
    it('should return the count of interested buyers', () => {
      const listing = {
        interestedBuyers: [
          { buyerId: 'b1' },
          { buyerId: 'b2' },
          { buyerId: 'b3' }
        ]
      };
      expect(SecondaryMarketListing.getInterestedBuyersCount(listing)).toBe(3);
    });

    it('should return 0 when interestedBuyers is undefined', () => {
      const listing = {};
      expect(SecondaryMarketListing.getInterestedBuyersCount(listing)).toBe(0);
    });

    it('should return 0 for empty interestedBuyers array', () => {
      const listing = { interestedBuyers: [] };
      expect(SecondaryMarketListing.getInterestedBuyersCount(listing)).toBe(0);
    });
  });

  describe('getTotalAskingValue()', () => {
    it('should return askingPrice when set', () => {
      const listing = { askingPrice: 50000, pricePerShare: 100, numberOfShares: 500 };
      expect(SecondaryMarketListing.getTotalAskingValue(listing)).toBe(50000);
    });

    it('should calculate from pricePerShare and numberOfShares when askingPrice is falsy', () => {
      const listing = { askingPrice: 0, pricePerShare: 100, numberOfShares: 500 };
      expect(SecondaryMarketListing.getTotalAskingValue(listing)).toBe(50000);
    });
  });

  describe('getSoldPercentage()', () => {
    it('should calculate sold percentage correctly', () => {
      const listing = { numberOfShares: 1000, sharesAvailable: 600 };
      expect(SecondaryMarketListing.getSoldPercentage(listing)).toBe(40);
    });

    it('should return 0 when numberOfShares is 0', () => {
      const listing = { numberOfShares: 0, sharesAvailable: 0 };
      expect(SecondaryMarketListing.getSoldPercentage(listing)).toBe(0);
    });

    it('should return 100 when all shares are sold', () => {
      const listing = { numberOfShares: 1000, sharesAvailable: 0 };
      expect(SecondaryMarketListing.getSoldPercentage(listing)).toBe(100);
    });

    it('should handle undefined sharesAvailable', () => {
      const listing = { numberOfShares: 100 };
      // sharesAvailable defaults to 0 via || 0
      expect(SecondaryMarketListing.getSoldPercentage(listing)).toBe(100);
    });
  });

  describe('isExpired()', () => {
    it('should return false when no expiresAt is set', () => {
      const listing = {};
      expect(SecondaryMarketListing.isExpired(listing)).toBe(false);
    });

    it('should return true when expiresAt is in the past', () => {
      const listing = { expiresAt: '2020-01-01T00:00:00Z' };
      expect(SecondaryMarketListing.isExpired(listing)).toBe(true);
    });

    it('should return false when expiresAt is in the future', () => {
      const listing = { expiresAt: '2099-12-31T23:59:59Z' };
      expect(SecondaryMarketListing.isExpired(listing)).toBe(false);
    });
  });

  describe('addInterestedBuyer()', () => {
    it('should add a new interested buyer', async () => {
      await SecondaryMarketListing.create({
        ...validData,
        listingId: 'lst_buyer_test',
        interestedBuyers: []
      });

      await SecondaryMarketListing.addInterestedBuyer('lst_buyer_test', {
        buyerId: 'buyer_001',
        buyerName: 'Test Buyer',
        offeredPrice: 24000,
        offeredShares: 500,
        message: 'Interested in buying'
      });

      const baseModel = zeroDBModelMock.__getMockBaseModel();
      expect(baseModel.updateOne).toHaveBeenCalled();
      const updateCall = baseModel.updateOne.mock.calls[0];
      const buyers = updateCall[1].$set.interestedBuyers;
      expect(buyers).toHaveLength(1);
      expect(buyers[0].buyerId).toBe('buyer_001');
      expect(buyers[0].status).toBe('interested');
    });

    it('should update an existing interested buyer', async () => {
      await SecondaryMarketListing.create({
        ...validData,
        listingId: 'lst_buyer_update',
        interestedBuyers: [
          {
            buyerId: 'buyer_002',
            buyerName: 'Returning Buyer',
            offeredPrice: 20000,
            offeredShares: 400,
            expressedAt: '2026-01-01T00:00:00Z'
          }
        ]
      });

      await SecondaryMarketListing.addInterestedBuyer('lst_buyer_update', {
        buyerId: 'buyer_002',
        offeredPrice: 22000,
        offeredShares: 450,
        message: 'Increased offer'
      });

      const baseModel = zeroDBModelMock.__getMockBaseModel();
      const updateCall = baseModel.updateOne.mock.calls[0];
      const buyers = updateCall[1].$set.interestedBuyers;
      expect(buyers).toHaveLength(1);
      expect(buyers[0].offeredPrice).toBe(22000);
    });

    it('should throw error for non-existent listing', async () => {
      await expect(
        SecondaryMarketListing.addInterestedBuyer('lst_nonexistent', {
          buyerId: 'buyer_003',
          buyerName: 'Missing'
        })
      ).rejects.toThrow('Listing not found');
    });
  });

  describe('respondToBuyer()', () => {
    it('should update buyer status with a response', async () => {
      await SecondaryMarketListing.create({
        ...validData,
        listingId: 'lst_respond_test',
        interestedBuyers: [
          { buyerId: 'buyer_resp_001', status: 'interested' }
        ]
      });

      await SecondaryMarketListing.respondToBuyer('lst_respond_test', 'buyer_resp_001', {
        status: 'accepted',
        message: 'Welcome aboard'
      });

      const baseModel = zeroDBModelMock.__getMockBaseModel();
      const updateCall = baseModel.updateOne.mock.calls[0];
      const buyers = updateCall[1].$set.interestedBuyers;
      expect(buyers[0].status).toBe('accepted');
      expect(buyers[0].responseMessage).toBe('Welcome aboard');
      expect(buyers[0].respondedAt).toBeDefined();
    });

    it('should throw error for non-existent listing', async () => {
      await expect(
        SecondaryMarketListing.respondToBuyer('lst_nonexistent', 'buyer_x', { status: 'rejected' })
      ).rejects.toThrow('Listing not found');
    });

    it('should throw error for non-existent buyer', async () => {
      await SecondaryMarketListing.create({
        ...validData,
        listingId: 'lst_no_buyer',
        interestedBuyers: []
      });

      await expect(
        SecondaryMarketListing.respondToBuyer('lst_no_buyer', 'buyer_missing', { status: 'rejected' })
      ).rejects.toThrow('Buyer not found');
    });
  });

  describe('recordTransaction()', () => {
    it('should record a completed transaction and reduce shares available', async () => {
      await SecondaryMarketListing.create({
        ...validData,
        listingId: 'lst_record_tx',
        numberOfShares: 1000,
        sharesAvailable: 1000
      });

      await SecondaryMarketListing.recordTransaction('lst_record_tx', {
        transactionId: 'tx_001',
        buyerId: 'buyer_rec_001',
        numberOfShares: 300,
        pricePerShare: 50
      });

      const baseModel = zeroDBModelMock.__getMockBaseModel();
      const updateCall = baseModel.updateOne.mock.calls[0];
      const updateData = updateCall[1].$set;
      expect(updateData.sharesAvailable).toBe(700);
      expect(updateData.status).toBe('partially_sold');
      expect(updateData.completedTransactions).toHaveLength(1);
    });

    it('should set status to sold when all shares are sold', async () => {
      await SecondaryMarketListing.create({
        ...validData,
        listingId: 'lst_sold_all',
        numberOfShares: 500,
        sharesAvailable: 500
      });

      await SecondaryMarketListing.recordTransaction('lst_sold_all', {
        transactionId: 'tx_002',
        buyerId: 'buyer_rec_002',
        numberOfShares: 500,
        pricePerShare: 50
      });

      const baseModel = zeroDBModelMock.__getMockBaseModel();
      const updateCall = baseModel.updateOne.mock.calls[0];
      const updateData = updateCall[1].$set;
      expect(updateData.sharesAvailable).toBe(0);
      expect(updateData.status).toBe('sold');
      expect(updateData.soldAt).toBeDefined();
    });

    it('should throw error for non-existent listing', async () => {
      await expect(
        SecondaryMarketListing.recordTransaction('lst_nonexistent', {
          transactionId: 'tx_003',
          buyerId: 'buyer_x',
          numberOfShares: 100,
          pricePerShare: 50
        })
      ).rejects.toThrow('Listing not found');
    });
  });

  describe('withdraw()', () => {
    it('should withdraw a listing', async () => {
      await SecondaryMarketListing.create({
        ...validData,
        listingId: 'lst_withdraw_test'
      });

      await SecondaryMarketListing.withdraw('lst_withdraw_test');

      const baseModel = zeroDBModelMock.__getMockBaseModel();
      expect(baseModel.updateOne).toHaveBeenCalledWith(
        { listingId: 'lst_withdraw_test' },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'withdrawn'
          })
        })
      );
    });
  });

  describe('Exposed base model methods', () => {
    it('should expose find method', () => {
      expect(typeof SecondaryMarketListing.find).toBe('function');
    });

    it('should expose findOne method', () => {
      expect(typeof SecondaryMarketListing.findOne).toBe('function');
    });

    it('should expose findById method', () => {
      expect(typeof SecondaryMarketListing.findById).toBe('function');
    });

    it('should expose updateOne method', () => {
      expect(typeof SecondaryMarketListing.updateOne).toBe('function');
    });

    it('should expose deleteOne method', () => {
      expect(typeof SecondaryMarketListing.deleteOne).toBe('function');
    });

    it('should expose countDocuments method', () => {
      expect(typeof SecondaryMarketListing.countDocuments).toBe('function');
    });

    it('should expose aggregate method', () => {
      expect(typeof SecondaryMarketListing.aggregate).toBe('function');
    });
  });
});

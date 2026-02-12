/**
 * StripeCustomer Model Tests
 */

const StripeCustomer = require('../../../models/StripeCustomer');

// Mock the ZeroDB service
jest.mock('../../../services/zerodbService', () => ({
  initialize: jest.fn(),
  projectId: 'test-project',
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRowById: jest.fn(),
  createTable: jest.fn(),
  client: {
    put: jest.fn()
  }
}));

const zerodbService = require('../../../services/zerodbService');

describe('StripeCustomer Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a stripe customer mapping', async () => {
      zerodbService.insertRow.mockResolvedValue({
        data: [{
          row_id: 'row_1',
          row_data: {
            _id: 'test-uuid',
            mappingId: 'scm_test',
            companyId: 'comp_123',
            stripeCustomerId: 'cus_test123',
            email: 'test@example.com',
            name: 'Test Co'
          }
        }]
      });

      const result = await StripeCustomer.create({
        companyId: 'comp_123',
        stripeCustomerId: 'cus_test123',
        email: 'test@example.com',
        name: 'Test Co'
      });

      expect(result).toBeDefined();
      expect(result.companyId).toBe('comp_123');
      expect(result.stripeCustomerId).toBe('cus_test123');
    });

    it('should auto-generate mappingId if not provided', async () => {
      zerodbService.insertRow.mockResolvedValue({
        data: [{
          row_id: 'row_1',
          row_data: {
            _id: 'test-uuid',
            mappingId: expect.stringMatching(/^scm_/),
            companyId: 'comp_123',
            stripeCustomerId: 'cus_test123'
          }
        }]
      });

      const result = await StripeCustomer.create({
        companyId: 'comp_123',
        stripeCustomerId: 'cus_test123'
      });

      expect(result).toBeDefined();
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'stripe_customers',
        expect.objectContaining({
          mappingId: expect.stringMatching(/^scm_/)
        })
      );
    });

    it('should throw when companyId is missing', async () => {
      await expect(StripeCustomer.create({
        stripeCustomerId: 'cus_test123'
      })).rejects.toThrow('companyId is required');
    });

    it('should throw when stripeCustomerId is missing', async () => {
      await expect(StripeCustomer.create({
        companyId: 'comp_123'
      })).rejects.toThrow('stripeCustomerId is required');
    });
  });

  describe('findByCompanyId', () => {
    it('should find by company ID', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [{
          row_id: 'row_1',
          row_data: {
            companyId: 'comp_123',
            stripeCustomerId: 'cus_test123'
          }
        }]
      });

      const result = await StripeCustomer.findByCompanyId('comp_123');
      expect(result).toBeDefined();
      expect(result.companyId).toBe('comp_123');
    });

    it('should return null when not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      const result = await StripeCustomer.findByCompanyId('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findByStripeId', () => {
    it('should find by Stripe customer ID', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: [{
          row_id: 'row_1',
          row_data: {
            companyId: 'comp_123',
            stripeCustomerId: 'cus_test123'
          }
        }]
      });

      const result = await StripeCustomer.findByStripeId('cus_test123');
      expect(result).toBeDefined();
      expect(result.stripeCustomerId).toBe('cus_test123');
    });
  });
});

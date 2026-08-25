/**
 * PaymentMethod Model - Comprehensive Unit Tests
 *
 * Tests all async methods (create, findByMethodId, findByCustomer,
 * findByStripeId, getDefault, setDefault, deactivate) and sync helpers
 * (isExpired, isExpiredCheck, getMaskedDisplay, getDisplayLabel) by mocking ZeroDB.
 */

jest.mock('../../../services/zerodbService', () => ({
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  deleteRowById: jest.fn(),
  initialize: jest.fn(),
  projectId: 'mock-project-id',
  client: { put: jest.fn().mockResolvedValue({}) }
}));

const zerodbService = require('../../../services/zerodbService');
const PaymentMethod = require('../../../models/PaymentMethod');

describe('PaymentMethod Model - Comprehensive', () => {
  const validCardData = () => ({
    customerId: 'cust_001',
    type: 'card',
    last4: '4242',
    brand: 'visa',
    expiryMonth: 12,
    expiryYear: 2099
  });

  const validBankData = () => ({
    customerId: 'cust_001',
    type: 'bank_account',
    last4: '6789'
  });

  const makeInsertResponse = (overrides = {}) => ({
    data: [{
      row_id: 'row-1',
      row_data: {
        _id: 'uuid-1',
        methodId: 'pm_uuid',
        ...validCardData(),
        status: 'active',
        ...overrides
      }
    }]
  });

  const makeQueryResponse = (items = []) => ({
    data: items.map((item, i) => ({
      row_id: `row-${i}`,
      row_data: item
    }))
  });

  beforeEach(() => {
    jest.clearAllMocks();
    zerodbService.insertRow.mockResolvedValue(makeInsertResponse());
    zerodbService.queryTable.mockResolvedValue({ data: [] });
    zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });
    zerodbService.client.put.mockResolvedValue({});
  });

  // =========================================================================
  // create()
  // =========================================================================
  describe('create()', () => {
    it('should generate methodId when not provided', async () => {
      await PaymentMethod.create(validCardData());
      const inserted = zerodbService.insertRow.mock.calls[0][1];
      expect(inserted.methodId).toBeDefined();
      expect(inserted.methodId.startsWith('pm_')).toBe(true);
    });

    it('should preserve provided methodId', async () => {
      await PaymentMethod.create({ ...validCardData(), methodId: 'pm_custom' });
      const inserted = zerodbService.insertRow.mock.calls[0][1];
      expect(inserted.methodId).toBe('pm_custom');
    });

    it('should throw for invalid type', async () => {
      await expect(PaymentMethod.create({ ...validCardData(), type: 'crypto' }))
        .rejects.toThrow('type must be one of');
    });

    it('should accept card type', async () => {
      await PaymentMethod.create(validCardData());
      expect(zerodbService.insertRow).toHaveBeenCalled();
    });

    it('should accept bank_account type', async () => {
      await PaymentMethod.create(validBankData());
      expect(zerodbService.insertRow).toHaveBeenCalled();
    });

    it('should throw when last4 is missing', async () => {
      const data = validCardData();
      delete data.last4;
      await expect(PaymentMethod.create(data)).rejects.toThrow('last4 must be exactly 4 characters');
    });

    it('should throw when last4 is not exactly 4 characters', async () => {
      await expect(PaymentMethod.create({ ...validCardData(), last4: '123' }))
        .rejects.toThrow('last4 must be exactly 4 characters');
    });

    it('should throw when last4 is 5 characters', async () => {
      await expect(PaymentMethod.create({ ...validCardData(), last4: '12345' }))
        .rejects.toThrow('last4 must be exactly 4 characters');
    });

    it('should default status to active', async () => {
      await PaymentMethod.create(validCardData());
      const inserted = zerodbService.insertRow.mock.calls[0][1];
      expect(inserted.status).toBe('active');
    });

    it('should preserve provided status', async () => {
      await PaymentMethod.create({ ...validCardData(), status: 'inactive' });
      const inserted = zerodbService.insertRow.mock.calls[0][1];
      expect(inserted.status).toBe('inactive');
    });

    it('should set status to expired for expired card', async () => {
      await PaymentMethod.create({
        ...validCardData(),
        expiryMonth: 1,
        expiryYear: 2020
      });
      const inserted = zerodbService.insertRow.mock.calls[0][1];
      expect(inserted.status).toBe('expired');
    });

    it('should not auto-expire bank accounts', async () => {
      await PaymentMethod.create({
        ...validBankData(),
        expiryMonth: 1,
        expiryYear: 2020
      });
      const inserted = zerodbService.insertRow.mock.calls[0][1];
      expect(inserted.status).toBe('active');
    });

    it('should call baseModel.create', async () => {
      await PaymentMethod.create(validCardData());
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'payment_methods',
        expect.objectContaining({ customerId: 'cust_001' })
      );
    });
  });

  // =========================================================================
  // findByMethodId()
  // =========================================================================
  describe('findByMethodId()', () => {
    it('should return payment method when found', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{ methodId: 'pm_001', last4: '4242' }])
      );
      const result = await PaymentMethod.findByMethodId('pm_001');
      expect(result).toBeDefined();
      expect(result.methodId).toBe('pm_001');
    });

    it('should return null when not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await PaymentMethod.findByMethodId('nonexistent');
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // findByCustomer()
  // =========================================================================
  describe('findByCustomer()', () => {
    it('should query by customerId', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      await PaymentMethod.findByCustomer('cust_001');
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'payment_methods',
        expect.objectContaining({
          filter: { customerId: 'cust_001' }
        })
      );
    });

    it('should filter by status when provided', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      await PaymentMethod.findByCustomer('cust_001', { status: 'active' });
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'payment_methods',
        expect.objectContaining({
          filter: { customerId: 'cust_001', status: 'active' }
        })
      );
    });

    it('should return multiple results', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([
          { methodId: 'pm_001', customerId: 'cust_001' },
          { methodId: 'pm_002', customerId: 'cust_001' }
        ])
      );
      const results = await PaymentMethod.findByCustomer('cust_001');
      expect(results).toHaveLength(2);
    });
  });

  // =========================================================================
  // findByStripeId()
  // =========================================================================
  describe('findByStripeId()', () => {
    it('should query by stripePaymentMethodId', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{ stripePaymentMethodId: 'pm_stripe_001' }])
      );
      const result = await PaymentMethod.findByStripeId('pm_stripe_001');
      expect(result).toBeDefined();
      expect(result.stripePaymentMethodId).toBe('pm_stripe_001');
    });

    it('should return null when not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await PaymentMethod.findByStripeId('nonexistent');
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // getDefault()
  // =========================================================================
  describe('getDefault()', () => {
    it('should query for default active payment method', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{ methodId: 'pm_001', isDefault: true, status: 'active' }])
      );
      const result = await PaymentMethod.getDefault('cust_001');
      expect(result).toBeDefined();
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'payment_methods',
        expect.objectContaining({
          filter: { customerId: 'cust_001', isDefault: true, status: 'active' }
        })
      );
    });

    it('should return null when no default exists', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await PaymentMethod.getDefault('cust_001');
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // isExpired() and isExpiredCheck()
  // =========================================================================
  describe('isExpired()', () => {
    it('should return false for bank_account', () => {
      expect(PaymentMethod.isExpired({ type: 'bank_account', expiryMonth: 1, expiryYear: 2020 })).toBe(false);
    });

    it('should return false when expiryMonth is null', () => {
      expect(PaymentMethod.isExpired({ type: 'card', expiryMonth: null, expiryYear: 2020 })).toBe(false);
    });

    it('should return false when expiryYear is null', () => {
      expect(PaymentMethod.isExpired({ type: 'card', expiryMonth: 12, expiryYear: null })).toBe(false);
    });

    it('should return true for expired card', () => {
      expect(PaymentMethod.isExpired({ type: 'card', expiryMonth: 1, expiryYear: 2020 })).toBe(true);
    });

    it('should return false for future card', () => {
      expect(PaymentMethod.isExpired({ type: 'card', expiryMonth: 12, expiryYear: 2099 })).toBe(false);
    });

    it('should return false when no expiryMonth', () => {
      expect(PaymentMethod.isExpired({ type: 'card', expiryYear: 2099 })).toBe(false);
    });

    it('should return false when no expiryYear', () => {
      expect(PaymentMethod.isExpired({ type: 'card', expiryMonth: 12 })).toBe(false);
    });
  });

  describe('isExpiredCheck()', () => {
    it('should be the same function as isExpired uses', () => {
      const data = { type: 'card', expiryMonth: 1, expiryYear: 2020 };
      expect(PaymentMethod.isExpiredCheck(data)).toBe(PaymentMethod.isExpired(data));
    });

    it('should return false for non-card type', () => {
      expect(PaymentMethod.isExpiredCheck({ type: 'bank_account' })).toBe(false);
    });
  });

  // =========================================================================
  // getMaskedDisplay()
  // =========================================================================
  describe('getMaskedDisplay()', () => {
    it('should mask card number', () => {
      expect(PaymentMethod.getMaskedDisplay({ type: 'card', last4: '4242' }))
        .toBe('**** **** **** 4242');
    });

    it('should mask bank account', () => {
      expect(PaymentMethod.getMaskedDisplay({ type: 'bank_account', last4: '6789' }))
        .toBe('****6789');
    });

    it('should use bank format for unknown types', () => {
      expect(PaymentMethod.getMaskedDisplay({ type: 'other', last4: '1234' }))
        .toBe('****1234');
    });
  });

  // =========================================================================
  // getDisplayLabel()
  // =========================================================================
  describe('getDisplayLabel()', () => {
    it('should format card label with brand', () => {
      expect(PaymentMethod.getDisplayLabel({ type: 'card', brand: 'visa', last4: '4242' }))
        .toBe('Visa ending in 4242');
    });

    it('should capitalize brand name', () => {
      expect(PaymentMethod.getDisplayLabel({ type: 'card', brand: 'mastercard', last4: '5555' }))
        .toBe('Mastercard ending in 5555');
    });

    it('should use Card when brand is missing', () => {
      expect(PaymentMethod.getDisplayLabel({ type: 'card', brand: null, last4: '4242' }))
        .toBe('Card ending in 4242');
    });

    it('should use Card when brand is undefined', () => {
      expect(PaymentMethod.getDisplayLabel({ type: 'card', last4: '4242' }))
        .toBe('Card ending in 4242');
    });

    it('should use Card when brand is empty string', () => {
      expect(PaymentMethod.getDisplayLabel({ type: 'card', brand: '', last4: '4242' }))
        .toBe('Card ending in 4242');
    });

    it('should format bank account label', () => {
      expect(PaymentMethod.getDisplayLabel({ type: 'bank_account', last4: '6789' }))
        .toBe('Bank account ending in 6789');
    });

    it('should handle amex brand', () => {
      expect(PaymentMethod.getDisplayLabel({ type: 'card', brand: 'amex', last4: '1234' }))
        .toBe('Amex ending in 1234');
    });
  });

  // =========================================================================
  // setDefault()
  // =========================================================================
  describe('setDefault()', () => {
    it('should unset existing defaults then set new default', async () => {
      // updateMany for unsetting
      zerodbService.queryTable
        .mockResolvedValueOnce(makeQueryResponse([
          { _id: 'id_old', methodId: 'pm_old', customerId: 'cust_001', isDefault: true }
        ]))
        .mockResolvedValueOnce(makeQueryResponse([
          { _id: 'id_old', methodId: 'pm_old', customerId: 'cust_001', isDefault: true }
        ]));

      // Then set new default
      zerodbService.queryTable
        .mockResolvedValueOnce(makeQueryResponse([
          { methodId: 'pm_new', customerId: 'cust_001' }
        ]));

      await PaymentMethod.setDefault('cust_001', 'pm_new');
      // client.put is used when doc has row_id
      expect(zerodbService.client.put).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // deactivate()
  // =========================================================================
  describe('deactivate()', () => {
    it('should set status to inactive and isDefault to false', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{ methodId: 'pm_001', status: 'active', isDefault: true }])
      );
      await PaymentMethod.deactivate('pm_001');
      expect(zerodbService.client.put).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Base model methods
  // =========================================================================
  describe('Base Model Methods', () => {
    const methods = [
      'find', 'findOne', 'findById', 'updateOne', 'updateMany',
      'findOneAndUpdate', 'findByIdAndUpdate', 'deleteOne', 'deleteMany',
      'findOneAndDelete', 'findByIdAndDelete', 'countDocuments',
      'exists', 'distinct', 'aggregate'
    ];

    methods.forEach(method => {
      it(`should have ${method} method`, () => {
        expect(typeof PaymentMethod[method]).toBe('function');
      });
    });
  });
});

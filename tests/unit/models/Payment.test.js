/**
 * Payment Model Tests
 * Feature: Issue #116 - Integrate Payment Processing
 */
jest.mock('../../../services/zerodbService', () => ({
  insertRow: jest.fn(), queryTable: jest.fn(), updateRows: jest.fn(),
  deleteRows: jest.fn(), initialize: jest.fn(), projectId: 'mock-project-id'
}));

describe('Payment Model', () => {
  let Payment;
  beforeAll(() => { Payment = require('../../../models/Payment'); });

  describe('Schema Definition', () => {
    it('should export a model object', () => { expect(Payment).toBeDefined(); });
    it('should have the correct table name', () => { expect(Payment.tableName).toBe('payments'); });
  });

  describe('Required Fields', () => {
    it('should have paymentId field', () => { expect(Payment.schema.paymentId).toBeDefined(); expect(Payment.schema.paymentId.required).toBe(true); });
    it('should have companyId field', () => { expect(Payment.schema.companyId).toBeDefined(); expect(Payment.schema.companyId.required).toBe(true); });
    it('should have customerId field', () => { expect(Payment.schema.customerId).toBeDefined(); expect(Payment.schema.customerId.required).toBe(true); });
    it('should have amount field', () => { expect(Payment.schema.amount).toBeDefined(); expect(Payment.schema.amount.required).toBe(true); });
    it('should have currency field', () => { expect(Payment.schema.currency).toBeDefined(); expect(Payment.schema.currency.required).toBe(true); });
    it('should have status field with default', () => { expect(Payment.schema.status).toBeDefined(); expect(Payment.schema.status.default).toBe('pending'); });
    it('should have paymentMethod field', () => { expect(Payment.schema.paymentMethod).toBeDefined(); expect(Payment.schema.paymentMethod.required).toBe(true); });
  });

  describe('Optional Fields', () => {
    it('should have stripePaymentIntentId field', () => { expect(Payment.schema.stripePaymentIntentId).toBeDefined(); });
    it('should have metadata field', () => { expect(Payment.schema.metadata).toBeDefined(); });
    it('should have description field', () => { expect(Payment.schema.description).toBeDefined(); });
    it('should have receiptUrl field', () => { expect(Payment.schema.receiptUrl).toBeDefined(); });
    it('should have invoiceId field', () => { expect(Payment.schema.invoiceId).toBeDefined(); });
  });

  describe('Enum Validations', () => {
    it('should have valid status enum values', () => { expect(Payment.schema.status.enum).toEqual(['pending', 'processing', 'succeeded', 'failed', 'refunded']); });
    it('should have valid paymentMethod enum values', () => { expect(Payment.schema.paymentMethod.enum).toEqual(['card', 'bank_transfer', 'invoice']); });
  });

  describe('Field Types', () => {
    it('should have amount as number type', () => { expect(Payment.schema.amount.type).toBe('number'); });
    it('should have currency as string type', () => { expect(Payment.schema.currency.type).toBe('string'); });
  });

  describe('Timestamp Fields', () => {
    it('should have timestamp fields defined', () => { expect(Payment.schema.createdAt).toBeDefined(); expect(Payment.schema.updatedAt).toBeDefined(); });
  });

  describe('CRUD Methods', () => {
    it('should have create method', () => { expect(typeof Payment.create).toBe('function'); });
    it('should have find method', () => { expect(typeof Payment.find).toBe('function'); });
    it('should have findOne method', () => { expect(typeof Payment.findOne).toBe('function'); });
    it('should have updateOne method', () => { expect(typeof Payment.updateOne).toBe('function'); });
    it('should have deleteOne method', () => { expect(typeof Payment.deleteOne).toBe('function'); });
    it('should have countDocuments method', () => { expect(typeof Payment.countDocuments).toBe('function'); });
  });

  describe('Exported Constants', () => {
    it('should export VALID_PAYMENT_STATUSES', () => { expect(Payment.VALID_PAYMENT_STATUSES).toEqual(['pending', 'processing', 'succeeded', 'failed', 'refunded']); });
    it('should export VALID_PAYMENT_METHODS', () => { expect(Payment.VALID_PAYMENT_METHODS).toEqual(['card', 'bank_transfer', 'invoice']); });
    it('should export VALID_CURRENCY_CODES', () => { expect(Payment.VALID_CURRENCY_CODES).toContain('USD'); });
    it('should export CURRENCY_SYMBOLS', () => { expect(Payment.CURRENCY_SYMBOLS.USD).toBe('$'); });
  });

  describe('Business Logic', () => {
    it('should calculate net amount', () => { expect(Payment.getNetAmount({ amount: 100, refundedAmount: 25 })).toBe(75); });
    it('should check if payment can be refunded', () => { expect(Payment.canRefund({ status: 'succeeded', amount: 100, refundedAmount: 0 })).toBe(true); expect(Payment.canRefund({ status: 'pending', amount: 100, refundedAmount: 0 })).toBe(false); });
    it('should format amount with currency symbol', () => { expect(Payment.getFormattedAmount({ amount: 1000, currency: 'USD' })).toContain('$'); });
  });
});